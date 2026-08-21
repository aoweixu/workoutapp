// Rest-timer push scheduler. The app calls this on every set log:
//   { action: "schedule", endsAt, exercise, setNo, subscription }
// The function stores the timer in rest_push, waits out the rest server-side
// (EdgeRuntime.waitUntil keeps it alive after the response), re-reads the row,
// and only pushes if the timer is still the one it scheduled — a cancel,
// extend, or newer set in the meantime wins. { action: "cancel" } clears it.
//
// Deploy:  supabase functions deploy rest-timer
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const MAX_DELAY_S = 350; // wall-clock budget is 400s; longer rests fall back to the local path
const GRACE_MS = 2000; // lets a just-in-time cancel (user watching the app) win the race

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

webpush.setVapidDetails(
  "mailto:aoweixu@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // User-scoped client: RLS confines every query to the caller's rows.
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData, error: userErr } = await supa.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "not signed in" });
  const uid = userData.user.id;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return json(400, { error: "bad request" });

  if (body.action === "cancel") {
    await supa.from("rest_push").update({ ends_at: null }).eq("user_id", uid);
    return json(200, { ok: true });
  }

  if (body.action !== "schedule") return json(400, { error: "unknown action" });
  const endsAtMs = Date.parse(body.endsAt ?? "");
  if (!Number.isFinite(endsAtMs) || !body.subscription?.endpoint) {
    return json(400, { error: "bad schedule payload" });
  }

  const { error: upsertErr } = await supa.from("rest_push").upsert({
    user_id: uid,
    subscription: body.subscription,
    ends_at: new Date(endsAtMs).toISOString(),
    exercise: String(body.exercise ?? ""),
    set_no: Number(body.setNo ?? 0),
  });
  if (upsertErr) return json(500, { error: upsertErr.message });

  const delayMs = endsAtMs - Date.now();
  if (delayMs > MAX_DELAY_S * 1000) return json(200, { scheduled: false, reason: "too long" });
  if (delayMs < -5000) return json(200, { scheduled: false, reason: "already past" });

  EdgeRuntime.waitUntil(fireWhenDue(supa, uid, endsAtMs));
  return json(200, { scheduled: true });
});

async function fireWhenDue(
  supa: ReturnType<typeof createClient>,
  uid: string,
  scheduledEndsAtMs: number,
): Promise<void> {
  await new Promise((r) => setTimeout(r, Math.max(0, scheduledEndsAtMs - Date.now()) + GRACE_MS));

  const { data: row } = await supa
    .from("rest_push")
    .select("subscription, ends_at, exercise, set_no")
    .eq("user_id", uid)
    .maybeSingle();
  if (!row?.ends_at) return; // cancelled
  const current = Date.parse(row.ends_at as string);
  if (Math.abs(current - scheduledEndsAtMs) > 500) return; // extended or superseded

  try {
    await webpush.sendNotification(
      row.subscription as webpush.PushSubscription,
      JSON.stringify({
        title: "Rest done — go",
        body: `${row.exercise} · set ${row.set_no}`,
      }),
      { urgency: "high", TTL: 120 },
    );
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // Subscription is dead (app reinstalled, permission revoked): drop the row
      // so the client re-subscribes on its next schedule call.
      await supa.from("rest_push").delete().eq("user_id", uid);
      return;
    }
    console.error("push failed", e);
    return;
  }
  await supa.from("rest_push").update({ ends_at: null }).eq("user_id", uid);
}

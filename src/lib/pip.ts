import { getRest, restFraction, restRemaining, type RestState } from "../state/timer";
import { fmtDuration } from "./targets";

// Floating rest timer that survives leaving the app: draw the countdown on a
// canvas, pipe it through captureStream into a <video>, and pop that video
// into Picture-in-Picture. On Android Chrome the PiP window floats above
// other apps and the home screen — the closest a PWA gets to a system
// overlay. Active PiP playback also keeps the page from being throttled, so
// the clock stays smooth in the background.

const W = 640;
const H = 360;
const DONE_LINGER_MS = 3000;

let canvas: HTMLCanvasElement | null = null;
let video: HTMLVideoElement | null = null;
let drawTimer: ReturnType<typeof setInterval> | null = null;
let lastRest: RestState | null = null;
let doneUntil = 0;

export function pipSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled &&
    "captureStream" in HTMLCanvasElement.prototype
  );
}

// Must be called from a user gesture (play + requestPictureInPicture both
// need transient activation).
export async function openRestPip(): Promise<void> {
  if (!pipSupported() || !getRest()) return;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
  }
  doneUntil = 0;
  draw();
  if (!video) {
    video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = canvas.captureStream();
    video.addEventListener("leavepictureinpicture", stopDrawing);
  }
  await video.play();
  await video.requestPictureInPicture();
  if (drawTimer) clearInterval(drawTimer);
  drawTimer = setInterval(draw, 200);
}

export function closeRestPip(): void {
  if (video && document.pictureInPictureElement === video) {
    document.exitPictureInPicture().catch(() => {});
  }
  stopDrawing();
}

function stopDrawing(): void {
  if (drawTimer) {
    clearInterval(drawTimer);
    drawTimer = null;
  }
  video?.pause();
  lastRest = null;
  doneUntil = 0;
}

function draw(): void {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  const rest = getRest();

  if (!rest) {
    // Timer expired (or was cleared) while popped out: linger on a done
    // frame so the window doesn't just vanish, then close.
    if (!lastRest) return;
    if (doneUntil === 0) doneUntil = Date.now() + DONE_LINGER_MS;
    if (Date.now() >= doneUntil) {
      closeRestPip();
      return;
    }
    paint(ctx, `${lastRest.exerciseName} · SET ${lastRest.setNo}`, "GO", "#5cb876", 1);
    return;
  }

  lastRest = rest;
  doneUntil = 0;
  paint(
    ctx,
    `REST · ${rest.exerciseName} · SET ${rest.setNo}`,
    fmtDuration(restRemaining(rest)),
    "#e3a93c",
    restFraction(rest),
  );
}

// Colors/fonts mirror theme.css (canvas can't read CSS classes).
function paint(
  ctx: CanvasRenderingContext2D,
  eyebrow: string,
  big: string,
  accent: string,
  fraction: number,
): void {
  ctx.fillStyle = "#15181e";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "600 26px Barlow, system-ui, sans-serif";
  ctx.fillStyle = "#a8adb8";
  ctx.fillText(eyebrow.toUpperCase(), W / 2, 78);

  ctx.font = "700 170px 'Barlow Condensed', 'Arial Narrow', sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText(big, W / 2, H / 2 + 24);

  const barH = 14;
  ctx.fillStyle = "#313947";
  ctx.fillRect(0, H - barH, W, barH);
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - barH, W * fraction, barH);
}

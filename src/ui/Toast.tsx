import { dismissToast, useToasts } from "../state/ui";

export function ToastHost() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed left-0 right-0 bottom-[84px] z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto card px-4 py-2.5 text-[14px] flex items-center gap-3 shadow-lg max-w-[420px]"
        >
          <span>{t.text}</span>
          {t.action ? (
            <button
              className="text-copper-hi font-semibold"
              onClick={() => {
                t.action?.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

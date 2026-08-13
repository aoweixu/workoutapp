import type { ReactNode } from "react";
import { closeTopOverlay, useOverlayBack } from "../state/ui";

// Bottom sheet. Closing always goes through history.back() so the Android
// back button and the backdrop behave identically.
export function Sheet(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useOverlayBack(props.open, props.onClose);
  if (!props.open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={closeTopOverlay} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {props.title ? (
          <div className="display text-[22px] font-semibold mb-3">{props.title}</div>
        ) : null}
        {props.children}
      </div>
    </>
  );
}

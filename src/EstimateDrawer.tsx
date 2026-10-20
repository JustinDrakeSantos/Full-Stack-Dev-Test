import { useEffect, useRef, type ReactNode } from "react";
export default function EstimateDrawer({
  children,
  onClose,
  focusItemId,
}: {
  children: ReactNode;
  onClose: () => void;
  focusItemId?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const target = focusItemId ? document.getElementById(focusItemId) : null;
    if (target && dialog.contains(target)) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "center" });
    }
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="estimate-drawer"
      aria-labelledby="drawer-title"
      onCancel={onClose}
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="drawer-header">
        <h2 id="drawer-title">Estimate items</h2>
        <button autoFocus onClick={onClose} aria-label="Close estimate drawer">
          Close ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

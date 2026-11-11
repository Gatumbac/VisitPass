import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useFrameTarget } from "@/components/layout/frame";
import { cx } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";

type ToastTone = "ok" | "info" | "warn";
type ToastItem = { id: number; message: string; tone: ToastTone };

const DISMISS_MS = 3200;
const listeners = new Set<() => void>();
let current: ToastItem | null = null;
let timer: number | undefined;
let sequence = 0;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: ToastItem | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function toast(message: string, tone: ToastTone = "ok"): void {
  window.clearTimeout(timer);
  sequence += 1;
  set({ id: sequence, message, tone });
  timer = window.setTimeout(() => set(null), DISMISS_MS);
}

const TONE_ICON = { ok: "check", info: "bell", warn: "alert" } as const;

export function ToastHost() {
  const item = useSyncExternalStore(subscribe, () => current);
  const frame = useFrameTarget();
  if (!item) return null;
  return createPortal(
    <div
      className={cx(
        "pointer-events-none inset-x-0 bottom-24 z-[60] flex justify-center px-4",
        frame ? "absolute" : "fixed",
      )}
    >
      <div
        key={item.id}
        role="status"
        className={cx(
          "animate-rise pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium text-white",
          item.tone === "warn" ? "bg-warn-ink" : "bg-ink",
        )}
      >
        <Icon name={TONE_ICON[item.tone]} size={18} className="shrink-0" />
        {item.message}
      </div>
    </div>,
    frame ?? document.body,
  );
}

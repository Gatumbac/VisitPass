import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFrameTarget } from "@/components/layout/frame";
import { cx } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/Icon";
import { initials } from "@/lib/format";
import type { BadgeTone } from "@/lib/passes";

const BADGE_TONES: Record<BadgeTone, string> = {
  info: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok-ink",
  neutral: "bg-sunken text-ink-muted",
  danger: "bg-danger-soft text-danger-ink",
  warn: "bg-warn-soft text-warn-ink",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] leading-none font-medium tracking-wide whitespace-nowrap uppercase",
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-[#dde6ee]",
  "bg-[#e9e3d2]",
  "bg-[#dcebe2]",
  "bg-[#efdfd9]",
  "bg-[#e3dfee]",
];

function toneFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-ink",
        toneFor(name),
      )}
    >
      {initials(name)}
    </span>
  );
}

type EmptyStateProps = { icon: IconName; title: string; description?: string; action?: ReactNode };

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-sunken text-ink-muted">
        <Icon name={icon} size={20} />
      </span>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type SheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export function Sheet({ title, onClose, children, wide }: SheetProps) {
  const frame = useFrameTarget();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={cx(
        "inset-0 z-50 flex items-end justify-center bg-ink/45",
        frame ? "absolute" : "fixed sm:items-center sm:p-6",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={cx(
          "animate-rise w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-5",
          frame ? "max-h-[92%]" : "max-h-[92dvh] sm:rounded-2xl",
          wide ? "max-w-lg" : "max-w-[430px]",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-paper"
          >
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    frame ?? document.body,
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function DataPair({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[15px] font-medium text-ink">{children}</dd>
    </div>
  );
}

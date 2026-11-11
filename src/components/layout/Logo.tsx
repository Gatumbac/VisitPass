import { cx } from "@/components/ui/controls";

export function LogoMark({ size = 32, inverse }: { size?: number; inverse?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M8 0h16a8 8 0 0 1 8 8v4a4 4 0 0 0 0 8v4a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8v-4a4 4 0 0 0 0-8V8a8 8 0 0 1 8-8z"
        className={inverse ? "fill-white" : "fill-brand"}
      />
      <path
        d="m10 16.5 4.2 4.2L22.5 12"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverse ? "stroke-brand" : "stroke-white"}
      />
    </svg>
  );
}

export function Logo({ size = 28, inverse }: { size?: number; inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} inverse={inverse} />
      <span
        style={{ fontSize: Math.round(size * 0.72) }}
        className={cx(
          "font-display leading-none font-bold tracking-tight",
          inverse ? "text-white" : "text-ink",
        )}
      >
        VisitPass
      </span>
    </span>
  );
}

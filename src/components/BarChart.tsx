import { useEffect, useRef, useState } from "react";

export type BarDatum = {
  label: string;
  value: number;
  detail: string;
  highlight?: boolean;
};

type BarChartProps = {
  data: BarDatum[];
  ariaLabel: string;
  height?: number;
  annotation?: string;
  formatValue?: (value: number) => string;
};

const MARGIN = { top: 28, right: 8, bottom: 26, left: 34 };
const MAX_BAR = 24;
const MIN_LABEL_GAP = 34;

function niceStep(max: number): number {
  if (max <= 0) return 1;
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.max(1, step * magnitude);
}

function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function BarChart({
  data,
  ariaLabel,
  height = 220,
  annotation,
  formatValue = (value) => String(Math.round(value)),
}: BarChartProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const step = niceStep(maxValue);
  const top = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const band = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR, band - 2));
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_GAP / Math.max(band, 1)));
  const hasHighlight = data.some((item) => item.highlight);
  const y = (value: number) => MARGIN.top + plotHeight - (value / top) * plotHeight;
  const baseline = MARGIN.top + plotHeight;

  const activeDatum = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? MARGIN.left + band * active + band / 2 : 0;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={ariaLabel}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? "stroke-line-strong" : "stroke-line"}
                strokeWidth="1"
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink-muted font-mono text-[11px]"
              >
                {Number.isInteger(tick) ? tick : formatValue(tick)}
              </text>
            </g>
          ))}

          {data.map((item, index) => {
            const x = MARGIN.left + band * index + (band - barWidth) / 2;
            const barTop = y(item.value);
            const barHeight = Math.max(0, baseline - barTop);
            const radius = Math.min(4, barWidth / 2, barHeight);
            const emphasized = !hasHighlight || item.highlight;
            const isActive = active === index;
            const shape =
              barHeight <= 0
                ? ""
                : `M${x} ${baseline}V${barTop + radius}a${radius} ${radius} 0 0 1 ${radius} ${-radius}h${barWidth - radius * 2}a${radius} ${radius} 0 0 1 ${radius} ${radius}V${baseline}z`;
            return (
              <g key={item.label}>
                <path
                  d={shape}
                  className={
                    isActive ? "fill-brand-hover" : emphasized ? "fill-brand" : "fill-brand-mid"
                  }
                />
                {item.highlight && (
                  <text
                    x={x + barWidth / 2}
                    y={barTop - 8}
                    textAnchor={
                      index > data.length * 0.75
                        ? "end"
                        : index < data.length * 0.25
                          ? "start"
                          : "middle"
                    }
                    className="fill-ink font-mono text-[11px] font-semibold"
                  >
                    {annotation
                      ? `${annotation} · ${formatValue(item.value)}`
                      : formatValue(item.value)}
                  </text>
                )}
                {index % labelEvery === 0 && (
                  <text
                    x={MARGIN.left + band * index + band / 2}
                    y={baseline + 17}
                    textAnchor="middle"
                    className="fill-ink-muted font-mono text-[11px]"
                  >
                    {item.label}
                  </text>
                )}
                <rect
                  x={MARGIN.left + band * index}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${item.detail}: ${formatValue(item.value)}`}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() =>
                    setActive((current) => (current === index ? null : current))
                  }
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive((current) => (current === index ? null : current))}
                  className="outline-none"
                />
              </g>
            );
          })}
        </svg>
      )}
      {activeDatum && (
        <div
          role="tooltip"
          style={{
            left: Math.min(Math.max(tooltipLeft, 70), Math.max(70, width - 70)),
            top: Math.max(0, y(activeDatum.value) - 54),
          }}
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-center whitespace-nowrap"
        >
          <p className="font-display text-base leading-tight font-bold">
            {formatValue(activeDatum.value)}
          </p>
          <p className="text-xs text-ink-muted">{activeDatum.detail}</p>
        </div>
      )}
    </div>
  );
}

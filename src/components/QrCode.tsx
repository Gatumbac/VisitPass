import { useMemo } from "react";

const SIZE = 25;
const FINDER = 7;

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function isFinderDark(row: number, col: number): boolean {
  const ring = Math.max(Math.abs(row - 3), Math.abs(col - 3));
  return ring !== 2 && ring <= 3;
}

function buildModules(code: string): boolean[][] {
  let state = hash(code) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };

  const corners: Array<[number, number]> = [
    [0, 0],
    [0, SIZE - FINDER],
    [SIZE - FINDER, 0],
  ];
  const alignment = SIZE - 9;

  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => {
      for (const [top, left] of corners) {
        const inFinder = row >= top && row < top + FINDER && col >= left && col < left + FINDER;
        if (inFinder) return isFinderDark(row - top, col - left);
        const inSeparator =
          row >= top - 1 && row <= top + FINDER && col >= left - 1 && col <= left + FINDER;
        if (inSeparator) return false;
      }
      const alignRow = row - alignment;
      const alignCol = col - alignment;
      if (alignRow >= 0 && alignRow < 5 && alignCol >= 0 && alignCol < 5) {
        const ring = Math.max(Math.abs(alignRow - 2), Math.abs(alignCol - 2));
        return ring !== 1;
      }
      if (row === 6 || col === 6) return (row + col) % 2 === 0;
      return next() < 0.48;
    }),
  );
}

export function QrCode({ code, size = 200 }: { code: string; size?: number }) {
  const path = useMemo(() => {
    const modules = buildModules(code);
    let d = "";
    modules.forEach((row, rowIndex) => {
      row.forEach((dark, colIndex) => {
        if (dark) d += `M${colIndex} ${rowIndex}h1v1h-1z`;
      });
    });
    return d;
  }, [code]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Código QR del pase ${code}`}
      className="rounded-lg bg-white"
    >
      <path d={path} className="fill-ink" />
    </svg>
  );
}

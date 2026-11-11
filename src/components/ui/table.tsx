import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { Button, cx } from "@/components/ui/controls";

export function Table({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table aria-label={label} className="w-full min-w-[720px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cx(
        "border-b border-line px-4 py-2.5 font-mono text-[11px] font-medium tracking-[0.08em] whitespace-nowrap text-ink-muted uppercase",
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("border-b border-line px-4 py-2.5 align-top", className)} {...rest} />;
}

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  noun: string;
};

export function Pagination({ page, pageSize, total, onChange, noun }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
      <p className="font-mono tabular-nums">
        {first}–{last} de {total.toLocaleString("es-EC")} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon="chevronLeft"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="font-mono tabular-nums">
          {page + 1} / {pages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages - 1}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

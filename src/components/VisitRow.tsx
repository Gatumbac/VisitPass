import { Avatar, Badge } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import type { BadgeTone } from "@/lib/passes";
import { Link } from "@/lib/router";

type VisitRowProps = {
  name: string;
  summary: string;
  detail?: string;
  label: string;
  tone: BadgeTone;
  to?: string;
};

export function VisitRow({ name, summary, detail, label, tone, to }: VisitRowProps) {
  const body = (
    <>
      <Avatar name={name} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{name}</span>
        <span className="block text-sm leading-snug text-ink-muted">{summary}</span>
        {detail && <span className="block truncate text-xs text-ink-muted">{detail}</span>}
      </span>
      <Badge tone={tone}>{label}</Badge>
      {to && <Icon name="chevronRight" size={18} className="shrink-0 text-ink-muted" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-paper">
        {body}
      </Link>
    );
  }
  return <div className="flex items-center gap-3 px-3 py-3">{body}</div>;
}

export function RowList({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {children}
    </div>
  );
}

import { useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button, cx } from "@/components/ui/controls";
import { EmptyState, SectionTitle } from "@/components/ui/display";
import { RowList, VisitRow } from "@/components/VisitRow";
import { dateKey, formatRelativeDay } from "@/lib/format";
import { useAllEntries, useAppState, useNow, useSession } from "@/lib/store";
import { groupByDay, unitVisits } from "@/lib/visits";

const PAGE_SIZE = 12;
const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "Ingresó", label: "Dentro" },
  { id: "Salió", label: "Salieron" },
  { id: "other", label: "Sin ingreso" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function History() {
  const account = useSession();
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow();
  const [filter, setFilter] = useState<FilterId>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const unit = account?.unit ?? 0;
  const items = useMemo(
    () => unitVisits(state, entries, unit, nowMs),
    [state, entries, unit, nowMs],
  );
  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "other") return item.label !== "Ingresó" && item.label !== "Salió";
    return item.label === filter;
  });
  const groups = groupByDay(filtered.slice(0, limit));
  const today = dateKey(nowMs);

  return (
    <MobileShell title="Historial" back="/resident">
      <div role="group" aria-label="Filtrar por estado" className="mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => {
              setFilter(option.id);
              setLimit(PAGE_SIZE);
            }}
            className={cx(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
              filter === option.id
                ? "border-brand bg-brand text-white"
                : "border-line-strong bg-surface text-ink-muted hover:bg-paper",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Nada por aquí"
          description="No hay visitas con ese estado."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.day}>
              <SectionTitle>{formatRelativeDay(group.day, today)}</SectionTitle>
              <RowList>
                {group.items.map((item) => (
                  <VisitRow
                    key={item.id}
                    name={item.name}
                    summary={item.summary}
                    detail={item.detail}
                    label={item.label}
                    tone={item.tone}
                  />
                ))}
              </RowList>
            </section>
          ))}
          {filtered.length > limit && (
            <Button
              variant="secondary"
              block
              onClick={() => setLimit((current) => current + PAGE_SIZE)}
            >
              Ver visitas anteriores
            </Button>
          )}
        </div>
      )}
    </MobileShell>
  );
}

import { useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button, cx } from "@/components/ui/controls";
import { Badge, EmptyState } from "@/components/ui/display";
import { toast } from "@/components/ui/toast";
import {
  capitalize,
  dateKey,
  formatDayLong,
  formatTime,
  maskId,
  VISIT_TYPE_LABEL,
} from "@/lib/format";
import { registerExit, useAppState, useNow } from "@/lib/store";
import type { LogEntry } from "@/lib/types";

type Filter = "all" | "inside" | "out";

export function Logbook() {
  const state = useAppState();
  const nowMs = useNow();
  const [filter, setFilter] = useState<Filter>("all");

  const today = dateKey(nowMs);
  const todayEntries = state.log
    .filter((entry) => dateKey(entry.inAt) === today)
    .sort((a, b) => b.inAt - a.inAt);
  const inside = todayEntries.filter((entry) => entry.outAt === undefined);
  const visible =
    filter === "all"
      ? todayEntries
      : filter === "inside"
        ? inside
        : todayEntries.filter((entry) => entry.outAt !== undefined);

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "Todos", count: todayEntries.length },
    { id: "inside", label: "Dentro", count: inside.length },
    { id: "out", label: "Salieron", count: todayEntries.length - inside.length },
  ];

  const exit = (entry: LogEntry) => {
    registerExit(entry.id);
    toast(`Salida de ${entry.visitorName} registrada`);
  };

  return (
    <MobileShell title="Bitácora" back="/guard">
      <p className="mb-3 font-mono text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
        {capitalize(formatDayLong(nowMs))} · {state.settings.gateName}
      </p>
      <div role="group" aria-label="Filtrar por estado" className="mb-4 flex gap-2">
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={cx(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              filter === option.id
                ? "border-brand bg-brand text-white"
                : "border-line-strong bg-surface text-ink-muted hover:bg-paper",
            )}
          >
            {option.label}
            <span className="font-mono text-xs tabular-nums opacity-80">{option.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="book"
          title="Sin registros"
          description="No hay visitas con ese estado en el turno."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {visible.map((entry) => {
            const isInside = entry.outAt === undefined;
            return (
              <li key={entry.id} className="flex gap-3 px-3 py-3">
                <div className="w-14 shrink-0 font-mono text-sm leading-5 tabular-nums">
                  <p className="font-semibold">{formatTime(entry.inAt)}</p>
                  <p className="text-ink-muted">
                    {isInside ? "—" : formatTime(entry.outAt as number)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[15px] font-medium">{entry.visitorName}</p>
                    <Badge tone={isInside ? "ok" : "neutral"}>
                      {isInside ? "Dentro" : "Salió"}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Villa {entry.unit} · {VISIT_TYPE_LABEL[entry.type]}
                  </p>
                  <p className="truncate text-sm text-ink-muted">Autorizó {entry.authorizedBy}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {maskId(entry.visitorId)}
                    {entry.plate && ` · ${entry.plate}`}
                    {entry.pendingSync && (
                      <span className="text-warn-ink"> · Pendiente de envío</span>
                    )}
                  </p>
                  {isInside && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="logout"
                      className="mt-2"
                      onClick={() => exit(entry)}
                    >
                      Registrar salida
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </MobileShell>
  );
}

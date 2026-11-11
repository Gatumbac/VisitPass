import { useMemo, useState } from "react";
import { BarChart } from "@/components/BarChart";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, cx } from "@/components/ui/controls";
import { Badge } from "@/components/ui/display";
import { toast } from "@/components/ui/toast";
import {
  capitalize,
  dateKey,
  formatDay,
  formatDuration,
  formatNumber,
  formatTime,
  INCIDENT_LABEL,
  parseDateKey,
  VISIT_TYPE_LABEL,
} from "@/lib/format";
import {
  downloadCsv,
  entriesToCsv,
  hourSpan,
  PERIOD_LABEL,
  periodRange,
  summarize,
  type Period,
} from "@/lib/reports";
import { Link } from "@/lib/router";
import { useAllEntries, useAppState, useNow } from "@/lib/store";

const PERIODS: Period[] = ["today", "week", "month"];

function Card({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-lg border border-line bg-surface p-5", className)}>
      <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
      {note && <p className="text-sm text-ink-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-[40px] leading-none font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-sm text-ink-muted">{note}</p>
    </div>
  );
}

export function Dashboard() {
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow(30_000);
  const [period, setPeriod] = useState<Period>("month");

  const range = useMemo(() => periodRange(period, nowMs), [period, nowMs]);
  const summary = useMemo(() => summarize(entries, range), [entries, range]);

  const today = dateKey(nowMs);
  const todayEntries = state.log.filter((entry) => dateKey(entry.inAt) === today);
  const insideNow = todayEntries.filter((entry) => entry.outAt === undefined).length;
  const incidents = state.incidents
    .filter((item) => item.at >= range.start && item.at <= range.end)
    .sort((a, b) => b.at - a.at);
  const rejectedAttempts = incidents.filter(
    (item) => item.kind === "unauthorized" || item.kind === "rejected",
  ).length;
  const singleDay = range.days.length === 1;

  const download = () => {
    const rows = entries.filter((entry) => entry.inAt >= range.start && entry.inAt <= range.end);
    downloadCsv(
      `visitpass-bitacora-${range.days[0]}-a-${range.days[range.days.length - 1]}.csv`,
      entriesToCsv(rows),
    );
    toast(`Reporte descargado con ${formatNumber(rows.length)} visitas`);
  };

  return (
    <AdminShell
      title="Panel de reportes"
      subtitle={`${state.settings.communityName} · ${capitalize(range.description)}`}
      actions={
        <Button variant="secondary" icon="download" onClick={download}>
          Descargar reporte
        </Button>
      }
    >
      <div
        role="group"
        aria-label="Periodo del reporte"
        className="mb-5 inline-flex rounded-lg border border-line-strong bg-surface p-1"
      >
        {PERIODS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            onClick={() => setPeriod(option)}
            className={cx(
              "h-9 rounded-md px-4 text-sm font-medium transition-colors",
              period === option ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
            )}
          >
            {PERIOD_LABEL[option]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Visitas hoy"
          value={formatNumber(todayEntries.length)}
          note={`${insideNow} dentro de la ciudadela ahora`}
        />
        <StatTile
          label={
            singleDay ? "Visitas del periodo" : `Visitas, ${PERIOD_LABEL[period].toLowerCase()}`
          }
          value={formatNumber(summary.total)}
          note={
            singleDay
              ? "Desde las 00h00 de hoy"
              : `${Math.round(summary.averagePerDay)} por día en promedio`
          }
        />
        <StatTile
          label="Tiempo promedio en garita"
          value={formatDuration(summary.averageService)}
          note={`Con QR ${formatDuration(summary.serviceByPass)} · sin aviso ${formatDuration(summary.serviceByRequest)}`}
        />
        <StatTile
          label="Novedades registradas"
          value={formatNumber(incidents.length)}
          note={`${rejectedAttempts} ${rejectedAttempts === 1 ? "intento de ingreso rechazado" : "intentos de ingreso rechazados"}`}
        />
      </div>

      <div className={cx("mt-4 grid gap-4", !singleDay && "xl:grid-cols-2")}>
        {!singleDay && (
          <Card title="Visitas por día" note="Ingresos registrados en la garita">
            <BarChart
              ariaLabel="Visitas por día"
              data={summary.byDay.map((item) => ({
                label: String(parseDateKey(item.day).getDate()),
                value: item.count,
                detail: capitalize(formatDay(item.day)),
              }))}
            />
          </Card>
        )}
        <Card
          title="Visitas por hora del día"
          note={singleDay ? "Ingresos de hoy por hora" : "Promedio diario de ingresos por hora"}
        >
          <BarChart
            ariaLabel="Visitas por hora del día"
            annotation="Hora pico"
            formatValue={(value) =>
              singleDay || value === 0
                ? String(Math.round(value))
                : value.toFixed(1).replace(".", ",")
            }
            data={summary.byHour.map((item) => ({
              label: `${String(item.hour).padStart(2, "0")}h`,
              value: singleDay ? item.count : item.average,
              detail: hourSpan(item.hour),
              highlight: summary.total > 0 && item.hour === summary.peakHour,
            }))}
          />
          {summary.total > 0 && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
              <span className="font-medium text-ink">De {hourSpan(summary.peakHour)}</span> ingresa
              el {Math.round(summary.peakShare * 100)} % de las visitas. Es la franja con más carga
              para la garita.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Últimas novedades" note="Registradas por los guardias de turno">
          {incidents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-muted">
              Sin novedades en este periodo.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {incidents.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4"
                >
                  <div className="shrink-0 font-mono text-xs leading-5 text-ink-muted sm:w-24">
                    <p>{capitalize(formatDay(item.at))}</p>
                    <p>{formatTime(item.at)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Badge
                      tone={item.kind === "incident" || item.kind === "other" ? "warn" : "danger"}
                    >
                      {INCIDENT_LABEL[item.kind]}
                    </Badge>
                    <p className="mt-1.5 text-sm leading-snug">{item.description}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {item.guardName}
                      {item.unit ? ` · Villa ${item.unit}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Visitas por tipo" note="Participación en el periodo">
          <ul className="space-y-3.5">
            {summary.byType.map((item) => (
              <li key={item.type}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{VISIT_TYPE_LABEL[item.type]}</span>
                  <span className="font-mono tabular-nums">
                    <span className="font-semibold">{formatNumber(item.count)}</span>
                    <span className="text-ink-muted"> · {Math.round(item.share * 100)} %</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-soft">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${item.share * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/admin/log"
            className="mt-5 inline-block text-sm font-medium text-brand hover:underline"
          >
            Ver la bitácora completa
          </Link>
        </Card>
      </div>
    </AdminShell>
  );
}

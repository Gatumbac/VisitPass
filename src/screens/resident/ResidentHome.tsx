import { MobileShell } from "@/components/layout/MobileShell";
import { ButtonLink } from "@/components/ui/controls";
import { EmptyState, SectionTitle } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { RowList, VisitRow } from "@/components/VisitRow";
import {
  capitalize,
  dateKey,
  firstName,
  formatDayLong,
  formatTime,
  VISIT_TYPE_LABEL,
} from "@/lib/format";
import { PASS_STATUS_META, passSchedule, passStatus } from "@/lib/passes";
import { Link } from "@/lib/router";
import { useAllEntries, useAppState, useNow, useSession } from "@/lib/store";
import { entryStatus } from "@/lib/visits";

export function ResidentHome() {
  const account = useSession();
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow();
  if (!account?.unit) return null;

  const unit = account.unit;
  const today = dateKey(nowMs);
  const weekday = new Date(nowMs).getDay();
  const unitEntries = entries.filter((entry) => entry.unit === unit);
  const passes = state.passes.filter(
    (pass) => pass.unit === unit && pass.cancelledAt === undefined,
  );
  const pending = state.requests.filter(
    (request) => request.unit === unit && request.status === "pending",
  );

  const todayPasses = passes.filter((pass) =>
    pass.recurringDays ? pass.recurringDays.includes(weekday) : pass.date === today,
  );
  const upcomingPasses = passes.filter((pass) =>
    pass.recurringDays ? !pass.recurringDays.includes(weekday) : pass.date > today,
  );
  const todayWalkIns = unitEntries.filter(
    (entry) => dateKey(entry.inAt) === today && !entry.passId,
  );

  return (
    <MobileShell>
      <p className="font-mono text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
        {capitalize(formatDayLong(nowMs))} · {formatTime(nowMs)}
      </p>
      <h2 className="mt-1 font-display text-[32px] leading-tight font-bold tracking-tight">
        Hola, {firstName(account.name)}
      </h2>
      <p className="text-[15px] text-ink-muted">
        Villa {unit} · {state.settings.communityName}
      </p>

      {pending.length > 0 && (
        <Link
          to="/resident/requests"
          className="mt-5 flex items-center gap-3 rounded-lg border border-warn bg-warn-soft px-4 py-3 text-warn-ink"
        >
          <Icon name="inbox" size={22} className="shrink-0" />
          <span className="flex-1 text-[15px] font-medium">
            {pending.length === 1
              ? `${pending[0].visitorName} espera en la garita`
              : `${pending.length} visitas esperan en la garita`}
          </span>
          <span className="text-sm font-semibold">Revisar</span>
        </Link>
      )}

      <ButtonLink to="/resident/new" size="lg" block icon="plus" className="mt-5">
        Nueva autorización
      </ButtonLink>

      <section className="mt-8">
        <SectionTitle>Visitas de hoy</SectionTitle>
        {todayPasses.length === 0 && todayWalkIns.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Sin visitas para hoy"
            description="Autoriza a tu visita con anticipación y entrará sin que la garita te llame."
          />
        ) : (
          <RowList>
            {todayPasses.map((pass) => {
              const meta = PASS_STATUS_META[passStatus(pass, nowMs, unitEntries)];
              return (
                <VisitRow
                  key={pass.id}
                  name={pass.visitorName}
                  summary={`${VISIT_TYPE_LABEL[pass.type]} · ${passSchedule(pass)}`}
                  label={meta.label}
                  tone={meta.tone}
                  to={`/resident/pass/${pass.id}`}
                />
              );
            })}
            {todayWalkIns.map((entry) => {
              const status = entryStatus(entry);
              return (
                <VisitRow
                  key={entry.id}
                  name={entry.visitorName}
                  summary={`${VISIT_TYPE_LABEL[entry.type]} · Entró ${formatTime(entry.inAt)}`}
                  label={status.label}
                  tone={status.tone}
                />
              );
            })}
          </RowList>
        )}
      </section>

      {upcomingPasses.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Próximas y recurrentes</SectionTitle>
          <RowList>
            {upcomingPasses.map((pass) => (
              <VisitRow
                key={pass.id}
                name={pass.visitorName}
                summary={`${VISIT_TYPE_LABEL[pass.type]} · ${passSchedule(pass)}`}
                label={pass.recurringDays ? "Recurrente" : "Programada"}
                tone="info"
                to={`/resident/pass/${pass.id}`}
              />
            ))}
          </RowList>
        </section>
      )}

      {state.settings.adsEnabled && (
        <aside className="mt-8 flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-muted">
            <Icon name="tag" size={20} />
          </span>
          <div>
            <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">
              Patrocinado
            </p>
            <p className="mt-0.5 text-[15px] font-medium">Botica del Río</p>
            <p className="text-sm text-ink-muted">
              Entrega a tu villa sin costo de envío. A cinco minutos de la garita principal.
            </p>
          </div>
        </aside>
      )}
    </MobileShell>
  );
}

import { MobileShell } from "@/components/layout/MobileShell";
import { cx, Toggle } from "@/components/ui/controls";
import { Badge, SectionTitle } from "@/components/ui/display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import { RowList, VisitRow } from "@/components/VisitRow";
import { capitalize, dateKey, formatDayLong, formatTime, VISIT_TYPE_LABEL } from "@/lib/format";
import { Link } from "@/lib/router";
import { reconnectMessage, setBackupMode, useAppState, useNow, useSession } from "@/lib/store";

const ACTIONS: Array<{
  to: string;
  label: string;
  hint: string;
  icon: IconName;
  primary?: boolean;
}> = [
  { to: "/guard/scan", label: "Escanear QR", hint: "Visita con pase", icon: "scan", primary: true },
  { to: "/guard/walk-in", label: "Visita sin aviso", hint: "Pedir autorización", icon: "userPlus" },
  { to: "/guard/log", label: "Bitácora", hint: "Entradas y salidas", icon: "book" },
  {
    to: "/guard/incident",
    label: "Registrar novedad",
    hint: "Incidentes del turno",
    icon: "alert",
  },
];

export function GuardHome() {
  const account = useSession();
  const state = useAppState();
  const nowMs = useNow(10_000);
  if (!account) return null;

  const guard = state.guards.find((item) => item.id === account.guardId);
  const today = dateKey(nowMs);
  const todayEntries = state.log.filter((entry) => dateKey(entry.inAt) === today);
  const inside = todayEntries.filter((entry) => entry.outAt === undefined).length;
  const pendingSync = state.log.filter((entry) => entry.pendingSync).length;
  const open = state.requests
    .filter(
      (request) =>
        request.status === "pending" || (request.status === "approved" && !request.entryId),
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const changeBackup = (enabled: boolean) => {
    const synced = setBackupMode(enabled);
    if (enabled) toast("Modo de respaldo activado", "warn");
    else toast(reconnectMessage(synced));
  };

  return (
    <MobileShell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
            {capitalize(formatDayLong(nowMs))}
          </p>
          <p className="font-display text-[56px] leading-none font-extrabold tracking-tight tabular-nums">
            {formatTime(nowMs)}
          </p>
        </div>
        <Badge tone={state.backupMode ? "warn" : "ok"}>
          {state.backupMode ? "Modo de respaldo" : "En línea"}
        </Badge>
      </div>
      <p className="mt-2 text-[15px]">
        <span className="font-medium">{account.name}</span>
        <span className="text-ink-muted">
          {" "}
          · {guard?.post ?? state.settings.gateName} · Turno de{" "}
          {guard?.shift === "night" ? "noche" : "día"}
        </span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={cx(
              "flex min-h-28 flex-col justify-between rounded-lg border p-4 transition-colors",
              action.primary
                ? "border-brand bg-brand text-white hover:bg-brand-hover"
                : "border-line-strong bg-surface text-ink hover:bg-paper",
            )}
          >
            <Icon name={action.icon} size={28} />
            <span>
              <span className="block font-display text-lg leading-tight font-semibold">
                {action.label}
              </span>
              <span
                className={cx("block text-sm", action.primary ? "text-white/75" : "text-ink-muted")}
              >
                {action.hint}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface">
        {[
          { label: "Dentro ahora", value: inside },
          { label: "Ingresos hoy", value: todayEntries.length },
          {
            label: "En espera",
            value: open.filter((request) => request.status === "pending").length,
          },
        ].map((stat) => (
          <div key={stat.label} className="px-3 py-3 text-center">
            <dd className="font-display text-3xl leading-none font-bold tabular-nums">
              {stat.value}
            </dd>
            <dt className="mt-1 text-xs text-ink-muted">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {open.length > 0 && (
        <section className="mt-7">
          <SectionTitle>Solicitudes en curso</SectionTitle>
          <RowList>
            {open.map((request) => (
              <VisitRow
                key={request.id}
                name={request.visitorName}
                summary={`Villa ${request.unit} · ${VISIT_TYPE_LABEL[request.type]} · ${formatTime(request.createdAt)}`}
                label={request.status === "pending" ? "En espera" : "Aprobada"}
                tone={request.status === "pending" ? "warn" : "ok"}
                to={`/guard/request/${request.id}`}
              />
            ))}
          </RowList>
        </section>
      )}

      <section className="mt-7 rounded-lg border border-line bg-surface p-4">
        <Toggle
          id="backup-mode"
          label="Modo de respaldo"
          description="Actívalo si la garita se queda sin internet. Los registros se envían al reconectar."
          checked={state.backupMode}
          onChange={changeBackup}
        />
        {pendingSync > 0 && (
          <p className="mt-3 border-t border-line pt-3 font-mono text-xs text-warn-ink">
            {pendingSync} {pendingSync === 1 ? "registro pendiente" : "registros pendientes"} de
            envío
          </p>
        )}
      </section>
    </MobileShell>
  );
}

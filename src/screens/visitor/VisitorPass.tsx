import { Logo } from "@/components/layout/Logo";
import { MobileFrame } from "@/components/layout/MobileShell";
import { PassTicket } from "@/components/PassTicket";
import { Badge, EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { firstName } from "@/lib/format";
import {
  decodeSharedPass,
  PASS_STATUS_META,
  passStatus,
  passValidityText,
  type PassStatus,
} from "@/lib/passes";
import { useAllEntries, useAppState, useNow } from "@/lib/store";
import type { Pass } from "@/lib/types";

const VISITOR_NOTE: Record<PassStatus, string> = {
  valid: "Tu pase está vigente. Muestra este código en la garita.",
  inside: "Ya registramos tu ingreso. Conserva el pase hasta salir.",
  used: "Este pase ya se utilizó. Pide uno nuevo a quien te invitó.",
  expired: "Este pase venció. Pide uno nuevo a quien te invitó.",
  notYet: "Tu pase todavía no está vigente. Guárdalo para el día de tu visita.",
  notToday: "Tu pase no es válido hoy. Revisa los días autorizados.",
  outOfHours: "Estás fuera del horario autorizado. Revisa la hora de ingreso.",
  cancelled: "Este pase fue cancelado por quien te invitó.",
};

export function VisitorPass({ payload }: { payload: string }) {
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow();
  const shared = decodeSharedPass(payload);

  if (!shared) {
    return (
      <MobileFrame bodyClassName="px-4 py-6">
        <Logo />
        <div className="mt-10">
          <EmptyState
            icon="alert"
            title="Este enlace no es válido"
            description="Pide a quien te invitó que te comparta el pase otra vez."
          />
        </div>
      </MobileFrame>
    );
  }

  const local = state.passes.find((pass) => pass.code === shared.code);
  const reference: Pass = local ?? {
    id: shared.code,
    code: shared.code,
    unit: shared.unit,
    residentName: shared.residentName,
    visitorName: shared.visitorName,
    visitorId: "",
    type: "family",
    date: shared.date,
    from: shared.from,
    to: shared.to,
    recurringDays: shared.recurringDays,
    createdAt: 0,
  };
  const status = passStatus(reference, nowMs, entries);
  const meta = PASS_STATUS_META[status];
  const usable = status === "valid" || status === "notYet" || status === "inside";
  const community = shared.community || state.settings.communityName;

  return (
    <MobileFrame bodyClassName="px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <Badge tone={status === "valid" ? "ok" : meta.tone}>
          {status === "valid" ? "Vigente" : meta.label}
        </Badge>
      </header>

      <h1 className="mt-6 font-display text-[28px] leading-tight font-bold tracking-tight">
        {firstName(shared.visitorName)}, tienes un pase para ingresar a {community}
      </h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        {shared.residentName} te espera en la villa {shared.unit}, {passValidityText(shared)}.
      </p>

      <div className="mt-6">
        <PassTicket
          code={shared.code}
          visitorName={shared.visitorName}
          residentName={shared.residentName}
          unit={shared.unit}
          date={shared.date}
          from={shared.from}
          to={shared.to}
          recurringDays={shared.recurringDays}
          community={community}
          dimmed={!usable}
        />
      </div>

      <p
        className={`mt-4 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-[15px] ${
          usable ? "border-line bg-surface text-ink" : "border-warn bg-warn-soft text-warn-ink"
        }`}
      >
        <Icon name={usable ? "scan" : "alert"} size={20} className="mt-0.5 shrink-0" />
        {VISITOR_NOTE[status]}
      </p>

      <ol className="mt-6 space-y-3 text-[15px]">
        {[
          `Llega a la ${(shared.gate || state.settings.gateName).toLowerCase()} en el horario indicado.`,
          "Muestra el código desde tu celular. No hace falta imprimirlo.",
          "Ten a la mano tu cédula por si el guardia la solicita.",
        ].map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-xs font-semibold">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <footer className="mt-10 border-t border-line pt-4 text-sm text-ink-muted">
        Pase emitido con VisitPass para {community}. Es personal y no se puede transferir.
      </footer>
    </MobileFrame>
  );
}

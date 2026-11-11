import { useState } from "react";
import { MobileFrame, MobileShell } from "@/components/layout/MobileShell";
import { Button, ButtonLink, cx } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import {
  capitalize,
  formatClock,
  formatDay,
  formatTime,
  formatWeekdays,
  VISIT_TYPE_LABEL,
} from "@/lib/format";
import { passSchedule, passStatus, type PassStatus } from "@/lib/passes";
import { Link, navigate } from "@/lib/router";
import {
  createRequest,
  now,
  registerEntryFromPass,
  useAllEntries,
  useAppState,
  useNow,
  useSession,
} from "@/lib/store";
import type { LogEntry, Pass } from "@/lib/types";

function rejection(
  status: PassStatus,
  pass: Pass,
  entries: LogEntry[],
): { title: string; reason: string } {
  const visit = entries.find((entry) => entry.passId === pass.id);
  switch (status) {
    case "expired":
      return {
        title: "Pase vencido",
        reason: `Era válido el ${formatDay(pass.date)} de ${formatClock(pass.from)} a ${formatClock(pass.to)}.`,
      };
    case "notYet":
      return {
        title: "Aún no vigente",
        reason: `Es válido desde el ${formatDay(pass.date)} a las ${formatClock(pass.from)}.`,
      };
    case "notToday":
      return {
        title: "No válido hoy",
        reason: `Pase recurrente para ${formatWeekdays(pass.recurringDays ?? [])}.`,
      };
    case "outOfHours":
      return {
        title: "Fuera de horario",
        reason: `Hoy es válido de ${formatClock(pass.from)} a ${formatClock(pass.to)}.`,
      };
    case "cancelled":
      return { title: "Pase cancelado", reason: `${pass.residentName} canceló esta autorización.` };
    case "inside":
    case "used":
      return {
        title: "Pase ya utilizado",
        reason: visit
          ? `La visita ingresó a las ${formatTime(visit.inAt)} con este código.`
          : "Este código ya se usó.",
      };
    case "valid":
      return { title: "Autorizado", reason: "" };
  }
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-white/70">{label}</dt>
      <dd className={cx("text-lg leading-tight font-semibold", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

export function ScanResult({ passId }: { passId: string }) {
  const account = useSession();
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow();
  const [registeredAt, setRegisteredAt] = useState<number | null>(null);

  const pass = state.passes.find((item) => item.id === passId);
  if (!pass || !account) {
    return (
      <MobileShell title="Resultado" back="/guard/scan">
        <EmptyState
          icon="search"
          title="Código no reconocido"
          description="Este código no corresponde a un pase de la ciudadela."
          action={
            <ButtonLink to="/guard/walk-in" variant="secondary">
              Registrar visita sin aviso
            </ButtonLink>
          }
        />
      </MobileShell>
    );
  }

  const status = passStatus(pass, nowMs, entries);
  const authorized = registeredAt !== null || status === "valid";
  const info = rejection(status, pass, entries);

  const registerEntry = () => {
    registerEntryFromPass(pass.id, account.name);
    setRegisteredAt(now());
  };

  const askResident = () => {
    const request = createRequest({
      visitorName: pass.visitorName,
      visitorId: pass.visitorId,
      plate: pass.plate,
      unit: pass.unit,
      type: pass.type,
      note: `Presentó el pase ${pass.code}. ${info.title}.`,
      guardName: account.name,
    });
    navigate(`/guard/request/${request.id}`);
  };

  return (
    <MobileFrame className={cx("text-white", authorized ? "bg-ok-strong!" : "bg-danger-strong!")}>
      <header className="flex h-14 items-center gap-2 px-4">
        <Link
          to="/guard/scan"
          aria-label="Volver a escanear"
          className="-ml-2 inline-flex size-10 items-center justify-center rounded-lg hover:bg-white/15"
        >
          <Icon name="chevronLeft" size={24} />
        </Link>
        <p className="font-mono text-sm font-medium tracking-[0.08em] uppercase">
          Pase {pass.code}
        </p>
      </header>

      <main className="flex flex-1 flex-col px-5 pb-6">
        <div className="pt-4">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-white/15">
            <Icon name={authorized ? "check" : "x"} size={32} />
          </span>
          <h1 className="mt-4 font-display text-[52px] leading-[0.95] font-extrabold tracking-tight">
            {registeredAt !== null ? "Ingreso registrado" : info.title}
          </h1>
          <p className="mt-3 text-lg text-white/85">
            {registeredAt !== null
              ? `${formatTime(registeredAt)} · Se avisó a ${pass.residentName}.`
              : authorized
                ? `Vigente hasta las ${formatClock(pass.to)}.`
                : info.reason}
          </p>
        </div>

        <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/25 pt-6">
          <div className="col-span-2">
            <dt className="text-sm text-white/70">Visitante</dt>
            <dd className="font-display text-[28px] leading-tight font-bold">{pass.visitorName}</dd>
          </div>
          <Detail label="Villa" value={String(pass.unit)} mono />
          <Detail label="Autoriza" value={pass.residentName} />
          <Detail label="Cédula" value={pass.visitorId} mono />
          <Detail label="Placa" value={pass.plate ?? "Sin vehículo"} mono={Boolean(pass.plate)} />
          <Detail label="Tipo" value={VISIT_TYPE_LABEL[pass.type]} />
          <Detail label="Vigencia" value={capitalize(passSchedule(pass))} />
        </dl>

        <div className="mt-auto space-y-3 pt-8">
          {registeredAt !== null ? (
            <>
              <ButtonLink to="/guard/scan" variant="inverse" size="lg" block icon="scan">
                Escanear otro pase
              </ButtonLink>
              <ButtonLink to="/guard/log" variant="outlineInverse" size="lg" block>
                Ver bitácora
              </ButtonLink>
            </>
          ) : authorized ? (
            <Button variant="inverse" size="lg" block icon="check" onClick={registerEntry}>
              Registrar ingreso
            </Button>
          ) : (
            <>
              {!state.backupMode && (
                <Button variant="inverse" size="lg" block icon="message" onClick={askResident}>
                  Enviar solicitud al residente
                </Button>
              )}
              <ButtonLink
                to={`/guard/incident?pass=${pass.id}`}
                variant="outlineInverse"
                size="lg"
                block
                icon="alert"
              >
                Registrar novedad
              </ButtonLink>
            </>
          )}
        </div>
      </main>
    </MobileFrame>
  );
}

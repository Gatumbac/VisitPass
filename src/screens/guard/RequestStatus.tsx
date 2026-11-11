import { useEffect } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button, ButtonLink, cx } from "@/components/ui/controls";
import { Avatar, EmptyState } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import { formatTime, maskId, VISIT_TYPE_LABEL } from "@/lib/format";
import { RESIDENT_UNIT } from "@/lib/seed";
import {
  registerEntryFromRequest,
  resolveRequest,
  useAppState,
  useNow,
  useSession,
} from "@/lib/store";

const NEIGHBOR_REPLY_MS = 6000;

export function RequestStatus({ requestId }: { requestId: string }) {
  const account = useSession();
  const state = useAppState();
  const nowMs = useNow(5000);
  const request = state.requests.find((item) => item.id === requestId);
  const unit = state.units.find((item) => item.number === request?.unit);
  const authorizer = unit?.residents.find((resident) => resident.canAuthorize);

  const awaitingNeighbor = request?.status === "pending" && request.unit !== RESIDENT_UNIT;
  const authorizerName = authorizer?.name;
  useEffect(() => {
    if (!awaitingNeighbor || !authorizerName) return;
    const timer = window.setTimeout(
      () => resolveRequest(requestId, true, authorizerName),
      NEIGHBOR_REPLY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [awaitingNeighbor, authorizerName, requestId]);

  if (!request || !account) {
    return (
      <MobileShell title="Solicitud" back="/guard">
        <EmptyState icon="search" title="No encontramos esa solicitud" />
      </MobileShell>
    );
  }

  const entry = state.log.find((item) => item.id === request.entryId);
  const waitingMinutes = Math.max(0, Math.floor((nowMs - request.createdAt) / 60_000));

  const registerEntry = () => {
    registerEntryFromRequest(request.id, account.name);
    toast(`Ingreso de ${request.visitorName} registrado`);
  };

  const tone =
    request.status === "approved"
      ? "border-ok bg-ok-soft text-ok-ink"
      : request.status === "rejected"
        ? "border-danger bg-danger-soft text-danger-ink"
        : "border-warn bg-warn-soft text-warn-ink";

  return (
    <MobileShell title="Solicitud de ingreso" back="/guard">
      <section aria-live="polite" className={cx("rounded-lg border p-5", tone)}>
        {request.status === "pending" && (
          <>
            <span className="relative inline-flex size-12 items-center justify-center">
              <span className="animate-pulse-ring absolute inset-0 rounded-full bg-warn" />
              <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-warn text-ink">
                <Icon name="clock" size={24} />
              </span>
            </span>
            <h2 className="mt-4 font-display text-[32px] leading-none font-extrabold tracking-tight">
              Esperando respuesta
            </h2>
            <p className="mt-2 text-[15px]">
              {authorizer?.name ?? "El residente"} recibió la solicitud en su celular.
              {waitingMinutes > 0 && ` Lleva ${waitingMinutes} min en espera.`}
            </p>
          </>
        )}
        {request.status === "approved" && (
          <>
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-ok-strong text-white">
              <Icon name="check" size={26} />
            </span>
            <h2 className="mt-4 font-display text-[32px] leading-none font-extrabold tracking-tight">
              {entry ? "Ingreso registrado" : "Aprobado"}
            </h2>
            <p className="mt-2 text-[15px]">
              {entry
                ? `Entró a las ${formatTime(entry.inAt)}. Quedó en la bitácora.`
                : `${request.resolvedBy} autorizó el ingreso a las ${formatTime(request.resolvedAt ?? nowMs)}.`}
            </p>
          </>
        )}
        {request.status === "rejected" && (
          <>
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-danger-strong text-white">
              <Icon name="x" size={26} />
            </span>
            <h2 className="mt-4 font-display text-[32px] leading-none font-extrabold tracking-tight">
              Rechazado
            </h2>
            <p className="mt-2 text-[15px]">
              {request.resolvedBy} no autorizó el ingreso. La novedad quedó registrada a las{" "}
              {formatTime(request.resolvedAt ?? nowMs)}.
            </p>
          </>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Avatar name={request.visitorName} size={48} />
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight font-semibold">
              {request.visitorName}
            </p>
            <p className="text-sm text-ink-muted">
              {VISIT_TYPE_LABEL[request.type]} · Llegó {formatTime(request.createdAt)}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-ink-muted">Villa</dt>
            <dd className="font-mono font-medium">{request.unit}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Cédula</dt>
            <dd className="font-mono font-medium">{maskId(request.visitorId)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Placa</dt>
            <dd className="font-mono font-medium">{request.plate ?? "No"}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-5 space-y-3">
        {request.status === "approved" && !entry && (
          <Button variant="ok" size="lg" block icon="check" onClick={registerEntry}>
            Registrar ingreso
          </Button>
        )}
        {request.status === "approved" && entry && (
          <ButtonLink to="/guard/log" size="lg" block icon="book">
            Ver bitácora
          </ButtonLink>
        )}
        {request.status === "rejected" && (
          <ButtonLink to="/guard/incident" variant="secondary" size="lg" block icon="alert">
            Ver novedades del turno
          </ButtonLink>
        )}
        <ButtonLink to="/guard" variant="secondary" block>
          Volver al turno
        </ButtonLink>
      </div>
    </MobileShell>
  );
}

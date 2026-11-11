import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/controls";
import { Avatar, EmptyState, SectionTitle } from "@/components/ui/display";
import { toast } from "@/components/ui/toast";
import { RowList, VisitRow } from "@/components/VisitRow";
import { dateKey, formatTime, VISIT_TYPE_LABEL } from "@/lib/format";
import { resolveRequest, useAppState, useNow, useSession } from "@/lib/store";
import type { WalkInRequest } from "@/lib/types";

function RequestCard({ request, residentName }: { request: WalkInRequest; residentName: string }) {
  const { settings } = useAppState();

  const approve = () => {
    resolveRequest(request.id, true, residentName);
    toast(`Autorizaste el ingreso de ${request.visitorName}`);
  };
  const reject = () => {
    resolveRequest(request.id, false, residentName);
    toast(`Rechazaste el ingreso de ${request.visitorName}`, "info");
  };

  return (
    <article className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar name={request.visitorName} size={52} />
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight font-semibold">{request.visitorName}</p>
          <p className="text-sm text-ink-muted">{VISIT_TYPE_LABEL[request.type]}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-ink-muted">Llegó</dt>
          <dd className="font-mono font-medium">{formatTime(request.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Garita</dt>
          <dd className="font-medium">{settings.gateName}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Cédula</dt>
          <dd className="font-mono font-medium">{request.visitorId}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Placa</dt>
          <dd className={request.plate ? "font-mono font-medium" : "font-medium"}>
            {request.plate ?? "Sin vehículo"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-muted">Registró</dt>
          <dd className="font-medium">{request.guardName}, guardia de turno</dd>
        </div>
        {request.note && (
          <div className="col-span-2">
            <dt className="text-ink-muted">Motivo</dt>
            <dd className="font-medium">{request.note}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="dangerOutline" size="lg" icon="x" onClick={reject}>
          Rechazar
        </Button>
        <Button variant="ok" size="lg" icon="check" onClick={approve}>
          Aprobar
        </Button>
      </div>
    </article>
  );
}

export function Requests() {
  const account = useSession();
  const state = useAppState();
  const nowMs = useNow();
  if (!account?.unit) return null;

  const today = dateKey(nowMs);
  const mine = state.requests.filter((request) => request.unit === account.unit);
  const pending = mine.filter((request) => request.status === "pending");
  const resolved = mine
    .filter((request) => request.status !== "pending" && dateKey(request.createdAt) === today)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <MobileShell title="Solicitudes" back="/resident">
      {pending.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Sin solicitudes pendientes"
          description="Si una visita llega sin aviso, la garita te enviará la solicitud aquí para que la apruebes o la rechaces."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-[15px] text-ink-muted">
            {pending.length === 1 ? "Una visita espera" : `${pending.length} visitas esperan`} tu
            respuesta en la garita.
          </p>
          {pending.map((request) => (
            <RequestCard key={request.id} request={request} residentName={account.name} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Respondidas hoy</SectionTitle>
          <RowList>
            {resolved.map((request) => (
              <VisitRow
                key={request.id}
                name={request.visitorName}
                summary={`${VISIT_TYPE_LABEL[request.type]} · Llegó ${formatTime(request.createdAt)}`}
                label={request.status === "approved" ? "Aprobada" : "Rechazada"}
                tone={request.status === "approved" ? "ok" : "danger"}
              />
            ))}
          </RowList>
        </section>
      )}
    </MobileShell>
  );
}

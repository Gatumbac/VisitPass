import { useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PassTicket } from "@/components/PassTicket";
import { Button } from "@/components/ui/controls";
import { Badge, EmptyState, Sheet } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import { firstName, VISIT_TYPE_LABEL } from "@/lib/format";
import { encodeSharedPass, PASS_STATUS_META, passStatus, passValidityText } from "@/lib/passes";
import { absoluteUrl, navigate } from "@/lib/router";
import { cancelPass, useAllEntries, useAppState, useNow, useSession } from "@/lib/store";

export function PassDetail({ passId }: { passId: string }) {
  const account = useSession();
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow();
  const [sharing, setSharing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pass = state.passes.find((item) => item.id === passId && item.unit === account?.unit);
  if (!pass) {
    return (
      <MobileShell title="Pase" back="/resident">
        <EmptyState
          icon="search"
          title="No encontramos ese pase"
          description="Puede que ya no esté disponible."
        />
      </MobileShell>
    );
  }

  const status = passStatus(pass, nowMs, entries);
  const meta = PASS_STATUS_META[status];
  const cancelled = status === "cancelled";
  const link = absoluteUrl(
    `/visitor/${encodeSharedPass(pass, state.settings.communityName, state.settings.gateName)}`,
  );
  const message = `Hola ${firstName(pass.visitorName)}, este es tu pase para ingresar a ${state.settings.communityName}. Es válido ${passValidityText(pass)}. Muestra el código en la garita: ${link}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Enlace copiado");
    } catch {
      toast("No se pudo copiar. Mantén presionado el enlace para copiarlo.", "warn");
    }
  };

  const confirmCancel = () => {
    cancelPass(pass.id);
    setCancelling(false);
    toast("Pase cancelado");
    navigate("/resident");
  };

  return (
    <MobileShell title="Pase de visita" back="/resident">
      <PassTicket
        code={pass.code}
        visitorName={pass.visitorName}
        residentName={pass.residentName}
        unit={pass.unit}
        date={pass.date}
        from={pass.from}
        to={pass.to}
        recurringDays={pass.recurringDays}
        community={state.settings.communityName}
        status={<Badge tone={meta.tone}>{meta.label}</Badge>}
        dimmed={cancelled}
      />

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
        <div>
          <dt className="text-ink-muted">Tipo</dt>
          <dd className="font-medium">{VISIT_TYPE_LABEL[pass.type]}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Cédula</dt>
          <dd className="font-mono font-medium">{pass.visitorId}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Placa</dt>
          <dd className={pass.plate ? "font-mono font-medium" : "font-medium"}>
            {pass.plate ?? "No"}
          </dd>
        </div>
      </dl>

      {!cancelled && (
        <div className="mt-5 space-y-3">
          <Button size="lg" block icon="message" onClick={() => setSharing(true)}>
            Compartir por WhatsApp
          </Button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface text-[15px] font-semibold text-ink transition-colors hover:bg-paper"
          >
            <Icon name="eye" />
            Ver como visitante
          </a>
          <Button variant="dangerOutline" block onClick={() => setCancelling(true)}>
            Cancelar pase
          </Button>
        </div>
      )}

      {sharing && (
        <Sheet title="Compartir pase" onClose={() => setSharing(false)}>
          <p className="mb-2 text-sm text-ink-muted">
            Así recibirá el mensaje {firstName(pass.visitorName)}
          </p>
          <div className="rounded-lg rounded-tl-none border border-line bg-paper p-3 text-[15px] leading-snug break-words">
            {message}
          </div>
          <div className="mt-5 space-y-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setSharing(false)}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-brand text-base font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Icon name="message" />
              Abrir WhatsApp
            </a>
            <Button variant="secondary" block icon="copy" onClick={copyLink}>
              Copiar enlace
            </Button>
          </div>
        </Sheet>
      )}

      {cancelling && (
        <Sheet title="¿Cancelar este pase?" onClose={() => setCancelling(false)}>
          <p className="text-[15px] text-ink-muted">
            {pass.visitorName} ya no podrá ingresar con este código. Si cambias de idea, tendrás que
            generar un pase nuevo.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              Conservar
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Cancelar pase
            </Button>
          </div>
        </Sheet>
      )}
    </MobileShell>
  );
}

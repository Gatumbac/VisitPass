import { useState, type FormEvent } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button, Field, Select, TextArea, TextInput, TimeSelect } from "@/components/ui/controls";
import { Badge, SectionTitle } from "@/components/ui/display";
import { toast } from "@/components/ui/toast";
import {
  dateKey,
  formatTime,
  INCIDENT_LABEL,
  parseDateKey,
  timeKey,
  toMinutes,
} from "@/lib/format";
import { passStatus } from "@/lib/passes";
import { queryParam, usePath } from "@/lib/router";
import {
  addIncident,
  getState,
  now,
  useAllEntries,
  useAppState,
  useNow,
  useSession,
} from "@/lib/store";
import type { IncidentKind } from "@/lib/types";

const KINDS: IncidentKind[] = ["unauthorized", "rejected", "incident", "other"];
const MIN_DESCRIPTION = 10;

function draftFromPass(passId: string | null): { description: string; unit: string } {
  const pass = getState().passes.find((item) => item.id === passId);
  if (!pass) return { description: "", unit: "" };
  return {
    description: `${pass.visitorName} presentó el pase ${pass.code}, que no está vigente. No se permitió el ingreso.`,
    unit: String(pass.unit),
  };
}

export function IncidentForm() {
  const account = useSession();
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow();
  const passId = queryParam(usePath(), "pass");
  const [draft] = useState(() => draftFromPass(passId));
  const [kind, setKind] = useState<IncidentKind>(passId ? "unauthorized" : "incident");
  const [description, setDescription] = useState(draft.description);
  const [unit, setUnit] = useState(draft.unit);
  const [time, setTime] = useState(() => timeKey(now()));
  const [error, setError] = useState("");
  if (!account) return null;

  const today = dateKey(nowMs);
  const todayIncidents = state.incidents
    .filter((item) => dateKey(item.at) === today)
    .sort((a, b) => b.at - a.at);
  const sourcePass = state.passes.find((item) => item.id === passId);
  const sourceStatus = sourcePass ? passStatus(sourcePass, nowMs, entries) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (description.trim().length < MIN_DESCRIPTION) {
      setError("Describe lo que pasó con un poco más de detalle.");
      return;
    }
    if (!time || toMinutes(time) > toMinutes(timeKey(now()))) {
      setError("La hora no puede ser posterior a la actual.");
      return;
    }
    const at = parseDateKey(today).getTime() + toMinutes(time) * 60_000;
    addIncident({
      kind,
      description: description.trim(),
      at,
      guardName: account.name,
      unit: unit ? Number(unit) : undefined,
    });
    toast("Novedad registrada");
    setDescription("");
    setUnit("");
    setKind("incident");
    setError("");
  };

  return (
    <MobileShell title="Registrar novedad" back="/guard">
      {sourcePass &&
        sourceStatus &&
        sourceStatus !== "valid" &&
        description === draft.description && (
          <p className="mb-5 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            Novedad sobre el pase <span className="font-mono font-semibold">{sourcePass.code}</span>{" "}
            de la villa {sourcePass.unit}. Revisa el texto y guarda.
          </p>
        )}

      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Tipo de novedad" htmlFor="kind">
          <Select
            id="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as IncidentKind)}
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {INCIDENT_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descripción" htmlFor="description" error={error}>
          <TextArea
            id="description"
            placeholder="Qué pasó, quién estuvo involucrado y qué se hizo"
            value={description}
            invalid={Boolean(error)}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora" htmlFor="time">
            <TimeSelect id="time" stepMinutes={5} value={time} onChange={setTime} />
          </Field>
          <Field label="Villa" htmlFor="unit" optional>
            <TextInput
              id="unit"
              mono
              inputMode="numeric"
              maxLength={3}
              placeholder="24"
              value={unit}
              onChange={(event) => setUnit(event.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>

        <Button type="submit" size="lg" block>
          Guardar novedad
        </Button>
      </form>

      <section className="mt-8">
        <SectionTitle>Novedades de hoy</SectionTitle>
        {todayIncidents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-muted">
            Turno sin novedades hasta ahora.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {todayIncidents.map((item) => (
              <li key={item.id} className="px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    tone={item.kind === "incident" || item.kind === "other" ? "warn" : "danger"}
                  >
                    {INCIDENT_LABEL[item.kind]}
                  </Badge>
                  <span className="font-mono text-xs text-ink-muted">
                    {formatTime(item.at)}
                    {item.unit ? ` · Villa ${item.unit}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-snug">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MobileShell>
  );
}

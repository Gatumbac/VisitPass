import { useState, type FormEvent } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button, Field, Select, TextInput } from "@/components/ui/controls";
import { toast } from "@/components/ui/toast";
import { VISIT_TYPE_LABEL } from "@/lib/format";
import { navigate } from "@/lib/router";
import { createRequest, registerPhoneEntry, useAppState, useSession } from "@/lib/store";
import type { VisitType } from "@/lib/types";

const VISIT_TYPES: VisitType[] = ["delivery", "supplier", "family", "friend", "domestic"];
const ID_PATTERN = /^\d{10}$/;
const PLATE_PATTERN = /^[A-Z]{2,3}-?\d{3,4}[A-Z]?$/;

type Errors = Partial<Record<"visitorName" | "visitorId" | "plate" | "unit", string>>;

export function WalkIn() {
  const account = useSession();
  const state = useAppState();
  const [visitorName, setVisitorName] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [plate, setPlate] = useState("");
  const [unit, setUnit] = useState("");
  const [type, setType] = useState<VisitType>("delivery");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  if (!account) return null;

  const clear = (field: keyof Errors) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const selectedUnit = state.units.find((item) => item.number === Number(unit));
  const authorizer = selectedUnit?.residents.find((resident) => resident.canAuthorize);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (visitorName.trim().length < 3) next.visitorName = "Escribe el nombre de la visita.";
    if (!ID_PATTERN.test(visitorId)) next.visitorId = "La cédula tiene 10 dígitos.";
    if (plate && !PLATE_PATTERN.test(plate)) next.plate = "Revisa la placa, por ejemplo GBA-1234.";
    if (!selectedUnit) next.unit = "Elige la villa de destino.";
    else if (!authorizer) next.unit = "Esa villa no tiene residentes que puedan autorizar.";
    setErrors(next);
    if (Object.values(next).some(Boolean) || !selectedUnit || !authorizer) return;

    const base = {
      visitorName: visitorName.trim(),
      visitorId,
      plate: plate || undefined,
      unit: selectedUnit.number,
      type,
      guardName: account.name,
    };

    if (state.backupMode) {
      registerPhoneEntry({ ...base, authorizedBy: authorizer.name });
      toast("Ingreso guardado. Se enviará al volver el internet.", "warn");
      navigate("/guard/log");
      return;
    }

    const request = createRequest({ ...base, note: note.trim() || undefined });
    navigate(`/guard/request/${request.id}`);
  };

  return (
    <MobileShell title="Visita sin aviso" back="/guard">
      <p className="mb-5 text-[15px] text-ink-muted">
        {state.backupMode
          ? "Sin conexión no se puede enviar la solicitud. Confirma con el residente por el intercomunicador y registra el ingreso."
          : "Registra a la visita y el residente recibirá la solicitud en su celular."}
      </p>

      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Nombre de la visita" htmlFor="visitorName" error={errors.visitorName}>
          <TextInput
            id="visitorName"
            autoComplete="off"
            placeholder="Nombre y apellido"
            value={visitorName}
            invalid={Boolean(errors.visitorName)}
            onChange={(event) => {
              setVisitorName(event.target.value);
              clear("visitorName");
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula" htmlFor="visitorId" error={errors.visitorId}>
            <TextInput
              id="visitorId"
              mono
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              placeholder="0912345678"
              value={visitorId}
              invalid={Boolean(errors.visitorId)}
              onChange={(event) => {
                setVisitorId(event.target.value.replace(/\D/g, ""));
                clear("visitorId");
              }}
            />
          </Field>
          <Field label="Placa" htmlFor="plate" optional error={errors.plate}>
            <TextInput
              id="plate"
              mono
              autoComplete="off"
              maxLength={8}
              placeholder="GBA-1234"
              value={plate}
              invalid={Boolean(errors.plate)}
              onChange={(event) => {
                setPlate(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
                clear("plate");
              }}
            />
          </Field>
        </div>

        <Field
          label="Villa de destino"
          htmlFor="unit"
          error={errors.unit}
          hint={authorizer ? `Autoriza ${authorizer.name}` : undefined}
        >
          <Select
            id="unit"
            value={unit}
            invalid={Boolean(errors.unit)}
            onChange={(event) => {
              setUnit(event.target.value);
              clear("unit");
            }}
          >
            <option value="">Elegir villa</option>
            {state.units.map((item) => (
              <option key={item.number} value={item.number}>
                Villa {item.number} · {item.residents[0]?.name ?? "Sin residentes"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Motivo" htmlFor="type">
          <Select
            id="type"
            value={type}
            onChange={(event) => setType(event.target.value as VisitType)}
          >
            {VISIT_TYPES.map((value) => (
              <option key={value} value={value}>
                {VISIT_TYPE_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        {!state.backupMode && (
          <Field label="Detalle para el residente" htmlFor="note" optional>
            <TextInput
              id="note"
              autoComplete="off"
              placeholder="Por ejemplo: pedido de comida"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        )}

        <Button type="submit" size="lg" block icon={state.backupMode ? "check" : "message"}>
          {state.backupMode ? "Registrar ingreso" : "Enviar solicitud"}
        </Button>
      </form>
    </MobileShell>
  );
}

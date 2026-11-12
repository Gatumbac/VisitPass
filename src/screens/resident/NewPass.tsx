import { useState, type FormEvent } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import {
  Button,
  cx,
  DateInput,
  Field,
  Select,
  TextInput,
  TimeSelect,
  Toggle,
} from "@/components/ui/controls";
import { toast } from "@/components/ui/toast";
import {
  dateKey,
  formatClock,
  timeKey,
  toMinutes,
  VISIT_TYPE_LABEL,
  WEEKDAY_LETTERS,
} from "@/lib/format";
import { navigate } from "@/lib/router";
import { createPass, now, useAppState, useSession } from "@/lib/store";
import type { VisitType } from "@/lib/types";

const VISIT_TYPES: VisitType[] = ["family", "friend", "supplier", "delivery", "domestic"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const ID_PATTERN = /^\d{10}$/;
const PLATE_PATTERN = /^[A-Z]{2,3}-?\d{3,4}[A-Z]?$/;

type Errors = Partial<
  Record<"visitorName" | "visitorId" | "plate" | "date" | "hours" | "days", string>
>;

function defaultHours(): { from: string; to: string } {
  const hour = Math.min(new Date(now()).getHours(), 21);
  const pad = (value: number) => String(value).padStart(2, "0");
  return { from: `${pad(hour)}:00`, to: `${pad(hour + 2)}:00` };
}

export function NewPass() {
  const account = useSession();
  const { settings } = useAppState();
  const [visitorName, setVisitorName] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<VisitType>("family");
  const [date, setDate] = useState(() => dateKey(now()));
  const [hours, setHours] = useState(defaultHours);
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [errors, setErrors] = useState<Errors>({});
  if (!account?.unit) return null;

  const clear = (field: keyof Errors) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
    clear("days");
  };

  const validate = (): Errors => {
    const next: Errors = {};
    const today = dateKey(now());
    const fromMinutes = toMinutes(hours.from);
    const toMinutesValue = toMinutes(hours.to);

    if (visitorName.trim().length < 3)
      next.visitorName = "Escribe el nombre y apellido de tu visita.";
    if (!ID_PATTERN.test(visitorId)) next.visitorId = "La cédula tiene 10 dígitos.";
    if (plate && !PLATE_PATTERN.test(plate))
      next.plate = "Usa el formato de la placa, por ejemplo GBA-1234.";

    if (!hours.from || !hours.to) next.hours = "Indica desde y hasta qué hora puede ingresar.";
    else if (toMinutesValue <= fromMinutes)
      next.hours = "La hora final debe ser posterior a la inicial.";
    else if (toMinutesValue - fromMinutes > settings.maxPassHours * 60)
      next.hours = `Un pase dura como máximo ${settings.maxPassHours} horas.`;
    else if (
      type === "supplier" &&
      (fromMinutes < toMinutes(settings.supplierFrom) ||
        toMinutesValue > toMinutes(settings.supplierTo))
    )
      next.hours = `Los proveedores ingresan de ${formatClock(settings.supplierFrom)} a ${formatClock(settings.supplierTo)}.`;

    if (recurring) {
      if (days.length === 0) next.days = "Elige al menos un día.";
    } else if (!date) next.date = "Elige la fecha de la visita.";
    else if (date < today) next.date = "La fecha ya pasó.";
    else if (date === today && !next.hours && toMinutesValue <= toMinutes(timeKey(now())))
      next.hours = "Ese horario ya terminó. Elige una hora posterior.";

    return next;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    const pass = createPass({
      unit: account.unit as number,
      residentName: account.name,
      visitorName: visitorName.trim(),
      visitorId,
      plate: plate || undefined,
      type,
      date: recurring ? dateKey(now()) : date,
      from: hours.from,
      to: hours.to,
      recurringDays: recurring ? [...days].sort() : undefined,
    });
    toast("Pase generado");
    navigate(`/resident/pass/${pass.id}`);
  };

  return (
    <MobileShell title="Nueva autorización" back="/resident">
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

        <Field label="Tipo de visita" htmlFor="type">
          <Select
            id="type"
            value={type}
            onChange={(event) => {
              setType(event.target.value as VisitType);
              clear("hours");
            }}
          >
            {VISIT_TYPES.map((value) => (
              <option key={value} value={value}>
                {VISIT_TYPE_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-lg border border-line bg-surface p-4">
          <Toggle
            id="recurring"
            label="Pase recurrente"
            description="Se repite los días que elijas, en el mismo horario."
            checked={recurring}
            onChange={setRecurring}
          />
          {recurring && (
            <div className="mt-4">
              <div role="group" aria-label="Días de la semana" className="grid grid-cols-7 gap-1.5">
                {WEEK_ORDER.map((day) => {
                  const active = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={active}
                      aria-label={WEEKDAY_NAMES[day]}
                      onClick={() => toggleDay(day)}
                      className={cx(
                        "h-11 rounded-lg border font-mono text-sm font-semibold transition-colors",
                        active
                          ? "border-brand bg-brand text-white"
                          : "border-line-strong bg-surface text-ink-muted hover:bg-paper",
                      )}
                    >
                      {WEEKDAY_LETTERS[day]}
                    </button>
                  );
                })}
              </div>
              {errors.days && (
                <p role="alert" className="mt-1.5 text-sm text-danger-ink">
                  {errors.days}
                </p>
              )}
            </div>
          )}
        </div>

        {!recurring && (
          <Field label="Fecha" htmlFor="date" error={errors.date}>
            <DateInput
              id="date"
              min={dateKey(now())}
              value={date}
              invalid={Boolean(errors.date)}
              onChange={(value) => {
                setDate(value);
                clear("date");
              }}
            />
          </Field>
        )}

        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" htmlFor="from">
              <TimeSelect
                id="from"
                value={hours.from}
                invalid={Boolean(errors.hours)}
                onChange={(from) => {
                  setHours((current) => ({ ...current, from }));
                  clear("hours");
                }}
              />
            </Field>
            <Field label="Hasta" htmlFor="to">
              <TimeSelect
                id="to"
                value={hours.to}
                invalid={Boolean(errors.hours)}
                onChange={(to) => {
                  setHours((current) => ({ ...current, to }));
                  clear("hours");
                }}
              />
            </Field>
          </div>
          {errors.hours && (
            <p role="alert" className="mt-1.5 text-sm text-danger-ink">
              {errors.hours}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" block>
          Generar pase
        </Button>
      </form>
    </MobileShell>
  );
}

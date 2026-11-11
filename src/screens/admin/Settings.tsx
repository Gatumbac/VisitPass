import { useState, type FormEvent, type ReactNode } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Field, Select, TextInput, TimeSelect, Toggle } from "@/components/ui/controls";
import { Badge } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import { toMinutes } from "@/lib/format";
import { updateSettings, useAppState } from "@/lib/store";

const PASS_HOUR_OPTIONS = [4, 8, 12, 24];
const PLAN_FEATURES = [
  "Autorizaciones y pases con código QR sin límite",
  "Bitácora digital y reportes de gestión",
  "Configuración inicial y capacitación a guardias y residentes",
  "Soporte técnico de lunes a sábado",
];

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-line py-7 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <div className="rounded-lg border border-line bg-surface p-5">{children}</div>
    </section>
  );
}

export function Settings() {
  const { settings } = useAppState();
  const [form, setForm] = useState(settings);
  const [error, setError] = useState("");

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form.communityName.trim().length < 3) {
      setError("Escribe el nombre de la ciudadela.");
      return;
    }
    if (toMinutes(form.supplierTo) <= toMinutes(form.supplierFrom)) {
      setError("El horario de proveedores debe terminar después de la hora de inicio.");
      return;
    }
    setError("");
    updateSettings({ ...form, communityName: form.communityName.trim() });
    toast("Cambios guardados");
  };

  return (
    <AdminShell
      title="Configuración"
      subtitle="Datos de la ciudadela, reglas de ingreso y plan contratado"
    >
      <form onSubmit={submit} noValidate>
        <Panel
          title="Ciudadela"
          description="Estos datos aparecen en los pases que reciben las visitas."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="communityName">
              <TextInput
                id="communityName"
                value={form.communityName}
                onChange={(event) => setForm({ ...form, communityName: event.target.value })}
              />
            </Field>
            <Field label="Ciudad" htmlFor="city">
              <TextInput
                id="city"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </Field>
            <Field label="Dirección" htmlFor="address">
              <TextInput
                id="address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </Field>
            <Field label="Garita de ingreso de visitas" htmlFor="gateName">
              <TextInput
                id="gateName"
                value={form.gateName}
                onChange={(event) => setForm({ ...form, gateName: event.target.value })}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Reglas de ingreso"
          description="Se aplican cuando un residente genera un pase."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Duración máxima de un pase" htmlFor="maxPassHours">
              <Select
                id="maxPassHours"
                value={form.maxPassHours}
                onChange={(event) => setForm({ ...form, maxPassHours: Number(event.target.value) })}
              >
                {PASS_HOUR_OPTIONS.map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} horas
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Proveedores desde" htmlFor="supplierFrom">
              <TimeSelect
                id="supplierFrom"
                value={form.supplierFrom}
                onChange={(supplierFrom) => setForm({ ...form, supplierFrom })}
              />
            </Field>
            <Field label="Proveedores hasta" htmlFor="supplierTo">
              <TimeSelect
                id="supplierTo"
                value={form.supplierTo}
                onChange={(supplierTo) => setForm({ ...form, supplierTo })}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Plan de suscripción"
          description="La administración contrata el servicio para toda la ciudadela."
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-2xl leading-tight font-bold tracking-tight">
                Plan mensual
              </p>
              <p className="text-sm text-ink-muted">
                Hasta {form.unitCount} viviendas · Renovación el 1 de diciembre de 2026
              </p>
            </div>
            <Badge tone="ok">Activo</Badge>
          </div>
          <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-ok-ink" />
                {feature}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Publicidad de negocios cercanos"
          description="Los residentes ven un espacio patrocinado en su pantalla de inicio."
        >
          <Toggle
            id="adsEnabled"
            label="Mostrar espacios patrocinados"
            description="Farmacias, restaurantes y servicios para el hogar de la zona."
            checked={form.adsEnabled}
            onChange={(checked) => setForm({ ...form, adsEnabled: checked })}
          />
        </Panel>

        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-paper px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          {error && (
            <p role="alert" className="mr-auto text-sm text-danger-ink">
              {error}
            </p>
          )}
          <Button variant="secondary" disabled={!dirty} onClick={() => setForm(settings)}>
            Descartar
          </Button>
          <Button type="submit" disabled={!dirty}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </AdminShell>
  );
}

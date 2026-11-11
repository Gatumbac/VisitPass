import { useMemo, useState, type FormEvent } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, Field, Select, TextInput, Toggle } from "@/components/ui/controls";
import { Badge, Sheet } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { Pagination, Table, Td, Th } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { normalize } from "@/lib/format";
import { MONTH_START } from "@/lib/seed";
import { removeResident, saveResident, useAllEntries, useAppState } from "@/lib/store";
import type { Resident } from "@/lib/types";

const PAGE_SIZE = 12;
const RELATION_LABEL: Record<Resident["relation"], string> = {
  owner: "Propietario",
  tenant: "Arrendatario",
  family: "Familiar",
};

type Draft = {
  id?: string;
  name: string;
  unit: string;
  relation: Resident["relation"];
  canAuthorize: boolean;
};

const EMPTY_DRAFT: Draft = { name: "", unit: "", relation: "family", canAuthorize: true };

export function Units() {
  const state = useAppState();
  const entries = useAllEntries();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<{ name?: string; unit?: string }>({});

  const visitsByUnit = useMemo(() => {
    const counts = new Map<number, number>();
    for (const entry of entries) {
      if (entry.inAt >= MONTH_START) counts.set(entry.unit, (counts.get(entry.unit) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const wanted = normalize(query.trim());
  const filtered = state.units.filter(
    (unit) =>
      wanted === "" ||
      String(unit.number) === wanted ||
      unit.residents.some((resident) => normalize(resident.name).includes(wanted)),
  );
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const residentCount = state.units.reduce((sum, unit) => sum + unit.residents.length, 0);
  const authorizerCount = state.units.reduce(
    (sum, unit) => sum + unit.residents.filter((resident) => resident.canAuthorize).length,
    0,
  );

  const open = (next: Draft) => {
    setErrors({});
    setDraft(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const next: { name?: string; unit?: string } = {};
    const unitNumber = Number(draft.unit);
    if (draft.name.trim().length < 3) next.name = "Escribe el nombre completo.";
    if (!state.units.some((unit) => unit.number === unitNumber)) next.unit = "Elige una villa.";
    setErrors(next);
    if (next.name || next.unit) return;
    saveResident({
      id: draft.id,
      name: draft.name.trim(),
      unit: unitNumber,
      relation: draft.relation,
      canAuthorize: draft.canAuthorize,
    });
    toast(draft.id ? "Residente actualizado" : `Residente agregado a la villa ${unitNumber}`);
    setDraft(null);
  };

  const remove = () => {
    if (!draft?.id) return;
    removeResident(draft.id);
    toast("Residente retirado de la villa", "info");
    setDraft(null);
  };

  return (
    <AdminShell
      title="Viviendas y residentes"
      subtitle={`${state.units.length} villas · ${residentCount} residentes · ${authorizerCount} pueden autorizar visitas`}
      actions={
        <Button icon="plus" onClick={() => open(EMPTY_DRAFT)}>
          Agregar residente
        </Button>
      }
    >
      <div className="relative mb-4 max-w-sm">
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
        />
        <TextInput
          aria-label="Buscar por villa o nombre"
          placeholder="Buscar por villa o nombre"
          className="pl-10"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </div>

      <Table label="Viviendas y residentes">
        <thead>
          <tr>
            <Th className="w-24">Villa</Th>
            <Th>Residentes</Th>
            <Th className="w-40 text-right">Visitas en noviembre</Th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <Td colSpan={3} className="py-8 text-center text-ink-muted">
                Ninguna villa coincide con la búsqueda.
              </Td>
            </tr>
          )}
          {visible.map((unit) => (
            <tr key={unit.number} className="last:*:border-b-0">
              <Td className="font-mono text-base font-semibold tabular-nums">{unit.number}</Td>
              <Td>
                {unit.residents.length === 0 ? (
                  <span className="text-ink-muted">Sin residentes registrados</span>
                ) : (
                  <ul className="space-y-1.5">
                    {unit.residents.map((resident) => (
                      <li key={resident.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">{resident.name}</span>
                        <span className="text-ink-muted">{RELATION_LABEL[resident.relation]}</span>
                        <Badge tone={resident.canAuthorize ? "info" : "neutral"}>
                          {resident.canAuthorize ? "Autoriza visitas" : "No autoriza"}
                        </Badge>
                        <button
                          type="button"
                          aria-label={`Editar a ${resident.name}`}
                          onClick={() =>
                            open({
                              id: resident.id,
                              name: resident.name,
                              unit: String(resident.unit),
                              relation: resident.relation,
                              canAuthorize: resident.canAuthorize,
                            })
                          }
                          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-brand hover:bg-brand-soft"
                        >
                          <Icon name="pencil" size={14} />
                          Editar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Td>
              <Td className="text-right font-mono tabular-nums">
                {visitsByUnit.get(unit.number) ?? 0}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onChange={setPage}
        noun="villas"
      />

      {draft && (
        <Sheet
          title={draft.id ? "Editar residente" : "Agregar residente"}
          onClose={() => setDraft(null)}
          wide
        >
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="Nombre completo" htmlFor="resident-name" error={errors.name}>
              <TextInput
                id="resident-name"
                autoComplete="off"
                value={draft.name}
                invalid={Boolean(errors.name)}
                onChange={(event) => {
                  setDraft({ ...draft, name: event.target.value });
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Villa" htmlFor="resident-unit" error={errors.unit}>
                <Select
                  id="resident-unit"
                  value={draft.unit}
                  invalid={Boolean(errors.unit)}
                  onChange={(event) => {
                    setDraft({ ...draft, unit: event.target.value });
                    setErrors((current) => ({ ...current, unit: undefined }));
                  }}
                >
                  <option value="">Elegir</option>
                  {state.units.map((unit) => (
                    <option key={unit.number} value={unit.number}>
                      Villa {unit.number}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Relación" htmlFor="resident-relation">
                <Select
                  id="resident-relation"
                  value={draft.relation}
                  onChange={(event) =>
                    setDraft({ ...draft, relation: event.target.value as Resident["relation"] })
                  }
                >
                  {(Object.keys(RELATION_LABEL) as Array<Resident["relation"]>).map((value) => (
                    <option key={value} value={value}>
                      {RELATION_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="rounded-lg border border-line p-4">
              <Toggle
                id="resident-authorize"
                label="Puede autorizar visitas"
                description="Recibe las solicitudes de la garita y puede generar pases."
                checked={draft.canAuthorize}
                onChange={(checked) => setDraft({ ...draft, canAuthorize: checked })}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3 pt-2">
              {draft.id ? (
                <Button variant="dangerOutline" icon="trash" onClick={remove}>
                  Retirar de la villa
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setDraft(null)}>
                  Cancelar
                </Button>
                <Button type="submit">{draft.id ? "Guardar cambios" : "Agregar"}</Button>
              </div>
            </div>
          </form>
        </Sheet>
      )}
    </AdminShell>
  );
}

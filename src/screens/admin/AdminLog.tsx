import { useMemo, useState } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Button, DateInput, Select, TextInput } from "@/components/ui/controls";
import { Badge } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { Pagination, Table, Td, Th } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  capitalize,
  dateKey,
  formatDay,
  formatNumber,
  formatTime,
  normalize,
  VISIT_TYPE_LABEL,
} from "@/lib/format";
import { downloadCsv, entriesToCsv, sourceLabel } from "@/lib/reports";
import { MONTH_START } from "@/lib/seed";
import { useAllEntries, useNow } from "@/lib/store";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "inside" | "out";

export function AdminLog() {
  const entries = useAllEntries();
  const nowMs = useNow(30_000);
  const [day, setDay] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const wanted = normalize(query.trim());
    return entries
      .filter((entry) => {
        if (day && dateKey(entry.inAt) !== day) return false;
        if (unit && entry.unit !== Number(unit)) return false;
        if (status === "inside" && entry.outAt !== undefined) return false;
        if (status === "out" && entry.outAt === undefined) return false;
        if (wanted && !normalize(`${entry.visitorName} ${entry.authorizedBy}`).includes(wanted))
          return false;
        return true;
      })
      .sort((a, b) => b.inAt - a.inAt);
  }, [entries, day, unit, status, query]);

  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilters = Boolean(day || unit || query) || status !== "all";

  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(0);
    };

  const clear = () => {
    setDay("");
    setUnit("");
    setStatus("all");
    setQuery("");
    setPage(0);
  };

  const download = () => {
    downloadCsv("visitpass-bitacora.csv", entriesToCsv(filtered));
    toast(`Bitácora descargada con ${formatNumber(filtered.length)} registros`);
  };

  return (
    <AdminShell
      title="Bitácora general"
      subtitle="Entradas y salidas registradas en las garitas durante noviembre"
      actions={
        <Button variant="secondary" icon="download" onClick={download}>
          Descargar
        </Button>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          />
          <TextInput
            aria-label="Buscar por visitante o residente"
            placeholder="Buscar por visitante o residente"
            className="pl-10"
            value={query}
            onChange={(event) => change(setQuery)(event.target.value)}
          />
        </div>
        <DateInput
          aria-label="Fecha"
          min={dateKey(MONTH_START)}
          max={dateKey(nowMs)}
          value={day}
          onChange={change(setDay)}
        />
        <TextInput
          aria-label="Villa"
          mono
          inputMode="numeric"
          maxLength={3}
          placeholder="Villa"
          value={unit}
          onChange={(event) => change(setUnit)(event.target.value.replace(/\D/g, ""))}
        />
        <Select
          aria-label="Estado"
          value={status}
          onChange={(event) => change(setStatus)(event.target.value as StatusFilter)}
        >
          <option value="all">Todos los estados</option>
          <option value="inside">Dentro</option>
          <option value="out">Salió</option>
        </Select>
        <Button variant="ghost" disabled={!hasFilters} onClick={clear}>
          Limpiar
        </Button>
      </div>

      <Table label="Bitácora general">
        <thead>
          <tr>
            <Th>Fecha</Th>
            <Th>Entrada</Th>
            <Th>Salida</Th>
            <Th>Visitante</Th>
            <Th>Villa</Th>
            <Th>Autorizó</Th>
            <Th>Guardia</Th>
            <Th>Origen</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <Td colSpan={9} className="py-8 text-center text-ink-muted">
                No hay registros con esos filtros.
              </Td>
            </tr>
          )}
          {visible.map((entry) => {
            const inside = entry.outAt === undefined;
            return (
              <tr key={entry.id} className="last:*:border-b-0">
                <Td className="font-mono text-[13px] whitespace-nowrap">
                  {capitalize(formatDay(entry.inAt))}
                </Td>
                <Td className="font-mono text-[13px] font-semibold tabular-nums">
                  {formatTime(entry.inAt)}
                </Td>
                <Td className="font-mono text-[13px] tabular-nums">
                  {inside ? "—" : formatTime(entry.outAt as number)}
                </Td>
                <Td>
                  <span className="block font-medium whitespace-nowrap">{entry.visitorName}</span>
                  <span className="block text-xs text-ink-muted">
                    {VISIT_TYPE_LABEL[entry.type]}
                  </span>
                </Td>
                <Td className="font-mono tabular-nums">{entry.unit}</Td>
                <Td className="whitespace-nowrap">{entry.authorizedBy}</Td>
                <Td className="whitespace-nowrap">{entry.guardName}</Td>
                <Td className="whitespace-nowrap text-ink-muted">{sourceLabel(entry.source)}</Td>
                <Td>
                  <Badge tone={inside ? "ok" : "neutral"}>{inside ? "Dentro" : "Salió"}</Badge>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onChange={setPage}
        noun="registros"
      />
    </AdminShell>
  );
}

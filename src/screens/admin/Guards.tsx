import { useMemo } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { Avatar, Badge } from "@/components/ui/display";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDuration, formatNumber } from "@/lib/format";
import { MONTH_START } from "@/lib/seed";
import { useAllEntries, useAppState, useNow } from "@/lib/store";
import type { Guard } from "@/lib/types";

const SHIFT_LABEL: Record<Guard["shift"], string> = {
  day: "Día · 06h00 a 18h00",
  night: "Noche · 18h00 a 06h00",
};

function onDuty(guard: Guard, nowMs: number): boolean {
  const hour = new Date(nowMs).getHours();
  const daytime = hour >= 6 && hour < 18;
  return guard.shift === "day" ? daytime : !daytime;
}

export function Guards() {
  const state = useAppState();
  const entries = useAllEntries();
  const nowMs = useNow(30_000);

  const stats = useMemo(() => {
    const byGuard = new Map<string, { count: number; seconds: number }>();
    for (const entry of entries) {
      if (entry.inAt < MONTH_START) continue;
      const current = byGuard.get(entry.guardName) ?? { count: 0, seconds: 0 };
      byGuard.set(entry.guardName, {
        count: current.count + 1,
        seconds: current.seconds + entry.serviceSeconds,
      });
    }
    return byGuard;
  }, [entries]);

  const active = state.guards.filter((guard) => onDuty(guard, nowMs)).length;

  return (
    <AdminShell
      title="Guardias"
      subtitle={`${state.guards.length} personas de seguridad · ${active} en turno ahora`}
    >
      <Table label="Personal de seguridad">
        <thead>
          <tr>
            <Th>Nombre</Th>
            <Th>Cargo</Th>
            <Th>Turno</Th>
            <Th>Garita</Th>
            <Th className="text-right">Ingresos en noviembre</Th>
            <Th className="text-right">Atención promedio</Th>
            <Th>Estado</Th>
          </tr>
        </thead>
        <tbody>
          {state.guards.map((guard) => {
            const stat = stats.get(guard.name);
            const working = onDuty(guard, nowMs);
            return (
              <tr key={guard.id} className="last:*:border-b-0">
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={guard.name} size={32} />
                    <span className="font-medium">{guard.name}</span>
                  </span>
                </Td>
                <Td className="align-middle">
                  {guard.position === "supervisor" ? "Supervisor" : "Guardia"}
                </Td>
                <Td className="align-middle font-mono text-[13px]">{SHIFT_LABEL[guard.shift]}</Td>
                <Td className="align-middle">{guard.post}</Td>
                <Td className="text-right align-middle font-mono tabular-nums">
                  {stat ? formatNumber(stat.count) : "—"}
                </Td>
                <Td className="text-right align-middle font-mono tabular-nums">
                  {stat ? formatDuration(stat.seconds / stat.count) : "—"}
                </Td>
                <Td className="align-middle">
                  <Badge tone={working ? "ok" : "neutral"}>
                    {working ? "En turno" : "Fuera de turno"}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="mt-3 text-sm text-ink-muted">
        El supervisor coordina las dos garitas y no registra ingresos. Los turnos los define la
        empresa de seguridad.
      </p>
    </AdminShell>
  );
}

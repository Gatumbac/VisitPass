import { dateKey, formatTime, VISIT_TYPE_LABEL } from "@/lib/format";
import { PASS_STATUS_META, passSchedule, passStatus, type BadgeTone } from "@/lib/passes";
import type { AppState, LogEntry } from "@/lib/types";

export type VisitItem = {
  id: string;
  name: string;
  summary: string;
  detail: string;
  label: string;
  tone: BadgeTone;
  sortAt: number;
  day: string;
  passId?: string;
};

export function entryStatus(entry: LogEntry): { label: string; tone: BadgeTone } {
  return entry.outAt === undefined
    ? { label: "Dentro", tone: "ok" }
    : { label: "Salió", tone: "neutral" };
}

function entryItem(entry: LogEntry): VisitItem {
  const inside = entry.outAt === undefined;
  const times = inside
    ? `Entró ${formatTime(entry.inAt)}`
    : `${formatTime(entry.inAt)} a ${formatTime(entry.outAt as number)}`;
  return {
    id: entry.id,
    name: entry.visitorName,
    summary: `${VISIT_TYPE_LABEL[entry.type]} · ${times}`,
    detail: `Atendió ${entry.guardName}`,
    label: inside ? "Ingresó" : "Salió",
    tone: inside ? "ok" : "neutral",
    sortAt: entry.inAt,
    day: dateKey(entry.inAt),
    passId: entry.passId,
  };
}

export function unitVisits(
  state: AppState,
  entries: LogEntry[],
  unit: number,
  nowMs: number,
): VisitItem[] {
  const unitEntries = entries.filter((entry) => entry.unit === unit);
  const items = unitEntries.map(entryItem);

  for (const pass of state.passes) {
    if (pass.unit !== unit) continue;
    const status = passStatus(pass, nowMs, unitEntries);
    const hasVisits = unitEntries.some((entry) => entry.passId === pass.id);
    if (!pass.recurringDays && hasVisits) continue;
    const meta = PASS_STATUS_META[status === "inside" ? "valid" : status];
    items.push({
      id: pass.id,
      name: pass.visitorName,
      summary: `${VISIT_TYPE_LABEL[pass.type]} · ${passSchedule(pass)}`,
      detail: `Pase ${pass.code}`,
      label: pass.recurringDays && status !== "cancelled" ? "Recurrente" : meta.label,
      tone: pass.recurringDays && status !== "cancelled" ? "info" : meta.tone,
      sortAt: pass.createdAt,
      day: dateKey(pass.createdAt),
      passId: pass.id,
    });
  }

  for (const request of state.requests) {
    if (request.unit !== unit || request.status !== "rejected") continue;
    items.push({
      id: request.id,
      name: request.visitorName,
      summary: `${VISIT_TYPE_LABEL[request.type]} · Llegó ${formatTime(request.createdAt)}`,
      detail: `Solicitud registrada por ${request.guardName}`,
      label: "Rechazada",
      tone: "danger",
      sortAt: request.createdAt,
      day: dateKey(request.createdAt),
    });
  }

  return items.sort((a, b) => b.sortAt - a.sortAt);
}

export function groupByDay<T extends { day: string }>(
  items: T[],
): Array<{ day: string; items: T[] }> {
  const groups: Array<{ day: string; items: T[] }> = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.day === item.day) last.items.push(item);
    else groups.push({ day: item.day, items: [item] });
  }
  return groups;
}

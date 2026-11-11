import {
  capitalize,
  dateKey,
  formatClock,
  formatDay,
  formatWeekdays,
  timeKey,
  toMinutes,
} from "@/lib/format";
import type { LogEntry, Pass } from "@/lib/types";

export type PassStatus =
  | "valid"
  | "inside"
  | "used"
  | "expired"
  | "notYet"
  | "notToday"
  | "outOfHours"
  | "cancelled";

const EARLY_ARRIVAL_MINUTES = 30;

export function passStatus(pass: Pass, nowMs: number, entries: LogEntry[]): PassStatus {
  if (pass.cancelledAt !== undefined) return "cancelled";
  const today = dateKey(nowMs);
  const minutes = toMinutes(timeKey(nowMs));
  const visits = entries.filter((entry) => entry.passId === pass.id);
  const withinHours =
    minutes >= toMinutes(pass.from) - EARLY_ARRIVAL_MINUTES && minutes <= toMinutes(pass.to);

  if (pass.recurringDays) {
    if (visits.some((entry) => dateKey(entry.inAt) === today && entry.outAt === undefined))
      return "inside";
    if (!pass.recurringDays.includes(new Date(nowMs).getDay())) return "notToday";
    return withinHours ? "valid" : "outOfHours";
  }

  if (visits.some((entry) => entry.outAt === undefined)) return "inside";
  if (visits.length > 0) return "used";
  if (pass.date < today) return "expired";
  if (pass.date > today) return "notYet";
  if (minutes > toMinutes(pass.to)) return "expired";
  return withinHours ? "valid" : "outOfHours";
}

export function passSchedule(pass: Pass): string {
  const hours = `${formatClock(pass.from)} a ${formatClock(pass.to)}`;
  if (pass.recurringDays) return `${capitalize(formatWeekdays(pass.recurringDays))} · ${hours}`;
  return `${capitalize(formatDay(pass.date))} · ${hours}`;
}

export function passValidityText(
  pass: Pick<Pass, "date" | "from" | "to" | "recurringDays">,
): string {
  const hours = `de ${formatClock(pass.from)} a ${formatClock(pass.to)}`;
  if (pass.recurringDays) return `${formatWeekdays(pass.recurringDays)}, ${hours}`;
  return `el ${formatDay(pass.date)} ${hours}`;
}

export type BadgeTone = "info" | "ok" | "neutral" | "danger" | "warn";

export const PASS_STATUS_META: Record<PassStatus, { label: string; tone: BadgeTone }> = {
  valid: { label: "Autorizada", tone: "info" },
  inside: { label: "Ingresó", tone: "ok" },
  used: { label: "Salió", tone: "neutral" },
  expired: { label: "Vencida", tone: "warn" },
  notYet: { label: "Programada", tone: "info" },
  notToday: { label: "Recurrente", tone: "info" },
  outOfHours: { label: "Fuera de horario", tone: "warn" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export type SharedPass = {
  code: string;
  visitorName: string;
  residentName: string;
  unit: number;
  date: string;
  from: string;
  to: string;
  recurringDays?: number[];
  community: string;
  gate: string;
};

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const padded = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharedPass(pass: Pass, community: string, gate: string): string {
  const shared: SharedPass = {
    code: pass.code,
    visitorName: pass.visitorName,
    residentName: pass.residentName,
    unit: pass.unit,
    date: pass.date,
    from: pass.from,
    to: pass.to,
    recurringDays: pass.recurringDays,
    community,
    gate,
  };
  return toBase64Url(JSON.stringify(shared));
}

export function decodeSharedPass(encoded: string): SharedPass | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as Partial<SharedPass>;
    if (
      typeof parsed.code !== "string" ||
      typeof parsed.visitorName !== "string" ||
      typeof parsed.residentName !== "string" ||
      typeof parsed.unit !== "number" ||
      typeof parsed.date !== "string" ||
      typeof parsed.from !== "string" ||
      typeof parsed.to !== "string"
    ) {
      return null;
    }
    return {
      code: parsed.code,
      visitorName: parsed.visitorName,
      residentName: parsed.residentName,
      unit: parsed.unit,
      date: parsed.date,
      from: parsed.from,
      to: parsed.to,
      recurringDays: Array.isArray(parsed.recurringDays) ? parsed.recurringDays : undefined,
      community: typeof parsed.community === "string" ? parsed.community : "",
      gate: typeof parsed.gate === "string" ? parsed.gate : "",
    };
  } catch {
    return null;
  }
}

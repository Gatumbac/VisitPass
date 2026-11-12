import type { IncidentKind, VisitType } from "@/lib/types";

const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const WEEKDAY_LETTERS = ["D", "L", "M", "X", "J", "V", "S"];

const pad = (value: number) => String(value).padStart(2, "0");

export function dateKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function timeKey(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatClock(time: string): string {
  return time.replace(":", "h");
}

export function formatTime(ms: number): string {
  return formatClock(timeKey(ms));
}

export function formatDay(input: number | string): string {
  const date = typeof input === "string" ? parseDateKey(input) : new Date(input);
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatDateNumeric(key: string): string {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDayLong(input: number | string): string {
  const date = typeof input === "string" ? parseDateKey(input) : new Date(input);
  return `${WEEKDAYS_LONG[date.getDay()]} ${date.getDate()} de ${MONTHS_LONG[date.getMonth()]}`;
}

export function formatMonth(input: number | string): string {
  const date = typeof input === "string" ? parseDateKey(input) : new Date(input);
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatRelativeDay(key: string, todayKey: string): string {
  if (key === todayKey) return "Hoy";
  const diff = Math.round(
    (parseDateKey(todayKey).getTime() - parseDateKey(key).getTime()) / 86_400_000,
  );
  if (diff === 1) return "Ayer";
  if (diff === -1) return "Mañana";
  return capitalize(formatDay(key));
}

export function formatWeekdays(days: number[]): string {
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const isWorkweek = sorted.length === 5 && [1, 2, 3, 4, 5].every((day) => sorted.includes(day));
  if (isWorkweek) return "lun a vie";
  if (sorted.length === 7) return "todos los días";
  return sorted.map((day) => WEEKDAYS_SHORT[day]).join(", ");
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("es-EC");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function maskId(id: string): string {
  if (id.length < 5) return id;
  return `${id.slice(0, 2)}${"•".repeat(id.length - 4)}${id.slice(-2)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1][0] : "";
  return (first + second).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  family: "Familiar",
  friend: "Amigo",
  supplier: "Proveedor",
  delivery: "Delivery",
  domestic: "Servicio doméstico",
};

export const INCIDENT_LABEL: Record<IncidentKind, string> = {
  unauthorized: "Intento de ingreso sin permiso",
  rejected: "Visita rechazada",
  incident: "Incidente",
  other: "Otro",
};

export function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

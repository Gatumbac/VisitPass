import {
  dateKey,
  formatClock,
  formatDay,
  formatTime,
  parseDateKey,
  VISIT_TYPE_LABEL,
} from "@/lib/format";
import { MONTH_START } from "@/lib/seed";
import type { LogEntry, VisitType } from "@/lib/types";

export type Period = "today" | "week" | "month";

export const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoy",
  week: "Últimos 7 días",
  month: "Noviembre",
};

const DAY_MS = 86_400_000;
const FIRST_HOUR = 6;
const LAST_HOUR = 22;

export type PeriodRange = { start: number; end: number; days: string[]; description: string };

export function periodRange(period: Period, nowMs: number): PeriodRange {
  const todayStart = parseDateKey(dateKey(nowMs)).getTime();
  const start =
    period === "today" ? todayStart : period === "week" ? todayStart - 6 * DAY_MS : MONTH_START;
  const days: string[] = [];
  for (let cursor = start; cursor <= todayStart; cursor += DAY_MS)
    days.push(dateKey(cursor + DAY_MS / 2));
  const description =
    days.length === 1
      ? formatDay(days[0])
      : `${formatDay(days[0])} al ${formatDay(days[days.length - 1])}`;
  return { start, end: nowMs, days, description };
}

export type Summary = {
  total: number;
  averagePerDay: number;
  averageService: number;
  serviceByPass: number;
  serviceByRequest: number;
  byDay: Array<{ day: string; count: number }>;
  byHour: Array<{ hour: number; count: number; average: number }>;
  peakHour: number;
  peakShare: number;
  byType: Array<{ type: VisitType; count: number; share: number }>;
};

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export function summarize(entries: LogEntry[], range: PeriodRange): Summary {
  const inRange = entries.filter((entry) => entry.inAt >= range.start && entry.inAt <= range.end);
  const dayCounts = new Map(range.days.map((day) => [day, 0]));
  const hourCounts = new Map<number, number>();
  const typeCounts = new Map<VisitType, number>();

  for (const entry of inRange) {
    const day = dateKey(entry.inAt);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    const hour = new Date(entry.inAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    typeCounts.set(entry.type, (typeCounts.get(entry.type) ?? 0) + 1);
  }

  const byHour = [];
  for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour += 1) {
    const count = hourCounts.get(hour) ?? 0;
    byHour.push({ hour, count, average: count / range.days.length });
  }
  const peak = byHour.reduce((best, item) => (item.count > best.count ? item : best), byHour[0]);
  const total = inRange.length;

  return {
    total,
    averagePerDay: total / range.days.length,
    averageService: mean(inRange.map((entry) => entry.serviceSeconds)),
    serviceByPass: mean(
      inRange.filter((entry) => entry.source === "pass").map((entry) => entry.serviceSeconds),
    ),
    serviceByRequest: mean(
      inRange.filter((entry) => entry.source !== "pass").map((entry) => entry.serviceSeconds),
    ),
    byDay: range.days.map((day) => ({ day, count: dayCounts.get(day) ?? 0 })),
    byHour,
    peakHour: peak.hour,
    peakShare: total === 0 ? 0 : peak.count / total,
    byType: (Object.keys(VISIT_TYPE_LABEL) as VisitType[])
      .map((type) => {
        const count = typeCounts.get(type) ?? 0;
        return { type, count, share: total === 0 ? 0 : count / total };
      })
      .sort((a, b) => b.count - a.count),
  };
}

export function hourSpan(hour: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${formatClock(`${pad(hour)}:00`)} a ${formatClock(`${pad(hour + 1)}:00`)}`;
}

const SOURCE_LABEL: Record<LogEntry["source"], string> = {
  pass: "Pase con QR",
  request: "Solicitud",
  phone: "Teléfono",
};

export function sourceLabel(source: LogEntry["source"]): string {
  return SOURCE_LABEL[source];
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function entriesToCsv(entries: LogEntry[]): string {
  const header = [
    "Fecha",
    "Entrada",
    "Salida",
    "Visitante",
    "Tipo",
    "Villa",
    "Autorizó",
    "Guardia",
    "Origen",
  ];
  const rows = entries.map((entry) => [
    dateKey(entry.inAt),
    formatTime(entry.inAt),
    entry.outAt === undefined ? "" : formatTime(entry.outAt),
    entry.visitorName,
    VISIT_TYPE_LABEL[entry.type],
    entry.unit,
    entry.authorizedBy,
    entry.guardName,
    SOURCE_LABEL[entry.source],
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`﻿${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

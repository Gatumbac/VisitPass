import type { ReactNode } from "react";
import { QrCode } from "@/components/QrCode";
import { DataPair } from "@/components/ui/display";
import { capitalize, formatClock, formatDay, formatWeekdays } from "@/lib/format";

type PassTicketProps = {
  code: string;
  visitorName: string;
  residentName: string;
  unit: number;
  date: string;
  from: string;
  to: string;
  recurringDays?: number[];
  community: string;
  status?: ReactNode;
  dimmed?: boolean;
};

export function PassTicket({
  code,
  visitorName,
  residentName,
  unit,
  date,
  from,
  to,
  recurringDays,
  community,
  status,
  dimmed,
}: PassTicketProps) {
  return (
    <article className="rounded-2xl border border-line bg-surface">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">
            {community}
          </p>
          {status}
        </div>
        <p className="mt-2 font-display text-[28px] leading-tight font-bold tracking-tight">
          {visitorName}
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">Invitación de {residentName}</p>
      </div>

      <div className={`flex flex-col items-center px-5 pb-5 ${dimmed ? "opacity-30" : ""}`}>
        <div className="rounded-xl border border-line p-2">
          <QrCode code={code} size={208} />
        </div>
        <p className="mt-3 font-mono text-lg font-semibold tracking-[0.18em]">{code}</p>
      </div>

      <div className="relative border-t-2 border-dashed border-line">
        <span className="absolute -top-[11px] -left-[11px] size-5 rounded-full border border-line bg-paper" />
        <span className="absolute -top-[11px] -right-[11px] size-5 rounded-full border border-line bg-paper" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-5">
        <DataPair label="Villa">{unit}</DataPair>
        <DataPair label={recurringDays ? "Días" : "Fecha"}>
          {recurringDays ? capitalize(formatWeekdays(recurringDays)) : capitalize(formatDay(date))}
        </DataPair>
        <DataPair label="Desde">{formatClock(from)}</DataPair>
        <DataPair label="Hasta">{formatClock(to)}</DataPair>
      </dl>
    </article>
  );
}

import { useEffect, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { cx } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { dateKey, formatRelativeDay, formatTime } from "@/lib/format";
import { markNoticesRead, useAppState, useNow, useSession } from "@/lib/store";
import type { Notice } from "@/lib/types";

const KIND_ICON: Record<Notice["kind"], IconName> = {
  entry: "arrowRight",
  exit: "logout",
  request: "inbox",
  pass: "check",
};

export function Notifications() {
  const account = useSession();
  const state = useAppState();
  const nowMs = useNow();
  const unit = account?.unit ?? 0;
  const [unreadAtOpen] = useState(
    () =>
      new Set(
        state.notices.filter((item) => item.unit === unit && !item.read).map((item) => item.id),
      ),
  );

  useEffect(() => {
    markNoticesRead(unit);
  }, [unit]);

  const notices = state.notices.filter((item) => item.unit === unit).sort((a, b) => b.at - a.at);
  const today = dateKey(nowMs);

  return (
    <MobileShell title="Avisos" back="/resident">
      {notices.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Sin avisos"
          description="Te avisaremos cuando tus visitas entren o salgan."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {notices.map((item) => {
            const unread = unreadAtOpen.has(item.id);
            return (
              <li
                key={item.id}
                className={cx("flex items-start gap-3 px-3 py-3.5", unread && "bg-brand-soft/50")}
              >
                <span
                  className={cx(
                    "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
                    item.kind === "entry" ? "bg-ok-soft text-ok-ink" : "bg-sunken text-ink-muted",
                  )}
                >
                  <Icon name={KIND_ICON[item.kind]} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-[15px] leading-snug", unread && "font-medium")}>
                    {item.text}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-ink-muted">
                    {formatRelativeDay(dateKey(item.at), today)} · {formatTime(item.at)}
                  </p>
                </div>
                {unread && (
                  <span
                    aria-label="Sin leer"
                    className="mt-2 size-2.5 shrink-0 rounded-full bg-brand"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </MobileShell>
  );
}

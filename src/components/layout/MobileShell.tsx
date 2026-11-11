import type { ReactNode } from "react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { registerDevice, useDeviceZoom } from "@/components/layout/frame";
import { Logo, LogoMark } from "@/components/layout/Logo";
import { cx } from "@/components/ui/controls";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Link, usePath } from "@/lib/router";
import { formatTime } from "@/lib/format";
import { useAppState, useNow, useSession } from "@/lib/store";

type NavItem = { to: string; label: string; icon: IconName; badge?: number };

function StatusBar() {
  const nowMs = useNow(10_000);
  return (
    <div className="relative z-30 hidden h-9 shrink-0 items-center justify-between bg-inherit px-7 pt-1 font-mono text-[13px] font-semibold lg:flex">
      <span>{formatTime(nowMs)}</span>
      <span className="flex items-center gap-1.5">
        <Icon name="wifi" size={15} />
        <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="20"
            height="11"
            rx="3"
            fill="none"
            stroke="currentColor"
            opacity="0.5"
          />
          <rect x="2.5" y="2.5" width="13" height="7" rx="1.5" fill="currentColor" />
          <rect x="21.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

type MobileFrameProps = { children: ReactNode; className?: string; bodyClassName?: string };

export function MobileFrame({ children, className, bodyClassName }: MobileFrameProps) {
  const zoom = useDeviceZoom();
  return (
    <div className="lg:relative lg:grid lg:min-h-dvh lg:place-items-center lg:bg-brand lg:p-6 lg:[background-image:radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] lg:[background-size:22px_22px]">
      <div className="absolute top-6 left-8 hidden lg:block">
        <Logo inverse />
      </div>
      {/* The transform makes the phone the containing block for fixed overlays portaled into it. */}
      <div
        ref={registerDevice}
        style={{ zoom }}
        className="lg:h-[864px] lg:w-[410px] lg:overflow-hidden lg:rounded-[48px] lg:border-[10px] lg:border-ink lg:shadow-2xl lg:[transform:translateZ(0)]"
      >
        <div
          className={cx(
            "mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper sm:border-x sm:border-line lg:h-full lg:min-h-0 lg:border-0",
            className,
          )}
        >
          <StatusBar />
          <div
            className={cx(
              "flex flex-1 flex-col *:shrink-0 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:none]",
              bodyClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePath();
  return (
    <nav
      aria-label="Menú principal"
      className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-line bg-surface"
    >
      {items.map((item) => {
        const active = path === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              active ? "text-brand" : "text-ink-muted hover:text-ink",
            )}
          >
            {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-brand" />}
            <span className="relative">
              <Icon name={item.icon} size={22} />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-strong px-1 font-mono text-[11px] leading-none font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

type MobileShellProps = {
  title?: string;
  back?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function MobileShell({ title, back, actions, children }: MobileShellProps) {
  const account = useSession();
  const state = useAppState();

  const pendingRequests = state.requests.filter(
    (request) => request.unit === account?.unit && request.status === "pending",
  ).length;
  const waitingAtGate = state.requests.filter((request) => request.status === "pending").length;
  const unreadNotices = state.notices.filter(
    (item) => item.unit === account?.unit && !item.read,
  ).length;

  const items: NavItem[] =
    account?.role === "guard"
      ? [
          { to: "/guard", label: "Turno", icon: "shield" },
          { to: "/guard/scan", label: "Escanear", icon: "scan" },
          { to: "/guard/walk-in", label: "Sin aviso", icon: "userPlus", badge: waitingAtGate },
          { to: "/guard/log", label: "Bitácora", icon: "book" },
        ]
      : [
          { to: "/resident", label: "Inicio", icon: "home" },
          { to: "/resident/new", label: "Autorizar", icon: "plus" },
          { to: "/resident/requests", label: "Solicitudes", icon: "inbox", badge: pendingRequests },
          { to: "/resident/history", label: "Historial", icon: "clock" },
        ];

  return (
    <MobileFrame>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-paper px-4">
        {back ? (
          <Link
            to={back}
            aria-label="Volver"
            className="-ml-2 inline-flex size-10 items-center justify-center rounded-lg text-ink hover:bg-sunken"
          >
            <Icon name="chevronLeft" size={24} />
          </Link>
        ) : (
          <LogoMark size={28} />
        )}
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight">
          {title ?? "VisitPass"}
        </h1>
        {actions}
        {account?.role === "resident" && (
          <Link
            to="/resident/notifications"
            aria-label={unreadNotices > 0 ? `Avisos, ${unreadNotices} sin leer` : "Avisos"}
            className="relative inline-flex size-10 items-center justify-center rounded-lg text-ink hover:bg-sunken"
          >
            <Icon name="bell" size={22} />
            {unreadNotices > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-paper bg-danger-strong" />
            )}
          </Link>
        )}
        {account && <AccountMenu account={account} />}
      </header>
      {account?.role === "guard" && state.backupMode && (
        <div
          role="status"
          className="flex items-start gap-2 border-b border-warn bg-warn-soft px-4 py-2.5 text-sm text-warn-ink"
        >
          <Icon name="wifiOff" size={18} className="mt-0.5 shrink-0" />
          <p>
            <strong className="font-semibold">Sin conexión.</strong> Los ingresos se guardan y se
            enviarán al volver el internet.
          </p>
        </div>
      )}
      <main className="flex-1 px-4 pt-5 pb-8">{children}</main>
      <BottomNav items={items} />
    </MobileFrame>
  );
}

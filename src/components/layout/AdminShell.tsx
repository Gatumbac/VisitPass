import type { ReactNode } from "react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Logo } from "@/components/layout/Logo";
import { cx } from "@/components/ui/controls";
import { Avatar } from "@/components/ui/display";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Link, navigate, usePath } from "@/lib/router";
import { signOut, useAppState, useSession } from "@/lib/store";

const NAV: Array<{ to: string; label: string; icon: IconName }> = [
  { to: "/admin", label: "Panel", icon: "chart" },
  { to: "/admin/units", label: "Viviendas", icon: "home" },
  { to: "/admin/guards", label: "Guardias", icon: "shield" },
  { to: "/admin/log", label: "Bitácora", icon: "book" },
  { to: "/admin/settings", label: "Configuración", icon: "sliders" },
];

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const path = usePath();
  const account = useSession();
  const { settings } = useAppState();

  const leave = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-5">
          <Logo size={26} />
          <p className="mt-3 text-sm font-medium text-ink">{settings.communityName}</p>
          <p className="text-xs text-ink-muted">
            {settings.city} · {settings.unitCount} viviendas
          </p>
        </div>
        <nav aria-label="Menú de administración" className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-ink-muted hover:bg-paper hover:text-ink",
                )}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {account && (
          <div className="border-t border-line p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar name={account.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{account.name}</p>
                <p className="truncate text-xs text-ink-muted">{account.detail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={leave}
              className="mt-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <Icon name="logout" size={18} />
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      <div className="sticky top-0 z-20 border-b border-line bg-surface lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo size={24} />
          {account && <AccountMenu account={account} />}
        </div>
        <nav
          aria-label="Menú de administración"
          className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]"
        >
          {NAV.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium",
                  active ? "bg-brand-soft text-brand" : "text-ink-muted",
                )}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

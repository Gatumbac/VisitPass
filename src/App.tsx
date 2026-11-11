import { useEffect, type ReactNode } from "react";
import { toast, ToastHost } from "@/components/ui/toast";
import { matchPath, navigate, usePath } from "@/lib/router";
import { getState, reconnectMessage, resetAll, setBackupMode, useSession } from "@/lib/store";
import type { Role } from "@/lib/types";
import { AdminLog } from "@/screens/admin/AdminLog";
import { Dashboard } from "@/screens/admin/Dashboard";
import { Guards } from "@/screens/admin/Guards";
import { Settings } from "@/screens/admin/Settings";
import { Units } from "@/screens/admin/Units";
import { GuardHome } from "@/screens/guard/GuardHome";
import { IncidentForm } from "@/screens/guard/IncidentForm";
import { Logbook } from "@/screens/guard/Logbook";
import { RequestStatus } from "@/screens/guard/RequestStatus";
import { Scan } from "@/screens/guard/Scan";
import { ScanResult } from "@/screens/guard/ScanResult";
import { WalkIn } from "@/screens/guard/WalkIn";
import { Login } from "@/screens/Login";
import { History } from "@/screens/resident/History";
import { NewPass } from "@/screens/resident/NewPass";
import { Notifications } from "@/screens/resident/Notifications";
import { PassDetail } from "@/screens/resident/PassDetail";
import { Requests } from "@/screens/resident/Requests";
import { ResidentHome } from "@/screens/resident/ResidentHome";
import { VisitorPass } from "@/screens/visitor/VisitorPass";

type Route = { pattern: string; role: Role; render: (params: Record<string, string>) => ReactNode };

const ROUTES: Route[] = [
  { pattern: "/resident", role: "resident", render: () => <ResidentHome /> },
  { pattern: "/resident/new", role: "resident", render: () => <NewPass /> },
  {
    pattern: "/resident/pass/:id",
    role: "resident",
    render: ({ id }) => <PassDetail key={id} passId={id} />,
  },
  { pattern: "/resident/requests", role: "resident", render: () => <Requests /> },
  { pattern: "/resident/history", role: "resident", render: () => <History /> },
  { pattern: "/resident/notifications", role: "resident", render: () => <Notifications /> },
  { pattern: "/guard", role: "guard", render: () => <GuardHome /> },
  { pattern: "/guard/scan", role: "guard", render: () => <Scan /> },
  {
    pattern: "/guard/result/:id",
    role: "guard",
    render: ({ id }) => <ScanResult key={id} passId={id} />,
  },
  { pattern: "/guard/walk-in", role: "guard", render: () => <WalkIn /> },
  {
    pattern: "/guard/request/:id",
    role: "guard",
    render: ({ id }) => <RequestStatus key={id} requestId={id} />,
  },
  { pattern: "/guard/log", role: "guard", render: () => <Logbook /> },
  { pattern: "/guard/incident", role: "guard", render: () => <IncidentForm /> },
  { pattern: "/admin", role: "admin", render: () => <Dashboard /> },
  { pattern: "/admin/units", role: "admin", render: () => <Units /> },
  { pattern: "/admin/guards", role: "admin", render: () => <Guards /> },
  { pattern: "/admin/log", role: "admin", render: () => <AdminLog /> },
  { pattern: "/admin/settings", role: "admin", render: () => <Settings /> },
];

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);
  return null;
}

function Reset() {
  useEffect(() => {
    resetAll();
    navigate("/", { replace: true });
  }, []);
  return null;
}

function useConnectionWatch(role: Role | undefined): void {
  useEffect(() => {
    if (role !== "guard") return;
    const goOffline = () => {
      if (getState().backupMode) return;
      setBackupMode(true);
      toast("Sin conexión. Se activó el modo de respaldo.", "warn");
    };
    const goOnline = () => {
      if (!getState().backupMode) return;
      const synced = setBackupMode(false);
      toast(reconnectMessage(synced));
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [role]);
}

function Screen({ path }: { path: string }) {
  const account = useSession();
  const home = account ? `/${account.role}` : "/";

  if (path === "/reset") return <Reset />;

  const visitor = matchPath("/visitor/:payload", path);
  if (visitor) return <VisitorPass payload={visitor.payload} />;

  if (path === "/") return account ? <Redirect to={home} /> : <Login />;

  for (const route of ROUTES) {
    const params = matchPath(route.pattern, path);
    if (!params) continue;
    if (account?.role !== route.role) return <Redirect to={home} />;
    return route.render(params);
  }

  return <Redirect to={home} />;
}

export default function App() {
  const path = usePath();
  const account = useSession();
  useConnectionWatch(account?.role);

  const pathname = path.split("?")[0];
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Screen path={path} />
      <ToastHost />
    </>
  );
}

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { dateKey, formatTime } from "@/lib/format";
import { ACCOUNTS, createInitialState, getHistory, STATE_VERSION } from "@/lib/seed";
import type {
  Account,
  AppState,
  Incident,
  IncidentKind,
  LogEntry,
  Notice,
  Pass,
  Resident,
  Settings,
  VisitType,
  WalkInRequest,
} from "@/lib/types";

const STATE_KEY = "visitpass.state";
const SESSION_KEY = "visitpass.session";
const DEVICE_ACCOUNTS_KEY = "visitpass.accounts";
const IDLE_GAP_MS = 15 * 60_000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function resumeClock(loaded: AppState): AppState {
  const idle = Date.now() - loaded.clock.realAt;
  if (idle < IDLE_GAP_MS) return loaded;
  return { ...loaded, clock: { appAt: loaded.clock.appAt, realAt: Date.now() } };
}

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return resumeClock(parsed);
    }
  } catch {
    window.localStorage.removeItem(STATE_KEY);
  }
  return createInitialState();
}

function persist(next: AppState): void {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

let state = loadState();
persist(state);

window.addEventListener("storage", (event) => {
  if (event.key === STATE_KEY && event.newValue) {
    state = JSON.parse(event.newValue) as AppState;
    emit();
  }
  if (event.key === DEVICE_ACCOUNTS_KEY) emit();
});

export function now(): number {
  return state.clock.appAt + (Date.now() - state.clock.realAt);
}

function commit(recipe: (draft: AppState) => AppState): void {
  const stamped = { ...state, clock: { appAt: now(), realAt: Date.now() } };
  state = recipe(stamped);
  persist(state);
  emit();
}

export function getState(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

export function useNow(intervalMs = 15_000): number {
  const [value, setValue] = useState(now);
  useEffect(() => {
    const timer = window.setInterval(() => setValue(now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  useAppState();
  return Math.max(value, now());
}

export function useAllEntries(): LogEntry[] {
  const { log } = useAppState();
  return useMemo(() => [...getHistory(), ...log], [log]);
}

function nextId(prefix: string, draft: AppState): string {
  return `${prefix}-${draft.counter}-${Math.floor(now() / 1000) % 100000}`;
}

function passCode(draft: AppState): string {
  let seed = (draft.counter * 7919 + Math.floor(now() / 1000)) >>> 0;
  let code = "";
  for (let index = 0; index < 4; index += 1) {
    code += CODE_ALPHABET[seed % CODE_ALPHABET.length];
    seed = Math.floor(seed / CODE_ALPHABET.length) + 17 * (index + 1);
  }
  return `VP-${code}`;
}

function notice(draft: AppState, unit: number, kind: Notice["kind"], text: string): Notice {
  return { id: nextId("n", draft), unit, kind, text, at: now(), read: false };
}

export type PassInput = {
  unit: number;
  residentName: string;
  visitorName: string;
  visitorId: string;
  plate?: string;
  type: VisitType;
  date: string;
  from: string;
  to: string;
  recurringDays?: number[];
};

export function createPass(input: PassInput): Pass {
  const pass: Pass = { ...input, id: nextId("p", state), code: passCode(state), createdAt: now() };
  commit((draft) => ({ ...draft, counter: draft.counter + 1, passes: [...draft.passes, pass] }));
  return pass;
}

export function cancelPass(passId: string): void {
  commit((draft) => ({
    ...draft,
    passes: draft.passes.map((pass) =>
      pass.id === passId ? { ...pass, cancelledAt: now() } : pass,
    ),
  }));
}

function entryNotice(draft: AppState, entry: LogEntry): Notice {
  return {
    id: `n-${entry.id}-in`,
    unit: entry.unit,
    kind: "entry",
    text: `Tu visita ${entry.visitorName} ingresó a las ${formatTime(entry.inAt)} por la ${draft.settings.gateName.toLowerCase()}.`,
    at: now(),
    read: false,
  };
}

function addEntry(draft: AppState, entry: LogEntry): AppState {
  const withSync = draft.backupMode ? { ...entry, pendingSync: true } : entry;
  return {
    ...draft,
    counter: draft.counter + 1,
    log: [...draft.log, withSync],
    notices: draft.backupMode ? draft.notices : [...draft.notices, entryNotice(draft, withSync)],
  };
}

export function registerEntryFromPass(passId: string, guardName: string): void {
  commit((draft) => {
    const pass = draft.passes.find((item) => item.id === passId);
    if (!pass) return draft;
    return addEntry(draft, {
      id: nextId("e", draft),
      visitorName: pass.visitorName,
      visitorId: pass.visitorId,
      plate: pass.plate,
      unit: pass.unit,
      type: pass.type,
      authorizedBy: pass.residentName,
      guardName,
      source: "pass",
      passId: pass.id,
      inAt: now(),
      serviceSeconds: 38,
    });
  });
}

export type RequestInput = {
  visitorName: string;
  visitorId: string;
  plate?: string;
  unit: number;
  type: VisitType;
  note?: string;
  guardName: string;
};

export function createRequest(input: RequestInput): WalkInRequest {
  const request: WalkInRequest = {
    ...input,
    id: nextId("q", state),
    createdAt: now(),
    status: "pending",
  };
  commit((draft) => ({
    ...draft,
    counter: draft.counter + 1,
    requests: [...draft.requests, request],
    notices: [
      ...draft.notices,
      notice(
        draft,
        input.unit,
        "request",
        `${input.visitorName} está en la garita y pide ingresar a tu villa.`,
      ),
    ],
  }));
  return request;
}

export function resolveRequest(requestId: string, approved: boolean, resolvedBy: string): void {
  commit((draft) => {
    const request = draft.requests.find((item) => item.id === requestId);
    if (!request || request.status !== "pending") return draft;
    const requests = draft.requests.map((item) =>
      item.id === requestId
        ? {
            ...item,
            status: approved ? ("approved" as const) : ("rejected" as const),
            resolvedAt: now(),
            resolvedBy,
          }
        : item,
    );
    if (approved) return { ...draft, requests };
    const incident: Incident = {
      id: nextId("i", draft),
      kind: "rejected",
      description: `${resolvedBy} rechazó el ingreso de ${request.visitorName} desde la aplicación.`,
      at: now(),
      guardName: request.guardName,
      unit: request.unit,
    };
    return {
      ...draft,
      counter: draft.counter + 1,
      requests,
      incidents: [...draft.incidents, incident],
    };
  });
}

export function registerEntryFromRequest(requestId: string, guardName: string): void {
  commit((draft) => {
    const request = draft.requests.find((item) => item.id === requestId);
    if (!request || request.status !== "approved" || request.entryId) return draft;
    const entry: LogEntry = {
      id: nextId("e", draft),
      visitorName: request.visitorName,
      visitorId: request.visitorId,
      plate: request.plate,
      unit: request.unit,
      type: request.type,
      authorizedBy: request.resolvedBy ?? "",
      guardName,
      source: "request",
      requestId: request.id,
      inAt: now(),
      serviceSeconds: Math.max(45, Math.min(180, Math.round((now() - request.createdAt) / 1000))),
    };
    const next = addEntry(draft, entry);
    return {
      ...next,
      requests: next.requests.map((item) =>
        item.id === requestId ? { ...item, entryId: entry.id } : item,
      ),
    };
  });
}

export type PhoneEntryInput = Omit<RequestInput, "note"> & { authorizedBy: string };

export function registerPhoneEntry(input: PhoneEntryInput): void {
  commit((draft) =>
    addEntry(draft, {
      id: nextId("e", draft),
      visitorName: input.visitorName,
      visitorId: input.visitorId,
      plate: input.plate,
      unit: input.unit,
      type: input.type,
      authorizedBy: input.authorizedBy,
      guardName: input.guardName,
      source: "phone",
      inAt: now(),
      serviceSeconds: 95,
    }),
  );
}

export function registerExit(entryId: string): void {
  commit((draft) => {
    const entry = draft.log.find((item) => item.id === entryId);
    if (!entry || entry.outAt !== undefined) return draft;
    const exitNotice: Notice = {
      id: `n-${entry.id}-out`,
      unit: entry.unit,
      kind: "exit",
      text: `${entry.visitorName} salió de la ciudadela a las ${formatTime(now())}.`,
      at: now(),
      read: false,
    };
    return {
      ...draft,
      log: draft.log.map((item) =>
        item.id === entryId
          ? { ...item, outAt: now(), pendingSync: draft.backupMode || item.pendingSync }
          : item,
      ),
      notices: draft.backupMode ? draft.notices : [...draft.notices, exitNotice],
    };
  });
}

export type IncidentInput = {
  kind: IncidentKind;
  description: string;
  at: number;
  guardName: string;
  unit?: number;
};

export function addIncident(input: IncidentInput): void {
  commit((draft) => ({
    ...draft,
    counter: draft.counter + 1,
    incidents: [...draft.incidents, { ...input, id: nextId("i", draft) }],
  }));
}

export function setBackupMode(enabled: boolean): number {
  let synced = 0;
  commit((draft) => {
    if (enabled) return { ...draft, backupMode: true };
    const pending = draft.log.filter((entry) => entry.pendingSync);
    synced = pending.length;
    const notices = pending.flatMap((entry) => {
      const items = [entryNotice(draft, entry)];
      if (entry.outAt !== undefined) {
        items.push({
          id: `n-${entry.id}-out`,
          unit: entry.unit,
          kind: "exit",
          text: `${entry.visitorName} salió de la ciudadela a las ${formatTime(entry.outAt)}.`,
          at: now(),
          read: false,
        });
      }
      return items;
    });
    const known = new Set(draft.notices.map((item) => item.id));
    return {
      ...draft,
      backupMode: false,
      log: draft.log.map((entry) => (entry.pendingSync ? { ...entry, pendingSync: false } : entry)),
      notices: [...draft.notices, ...notices.filter((item) => !known.has(item.id))],
    };
  });
  return synced;
}

export function reconnectMessage(synced: number): string {
  if (synced === 0) return "Conexión restablecida";
  return `Conexión restablecida. ${synced} ${synced === 1 ? "registro enviado" : "registros enviados"}.`;
}

export function markNoticesRead(unit: number): void {
  if (!state.notices.some((item) => item.unit === unit && !item.read)) return;
  commit((draft) => ({
    ...draft,
    notices: draft.notices.map((item) => (item.unit === unit ? { ...item, read: true } : item)),
  }));
}

export type ResidentInput = Pick<Resident, "name" | "unit" | "relation" | "canAuthorize"> & {
  id?: string;
};

export function saveResident(input: ResidentInput): void {
  commit((draft) => {
    const without = draft.units.map((unit) => ({
      ...unit,
      residents: unit.residents.filter((resident) => resident.id !== input.id),
    }));
    const resident: Resident = { ...input, id: input.id ?? nextId("r", draft) };
    return {
      ...draft,
      counter: draft.counter + 1,
      units: without.map((unit) =>
        unit.number === input.unit ? { ...unit, residents: [...unit.residents, resident] } : unit,
      ),
    };
  });
}

export function removeResident(residentId: string): void {
  commit((draft) => ({
    ...draft,
    units: draft.units.map((unit) => ({
      ...unit,
      residents: unit.residents.filter((resident) => resident.id !== residentId),
    })),
  }));
}

export function updateSettings(patch: Partial<Settings>): void {
  commit((draft) => ({ ...draft, settings: { ...draft.settings, ...patch } }));
}

export function resetAll(): void {
  state = createInitialState();
  persist(state);
  window.localStorage.removeItem(DEVICE_ACCOUNTS_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  emit();
}

export function findAccountByEmail(email: string): Account | undefined {
  const wanted = email.trim().toLowerCase();
  return ACCOUNTS.find((account) => account.email === wanted);
}

function readSession(): string | null {
  return window.sessionStorage.getItem(SESSION_KEY);
}

export function useSession(): Account | null {
  const accountId = useSyncExternalStore(subscribe, readSession);
  return ACCOUNTS.find((account) => account.id === accountId) ?? null;
}

function readDeviceAccounts(): string {
  return (
    window.localStorage.getItem(DEVICE_ACCOUNTS_KEY) ??
    ACCOUNTS.map((account) => account.id).join(",")
  );
}

export function useDeviceAccounts(): Account[] {
  const raw = useSyncExternalStore(subscribe, readDeviceAccounts);
  return useMemo(
    () =>
      raw
        .split(",")
        .map((id) => ACCOUNTS.find((account) => account.id === id))
        .filter((account): account is Account => account !== undefined),
    [raw],
  );
}

export function signIn(account: Account): void {
  window.sessionStorage.setItem(SESSION_KEY, account.id);
  const known = readDeviceAccounts().split(",").filter(Boolean);
  if (!known.includes(account.id)) {
    window.localStorage.setItem(DEVICE_ACCOUNTS_KEY, [...known, account.id].join(","));
  }
  emit();
}

export function signOut(): void {
  window.sessionStorage.removeItem(SESSION_KEY);
  emit();
}

export function forgetDeviceAccount(accountId: string): void {
  const known = readDeviceAccounts()
    .split(",")
    .filter((id) => id && id !== accountId);
  window.localStorage.setItem(DEVICE_ACCOUNTS_KEY, known.join(","));
  emit();
}

export function todayKey(): string {
  return dateKey(now());
}

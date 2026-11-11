export type Role = "resident" | "guard" | "admin";

export type VisitType = "family" | "friend" | "supplier" | "delivery" | "domestic";

export type Resident = {
  id: string;
  name: string;
  unit: number;
  relation: "owner" | "family" | "tenant";
  canAuthorize: boolean;
};

export type Unit = {
  number: number;
  residents: Resident[];
};

export type GuardShift = "day" | "night";

export type Guard = {
  id: string;
  name: string;
  position: "supervisor" | "guard";
  shift: GuardShift;
  post: string;
};

export type Pass = {
  id: string;
  code: string;
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
  createdAt: number;
  cancelledAt?: number;
};

export type RequestStatus = "pending" | "approved" | "rejected";

export type WalkInRequest = {
  id: string;
  visitorName: string;
  visitorId: string;
  plate?: string;
  unit: number;
  type: VisitType;
  note?: string;
  guardName: string;
  createdAt: number;
  status: RequestStatus;
  resolvedAt?: number;
  resolvedBy?: string;
  entryId?: string;
};

export type LogEntry = {
  id: string;
  visitorName: string;
  visitorId: string;
  plate?: string;
  unit: number;
  type: VisitType;
  authorizedBy: string;
  guardName: string;
  source: "pass" | "request" | "phone";
  passId?: string;
  requestId?: string;
  inAt: number;
  outAt?: number;
  serviceSeconds: number;
  pendingSync?: boolean;
};

export type IncidentKind = "unauthorized" | "rejected" | "incident" | "other";

export type Incident = {
  id: string;
  kind: IncidentKind;
  description: string;
  at: number;
  guardName: string;
  unit?: number;
};

export type Notice = {
  id: string;
  unit: number;
  kind: "entry" | "exit" | "request" | "pass";
  text: string;
  at: number;
  read: boolean;
};

export type Settings = {
  communityName: string;
  city: string;
  address: string;
  unitCount: number;
  gateName: string;
  maxPassHours: number;
  supplierFrom: string;
  supplierTo: string;
  adsEnabled: boolean;
};

export type AppState = {
  version: number;
  clock: { appAt: number; realAt: number };
  units: Unit[];
  guards: Guard[];
  passes: Pass[];
  requests: WalkInRequest[];
  log: LogEntry[];
  incidents: Incident[];
  notices: Notice[];
  settings: Settings;
  backupMode: boolean;
  counter: number;
};

export type Account = {
  id: string;
  role: Role;
  email: string;
  name: string;
  detail: string;
  unit?: number;
  guardId?: string;
};

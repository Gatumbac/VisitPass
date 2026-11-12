import { dateKey } from "@/lib/format";
import type {
  Account,
  AppState,
  Guard,
  Incident,
  LogEntry,
  Notice,
  Pass,
  Resident,
  Unit,
  VisitType,
} from "@/lib/types";

export const STATE_VERSION = 4;
export const APP_START = new Date(2026, 10, 12, 16, 2, 0).getTime();
export const MONTH_START = new Date(2026, 10, 1).getTime();
export const RESIDENT_UNIT = 24;
export const UNIT_COUNT = 120;

const YEAR = 2026;
const MONTH = 10;
const TODAY = 12;

const FIRST_NAMES = [
  "María",
  "Carlos",
  "José",
  "Ana",
  "Luis",
  "Rosa",
  "Juan",
  "Carmen",
  "Diego",
  "Gabriela",
  "Fernando",
  "Paola",
  "Andrés",
  "Daniela",
  "Ricardo",
  "Verónica",
  "Xavier",
  "Mónica",
  "Esteban",
  "Karla",
  "Roberto",
  "Silvia",
  "Marco",
  "Lorena",
  "Héctor",
  "Patricia",
  "Iván",
  "Cecilia",
  "Byron",
  "Tatiana",
  "Wilson",
  "Narcisa",
  "Freddy",
  "Jéssica",
  "Galo",
  "Mariuxi",
  "Kléber",
  "Ximena",
  "Mauricio",
  "Yadira",
];

const SURNAMES = [
  "García",
  "Zambrano",
  "Cedeño",
  "Mendoza",
  "Macías",
  "Intriago",
  "Moreira",
  "Alvarado",
  "Castro",
  "Ponce",
  "Suárez",
  "Reyes",
  "Chávez",
  "Bravo",
  "Loor",
  "Villamar",
  "Morán",
  "Espinoza",
  "Quimí",
  "Burgos",
  "Arteaga",
  "Figueroa",
  "Pincay",
  "Tomalá",
  "Naranjo",
  "Andrade",
  "Jurado",
  "Carvajal",
  "Párraga",
  "Solórzano",
  "Delgado",
  "Franco",
  "Barzola",
  "Cevallos",
  "Molina",
  "Ortiz",
  "Vélez",
  "Rendón",
  "Paredes",
  "Guerrero",
];

const DELIVERY_SERVICES = [
  "Repartidor de comida",
  "Repartidor de farmacia",
  "Mensajería",
  "Repartidor de supermercado",
];
const SUPPLIER_SERVICES = [
  "Técnico de internet",
  "Jardinería",
  "Mantenimiento de piscina",
  "Gasfitería",
  "Técnico de aire acondicionado",
  "Fumigación",
];

const HOUR_WEIGHTS: Array<[number, number]> = [
  [6, 2],
  [7, 4],
  [8, 6],
  [9, 5],
  [10, 5],
  [11, 5],
  [12, 7],
  [13, 7],
  [14, 5],
  [15, 5],
  [16, 6],
  [17, 8],
  [18, 14],
  [19, 9],
  [20, 6],
  [21, 3],
  [22, 1],
];

const TYPE_WEIGHTS: Array<[VisitType, number]> = [
  ["delivery", 30],
  ["family", 24],
  ["friend", 16],
  ["supplier", 18],
  ["domestic", 12],
];

type Random = () => number;

function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random: Random, min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;
const pick = <T>(random: Random, items: T[]): T => items[Math.floor(random() * items.length)];

function weighted<T>(random: Random, options: Array<[T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [value, weight] of options) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }
  return options[options.length - 1][0];
}

function personName(random: Random): string {
  return `${pick(random, FIRST_NAMES)} ${pick(random, SURNAMES)}`;
}

function checkDigit(firstNine: number[]): number {
  const sum = firstNine.reduce((total, digit, index) => {
    const product = index % 2 === 0 ? digit * 2 : digit;
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  return (10 - (sum % 10)) % 10;
}

// Sample ID numbers deliberately fail the national check digit so they can never match a real person.
export function sampleIdNumber(random: Random): string {
  const digits = [
    0,
    9,
    between(random, 0, 5),
    ...Array.from({ length: 6 }, () => between(random, 0, 9)),
  ];
  const invalid = (checkDigit(digits) + between(random, 1, 9)) % 10;
  return [...digits, invalid].join("");
}

function samplePlate(random: Random): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const second = letters[Math.floor(random() * letters.length)];
  const third = letters[Math.floor(random() * letters.length)];
  return `G${second}${third}-${between(random, 1000, 9999)}`;
}

function at(day: number, hours: number, minutes: number): number {
  return new Date(YEAR, MONTH, day, hours, minutes, 0).getTime();
}

export function createUnits(): Unit[] {
  const random = createRandom(2411);
  const fixedOwners: Record<number, string> = {
    24: "Andrea Torres",
    7: "Jorge Salazar",
    58: "Lucía Vera",
  };
  return Array.from({ length: UNIT_COUNT }, (_, index) => {
    const number = index + 1;
    const owner: Resident = {
      id: `r-${number}-1`,
      name: fixedOwners[number] ?? personName(random),
      unit: number,
      relation: random() < 0.82 ? "owner" : "tenant",
      canAuthorize: true,
    };
    const residents = [owner];
    if (random() < 0.62) {
      residents.push({
        id: `r-${number}-2`,
        name: personName(random),
        unit: number,
        relation: "family",
        canAuthorize: random() < 0.7,
      });
    }
    if (fixedOwners[number]) owner.relation = "owner";
    return { number, residents };
  });
}

export const GUARDS: Guard[] = [
  {
    id: "g-1",
    name: "Miguel Zambrano",
    position: "supervisor",
    shift: "day",
    post: "Garita principal",
  },
  { id: "g-2", name: "Pedro Quiñónez", position: "guard", shift: "day", post: "Garita principal" },
  { id: "g-3", name: "Luis Cedeño", position: "guard", shift: "night", post: "Garita principal" },
  { id: "g-4", name: "Wilson Barzola", position: "guard", shift: "day", post: "Garita peatonal" },
  { id: "g-5", name: "Byron Pincay", position: "guard", shift: "night", post: "Garita peatonal" },
];

export const ACCOUNTS: Account[] = [
  {
    id: "acc-resident",
    role: "resident",
    email: "villa24@losceibosdelrio.ec",
    name: "Andrea Torres",
    detail: "Residente · Villa 24",
    unit: RESIDENT_UNIT,
  },
  {
    id: "acc-guard",
    role: "guard",
    email: "garita@losceibosdelrio.ec",
    name: "Pedro Quiñónez",
    detail: "Guardia · Garita principal",
    guardId: "g-2",
  },
  {
    id: "acc-admin",
    role: "admin",
    email: "administracion@losceibosdelrio.ec",
    name: "Carlos Mendoza",
    detail: "Administración",
  },
];

const RECURRING_PASS_ID = "p-domestic-24";
const DOMESTIC_WORKER = "Rosa Tomalá";
const DOMESTIC_WORKER_ID = "0917734562";

function guardOnDuty(random: Random, hour: number): string {
  const shift = hour >= 6 && hour < 18 ? "day" : "night";
  const post = random() < 0.78 ? "Garita principal" : "Garita peatonal";
  const guard = GUARDS.find(
    (item) => item.position === "guard" && item.shift === shift && item.post === post,
  );
  return guard?.name ?? GUARDS[1].name;
}

function visitDuration(random: Random, type: VisitType): number {
  switch (type) {
    case "delivery":
      return between(random, 4, 12);
    case "family":
      return between(random, 60, 240);
    case "friend":
      return between(random, 60, 200);
    case "supplier":
      return between(random, 30, 150);
    case "domestic":
      return between(random, 300, 480);
  }
}

function visitorLabel(random: Random, type: VisitType): string {
  if (type === "delivery" && random() < 0.55) return pick(random, DELIVERY_SERVICES);
  if (type === "supplier" && random() < 0.5) return pick(random, SUPPLIER_SERVICES);
  return personName(random);
}

function dayVolume(random: Random, weekday: number): number {
  if (weekday === 6) return between(random, 50, 60);
  if (weekday === 0) return between(random, 44, 56);
  if (weekday === 5) return between(random, 42, 54);
  return between(random, 32, 46);
}

function createDayEntries(day: number, units: Unit[]): LogEntry[] {
  const random = createRandom(9000 + day * 37);
  const weekday = new Date(YEAR, MONTH, day).getDay();
  const dayEnd = at(day, 23, 55);
  const entries: LogEntry[] = [];

  const volume = dayVolume(random, weekday);
  for (let index = 0; index < volume; index += 1) {
    const hour = weighted(random, HOUR_WEIGHTS);
    const inAt = at(day, hour, between(random, 0, 59));
    const type = weighted(random, TYPE_WEIGHTS);
    const unit = units[between(random, 0, units.length - 1)];
    const authorizers = unit.residents.filter((resident) => resident.canAuthorize);
    const viaRequest = random() < (type === "delivery" ? 0.55 : 0.12);
    entries.push({
      id: `h-${day}-${index}`,
      visitorName: visitorLabel(random, type),
      visitorId: sampleIdNumber(random),
      plate: random() < 0.6 ? samplePlate(random) : undefined,
      unit: unit.number,
      type,
      authorizedBy: pick(random, authorizers).name,
      guardName: guardOnDuty(random, hour),
      source: viaRequest ? "request" : "pass",
      inAt,
      outAt: Math.min(inAt + visitDuration(random, type) * 60_000, dayEnd),
      serviceSeconds: viaRequest ? between(random, 70, 130) : between(random, 25, 60),
    });
  }

  if (weekday >= 1 && weekday <= 5) {
    const inAt = at(day, 7, between(random, 50, 59));
    entries.push({
      id: `h-${day}-domestic`,
      visitorName: DOMESTIC_WORKER,
      visitorId: DOMESTIC_WORKER_ID,
      unit: RESIDENT_UNIT,
      type: "domestic",
      authorizedBy: "Andrea Torres",
      guardName: "Pedro Quiñónez",
      source: "pass",
      passId: RECURRING_PASS_ID,
      inAt,
      outAt: at(day, 17, between(random, 0, 12)),
      serviceSeconds: between(random, 22, 40),
    });
  }

  return entries.sort((a, b) => a.inAt - b.inAt);
}

let cachedHistory: LogEntry[] | null = null;

export function getHistory(): LogEntry[] {
  if (cachedHistory) return cachedHistory;
  const units = createUnits();
  const history: LogEntry[] = [];
  for (let day = 1; day < TODAY; day += 1) history.push(...createDayEntries(day, units));
  cachedHistory = history;
  return history;
}

function createTodayEntries(units: Unit[]): LogEntry[] {
  const cutoff = APP_START - 4 * 60_000;
  return createDayEntries(TODAY, units)
    .filter((entry) => entry.inAt < cutoff)
    .map((entry) => ({
      ...entry,
      outAt: entry.outAt !== undefined && entry.outAt < cutoff ? entry.outAt : undefined,
    }));
}

function createPasses(): Pass[] {
  return [
    {
      id: RECURRING_PASS_ID,
      code: "VP-R7K2",
      unit: RESIDENT_UNIT,
      residentName: "Andrea Torres",
      visitorName: DOMESTIC_WORKER,
      visitorId: DOMESTIC_WORKER_ID,
      type: "domestic",
      date: dateKey(at(2, 0, 0)),
      from: "08:00",
      to: "17:00",
      recurringDays: [1, 2, 3, 4, 5],
      createdAt: at(1, 19, 30),
    },
    {
      id: "p-friend-7",
      code: "VP-M4QD",
      unit: 7,
      residentName: "Jorge Salazar",
      visitorName: "Esteban Figueroa",
      visitorId: "0923381947",
      plate: "GSK-4821",
      type: "friend",
      date: dateKey(APP_START),
      from: "15:00",
      to: "19:00",
      createdAt: at(TODAY, 11, 20),
    },
    {
      id: "p-supplier-58",
      code: "VP-H9TB",
      unit: 58,
      residentName: "Lucía Vera",
      visitorName: "Iván Carvajal",
      visitorId: "0931176403",
      plate: "GTR-2057",
      type: "supplier",
      date: dateKey(at(TODAY - 1, 0, 0)),
      from: "10:00",
      to: "12:00",
      createdAt: at(TODAY - 2, 18, 40),
    },
  ];
}

function createIncidents(): Incident[] {
  return [
    {
      id: "i-1",
      kind: "unauthorized",
      description:
        "Un motociclista intentó ingresar detrás del vehículo de un residente. Se le negó el paso.",
      at: at(3, 21, 40),
      guardName: "Luis Cedeño",
    },
    {
      id: "i-2",
      kind: "rejected",
      description:
        "Vendedor a domicilio sin autorización. El residente rechazó la visita desde la aplicación.",
      at: at(6, 13, 15),
      guardName: "Pedro Quiñónez",
      unit: 73,
    },
    {
      id: "i-3",
      kind: "incident",
      description:
        "La barrera de salida no respondió. Se operó de forma manual durante 20 minutos.",
      at: at(9, 7, 25),
      guardName: "Pedro Quiñónez",
    },
    {
      id: "i-4",
      kind: "other",
      description:
        "Camión de proveedor detenido frente a la garita en hora pico. Se pidió al conductor moverlo.",
      at: at(TODAY - 1, 18, 50),
      guardName: "Luis Cedeño",
      unit: 102,
    },
  ];
}

function createNotices(): Notice[] {
  const recent = getHistory()
    .filter((entry) => entry.unit === RESIDENT_UNIT)
    .slice(-3);
  return recent.flatMap((entry) => {
    const notices: Notice[] = [
      {
        id: `n-${entry.id}-in`,
        unit: RESIDENT_UNIT,
        kind: "entry",
        text: `${entry.visitorName} ingresó por la garita principal.`,
        at: entry.inAt,
        read: true,
      },
    ];
    if (entry.outAt !== undefined) {
      notices.push({
        id: `n-${entry.id}-out`,
        unit: RESIDENT_UNIT,
        kind: "exit",
        text: `${entry.visitorName} salió de la ciudadela.`,
        at: entry.outAt,
        read: true,
      });
    }
    return notices;
  });
}

export function createInitialState(): AppState {
  const units = createUnits();
  return {
    version: STATE_VERSION,
    clock: { appAt: APP_START, realAt: Date.now() },
    units,
    guards: GUARDS,
    passes: createPasses(),
    requests: [],
    log: createTodayEntries(units),
    incidents: createIncidents(),
    notices: createNotices(),
    settings: {
      communityName: "Los Ceibos del Río",
      city: "Samborondón",
      address: "Km 8,5 vía a Samborondón",
      unitCount: UNIT_COUNT,
      gateName: "Garita principal",
      maxPassHours: 12,
      supplierFrom: "08:00",
      supplierTo: "18:00",
      adsEnabled: true,
    },
    backupMode: false,
    counter: 1,
  };
}

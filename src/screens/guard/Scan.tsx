import { useEffect, useRef, useState, type MouseEvent } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { QrCode } from "@/components/QrCode";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge, SectionTitle } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { toast } from "@/components/ui/toast";
import { maskId, normalize } from "@/lib/format";
import { PASS_STATUS_META, passSchedule, passStatus, type PassStatus } from "@/lib/passes";
import { Link, navigate } from "@/lib/router";
import { now, useAllEntries, useAppState } from "@/lib/store";
import type { Pass } from "@/lib/types";

const LONG_PRESS_MS = 650;
const READ_MS = 900;

export function Scan() {
  const state = useAppState();
  const entries = useAllEntries();
  const [reading, setReading] = useState<Pass | null>(null);
  const [query, setQuery] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const held = useRef(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const readTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current);
      window.clearTimeout(readTimer.current);
    },
    [],
  );

  const statusOf = (pass: Pass): PassStatus => passStatus(pass, now(), entries);
  const newestFirst = [...state.passes].sort((a, b) => b.createdAt - a.createdAt);

  const pickPass = (wantExpired: boolean): Pass | undefined => {
    if (wantExpired) {
      return (
        newestFirst.find((pass) => statusOf(pass) === "expired") ??
        newestFirst.find((pass) => statusOf(pass) !== "valid")
      );
    }
    return newestFirst.find((pass) => statusOf(pass) === "valid") ?? newestFirst[0];
  };

  const read = (pass: Pass | undefined) => {
    if (!pass || reading) return;
    setReading(pass);
    readTimer.current = window.setTimeout(() => navigate(`/guard/result/${pass.id}`), READ_MS);
  };

  const startHold = () => {
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
    }, LONG_PRESS_MS);
  };

  const scan = (event: MouseEvent) => {
    window.clearTimeout(holdTimer.current);
    read(pickPass(held.current || event.shiftKey));
    held.current = false;
  };

  const toggleCamera = async () => {
    if (stream) {
      setStream(null);
      return;
    }
    try {
      setStream(
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }),
      );
    } catch {
      toast("No se pudo usar la cámara. Revisa el permiso del navegador.", "warn");
    }
  };

  const wanted = normalize(query).replace(/[^a-z0-9]/g, "");
  const matches =
    wanted.length < 2
      ? []
      : newestFirst
          .filter((pass) =>
            [pass.code, pass.visitorId, pass.visitorName, pass.plate ?? ""].some((value) =>
              normalize(value)
                .replace(/[^a-z0-9]/g, "")
                .includes(wanted),
            ),
          )
          .slice(0, 5);

  return (
    <MobileShell title="Escanear pase" back="/guard">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-viewfinder">
        {stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {reading && !stream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-rise opacity-90">
              <QrCode code={reading.code} size={176} />
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-[14%]">
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-xl",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl",
          ].map((corner) => (
            <span key={corner} className={`absolute size-10 border-white ${corner}`} />
          ))}
          <span
            style={{ "--scan-distance": "240px" } as React.CSSProperties}
            className="animate-scan absolute inset-x-2 top-2 h-0.5 rounded bg-ok"
          />
        </div>
        <p className="absolute inset-x-0 bottom-4 text-center text-sm font-medium text-white/85">
          {reading ? "Leyendo código…" : "Apunta al código QR del pase"}
        </p>
        <button
          type="button"
          onClick={toggleCamera}
          aria-label={stream ? "Apagar cámara" : "Activar cámara"}
          aria-pressed={Boolean(stream)}
          className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <Icon name="camera" size={20} />
        </button>
      </div>

      <Button
        size="lg"
        block
        icon="scan"
        className="mt-4 touch-manipulation select-none"
        disabled={Boolean(reading)}
        onPointerDown={startHold}
        onPointerLeave={() => window.clearTimeout(holdTimer.current)}
        onContextMenu={(event) => event.preventDefault()}
        onClick={scan}
      >
        Escanear
      </Button>

      <section className="mt-7">
        <SectionTitle>¿No puede mostrar el código?</SectionTitle>
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          />
          <TextInput
            aria-label="Buscar pase por cédula, nombre o código"
            placeholder="Cédula, nombre o código del pase"
            autoComplete="off"
            className="pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {wanted.length >= 2 &&
          (matches.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-line-strong px-4 py-4 text-sm text-ink-muted">
              No hay pases con ese dato. Si la visita no fue anunciada,{" "}
              <Link to="/guard/walk-in" className="font-medium text-brand underline">
                envía una solicitud al residente
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {matches.map((pass) => {
                const status = statusOf(pass);
                const meta = PASS_STATUS_META[status];
                return (
                  <li key={pass.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/guard/result/${pass.id}`)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-paper"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">
                          {pass.visitorName}
                        </span>
                        <span className="block truncate text-sm text-ink-muted">
                          Villa {pass.unit} · {passSchedule(pass)}
                        </span>
                        <span className="block font-mono text-xs text-ink-muted">
                          {pass.code} · {maskId(pass.visitorId)}
                        </span>
                      </span>
                      <Badge tone={status === "valid" ? "ok" : meta.tone}>
                        {status === "valid" ? "Vigente" : meta.label}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
      </section>
    </MobileShell>
  );
}

import { useState, type FormEvent } from "react";
import { Logo } from "@/components/layout/Logo";
import { QrCode } from "@/components/QrCode";
import { Button, Field, TextInput } from "@/components/ui/controls";
import { Avatar } from "@/components/ui/display";
import { Icon } from "@/components/ui/Icon";
import { navigate } from "@/lib/router";
import {
  findAccountByEmail,
  forgetDeviceAccount,
  signIn,
  useAppState,
  useDeviceAccounts,
} from "@/lib/store";
import type { Account } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const SAVED_PASSWORD = "ceibos2026";

type Errors = { email?: string; password?: string; form?: string };

export function Login() {
  const { settings } = useAppState();
  const deviceAccounts = useDeviceAccounts();
  const [selected, setSelected] = useState<Account | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [recoverySent, setRecoverySent] = useState(false);

  const activeEmail = selected ? selected.email : email;

  const choose = (account: Account | null) => {
    setSelected(account);
    setPassword(account ? SAVED_PASSWORD : "");
    setErrors({});
    setRecoverySent(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setRecoverySent(false);
    const next: Errors = {};
    if (!activeEmail.trim()) next.email = "Escribe tu correo.";
    else if (!EMAIL_PATTERN.test(activeEmail.trim())) next.email = "Revisa el formato del correo.";
    if (!password) next.password = "Escribe tu contraseña.";
    else if (password.length < MIN_PASSWORD)
      next.password = `La contraseña tiene al menos ${MIN_PASSWORD} caracteres.`;
    if (next.email || next.password) {
      setErrors(next);
      return;
    }
    const account = findAccountByEmail(activeEmail);
    if (!account) {
      setErrors({ form: "Correo o contraseña incorrectos. Revisa los datos e intenta de nuevo." });
      return;
    }
    signIn(account);
    navigate(`/${account.role}`);
  };

  const recover = () => {
    if (!EMAIL_PATTERN.test(activeEmail.trim())) {
      setErrors({ email: "Escribe tu correo para enviarte el enlace." });
      return;
    }
    setErrors({});
    setRecoverySent(true);
  };

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative hidden overflow-hidden bg-brand text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo size={30} inverse />
        <div>
          <p className="max-w-md font-display text-5xl leading-[1.05] font-bold tracking-tight">
            El ingreso a tu ciudadela, sin llamadas.
          </p>
          <p className="mt-5 max-w-sm text-base text-white/75">
            Autoriza visitas desde el celular, valida en la garita con un código y revisa cada
            ingreso en un solo lugar.
          </p>
        </div>
        <div className="flex max-w-sm items-center gap-4 rounded-2xl border border-white/20 p-4">
          <QrCode code="VP-M4QD" size={84} />
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.08em] text-white/65 uppercase">
              Pase de visita
            </p>
            <p className="font-display text-xl leading-tight font-semibold">Villa 24</p>
            <p className="mt-0.5 font-mono text-sm text-white/80">jue 12 nov · 16h00 a 18h00</p>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh flex-col px-5 py-8 sm:px-10 lg:justify-center">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo size={30} />
          </div>
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-ink-muted uppercase">
            {settings.communityName} · {settings.city}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Inicia sesión</h1>

          {!selected && deviceAccounts.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-sm font-medium text-ink-muted">Cuentas en este dispositivo</p>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {deviceAccounts.map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => choose(account)}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-paper"
                    >
                      <Avatar name={account.name} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">
                          {account.name}
                        </span>
                        <span className="block truncate text-sm text-ink-muted">
                          {account.detail}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={18} className="text-ink-muted" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-6 mb-1 text-sm font-medium text-ink-muted">
                O entra con otra cuenta
              </p>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {selected ? (
              <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
                <Avatar name={selected.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{selected.name}</p>
                  <p className="truncate font-mono text-xs text-ink-muted">{selected.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    forgetDeviceAccount(selected.id);
                    choose(null);
                  }}
                  className="rounded-lg px-2 py-1 text-sm font-medium text-ink-muted hover:bg-paper"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <Field label="Correo" htmlFor="email" error={errors.email}>
                <TextInput
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="nombre@correo.com"
                  value={email}
                  invalid={Boolean(errors.email)}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors({});
                  }}
                />
              </Field>
            )}

            <Field label="Contraseña" htmlFor="password" error={errors.password}>
              <TextInput
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus={Boolean(selected)}
                value={password}
                invalid={Boolean(errors.password)}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((current) => ({ email: current.email }));
                }}
              />
            </Field>

            {errors.form && (
              <p
                role="alert"
                className="rounded-lg border border-danger bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"
              >
                {errors.form}
              </p>
            )}
            {recoverySent && (
              <p
                role="status"
                className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink"
              >
                Te enviamos un enlace a <span className="font-mono">{activeEmail.trim()}</span> para
                crear una contraseña nueva.
              </p>
            )}

            <Button type="submit" size="lg" block>
              Ingresar
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={recover}
                className="font-medium text-brand hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
              {selected && (
                <button
                  type="button"
                  onClick={() => choose(null)}
                  className="font-medium text-brand hover:underline"
                >
                  Usar otra cuenta
                </button>
              )}
            </div>
          </form>

          <p className="mt-10 border-t border-line pt-5 text-sm text-ink-muted">
            ¿Te invitaron a la ciudadela? No necesitas cuenta: abre el enlace del pase que te
            compartieron.
          </p>
        </div>
      </section>
    </div>
  );
}

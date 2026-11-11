import { useState } from "react";
import { Button } from "@/components/ui/controls";
import { Avatar, Sheet } from "@/components/ui/display";
import { navigate } from "@/lib/router";
import { signOut, useAppState } from "@/lib/store";
import type { Account } from "@/lib/types";

export function AccountMenu({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const { settings } = useAppState();

  const close = () => setOpen(false);
  const leave = () => {
    signOut();
    navigate("/");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de la cuenta"
        className="rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar name={account.name} size={36} />
      </button>
      {open && (
        <Sheet title="Tu cuenta" onClose={close}>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3">
            <Avatar name={account.name} size={48} />
            <div className="min-w-0">
              <p className="font-display text-lg leading-tight font-semibold">{account.name}</p>
              <p className="text-sm text-ink-muted">{account.detail}</p>
              <p className="truncate font-mono text-xs text-ink-muted">{account.email}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            {settings.communityName}, {settings.city}
          </p>
          <Button variant="secondary" icon="logout" block className="mt-5" onClick={leave}>
            Cerrar sesión
          </Button>
        </Sheet>
      )}
    </>
  );
}

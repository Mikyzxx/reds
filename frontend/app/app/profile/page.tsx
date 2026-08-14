"use client";

import { useRef, useState } from "react";
import { AtSign, Camera, Mail, Trash2 } from "lucide-react";
import { getStoredUser, removeAvatar, uploadAvatar } from "@/lib/auth";
import type { User } from "@/lib/types";
import { assetUrl } from "@/lib/api";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato no soportado (usa JPG, PNG o WEBP)");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("La imagen supera el tamaño máximo permitido (5MB)");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      const updated = await removeAvatar();
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la foto");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-line px-7 py-5">
        <div>
          <div className="text-xl font-bold">Perfil</div>
          <div className="mt-0.5 font-mono text-[11px] text-fg2">
            tu cuenta en NEXA
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-7">
        <div className="flex max-w-md flex-col gap-6 border border-line2 bg-panel2 p-6">
          <div className="flex items-center gap-5">
            <div className="group relative h-20 w-20 flex-none">
              {user.avatar_url ? (
                <img
                  src={assetUrl(user.avatar_url)}
                  alt={user.display_name}
                  className="h-20 w-20 border border-cyan/30 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center border border-cyan/30 bg-cyan/10 font-mono text-2xl text-cyan">
                  {user.initials}
                </div>
              )}
              <button
                type="button"
                title="Cambiar foto"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="absolute inset-0 flex cursor-pointer items-center justify-center bg-bg/70 opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                <Camera size={18} strokeWidth={2} className="text-cyan" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-base font-semibold">{user.display_name}</div>
              <div className="flex flex-col gap-1 font-mono text-[11px] text-fg2">
                <span className="flex items-center gap-1.5">
                  <AtSign size={11} strokeWidth={2} className="text-cyan/60" />
                  {user.username}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail size={11} strokeWidth={2} className="text-cyan/60" />
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileSelected}
            className="hidden"
          />

          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer items-center gap-1.5 bg-cyan px-4 py-[9px] font-mono text-[11px] font-semibold tracking-wide text-[#04121a] hover:bg-cyan-hi disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera size={13} strokeWidth={2.5} />
              {busy ? "SUBIENDO…" : "SUBIR FOTO"}
            </button>
            {user.avatar_url && (
              <button
                type="button"
                disabled={busy}
                onClick={onRemove}
                className="flex cursor-pointer items-center gap-1.5 border border-line2 px-4 py-[9px] font-mono text-[11px] tracking-wide text-fg2 hover:border-red/40 hover:text-red-hi disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={13} strokeWidth={2} />
                ELIMINAR
              </button>
            )}
          </div>

          {error && (
            <div className="border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red-hi">
              ✕ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

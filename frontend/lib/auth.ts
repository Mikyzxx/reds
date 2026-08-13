"use client";

import { useEffect, useState } from "react";
import { api, apiUpload, clearToken, getToken, setToken } from "./api";
import type { User } from "./types";

const USER_KEY = "nexa_user";
const USER_UPDATED_EVENT = "nexa:user-updated";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Persiste el usuario y avisa a cualquier useSession() montado (p. ej. el
 * sidebar) para que refleje el cambio sin necesitar un reload. */
export function updateStoredUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent<User>(USER_UPDATED_EVENT, { detail: user }));
}

export async function uploadAvatar(file: File): Promise<User> {
  const user = await apiUpload<User>("/api/users/me/avatar", file);
  updateStoredUser(user);
  return user;
}

export async function removeAvatar(): Promise<User> {
  const user = await api<User>("/api/users/me/avatar", { method: "DELETE" });
  updateStoredUser(user);
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await api<{ access_token: string; user: User }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setToken(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function register(
  displayName: string,
  email: string,
  password: string,
): Promise<User> {
  const data = await api<{ access_token: string; user: User }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ display_name: displayName, email, password }),
    },
  );
  setToken(data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  clearToken();
  localStorage.removeItem(USER_KEY);
}

/** Sesión del lado cliente: user null mientras carga, redirige si no hay token. */
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      window.location.href = "/login";
      return;
    }
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setLoading(false);
    }
    // revalida contra el backend por si el token expiró
    api<User>("/api/auth/me")
      .then((me) => {
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
        setLoading(false);
      })
      .catch(() => {
        logout();
        window.location.href = "/login";
      });

    const onUserUpdated = (e: Event) => {
      setUser((e as CustomEvent<User>).detail);
    };
    window.addEventListener(USER_UPDATED_EVENT, onUserUpdated);
    return () => window.removeEventListener(USER_UPDATED_EVENT, onUserUpdated);
  }, []);

  return { user, loading };
}

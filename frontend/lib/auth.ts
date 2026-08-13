"use client";

import { useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "./api";
import type { User } from "./types";

const USER_KEY = "nexa_user";

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
  }, []);

  return { user, loading };
}

import type { User } from "../types";

export function saveSession(token: string, user: User) {
  localStorage.setItem("lsrw_token", token);
  localStorage.setItem("lsrw_user", JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem("lsrw_token");
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem("lsrw_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("lsrw_token");
  localStorage.removeItem("lsrw_user");
}

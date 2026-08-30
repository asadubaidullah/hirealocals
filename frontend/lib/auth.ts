export type AuthRole = "tourist" | "local" | "admin";

export const TOKEN_KEY = "hal_token";
export const ROLE_KEY = "hal_role";
export const NAME_KEY = "hal_name";
export const EMAIL_KEY = "hal_email";

export function saveSession(data: { access_token: string; role: AuthRole; full_name?: string; email?: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(ROLE_KEY, data.role);
  if (data.full_name) localStorage.setItem(NAME_KEY, data.full_name);
  if (data.email) localStorage.setItem(EMAIL_KEY, data.email);
  window.dispatchEvent(new Event("hal-auth-changed"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
  window.dispatchEvent(new Event("hal-auth-changed"));
}

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function getRole(): AuthRole | null {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem(ROLE_KEY);
  return role === "tourist" || role === "local" || role === "admin" ? role : null;
}

export function dashboardFor(role: AuthRole | null) {
  if (role === "admin") return "/admin";
  if (role === "local") return "/local-dashboard";
  return "/dashboard";
}


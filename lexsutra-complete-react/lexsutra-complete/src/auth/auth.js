const TOKEN_KEY = "lexsutra_token";
const USER_KEY = "lexsutra_user";

export function setAuth(authResponse) {
  if (!authResponse?.token) return;
  localStorage.setItem(TOKEN_KEY, authResponse.token);
  if (authResponse.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders() {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

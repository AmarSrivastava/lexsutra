import { Navigate, useLocation } from "react-router-dom";

const ADMIN_KEY_STORAGE = "lexsutra_admin_key";

export default function RequireAdmin({ children }) {
  const location = useLocation();
  const key = localStorage.getItem(ADMIN_KEY_STORAGE);

  if (!key) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function clearAdminKey() {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

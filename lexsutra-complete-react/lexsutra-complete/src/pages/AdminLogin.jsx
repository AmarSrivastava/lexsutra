import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const ADMIN_KEY_STORAGE = "lexsutra_admin_key";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from || "/admin/judgements/new";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmed = adminKey.trim();
    if (!trimmed) {
      setError("Enter the admin key.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/ping`, {
        headers: {
          "X-Admin-Key": trimmed,
        },
      });

      if (!res.ok) {
        setError("Invalid admin key.");
        return;
      }

      localStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
      navigate(from, { replace: true });
    } catch {
      setError("Cannot reach API. Start the .NET server and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <h1 className="hero__title" style={{ marginBottom: "10px" }}>Admin Login</h1>
            <p className="hero__subtitle">Enter the admin key to access judgement publishing tools.</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">Admin</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: "760px" }}>
          <div className="card">
            <form className="newsletter" onSubmit={onSubmit}>
              <input
                className="input"
                placeholder="Enter admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                autoComplete="off"
              />
              <button className="btn btn--primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {error && (
              <p style={{ marginTop: "12px", color: "#8B1D1D", fontWeight: 700 }}>{error}</p>
            )}

            <div style={{ marginTop: "14px" }}>
              <Link to="/" style={{ textDecoration: "none", color: "var(--gold)", fontWeight: 900 }}>
                Back to Home →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

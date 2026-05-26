import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { setAuth } from "../auth/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = location.state?.from || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || "Login failed.");
        return;
      }

      setAuth(data);
      navigate(from, { replace: true });
    } catch {
      setError("Cannot reach API. Start the .NET server and try again.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = useCallback(async (credential) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: credential }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || "Google login failed.");
        return;
      }

      setAuth(data);
      navigate(from, { replace: true });
    } catch {
      setError("Cannot reach API. Start the .NET server and try again.");
    } finally {
      setLoading(false);
    }
  }, [from, navigate]);

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <h1 className="hero__title" style={{ marginBottom: "10px" }}>Login</h1>
            <p className="hero__subtitle">Access your LexSutra account.</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">Login</span>
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
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="input"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="btn btn--primary" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>

            <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
              <GoogleLoginButton onCredential={onGoogleCredential} />
            </div>

            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <p style={{ marginTop: "10px", color: "var(--muted)", fontSize: "13px", lineHeight: 1.6 }}>
                Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in your Vite env to enable it.
              </p>
            )}

            {error && (
              <p style={{ marginTop: "12px", color: "#8B1D1D", fontWeight: 700 }}>{error}</p>
            )}

            <div style={{ marginTop: "14px" }}>
              <span style={{ color: "var(--muted)" }}>New here? </span>
              <Link to="/signup" style={{ textDecoration: "none", color: "var(--gold)", fontWeight: 900 }}>
                Create an account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

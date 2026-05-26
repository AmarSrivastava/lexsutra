
import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import iconMap from "../assets/icon-map.svg";
import iconChat from "../assets/icon-chat.svg";
import iconUsers from "../assets/icon-users.svg";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const SUBJECTS = [
  "General Enquiry",
  "Book a Consultation",
  "Criminal Law Matter",
  "Civil Law Matter",
  "Constitutional Law Matter",
  "Service / Employment Law",
  "Family & Matrimonial Law",
  "Other",
];

const INITIAL = { name: "", email: "", phone: "", subject: "", message: "" };

export default function ContactUs() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverMsg, setServerMsg] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address.";
    if (!form.subject) errs.subject = "Please select a subject.";
    if (!form.message.trim()) errs.message = "Message is required.";
    else if (form.message.trim().length < 20) errs.message = "Message must be at least 20 characters.";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setServerMsg(data.message || "Thank you! We will be in touch soon.");
        setForm(INITIAL);
      } else {
        setStatus("error");
        setServerMsg(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setServerMsg("Could not reach the server. Please try again later.");
    }
  }

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <h1 className="hero__title" style={{ marginBottom: "10px" }}>Contact Us</h1>
            <p className="hero__subtitle">
              Reach out to Advocate Disha Srivastava for legal consultations, inquiries or case-related assistance.
            </p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">Contact Us</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: "grid", gap: "32px", gridTemplateColumns: "1fr 1.5fr", alignItems: "start" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <img src={iconMap} alt="" aria-hidden="true" style={{ width: "36px", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Office Address</h3>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6, fontSize: "14px" }}>
                  High Court of Judicature at Allahabad,<br />
                  Allahabad – 211001, Uttar Pradesh, India
                </p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <img src={iconChat} alt="" aria-hidden="true" style={{ width: "36px", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Phone & Email</h3>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8, fontSize: "14px" }}>
                  <a href="tel:+919838134024" style={{ color: "var(--gold)", fontWeight: 700 }}>+91-9838134024</a><br />
                  <a href="mailto:adv.dishasrivastava@gmail.com" style={{ color: "var(--gold)", fontWeight: 700 }}>adv.dishasrivastava@gmail.com</a>
                </p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <img src={iconUsers} alt="" aria-hidden="true" style={{ width: "36px", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Consultation Hours</h3>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8, fontSize: "14px" }}>
                  Monday – Saturday<br />
                  10:00 AM – 6:00 PM<br />
                  <em style={{ fontSize: "12px" }}>Sunday by appointment only</em>
                </p>
              </div>
            </div>

            <div className="card card--dark" style={{ textAlign: "center" }}>
              <p style={{ color: "rgba(233,241,255,0.80)", margin: "0 0 12px", fontSize: "14px", lineHeight: 1.6 }}>
                Prefer a direct call? Book your consultation now.
              </p>
              <a className="btn btn--primary" href="tel:+919838134024" style={{ width: "100%", justifyContent: "center" }}>
                Call Now ↗
              </a>
            </div>
          </div>

          <div className="card" style={{ padding: "28px 32px" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: "22px" }}>Send Us a Message</h2>
            <p style={{ margin: "0 0 24px", color: "var(--muted)", fontSize: "14px" }}>
              Fill in the form below and we will get back to you within 24 hours.
            </p>

            {status === "success" && (
              <div style={successBanner}>
                ✓ {serverMsg}
              </div>
            )}

            {status === "error" && (
              <div style={errorBanner}>
                ✗ {serverMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label="Full Name *" error={errors.name}>
                  <input
                    className="input"
                    name="name"
                    placeholder="Eg. Ramesh Kumar"
                    value={form.name}
                    onChange={handleChange}
                    style={errors.name ? inputError : {}}
                  />
                </Field>
                <Field label="Email Address *" error={errors.email}>
                  <input
                    className="input"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    style={errors.email ? inputError : {}}
                  />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label="Phone Number">
                  <input
                    className="input"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Subject *" error={errors.subject}>
                  <select
                    className="input"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    style={{ ...(errors.subject ? inputError : {}), appearance: "auto" }}
                  >
                    <option value="">— Select a subject —</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Message *" error={errors.message}>
                <textarea
                  className="input"
                  name="message"
                  rows={5}
                  placeholder="Briefly describe your matter or question…"
                  value={form.message}
                  onChange={handleChange}
                  style={{ resize: "vertical", ...(errors.message ? inputError : {}) }}
                />
              </Field>

              <button
                className="btn btn--primary"
                type="submit"
                disabled={status === "loading"}
                style={{ alignSelf: "flex-start", minWidth: "160px", justifyContent: "center" }}
              >
                {status === "loading" ? "Sending…" : "Send Message →"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)" }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: "12px", color: "#d32f2f" }}>{error}</span>}
    </div>
  );
}

const inputError = { borderColor: "#d32f2f", boxShadow: "0 0 0 3px rgba(211,47,47,0.12)" };

const successBanner = {
  background: "rgba(56,142,60,0.10)",
  border: "1px solid rgba(56,142,60,0.35)",
  borderRadius: "12px",
  padding: "12px 16px",
  color: "#2e7d32",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "8px",
};

const errorBanner = {
  background: "rgba(211,47,47,0.08)",
  border: "1px solid rgba(211,47,47,0.30)",
  borderRadius: "12px",
  padding: "12px 16px",
  color: "#c62828",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "8px",
};

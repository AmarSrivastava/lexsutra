
import { useState } from "react";

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

const INITIAL = { name: "", email: "", phone: "", subject: "Book a Consultation", message: "" };

export default function TopBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="container topbar__inner">
          <div className="topbar__left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Adv. Disha Srivastava &nbsp;|&nbsp; Supreme &amp; High Court Advocate</span>
          </div>
          <div className="topbar__right">
            <a className="topbar__contact" href="tel:+919838134024">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.09 4.18 2 2 0 0 1 5.09 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 9.91a16 16 0 0 0 5.99 5.99l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              +91-9838134024
            </a>
            <a className="topbar__contact" href="mailto:adv.dishasrivastava@gmail.com">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              adv.dishasrivastava@gmail.com
            </a>
            <button className="topbar__cta" onClick={() => setOpen(true)}>
              Free Consultation
            </button>
          </div>
        </div>
      </div>

      {open && <ConsultationModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ConsultationModal({ onClose }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.subject) errs.subject = "Please select a subject.";
    if (!form.message.trim()) errs.message = "Message is required.";
    else if (form.message.trim().length < 10) errs.message = "At least 10 characters.";
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-header">
          <div className="modal-header__badge">FREE CONSULTATION</div>
          <h2 className="modal-header__title">Book Your Free Consultation</h2>
          <p className="modal-header__sub">
            Speak with Adv. Disha Srivastava — Supreme &amp; High Court Advocate.<br />
            We respond within 24 hours.
          </p>
        </div>

        {status === "success" ? (
          <div className="modal-success">
            <div className="modal-success__icon">✓</div>
            <h3>Request Received!</h3>
            <p>{serverMsg}</p>
            <button className="btn btn--primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="modal-form">
            {status === "error" && (
              <div className="modal-error-banner">✗ {serverMsg}</div>
            )}

            <div className="modal-form__row">
              <MField label="Full Name *" error={errors.name}>
                <input className="input" name="name" placeholder="Ramesh Kumar" value={form.name} onChange={handleChange} style={errors.name ? errStyle : {}} />
              </MField>
              <MField label="Phone Number">
                <input className="input" name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
              </MField>
            </div>

            <MField label="Email Address *" error={errors.email}>
              <input className="input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} style={errors.email ? errStyle : {}} />
            </MField>

            <MField label="Subject *" error={errors.subject}>
              <select className="input" name="subject" value={form.subject} onChange={handleChange} style={{ ...(errors.subject ? errStyle : {}), appearance: "auto" }}>
                <option value="">— Select a subject —</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </MField>

            <MField label="Brief Description *" error={errors.message}>
              <textarea className="input" name="message" rows={4} placeholder="Briefly describe your matter…" value={form.message} onChange={handleChange} style={{ resize: "vertical", ...(errors.message ? errStyle : {}) }} />
            </MField>

            <button className="btn btn--primary modal-submit" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Sending…" : "Send Request →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function MField({ label, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: "11px", color: "#d32f2f" }}>{error}</span>}
    </div>
  );
}

const errStyle = { borderColor: "#d32f2f", boxShadow: "0 0 0 3px rgba(211,47,47,0.12)" };

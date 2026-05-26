
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { clearAdminKey, getAdminKey } from "../components/RequireAdmin";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function AdminView() {
  const navigate = useNavigate();
  const [judgements, setJudgements] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("judgements");

  const logout = () => {
    clearAdminKey();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    const adminKey = getAdminKey();
    if (!adminKey) { navigate("/admin/login", { replace: true }); return; }

    const headers = { "X-Admin-Key": adminKey };

    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/judgements`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/blog`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE}/api/admin/contact`, { headers }).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([j, b, c]) => {
      setJudgements(Array.isArray(j) ? j : []);
      setBlogs(Array.isArray(b) ? b : []);
      setContacts(Array.isArray(c) ? c : []);
    }).finally(() => setLoading(false));
  }, [navigate]);

  const tabs = [
    { id: "judgements", label: `Judgements (${judgements.length})` },
    { id: "blogs", label: `Blog Posts (${blogs.length})` },
    { id: "contacts", label: `Inquiries (${contacts.length})` },
  ];

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <h1 className="hero__title" style={{ marginBottom: "10px" }}>Admin Dashboard</h1>
            <p className="hero__subtitle">Manage judgements, blog posts and contact inquiries.</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">Admin</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: "1100px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pill${activeTab === t.id ? " pill--active" : ""}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {activeTab === "blogs" ? (
                <Link className="btn btn--primary" to="/admin/blog/new">
                  + Add New Blog Post
                </Link>
              ) : activeTab === "judgements" ? (
                <Link className="btn btn--primary" to="/admin/judgements/new">
                  + Add New Judgement
                </Link>
              ) : null}
              <button className="btn" type="button" onClick={logout} style={{ borderColor: "rgba(3,27,60,0.18)", background: "transparent" }}>
                Logout
              </button>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: "center", padding: "48px", color: "var(--muted)" }}>
              Loading…
            </div>
          ) : (
            <>
              {activeTab === "judgements" && (
                <AdminTable
                  columns={["Title", "Category", "Date", "Slug"]}
                  rows={judgements.map((j) => [j.title, j.tag, formatDate(j.date), j.slug, j.isLive])}
                  linkBase="/judgements"
                  editBase="/admin/judgements/edit"
                  deleteBase="/api/judgements"
                  toggleBase="/api/judgements"
                  slugIndex={3}
                  liveIndex={4}
                  empty="No judgements found."
                  onDeleted={(slug) => setJudgements((prev) => prev.filter((j) => j.slug !== slug))}
                  onToggled={(slug, val) => setJudgements((prev) => prev.map((j) => j.slug === slug ? { ...j, isLive: val } : j))}
                />
              )}

              {activeTab === "blogs" && (
                <AdminTable
                  columns={["Title", "Category", "Date", "Slug"]}
                  rows={blogs.map((b) => [b.title, b.tag, formatDate(b.date), b.slug, b.isLive])}
                  linkBase="/blog"
                  editBase="/admin/blog/edit"
                  deleteBase="/api/blog"
                  toggleBase="/api/blog"
                  slugIndex={3}
                  liveIndex={4}
                  empty="No blog posts found."
                  onDeleted={(slug) => setBlogs((prev) => prev.filter((b) => b.slug !== slug))}
                  onToggled={(slug, val) => setBlogs((prev) => prev.map((b) => b.slug === slug ? { ...b, isLive: val } : b))}
                />
              )}

              {activeTab === "contacts" && (
                <AdminTable
                  columns={["Name", "Email", "Phone", "Subject", "Submitted"]}
                  rows={contacts.map((c) => [c.name, c.email, c.phone || "—", c.subject, formatDate(c.submittedAt)])}
                  empty="No contact inquiries yet."
                  expandData={contacts.map((c) => c.message)}
                />
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}

function AdminTable({ columns, rows, linkBase, editBase, deleteBase, toggleBase, slugIndex, liveIndex, empty, expandData, onDeleted, onToggled }) {
  const [expanded, setExpanded] = useState(null);
  const [deletingSlug, setDeletingSlug] = useState(null);
  const [togglingSlug, setTogglingSlug] = useState(null);

  async function handleDelete(slug) {
    if (!window.confirm(`Delete "${slug}"? This cannot be undone.`)) return;
    const adminKey = getAdminKey();
    if (!adminKey) return;
    setDeletingSlug(slug);
    try {
      const res = await fetch(`${API_BASE}${deleteBase}/${slug}`, {
        method: "DELETE",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok && onDeleted) onDeleted(slug);
    } finally {
      setDeletingSlug(null);
    }
  }

  async function handleToggle(slug) {
    const adminKey = getAdminKey();
    if (!adminKey) return;
    setTogglingSlug(slug);
    try {
      const res = await fetch(`${API_BASE}${toggleBase}/${slug}/live`, {
        method: "PATCH",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (onToggled) onToggled(slug, data.isLive);
      }
    } finally {
      setTogglingSlug(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
        {empty}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", tableLayout: "fixed" }}>
          <thead>
            <tr style={{ background: "rgba(3,27,60,0.06)", borderBottom: "1px solid rgba(3,27,60,0.10)" }}>
              {columns.map((c) => (
                <th key={c} style={thStyle}>{c}</th>
              ))}
              {(linkBase || editBase || deleteBase || expandData) && <th style={actionsThStyle}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <>
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid rgba(3,27,60,0.07)", background: i % 2 === 0 ? "white" : "rgba(3,27,60,0.02)" }}
                >
                  {row.map((cell, j) => {
                    if (liveIndex !== undefined && j === liveIndex) return null;
                    return <td key={j} style={tdStyle}>{String(cell ?? "")}</td>;
                  })}
                  {(linkBase || editBase || deleteBase || expandData) && (
                    <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                        {linkBase && (
                          <Link to={`${linkBase}/${row[slugIndex]}`} title="View" style={iconLinkStyle("#b45309")}>
                            <IconEye />
                          </Link>
                        )}
                        {editBase && (
                          <Link to={`${editBase}/${row[slugIndex]}`} title="Edit" style={iconLinkStyle("#1565c0")}>
                            <IconEdit />
                          </Link>
                        )}
                        {deleteBase && (
                          <button
                            type="button"
                            title="Delete"
                            disabled={deletingSlug === row[slugIndex]}
                            onClick={() => handleDelete(row[slugIndex])}
                            style={iconBtnStyle(deletingSlug === row[slugIndex] ? "#aaa" : "#c62828")}
                          >
                            <IconTrash />
                          </button>
                        )}
                        {expandData && (
                          <button
                            type="button"
                            title={expanded === i ? "Hide message" : "View message"}
                            onClick={() => setExpanded(expanded === i ? null : i)}
                            style={iconBtnStyle("#6d28d9")}
                          >
                            <IconMessage open={expanded === i} />
                          </button>
                        )}
                      </span>
                    </td>
                  )}
                </tr>
                {expandData && expanded === i && (
                  <tr key={`exp-${i}`} style={{ background: "rgba(212,164,55,0.06)" }}>
                    <td colSpan={columns.length + 1} style={{ ...tdStyle, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.6, whiteSpace: "normal" }}>
                      {expandData[i]}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
    </div>
  );
}

const thStyle = { padding: "12px 16px", textAlign: "left", fontWeight: 700, fontSize: "13px", color: "var(--navy)", whiteSpace: "nowrap" };
const tdStyle = { padding: "11px 16px", verticalAlign: "middle", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const actionsThStyle = { ...thStyle, textAlign: "center", width: "120px" };

const iconLinkStyle = (color) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: "30px", height: "30px", borderRadius: "8px", color,
  background: "rgba(0,0,0,0.04)", textDecoration: "none",
  transition: "background 120ms",
});

const iconBtnStyle = (color) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: "30px", height: "30px", borderRadius: "8px", color,
  background: "rgba(0,0,0,0.04)", border: "none", cursor: "pointer",
  transition: "background 120ms",
});

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function IconMessage({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function formatDate(value) {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

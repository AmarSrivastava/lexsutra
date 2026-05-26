import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import gavelImg from "../assets/lexsutra_svg_assets/judge_gavel.png";
import scImg from "../assets/lexsutra_svg_assets/supreme_court.png";
import statueImg from "../assets/lexsutra_svg_assets/hero_statue.png";
import blogImg from "../assets/lexsutra_svg_assets/blog_writing.png";
import tajImg from "../assets/lexsutra_svg_assets/taj_building.png";
import { clearAdminKey, getAdminKey } from "../components/RequireAdmin";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const IMAGE_MAP = {
  judge_gavel: gavelImg,
  supreme_court: scImg,
  hero_statue: statueImg,
  blog_writing: blogImg,
  taj_building: tajImg,
};

const EMPTY_FORM = {
  title: "", slug: "", category: "HIGH COURT", author: "",
  publishedOn: "", subtitle: "", image: "judge_gavel",
  caseTitle: "", judgmentUrl: "", sourceUrl: "", content: "",
};

export default function AdminJudgementForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: editSlug } = useParams();

  const isBlog = location.pathname.startsWith("/admin/blog");
  const isEdit = Boolean(editSlug);
  const kind = isBlog ? "blog" : "judgement";
  const label = isBlog ? "Blog Post" : "Judgement";

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!isEdit) { setForm(EMPTY_FORM); return; }

    const adminKey = getAdminKey();
    if (!adminKey) { navigate("/admin/login", { replace: true }); return; }

    setLoadingEdit(true);
    const url = isBlog
      ? `${API_BASE}/api/blog/${editSlug}`
      : `${API_BASE}/api/judgements/${editSlug}`;

    fetch(url, { headers: { "X-Admin-Key": adminKey } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setStatus({ type: "error", message: "Could not load entry." }); return; }
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          category: data.category || "HIGH COURT",
          author: data.author || "",
          publishedOn: (data.date || "").slice(0, 10),
          subtitle: data.subtitle || "",
          image: data.image || "judge_gavel",
          caseTitle: data.caseTitle || "",
          judgmentUrl: data.judgmentUrl || "",
          sourceUrl: data.sourceUrl || "",
          content: blocksToContent(data.body),
        });
      })
      .catch(() => setStatus({ type: "error", message: "Failed to fetch entry." }))
      .finally(() => setLoadingEdit(false));
  }, [editSlug, isBlog, isEdit, navigate]);

  const slugPreview = useMemo(
    () => isEdit ? (editSlug || "") : slugify(form.slug || form.title),
    [isEdit, editSlug, form.slug, form.title]
  );
  const imagePreview = useMemo(() => resolveImage(form.image), [form.image]);

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const setContent = (val) => setForm((prev) => ({ ...prev, content: val }));

  const logout = () => {
    clearAdminKey();
    navigate("/admin/login", { replace: true });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!form.title.trim()) {
      setStatus({ type: "error", message: "Title is required." });
      return;
    }

    const adminKey = getAdminKey();
    if (!adminKey) { logout(); return; }

    const body = contentToBlocks(form.content);
    const payload = {
      slug: slugPreview,
      category: form.category.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      author: form.author.trim() || "Admin",
      publishedOn: form.publishedOn,
      image: form.image.trim() || "judge_gavel",
      caseTitle: nullIfEmpty(form.caseTitle),
      judgmentUrl: nullIfEmpty(form.judgmentUrl),
      sourceUrl: nullIfEmpty(form.sourceUrl),
      body,
    };

    const baseUrl = isBlog ? `${API_BASE}/api/blog` : `${API_BASE}/api/judgements`;
    const url = isEdit ? `${baseUrl}/${editSlug}` : baseUrl;
    const method = isEdit ? "PUT" : "POST";

    setSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setStatus({ type: "error", message: "Not authorized. Please login again." });
        return;
      }
      if (!res.ok) {
        let detail = "";
        try { detail = await res.text(); } catch { /* ignore */ }
        try { const j = JSON.parse(detail); detail = j.message || detail; } catch { /* not json */ }
        setStatus({ type: "error", message: `[${res.status}] ${detail || `Failed to save ${label}.`}` });
        return;
      }

      setStatus({ type: "success", message: `${label} saved successfully.` });
      const dest = isBlog ? `/blog/${slugPreview}` : `/judgements/${slugPreview}`;
      navigate(dest);
    } catch {
      setStatus({ type: "error", message: "Cannot reach API. Start the .NET server and try again." });
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isEdit ? `Edit ${label}` : `Add ${label}`;

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <h1 className="hero__title" style={{ marginBottom: "10px" }}>{pageTitle}</h1>
            <p className="hero__subtitle">{isEdit ? `Update the ${label.toLowerCase()} entry.` : `Create and publish a new ${label.toLowerCase()} entry.`}</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <Link to="/admin/judgements/admin-view">Admin</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">{pageTitle}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: "980px" }}>
          {loadingEdit ? (
            <div className="card" style={{ textAlign: "center", padding: "48px", color: "var(--muted)" }}>Loading entry…</div>
          ) : (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "var(--muted)", fontSize: "13px" }}>Slug</div>
                <div style={{ fontWeight: 900 }}>{slugPreview || "-"}</div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button className="btn" type="button" onClick={logout} style={{ borderColor: "rgba(3,27,60,0.18)", background: "transparent" }}>
                  Logout
                </button>
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ marginTop: "18px" }}>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Title</label>
                  <input className="input" value={form.title} onChange={update("title")} placeholder={`${label} title`} />
                </div>

                {!isEdit && (
                  <div>
                    <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Custom Slug (optional)</label>
                    <input className="input" value={form.slug} onChange={update("slug")} placeholder="leave blank to auto-generate" />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Category</label>
                  <select className="input" value={form.category} onChange={update("category")} style={{ appearance: "auto" }}>
                    <option value="HIGH COURT">HIGH COURT</option>
                    <option value="SUPREME COURT">SUPREME COURT</option>
                    <option value="CONSTITUTIONAL LAW">CONSTITUTIONAL LAW</option>
                    <option value="CRIMINAL LAW">CRIMINAL LAW</option>
                    <option value="CIVIL LAW">CIVIL LAW</option>
                    <option value="CORPORATE LAW">CORPORATE LAW</option>
                    <option value="SERVICE LAW">SERVICE LAW</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Author</label>
                  <input className="input" value={form.author} onChange={update("author")} placeholder="Author name" />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Published On</label>
                  <input className="input" type="date" value={form.publishedOn} onChange={update("publishedOn")} />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Image (key or URL)</label>
                  <input className="input" value={form.image} onChange={update("image")} placeholder="judge_gavel | supreme_court | https://..." />
                  <div style={{ marginTop: "10px" }}>
                    <img src={imagePreview} alt="" aria-hidden="true" style={{ width: "100%", maxWidth: "260px", borderRadius: "14px", border: "1px solid rgba(3,27,60,0.12)" }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Subtitle / Summary</label>
                <textarea className="input" value={form.subtitle} onChange={update("subtitle")} rows={3} placeholder="Short summary shown under the title" />
              </div>

              {!isBlog && (
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "14px", marginTop: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Case Title (optional)</label>
                    <input className="input" value={form.caseTitle} onChange={update("caseTitle")} placeholder="Case title" />
                  </div>

                  <div>
                    <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Judgement PDF URL (optional)</label>
                    <input className="input" value={form.judgmentUrl} onChange={update("judgmentUrl")} placeholder="https://...pdf" />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Source URL (optional)</label>
                    <input className="input" value={form.sourceUrl} onChange={update("sourceUrl")} placeholder="https://..." />
                  </div>
                </div>
              )}

              <div style={{ marginTop: "14px" }}>
                <label style={{ display: "block", fontWeight: 800, marginBottom: "8px" }}>Content</label>
                <ContentEditor value={form.content} onChange={setContent} />
              </div>

              {status && (
                <div style={{ marginTop: "12px", fontWeight: 800, color: status.type === "success" ? "#0B5D1E" : "#8B1D1D" }}>
                  {status.message}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
                <button className="btn btn--primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : `Save ${label}`}
                </button>
                <Link className="btn btn--ghost" to="/admin/judgements/admin-view">← Back to Admin</Link>
              </div>
            </form>
          </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}

function blocksToContent(blocks) {
  if (!blocks || !Array.isArray(blocks)) return "";
  return blocks.map((b) => {
    if (b.type === "h") return `## ${b.text}`;
    if (b.type === "quote") return `> ${b.text}`;
    if (b.type === "alsoRead") return `ALSO READ: ${b.text} | ${b.href || ""}`;
    if (b.type === "ul") return (b.items || []).map((it) => `- ${it}`).join("\n");
    return b.text || "";
  }).join("\n\n");
}

function resolveImage(value) {
  if (!value) return gavelImg;
  if (IMAGE_MAP[value]) return IMAGE_MAP[value];
  return value;
}

function nullIfEmpty(value) {
  const t = (value || "").trim();
  return t ? t : null;
}

function slugify(value) {
  const input = (value || "").trim().toLowerCase();
  const normalized = input.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  return normalized || `${Date.now()}`;
}

function ContentEditor({ value, onChange }) {
  const ref = useRef(null);

  function applyLinePrefix(prefix) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const alreadyApplied = value.slice(lineStart).startsWith(prefix);
    const newValue = alreadyApplied
      ? value.slice(0, lineStart) + value.slice(lineStart + prefix.length)
      : value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(newValue);
    const newCursor = start + (alreadyApplied ? -prefix.length : prefix.length);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newCursor, newCursor); }, 0);
  }

  function insertBlock(template) {
    const ta = ref.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const sep = before && !before.endsWith("\n") ? "\n" : "";
    const newVal = before + sep + template + "\n" + after;
    onChange(newVal);
    const newPos = before.length + sep.length + template.length;
    setTimeout(() => { ta.focus(); ta.setSelectionRange(newPos, newPos); }, 0);
  }

  function wrapSelection(before, after, placeholder) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  }

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div style={{ border: "1.5px solid rgba(3,27,60,0.18)", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "6px 8px", background: "rgba(3,27,60,0.04)", borderBottom: "1px solid rgba(3,27,60,0.10)", flexWrap: "wrap" }}>
        <TBtn title="Heading — inserts ## at line start (click again to remove)" onClick={() => applyLinePrefix("## ")}>
          <b style={{ fontSize: "13px", letterSpacing: "-0.5px" }}>H2</b>
        </TBtn>
        <TBtn title="Blockquote — inserts > at line start" onClick={() => applyLinePrefix("> ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
        </TBtn>
        <TBtn title="Bullet list — inserts - at line start" onClick={() => applyLinePrefix("- ")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
        </TBtn>
        <div style={{ width: "1px", height: "22px", background: "rgba(3,27,60,0.15)", margin: "0 4px" }} />
        <TBtn title="Bold — wraps selection in **bold**" onClick={() => wrapSelection("**", "**", "bold text")}>
          <b style={{ fontSize: "13px" }}>B</b>
        </TBtn>
        <TBtn title="Italic — wraps selection in _italic_" onClick={() => wrapSelection("_", "_", "italic text")}>
          <i style={{ fontSize: "13px" }}>I</i>
        </TBtn>
        <div style={{ width: "1px", height: "22px", background: "rgba(3,27,60,0.15)", margin: "0 4px" }} />
        <TBtn title="Insert an 'Also Read' link block" onClick={() => insertBlock("ALSO READ: Title | /judgements/slug")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span style={{ fontSize: "11px", fontWeight: 700, marginLeft: "3px" }}>Also Read</span>
        </TBtn>
        <TBtn title="Insert a paragraph break (blank line)" onClick={() => insertBlock("")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="8 8 3 12 8 16"/><polyline points="16 8 21 12 16 16"/></svg>
          <span style={{ fontSize: "11px", fontWeight: 700, marginLeft: "3px" }}>Break</span>
        </TBtn>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--muted)", paddingRight: "4px", whiteSpace: "nowrap" }}>
          {wordCount} word{wordCount !== 1 ? "s" : ""}
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        style={{
          display: "block", width: "100%", border: "none", outline: "none",
          padding: "12px 14px", boxSizing: "border-box",
          fontFamily: "ui-monospace, SFMono-Regular, 'Cascadia Code', monospace",
          fontSize: "13px", lineHeight: "1.75", resize: "vertical",
          background: "transparent", color: "var(--text)",
        }}
        placeholder={"Paragraphs separated by blank lines.\n## Section Heading\n- Bullet item\n> Blockquote text\nALSO READ: Title | /judgements/slug"}
      />
      <div style={{ padding: "5px 12px", background: "rgba(3,27,60,0.03)", borderTop: "1px solid rgba(3,27,60,0.07)", fontSize: "11px", color: "var(--muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span>## Heading</span>
        <span>&gt; Quote</span>
        <span>- Bullet</span>
        <span>**Bold**</span>
        <span>_Italic_</span>
        <span>ALSO READ: Title | /url</span>
      </div>
    </div>
  );
}

function TBtn({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: "2px", padding: "3px 7px", border: "1px solid rgba(3,27,60,0.14)",
        borderRadius: "6px", background: "#fff", color: "var(--navy)",
        cursor: "pointer", fontSize: "13px", lineHeight: 1,
        transition: "background 120ms, border-color 120ms",
        minHeight: "28px",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(3,27,60,0.07)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
    >
      {children}
    </button>
  );
}

function contentToBlocks(text) {
  const src = (text || "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "h", text: line.slice(3).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({ type: "quote", text: line.slice(2).trim() });
      i += 1;
      continue;
    }

    if (line.toUpperCase().startsWith("ALSO READ:")) {
      const raw = line.slice(9).trim();
      const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        blocks.push({ type: "alsoRead", text: parts[0], href: parts[1] });
        i += 1;
        continue;
      }
    }

    if (line.trim().startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim()) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }

  return blocks;
}

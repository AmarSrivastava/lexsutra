import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import gavelImg from "../assets/lexsutra_svg_assets/judge_gavel.png";
import scImg from "../assets/lexsutra_svg_assets/supreme_court.png";
import statueImg from "../assets/lexsutra_svg_assets/hero_statue.png";
import blogImg from "../assets/lexsutra_svg_assets/blog_writing.png";
import tajImg from "../assets/lexsutra_svg_assets/taj_building.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const IMAGE_MAP = {
  judge_gavel: gavelImg,
  supreme_court: scImg,
  hero_statue: statueImg,
  blog_writing: blogImg,
  taj_building: tajImg,
};

export default function Article() {
  const { slug } = useParams();
  const location = useLocation();
  const isJudgementRoute = location.pathname.startsWith("/judgements/");
  const isBlogRoute = location.pathname.startsWith("/blog/");

  const [remoteArticle, setRemoteArticle] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const sessionId = useRef((() => {
    let id = localStorage.getItem("ls_session");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("ls_session", id); }
    return id;
  })());

  useEffect(() => {
    if (!isJudgementRoute && !isBlogRoute) {
      setRemoteArticle(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setRemoteArticle(null);

    const url = isJudgementRoute
      ? `${API_BASE}/api/judgements/${slug}`
      : `${API_BASE}/api/blog/${slug}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setRemoteArticle(null);
          return;
        }

        const data = await res.json();
        if (!cancelled) setRemoteArticle(data);
      })
      .catch(() => {
        if (!cancelled) setRemoteArticle(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isJudgementRoute, isBlogRoute, slug]);

  useEffect(() => {
    if (!isJudgementRoute && !isBlogRoute) {
      setRelatedItems([]);
      return;
    }

    let cancelled = false;

    const listUrl = isJudgementRoute
      ? `${API_BASE}/api/judgements`
      : `${API_BASE}/api/blog`;

    fetch(listUrl)
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .then((data) => {
        if (cancelled) return;
        setRelatedItems(data.filter((x) => x?.slug && x.slug !== slug).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRelatedItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isJudgementRoute, isBlogRoute, slug]);

  useEffect(() => {
    if (!slug) return;
    const liked = localStorage.getItem(`ls_liked_${slug}`) === "1";
    setHasLiked(liked);
    fetch(`${API_BASE}/api/likes/${slug}`)
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setLikeCount(d.count ?? 0))
      .catch(() => {});
    fetch(`${API_BASE}/api/comments/${slug}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setComments(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [slug]);

  async function toggleLike() {
    const method = hasLiked ? "DELETE" : "POST";
    const kind = isJudgementRoute ? "judgement" : "blog";
    try {
      const url = hasLiked
        ? `${API_BASE}/api/likes/${slug}?sessionId=${encodeURIComponent(sessionId.current)}`
        : `${API_BASE}/api/likes/${slug}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: hasLiked ? undefined : JSON.stringify({ sessionId: sessionId.current, kind }),
      });
      if (res.ok) {
        const d = await res.json();
        setLikeCount(d.count ?? 0);
        const next = !hasLiked;
        setHasLiked(next);
        if (next) localStorage.setItem(`ls_liked_${slug}`, "1");
        else localStorage.removeItem(`ls_liked_${slug}`);
      }
    } catch {}
  }

  async function submitComment(e) {
    e.preventDefault();
    setCommentError("");
    if (!commentName.trim() || !commentBody.trim()) {
      setCommentError("Please fill in your name and comment.");
      return;
    }
    setCommentSubmitting(true);
    const kind = isJudgementRoute ? "judgement" : "blog";
    try {
      const res = await fetch(`${API_BASE}/api/comments/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: commentName.trim(), body: commentBody.trim(), kind }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setCommentName("");
        setCommentBody("");
      } else {
        const err = await res.json().catch(() => ({}));
        setCommentError(err.message || "Failed to post comment.");
      }
    } catch {
      setCommentError("Network error. Please try again.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  const article = remoteArticle;
  const cover = useMemo(() => resolveImage(article?.image), [article?.image]);

  if (!article && loading) {
    return (
      <>
        <Navbar />
        <section className="hero">
          <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <h1 className="hero__title">Loading…</h1>
              <p className="hero__subtitle">Fetching content.</p>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Navbar />
        <section className="hero">
          <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <h1 className="hero__title">Article not found</h1>
              <p className="hero__subtitle">The page you are looking for does not exist.</p>
              <div className="hero__actions">
                <Link className="btn btn--primary" to="/">Go Home</Link>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const isJudgement = article.kind === "judgement";
  const sectionLabel = isJudgement ? "Judgements" : "Blog";
  const sectionPath = isJudgement ? "/judgements" : "/blog";
  const related = relatedItems;

  return (
    <>
      <Navbar />

      <section className="hero">
        <div className="container hero__inner" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <div className="badge" style={{ marginBottom: "12px" }}>{article.category}</div>
            <h1 className="hero__title" style={{ marginBottom: "12px" }}>{article.title}</h1>
            <p className="hero__subtitle">{article.subtitle}</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <Link to={sectionPath}>{sectionLabel}</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">{article.title}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container article">
          <div className="article__main">
            <div className="article__meta">
              <span><strong>{article.author}</strong></span>
              <span className="article__dot">•</span>
              <span>{formatDate(article.date)}</span>
              <span className="article__dot">•</span>
              <span>👁 {(article.views || 0).toLocaleString()} views</span>
            </div>

            <img className="article__cover" src={cover} alt={article.title} />

            <article className="article__body">
              {article.body.map((block, idx) => {
                if (block.type === "p") {
                  return <p key={idx}>{block.text}</p>;
                }
                if (block.type === "h") {
                  return <h2 key={idx}>{block.text}</h2>;
                }
                if (block.type === "ul") {
                  return (
                    <ul key={idx} className="article__list">
                      {block.items.map((it, i) => (<li key={i}>{it}</li>))}
                    </ul>
                  );
                }
                if (block.type === "quote") {
                  return <blockquote key={idx} className="article__quote">{block.text}</blockquote>;
                }
                if (block.type === "alsoRead") {
                  const href = block.href || "";
                  const isExternal = /^https?:\/\//i.test(href);
                  return (
                    isExternal ? (
                      <a key={idx} href={href} target="_blank" rel="noreferrer" className="article__alsoRead">
                        <span className="badge">ALSO READ</span>
                        <span>{block.text} →</span>
                      </a>
                    ) : (
                      <Link key={idx} to={href} className="article__alsoRead">
                        <span className="badge">ALSO READ</span>
                        <span>{block.text} →</span>
                      </Link>
                    )
                  );
                }
                return null;
              })}

              {isJudgement && article.caseTitle && (
                <p><strong>Case Title:</strong> {article.caseTitle}</p>
              )}

              {isJudgement && article.judgmentUrl && (
                <p style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <a className="btn btn--primary" href={article.judgmentUrl} target="_blank" rel="noreferrer">
                    Read Judgement (PDF) ↗
                  </a>
                  {article.sourceUrl && (
                    <a className="btn btn--ghost" href={article.sourceUrl} target="_blank" rel="noreferrer">
                      View Original Source ↗
                    </a>
                  )}
                </p>
              )}
            </article>

            <div className="article__share">
              <strong>Share this:</strong>
              <a href="#" onClick={(e) => e.preventDefault()}>Twitter</a>
              <a href="#" onClick={(e) => e.preventDefault()}>LinkedIn</a>
              <a href="#" onClick={(e) => e.preventDefault()}>WhatsApp</a>
            </div>

            {/* ── LIKE ── */}
            <div className="article__likes">
              <button
                className={`article__like-btn${hasLiked ? " article__like-btn--active" : ""}`}
                onClick={toggleLike}
              >
                <span>{hasLiked ? "❤️" : "🤍"}</span>
                <span>{likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
              </button>
            </div>

            {/* ── COMMENTS ── */}
            <div className="article__comments">
              <h3 className="article__comments-title">Comments ({comments.length})</h3>

              {comments.length > 0 && (
                <div className="article__comment-list">
                  {comments.map(c => (
                    <div key={c.id} className="article__comment">
                      <div className="article__comment-avatar">{c.authorName.charAt(0).toUpperCase()}</div>
                      <div className="article__comment-content">
                        <div className="article__comment-header">
                          <strong>{c.authorName}</strong>
                          <span className="article__comment-date">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="article__comment-text">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form className="article__comment-form" onSubmit={submitComment}>
                <h4 style={{margin:"0 0 14px", fontWeight:700}}>Leave a Comment</h4>
                {commentError && <div className="article__comment-error">{commentError}</div>}
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  maxLength={80}
                  style={{marginBottom:'10px'}}
                />
                <textarea
                  className="input"
                  placeholder="Write your comment…"
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  style={{display:'block', width:'100%', resize:'vertical', marginBottom:'12px'}}
                />
                <button type="submit" className="btn btn--primary" disabled={commentSubmitting}>
                  {commentSubmitting ? "Posting…" : "Post Comment"}
                </button>
              </form>
            </div>
          </div>

          <aside className="article__side">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Related {sectionLabel}</h3>
              <ul className="linkList">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link to={`${sectionPath}/${r.slug}`}>{r.title}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card card--dark">
              <h3 style={{ marginTop: 0 }}>Need Legal Assistance?</h3>
              <p style={{ color: "rgba(233,241,255,0.78)", lineHeight: 1.6 }}>
                Book a consultation with Advocate Disha Srivastava.
              </p>
              <a className="btn btn--primary" href="tel:+919838134024">Book Consultation</a>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </>
  );
}

function formatDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function resolveImage(value) {
  if (!value) return gavelImg;
  if (IMAGE_MAP[value]) return IMAGE_MAP[value];
  return value;
}

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import thumbBlog from "../assets/lexsutra_svg_assets/blog_writing.png";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Blog(){
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/blog`)
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .then((data) => {
        if (!cancelled) setPosts(data);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return(
    <>
      <Navbar/>

      <section className="hero">
        <div className="container hero__inner">
          <div>
            <h1 className="hero__title" style={{marginBottom:'10px'}}>Legal Insights & Updates</h1>
            <p className="hero__subtitle">Articles, summaries and updates to help you understand the law clearly.</p>
          </div>
          <img className="hero__image" src={thumbBlog} alt="Legal insights illustration" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {posts.map((p) => (
              <Link key={p.slug} className="card card--clickable" to={`/blog/${p.slug}`}>
                <img src={thumbBlog} alt="" aria-hidden="true" style={{width:'100%', borderRadius:'16px', marginBottom:'12px', border:'1px solid rgba(3,27,60,0.10)'}} />
                <div className="badge" style={{marginBottom:'10px'}}>{p.tag}</div>
                <h3 style={{margin:'0 0 8px'}}>{p.title}</h3>
                <p style={{margin:'0 0 12px', color:'var(--muted)', lineHeight:1.6}}>{p.desc}</p>
                {p.author && <div style={{color:'var(--muted)', fontSize:'12px', marginBottom:'6px'}}>✍ {p.author}</div>}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px'}}>
                  <span style={{color:'var(--muted)', fontSize:'13px'}}>{formatDate(p.date)}</span>
                  <span style={{color:'var(--muted)', fontSize:'12px'}}>👁 {(p.views || 0).toLocaleString()}</span>
                  <span style={{color:'var(--gold)', fontWeight:900}}>Read More →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer/>
    </>
  )
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

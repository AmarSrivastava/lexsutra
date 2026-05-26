
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import thumbJudgement from "../assets/lexsutra_svg_assets/supreme_court.png";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Judgements(){
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState([]);

  const categories = ["All", "High Court", "Constitutional Law", "Criminal Law", "Civil Law", "Corporate Law", "Service Law"];

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/api/judgements`)
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return items;
    const normalized = activeCategory.toUpperCase();
    return items.filter((x) => x.tag === normalized);
  }, [activeCategory, items]);

  return(
    <>
      <Navbar/>

      <section className="hero">
        <div className="container hero__inner" style={{gridTemplateColumns:'1fr'}}>
          <div>
            <h1 className="hero__title" style={{marginBottom:'10px'}}>Latest Judgements</h1>
            <p className="hero__subtitle">Stay updated with the latest judgements and important orders.</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <Link to="/judgements">Judgements</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">Latest Judgements</span>
            </div>
            <div className="searchRow" style={{marginTop:'16px', maxWidth:'520px'}}>
              <input className="input" placeholder="Search judgements..." />
              <button className="btn btn--primary" type="button">Search</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="tabs">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`pill${c === activeCategory ? " pill--active" : ""}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid" style={{gap:'16px'}}>
            {filtered.map((j) => (
              <Link key={j.slug} className="card card--clickable" to={`/judgements/${j.slug}`}>
                <div style={{display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'center'}}>
                  <img src={thumbJudgement} alt="" aria-hidden="true" style={{width:'220px', maxWidth:'100%', borderRadius:'16px'}} />
                  <div style={{flex:'1 1 320px', minWidth:'280px'}}>
                    <div className="badge" style={{marginBottom:'10px'}}>{j.tag}</div>
                    <h3 style={{margin:'0 0 8px'}}>{j.title}</h3>
                    <p style={{margin:'0 0 12px', color:'var(--muted)', lineHeight:1.6}}>{j.desc}</p>
                    <div style={{display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap'}}>
                      <span style={{color:'var(--muted)', fontSize:'13px'}}>{formatDate(j.date)}</span>
                      {j.author && <span style={{color:'var(--muted)', fontSize:'13px'}}>✍ {j.author}</span>}
                      <span style={{color:'var(--muted)', fontSize:'13px'}}>👁 {(j.views || 0).toLocaleString()} views</span>
                      <span style={{color:'var(--gold)', fontWeight:800}}>Read Judgement →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{display:'flex', justifyContent:'center', marginTop:'18px', gap:'8px', flexWrap:'wrap'}}>
            <span className="badge">1</span>
            <span className="badge" style={{opacity:0.6}}>2</span>
            <span className="badge" style={{opacity:0.6}}>3</span>
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

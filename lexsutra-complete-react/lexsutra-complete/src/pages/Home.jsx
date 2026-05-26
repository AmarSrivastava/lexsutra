
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import heroBanner from "../assets/lexsutra_svg_assets/hero-banner.png";
import dishaImg from "../assets/lexsutra_svg_assets/about_disha.png";
import thumbJudgement from "../assets/lexsutra_svg_assets/supreme_court.png";
import thumbBlog from "../assets/lexsutra_svg_assets/blog_writing.png";
import thumbLandmark from "../assets/lexsutra_svg_assets/taj_building.png";
import gavelImg from "../assets/lexsutra_svg_assets/judge_gavel.png";
import lexsutraIcon from "../assets/lexsutra_svg_assets/lexsutra-icon.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const SERVICES = [
  { icon: <IcoGavel/>,    title: "Criminal Law",       desc: "Defending your rights in criminal matters with expert legal support.", link: "/judgements" },
  { icon: <IcoBalance/>,  title: "Civil Litigation",   desc: "Effective representation in civil disputes and litigation matters.",    link: "/judgements" },
  { icon: <IcoBuilding/>, title: "Corporate Law",      desc: "End-to-end legal solutions for businesses and corporate needs.",        link: "/judgements" },
  { icon: <IcoFamily/>,   title: "Family Law",         desc: "Compassionate legal support for family and marital disputes.",          link: "/judgements" },
  { icon: <IcoChat/>,     title: "Legal Consultation", desc: "Clear, practical and result-oriented legal advice.",                    link: "/contact"    },
  { icon: <IcoProperty/>, title: "Property Law",       desc: "Assistance in property disputes, agreements and documentation.",        link: "/judgements" },
];

const TESTIMONIALS = [
  { name: "Rohit Verma",  role: "Client", text: "Adv. Disha Srivastava provided excellent guidance and support throughout my case. Highly professional and trustworthy." },
  { name: "Neha Singh",   role: "Client", text: "LexSutra made a complex legal process so simple for me. Very responsive and clear in communication." },
  { name: "Amit Tiwari",  role: "Client", text: "I appreciate the dedication and commitment shown by the team. Got a favourable outcome in my case." },
];

const STATIC_POSTS = [
  { slug: "supreme-court-bail-2024",        tag: "SUPREME COURT",      title: "Bail in Non-Bailable Offences: What You Should Know",  desc: "A comprehensive guide on bail jurisprudence.", date: "20 May 2024", readTime: "5 min read", thumb: thumbJudgement },
  { slug: "allahabad-hc-property-disputes", tag: "CIVIL LAW",          title: "How to Draft a Legally Valid Agreement",               desc: "Key clauses every legal agreement must have.",  date: "18 May 2024", readTime: "4 min read", thumb: thumbBlog     },
  { slug: "understanding-article-21",       tag: "CORPORATE LAW",      title: "Legal Essentials for Startups in India",               desc: "Must-know compliance requirements.",            date: "10 May 2024", readTime: "6 min read", thumb: gavelImg      },
  { slug: "what-is-habeas-corpus",          tag: "FAMILY LAW",         title: "Child Custody Laws in India Explained",                desc: "Rights, processes and court procedures.",       date: "05 May 2024", readTime: "5 min read", thumb: thumbLandmark },
];

export default function Home(){
  const [posts, setPosts] = useState(STATIC_POSTS);
  const [tIdx, setTIdx] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/blog`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data.slice(0, 4).map(p => ({
            slug: p.slug, tag: p.tag, title: p.title,
            desc: p.desc, date: p.date, readTime: "5 min read",
            thumb: thumbBlog,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return(
    <>
      <Navbar/>

      {/* ── HERO BANNER ───────────────────────────────────── */}
      <section className="hp-hero-banner">
        <img src={heroBanner} alt="LexSutra — Law. Structured. Simplified." className="hp-hero-banner__img" />
        <div className="hp-hero-banner__overlay">
          <h1 className="hp-hero-banner__heading">
            Law. Structured.<br/>
            <span style={{color:'var(--gold)'}}>Simplified.</span>
          </h1>
          <div className="hp-hero-banner__divider"></div>
          <p className="hp-hero-banner__sub">
            Expert legal solutions for individuals and businesses.<br/>
            Your rights. Our responsibility.
          </p>
          <div className="hp-hero-banner__btns">
            <Link className="hp-btn-consult" to="/contact">Book Consultation &rarr;</Link>
            <Link className="hp-btn-explore" to="/judgements">Explore Services</Link>
          </div>
          <div className="hp-hero-banner__proof">
            <div className="hp-avatars">
              {["R","N","A","S"].map(l => (
                <span key={l} className="hp-avatar">{l}</span>
              ))}
            </div>
            <div>
              <div style={{fontWeight:700, fontSize:'13px', color:'rgba(255,255,255,0.92)'}}>500+ Clients Trust Us</div>
              <div style={{color:'var(--gold)', fontSize:'15px', letterSpacing:'3px'}}>★★★★★</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────── */}
      <section className="hp-stats-bar">
        <div className="container">
          <div className="hp-stats">
            {[
              { val:"4+",      label:"Years of Experience",  icon:<IcoBriefcase/> },
              { val:"500+",    label:"Cases Handled",        icon:<IcoFolder/>    },
              { val:"95%",     label:"Client Satisfaction",  icon:<IcoStar/>      },
              { val:"Pan India",label:"Legal Services",      icon:<IcoMap/>       },
            ].map(s => (
              <div key={s.label} className="hp-stat">
                <span className="hp-stat__icon">{s.icon}</span>
                <div>
                  <div className="hp-stat__val">{s.val}</div>
                  <div className="hp-stat__label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────── */}
      <section className="section hp-services">
        <div className="container">
          <div className="hp-section-head">
            <div>
              <div className="hp-tag">WHAT WE DO</div>
              <h2 className="hp-section-title">Our Legal Services</h2>
            </div>
            <Link to="/judgements" className="hp-view-all">View all services &rarr;</Link>
          </div>
          <div className="hp-services-grid">
            {SERVICES.map(s => (
              <div key={s.title} className="hp-service-card">
                <div className="hp-service-card__icon">{s.icon}</div>
                <h3 className="hp-service-card__title">{s.title}</h3>
                <p className="hp-service-card__desc">{s.desc}</p>
                <Link to={s.link} className="hp-learn-more">Learn More &rarr;</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ────────────────────────────────────────── */}
      <section className="section hp-about">
        <div className="container hp-about__inner">
          <div className="hp-about__img-wrap">
            <img src={dishaImg} alt="Adv. Disha Srivastava" className="hp-about__img" />
            <div className="hp-about__badge">
              <span style={{fontSize:'22px'}}>⚖️</span>
              <span style={{fontWeight:700, fontSize:'12px', lineHeight:1.3, color:'#fff'}}>Dedicated<br/>to Justice<br/>and You</span>
            </div>
          </div>
          <div className="hp-about__content">
            <div className="hp-tag">ABOUT US</div>
            <h2 className="hp-section-title">About LexSutra</h2>
            <p style={{color:'var(--muted)', lineHeight:1.8, marginBottom:'20px'}}>
              Founded by <strong>Advocate Disha Srivastava</strong>, LexSutra is committed to delivering practical, reliable and result-driven legal solutions. With years of experience and a client-first approach, we simplify complex legal matters and help you make informed decisions.
            </p>
            {[
              "Personalised Legal Strategy",
              "Transparent & Honest Advice",
              "Timely Updates & Support",
              "Affordable & Effective Solutions",
            ].map(f => (
              <div key={f} className="hp-about__feature">
                <span className="hp-check">✓</span>{f}
              </div>
            ))}
            <Link to="/about" className="btn btn--primary" style={{marginTop:'24px', display:'inline-block'}}>Know More About Us &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────── */}
      <section className="section hp-why">
        <div className="container">
          <div className="hp-why__inner">
            <div className="hp-why__left">
              <div className="hp-tag" style={{color:'rgba(255,255,255,0.7)', borderColor:'rgba(255,255,255,0.2)'}}>WHY CHOOSE US</div>
              <h2 style={{color:'#fff', fontSize:'2rem', fontWeight:800, lineHeight:1.2, margin:'12px 0 0', fontFamily:"'Playfair Display', Georgia, serif"}}>
                Your Case.<br/>Our Commitment.
              </h2>
            </div>
            <div className="hp-why__grid">
              {[
                { icon:<IcoExp/>,    title:"Experienced",     desc:"Years of legal experience in diverse practice areas." },
                { icon:<IcoClient/>, title:"Client-Centric",  desc:"We listen, we understand and we work for the best outcome." },
                { icon:<IcoTrans/>,  title:"Transparent",     desc:"Clear communication and no hidden surprises." },
                { icon:<IcoResult/>, title:"Result-Oriented", desc:"Focused on achieving the best possible results for you." },
              ].map(w => (
                <div key={w.title} className="hp-why-card">
                  <div className="hp-why-card__icon">{w.icon}</div>
                  <h4 style={{margin:'10px 0 6px', color:'#fff', fontWeight:700}}>{w.title}</h4>
                  <p style={{margin:0, color:'rgba(255,255,255,0.65)', fontSize:'13px', lineHeight:1.6}}>{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="hp-section-head" style={{marginBottom:'28px'}}>
            <h2 className="hp-section-title">Trusted by Hundreds of Clients</h2>
            <div style={{display:'flex', gap:'8px'}}>
              <button className="hp-arr" onClick={() => setTIdx(i => Math.max(0, i-1))} disabled={tIdx===0}>&lsaquo;</button>
              <button className="hp-arr" onClick={() => setTIdx(i => Math.min(TESTIMONIALS.length-1, i+1))} disabled={tIdx===TESTIMONIALS.length-1}>&rsaquo;</button>
            </div>
          </div>
          <div className="hp-testimonials">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`hp-tcard${i===tIdx ? " hp-tcard--active" : ""}`}>
                <div className="hp-tcard__quote">"</div>
                <p className="hp-tcard__text">{t.text}</p>
                <div style={{color:'var(--gold)', marginBottom:'8px', fontSize:'14px'}}>★★★★★</div>
                <div style={{fontWeight:700, fontSize:'14px'}}>{t.name}</div>
                <div style={{color:'var(--muted)', fontSize:'12px'}}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <section className="hp-cta">
        <div className="container hp-cta__inner">
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <img src={lexsutraIcon} alt="LexSutra" style={{height:'72px', width:'72px', borderRadius:'16px', flexShrink:0, boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}} />
            <div>
            <h2 style={{margin:'0 0 8px', color:'#fff', fontSize:'1.6rem', fontWeight:800, fontFamily:"'Playfair Display', Georgia, serif"}}>Need Legal Help?</h2>
            <p style={{margin:0, color:'rgba(255,255,255,0.75)', fontSize:'14px'}}>
              Book a consultation with Adv. Disha Srivastava and get the right legal guidance today.
            </p>
            </div>
          </div>
          <div className="hp-cta__actions">
            <Link to="/contact" className="btn btn--primary">Book Consultation &rarr;</Link>
            <a href="tel:+919838134024" className="hp-cta__call">
              <span style={{fontSize:'20px'}}>📞</span>
              <div>
                <div style={{fontSize:'11px', opacity:0.7, color:'#fff'}}>Call Now</div>
                <div style={{fontWeight:700, color:'#fff'}}>+91 9838 134 024</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── INSIGHTS / BLOG ──────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="hp-section-head" style={{marginBottom:'28px'}}>
            <div>
              <div className="hp-tag">LATEST ARTICLES</div>
              <h2 className="hp-section-title">Insights &amp; Updates</h2>
            </div>
            <Link to="/blog" className="hp-view-all">View all articles &rarr;</Link>
          </div>
          <div className="hp-blog-grid">
            {posts.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="hp-blog-card">
                <div className="hp-blog-card__img">
                  <img src={p.thumb} alt={p.title} />
                </div>
                <div className="hp-blog-card__body">
                  <div className="badge" style={{marginBottom:'8px'}}>{p.tag}</div>
                  <h3 className="hp-blog-card__title">{p.title}</h3>
                  <div className="hp-blog-card__meta">
                    <span>{p.date}</span>
                    <span>{p.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer/>
    </>
  );
}

/* ── Inline SVG icons ──────────────────────────────────── */
function IcoGavel()    { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>; }
function IcoBalance()  { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6h18"/><path d="M6 6l-3 6a3 3 0 0 0 6 0l-3-6z"/><path d="M18 6l-3 6a3 3 0 0 0 6 0l-3-6z"/><path d="M9 21h6"/></svg>; }
function IcoBuilding() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22V12h6v10"/><path d="M9 7h1"/><path d="M14 7h1"/><path d="M9 11h1"/><path d="M14 11h1"/></svg>; }
function IcoFamily()   { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IcoChat()     { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IcoProperty() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IcoBriefcase(){ return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>; }
function IcoFolder()   { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function IcoStar()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function IcoMap()      { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>; }
function IcoExp()      { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>; }
function IcoClient()   { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>; }
function IcoTrans()    { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function IcoResult()   { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>; }

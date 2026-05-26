
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import heroGavel from "../assets/lexsutra_svg_assets/judge_gavel.png";
import iconGavel from "../assets/icon-gavel.svg";
import iconBalance from "../assets/icon-balance.svg";
import iconShield from "../assets/icon-shield.svg";
import iconUsers from "../assets/icon-users.svg";
import iconLock from "../assets/icon-lock.svg";
import iconChat from "../assets/icon-chat.svg";
import { Link } from "react-router-dom";

export default function Landmark(){
  const landmark = [
    { icon: iconBalance, title: "Kesavananda Bharati",       sub: "vs State of Kerala",        desc: "Established the Basic Structure Doctrine.",                                year: "1973" },
    { icon: iconShield,  title: "Maneka Gandhi",             sub: "vs Union of India",         desc: "Expanded the scope of Article 21 — Procedure must be fair, just and reasonable.", year: "1978" },
    { icon: iconUsers,   title: "Vishaka",                   sub: "vs State of Rajasthan",     desc: "Laid down guidelines to prevent sexual harassment at workplace.",          year: "1997" },
    { icon: iconLock,    title: "Justice K.S. Puttaswamy",   sub: "vs Union of India",         desc: "Right to Privacy recognised as a Fundamental Right.",                     year: "2017" },
    { icon: iconChat,    title: "Navtej Singh Johar",        sub: "vs Union of India",         desc: "Decriminalised Section 377, upholding dignity and equality.",             year: "2018" },
    { icon: iconGavel,   title: "Shayara Bano",              sub: "vs Union of India",         desc: "Triple Talaq declared unconstitutional.",                                  year: "2017" },
  ];

  return(
    <>
      <Navbar/>

      <section className="hero">
        <div className="container hero__inner">
          <div>
            <h1 className="hero__title" style={{marginBottom:'10px'}}>Landmark Judgements</h1>
            <p className="hero__subtitle">Explore the most significant judgements that shaped Indian law.</p>
            <div className="crumb">
              <Link to="/">Home</Link>
              <span className="crumb__sep">›</span>
              <Link to="/judgements">Judgements</Link>
              <span className="crumb__sep">›</span>
              <span className="crumb__current">Landmark Judgements</span>
            </div>
          </div>
          <img className="hero__image" src={heroGavel} alt="Gavel and law books illustration" />
        </div>
      </section>

      <section id="landmarks" className="section">
        <div className="container">
          <div className="grid grid--3">
            {landmark.map((j) => (
              <div key={j.title + j.year} className="card card--dark card--clickable" style={{position:'relative', overflow:'hidden', textAlign:'center'}}>
                <img src={j.icon} alt="" aria-hidden="true" style={{width:'56px', height:'56px', margin:'4px auto 12px', display:'block'}} />
                <h3 style={{margin:'0 0 4px'}}>{j.title}</h3>
                <div style={{color:'#F3D37A', fontWeight:800, marginBottom:'10px'}}>{j.sub}</div>
                <p style={{margin:'0 0 14px', color:'rgba(233,241,255,0.78)', lineHeight:1.6, fontSize:'13px'}}>{j.desc}</p>
                <span className="badge" style={{background:'rgba(255,255,255,0.06)', color:'rgba(233,241,255,0.85)', borderColor:'rgba(255,255,255,0.12)'}}>{j.year}</span>
              </div>
            ))}
          </div>

          <div style={{display:'flex', justifyContent:'center', marginTop:'24px'}}>
            <a className="btn btn--primary" href="#">View All Landmark Judgements</a>
          </div>
        </div>
      </section>

      <Footer/>
    </>
  )
}

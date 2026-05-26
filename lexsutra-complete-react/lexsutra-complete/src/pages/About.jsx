
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import dishaImg from "../assets/lexsutra_svg_assets/about_disha.png";
import iconBriefcase from "../assets/icon-briefcase.svg";
import iconFolder from "../assets/icon-folder.svg";
import iconStar from "../assets/icon-star.svg";
import iconBuilding from "../assets/icon-building.svg";
import iconShield from "../assets/icon-shield.svg";

export default function About(){
  return(
    <>
      <Navbar/>

      <section className="hero">
        <div className="container hero__inner">
          <div>
            <h1 className="hero__title" style={{marginBottom:'6px'}}>About</h1>
            <p className="hero__subtitle" style={{color:'#F3D37A', fontWeight:800, fontSize:'18px', marginBottom:'14px'}}>Advocate Disha Srivastava</p>
            <p className="hero__subtitle">Advocate Disha Srivastava is a dedicated legal professional practising in the High Court and Supreme Court of India.</p>
            <ul style={{listStyle:'none', padding:0, margin:'14px 0 18px', display:'grid', gap:'8px', color:'rgba(233,241,255,0.85)'}}>
              <li>✓ Expertise in Constitutional, Civil, Criminal and Service Law</li>
              <li>✓ Regular writer and legal analyst</li>
              <li>✓ Passionate about legal awareness and reforms</li>
              <li>✓ Committed to ethical, practical and result-oriented representation</li>
            </ul>
            <div className="hero__actions">
              <a className="btn btn--primary" href="tel:+919838134024">Know More →</a>
            </div>
          </div>
          <img className="hero__image" src={dishaImg} alt="Advocate Disha Srivastava" />
        </div>
      </section>

      <section id="about" className="section statsBar" style={{paddingTop:0}}>
        <div className="container">
          <div className="stats">
            <div className="stat">
              <img src={iconBriefcase} alt="" aria-hidden="true" />
              <div>
                <p className="stat__value">7+</p>
                <p className="stat__label">Years of Experience</p>
              </div>
            </div>
            <div className="stat">
              <img src={iconFolder} alt="" aria-hidden="true" />
              <div>
                <p className="stat__value">100+</p>
                <p className="stat__label">Cases Handled</p>
              </div>
            </div>
            <div className="stat">
              <img src={iconBuilding} alt="" aria-hidden="true" />
              <div>
                <p className="stat__value">Supreme &amp; High Courts</p>
                <p className="stat__label">Appearances</p>
              </div>
            </div>
            <div className="stat">
              <img src={iconShield} alt="" aria-hidden="true" />
              <div>
                <p className="stat__value">Trusted</p>
                <p className="stat__label">By Clients Across India</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
    </>
  )
}


import { Link } from "react-router-dom";
import bannerLogo from "../assets/lexsutra_svg_assets/lexsutra-banner.png";

export default function Footer(){
  return(
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <div>
            <div className="footer__brand">
              <img src={bannerLogo} alt="LexSutra" style={{height:'40px', width:'auto', display:'block', filter:'brightness(1.1)'}} />
            </div>
            <div style={{color:'rgba(233,241,255,0.78)', fontSize:'13px', lineHeight:1.6}}>
              Supreme Court updates, landmark judgements and legal insights.
            </div>
          </div>

          <div>
            <div className="footer__title">Quick Links</div>
            <div className="footer__links">
              <Link to="/judgements">Supreme Court Judgements</Link>
              <Link to="/landmark">Landmark Judgements</Link>
              <Link to="/blog">Legal Insights</Link>
              <Link to="/resources">Resources</Link>
            </div>
          </div>

          <div>
            <div className="footer__title">Practice Areas</div>
            <div className="footer__links">
              <Link to="/judgements">Constitutional Law</Link>
              <Link to="/judgements">Criminal Law</Link>
              <Link to="/judgements">Civil Litigation</Link>
              <Link to="/judgements">Corporate Law</Link>
            </div>
          </div>

          <div>
            <div className="footer__title">Contact</div>
            <div className="footer__links">
              <a href="tel:+919838134024">+91-9838134024</a>
              <a href="mailto:hello@lexsutra.com">hello@lexsutra.com</a>
              <a href="https://main.sci.gov.in/" target="_blank" rel="noreferrer">Supreme Court of India</a>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <div>© 2026 LexSutra. All Rights Reserved.</div>
          <div>
            <a href="#">Privacy Policy</a>
            <span style={{opacity:0.5, padding:'0 10px'}}>|</span>
            <a href="#">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

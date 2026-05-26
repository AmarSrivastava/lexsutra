
import { Link, NavLink } from "react-router-dom";
import bannerLogo from "../assets/lexsutra_svg_assets/lexsutra-banner.png";
import TopBar from "./TopBar";

export default function Navbar(){
  const linkClass = ({ isActive }) => `nav__link${isActive ? " nav__link--active" : ""}`;

  return(
    <>
    <TopBar />
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="nav__brand">
          <img src={bannerLogo} alt="LexSutra" style={{height:'56px', width:'auto', display:'block'}} />
        </Link>

        <nav className="nav__links">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/judgements" className={linkClass}>Judgements</NavLink>
          <NavLink to="/landmark" className={linkClass}>Landmark</NavLink>
          <NavLink to="/blog" className={linkClass}>Blog</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
          <NavLink to="/resources" className={linkClass}>Resources</NavLink>
          <NavLink to="/contact" className={linkClass}>Contact Us</NavLink>
          <NavLink to="/admin/judgements/admin-view" className={linkClass}>Admin</NavLink>
        </nav>
      </div>
    </header>
    </>
  )
}


import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import iconBuilding from "../assets/icon-building.svg";
import iconFolder from "../assets/icon-folder.svg";
import iconBalance from "../assets/icon-balance.svg";
import iconBriefcase from "../assets/icon-briefcase.svg";
import iconBook from "../assets/icon-book.svg";
import iconShield from "../assets/icon-shield.svg";
import iconDownload from "../assets/icon-download.svg";
import iconSearch from "../assets/icon-search.svg";
import iconChat from "../assets/icon-chat.svg";

export default function Resources(){
  const important = [
    { title: "Supreme Court",                 sub: "of India",        href: "https://main.sci.gov.in/",      icon: iconBuilding },
    { title: "Allahabad",                     sub: "High Court",      href: "https://allahabadhighcourt.in/", icon: iconBuilding },
    { title: "E-Courts",                      sub: "Services",        href: "https://ecourts.gov.in/",        icon: iconFolder },
    { title: "National Legal",                sub: "Services Authority", href: "https://nalsa.gov.in/",        icon: iconBalance },
    { title: "Law Commission",                sub: "of India",        href: "https://lawcommissionofindia.nic.in/", icon: iconShield },
  ];

  const free = [
    { title: "Legal Articles",        sub: "Read articles",       href: "/blog",                                  icon: iconBook },
    { title: "Legal Awareness",       sub: "Know your rights",    href: "/blog",                                  icon: iconChat },
    { title: "Downloads",             sub: "Forms & Documents",   href: "#",                                      icon: iconDownload },
    { title: "Judgement",             sub: "Search Tool",         href: "https://main.sci.gov.in/judgments",      icon: iconSearch },
    { title: "Legal Dictionary",      sub: "Explore terms",       href: "https://www.law.cornell.edu/wex",        icon: iconBriefcase },
  ];

  return(
    <>
      <Navbar/>

      <section className="hero">
        <div className="container hero__inner" style={{gridTemplateColumns:'1fr'}}>
          <div>
            <h1 className="hero__title" style={{marginBottom:'10px'}}>Important Links &amp; Resources</h1>
            <p className="hero__subtitle">Access useful legal resources, official portals and free tools.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section__title">Important Legal Links</h2>
          <div className="grid grid--6" style={{gridTemplateColumns:'repeat(5, minmax(0, 1fr))'}}>
            {important.map((item) => (
              <a key={item.title} className="card card--clickable practiceCard" href={item.href} target="_blank" rel="noreferrer">
                <img src={item.icon} alt="" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.sub}</p>
                <span style={{color:'var(--gold)', fontWeight:900, fontSize:'12px', marginTop:'6px'}}>Visit Website →</span>
              </a>
            ))}
          </div>

          <h2 className="section__title" style={{marginTop:'34px'}}>Free Legal Resources</h2>
          <div className="grid grid--6" style={{gridTemplateColumns:'repeat(5, minmax(0, 1fr))'}}>
            {free.map((item) => (
              <a key={item.title} className="card card--clickable practiceCard" href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                <img src={item.icon} alt="" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.sub}</p>
                <span style={{color:'var(--gold)', fontWeight:900, fontSize:'12px', marginTop:'6px'}}>Explore →</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{paddingTop:0}}>
        <div className="container">
          <div className="newsletterBar">
            <div>
              <h3 className="newsletterBar__title">Need Legal Assistance?</h3>
              <p className="newsletterBar__text">Book a consultation with Advocate Disha Srivastava.</p>
            </div>
            <div className="newsletterBar__form">
              <a className="btn btn--primary" href="tel:+919838134024">Book Consultation</a>
              <a className="btn btn--ghost" href="tel:+919838134024">+91-9838134024</a>
            </div>
          </div>
        </div>
      </section>

      <Footer/>
    </>
  )
}

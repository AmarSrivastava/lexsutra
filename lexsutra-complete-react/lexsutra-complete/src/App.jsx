
import { Routes, Route } from "react-router-dom";
import dishaWatermark from "./assets/lexsutra_svg_assets/about_disha.png";
import Home from "./pages/Home";
import Judgements from "./pages/Judgements";
import Landmark from "./pages/Landmark";
import Blog from "./pages/Blog";
import About from "./pages/About";
import Resources from "./pages/Resources";
import Article from "./pages/Article";
import AdminLogin from "./pages/AdminLogin";
import AdminJudgementForm from "./pages/AdminJudgementForm";
import RequireAdmin from "./components/RequireAdmin";
import AdminView from "./pages/AdminView";
import Login from "./pages/Login";
import ContactUs from "./pages/ContactUs";
import Signup from "./pages/Signup";

export default function App(){
  return(
    <>
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${dishaWatermark})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
        opacity: 0.08,
        pointerEvents: 'none',
        zIndex: 0,
        userSelect: 'none',
      }}
    />
    <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/judgements" element={<Judgements/>}/>
      <Route path="/judgements/:slug" element={<Article/>}/>
      <Route path="/landmark" element={<Landmark/>}/>
      <Route path="/blog" element={<Blog/>}/>
      <Route path="/blog/:slug" element={<Article/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="/resources" element={<Resources/>}/>
      <Route path="/contact" element={<ContactUs/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/signup" element={<Signup/>}/>
      <Route path="/admin/login" element={<AdminLogin/>}/>
      <Route path="/admin/judgements/admin-view" element={<RequireAdmin><AdminView/></RequireAdmin>}/>
      <Route path="/admin/judgements/new" element={<RequireAdmin><AdminJudgementForm/></RequireAdmin>}/>
      <Route path="/admin/judgements/edit/:slug" element={<RequireAdmin><AdminJudgementForm/></RequireAdmin>}/>
      <Route path="/admin/blog/new" element={<RequireAdmin><AdminJudgementForm/></RequireAdmin>}/>
      <Route path="/admin/blog/edit/:slug" element={<RequireAdmin><AdminJudgementForm/></RequireAdmin>}/>
    </Routes>
    </>
  )
}

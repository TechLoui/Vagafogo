import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fecharMenu = () => setMenuAberto(false);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md"
          : "bg-white/80 backdrop-blur-sm shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo + Título */}
        <Link to="/" className="flex items-center gap-3 group min-w-[180px]">
          <img
            src={logo}
            alt="Logo Vagafogo"
            className="w-11 h-11 rounded-full object-cover border-2 border-[#8B4F23]/20 group-hover:border-[#8B4F23]/60 transition-colors duration-200"
            loading="lazy"
          />
          <span className="font-bold text-xl text-[#8B4F23] tracking-wide leading-none">
            VAGAFOGO
          </span>
        </Link>

        {/* Menu Desktop */}
        <nav className="hidden lg:flex flex-1 justify-center gap-8">
          {[
            { href: "#inicio", label: "Início" },
            { href: "#brunch", label: "Brunch" },
            { href: "#trilha", label: "Trilha" },
            { href: "#educacao", label: "Educação" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="relative text-[#8B4F23] font-medium text-base py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#8B4F23] after:transition-all after:duration-300 hover:after:w-full"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Botão Reservar Desktop */}
        <Link
          to="/reservar"
          className="hidden md:inline-flex items-center gap-2 bg-[#8B4F23] text-white font-semibold px-6 py-2.5 rounded-full text-sm shadow-sm hover:bg-[#A05D2B] hover:shadow-md transition-all duration-200 min-w-[150px] justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Reservar Agora
        </Link>

        {/* Botão hambúrguer mobile */}
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="lg:hidden p-2 rounded-lg text-[#8B4F23] hover:bg-[#8B4F23]/10 transition-colors"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
        >
          <div className="w-6 h-5 flex flex-col justify-between">
            <span className={`block h-0.5 bg-[#8B4F23] transition-all duration-300 origin-center ${menuAberto ? "rotate-45 translate-y-2.5" : ""}`} />
            <span className={`block h-0.5 bg-[#8B4F23] transition-all duration-300 ${menuAberto ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-0.5 bg-[#8B4F23] transition-all duration-300 origin-center ${menuAberto ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {/* Menu Mobile */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuAberto ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/98 backdrop-blur-md border-t border-[#8B4F23]/10 px-4 py-4 flex flex-col gap-1">
          {[
            { href: "#inicio", label: "Início" },
            { href: "#brunch", label: "Brunch" },
            { href: "#trilha", label: "Trilha" },
            { href: "#educacao", label: "Educação" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={fecharMenu}
              className="py-3 px-3 text-base font-medium text-[#8B4F23] rounded-lg hover:bg-[#8B4F23]/5 border-b border-[#8B4F23]/5 transition-colors"
            >
              {label}
            </a>
          ))}
          <Link
            to="/reservar"
            onClick={fecharMenu}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-[#8B4F23] text-white font-semibold px-6 py-3 rounded-full shadow-sm hover:bg-[#A05D2B] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Reservar Agora
          </Link>
        </div>
      </div>
    </header>
  );
}

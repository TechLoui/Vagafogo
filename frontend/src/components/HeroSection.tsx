import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroImg1 from "../assets/hero/hero-1.jpg";
import heroImg2 from "../assets/hero/hero-2.jpg";
import heroImg3 from "../assets/hero/hero-3.jpg";

const heroImages = [heroImg1, heroImg2, heroImg3];

export function HeroSection() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20 md:pt-0"
    >
      {/* Imagens com fade + zoom Ken Burns */}
      <div className="absolute inset-0">
        {heroImages.map((image, index) => {
          const ativo = index === activeImageIndex;
          return (
            <img
              key={image}
              src={image}
              alt=""
              aria-hidden="true"
              fetchPriority={index === 0 ? "high" : "low"}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
                ativo ? "opacity-100 hero-image-active" : "opacity-0"
              }`}
            />
          );
        })}
      </div>

      {/* Camadas de overlay para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(45,30,15,0.55)] via-[rgba(45,30,15,0.45)] to-[rgba(45,30,15,0.85)]" />

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto flex w-full max-w-screen-2xl flex-col items-center px-4 py-16 sm:px-6 md:py-0 lg:px-8">
        <div className="w-full max-w-4xl text-center lg:max-w-5xl">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.32em] text-[#E0B13C] mb-4 animate-fade-in">
            Pirenópolis · Goiás
          </span>
          <h1 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-2xl md:text-6xl lg:text-7xl animate-slide-up">
            Descubra o<br className="hidden sm:block" />
            <span className="text-[#E0B13C]">Santuário Vagafogo</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/90 drop-shadow md:text-lg lg:text-xl animate-slide-up" style={{ animationDelay: "120ms" }}>
            Uma experiência gastronômica única, aliada às maravilhas do cerrado brasileiro.
            Sabores que emocionam, natureza que encanta.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 animate-slide-up" style={{ animationDelay: "240ms" }}>
            <Link
              to="/reservar"
              className="group inline-flex items-center gap-2 rounded-full bg-[#8B4F23] px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-black/20 transition-all duration-300 hover:bg-[#A05D2B] hover:shadow-2xl hover:-translate-y-0.5 sm:text-base sm:px-8 sm:py-4"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Faça sua reserva
              <svg className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#brunch"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-[#2D1E0F] hover:border-white sm:text-base sm:px-8 sm:py-4"
            >
              Conheça o brunch
            </a>
          </div>
        </div>
      </div>

      {/* Indicadores das imagens */}
      <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:bottom-12">
        {heroImages.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Ir para imagem ${index + 1}`}
            onClick={() => setActiveImageIndex(index)}
            className={`h-1 rounded-full transition-all duration-500 ${
              index === activeImageIndex
                ? "w-10 bg-[#E0B13C]"
                : "w-5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <a
        href="#brunch"
        aria-label="Rolar para baixo"
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce text-white/70 hover:text-white md:flex md:bottom-3"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </a>
    </section>
  );
}

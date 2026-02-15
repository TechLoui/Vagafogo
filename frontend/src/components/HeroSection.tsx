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
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-20 md:pt-0"
    >
      <div className="absolute inset-0">
        {heroImages.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
              index === activeImageIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-[rgba(45,30,15,0.68)]" />
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative z-10 mx-auto flex w-full max-w-screen-2xl flex-col items-center px-4 py-16 sm:px-6 md:py-0 lg:px-8">
        <div className="w-full max-w-4xl text-center lg:max-w-5xl">
          <h1 className="mb-6 font-heading text-4xl font-bold leading-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
            Descubra o Santuário Vagafogo
          </h1>
          <p className="mb-8 text-lg text-white drop-shadow md:text-xl">
            Uma experiência gastronômica única, aliada às maravilhas do cerrado brasileiro.
            Sabores que emocionam com uma natureza que encanta.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/reservar"
              className="flex items-center rounded-full bg-yellow-600 px-8 py-4 text-lg font-semibold text-white shadow transition duration-300 hover:bg-yellow-700"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Faça sua reserva
            </Link>
            <a
              href="#brunch"
              className="flex items-center rounded-full border-2 border-white px-8 py-4 text-lg font-semibold text-white transition duration-300 hover:bg-white hover:text-yellow-700"
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
              </svg>
              Saiba mais
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

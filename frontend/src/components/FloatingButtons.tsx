import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export function FloatingButtons() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3 transition-all duration-500 ${
        visivel
          ? "visible opacity-100 translate-y-0"
          : "invisible opacity-0 translate-y-6 pointer-events-none"
      }`}
      aria-label="Ações rápidas"
      aria-hidden={!visivel}
    >
      {/* Reservar */}
      <Link
        to="/reservar"
        className="group flex items-center gap-3"
        aria-label="Fazer reserva"
      >
        <span className="pointer-events-none opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 bg-[#2D1E0F] text-white text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg">
          Fazer reserva
        </span>
        <div className="w-14 h-14 rounded-full bg-[#8B4F23] flex items-center justify-center shadow-xl shadow-[#8B4F23]/40 hover:scale-110 hover:bg-[#A05D2B] hover:shadow-[#8B4F23]/60 transition-all duration-200">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </Link>
    </div>
  );
}

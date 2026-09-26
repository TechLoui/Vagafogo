import { Link, useSearchParams } from "react-router-dom";
import logo from "../assets/logo.jpg";
import { BookingSection } from "../components/BookingSection";

export function Reserva() {
  const [searchParams] = useSearchParams();
  const experienceParam = searchParams.get("experiencia");
  const initialExperience =
    experienceParam === "brunch" || experienceParam === "trilha"
      ? experienceParam
      : undefined;
  const initialPackageId = searchParams.get("pacote")?.trim() || undefined;

  return (
    <div
      className="relative flex h-[100svh] min-h-[520px] flex-col overflow-clip bg-[#F7FAEF]"
      style={{ background: "linear-gradient(145deg, #F7FAEF 0%, #f3efe7 52%, #eef5e7 100%)" }}
    >
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#E0B13C]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#8B4F23]/10 blur-3xl" />

      <header className="relative z-20 shrink-0 border-b border-[#8B4F23]/10 bg-white/75 px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-5 sm:py-3">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="Voltar para a página inicial"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#8B4F23]/15 bg-white px-3 text-sm font-semibold text-[#8B4F23] shadow-sm transition hover:border-[#8B4F23]/30 hover:bg-[#8B4F23]/5 sm:min-w-[88px]"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Voltar</span>
          </Link>

          <div className="flex min-w-0 items-center justify-center gap-2.5 text-center sm:gap-3">
            <img
              src={logo}
              alt="Vagafogo"
              className="h-10 w-10 shrink-0 rounded-full border-2 border-[#8B4F23]/15 object-cover shadow-sm sm:h-12 sm:w-12"
              loading="eager"
            />
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B4F23]/65">Reserva online</p>
              <h1 className="truncate font-display text-base font-bold leading-tight text-[#2D1E0F] sm:text-xl">
                Sua experiência na Vagafogo
              </h1>
            </div>
          </div>

          <div className="h-10 w-10 shrink-0 sm:w-[88px]" aria-hidden="true" />
        </div>
      </header>

      <main id="conteudo-principal" tabIndex={-1} className="relative min-h-0 flex-1">
        <BookingSection
          initialExperience={initialExperience}
          initialPackageId={initialPackageId}
        />
      </main>

      <footer className="relative z-10 hidden shrink-0 border-t border-[#8B4F23]/10 bg-white/50 px-4 py-1.5 text-center xl:block">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Santuário Vagafogo · Pirenópolis, GO ·{" "}
          <a href="https://wa.me/5562992225471" target="_blank" rel="noopener noreferrer" className="text-[#8B4F23] hover:underline">
            (62) 99222-5471
          </a>
        </p>
      </footer>
    </div>
  );
}

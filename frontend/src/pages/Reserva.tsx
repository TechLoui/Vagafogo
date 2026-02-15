import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import { BookingSection } from "../components/BookingSection";

export function Reserva() {
  return (
    <div className="min-h-screen bg-[#F7FAEF]">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F7FAEF] via-white to-[#F7FAEF]" />
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8B4F23]/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Logo Vagafogo"
                className="h-12 w-12 rounded-full border border-white/60 object-cover shadow-sm"
                loading="lazy"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-green-700">
                  Reserva
                </p>
                <h1 className="text-xl font-bold text-[#8B4F23] sm:text-2xl">
                  Faça sua reserva
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-[#8B4F23]/20 bg-white/70 px-4 py-2 text-sm font-semibold text-[#8B4F23] shadow-sm backdrop-blur transition hover:bg-white"
              >
                Voltar ao site
              </Link>
            </div>
          </header>
        </div>
      </div>

      <BookingSection />
    </div>
  );
}


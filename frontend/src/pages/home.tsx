import Header from "../components/Header.tsx"
import { HeroSection } from "../components/HeroSection.tsx"
import { FeatureSection } from "../components/FeatureSection.tsx"
import { BrunchSection } from "../components/BrunchSection.tsx"
import { TrailSection } from "../components/TrailSection.tsx"
import { EducationSection } from "../components/EducationSection.tsx"
import { Footer } from "../components/Footer.tsx"
import { Link } from "react-router-dom"
export function Home() {
  return (
    <>
      <Header />
      <main className="mt-24 px-4">
        <HeroSection/>
        <FeatureSection/>
        < BrunchSection/>
        < TrailSection/>
        < EducationSection/>
        <section className="py-16">
          <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl rounded-3xl border border-[#8B4F23]/10 bg-[#F7FAEF] p-8 shadow-lg md:p-12">
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-green-700">
                    Reservas
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-[#8B4F23]">
                    Faça sua reserva em poucos passos
                  </h2>
                  <p className="mt-2 max-w-2xl text-base text-slate-700">
                    Escolha o pacote, selecione a data/horário e finalize o pagamento de forma
                    simples e segura.
                  </p>
                </div>

                <Link
                  to="/reservar"
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#8B4F23] px-8 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#A05D2B] md:w-auto"
                >
                  Reservar agora
                </Link>
              </div>
            </div>
          </div>
        </section>
        < Footer/>
      </main>
    </>
  )
}

import { Link } from "react-router-dom";
import { Footer } from "../components/Footer";
import Header from "../components/Header";
import { Seo } from "../components/Seo";

export function NotFound() {
  return (
    <>
      <Seo
        title="Página não encontrada | Santuário Vagafogo"
        description="A página que você procurou não existe. Conheça as experiências do Santuário Vagafogo em Pirenópolis."
        path="/404"
        noindex
      />

      <Header />

      <main id="conteudo-principal" tabIndex={-1} className="bg-[#F7FAEF]">
        <section className="relative flex min-h-[72vh] items-center overflow-hidden bg-gradient-to-br from-[#1a120a] via-[#2D1E0F] to-[#315137] px-4 pb-20 pt-36 text-white sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-[#E0B13C]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative mx-auto w-full max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-[#E0B13C]">
              Erro 404
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Essa trilha não leva a uma página
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              O endereço pode ter mudado ou sido digitado incorretamente. Você pode voltar ao início,
              conhecer nossas experiências ou seguir direto para a reserva.
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#2D1E0F] shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Voltar ao início
              </Link>
              <Link
                to="/reservar"
                className="inline-flex items-center justify-center rounded-full bg-[#8B4F23] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#A05D2B]"
              >
                Fazer uma reserva
              </Link>
            </div>

            <nav aria-label="Páginas recomendadas" className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-white/75">
              <Link to="/brunch" className="transition-colors hover:text-[#E0B13C]">
                Brunch Vagafogo
              </Link>
              <Link to="/trilha" className="transition-colors hover:text-[#E0B13C]">
                Trilha ecológica
              </Link>
              <Link to="/historia" className="transition-colors hover:text-[#E0B13C]">
                Nossa história
              </Link>
            </nav>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

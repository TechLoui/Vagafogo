import { Link } from "react-router-dom";
import {
  FaArrowDown,
  FaDove,
  FaInfoCircle,
  FaLeaf,
  FaShieldAlt,
  FaTree,
  FaWalking,
  FaWater,
} from "react-icons/fa";
import Header from "../components/Header";
import { FloatingButtons } from "../components/FloatingButtons";
import { FaqSection } from "../components/FaqSection";
import { Footer } from "../components/Footer";
import { Magnetic } from "../components/Magnetic";
import { PageBreadcrumbs } from "../components/PageBreadcrumbs";
import { Reveal } from "../components/Reveal";
import { Spotlight } from "../components/Spotlight";
import { useConfigSite } from "../hooks/useConfigSite";
import passarelaImg from "../assets/trilhaecologica/trilhaecologica-1.jpg";
import mataImg from "../assets/trilhaecologica/trilhaecologica-2.jpg";

const destaques = [
  {
    icon: FaShieldAlt,
    title: "Caminho protegido",
    description: "Madeiramento ao longo da trilha e corrimões nas áreas mais íngremes oferecem apoio ao visitante.",
  },
  {
    icon: FaLeaf,
    title: "Pausas na mata",
    description: "Espaços posicionados no percurso convidam ao descanso, à contemplação e à meditação.",
  },
  {
    icon: FaWater,
    title: "Encontro com a água",
    description: "O caminho pela mata leva a uma piscina natural e a uma pequena cachoeira.",
  },
  {
    icon: FaInfoCircle,
    title: "Interpretação ambiental",
    description: "Placas distribuídas pelo percurso apresentam informações sobre a flora e a fauna do Cerrado.",
  },
];

const perguntasFrequentes = [
  {
    question: "Qual é a extensão da Trilha Mãe da Floresta?",
    answer:
      "O percurso informado pelo Santuário Vagafogo tem 1.530 metros e atravessa a mata ciliar próxima ao Rio Vagafogo.",
  },
  {
    question: "O que encontro ao longo do percurso?",
    answer:
      "A trilha reúne mata preservada, trechos com madeiramento e corrimões, espaços de pausa, placas de interpretação ambiental, piscina natural e uma pequena cachoeira.",
  },
  {
    question: "Onde consulto horários e valores da trilha?",
    answer:
      "As datas, os horários, os valores e as condições disponíveis são apresentados no fluxo de reserva.",
  },
  {
    question: "A trilha atende a qualquer necessidade de mobilidade?",
    answer:
      "As condições individuais podem variar. Fale com a equipe antes da reserva para receber uma orientação adequada sobre o percurso.",
  },
  {
    question: "Posso combinar a trilha com o brunch?",
    answer:
      "O sistema permite selecionar mais de uma atividade. Consulte as combinações e os horários disponíveis para a data desejada.",
  },
];

export function Trilha() {
  const { config } = useConfigSite();

  return (
    <>
      <Header />
      <FloatingButtons />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="relative flex min-h-[82vh] items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={mataImg}
              width={750}
              height={422}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="h-full w-full object-cover hero-image-active"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-emerald-950/55 to-[#07150c]/95" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-screen-xl px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
            <PageBreadcrumbs
              items={[{ label: "Início", to: "/" }, { label: "Trilha ecológica" }]}
              className="mb-7 text-white"
            />
            <Reveal variant="up" once>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-300">
                <span className="h-px w-8 bg-emerald-300" />
                Natureza preservada em Pirenópolis
                <span className="h-px w-8 bg-emerald-300" />
              </span>
            </Reveal>

            <h1 className="mx-auto mt-5 max-w-5xl font-display text-5xl font-bold leading-[1.02] tracking-tight text-white drop-shadow-2xl md:text-7xl lg:text-8xl">
              Trilha <span className="text-emerald-300">Mãe da Floresta</span>
            </h1>

            <Reveal
              as="p"
              variant="up"
              delay={320}
              once
              className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/85 md:text-xl"
            >
              Uma caminhada de 1.530 metros pela mata ciliar primária preservada, acompanhando o Rio Vagafogo.
            </Reveal>

            <Reveal variant="up" delay={480} once className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic strength={0.2} className="w-full sm:w-auto">
                <Link
                  to="/reservar?experiencia=trilha"
                  className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-8 py-4 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:bg-emerald-800 hover:shadow-2xl sm:w-auto sm:text-base"
                >
                  <FaWalking className="h-4 w-4" />
                  Agendar a trilha
                </Link>
              </Magnetic>
              <a
                href="#percurso"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-emerald-950 sm:w-auto sm:text-base"
              >
                Conhecer o percurso
                <FaArrowDown className="h-3.5 w-3.5" />
              </a>
            </Reveal>
          </div>

          <a
            href="#percurso"
            aria-label="Ir para os detalhes da trilha"
            className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 text-white/60 transition-colors hover:text-white md:flex"
          >
            <FaArrowDown className="h-5 w-5 animate-bounce" />
          </a>
        </section>

        <section className="border-y border-emerald-900/10 bg-[#F1F7EE] py-12 md:py-16">
          <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-4 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
            {[
              { value: "1.530m", label: "de percurso" },
              { value: "182", label: "espécies de aves" },
              { value: "1", label: "piscina natural" },
              { value: "1", label: "pequena cachoeira" },
            ].map((item, index) => (
              <Reveal key={item.label} variant="scale" delay={index * 80} className="text-center">
                <div className="rounded-2xl border border-emerald-900/10 bg-white/80 px-3 py-5 shadow-sm">
                  <p className="font-display text-3xl font-bold text-emerald-800 md:text-4xl">{item.value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 md:text-xs">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="percurso" className="overflow-hidden bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-screen-xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
            <Reveal variant="left">
              <Spotlight color="rgba(52, 211, 153, 0.18)" className="rounded-[2rem]">
                <figure className="relative overflow-hidden rounded-[2rem] shadow-2xl">
                  <img
                    src={passarelaImg}
                    alt="Passarela de madeira da Trilha Mãe da Floresta no Santuário Vagafogo"
                    loading="lazy"
                    decoding="async"
                    className="h-[360px] w-full object-cover transition-transform duration-[1200ms] hover:scale-105 md:h-[520px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/75 via-transparent to-transparent" />
                  <figcaption className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-emerald-950/50 p-5 text-white backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Trilha Mãe da Floresta</p>
                    <p className="mt-1 font-display text-xl font-bold">Mata ciliar primária preservada</p>
                  </figcaption>
                </figure>
              </Spotlight>
            </Reveal>

            <div>
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-700">Um caminho pela mata</span>
              </Reveal>
              <Reveal
                as="h2"
                variant="up"
                delay={100}
                className="mt-3 font-display text-4xl font-bold leading-tight text-[#183122] md:text-5xl lg:text-6xl"
              >
                Acompanhando o Rio Vagafogo
              </Reveal>
              <Reveal as="p" variant="up" delay={200} className="mt-6 text-base leading-relaxed text-gray-600 md:text-lg">
                O percurso de 1.530 metros atravessa uma mata ciliar primária preservada e segue próximo ao Rio Vagafogo, criando uma experiência de observação e contato com a natureza.
              </Reveal>
              <Reveal as="p" variant="up" delay={280} className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
                O madeiramento protege áreas sensíveis do caminho. Nos trechos mais íngremes, corrimões oferecem apoio durante a passagem.
              </Reveal>

              <Reveal variant="scale" delay={360} className="mt-8">
                <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                    <FaTree className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-950">Conservação que faz parte do passeio</h3>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-900/75">
                      O percurso integra turismo ecológico, observação da natureza e interpretação ambiental.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-b from-[#F7FAEF] to-[#EDF5E9] py-20 md:py-28">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <Reveal variant="up">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-800">
                  <FaLeaf className="h-3 w-3" />
                  Ao longo do caminho
                </span>
              </Reveal>
              <Reveal as="h2" variant="up" delay={100} className="mt-4 font-display text-3xl font-bold text-[#183122] md:text-5xl">
                Estrutura para observar e sentir a floresta
              </Reveal>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {destaques.map(({ icon: Icon, title, description }, index) => (
                <Reveal key={title} variant="up" delay={100 + index * 90} className="h-full">
                  <Spotlight color="rgba(16, 185, 129, 0.14)" className="h-full rounded-3xl">
                    <article className="h-full rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 font-display text-xl font-bold text-[#183122]">{title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
                    </article>
                  </Spotlight>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#0d2515] via-[#12351e] to-[#07150c] py-20 text-white md:py-28">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#E0B13C]/10 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-5xl items-center gap-10 px-4 sm:px-6 md:grid-cols-[0.65fr_1.35fr] lg:px-8">
            <Reveal variant="scale" className="flex justify-center">
              <div className="flex h-52 w-52 flex-col items-center justify-center rounded-full border border-emerald-300/25 bg-white/[0.05] text-center shadow-2xl backdrop-blur-sm md:h-64 md:w-64">
                <FaDove className="h-8 w-8 text-emerald-300" />
                <p className="mt-3 font-display text-6xl font-bold text-white md:text-7xl">182</p>
                <p className="mt-1 max-w-[150px] text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">espécies de pássaros catalogadas</p>
              </div>
            </Reveal>

            <div>
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300">Fauna do Cerrado</span>
              </Reveal>
              <Reveal as="h2" variant="up" delay={100} className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">
                A floresta também se revela pelos sons
              </Reveal>
              <Reveal as="p" variant="up" delay={200} className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
                Com 182 espécies de pássaros catalogadas, a mata da Vagafogo oferece muitas oportunidades de observar a diversidade local durante o percurso.
              </Reveal>
              <Reveal as="p" variant="up" delay={280} className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                As placas sobre flora e fauna ajudam a contextualizar o ambiente e aproximam cada visitante da conservação do Cerrado.
              </Reveal>
            </div>
          </div>
        </section>

        <FaqSection
          items={perguntasFrequentes}
          eyebrow="Prepare sua visita"
          title="Dúvidas sobre a Trilha Mãe da Floresta"
          description="Confira o que já pode ser confirmado e consulte a equipe para necessidades específicas."
        />

        <section className="bg-[#F1F4E5] py-20 md:py-24">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <Reveal variant="scale">
              <div className="relative overflow-hidden rounded-[2rem] bg-white px-7 py-12 shadow-xl ring-1 ring-emerald-900/10 md:px-14 md:py-16 lg:px-20">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="relative flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">
                  <div className="max-w-2xl">
                    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700">Planeje sua visita</span>
                    <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-[#183122] md:text-5xl">
                      Caminhe pela Trilha Mãe da Floresta
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base">
                      Confira no fluxo de reserva as datas, horários, valores e condições disponíveis para a sua visita.
                    </p>
                    {config.textoFuncionamento && (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {config.textoFuncionamento}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
                    <Magnetic strength={0.2} className="w-full">
                      <Link
                        to="/reservar?experiencia=trilha"
                        className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-8 py-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-800"
                      >
                        Agendar a trilha
                        <span aria-hidden="true">→</span>
                      </Link>
                    </Magnetic>
                    <Link
                      to="/brunch"
                      className="inline-flex w-full items-center justify-center rounded-full border border-emerald-800/20 px-8 py-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-800/5"
                    >
                      Conhecer o brunch
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

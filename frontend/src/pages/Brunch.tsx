import { Link } from "react-router-dom";
import {
  FaArrowDown,
  FaCheese,
  FaGlassCheers,
  FaLeaf,
  FaSeedling,
  FaUtensils,
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
import heroImg from "../assets/brunch/brunch-3.webp";
import heroImgMobile from "../assets/brunch/brunch-3-800.webp";
import experienciaImg from "../assets/brunch/brunch-1.webp";
import frutaImg1 from "../assets/brunch/frutas/brunch-1.webp";
import frutaImg2 from "../assets/brunch/frutas/brunch-2.webp";
import harmonizacaoImg1 from "../assets/brunch/harmonizacoes/brunch-1.webp";
import harmonizacaoImg2 from "../assets/brunch/harmonizacoes/brunch-3.webp";
import laticinioImg1 from "../assets/brunch/laticinios/brunch-1.webp";
import laticinioImg2 from "../assets/brunch/laticinios/brunch-2.webp";

const pilares = [
  {
    icon: FaCheese,
    eyebrow: "Da fazenda",
    title: "Laticínios artesanais",
    description:
      "Queijos, iogurtes e manteigas feitos com o leite produzido na própria fazenda e técnicas artesanais.",
    image: laticinioImg1,
    alt: "Seleção de laticínios artesanais do Brunch Vagafogo",
  },
  {
    icon: FaSeedling,
    eyebrow: "Sabores locais",
    title: "Frutas do Cerrado",
    description:
      "Ingredientes como pequi, buriti e cagaita revelam a diversidade do Cerrado em preparos feitos no local.",
    image: frutaImg1,
    alt: "Pães, queijos e geleias de frutas do Cerrado servidos no Brunch Vagafogo",
  },
  {
    icon: FaGlassCheers,
    eyebrow: "Descobertas à mesa",
    title: "14 harmonizações",
    description:
      "Combinações criadas para aproximar laticínios, frutas e outros sabores produzidos ou preparados na fazenda.",
    image: harmonizacaoImg1,
    alt: "Harmonização gastronômica servida à mesa no Brunch Vagafogo",
  },
];

const galeria = [
  {
    src: frutaImg2,
    alt: "Detalhe de produtos e frutas servidos no Brunch Vagafogo",
    label: "Frutas do Cerrado",
  },
  {
    src: laticinioImg2,
    alt: "Laticínios artesanais apresentados no Brunch Vagafogo",
    label: "Produção artesanal",
  },
  {
    src: harmonizacaoImg2,
    alt: "Visitante experimentando uma harmonização do Brunch Vagafogo",
    label: "Harmonizações",
  },
];

const perguntasFrequentes = [
  {
    question: "Quantos itens fazem parte do Brunch Vagafogo?",
    answer:
      "A experiência reúne 45 itens, entre produtos da fazenda, laticínios artesanais, preparos locais e sabores do Cerrado.",
  },
  {
    question: "O que são as 14 harmonizações?",
    answer:
      "São combinações apresentadas durante a experiência para aproximar laticínios, frutas e outros sabores produzidos ou preparados na fazenda.",
  },
  {
    question: "Onde consulto horários e valores do brunch?",
    answer:
      "As datas, os horários, os valores e a disponibilidade vigentes aparecem no fluxo de reserva após a escolha da experiência.",
  },
  {
    question: "Posso reservar brunch e trilha para a mesma visita?",
    answer:
      "O fluxo de reserva permite selecionar mais de uma atividade. As combinações disponíveis dependem da agenda escolhida.",
  },
  {
    question: "Como informo uma restrição alimentar?",
    answer:
      "Antes de reservar, fale com a equipe pelo WhatsApp para confirmar ingredientes e verificar quais orientações podem ser oferecidas para a sua necessidade.",
  },
];

export function Brunch() {
  const { config } = useConfigSite();

  return (
    <>
      <Header />
      <FloatingButtons />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="relative flex min-h-[82vh] items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImg}
              srcSet={`${heroImgMobile} 800w, ${heroImg} 1440w`}
              sizes="100vw"
              width={1440}
              height={2161}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="h-full w-full object-cover hero-image-active"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-[#2D1E0F]/55 to-[#1a120a]/95" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-screen-xl px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
            <PageBreadcrumbs
              items={[{ label: "Início", to: "/" }, { label: "Brunch" }]}
              className="mb-7 text-white"
            />
            <Reveal variant="up" once>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-[#E0B13C]">
                <span className="h-px w-8 bg-[#E0B13C]" />
                Gastronomia em Pirenópolis
                <span className="h-px w-8 bg-[#E0B13C]" />
              </span>
            </Reveal>

            <h1 className="mx-auto mt-5 max-w-5xl font-display text-5xl font-bold leading-[1.02] tracking-tight text-white drop-shadow-2xl md:text-7xl lg:text-8xl">
              Brunch <span className="text-[#E0B13C]">Vagafogo</span>
            </h1>

            <Reveal
              as="p"
              variant="up"
              delay={320}
              once
              className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/85 md:text-xl"
            >
              Uma experiência com 45 itens que reúne a produção da fazenda, laticínios artesanais e sabores do Cerrado.
            </Reveal>

            <Reveal variant="up" delay={480} once className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic strength={0.2} className="w-full sm:w-auto">
                <Link
                  to="/reservar?experiencia=brunch"
                  className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8B4F23] px-8 py-4 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:bg-[#A05D2B] hover:shadow-2xl sm:w-auto sm:text-base"
                >
                  <FaUtensils className="h-4 w-4" />
                  Reservar o brunch
                </Link>
              </Magnetic>
              <a
                href="#sabores"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-[#2D1E0F] sm:w-auto sm:text-base"
              >
                Conhecer a experiência
                <FaArrowDown className="h-3.5 w-3.5" />
              </a>
            </Reveal>
          </div>

          <a
            href="#sabores"
            aria-label="Ir para os detalhes do brunch"
            className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 text-white/60 transition-colors hover:text-white md:flex"
          >
            <FaArrowDown className="h-5 w-5 animate-bounce" />
          </a>
        </section>

        <section id="sabores" className="overflow-hidden bg-[#F7FAEF] py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-screen-xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
            <Reveal variant="left" className="relative">
              <div className="relative overflow-hidden rounded-[2rem] shadow-2xl">
                <img
                  src={experienciaImg}
                  alt="Pessoa experimentando um item artesanal do Brunch Vagafogo"
                  loading="lazy"
                  decoding="async"
                  className="h-[460px] w-full object-cover md:h-[600px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-black/45 p-5 text-white backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#E0B13C]">À mesa</p>
                  <p className="mt-1 font-display text-2xl font-bold">Ingredientes que contam uma história</p>
                </div>
              </div>
              <div className="absolute -right-4 -top-4 -z-10 h-44 w-44 rounded-full bg-[#E0B13C]/20 blur-3xl" />
            </Reveal>

            <div>
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#8B4F23]">Uma experiência autoral</span>
              </Reveal>
              <Reveal
                as="h2"
                variant="up"
                delay={100}
                className="mt-3 font-display text-4xl font-bold leading-tight text-[#2D1E0F] md:text-5xl lg:text-6xl"
              >
                45 itens, muitos encontros de sabor
              </Reveal>
              <Reveal as="p" variant="up" delay={200} className="mt-6 text-base leading-relaxed text-gray-600 md:text-lg">
                O Brunch Vagafogo aproxima quem visita da produção da fazenda. Derivados do leite e frutas do Cerrado aparecem em preparos que valorizam ingredientes locais e o manejo sustentável.
              </Reveal>
              <Reveal as="p" variant="up" delay={280} className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
                As 14 harmonizações ajudam a descobrir novas combinações e fazem da refeição parte da própria experiência no santuário.
              </Reveal>

              <div className="mt-9 grid grid-cols-2 gap-4">
                <Reveal variant="scale" delay={340}>
                  <div className="rounded-2xl border border-[#8B4F23]/10 bg-white p-5 shadow-sm">
                    <p className="font-display text-4xl font-bold text-[#8B4F23]">45</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">itens no brunch</p>
                  </div>
                </Reveal>
                <Reveal variant="scale" delay={420}>
                  <div className="rounded-2xl border border-[#8B4F23]/10 bg-white p-5 shadow-sm">
                    <p className="font-display text-4xl font-bold text-[#8B4F23]">14</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">harmonizações</p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <Reveal variant="up">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#8B4F23]/15 bg-[#8B4F23]/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8B4F23]">
                  <FaLeaf className="h-3 w-3" />
                  Da terra para a mesa
                </span>
              </Reveal>
              <Reveal as="h2" variant="up" delay={100} className="mt-4 font-display text-3xl font-bold text-[#2D1E0F] md:text-5xl">
                Os sabores que formam a experiência
              </Reveal>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {pilares.map(({ icon: Icon, eyebrow, title, description, image, alt }, index) => (
                <Reveal key={title} variant="up" delay={100 + index * 100} className="h-full">
                  <Spotlight color="rgba(224, 177, 60, 0.18)" className="h-full rounded-3xl">
                    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#8B4F23]/10 bg-[#FAFCF5] shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl">
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={image}
                          alt={alt}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        <span className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                          {eyebrow}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E0B13C]/15 text-[#8B4F23]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-display text-2xl font-bold text-[#2D1E0F]">{title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
                      </div>
                    </article>
                  </Spotlight>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-gradient-to-b from-[#2D1E0F] to-[#1a120a] py-20 text-white md:py-28">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <Reveal variant="up">
                  <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#E0B13C]">Detalhes da experiência</span>
                </Reveal>
                <Reveal as="h2" variant="up" delay={100} className="mt-3 font-display text-3xl font-bold md:text-5xl">
                  Uma mesa para explorar com calma
                </Reveal>
              </div>
              <Reveal as="p" variant="up" delay={180} className="max-w-md text-sm leading-relaxed text-white/70 md:text-base">
                Cada imagem revela uma parte desse encontro entre a produção artesanal e a biodiversidade do Cerrado.
              </Reveal>
            </div>

            <div className="grid auto-rows-[240px] gap-4 md:grid-cols-3 md:auto-rows-[360px]">
              {galeria.map((item, index) => (
                <Reveal key={item.src} variant="scale" delay={120 + index * 100} className="h-full">
                  <figure className="group relative h-full overflow-hidden rounded-3xl border border-white/10">
                    <img
                      src={item.src}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <figcaption className="absolute bottom-4 left-4 text-sm font-semibold text-white">{item.label}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <FaqSection
          items={perguntasFrequentes}
          eyebrow="Antes de reservar"
          title="Dúvidas sobre o Brunch Vagafogo"
          description="Informações diretas para você escolher a experiência com mais segurança."
        />

        <section className="bg-[#F1F4E5] py-20 md:py-24">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <Reveal variant="scale">
              <div className="relative overflow-hidden rounded-[2rem] bg-white px-7 py-12 shadow-xl ring-1 ring-[#8B4F23]/10 md:px-14 md:py-16 lg:px-20">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#E0B13C]/20 blur-3xl" />
                <div className="relative flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">
                  <div className="max-w-2xl">
                    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8B4F23]">Planeje sua visita</span>
                    <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-[#2D1E0F] md:text-5xl">
                      Descubra o Brunch Vagafogo
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base">
                      Consulte as datas, horários, valores e opções disponíveis diretamente no fluxo de reserva.
                    </p>
                    {config.textoFuncionamento && (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#8B4F23]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E0B13C]" />
                        {config.textoFuncionamento}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
                    <Magnetic strength={0.2} className="w-full">
                      <Link
                        to="/reservar?experiencia=brunch"
                        className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8B4F23] px-8 py-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#A05D2B]"
                      >
                        Reservar o brunch
                        <span aria-hidden="true">→</span>
                      </Link>
                    </Magnetic>
                    <Link
                      to="/trilha"
                      className="inline-flex w-full items-center justify-center rounded-full border border-[#8B4F23]/20 px-8 py-4 text-sm font-semibold text-[#8B4F23] transition-colors hover:bg-[#8B4F23]/5"
                    >
                      Conhecer a trilha
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

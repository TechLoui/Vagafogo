import { Link } from "react-router-dom";
import {
  FaBookOpen,
  FaGlobeAmericas,
  FaLeaf,
  FaSchool,
  FaSeedling,
  FaUniversity,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import Header from "../components/Header";
import { FloatingButtons } from "../components/FloatingButtons";
import { Footer } from "../components/Footer";
import { Magnetic } from "../components/Magnetic";
import { PageBreadcrumbs } from "../components/PageBreadcrumbs";
import { Reveal } from "../components/Reveal";
import educacaoImg from "../assets/educacaoambiental/educacaoambiental-1.jpg";
import mataImg from "../assets/trilhaecologica/trilhaecologica-2.jpg";

const whatsappUrl = "https://wa.me/5562992225471";

const publicos = [
  {
    icon: FaSchool,
    title: "Escolas",
    description: "Uma proposta de contato com a natureza para grupos escolares, sempre mediante agendamento.",
  },
  {
    icon: FaUniversity,
    title: "Universidades",
    description: "Atividades para grupos universitários interessados em ambiente, conservação e sustentabilidade.",
  },
  {
    icon: FaUsers,
    title: "Outros grupos",
    description: "Grupos específicos também podem consultar a equipe sobre disponibilidade e condições de atendimento.",
  },
];

const temas = [
  {
    icon: FaLeaf,
    title: "Flora e fauna do Cerrado",
    description: "A interpretação ambiental aproxima o grupo dos elementos naturais observados durante a atividade.",
  },
  {
    icon: FaGlobeAmericas,
    title: "Recursos naturais",
    description: "O percurso abre espaço para conversar sobre natureza, recursos e responsabilidade ambiental.",
  },
  {
    icon: FaSeedling,
    title: "Sustentabilidade",
    description: "A experiência apresenta relações de interdependência entre as pessoas e o ambiente.",
  },
  {
    icon: FaUserTie,
    title: "Atividade com monitoria",
    description: "A programação de educação ambiental é realizada nas trilhas com acompanhamento de monitor.",
  },
];

const perguntasFrequentes = [
  {
    question: "Para quais grupos a atividade é indicada?",
    answer:
      "A proposta atende escolas, universidades e grupos específicos. A equipe confirma a disponibilidade para cada solicitação.",
  },
  {
    question: "A atividade possui monitoria?",
    answer:
      "Sim. A programação de educação ambiental descrita pela Vagafogo é realizada nas trilhas com monitoria.",
  },
  {
    question: "Quais temas podem ser trabalhados?",
    answer:
      "A experiência aborda flora, fauna, recursos naturais, sustentabilidade e a relação de interdependência entre o ser humano e a natureza.",
  },
  {
    question: "É necessário agendar?",
    answer:
      "Sim. O agendamento prévio é necessário para escolas, universidades e grupos. O primeiro passo é consultar a equipe pelo WhatsApp.",
  },
  {
    question: "Onde consulto valores, datas e condições?",
    answer:
      "Essas informações são confirmadas pela equipe durante o atendimento do grupo. Para as experiências regulares, consulte também o fluxo de reserva.",
  },
  {
    question: "Qual é a duração e quantas pessoas podem participar?",
    answer:
      "A duração e o formato dependem do perfil e do tamanho do grupo. Informe esses dados no contato para receber uma orientação adequada.",
  },
];

export function EducacaoAmbiental() {
  return (
    <>
      <Header />
      <FloatingButtons />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="relative flex min-h-[76vh] items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={educacaoImg}
              width={750}
              height={422}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="h-full w-full object-cover hero-image-active"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-emerald-950/65 to-[#07150c]/95" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-screen-xl px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
            <PageBreadcrumbs
              items={[{ label: "Início", to: "/" }, { label: "Educação ambiental" }]}
              className="mb-7 text-white"
            />
            <Reveal variant="up" once>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300">
                <span className="h-px w-8 bg-emerald-300" />
                Aprendizado em contato com a natureza
                <span className="h-px w-8 bg-emerald-300" />
              </span>
            </Reveal>

            <h1 className="mx-auto mt-5 max-w-5xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-7xl">
              Educação ambiental no Santuário Vagafogo
            </h1>

            <Reveal
              as="p"
              variant="up"
              delay={280}
              once
              className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-white/85 md:text-xl"
            >
              Atividades nas trilhas com monitoria para escolas, universidades e grupos, abordando fauna, flora, recursos naturais e sustentabilidade.
            </Reveal>

            <Reveal
              variant="up"
              delay={420}
              once
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Magnetic strength={0.2} className="w-full sm:w-auto">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-sm font-semibold text-white shadow-xl transition-colors hover:bg-[#1ebe5d] sm:w-auto sm:text-base"
                >
                  <FaWhatsapp className="h-4 w-4" />
                  Consultar agendamento
                </a>
              </Magnetic>
              <a
                href="#como-funciona"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-emerald-950 sm:w-auto sm:text-base"
              >
                Conhecer a proposta
                <span aria-hidden="true">↓</span>
              </a>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-emerald-900/10 bg-[#F1F7EE] py-14 md:py-16">
          <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {publicos.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} variant="up" delay={index * 90} className="h-full">
                <article className="h-full rounded-3xl border border-emerald-900/10 bg-white p-6 text-center shadow-sm">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-bold text-[#183122]">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="overflow-hidden bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-screen-xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
            <Reveal variant="left">
              <figure className="relative overflow-hidden rounded-[2rem] shadow-2xl">
                <img
                  src={educacaoImg}
                  alt="Grupo participando de atividade de educação ambiental na Vagafogo"
                  loading="lazy"
                  decoding="async"
                  className="h-[380px] w-full object-cover md:h-[540px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/75 via-transparent to-transparent" />
                <figcaption className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-emerald-950/50 p-5 text-white backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Atividade agendada</p>
                  <p className="mt-1 font-display text-xl font-bold">Interpretação ambiental realizada nas trilhas</p>
                </figcaption>
              </figure>
            </Reveal>

            <div>
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700">A proposta educativa</span>
              </Reveal>
              <Reveal
                as="h2"
                variant="up"
                delay={100}
                className="mt-3 font-display text-4xl font-bold leading-tight text-[#183122] md:text-5xl"
              >
                Aprender observando as relações da natureza
              </Reveal>
              <Reveal as="p" variant="up" delay={190} className="mt-6 text-base leading-relaxed text-gray-600 md:text-lg">
                A atividade apresenta a relação de interdependência entre o ser humano e a natureza, aproximando o grupo da proteção e da preservação ambiental.
              </Reveal>
              <Reveal as="p" variant="up" delay={270} className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
                O trabalho é realizado nas trilhas com monitoria e pode abordar flora, fauna, recursos naturais e sustentabilidade.
              </Reveal>

              <Reveal variant="scale" delay={350} className="mt-8">
                <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <FaBookOpen className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-amber-950">Agendamento prévio necessário</h3>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
                      A equipe confirma datas, valores e condições de acordo com a solicitação do grupo.
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
                  <FaSeedling className="h-3 w-3" />
                  Temas da experiência
                </span>
              </Reveal>
              <Reveal as="h2" variant="up" delay={100} className="mt-4 font-display text-3xl font-bold text-[#183122] md:text-5xl">
                Interpretação ambiental no Cerrado
              </Reveal>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {temas.map(({ icon: Icon, title, description }, index) => (
                <Reveal key={title} variant="up" delay={100 + index * 80} className="h-full">
                  <article className="h-full rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-bold text-[#183122]">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#0d2515] via-[#12351e] to-[#07150c] py-20 text-white md:py-28">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div>
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300">O ambiente da atividade</span>
              </Reveal>
              <Reveal as="h2" variant="up" delay={100} className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">
                A trilha também é um espaço de aprendizado
              </Reveal>
              <Reveal as="p" variant="up" delay={200} className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
                A monitoria acontece em contato com a mata e com os elementos naturais observados no percurso da Vagafogo.
              </Reveal>
              <Reveal variant="up" delay={280} className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/trilha"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Conhecer a Trilha Mãe da Floresta
                </Link>
                <Link
                  to="/historia"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-emerald-950"
                >
                  Conhecer a história da Vagafogo
                </Link>
              </Reveal>
            </div>

            <Reveal variant="right">
              <img
                src={mataImg}
                alt="Mata e curso d'água no Santuário Vagafogo"
                loading="lazy"
                decoding="async"
                className="h-[340px] w-full rounded-[2rem] object-cover shadow-2xl ring-1 ring-white/10 md:h-[430px]"
              />
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="faq-educacao-ambiental" className="bg-white py-20 md:py-28">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-700">Dúvidas frequentes</span>
              </Reveal>
              <Reveal
                as="h2"
                variant="up"
                delay={100}
                className="mt-3 font-display text-3xl font-bold text-[#183122] md:text-5xl"
              >
                <span id="faq-educacao-ambiental">Educação ambiental para grupos</span>
              </Reveal>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {perguntasFrequentes.map((item, index) => (
                <Reveal key={item.question} variant="up" delay={80 + index * 50} className="h-full">
                  <article className="h-full rounded-2xl border border-emerald-900/10 bg-[#F7FAEF] p-6">
                    <h3 className="font-display text-xl font-bold text-[#183122]">{item.question}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.answer}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F1F4E5] py-20 md:py-24">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <Reveal variant="scale">
              <div className="relative overflow-hidden rounded-[2rem] bg-white px-7 py-12 text-center shadow-xl ring-1 ring-emerald-900/10 md:px-14 md:py-16">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="relative mx-auto max-w-3xl">
                  <FaUserTie className="mx-auto h-7 w-7 text-emerald-700" />
                  <h2 className="mt-4 font-display text-3xl font-bold text-[#183122] md:text-5xl">Organize a atividade do seu grupo</h2>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
                    Informe à equipe o perfil do grupo e a data de interesse para consultar disponibilidade, valores e condições.
                  </p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Magnetic strength={0.2} className="w-full sm:w-auto">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#1ebe5d] sm:w-auto"
                      >
                        <FaWhatsapp className="h-4 w-4" />
                        Agendar pelo WhatsApp
                      </a>
                    </Magnetic>
                    <Link
                      to="/planeje-sua-visita"
                      className="inline-flex w-full items-center justify-center rounded-full border border-emerald-800/20 px-8 py-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-800/5 sm:w-auto"
                    >
                      Ver informações da visita
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

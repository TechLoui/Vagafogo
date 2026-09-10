import { Link } from "react-router-dom";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRoute,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import Header from "../components/Header";
import { FloatingButtons } from "../components/FloatingButtons";
import { Footer } from "../components/Footer";
import { Magnetic } from "../components/Magnetic";
import { PageBreadcrumbs } from "../components/PageBreadcrumbs";
import { Reveal } from "../components/Reveal";
import heroImg from "../assets/Carrossel-1.webp";
import heroImgMobile from "../assets/Carrossel-1-800.webp";
import trilhaImg from "../assets/trilhaecologica/trilhaecologica-1.jpg";

const whatsappUrl = "https://wa.me/5562992225471";
const mapsUrl =
  "https://www.google.com/maps/search/?api=1&query=R.%20do%20Frota%2C%20S%2FN%2C%20Alto%20do%20Carmo%2C%20Piren%C3%B3polis%20GO%2C%2072980-000";

const etapas = [
  {
    icon: FaRoute,
    title: "Conheça as experiências",
    description:
      "Veja os detalhes do Brunch Vagafogo e da Trilha Mãe da Floresta antes de escolher.",
  },
  {
    icon: FaCalendarAlt,
    title: "Consulte a agenda",
    description:
      "Datas, horários, valores e opções disponíveis são apresentados no fluxo de reserva.",
  },
  {
    icon: FaCheckCircle,
    title: "Monte a sua visita",
    description:
      "Selecione uma ou mais atividades e confira todas as informações antes de finalizar.",
  },
];

const perguntasFrequentes = [
  {
    question: "Onde fica o Santuário Vagafogo?",
    answer:
      "O endereço é R. do Frota, S/N, Alto do Carmo, Pirenópolis-GO, CEP 72980-000.",
  },
  {
    question: "Quais são os dias e horários de visitação?",
    answer:
      "A agenda pode mudar conforme a data e a atividade. Consulte o fluxo de reserva para ver os horários disponíveis no momento da sua visita.",
  },
  {
    question: "Onde encontro os preços atualizados?",
    answer:
      "Os valores vigentes aparecem durante a reserva, depois que você escolhe a atividade e informa os participantes.",
  },
  {
    question: "Posso escolher brunch e trilha na mesma reserva?",
    answer:
      "Sim. O sistema permite selecionar mais de uma atividade. As opções e condições disponíveis são mostradas no próprio fluxo de reserva.",
  },
  {
    question: "Como agendo uma atividade de educação ambiental?",
    answer:
      "As atividades para escolas, universidades e grupos precisam de agendamento prévio. Fale com a equipe pelo WhatsApp para consultar disponibilidade e condições.",
  },
  {
    question: "Como confirmo uma necessidade específica antes da visita?",
    answer:
      "Entre em contato pelo WhatsApp antes de reservar. A equipe poderá orientar sobre a atividade escolhida sem que você precise se basear em informações genéricas.",
  },
];

export function PlanejeVisita() {
  return (
    <>
      <Header />
      <FloatingButtons />

      <main id="conteudo-principal" tabIndex={-1}>
        <section className="relative flex min-h-[74vh] items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={heroImg}
              srcSet={`${heroImgMobile} 800w, ${heroImg} 1440w`}
              sizes="100vw"
              width={1440}
              height={1166}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              className="h-full w-full object-cover hero-image-active"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#2D1E0F]/65 to-[#1a120a]/95" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-screen-xl px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
            <PageBreadcrumbs
              items={[{ label: "Início", to: "/" }, { label: "Planeje sua visita" }]}
              className="mb-7 text-white"
            />
            <Reveal variant="up" once>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#E0B13C]">
                <span className="h-px w-8 bg-[#E0B13C]" />
                Informações para sua viagem
                <span className="h-px w-8 bg-[#E0B13C]" />
              </span>
            </Reveal>

            <h1 className="mx-auto mt-5 max-w-5xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-7xl">
              Planeje sua visita ao Santuário Vagafogo em Pirenópolis
            </h1>

            <Reveal
              as="p"
              variant="up"
              delay={280}
              once
              className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-white/85 md:text-xl"
            >
              Encontre o endereço, os canais de contato e o caminho mais seguro para consultar agenda, valores e experiências disponíveis.
            </Reveal>

            <Reveal
              variant="up"
              delay={420}
              once
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Magnetic strength={0.2} className="w-full sm:w-auto">
                <Link
                  to="/reservar"
                  className="btn-glow inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8B4F23] px-8 py-4 text-sm font-semibold text-white shadow-xl transition-colors hover:bg-[#A05D2B] sm:w-auto sm:text-base"
                >
                  <FaCalendarAlt className="h-4 w-4" />
                  Ver datas e valores
                </Link>
              </Magnetic>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-[#2D1E0F] sm:w-auto sm:text-base"
              >
                <FaMapMarkerAlt className="h-4 w-4" />
                Abrir localização
              </a>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-[#8B4F23]/10 bg-[#F7FAEF] py-14 md:py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            <Reveal variant="up" className="h-full">
              <article className="flex h-full items-start gap-4 rounded-3xl border border-[#8B4F23]/10 bg-white p-6 shadow-sm">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#8B4F23]/10 text-[#8B4F23]">
                  <FaMapMarkerAlt className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#2D1E0F]">Endereço</h2>
                  <address className="mt-2 text-sm not-italic leading-relaxed text-gray-600">
                    R. do Frota, S/N, Alto do Carmo<br />
                    Pirenópolis-GO · 72980-000
                  </address>
                </div>
              </article>
            </Reveal>

            <Reveal variant="up" delay={100} className="h-full">
              <article className="flex h-full items-start gap-4 rounded-3xl border border-[#8B4F23]/10 bg-white p-6 shadow-sm">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <FaWhatsapp className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#2D1E0F]">Contato</h2>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#8B4F23] hover:underline"
                  >
                    <FaPhoneAlt className="h-3.5 w-3.5" />
                    (62) 99222-5471
                  </a>
                  <p className="mt-1 text-sm text-gray-600">Atendimento pelo WhatsApp.</p>
                </div>
              </article>
            </Reveal>

            <Reveal variant="up" delay={200} className="h-full">
              <article className="flex h-full items-start gap-4 rounded-3xl border border-[#8B4F23]/10 bg-white p-6 shadow-sm">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#E0B13C]/20 text-[#8B4F23]">
                  <FaClock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-[#2D1E0F]">Agenda atualizada</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    Consulte datas, horários e valores diretamente na reserva.
                  </p>
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        <section className="overflow-hidden bg-white py-20 md:py-28">
          <div className="mx-auto grid w-full max-w-screen-xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
            <Reveal variant="left">
              <figure className="relative overflow-hidden rounded-[2rem] shadow-2xl">
                <img
                  src={trilhaImg}
                  alt="Passarela de madeira entre a vegetação da Vagafogo"
                  loading="lazy"
                  decoding="async"
                  className="h-[380px] w-full object-cover md:h-[540px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <figcaption className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-black/45 p-5 text-white backdrop-blur-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E0B13C]">Organize com antecedência</p>
                  <p className="mt-1 font-display text-xl font-bold">Escolha as experiências que combinam com sua visita</p>
                </figcaption>
              </figure>
            </Reveal>

            <div>
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8B4F23]">Como planejar</span>
              </Reveal>
              <Reveal
                as="h2"
                variant="up"
                delay={100}
                className="mt-3 font-display text-4xl font-bold leading-tight text-[#2D1E0F] md:text-5xl"
              >
                Da escolha da experiência à confirmação
              </Reveal>
              <Reveal as="p" variant="up" delay={180} className="mt-5 text-base leading-relaxed text-gray-600 md:text-lg">
                A reserva reúne as informações que mudam com o calendário. Assim, você confere a disponibilidade real antes de organizar o passeio.
              </Reveal>

              <div className="mt-8 space-y-4">
                {etapas.map(({ icon: Icon, title, description }, index) => (
                  <Reveal key={title} variant="up" delay={240 + index * 80}>
                    <article className="flex items-start gap-4 rounded-2xl border border-[#8B4F23]/10 bg-[#FAFCF5] p-5">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#8B4F23] text-white shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-[#2D1E0F]">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-b from-[#F7FAEF] to-[#F1F4E5] py-20 md:py-28">
          <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8B4F23]">Escolha sua experiência</span>
              </Reveal>
              <Reveal as="h2" variant="up" delay={100} className="mt-3 font-display text-3xl font-bold text-[#2D1E0F] md:text-5xl">
                Natureza, gastronomia e aprendizado
              </Reveal>
              <Reveal as="p" variant="up" delay={180} className="mx-auto mt-4 max-w-2xl text-gray-600">
                Conheça cada proposta antes de consultar a agenda. Se quiser, selecione mais de uma atividade na mesma reserva.
              </Reveal>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  eyebrow: "Gastronomia",
                  title: "Brunch Vagafogo",
                  description: "Produtos da fazenda, laticínios artesanais e sabores do Cerrado.",
                  href: "/brunch",
                  label: "Conhecer o brunch",
                },
                {
                  eyebrow: "Natureza",
                  title: "Trilha Mãe da Floresta",
                  description: "Um percurso de 1.530 metros pela mata ciliar preservada.",
                  href: "/trilha",
                  label: "Conhecer a trilha",
                },
                {
                  eyebrow: "Grupos",
                  title: "Educação ambiental",
                  description: "Atividades com monitoria para escolas, universidades e grupos.",
                  href: "/educacao-ambiental",
                  label: "Ver educação ambiental",
                },
              ].map((item, index) => (
                <Reveal key={item.title} variant="up" delay={100 + index * 90} className="h-full">
                  <article className="flex h-full flex-col rounded-3xl border border-[#8B4F23]/10 bg-white p-7 shadow-sm transition-shadow hover:shadow-xl">
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4F23]">{item.eyebrow}</span>
                    <h3 className="mt-3 font-display text-2xl font-bold text-[#2D1E0F]">{item.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">{item.description}</p>
                    <Link to={item.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8B4F23] hover:underline">
                      {item.label}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-planeje-visita" className="bg-white py-20 md:py-28">
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <Reveal variant="up">
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#8B4F23]">Dúvidas frequentes</span>
              </Reveal>
              <Reveal
                as="h2"
                variant="up"
                delay={100}
                className="mt-3 font-display text-3xl font-bold text-[#2D1E0F] md:text-5xl"
              >
                <span id="faq-planeje-visita">Informações para planejar sua visita</span>
              </Reveal>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {perguntasFrequentes.map((item, index) => (
                <Reveal key={item.question} variant="up" delay={80 + index * 50} className="h-full">
                  <article className="h-full rounded-2xl border border-[#8B4F23]/10 bg-[#FAFCF5] p-6">
                    <h3 className="font-display text-xl font-bold text-[#2D1E0F]">{item.question}</h3>
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
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2D1E0F] via-[#3a2715] to-[#1a120a] px-7 py-12 text-center text-white shadow-2xl md:px-14 md:py-16">
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#E0B13C]/15 blur-3xl" />
                <div className="relative mx-auto max-w-3xl">
                  <FaUsers className="mx-auto h-7 w-7 text-[#E0B13C]" />
                  <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">Pronto para organizar sua visita?</h2>
                  <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                    Consulte as opções disponíveis na reserva ou fale com a equipe quando precisar de uma orientação específica.
                  </p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <Magnetic strength={0.2} className="w-full sm:w-auto">
                      <Link
                        to="/reservar"
                        className="btn-glow inline-flex w-full items-center justify-center rounded-full bg-[#8B4F23] px-8 py-4 text-sm font-semibold text-white shadow-xl transition-colors hover:bg-[#A05D2B] sm:w-auto"
                      >
                        Fazer reserva
                      </Link>
                    </Magnetic>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#2D1E0F] sm:w-auto"
                    >
                      <FaWhatsapp className="h-4 w-4" />
                      Falar no WhatsApp
                    </a>
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

import educationImg from '../assets/educacaoambiental/educacaoambiental-1.jpg'
import { Link } from "react-router-dom"
import { Reveal } from "./Reveal"
import { Magnetic } from "./Magnetic"
import { FaSchool, FaSeedling, FaGlobeAmericas, FaUserTie } from "react-icons/fa"

const featuresList = [
  { icon: FaSchool, text: "Para escolas, faculdades e grupos específicos" },
  { icon: FaSeedling, text: "Interpretação sobre fauna e flora do cerrado" },
  { icon: FaGlobeAmericas, text: "Importância da proteção ambiental local e global" },
  { icon: FaUserTie, text: "Atividade principal realizada nas trilhas com monitor" },
];

export function EducationSection() {
  return (
    <section id="educacao" className="py-20 md:py-28 bg-gradient-to-b from-white to-[#FAFCF5] cv-auto">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <Reveal variant="up">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full mb-4 border border-emerald-200">
              Aprendizado e Integração
            </span>
          </Reveal>
          <Reveal variant="up" delay={120} as="h2" className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-[#2D1E0F] leading-[1.1] tracking-tight mb-5">
            Educação <span className="text-emerald-700">Ambiental</span>
          </Reveal>
          <Reveal variant="up" delay={240} as="p" className="max-w-3xl mx-auto text-gray-600 text-base md:text-lg leading-relaxed">
            Demonstramos a relação de interdependência do ser humano com a natureza, promovendo proteção e preservação ambiental.
          </Reveal>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-6xl mx-auto">
          <Reveal variant="left" delay={100} className="lg:w-1/2 w-full flex-shrink-0">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <img
                src={educationImg}
                alt="Educação ambiental no Santuário Vagafogo"
                loading="lazy"
                decoding="async"
                className="w-full h-72 lg:h-[440px] object-cover transition-transform duration-[1500ms] group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-xl border border-white/40">
                <p className="text-[10px] font-bold text-[#8B4F23] uppercase tracking-[0.2em]">Atividade guiada</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">Trilhas com monitores ambientais</p>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={200} className="lg:w-1/2">
            <h3 className="text-2xl lg:text-3xl font-bold text-[#2D1E0F] mb-4 leading-tight">
              Projeto para Escolas e Grupos
            </h3>
            <p className="mb-6 text-gray-600 text-base leading-relaxed">
              Atividade realizada nas trilhas com interpretação ambiental sobre flora, fauna, recursos naturais e sustentabilidade. Ideal para grupos escolares, universitários e corporativos.
            </p>

            <ul className="space-y-3 mb-8">
              {featuresList.map(({ icon: Icon, text }, i) => (
                <Reveal key={i} variant="left" delay={300 + i * 80} as="li" className="flex items-center gap-3.5 group cursor-default">
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200 group-hover:border-emerald-400 group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="w-4 h-4 text-emerald-700 transition-transform duration-300 group-hover:scale-110" />
                  </span>
                  <span className="text-gray-600 text-sm leading-relaxed transition-colors duration-300 group-hover:text-gray-900">{text}</span>
                </Reveal>
              ))}
            </ul>

            <Reveal variant="scale" delay={700} className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200/80 rounded-2xl p-4 mb-6 flex items-start gap-3 block">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-900 text-sm leading-relaxed">
                <strong>Agendamento prévio obrigatório.</strong> Entre em contato via WhatsApp para verificar disponibilidade e condições especiais para grupos.
              </p>
            </Reveal>

            <Reveal variant="up" delay={850} className="flex flex-col items-start gap-3 sm:flex-row">
              <Magnetic strength={0.2}>
                <Link
                  to="/educacao-ambiental"
                  className="group inline-flex items-center gap-2.5 bg-emerald-700 text-white font-semibold px-8 py-4 rounded-full shadow-lg shadow-emerald-500/20 hover:bg-emerald-800 text-base transition-all duration-300 hover:shadow-xl"
                >
                  Conhecer o projeto
                  <span aria-hidden="true">→</span>
                </Link>
              </Magnetic>
              <a
                href="https://wa.me/5562992225471"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-7 py-4 text-sm font-semibold text-emerald-800 hover:underline"
              >
                Agendar pelo WhatsApp
              </a>
            </Reveal>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

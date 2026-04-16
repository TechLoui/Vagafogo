import HeroImg from '../assets/trilhaecologica/trilhaecologica-1.jpg'
import Trilha from '../assets/trilhaecologica/trilhaecologica-2.jpg'
import { Link } from "react-router-dom"

const features = [
  "Espaços estratégicos para descanso e meditação",
  "Corrimões para segurança em áreas mais íngremes",
  "Piscina natural e uma pequena cachoeira",
  "Placas informativas sobre flora e fauna do cerrado",
  "182 espécies de pássaros catalogadas",
];

export function TrailSection() {
  return (
    <section
      id="trilha"
      className="py-16 md:py-24 relative overflow-hidden"
      style={{
        background: `linear-gradient(rgba(20,40,20,0.85), rgba(20,40,20,0.85)), url(${HeroImg})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-green-400 bg-green-400/15 px-3 py-1 rounded-full mb-3">
            Conexão com a Natureza
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-2 leading-tight">
            Trilha Ecológica
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-6xl mx-auto">

          {/* Imagem */}
          <div className="lg:w-1/2 w-full flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={Trilha}
                alt="Trilha Mãe da Floresta - Santuário Vagafogo"
                className="w-full h-72 lg:h-96 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Badge */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                  <h3 className="font-bold text-white text-base">Trilha Mãe da Floresta</h3>
                  <p className="text-green-300 text-xs mt-0.5">Mata ciliar primária preservada · 1.530m</p>
                </div>
              </div>
            </div>
          </div>

          {/* Texto */}
          <div className="lg:w-1/2 text-white">
            <h3 className="text-2xl font-bold mb-3 leading-snug">Caminhada Imersiva de 1.530m</h3>
            <p className="mb-6 text-gray-300 leading-relaxed">
              Nossa trilha ecológica atravessa uma belíssima mata ciliar primária preservada, margeando o Rio Vagafogo. A trilha é completamente protegida por madeiramento, oferecendo conforto e segurança ao visitante.
            </p>

            <ul className="space-y-3 mb-8">
              {features.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-gray-200 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/reservar"
                className="inline-flex items-center gap-2 bg-white text-[#2D1E0F] font-bold px-7 py-3.5 rounded-full shadow-lg hover:bg-gray-100 text-sm transition-all duration-200 hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Agendar Trilha
              </Link>
              <a
                href="#educacao"
                className="inline-flex items-center gap-2 border border-white/30 text-white font-medium px-7 py-3.5 rounded-full hover:bg-white/10 text-sm transition-all duration-200"
              >
                Educação Ambiental
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

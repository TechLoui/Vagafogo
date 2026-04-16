import BrunchImg from '../assets/hero/hero-2.jpg'
import laticImg1 from '../assets/brunch/laticinios/brunch-1.jpg'
import laticImg2 from '../assets/brunch/laticinios/brunch-2.jpg'
import laticImg3 from '../assets/brunch/laticinios/brunch-3.jpg'
import { Link } from "react-router-dom"

const cards = [
  {
    img: laticImg1,
    title: "Laticínios Artesanais",
    description: "Queijos, iogurtes e manteigas produzidos na própria fazenda com leite fresco e técnicas artesanais tradicionais.",
  },
  {
    img: laticImg2,
    title: "Frutas do Cerrado",
    description: "Pequi, buriti, cagaita e mais, colhidos em manejo sustentável. O sabor autêntico do cerrado goiano na sua mesa.",
  },
  {
    img: laticImg3,
    title: "Harmonizações Exclusivas",
    description: "14 combinações únicas criadas pelo nosso chef, que exaltam os sabores locais em experiências gastronômicas memoráveis.",
  },
];

export function BrunchSection() {
  return (
    <section
      id="brunch"
      className="py-16 md:py-24 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(45, 30, 15, 0.82), rgba(45, 30, 15, 0.82)), url(${BrunchImg})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#E0B13C] bg-[#E0B13C]/15 px-3 py-1 rounded-full mb-3">
            Descubra a Gastronomia
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mt-2 mb-4 drop-shadow-lg leading-tight">
            Brunch Vagafogo
          </h2>
          <p className="text-gray-200 text-base md:text-lg leading-relaxed">
            Um maravilhoso festival gastronômico com <strong className="text-[#E0B13C]">45 itens</strong> e derivados do leite produzido na fazenda, além de frutas do cerrado cultivadas no local em manejo sustentável.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="group bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Imagem */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Texto */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-white mb-2">{card.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Botão CTA */}
        <div className="text-center mt-12">
          <Link
            to="/reservar"
            className="inline-flex items-center gap-2.5 bg-[#8B4F23] text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-[#A05D2B] text-base transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Reservar Experiência Gastronômica
          </Link>
          <p className="text-gray-400 text-sm mt-3">
            Sábados e Domingos · 9h às 14h · Vagas limitadas
          </p>
        </div>
      </div>
    </section>
  );
}

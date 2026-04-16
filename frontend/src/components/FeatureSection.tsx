import { Link } from "react-router-dom";

const features = [
  {
    icon: (
      <svg className="w-7 h-7 text-[#8B4F23]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    tag: "Gastronomia",
    title: "Brunch Gastronômico",
    description:
      "45 itens e 14 harmonizações exclusivas com laticínios artesanais produzidos na fazenda e frutas do cerrado em manejo sustentável.",
    cta: { type: "link" as const, href: "/reservar", label: "Ver pacotes" },
    accent: "#E0B13C",
  },
  {
    icon: (
      <svg className="w-7 h-7 text-[#8B4F23]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    tag: "Natureza",
    title: "Trilha Mãe da Floresta",
    description:
      "1.530m por mata ciliar primária margeando o Rio Vagafogo, com 182 espécies de pássaros catalogadas. Piscina natural e cachoeira.",
    cta: { type: "link" as const, href: "/reservar", label: "Agendar trilha" },
    accent: "#4CAF50",
  },
  {
    icon: (
      <svg className="w-7 h-7 text-[#8B4F23]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    tag: "Educação",
    title: "Educação Ambiental",
    description:
      "Projeto para escolas, faculdades e grupos. Trilhas guiadas com interpretação sobre flora, fauna, recursos naturais e sustentabilidade.",
    cta: { type: "whatsapp" as const, href: "https://wa.me/5562992225471", label: "Agendar via WhatsApp" },
    accent: "#2196F3",
  },
];

export function FeatureSection() {
  return (
    <section className="py-16 md:py-24 bg-[#F7FAEF]">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#8B4F23] bg-[#8B4F23]/10 px-3 py-1 rounded-full mb-3">
            Por que escolher o Vagafogo
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2D1E0F] mt-2 leading-tight">
            Uma Experiência que Transforma
          </h2>
          <p className="mt-4 text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Gastronomia de excelência, natureza preservada e educação ambiental em um só lugar.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Accent bar */}
              <div className="h-1 w-full" style={{ backgroundColor: feature.accent }} />

              <div className="p-7 flex flex-col flex-1">
                {/* Ícone + tag */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#8B4F23]/8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${feature.accent}18` }}>
                    {feature.icon}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    {feature.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#2D1E0F] mb-3 leading-snug">
                  {feature.title}
                </h3>

                <p className="text-gray-500 text-sm leading-relaxed flex-1">
                  {feature.description}
                </p>

                {/* CTA */}
                <div className="mt-6">
                  {feature.cta.type === "link" ? (
                    <Link
                      to={feature.cta.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B4F23] hover:text-[#A05D2B] transition-colors group/link"
                    >
                      {feature.cta.label}
                      <svg className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ) : (
                    <a
                      href={feature.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B4F23] hover:text-[#A05D2B] transition-colors group/link"
                    >
                      {feature.cta.label}
                      <svg className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
          {[
            { value: "45+", label: "Itens no Brunch" },
            { value: "182", label: "Espécies de Aves" },
            { value: "1.530m", label: "Trilha Ecológica" },
            { value: "14", label: "Harmonizações Únicas" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-[#8B4F23]">{stat.value}</p>
              <p className="text-xs md:text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

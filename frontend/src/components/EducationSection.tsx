import educationImg from '../assets/educacaoambiental/educacaoambiental-1.jpg'

export function EducationSection() {
  return (
    <section id="educacao" className="py-16 md:py-24 bg-white">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-green-700 bg-green-100 px-3 py-1 rounded-full mb-3">
            Aprendizado e Integração
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2D1E0F] mt-2 leading-tight">
            Educação Ambiental
          </h2>
          <p className="max-w-3xl mx-auto text-gray-600 mt-4 text-base md:text-lg">
            Demonstramos a relação de interdependência do ser humano com a natureza, promovendo proteção e preservação ambiental.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16 max-w-6xl mx-auto">

          {/* Imagem */}
          <div className="lg:w-1/2 w-full flex-shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img
                src={educationImg}
                alt="Educação ambiental no Santuário Vagafogo"
                className="w-full h-72 lg:h-96 object-cover"
              />
              {/* Badge sobre a imagem */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
                <p className="text-xs font-bold text-[#8B4F23] uppercase tracking-wide">Atividade guiada</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">Trilhas com monitores ambientais</p>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="lg:w-1/2">
            <h3 className="text-2xl font-bold text-[#2D1E0F] mb-3">
              Projeto para Escolas e Grupos
            </h3>
            <p className="mb-6 text-gray-600 text-base leading-relaxed">
              Atividade realizada nas trilhas com interpretação ambiental sobre flora, fauna, recursos naturais e sustentabilidade. Ideal para grupos escolares, universitários e corporativos.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Para escolas, faculdades e grupos específicos",
                "Interpretação sobre fauna e flora do cerrado",
                "Importância da proteção ambiental local e global",
                "Atividade principal realizada nas trilhas com monitor",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-gray-600 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            {/* Aviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-800 text-sm leading-relaxed">
                <strong>Agendamento prévio obrigatório.</strong> Entre em contato via WhatsApp para verificar disponibilidade e condições especiais para grupos.
              </p>
            </div>

            <a
              href="https://wa.me/5562992225471"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] text-white font-bold px-7 py-3.5 rounded-full shadow-md hover:bg-[#1ebe5d] text-base transition-all duration-200 hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.01 2C6.48 2 2 6.477 2 12.006c0 1.937.512 3.775 1.482 5.39L2.04 22l4.716-1.248A9.949 9.949 0 0 0 12.01 22c5.523 0 10.01-4.478 10.01-9.994C22.02 6.478 17.533 2 12.01 2zm5.236 14.395c-.242.683-1.406 1.35-1.924 1.38-.517.03-1.013.255-2.826-.607-2.38-.99-3.904-3.408-4.024-3.568-.12-.16-.96-1.277-.96-2.436s.608-1.728.824-1.963c.217-.234.48-.293.64-.293s.32-.005.459.007c.144.012.337-.055.528.407.192.462.652 1.595.711 1.71.06.115.096.257.018.413-.08.157-.12.256-.238.394-.12.138-.252.306-.36.412-.12.117-.243.244-.105.478.137.233.607 1.003 1.305 1.625.897.803 1.656 1.05 1.89 1.17.235.12.373.103.509-.06.136-.164.58-.675.734-.908.154-.232.308-.194.519-.117.211.076 1.335.63 1.565.744.23.115.384.17.442.266.06.096.06.554-.183 1.237z" />
              </svg>
              Agendar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

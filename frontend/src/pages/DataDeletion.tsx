import { Link } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "../components/Footer";

export function DataDeletion() {
  return (
    <>
      <Header />
      <main id="conteudo-principal" tabIndex={-1} className="min-h-screen bg-[#F7FAEF] pt-28">
        <section className="border-b border-[#8B4F23]/10 bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8B4F23]">Seus dados</p>
            <h1 className="mt-4 font-display text-4xl font-bold text-[#2D1E0F] sm:text-5xl">Solicitação de exclusão de dados</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600">
              Você pode solicitar a exclusão ou a anonimização de dados pessoais tratados pela Fazenda Vagafogo.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <article className="mx-auto max-w-4xl rounded-[2rem] border border-[#8B4F23]/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="space-y-9 text-[15px] leading-7 text-gray-700">
              <section>
                <h2 className="font-display text-2xl font-bold text-[#2D1E0F]">Como solicitar</h2>
                <ol className="mt-4 space-y-3 pl-5">
                  <li className="list-decimal pl-1">Envie uma mensagem ao WhatsApp oficial +55 62 99222-5471.</li>
                  <li className="list-decimal pl-1">
                    Escreva <strong>“Solicitação de exclusão de dados”</strong> e informe o telefone usado no atendimento ou
                    na reserva.
                  </li>
                  <li className="list-decimal pl-1">
                    Se houver reserva, informe também o nome do titular e o respectivo código, quando disponível.
                  </li>
                  <li className="list-decimal pl-1">
                    A equipe poderá pedir dados adicionais somente para confirmar a identidade e evitar a exclusão por
                    terceiros não autorizados.
                  </li>
                </ol>
                <a
                  href="https://wa.me/5562992225471?text=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados"
                  className="mt-6 inline-flex rounded-full bg-[#8B4F23] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#A05D2B]"
                >
                  Solicitar pelo WhatsApp
                </a>
              </section>

              <section>
                <h2 className="font-display text-2xl font-bold text-[#2D1E0F]">O que acontece depois</h2>
                <p className="mt-4">
                  Após validar a solicitação, a Fazenda excluirá ou anonimizará os dados que não precisem ser mantidos.
                  Informações fiscais, financeiras, de segurança, de reservas ou necessárias ao exercício de direitos
                  poderão ser conservadas pelo prazo exigido pela legislação aplicável.
                </p>
                <p className="mt-4">
                  O cancelamento de campanhas pode ser solicitado separadamente e será aplicado mesmo quando certos
                  registros precisarem permanecer por obrigação legal.
                </p>
              </section>

              <section>
                <h2 className="font-display text-2xl font-bold text-[#2D1E0F]">Mais informações</h2>
                <p className="mt-4">
                  Consulte a nossa
                  <Link className="font-semibold text-[#8B4F23] hover:underline" to="/politica-de-privacidade">
                    {" "}Política de Privacidade
                  </Link>
                  {" "}para entender como os dados são utilizados e protegidos.
                </p>
              </section>
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

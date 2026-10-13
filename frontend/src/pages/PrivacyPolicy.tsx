import { Link } from "react-router-dom";
import Header from "../components/Header";
import { Footer } from "../components/Footer";

const sections = [
  {
    title: "1. Quem trata os seus dados",
    content: (
      <>
        <p>
          A controladora dos dados é <strong>Evandro Engel Ayer</strong>, CNPJ
          <strong> 08.768.722/0001-00</strong>, responsável pela Fazenda Vagafogo, em
          Pirenópolis, Goiás.
        </p>
        <p>
          Dúvidas e solicitações sobre privacidade podem ser enviadas pelo WhatsApp oficial
          <a className="font-semibold text-[#8B4F23] hover:underline" href="https://wa.me/5562992225471">
            {" "}+55 62 99222-5471
          </a>.
        </p>
      </>
    ),
  },
  {
    title: "2. Dados que podemos tratar",
    content: (
      <ul>
        <li>Nome, telefone, e-mail e CPF, quando necessário para reserva, cobrança ou emissão de documento.</li>
        <li>Data, horário, experiência, participantes, faixas etárias e demais preferências informadas para a visita.</li>
        <li>Origem do atendimento ou da reserva, domínio acessado, parâmetros de campanha e andamento do formulário.</li>
        <li>Método, situação e identificadores do pagamento. A Fazenda não armazena os dados completos do cartão.</li>
        <li>Mensagens enviadas ao atendimento, arquivos e áudios enquanto necessários para responder e dar continuidade ao contato.</li>
        <li>Registros técnicos de acesso, segurança, entrega e interação com mensagens.</li>
      </ul>
    ),
  },
  {
    title: "3. Como usamos os dados",
    content: (
      <ul>
        <li>Responder dúvidas, consultar disponibilidade e auxiliar na realização da reserva.</li>
        <li>Gerar o checkout oficial, identificar o pagamento e confirmar a reserva.</li>
        <li>Enviar confirmações, lembretes e orientações operacionais sobre a visita.</li>
        <li>Consolidar um cadastro de atendimento ou lead, evitando duplicidades e registrando o resultado do contato.</li>
        <li>Medir a origem e a conversão de reservas, melhorar o atendimento e recuperar processos não concluídos.</li>
        <li>Enviar campanhas pelo WhatsApp quando permitido, respeitando pedidos de bloqueio e de cancelamento.</li>
        <li>Prevenir fraudes, falhas, abuso e cumprir obrigações legais ou regulatórias.</li>
      </ul>
    ),
  },
  {
    title: "4. Atendimento com inteligência artificial",
    content: (
      <>
        <p>
          A Jatobá utiliza inteligência artificial para interpretar as mensagens, responder dúvidas, conduzir etapas de
          reserva e produzir um resumo estruturado do atendimento. Quando necessário, o atendimento é encaminhado para
          uma pessoa da equipe.
        </p>
        <p>
          A Fazenda não mantém um arquivo permanente das conversas no CRM. Mensagens e áudios usados para continuidade
          operacional são eliminados automaticamente em até sete dias; permanecem apenas os dados consolidados
          necessários ao lead, à reserva, ao pagamento e ao histórico comercial.
        </p>
      </>
    ),
  },
  {
    title: "5. Bases legais e campanhas",
    content: (
      <>
        <p>
          O tratamento pode ocorrer para executar medidas solicitadas pelo visitante e cumprir a reserva, para atender
          obrigações legais, proteger a operação, exercer direitos e atender interesses legítimos compatíveis com a
          relação mantida com a Fazenda.
        </p>
        <p>
          Campanhas e novidades respeitam a preferência registrada pelo contato. A pessoa pode solicitar o bloqueio dos
          disparos a qualquer momento pelo WhatsApp oficial. Mensagens estritamente relacionadas a uma reserva ou a um
          atendimento em andamento não são campanhas promocionais.
        </p>
      </>
    ),
  },
  {
    title: "6. Compartilhamento e operadores",
    content: (
      <p>
        Os dados podem ser processados por fornecedores indispensáveis ao funcionamento do serviço, incluindo Meta e
        WhatsApp, processador de pagamentos, hospedagem, banco de dados, infraestrutura em nuvem e provedor de
        inteligência artificial. O compartilhamento é limitado à finalidade contratada e também pode ocorrer quando
        exigido por lei ou autoridade competente.
      </p>
    ),
  },
  {
    title: "7. Armazenamento e segurança",
    content: (
      <p>
        Adotamos controles de acesso, autenticação, registros de operação e outras medidas razoáveis para proteger os
        dados. Informações de reservas, pagamentos e relacionamento são mantidas pelo tempo necessário às finalidades
        informadas e aos prazos legais aplicáveis. Dados que deixarem de ser necessários são eliminados ou anonimizados,
        salvo quando a conservação for obrigatória ou necessária para o exercício de direitos.
      </p>
    ),
  },
  {
    title: "8. Seus direitos",
    content: (
      <>
        <p>
          Nos termos da Lei Geral de Proteção de Dados, você pode solicitar confirmação e acesso, correção,
          anonimização, bloqueio ou eliminação quando cabível, informação sobre compartilhamentos, portabilidade,
          oposição e revogação do consentimento.
        </p>
        <p>
          Consulte também as
          <Link className="font-semibold text-[#8B4F23] hover:underline" to="/exclusao-de-dados">
            {" "}instruções para exclusão de dados
          </Link>.
        </p>
      </>
    ),
  },
  {
    title: "9. Atualizações desta política",
    content: (
      <p>
        Esta política poderá ser atualizada para refletir mudanças legais, técnicas ou operacionais. A versão vigente
        ficará sempre disponível nesta página. Última atualização: 12 de outubro de 2026.
      </p>
    ),
  },
];

export function PrivacyPolicy() {
  return (
    <>
      <Header />
      <main id="conteudo-principal" tabIndex={-1} className="bg-[#F7FAEF] pt-28">
        <section className="border-b border-[#8B4F23]/10 bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8B4F23]">Privacidade e transparência</p>
            <h1 className="mt-4 font-display text-4xl font-bold text-[#2D1E0F] sm:text-5xl">Política de Privacidade</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600">
              Saiba quais dados a Fazenda Vagafogo utiliza no site, nas reservas, no CRM e no atendimento pelo WhatsApp.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <article className="mx-auto max-w-4xl rounded-[2rem] border border-[#8B4F23]/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="space-y-10 text-[15px] leading-7 text-gray-700">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="font-display text-2xl font-bold text-[#2D1E0F]">{section.title}</h2>
                  <div className="mt-4 space-y-4 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

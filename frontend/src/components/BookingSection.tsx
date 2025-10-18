import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from '../../firebase';
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";

type Pacote = {
  id?: string;
  nome: string;
  tipo: "brunch" | "trilha" | "experiencia";
  emoji?: string;
  precoAdulto: number;
  precoCrianca: number;
  precoBariatrica: number;
  horarios?: string[];
  dias: number[];
  limite?: number;
  datasBloqueadas?: string[];
  aceitaPet?: boolean;
  modoHorario?: 'lista' | 'intervalo';
  horarioInicio?: string;
  horarioFim?: string;
};

type Combo = {
  id?: string;
  nome: string;
  pacoteIds: string[];
  desconto: number;
  ativo: boolean;
};

export function BookingSection() {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loadingPacotes, setLoadingPacotes] = useState(true);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  // Formulário
  const [nome, setNome] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [telefone, setTelefone] = useState<string>("");
  const [cpf, setCpf] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [horario, setHorario] = useState<string>("");
  const [adultos, setAdultos] = useState<number>(1);
  const [bariatrica, setBariatica] = useState<number>(0);
  const [criancas, setCriancas] = useState<number>(0);
  const [naoPagante, setPagante] = useState<number>(0);
  const [temPet, setTemPet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"CREDIT_CARD" | "PIX">("CREDIT_CARD");


  // PIX
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);

  const todayStart = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  })();

  // BUSCA PACOTES E COMBOS VIA FIRESTORE
  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar pacotes do Firestore
        const pacotesSnapshot = await getDocs(collection(db, 'pacotes'));
        const pacotesData = pacotesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Buscar combos do Firestore
        const combosSnapshot = await getDocs(collection(db, 'combos'));
        const combosData = combosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome: data.nome || '',
            pacoteIds: Array.isArray(data.pacoteIds) ? data.pacoteIds : [],
            desconto: Number(data.desconto || 0),
            ativo: Boolean(data.ativo)
          } as Combo;
        });
        
        const arr: Pacote[] = pacotesData.map((d: any) => ({
          id: d.id,
          nome: d.nome,
          tipo: d.tipo,
          emoji: d.emoji,
          precoAdulto: Number(d.precoAdulto),
          precoCrianca: Number(d.precoCrianca),
          precoBariatrica: Number(d.precoBariatrica),
          horarios: d.horarios ?? [],
          dias: Array.isArray(d.dias) ? d.dias : [],
          limite: d.limite !== undefined ? Number(d.limite) : undefined,
          datasBloqueadas: Array.isArray(d.datasBloqueadas) ? d.datasBloqueadas : [],
          aceitaPet: d.aceitaPet !== false,
          modoHorario: d.modoHorario || 'lista',
          horarioInicio: d.horarioInicio || '',
          horarioFim: d.horarioFim || '',
        }));
        
        setPacotes(arr);
        setCombos(combosData);
        
        // Debug: verificar datas bloqueadas
        console.log('📅 Pacotes carregados:', arr.map(p => ({
          nome: p.nome,
          datasBloqueadas: p.datasBloqueadas
        })));
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setPacotes([]);
        setCombos([]);
      } finally {
        setLoadingPacotes(false);
      }
    }
    fetchData();
  }, []);

  if (loadingPacotes) {
    return (
      <section id="reservas" className="py-16 bg-[#F7FAEF]">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <span className="text-green-600 font-semibold text-xs uppercase tracking-widest">
              RESERVE SEU PASSEIO
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#8B4F23] mt-2 mb-1">
              Carregando pacotes...
            </h2>
          </div>
        </div>
      </section>
    );
  }

  if (pacotes.length === 0) {
    return (
      <section id="reservas" className="py-16 bg-[#F7FAEF]">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <span className="text-green-600 font-semibold text-xs uppercase tracking-widest">
              RESERVE SEU PASSEIO
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#8B4F23] mt-2 mb-1">
              Nenhum pacote disponível para reserva.
            </h2>
          </div>
        </div>
      </section>
    );
  }

  const selectedPacotes = pacotes.filter(p => selectedPackages.includes(p.id!));
  const comboAtivo = combos.find(c => 
    c.ativo && 
    c.pacoteIds.length === selectedPackages.length && 
    c.pacoteIds.every(id => selectedPackages.includes(id))
  );

  const calcularTotal = () => {
    let total = 0;
    selectedPacotes.forEach(p => {
      total += adultos * p.precoAdulto + criancas * p.precoCrianca + bariatrica * p.precoBariatrica;
    });
    
    if (comboAtivo) {
      total = total * (1 - comboAtivo.desconto / 100);
    }
    
    return total;
  };

  const allowedDays = (day: Date) => {
    if (selectedPacotes.length === 0) return false;
    
    const dayStr = day.toISOString().slice(0, 10);
    const isBlocked = selectedPacotes.some(p => 
      p.datasBloqueadas?.includes(dayStr)
    );
    
    if (isBlocked) return false;
    
    return selectedPacotes.some(p => p.dias.includes(day.getDay()));
  };

  const isBlockedDay = (day: Date) => {
    if (selectedPacotes.length === 0) return false;
    const dayStr = day.toISOString().slice(0, 10);
    return selectedPacotes.some(p => p.datasBloqueadas?.includes(dayStr));
  };

  const getPetMessage = () => {
    if (selectedPacotes.length === 0) return null;
    
    const pacotesComPet = selectedPacotes.filter(p => p.aceitaPet);
    const pacotesSemPet = selectedPacotes.filter(p => !p.aceitaPet);
    
    if (pacotesSemPet.length > 0 && pacotesComPet.length > 0) {
      const nomesSemPet = pacotesSemPet.map(p => p.nome).join(", ");
      const nomesComPet = pacotesComPet.map(p => p.nome).join(", ");
      return `A atividade ${nomesSemPet} não permite Pets, A ${nomesComPet} sim.`;
    }
    
    if (pacotesSemPet.length > 0 && pacotesComPet.length === 0) {
      const nomes = pacotesSemPet.map(p => p.nome).join(", ");
      return `Não é permitido pets na atividade: ${nomes}`;
    }
    
    return null;
  };

  const horariosDisponiveis = selectedPacotes.length > 0 
    ? [...new Set(selectedPacotes.flatMap(p => p.horarios || []))]
    : [];

  const temPacoteFaixa = selectedPacotes.some(p => 
    p.modoHorario === 'intervalo' || (p.horarios && p.horarios.length === 0)
  );

  const handlePackageToggle = (packageId: string) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
    setHorario("");

  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (selectedPackages.length === 0) return alert("Selecione pelo menos um pacote!");
    if (!selectedDay) return alert("Selecione uma data válida!");
    if (horariosDisponiveis.length > 0 && !horario) return alert("Selecione o horário!");
    if (!nome || !email || !cpf) return alert("Preencha todos os campos obrigatórios!");
    if (temPet === null) return alert("Informe se vai levar um pet!");

    setLoading(true);

    try {
      const dataStr = selectedDay.toISOString().slice(0, 10);
      const totalParticipantes = adultos + criancas + bariatrica + naoPagante;
      const total = calcularTotal();
      
      const atividades = selectedPacotes.map(p => p.nome).join(" + ");
      const comboInfo = comboAtivo ? ` (Combo: ${comboAtivo.nome} - ${comboAtivo.desconto}% desconto)` : "";

      const payload: any = {
        nome,
        email,
        valor: total,
        cpf,
        telefone,
        atividade: atividades + comboInfo,
        data: dataStr,
        participantes: totalParticipantes,
        adultos,
        bariatrica,
        criancas,
        naoPagante,
        billingType: formaPagamento,
        horario: horariosDisponiveis.length > 0 ? horario : "Sem horário específico",
        temPet,
        pacoteIds: selectedPackages,
        comboId: comboAtivo?.id || null,
      };

      console.log('📤 Enviando payload:', payload);
      
      const rawResponse = await fetch("https://vagafogo-production.up.railway.app/criar-cobranca", {
        method: "POST",
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('📥 Status da resposta:', rawResponse.status);
      
      const resposta = await rawResponse.json().catch(() => ({}));
      console.log('📥 Resposta completa:', resposta);

      if (!rawResponse.ok) {
        console.error('❌ Erro na resposta:', resposta);
        alert("Erro ao criar a cobrança: " + (resposta?.error || resposta?.message || rawResponse.statusText));
        setLoading(false);
        return;
      }

      if (resposta?.status === 'ok') {
        setCheckoutUrl(resposta.cobranca.invoiceUrl);
        setPixKey(resposta.cobranca.pixKey);
        setQrCodeImage(resposta.cobranca.qrCodeImage);
        setExpirationDate(resposta.cobranca.expirationDate);
        
        // Scroll automático para o card de pagamento
        setTimeout(() => {
          paymentCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100);
        
        // Mostrar mensagem sobre carteirinha bariátrica
        if (bariatrica > 0) {
          alert("⚠️ IMPORTANTE: Como você selecionou opção bariátrica, será necessário enviar a foto da carteirinha via WhatsApp após realizar a reserva para validação.");
        }
      } else {
        alert("Erro ao criar a cobrança. Verifique os dados ou tente novamente.");
      }

    } catch (error) {
      alert("Erro ao processar reserva. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="reservas" className="py-16 bg-[#F7FAEF]">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="text-green-600 font-semibold text-xs uppercase tracking-widest">
            RESERVE SEU PASSEIO
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#8B4F23] mt-2 mb-1">
            Faça sua Reserva Agora
          </h2>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            
            {/* Seleção Múltipla de Pacotes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Selecione os Pacotes *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pacotes.map((pacote) => (
                  <div
                    key={pacote.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPackages.includes(pacote.id!)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => handlePackageToggle(pacote.id!)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {pacote.emoji} {pacote.nome}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Adulto: R$ {pacote.precoAdulto.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Criança: R$ {pacote.precoCrianca.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Bariátrica: R$ {pacote.precoBariatrica.toFixed(2)}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pacote.id!)}
                        onChange={() => handlePackageToggle(pacote.id!)}
                        className="w-5 h-5 text-green-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {comboAtivo && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    🎉 Combo Ativo: {comboAtivo.nome} - {comboAtivo.desconto}% de desconto!
                  </p>
                </div>
              )}
            </div>

            {/* Dados Pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* Seleção de Data */}
            {selectedPackages.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecione a Data *
                </label>
                
                {/* Mostrar datas bloqueadas */}
                {selectedPacotes.some(p => p.datasBloqueadas && p.datasBloqueadas.length > 0) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-700 mb-2">⚠️ Datas bloqueadas:</p>
                    {selectedPacotes.map(p => 
                      p.datasBloqueadas && p.datasBloqueadas.length > 0 ? (
                        <div key={p.id} className="text-sm text-red-600">
                          <strong>{p.nome}:</strong> {p.datasBloqueadas.map(data => 
                            new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
                          ).join(', ')}
                        </div>
                      ) : null
                    )}
                  </div>
                )}
                
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    disabled={[{ before: todayStart }, (day) => !allowedDays(day) || isBlockedDay(day)]}
                    locale={ptBR}
                    className="border border-gray-300 rounded-lg p-4"
                    modifiers={{
                      blocked: (day) => isBlockedDay(day)
                    }}
                    modifiersStyles={{
                      blocked: {
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        textDecoration: 'line-through'
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Seleção de Horário */}
            {selectedDay && selectedPacotes.length > 0 && (
              <div className="mb-6">
                {horariosDisponiveis.length > 0 ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário *
                    </label>
                    <select
                      value={horario}
                      onChange={(e) => setHorario(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Selecione um horário</option>
                      {horariosDisponiveis.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {temPacoteFaixa && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        {selectedPacotes
                          .filter(p => p.modoHorario === 'intervalo' && p.horarioInicio && p.horarioFim)
                          .map(p => (
                            <p key={p.id} className="text-sm text-blue-700 mb-1 last:mb-0">
                              ℹ️ A atividade {p.nome} funciona em faixa de horário, ocorre das {p.horarioInicio} até {p.horarioFim}
                            </p>
                          ))
                        }
                      </div>
                    )}
                  </>
                ) : temPacoteFaixa ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    {selectedPacotes
                      .filter(p => p.modoHorario === 'intervalo' && p.horarioInicio && p.horarioFim)
                      .map(p => (
                        <p key={p.id} className="text-sm font-medium text-green-700 mb-1 last:mb-0">
                          ✓ A atividade {p.nome} funciona em faixa de horário, ocorre das {p.horarioInicio} até {p.horarioFim}
                        </p>
                      ))
                    }
                  </div>
                ) : null}
              </div>
            )}

            {/* Número de Participantes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adultos *
                </label>
                <input
                  type="number"
                  min="1"
                  value={adultos}
                  onChange={(e) => setAdultos(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crianças
                </label>
                <input
                  type="number"
                  min="0"
                  value={criancas}
                  onChange={(e) => setCriancas(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bariátrica
                </label>
                <input
                  type="number"
                  min="0"
                  value={bariatrica}
                  onChange={(e) => setBariatica(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Não Pagante
                </label>
                <input
                  type="number"
                  min="0"
                  value={naoPagante}
                  onChange={(e) => setPagante(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            
            {bariatrica > 0 && (
              <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  ⚠️ <strong>Importante:</strong> É obrigatório apresentar a carteirinha bariátrica via WhatsApp após a reserva para validação.
                </p>
              </div>
            )}

            {/* Pet */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Vai levar pet? *
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="pet"
                    checked={temPet === true}
                    onChange={() => setTemPet(true)}
                    className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Sim</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="pet"
                    checked={temPet === false}
                    onChange={() => setTemPet(false)}
                    className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Não</span>
                </label>
              </div>
              
              {temPet === true && getPetMessage() && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    ⚠️ {getPetMessage()}
                  </p>
                </div>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Forma de Pagamento
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="pagamento"
                    checked={formaPagamento === "CREDIT_CARD"}
                    onChange={() => setFormaPagamento("CREDIT_CARD")}
                    className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Cartão de Crédito</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="pagamento"
                    checked={formaPagamento === "PIX"}
                    onChange={() => setFormaPagamento("PIX")}
                    className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">PIX</span>
                </label>
              </div>
            </div>

            {/* Total */}
            {selectedPackages.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {calcularTotal().toFixed(2)}
                  </span>
                </div>
                {comboAtivo && (
                  <p className="text-sm text-green-600 mt-1">
                    Desconto de {comboAtivo.desconto}% aplicado!
                  </p>
                )}
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading || selectedPackages.length === 0}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Processando..." : "Fazer Reserva"}
            </button>
          </form>

          {/* Resultado do Pagamento */}
          {checkoutUrl && (
            <div 
              ref={paymentCardRef}
              className="mt-8 p-6 bg-white rounded-2xl shadow-xl relative"
              style={{
                animation: 'pulse-border 2s infinite',
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(45deg, #10b981, #3b82f6, #10b981)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'content-box, border-box'
              }}
            >
              <h3 className="text-xl font-bold text-blue-600 mb-4">
                Finalize seu Pagamento
              </h3>
              
              {formaPagamento === "CREDIT_CARD" && (
                <div className="text-center">
                  <p className="mb-6 text-lg text-gray-700">Clique no botão abaixo para finalizar o pagamento:</p>
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white py-4 px-8 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-lg transform hover:scale-105"
                  >
                    💳 Realizar Pagamento
                  </a>
                  <p className="mt-4 text-sm text-gray-600">Você será redirecionado para a página segura de pagamento</p>
                </div>
              )}
              
              {formaPagamento === "PIX" && pixKey && (
                <div>
                  <p className="mb-4">Use a chave PIX abaixo para pagamento:</p>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <p className="font-mono text-sm break-all">{pixKey}</p>
                  </div>
                  
                  {qrCodeImage && (
                    <div className="text-center mb-4">
                      <img
                        src={qrCodeImage}
                        alt="QR Code PIX"
                        className="mx-auto max-w-xs"
                      />
                    </div>
                  )}
                  
                  {expirationDate && (
                    <p className="text-sm text-red-600">
                      Válido até: {new Date(expirationDate).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Adicionar CSS para animação pulsante
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-border {
    0%, 100% {
      filter: brightness(1);
      transform: scale(1);
    }
    50% {
      filter: brightness(1.1);
      transform: scale(1.02);
    }
  }
`;
if (!document.head.querySelector('style[data-pulse-border]')) {
  style.setAttribute('data-pulse-border', 'true');
  document.head.appendChild(style);
}
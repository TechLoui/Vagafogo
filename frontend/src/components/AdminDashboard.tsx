import { useCallback, useEffect, useMemo, useState } from 'react';
import React from 'react';
import {collection,query, where, getDocs, doc, deleteDoc,updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { FaChevronLeft, FaChevronRight, FaTrash, FaEdit, FaPlus, FaWhatsapp, FaSearch, FaCalendarAlt, FaUsers, FaLayerGroup, FaChair } from 'react-icons/fa';

import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);
dayjs.locale('pt-br');


interface PerguntaPersonalizadaResposta {
  pacoteId: string;
  pacoteNome: string;
  perguntaId: string;
  pergunta: string;
  tipo: 'sim_nao' | 'texto';
  obrigatoria: boolean;
  resposta: string;
  perguntaCondicional?: {
    pergunta: string;
    tipo: 'sim_nao' | 'texto';
    obrigatoria: boolean;
    resposta: string;
  };
}

interface Reserva {
  id?: string;
  nome: string;
  cpf: string;
  telefone: string;
  adultos?: number;
  criancas?: number;
  naoPagante?: number;
  bariatrica?: number;
  data: string;
  horario: string;
  atividade: string;
  valor?: number;
  status?: string;
  temPet?: boolean;
  perguntasPersonalizadas?: PerguntaPersonalizadaResposta[];
}

interface PerguntaPersonalizada {
  id: string;
  pergunta: string;
  tipo: 'sim_nao' | 'texto';
  obrigatoria: boolean;
  perguntaCondicional?: {
    condicao: 'sim' | 'nao';
    pergunta: string;
    tipo: 'sim_nao' | 'texto';
    obrigatoria: boolean;
  };
}

interface Pacote {
  id?: string;
  nome: string;
  tipo: string;
  emoji?: string;
  precoAdulto: number;
  precoCrianca: number;
  precoBariatrica: number;
  horarios: string[];
  dias: number[];
  limite: number;
  datasBloqueadas?: string[];
  modoHorario?: 'lista' | 'intervalo';
  horarioInicio?: string;
  horarioFim?: string;
  aceitaPet: boolean;
  perguntasPersonalizadas?: PerguntaPersonalizada[];
}



const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const diasDaSemanaCurto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const horariosDisponiveis = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '18:00'
];

const ordenarHorarios = (lista: string[]) => (
  [...lista].sort((a, b) => a.localeCompare(b))
);

export default function AdminDashboard() {
  const [aba, setAba] = useState<'reservas' | 'pacotes' | 'pesquisa'>('reservas');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reservas
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservas, setReservas] = useState<Record<string, Reserva[]>>({});
  const [editReserva, setEditReserva] = useState<Reserva | null>(null);
  const [modalReserva, setModalReserva] = useState(false);
  const [isEditingReserva, setIsEditingReserva] = useState(false);
  const [filtroAtividade, setFiltroAtividade] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [reservaDetalhesAberta, setReservaDetalhesAberta] = useState<string | null>(null);

  // Pacotes
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [modalPacote, setModalPacote] = useState(false);
  const [editPacote, setEditPacote] = useState<Pacote | null>(null);
  const [isEditingPacote, setIsEditingPacote] = useState(false);
  const [novaDataBloqueada, setNovaDataBloqueada] = useState('');
  const [novaPergunta, setNovaPergunta] = useState<{ pergunta: string; tipo: 'sim_nao' | 'texto'; obrigatoria: boolean }>({ pergunta: '', tipo: 'sim_nao', obrigatoria: false });
  const [modalDisponibilidade, setModalDisponibilidade] = useState(false);
  const [disponibilidadeData, setDisponibilidadeData] = useState<Record<string, boolean>>({});
  const [carregandoDisponibilidade, setCarregandoDisponibilidade] = useState(false);
  const [salvandoDisponibilidade, setSalvandoDisponibilidade] = useState(false);

  const faixaHorarioDescricao = editPacote?.modoHorario === 'intervalo'
    && (editPacote.horarioInicio ?? '')
    && (editPacote.horarioFim ?? '')
    ? `Disponível das ${editPacote.horarioInicio} às ${editPacote.horarioFim}. O cliente verá apenas a faixa.`
    : '';

  const totalReservasConfirmadas = useMemo(() => {
    return Object.values(reservas).reduce(
      (acc, lista) => acc + lista.length,
      0
    );
  }, [reservas]);
  const totalParticipantesConfirmados = useMemo(() => {
    return Object.values(reservas).reduce(
      (acc, lista) =>
        acc +
        lista.reduce((subtotal, item) => subtotal + calcularParticipantes(item), 0),
      0
    );
  }, [reservas]);

  const pacotesQueNaoAceitamPet = useMemo(() => {
    return pacotes.filter(p => p.aceitaPet === false).length;
  }, [pacotes]);
  const totalPacotesAtivos = pacotes.length;
  const proximaDataBloqueada = useMemo(() => {
    const hoje = dayjs().startOf('day');
    const datasOrdenadas = pacotes
      .flatMap(p => p.datasBloqueadas ?? [])
      .map(data => dayjs(data))
      .filter(data => data.isValid() && (data.isSame(hoje) || data.isAfter(hoje)))
      .sort((a, b) => a.valueOf() - b.valueOf());
    return datasOrdenadas.length > 0 ? datasOrdenadas[0] : null;
  }, [pacotes]);
  const abasDisponiveis: Array<{ id: 'reservas' | 'pacotes' | 'pesquisa'; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'reservas', label: 'Reservas', description: 'Agenda do dia', icon: FaCalendarAlt },
    { id: 'pacotes', label: 'Pacotes', description: 'Coleção de atividades', icon: FaLayerGroup },
    { id: 'pesquisa', label: 'Clientes', description: 'Histórico de reservas', icon: FaSearch },
  ];

  // Pesquisa Clientes
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Reserva[]>([]);
  const [carregandoPesquisa, setCarregandoPesquisa] = useState(false);

  // Reservas Logic
  const fetchReservas = async (date: Date) => {
    const formatted = dayjs(date).format('YYYY-MM-DD');
    console.log('🔍 Buscando reservas para:', formatted);
    try {
      const q = query(collection(db, 'reservas'), where('data', '==', formatted));
      const snapshot = await getDocs(q);
      const dados: Reserva[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reserva));
      console.log('📊 Total de reservas encontradas:', dados.length);
      console.log('📊 Status das reservas:', dados.map(r => ({ nome: r.nome, status: r.status })));
      
      const reservasPagas = dados.filter(r => r.status === 'pago');
      console.log('✅ Reservas pagas:', reservasPagas.length);
      
      const reservasPorHorario = reservasPagas.reduce((acc, reserva) => {
        const horario = reserva.horario || 'Não especificado';
        if (!acc[horario]) acc[horario] = [];
        acc[horario].push(reserva);
        return acc;
      }, {} as Record<string, Reserva[]>);
      setReservas(reservasPorHorario);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      setReservas({});
    }
  };

  useEffect(() => {
    fetchReservas(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    setReservaDetalhesAberta(null);
  }, [selectedDate, filtroAtividade]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = daysInMonth(currentMonth, currentYear);
  const days: (number | null)[] = Array(firstDayOfMonth).fill(null).concat([...Array(totalDays).keys()].map(i => i + 1));
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentYear, currentMonth + offset);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
  };

  const excluirReserva = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta reserva?")) {
      try {
        await deleteDoc(doc(db, "reservas", id));
        fetchReservas(selectedDate);
      } catch (error) {
        console.error('Erro ao excluir reserva:', error);
      }
    }
  };

  const handleEditReserva = (reserva: Reserva) => {
    setEditReserva(reserva);
    setIsEditingReserva(true);
    setModalReserva(true);
  };

  const handleAddReserva = () => {
    setEditReserva({
      nome: '',
      cpf: '',
      telefone: '',
      adultos: 0,
      criancas: 0,
      naoPagante: 0,
      bariatrica: 0,
      data: dayjs(selectedDate).format('YYYY-MM-DD'),
      horario: '',
      atividade: '',
      temPet: false
    });
    setIsEditingReserva(false);
    setModalReserva(true);
  };

  const normalizarTexto = (valor?: string) =>
    valor
      ? valor
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
      : '';

  const obterPerguntasComResposta = (reserva: Reserva) => {
    return (reserva.perguntasPersonalizadas ?? []).filter((pergunta) => {
      const perguntaValida = typeof pergunta?.pergunta === 'string' && pergunta.pergunta.trim().length > 0;
      const respostaValida = typeof pergunta?.resposta === 'string' && pergunta.resposta.trim().length > 0;
      return perguntaValida && respostaValida;
    });
  };

  const desejaJuntarMesa = (reserva: Reserva) => {
    return (reserva.perguntasPersonalizadas ?? []).some((pergunta) => {
      const perguntaNormalizada = normalizarTexto(pergunta.pergunta);
      if (!perguntaNormalizada.includes('juntar mesa')) return false;
      const respostaNormalizada = normalizarTexto(pergunta.resposta);
      return respostaNormalizada.startsWith('sim') || respostaNormalizada === 's';
    });
  };

  const toggleDetalhesReserva = (reservaId: string) => {
    setReservaDetalhesAberta((prev) => (prev === reservaId ? null : reservaId));
  };

  const renderPerguntasPersonalizadas = (perguntas: PerguntaPersonalizadaResposta[]) => {
    if (perguntas.length === 0) {
      return <p className="text-sm text-slate-500">Nenhuma resposta personalizada.</p>;
    }

    return (
      <dl className="divide-y divide-slate-100 text-sm">
        {perguntas.map((pergunta) => (
          <div key={`${pergunta.perguntaId}-${pergunta.pergunta}`} className="py-2 first:pt-0 last:pb-0">
            <dt className="text-xs font-semibold uppercase text-slate-500">{pergunta.pergunta}</dt>
            <dd className="mt-1 font-medium text-slate-900">{pergunta.resposta || '---'}</dd>
            {pergunta.perguntaCondicional?.pergunta && (
              <div className="mt-2 rounded-lg bg-slate-50 p-2">
                <p className="text-[11px] font-semibold uppercase text-slate-400">
                  {pergunta.perguntaCondicional.pergunta}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {pergunta.perguntaCondicional.resposta || '---'}
                </p>
              </div>
            )}
          </div>
        ))}
      </dl>
    );
  };

  function calcularParticipantes(reserva: Reserva) {
    return (
      (reserva.adultos ?? 0) +
      (reserva.criancas ?? 0) +
      (reserva.naoPagante ?? 0) +
      (reserva.bariatrica ?? 0)
    );
  }

  const formatarValor = (valor?: number | string) => {
    if (valor === undefined || valor === null) return '---';
    const numero = Number(valor);
    if (Number.isNaN(numero)) return '---';
    return `R$${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const obterPacoteNomes = (reserva: Reserva) => {
    const info = reserva as Record<string, any>;
    const nomes: string[] = [];

    if (Array.isArray(info.pacoteNomes)) {
      nomes.push(...info.pacoteNomes.filter(Boolean));
    } else if (Array.isArray(info.pacotes)) {
      info.pacotes.forEach((item: any) => {
        if (typeof item === 'string') {
          nomes.push(item);
        } else if (item?.nome) {
          nomes.push(item.nome);
        }
      });
    } else if (Array.isArray(info.pacoteIds)) {
      info.pacoteIds.forEach((id: string) => {
        const pacoteRelacionado = pacotes.find(p => p.id === id);
        if (pacoteRelacionado?.nome) {
          nomes.push(pacoteRelacionado.nome);
        }
      });
    } else if (typeof info.pacote === 'string') {
      nomes.push(info.pacote);
    } else if (typeof info.pacoteNome === 'string') {
      nomes.push(info.pacoteNome);
    } else if (reserva.atividade) {
      nomes.push(reserva.atividade);
    }

    return Array.from(new Set(nomes.filter(Boolean)));
  };

  const formatarPacote = (reserva: Reserva) => {
    const nomes = obterPacoteNomes(reserva);
    if (nomes.length === 0) return '---';
    if (nomes.length === 1) return nomes[0];
    return nomes.join(' + ');
  };



  const handleSaveReserva = async () => {
    if (!editReserva) return;
    if (!editReserva.data) {
      setFeedback({ type: 'error', message: 'Por favor, selecione a data da reserva.' });
      return;
    }
    try {
      const participantes = calcularParticipantes(editReserva);

      if (isEditingReserva && editReserva.id) {
        const ref = doc(db, "reservas", editReserva.id);
        await updateDoc(ref, {
          ...editReserva,
          participantes,
          status: 'pago',
        });
        setFeedback({ type: 'success', message: 'Reserva atualizada com sucesso!' });
      } else {
        await addDoc(collection(db, "reservas"), {
          ...editReserva,
          participantes,
          status: 'pago',
        });
        setFeedback({ type: 'success', message: 'Reserva cadastrada com sucesso!' });
      }
      setModalReserva(false);
      setEditReserva(null);
      fetchReservas(selectedDate);
    } catch (error) {
      console.error('Erro ao salvar reserva:', error);
      setFeedback({ type: 'error', message: 'Erro ao salvar reserva.' });
    }
  };

  // Pacotes Logic
  const fetchPacotes = async () => {
    const snap = await getDocs(collection(db, 'pacotes'));
    const lista = snap.docs.map(docSnap => {
      const data = docSnap.data() as Partial<Pacote>;
      const modoHorario = data.modoHorario === 'intervalo' ? 'intervalo' : 'lista';
      return {
        id: docSnap.id,
        nome: data.nome ?? '',
        tipo: data.tipo ?? '',
        precoAdulto: Number(data.precoAdulto ?? 0),
        precoCrianca: Number(data.precoCrianca ?? 0),
        precoBariatrica: Number(data.precoBariatrica ?? 0),
        limite: Number(data.limite ?? 0),
        dias: Array.isArray(data.dias) ? data.dias.map(Number).sort((a, b) => a - b) : [],
        horarios: Array.isArray(data.horarios) ? ordenarHorarios(data.horarios) : [],
        datasBloqueadas: Array.isArray(data.datasBloqueadas) ? [...data.datasBloqueadas].sort() : [],
        modoHorario,
        horarioInicio: data.horarioInicio ?? '',
        horarioFim: data.horarioFim ?? '',
        aceitaPet: data.aceitaPet === false ? false : true,
        perguntasPersonalizadas: Array.isArray(data.perguntasPersonalizadas) ? data.perguntasPersonalizadas : [],
      } as Pacote;
    });
    setPacotes(lista);
  };



  useEffect(() => {
    fetchPacotes();
  }, []);

  useEffect(() => {
    if (aba === 'pacotes') {
      fetchPacotes();
    }
  }, [aba]);

  const handleEditPacote = (pacote: Pacote) => {
    setEditPacote({
      ...pacote,
      dias: Array.isArray(pacote.dias) ? pacote.dias : [],
      horarios: Array.isArray(pacote.horarios) ? ordenarHorarios(pacote.horarios) : [],
      datasBloqueadas: Array.isArray(pacote.datasBloqueadas) ? [...pacote.datasBloqueadas] : [],
      modoHorario: pacote.modoHorario ?? 'lista',
      horarioInicio: pacote.horarioInicio ?? '',
      horarioFim: pacote.horarioFim ?? '',
      aceitaPet: pacote.aceitaPet ?? true,
      perguntasPersonalizadas: pacote.perguntasPersonalizadas ?? [],
    });
    setNovaDataBloqueada('');
    setNovaPergunta({ pergunta: '', tipo: 'sim_nao', obrigatoria: false });
    setIsEditingPacote(true);
    setModalPacote(true);
  };

  const handleAddPacote = () => {
    setEditPacote({
      nome: '',
      tipo: '',
      precoAdulto: 0,
      precoCrianca: 0,
      precoBariatrica: 0,
      horarios: [],
      dias: [],
      limite: 0,
      datasBloqueadas: [],
      modoHorario: 'lista',
      horarioInicio: '',
      horarioFim: '',
      aceitaPet: true,
      perguntasPersonalizadas: [],
    });
    setNovaDataBloqueada('');
    setNovaPergunta({ pergunta: '', tipo: 'sim_nao', obrigatoria: false });
    setIsEditingPacote(false);
    setModalPacote(true);
  };

  const handleSavePacote = async () => {
    if (!editPacote) return;
    if (!editPacote.nome) {
      setFeedback({ type: 'error', message: 'Nome obrigatório!' });
      return;
    }

    const modoHorario = editPacote.modoHorario ?? 'lista';
    const dias = Array.from(new Set(editPacote.dias ?? [])).sort((a, b) => a - b);
    const datasBloqueadas = Array.from(new Set(editPacote.datasBloqueadas ?? [])).sort();
    const limite = Number(editPacote.limite) || 0;

    const horarioInicio = editPacote.horarioInicio ?? '';
    const horarioFim = editPacote.horarioFim ?? '';
    let horariosCalculados: string[] = [];

    if (modoHorario === 'intervalo') {
      if (!horarioInicio || !horarioFim) {
        setFeedback({ type: 'error', message: 'Informe horário inicial e final.' });
        return;
      }
      horariosCalculados = [];
    } else {
      const listaHorarios = Array.isArray(editPacote.horarios) ? editPacote.horarios : [];
      horariosCalculados = ordenarHorarios(Array.from(new Set(listaHorarios)));
    }

    const pacoteNormalizado: Pacote = {
      ...editPacote,
      modoHorario,
      dias,
      datasBloqueadas,
      limite,
      horarioInicio: modoHorario === 'intervalo' ? horarioInicio : '',
      horarioFim: modoHorario === 'intervalo' ? horarioFim : '',
      horarios: horariosCalculados,
      aceitaPet: editPacote.aceitaPet ?? true,
    };

    const { id, ...dadosPacote } = pacoteNormalizado;

    try {
      if (isEditingPacote && id) {
        await updateDoc(doc(db, 'pacotes', id), dadosPacote);
        setFeedback({ type: 'success', message: 'Pacote atualizado com sucesso!' });
      } else {
        await addDoc(collection(db, 'pacotes'), dadosPacote);
        setFeedback({ type: 'success', message: 'Pacote cadastrado com sucesso!' });
      }
      setModalPacote(false);
      setEditPacote(null);
      setNovaDataBloqueada('');
      fetchPacotes();
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao salvar pacote.' });
    }
  };

  const excluirPacote = async (id: string) => {
    if (window.confirm('Excluir pacote?')) {
      await deleteDoc(doc(db, 'pacotes', id));
      fetchPacotes();
    }
  };

  const adicionarDataBloqueada = () => {
    if (!novaDataBloqueada) return;
    setEditPacote(prev => {
      if (!prev) return prev;
      const existentes = new Set(prev.datasBloqueadas ?? []);
      existentes.add(novaDataBloqueada);
      return {
        ...prev,
        datasBloqueadas: Array.from(existentes).sort(),
      };
    });
    setNovaDataBloqueada('');
  };

  const removerDataBloqueada = (data: string) => {
    setEditPacote(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        datasBloqueadas: (prev.datasBloqueadas ?? []).filter(item => item !== data),
      };
    });
  };

  const adicionarPergunta = () => {
    if (!novaPergunta.pergunta.trim()) return;
    setEditPacote(prev => {
      if (!prev) return prev;
      const novaP: PerguntaPersonalizada = {
        id: Date.now().toString(),
        ...novaPergunta
      };
      return {
        ...prev,
        perguntasPersonalizadas: [...(prev.perguntasPersonalizadas ?? []), novaP]
      };
    });
    setNovaPergunta({ pergunta: '', tipo: 'sim_nao', obrigatoria: false });
  };

  const removerPergunta = (id: string) => {
    setEditPacote(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        perguntasPersonalizadas: (prev.perguntasPersonalizadas ?? []).filter(p => p.id !== id)
      };
    });
  };
  const carregarDisponibilidade = useCallback(async () => {
    const dataStr = dayjs(selectedDate).format('YYYY-MM-DD');
    setCarregandoDisponibilidade(true);
    try {
      const ref = doc(db, 'disponibilidade', dataStr);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const dados = snap.data();
        if (dados && typeof dados.horarios === 'object') {
          const normalizado = Object.entries(dados.horarios as Record<string, boolean>).reduce(
            (acc, [key, value]) => {
              if (value === false) {
                acc[key] = false;
              }
              return acc;
            },
            {} as Record<string, boolean>
          );
          setDisponibilidadeData(normalizado);
        } else {
          setDisponibilidadeData({});
        }
      } else {
        setDisponibilidadeData({});
      }
    } catch (error) {
      console.error('Erro ao carregar disponibilidade:', error);
      setDisponibilidadeData({});
    } finally {
      setCarregandoDisponibilidade(false);
    }
  }, [selectedDate]);

  const salvarDisponibilidade = async () => {
    const dataStr = dayjs(selectedDate).format('YYYY-MM-DD');
    setSalvandoDisponibilidade(true);
    try {
      const ref = doc(db, 'disponibilidade', dataStr);
      if (Object.keys(disponibilidadeData).length > 0) {
        await setDoc(ref, { data: dataStr, horarios: disponibilidadeData });
      } else {
        await deleteDoc(ref);
      }
      setFeedback({ type: 'success', message: 'Disponibilidade atualizada!' });
      setModalDisponibilidade(false);
    } catch (error) {
      console.error('Erro ao salvar disponibilidade:', error);
      setFeedback({ type: 'error', message: 'Erro ao salvar disponibilidade.' });
    } finally {
      setSalvandoDisponibilidade(false);
    }
  };

  useEffect(() => {
    if (modalDisponibilidade) {
      carregarDisponibilidade();
    }
  }, [modalDisponibilidade, carregarDisponibilidade]);




  // Pesquisa Clientes
  const pesquisarClientes = async () => {
    if (!termoPesquisa.trim()) return;
    setCarregandoPesquisa(true);
    try {
      const q = query(collection(db, 'reservas'));
      const snapshot = await getDocs(q);
      const matches = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Reserva))
        .filter(
          (r: Reserva) =>
            (r.nome && r.nome.toLowerCase().includes(termoPesquisa.toLowerCase())) ||
            (r.cpf && r.cpf.includes(termoPesquisa)) ||
            (r.telefone && r.telefone.includes(termoPesquisa))
        );
      setResultadosPesquisa(matches);
    } catch (e) {
      console.error('Erro na pesquisa de clientes:', e);
      setResultadosPesquisa([]);
    }
    setCarregandoPesquisa(false);
  };

  // Render
  return (
    <main className="min-h-screen bg-slate-100 py-8">
      {feedback && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
            feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Painel administrativo</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gestão inteligente</h1>
            <p className="mt-1 text-sm text-slate-500">
              Controle reservas, pacotes e disponibilidade em poucos cliques.
            </p>
          </div>

        </header>

        {/* Cards de estatísticas - apenas na aba reservas */}
        {aba === 'reservas' && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reservas do dia</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{totalReservasConfirmadas}</p>
                  <span className="text-xs text-slate-400">{Object.keys(reservas).length} horários ativos</span>
                </div>
                <span className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <FaCalendarAlt className="h-5 w-5" />
                </span>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Participantes</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{totalParticipantesConfirmados}</p>
                  <span className="text-xs text-slate-400">Confirmados hoje</span>
                </div>
                <span className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                  <FaUsers className="h-5 w-5" />
                </span>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Próximo bloqueio</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">
                    {proximaDataBloqueada ? proximaDataBloqueada.format('DD/MM/YYYY') : 'Sem bloqueios'}
                  </p>
                  <span className="text-xs text-slate-400">
                    {pacotes.reduce((acc, item) => acc + (item.datasBloqueadas?.length ?? 0), 0)} datas bloqueadas no total
                  </span>
                </div>
                <span className="rounded-full bg-amber-50 p-3 text-amber-500">
                  <FaChevronRight className="h-5 w-5" />
                </span>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pacotes ativos</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{totalPacotesAtivos}</p>
                  <span className="text-xs text-slate-400">{pacotesQueNaoAceitamPet} sem pet</span>
                </div>
                <span className="rounded-full bg-purple-50 p-3 text-purple-600">
                  <FaLayerGroup className="h-5 w-5" />
                </span>
              </div>
            </article>
          </section>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
          {abasDisponiveis.map(({ id, label, description, icon: Icon }) => {
            const ativo = aba === id;
            return (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`group flex min-w-[160px] flex-1 items-center gap-3 rounded-full px-4 py-2 text-left text-sm transition ${
                  ativo ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    ativo ? 'border-white bg-white text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{label}</span>
                  <span className={`text-[11px] ${ativo ? 'text-blue-100/90' : 'text-slate-400'}`}>{description}</span>
                </span>
              </button>
            );
          })}
        </nav>
        
        {/* Mobile Floating Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 right-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <>
            <div 
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="lg:hidden fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform">
              <div className="p-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {abasDisponiveis.map(({ id, label, description, icon: Icon }) => {
                  const ativo = aba === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setAba(id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${
                        ativo ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        ativo ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className={`text-sm ${ativo ? 'text-blue-100' : 'text-slate-500'}`}>{description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

      {/* ========== Reservas ========== */}
      {aba === 'reservas' && (
        <section className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-6">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => changeMonth(-1)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <FaChevronLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-sm font-semibold text-slate-700">
                    {dayjs(new Date(currentYear, currentMonth)).format('MMMM [de] YYYY')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <FaChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {diasDaSemanaCurto.map((dia) => (
                    <span key={dia} className="text-center">{dia}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2 text-sm">
                  {days.map((day, idx) => {
                    const isSelected =
                      !!day &&
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === currentMonth &&
                      selectedDate.getFullYear() === currentYear;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!day}
                        className={`flex h-10 items-center justify-center rounded-full text-xs font-medium transition ${
                          !day
                            ? 'cursor-default text-slate-300'
                            : isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        onClick={() => day && setSelectedDate(new Date(currentYear, currentMonth, day))}
                      >
                        {day || ''}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Dia selecionado: <span className="font-semibold text-slate-700">{dayjs(selectedDate).format('DD/MM/YYYY')}</span>
                </p>
                <button
                  onClick={() => setModalDisponibilidade(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
                >
                  <FaEdit className="h-4 w-4" />
                  Editar disponibilidade
                </button>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700">Resumo do dia</h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <dt>Reservas confirmadas</dt>
                    <dd className="font-semibold text-slate-900">{totalReservasConfirmadas}</dd>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <dt>Participantes</dt>
                    <dd className="font-semibold text-slate-900">{totalParticipantesConfirmados}</dd>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <dt>Horários ativos</dt>
                    <dd className="font-semibold text-slate-900">{Object.keys(reservas).length}</dd>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <dt>Combos cadastrados</dt>
                    <dd className="font-semibold text-slate-900">0</dd>
                  </div>
                </dl>
                <button
                  onClick={handleAddReserva}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <FaPlus className="h-4 w-4" />
                  Registrar reserva rapida
                </button>
              </article>
            </div>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Reservas de {dayjs(selectedDate).format('DD/MM/YYYY')}
                  </h3>
                  <p className="text-sm text-slate-500">Resumo em tempo real das reservas confirmadas.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={filtroAtividade}
                    onChange={(e) => setFiltroAtividade(e.target.value)}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Todas as atividades</option>
                    {[...new Set(Object.values(reservas).flat().map(r => r.atividade))]
                      .filter(Boolean)
                      .sort()
                      .map(atividade => (
                        <option key={atividade} value={atividade}>{atividade}</option>
                      ))
                    }
                  </select>
                  <button
                    onClick={handleAddReserva}
                    className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 whitespace-nowrap"
                  >
                    <FaPlus className="h-4 w-4" />
                    Nova reserva
                  </button>
                </div>
              </div>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Reserva</th>
                      <th className="px-4 py-3 text-left">Nº Participantes</th>
                      <th className="px-4 py-3 text-center">Pet</th>
                      <th className="px-4 py-3 text-left">CPF</th>
                      <th className="px-4 py-3 text-left">Pacote</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {Object.keys(reservas).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                          Nenhuma reserva paga encontrada para esta data.
                        </td>
                      </tr>
                    ) : (
                      Object.keys(reservas)
                        .sort((a, b) => {
                          const aIndefinido = a.toLowerCase().includes('especificado');
                          const bIndefinido = b.toLowerCase().includes('especificado');
                          if (aIndefinido && !bIndefinido) return 1;
                          if (!aIndefinido && bIndefinido) return -1;
                          return a.localeCompare(b);
                        })
                        .map((horario) => {
                          const reservasPorHorario = reservas[horario];
                          const filtradas = reservasPorHorario.filter(
                            (reserva) => !filtroAtividade || reserva.atividade === filtroAtividade
                          );
                          if (filtradas.length === 0) return null;
                          const totalPessoas = filtradas.reduce(
                            (acc, reserva) => acc + calcularParticipantes(reserva),
                            0
                          );
                          const tituloHorario = horario.toLowerCase().includes('especificado')
                            ? 'Sem horário definido'
                            : horario;
                          return (
                            <React.Fragment key={horario}>
                              <tr className="bg-slate-50/70">
                                <td colSpan={7} className="px-6 py-3 text-sm font-semibold text-slate-700">
                                  <div className="flex items-center justify-between">
                                    <span>{tituloHorario}</span>
                                    <span className="text-xs font-normal text-slate-500">{totalPessoas} participante(s)</span>
                                  </div>
                                </td>
                              </tr>
                              {filtradas.map((reserva) => {
                                const participantes = calcularParticipantes(reserva);
                                const mensagem = encodeURIComponent(
                                  `Ol� ${reserva.nome}! Aqui � Vaga Fogo confirmando sua reserva para ${dayjs(reserva.data).format('DD/MM/YYYY')} �s ${reserva.horario}.`
                                );
                                const telefoneLimpo = (reserva.telefone || '').replace(/\D/g, '');
                                const telefoneComCodigo = telefoneLimpo.startsWith('55') ? telefoneLimpo : (telefoneLimpo ? `55${telefoneLimpo}` : '');
                                const whatsappUrl = telefoneComCodigo ? `https://wa.me/${telefoneComCodigo}?text=${mensagem}` : null;
                                const pacoteDescricao = formatarPacote(reserva);
                                const valorFormatado = formatarValor(reserva.valor);
                                const reservaKey = reserva.id ?? `${reserva.nome || 'reserva'}-${reserva.cpf || 'cpf'}-${reserva.horario}-${reserva.data}`;
                                const perguntasRespondidas = obterPerguntasComResposta(reserva);
                                const podeExibirIconeMesa = desejaJuntarMesa(reserva) && perguntasRespondidas.length > 0;
                                const detalhesAbertos = reservaDetalhesAberta === reservaKey;

                                return (
                                  <React.Fragment key={reservaKey}>
                                    <tr className="transition hover:bg-slate-50/70">
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-slate-900">{reserva.nome || '---'}</span>
                                          {podeExibirIconeMesa && (
                                            <button
                                              type="button"
                                              onClick={() => toggleDetalhesReserva(reservaKey)}
                                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                                                detalhesAbertos
                                                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                  : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600'
                                              }`}
                                              aria-label="Ver respostas personalizadas"
                                              aria-pressed={detalhesAbertos}
                                            >
                                              <FaChair className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="text-xs space-y-0.5">
                                          <div>Adulto: <span className="font-medium">{reserva.adultos ?? 0}</span></div>
                                          <div>Crian??a: <span className="font-medium">{reserva.criancas ?? 0}</span></div>
                                          <div>Bari?trico: <span className="font-medium">{reserva.bariatrica ?? 0}</span></div>
                                          <div>Nao pagante: <span className="font-medium">{reserva.naoPagante ?? 0}</span></div>
                                          <div className="border-t pt-0.5 mt-1 font-semibold text-slate-900">Total: {participantes}</div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                        <span className="text-xl">
                                          {reserva.temPet ? '?Y?' : '??O'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                                        {reserva.cpf || '---'}
                                      </td>
                                      <td className="px-4 py-4">
                                        {pacoteDescricao === '---' ? (
                                          <span className="text-slate-500">---</span>
                                        ) : (
                                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                                            {pacoteDescricao}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                                        {valorFormatado}
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank')}
                                            disabled={!whatsappUrl}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                            aria-label="Enviar mensagem no WhatsApp"
                                            title="WhatsApp"
                                          >
                                            <FaWhatsapp className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => handleEditReserva(reserva)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                                            aria-label="Editar reserva"
                                            title="Editar"
                                          >
                                            <FaEdit className="h-4 w-4" />
                                          </button>
                                          <button
                                            onClick={() => reserva.id && excluirReserva(reserva.id)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                            aria-label="Excluir reserva"
                                            title="Excluir"
                                          >
                                            <FaTrash className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    {detalhesAbertos && perguntasRespondidas.length > 0 && (
                                      <tr className="bg-amber-50/60">
                                        <td colSpan={7} className="px-6 pb-4">
                                          <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                              <p className="text-sm font-semibold text-slate-800">Respostas do cliente</p>
                                              <button
                                                type="button"
                                                onClick={() => toggleDetalhesReserva(reservaKey)}
                                                className="text-xs font-semibold text-amber-700 transition hover:text-amber-900"
                                              >
                                                Fechar
                                              </button>
                                            </div>
                                            <div className="mt-3">
                                              {renderPerguntasPersonalizadas(perguntasRespondidas)}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {Object.keys(reservas).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Nenhuma reserva paga encontrada para esta data.
                  </div>
                ) : (
                  Object.keys(reservas)
                    .sort((a, b) => {
                      const aIndefinido = a.toLowerCase().includes('especificado');
                      const bIndefinido = b.toLowerCase().includes('especificado');
                      if (aIndefinido && !bIndefinido) return 1;
                      if (!aIndefinido && bIndefinido) return -1;
                      return a.localeCompare(b);
                    })
                    .map((horario) => {
                      const reservasPorHorario = reservas[horario];
                      const filtradas = reservasPorHorario.filter(
                        (reserva) => !filtroAtividade || reserva.atividade === filtroAtividade
                      );
                      if (filtradas.length === 0) return null;
                      const totalPessoas = filtradas.reduce(
                        (acc, reserva) => acc + calcularParticipantes(reserva),
                        0
                      );
                      const tituloHorario = horario.toLowerCase().includes('especificado')
                        ? 'Sem horário definido'
                        : horario;
                      return (
                        <div key={horario} className="space-y-3">
                          <div className="bg-slate-100 px-4 py-2 rounded-lg">
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-slate-700">{tituloHorario}</h4>
                              <span className="text-sm text-slate-500">{totalPessoas} participante(s)</span>
                            </div>
                          </div>
                          {filtradas.map((reserva) => {
                            const participantes = calcularParticipantes(reserva);
                            const mensagem = encodeURIComponent(
                              `Ol� ${reserva.nome}! Aqui � Vaga Fogo confirmando sua reserva para ${dayjs(reserva.data).format('DD/MM/YYYY')} �s ${reserva.horario}.`
                            );
                            const telefoneLimpo = (reserva.telefone || '').replace(/\D/g, '');
                            const telefoneComCodigo = telefoneLimpo.startsWith('55') ? telefoneLimpo : (telefoneLimpo ? `55${telefoneLimpo}` : '');
                            const whatsappUrl = telefoneComCodigo ? `https://wa.me/${telefoneComCodigo}?text=${mensagem}` : null;
                            const pacoteDescricao = formatarPacote(reserva);
                            const valorFormatado = formatarValor(reserva.valor);
                            const reservaKey = reserva.id ?? `${reserva.nome || 'reserva'}-${reserva.cpf || 'cpf'}-${reserva.horario}-${reserva.data}`;
                            const perguntasRespondidas = obterPerguntasComResposta(reserva);
                            const podeExibirIconeMesa = desejaJuntarMesa(reserva) && perguntasRespondidas.length > 0;
                            const detalhesAbertos = reservaDetalhesAberta === reservaKey;

                            return (
                              <div key={reservaKey} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-slate-900">{reserva.nome || '---'}</h5>
                                      {podeExibirIconeMesa && (
                                        <button
                                          type="button"
                                          onClick={() => toggleDetalhesReserva(reservaKey)}
                                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                                            detalhesAbertos
                                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                                              : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600'
                                          }`}
                                          aria-label="Ver respostas personalizadas"
                                          aria-pressed={detalhesAbertos}
                                        >
                                          <FaChair className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right text-xs space-y-0.5">
                                    <div>Adulto: <span className="font-medium">{reserva.adultos ?? 0}</span></div>
                                    <div>Crian??a: <span className="font-medium">{reserva.criancas ?? 0}</span></div>
                                    <div>Bari?trico: <span className="font-medium">{reserva.bariatrica ?? 0}</span></div>
                                    <div>Nao pagante: <span className="font-medium">{reserva.naoPagante ?? 0}</span></div>
                                    <div className="border-t pt-0.5 mt-1 font-semibold text-slate-900">Total: {participantes}</div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">CPF</p>
                                    <span className="text-sm font-medium text-slate-700">{reserva.cpf || '---'}</span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Pacote</p>
                                    {pacoteDescricao === '---' ? (
                                      <span className="text-sm text-slate-500">---</span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                                        {pacoteDescricao}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Pet</p>
                                    <span className="text-lg">
                                      {reserva.temPet ? '?Y?' : '??O'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Valor</p>
                                    <span className="font-medium text-slate-900">{valorFormatado}</span>
                                  </div>
                                </div>
                                {detalhesAbertos && perguntasRespondidas.length > 0 && (
                                  <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
                                    <p className="text-xs font-semibold uppercase text-amber-700">Respostas do cliente</p>
                                    <div className="mt-2">
                                      {renderPerguntasPersonalizadas(perguntasRespondidas)}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-500">{reserva.telefone ? `Tel: ${reserva.telefone}` : 'Tel: ---'}</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank')}
                                      disabled={!whatsappUrl}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                      aria-label="Enviar mensagem no WhatsApp"
                                      title="WhatsApp"
                                    >
                                      <FaWhatsapp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEditReserva(reserva)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                                      aria-label="Editar reserva"
                                      title="Editar"
                                    >
                                      <FaEdit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => reserva.id && excluirReserva(reserva.id)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                      aria-label="Excluir reserva"
                                      title="Excluir"
                                    >
                                      <FaTrash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                )}
              </div>
            </article>
          </div>

          {modalReserva && editReserva && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-2 py-2 overflow-y-auto">
              <div className="w-full max-w-3xl my-4 overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {isEditingReserva ? 'Editar reserva' : 'Nova reserva'}
                  </h4>
                  <button
                    onClick={() => setModalReserva(false)}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    x
                  </button>
                </div>
                <div className="grid gap-4 px-4 sm:px-6 py-5 md:grid-cols-2 max-h-[80vh] overflow-y-auto">
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Nome
                    <input
                      type="text"
                      value={editReserva.nome}
                      onChange={(e) => setEditReserva({ ...editReserva, nome: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    CPF
                    <input
                      type="text"
                      value={editReserva.cpf}
                      onChange={(e) => setEditReserva({ ...editReserva, cpf: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Telefone
                    <input
                      type="text"
                      value={editReserva.telefone}
                      onChange={(e) => setEditReserva({ ...editReserva, telefone: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Data
                    <input
                      type="date"
                      value={editReserva.data}
                      onChange={(e) => setEditReserva({ ...editReserva, data: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Adultos
                    <input
                      type="number"
                      min={0}
                      value={editReserva.adultos ?? 0}
                      onChange={(e) => setEditReserva({ ...editReserva, adultos: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Crianças
                    <input
                      type="number"
                      min={0}
                      value={editReserva.criancas ?? 0}
                      onChange={(e) => setEditReserva({ ...editReserva, criancas: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Não pagante
                    <input
                      type="number"
                      min={0}
                      value={editReserva.naoPagante ?? 0}
                      onChange={(e) => setEditReserva({ ...editReserva, naoPagante: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Bariátrica
                    <input
                      type="number"
                      min={0}
                      value={editReserva.bariatrica ?? 0}
                      onChange={(e) => setEditReserva({ ...editReserva, bariatrica: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Horário
                    <input
                      type="time"
                      value={editReserva.horario}
                      onChange={(e) => setEditReserva({ ...editReserva, horario: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Atividade
                    <select
                      value={editReserva.atividade}
                      onChange={(e) => setEditReserva({ ...editReserva, atividade: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Todas as atividades</option>
                      <option value="Trilha Ecológica">Trilha Ecológica</option>
                      <option value="Brunch Gastronômico">Brunch Gastronômico</option>
                      <option value="Brunch + trilha">Brunch + trilha</option>
                    </select>
                  </label>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Pet
                    <div className="mt-2 flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="radio"
                          name="editarPet"
                          checked={editReserva.temPet === true}
                          onChange={() => setEditReserva({ ...editReserva, temPet: true })}
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="radio"
                          name="editarPet"
                          checked={editReserva.temPet === false}
                          onChange={() => setEditReserva({ ...editReserva, temPet: false })}
                        />
                        Não
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
                  <button
                    onClick={() => setModalReserva(false)}
                    className="w-full sm:w-auto rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveReserva}
                    className="w-full sm:w-auto rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Salvar reserva
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

            {/* ========== Pacotes ========== */}
      {aba === 'pacotes' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Pacotes cadastrados</h2>
              <p className="text-sm text-slate-500">
                {totalPacotesAtivos} pacotes ativos prontos para venda.
              </p>
            </div>
            <button
              onClick={handleAddPacote}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <FaPlus className="h-4 w-4" />
              Novo pacote
            </button>
          </div>
          {pacotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              Nenhum pacote cadastrado. Clique em "Novo pacote" para começar.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pacotes.map((pacote) => {
                const diasLabel = pacote.dias.length > 0 ? pacote.dias.map((i) => diasDaSemana[i]).join(', ') : 'Todos os dias';
                const horariosLabel =
                  pacote.modoHorario === 'intervalo' && pacote.horarioInicio && pacote.horarioFim
                    ? `${pacote.horarioInicio} - ${pacote.horarioFim} (faixa)`
                    : pacote.horarios.join(', ') || 'Sob consulta';
                return (
                  <article key={pacote.id} className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{pacote.tipo || 'Atividade'}</p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-900">{pacote.nome}</h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pacote.aceitaPet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                      {pacote.aceitaPet ? 'Aceita pets' : 'Não aceita pets'}
                        </span>
                      </div>
                      <dl className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-start justify-between gap-2">
                          <dt className="font-medium text-slate-500">Dias</dt>
                          <dd className="text-right text-slate-800">{diasLabel}</dd>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <dt className="font-medium text-slate-500">Horário</dt>
                          <dd className="text-right text-slate-800">{horariosLabel}</dd>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valores</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                            <span className="rounded-full bg-slate-100 px-2 py-1">Adulto R$ {Number(pacote.precoAdulto).toLocaleString('pt-BR')}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">Criança R$ {Number(pacote.precoCrianca).toLocaleString('pt-BR')}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">Bariátrica R$ {Number(pacote.precoBariatrica).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Limite por horário</span>
                          <span className="font-semibold text-slate-800">{pacote.limite}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Datas bloqueadas</span>
                          <span className="font-semibold text-slate-800">{pacote.datasBloqueadas?.length ?? 0}</span>
                        </div>
                      </dl>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                      <button
                        onClick={() => pacote.id && excluirPacote(pacote.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                      <button
                        onClick={() => handleEditPacote(pacote)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}





          {modalPacote && editPacote && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-2 py-2 overflow-y-auto">
              <div className="w-full max-w-3xl my-4 overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {isEditingPacote ? 'Editar pacote' : 'Novo pacote'}
                  </h4>
                  <button
                    onClick={() => {
                      setModalPacote(false);
                      setEditPacote(null);
                      setNovaDataBloqueada('');
                    }}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    x
                  </button>
                </div>
                <div className="grid gap-4 px-4 sm:px-6 py-5 md:grid-cols-2 max-h-[80vh] overflow-y-auto">
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Nome da atividade
                    <input
                      value={editPacote.nome}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, nome: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Tipo de atividade
                    <input
                      value={editPacote.tipo}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, tipo: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Preço adulto
                    <input
                      type="number"
                      value={editPacote.precoAdulto}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, precoAdulto: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Preço criança
                    <input
                      type="number"
                      value={editPacote.precoCrianca}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, precoCrianca: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Preço bariátrica
                    <input
                      type="number"
                      value={editPacote.precoBariatrica}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, precoBariatrica: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Limite por horário
                    <input
                      type="number"
                      value={editPacote.limite}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, limite: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </label>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Política de pets
                    <div className="mt-2 flex gap-4 text-xs font-medium text-slate-600">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="aceitaPet"
                          checked={editPacote.aceitaPet}
                          onChange={() => setEditPacote((f) => ({ ...f!, aceitaPet: true }))}
                        />
                        Aceita
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="aceitaPet"
                          checked={!editPacote.aceitaPet}
                          onChange={() => setEditPacote((f) => ({ ...f!, aceitaPet: false }))}
                        />
                        Não aceita
                      </label>
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">
                    Dias disponíveis
                    <div className="mt-2 flex flex-wrap gap-2">
                      {diasDaSemana.map((dia, index) => {
                        const ativo = editPacote.dias.includes(index);
                        return (
                          <button
                            key={dia}
                            type="button"
                            onClick={() =>
                              setEditPacote((f) => ({
                                ...f!,
                                dias: ativo ? f!.dias.filter((d) => d !== index) : [...f!.dias, index],
                              }))
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              ativo ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {dia}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">
                    Formato de horários
                    <select
                      value={editPacote.modoHorario ?? 'lista'}
                      onChange={(e) => setEditPacote((f) => ({ ...f!, modoHorario: e.target.value as 'lista' | 'intervalo' }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="lista">Horários fixos</option>
                      <option value="intervalo">Faixa contínua</option>
                    </select>
                  </div>
                  {editPacote.modoHorario === 'intervalo' ? (
                    <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Horário inicial
                        <input
                          type="time"
                          value={editPacote.horarioInicio ?? ''}
                          onChange={(e) => setEditPacote((f) => ({ ...f!, horarioInicio: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Horário final
                        <input
                          type="time"
                          value={editPacote.horarioFim ?? ''}
                          onChange={(e) => setEditPacote((f) => ({ ...f!, horarioFim: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                      <p className="md:col-span-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        {faixaHorarioDescricao || 'Informe horário inicial e final para exibir apenas a faixa ao cliente.'}
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">
                      Horários disponíveis
                      <div className="mt-2 flex flex-wrap gap-2">
                        {horariosDisponiveis.map((horario) => {
                          const ativo = editPacote.horarios.includes(horario);
                          return (
                            <button
                              key={horario}
                              type="button"
                              onClick={() =>
                                setEditPacote((f) => ({
                                  ...f!,
                                  horarios: ativo ? f!.horarios.filter((h) => h !== horario) : [...f!.horarios, horario],
                                }))
                              }
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                ativo ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {horario}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">
                    Datas sem disponibilidade
                    <div className="mt-2 flex gap-2">
                      <input
                        type="date"
                        value={novaDataBloqueada}
                        onChange={(e) => setNovaDataBloqueada(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <button
                        type="button"
                        onClick={adicionarDataBloqueada}
                        disabled={!novaDataBloqueada}
                        className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                          novaDataBloqueada ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
                        }`}
                      >
                        Adicionar
                      </button>
                    </div>
                    {(editPacote.datasBloqueadas?.length ?? 0) > 0 ? (
                      <ul className="mt-3 max-h-32 space-y-2 overflow-y-auto">
                        {editPacote.datasBloqueadas?.map((data) => (
                          <li key={data} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <span>{dayjs(data).format('DD/MM/YYYY')}</span>
                            <button
                              type="button"
                              onClick={() => removerDataBloqueada(data)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">Nenhuma data bloqueada.</p>
                    )}
                  </div>
                  
                  <div className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">
                    Perguntas personalizadas para o cliente
                    <div className="mt-2 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Juntar mesa?"
                          value={novaPergunta.pergunta}
                          onChange={(e) => setNovaPergunta(prev => ({ ...prev, pergunta: e.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <select
                          value={novaPergunta.tipo}
                          onChange={(e) => setNovaPergunta(prev => ({ ...prev, tipo: e.target.value as 'sim_nao' | 'texto' }))}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="sim_nao">Sim/Não</option>
                          <option value="texto">Texto</option>
                        </select>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={novaPergunta.obrigatoria}
                            onChange={(e) => setNovaPergunta(prev => ({ ...prev, obrigatoria: e.target.checked }))}
                          />
                          Obrigatória
                        </label>
                        <button
                          type="button"
                          onClick={adicionarPergunta}
                          disabled={!novaPergunta.pergunta.trim()}
                          className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                            novaPergunta.pergunta.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
                          }`}
                        >
                          Adicionar
                        </button>
                      </div>
                      
                      {(editPacote.perguntasPersonalizadas?.length ?? 0) > 0 ? (
                        <ul className="space-y-2">
                          {editPacote.perguntasPersonalizadas?.map((pergunta) => (
                            <li key={pergunta.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                              <div>
                                <span className="font-medium text-slate-700">{pergunta.pergunta}</span>
                                <span className="ml-2 text-slate-500">({pergunta.tipo === 'sim_nao' ? 'Sim/Não' : 'Texto'})</span>
                                {pergunta.obrigatoria && <span className="ml-1 text-red-500">*</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => removerPergunta(pergunta.id)}
                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                              >
                                Remover
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400">Nenhuma pergunta personalizada.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
                  <button
                    onClick={() => {
                      setModalPacote(false);
                      setEditPacote(null);
                      setNovaDataBloqueada('');
                    }}
                    className="w-full sm:w-auto rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePacote}
                    className="w-full sm:w-auto rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Salvar pacote
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Modal Editar Disponibilidade */}
          {modalDisponibilidade && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-2 py-2 overflow-y-auto">
              <div className="w-full max-w-4xl my-4 overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4">
                  <h4 className="text-lg font-semibold text-slate-900">
                    Editar disponibilidade - {dayjs(selectedDate).format('DD/MM/YYYY')}
                  </h4>
                  <button
                    onClick={() => setModalDisponibilidade(false)}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    x
                  </button>
                </div>
                <div className="px-4 sm:px-6 py-5 max-h-[80vh] overflow-y-auto">
                  {carregandoDisponibilidade ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Carregando disponibilidade...
                    </div>
                  ) : pacotes.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">
                      Nenhum pacote cadastrado para configurar disponibilidade.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pacotes.map((pacote) => {
                      const dataStr = dayjs(selectedDate).format('YYYY-MM-DD');
                      const pacoteKey = `${dataStr}-${pacote.id}`;
                      
                      return (
                        <div key={pacote.id} className="border border-slate-200 rounded-lg p-4">
                          <h5 className="font-semibold text-slate-900 mb-3">
                            {pacote.emoji} {pacote.nome}
                          </h5>
                          
                          {pacote.modoHorario === 'intervalo' ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <p className="text-sm text-yellow-700">
                                Este pacote funciona em faixa de horário ({pacote.horarioInicio} - {pacote.horarioFim}).
                                Para bloquear, adicione a data nas "Datas sem disponibilidade" do pacote.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {pacote.horarios.map((horario) => {
                                const horarioKey = `${pacoteKey}-${horario}`;
                                const isDisponivel = disponibilidadeData[horarioKey] !== false;
                                
                                return (
                                  <button
                                    key={horario}
                                    type="button"
                                    onClick={() => {
                                      setDisponibilidadeData(prev => {
                                        const proximo = { ...prev };
                                        if (isDisponivel) {
                                          proximo[horarioKey] = false;
                                        } else {
                                          delete proximo[horarioKey];
                                        }
                                        return proximo;
                                      });
                                    }}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                      isDisponivel
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-red-100 text-red-700 border border-red-200'
                                    }`}
                                  >
                                    {horario}
                                    <br />
                                    <span className="text-xs">
                                      {isDisponivel ? 'Disponível' : 'Bloqueado'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
                  <button
                    onClick={() => setModalDisponibilidade(false)}
                    className="w-full sm:w-auto rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={salvarDisponibilidade}
                    disabled={salvandoDisponibilidade || carregandoDisponibilidade}
                    className={`w-full sm:w-auto rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                      salvandoDisponibilidade || carregandoDisponibilidade
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {salvandoDisponibilidade ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
      {/* ========== Pesquisa de Clientes ========== */}
      {aba === 'pesquisa' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Pesquisa de clientes</h2>
              <p className="text-sm text-slate-500">Localize reservas por nome, CPF ou telefone.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pesquisarClientes();
            }}
            className="mt-4 flex flex-col gap-3 md:flex-row"
          >
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Termo de busca
                <input
                  type="text"
                  value={termoPesquisa}
                  onChange={(e) => setTermoPesquisa(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ex: Ana Silva, 00000000000, 629999999"
                />
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FaSearch className="h-4 w-4" />
                Pesquisar
              </button>
            </div>
          </form>
          {carregandoPesquisa ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Buscando resultados...
            </div>
          ) : resultadosPesquisa.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">CPF</th>
                    <th className="px-4 py-3 text-left">Telefone</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultadosPesquisa.map((resultado) => (
                    <tr key={resultado.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-800">{resultado.nome}</td>
                      <td className="px-4 py-3 text-slate-600">{resultado.cpf}</td>
                      <td className="px-4 py-3 text-slate-600">{resultado.telefone}</td>
                      <td className="px-4 py-3 text-slate-600">{resultado.data}</td>
                      <td className="px-4 py-3 text-slate-600">{resultado.atividade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              Nenhum cliente encontrado para o termo informado.
            </div>
          )}
        </section>
      )}
      </div>
    </main>
  );
}

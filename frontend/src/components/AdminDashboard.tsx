import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import {collection,query, where, getDocs, doc, deleteDoc,updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { FaChevronLeft, FaChevronRight, FaTrash, FaEdit, FaPlus, FaWhatsapp, FaBox, FaSearch } from 'react-icons/fa';

import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);
dayjs.locale('pt-br');

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
}

interface Pacote {
  id?: string;
  nome: string;
  tipo: string;
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
  pacotesCombinados?: string[];
  aceitaPet: boolean;
}

const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const diasDaSemanaCurto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const horariosDisponiveis = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '18:00'
];

const ordenarHorarios = (lista: string[]) => (
  [...lista].sort((a, b) => a.localeCompare(b))
);

export default function AdminDashboard() {
  const [aba, setAba] = useState<'reservas' | 'pacotes' | 'pesquisa'>('reservas');

  // Reservas
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservas, setReservas] = useState<Record<string, Reserva[]>>({});
  const [editReserva, setEditReserva] = useState<Reserva | null>(null);
  const [modalReserva, setModalReserva] = useState(false);
  const [isEditingReserva, setIsEditingReserva] = useState(false);
  const [filtroAtividade, setFiltroAtividade] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Pacotes
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [modalPacote, setModalPacote] = useState(false);
  const [editPacote, setEditPacote] = useState<Pacote | null>(null);
  const [isEditingPacote, setIsEditingPacote] = useState(false);
  const [novaDataBloqueada, setNovaDataBloqueada] = useState('');
  const faixaHorarioDescricao = editPacote?.modoHorario === 'intervalo'
    && (editPacote.horarioInicio ?? '')
    && (editPacote.horarioFim ?? '')
    ? `Disponivel das ${editPacote.horarioInicio} as ${editPacote.horarioFim}. O cliente vera apenas a faixa.`
    : '';
  const pacotesPorId = useMemo(() => {
    const mapa: Record<string, Pacote> = {};
    pacotes.forEach(p => {
      if (p.id) mapa[p.id] = p;
    });
    return mapa;
  }, [pacotes]);

  // Pesquisa Clientes
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Reserva[]>([]);
  const [carregandoPesquisa, setCarregandoPesquisa] = useState(false);

  // Reservas Logic
  const fetchReservas = async (date: Date) => {
    const formatted = dayjs(date).format('YYYY-MM-DD');
    try {
      const q = query(collection(db, 'reservas'), where('data', '==', formatted));
      const snapshot = await getDocs(q);
      const dados: Reserva[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reserva));
      const reservasPagas = dados.filter(r => r.status === 'pago');
      const reservasPorHorario = reservasPagas.reduce((acc, reserva) => {
        const horario = reserva.horario || 'Não especificado';
        if (!acc[horario]) acc[horario] = [];
        acc[horario].push(reserva);
        return acc;
      }, {} as Record<string, Reserva[]>);
      setReservas(reservasPorHorario);
    } catch (error) {
      setReservas({});
    }
  };

  useEffect(() => {
    fetchReservas(selectedDate);
  }, [selectedDate]);

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
      } catch (error) { }
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

  function calcularParticipantes(reserva: Reserva) {
    return (
      (reserva.adultos ?? 0) +
      (reserva.criancas ?? 0) +
      (reserva.naoPagante ?? 0) +
      (reserva.bariatrica ?? 0)
    );
  }

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
        pacotesCombinados: Array.isArray(data.pacotesCombinados) ? data.pacotesCombinados.filter(Boolean) : [],
      } as Pacote;
    });
    setPacotes(lista);
  };

  useEffect(() => {
    if (aba === 'pacotes') fetchPacotes();
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
      pacotesCombinados: Array.isArray(pacote.pacotesCombinados) ? [...pacote.pacotesCombinados] : [],
    });
    setNovaDataBloqueada('');
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
      pacotesCombinados: [],
    });
    setNovaDataBloqueada('');
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
    const pacotesCombinados = Array.from(new Set(editPacote.pacotesCombinados ?? []))
      .filter(id => Boolean(id) && id !== editPacote.id);

    let horariosCalculados: string[] = [];

    if (modoHorario === 'intervalo') {
      if (!horarioInicio || !horarioFim) {
        setFeedback({ type: 'error', message: 'Informe horario inicial e final.' });
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
      pacotesCombinados,
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
      setResultadosPesquisa([]);
    }
    setCarregandoPesquisa(false);
  };

  // Render
  return (
    <main className="min-h-screen w-full bg-gray-50">
      {/* Feedback */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-[99] px-6 py-2 rounded shadow transition-all text-white ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {feedback.message}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-2 mb-6 p-4 bg-white shadow w-full">
        <button onClick={() => setAba('reservas')}
          className={`px-3 py-1 rounded ${aba === 'reservas' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
          <FaPlus className="inline mr-1" /> Reservas
        </button>
        <button onClick={() => setAba('pacotes')}
          className={`px-3 py-1 rounded ${aba === 'pacotes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
          <FaBox className="inline mr-1" /> Pacotes
        </button>
        <button onClick={() => setAba('pesquisa')}
          className={`px-3 py-1 rounded ${aba === 'pesquisa' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
          <FaSearch className="inline mr-1" /> Pesquisa de Clientes
        </button>
      </div>

      {/* ========== Reservas ========== */}
      {aba === 'reservas' && (
        <>
          {/* Calendário */}
          <section className="bg-white p-4 rounded shadow mb-6 w-full">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => changeMonth(-1)}><FaChevronLeft /></button>
              <h2 className="text-lg font-bold">{dayjs(new Date(currentYear, currentMonth)).format('MMMM [de] YYYY')}</h2>
              <button onClick={() => changeMonth(1)}><FaChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {diasDaSemanaCurto.map(dia => (
                <div key={dia} className="text-center font-semibold text-gray-600 text-sm">{dia}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const isSelected = day && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
                return (
                  <div
                    key={idx}
                    className={`text-center p-2 rounded cursor-pointer transition-all h-10 flex items-center justify-center text-xs font-medium ${day ? (isSelected ? 'bg-green-600 text-white' : 'bg-green-100 hover:bg-green-200') : ''}`}
                    onClick={() => day && setSelectedDate(new Date(currentYear, currentMonth, day))}
                  >
                    {day || ''}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reservas Tabela */}
          <section className="bg-white p-4 rounded shadow w-full">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h3 className="text-base font-bold">
                  Agendamentos para: {dayjs(selectedDate).format('DD/MM/YYYY')}
                </h3>
                <select
                  value={filtroAtividade}
                  onChange={(e) => setFiltroAtividade(e.target.value)}
                  className="border px-2 py-1 rounded text-xs"
                >
                  <option value="">Todas Atividades</option>
                  <option value="Trilha Ecológica">Trilha Ecológica</option>
                  <option value="Brunch Gastronômico">Brunch Gastronômico</option>
                  <option value="Brunch + trilha">Brunch + trilha</option>
                </select>
              </div>
              <button onClick={handleAddReserva} className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2 text-sm">
                <FaPlus /> Nova Reserva
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Reservista</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Adultos</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Criança</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Não Pagante</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Bariátrica</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Participantes</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Pet</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Atividade</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Valor</th>
                    <th className="px-2 py-2 font-medium text-left text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(reservas).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-2 py-3 text-gray-500 text-xs">Nenhuma reserva paga encontrada.</td>
                    </tr>
                  ) : (
                    Object.keys(reservas)
                      .sort((a, b) => {
                        if (a === 'Não especificado') return 1;
                        if (b === 'Não especificado') return -1;
                        return a.localeCompare(b);
                      })
                      .map(horario => {
                        const reservasPorHorario = reservas[horario];
                        const filtradas = reservasPorHorario.filter(r =>
                          !filtroAtividade || r.atividade === filtroAtividade
                        );
                        if (filtradas.length === 0) return null;
                        const totalPessoas = filtradas.reduce((acc, r) => acc + calcularParticipantes(r), 0);
                        return (
                          <React.Fragment key={horario}>
                            <tr>
                              <td colSpan={10} className="font-bold bg-gray-100 text-gray-700 px-2 py-2">
                                {horario} - {totalPessoas} pessoa{totalPessoas > 1 ? 's' : ''}
                              </td>
                            </tr>
                            {filtradas.map(r => (
                              <tr key={r.id} className="border-t">
                                <td className="px-2 py-2">{r.nome}</td>
                                <td className="px-2 py-2">{r.adultos ?? 0}</td>
                                <td className="px-2 py-2">{r.criancas ?? 0}</td>
                                <td className="px-2 py-2">{r.naoPagante ?? 0}</td>
                                <td className="px-2 py-2">{r.bariatrica ?? 0}</td>
                                <td className="px-2 py-2">{calcularParticipantes(r)}</td>
                                <td className="px-2 py-2">{r.temPet ? '🐕 Sim' : 'Não'}</td>
                                <td className="px-2 py-2">{r.atividade}</td>
                                <td className="px-2 py-2">
                                  {r.valor !== undefined
                                    ? r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    : '-'}
                                </td>
                                <td className="px-2 py-2 flex gap-1">
                                  <a
                                    href={`https://wa.me/55${r.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-800 flex items-center justify-center rounded-full bg-green-50 w-8 h-8 text-xl"
                                    title="Enviar WhatsApp"
                                  >
                                    <FaWhatsapp />
                                  </a>
                                  <button
                                    onClick={() => handleEditReserva(r)}
                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button
                                    onClick={() => excluirReserva(r.id!)}
                                    className="text-red-600 hover:underline flex items-center gap-1"
                                  >
                                    <FaTrash />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Reserva */}
            {modalReserva && editReserva && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded shadow w-full max-w-md">
                  <h4 className="text-base font-bold mb-2">{isEditingReserva ? 'Editar' : 'Nova'} Reserva</h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <label className="block text-xs">Nome:
                      <input
                        type="text"
                        value={editReserva.nome}
                        onChange={e => setEditReserva({ ...editReserva, nome: e.target.value })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">CPF:
                      <input
                        type="text"
                        value={editReserva.cpf}
                        onChange={e => setEditReserva({ ...editReserva, cpf: e.target.value })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Telefone:
                      <input
                        type="text"
                        value={editReserva.telefone}
                        onChange={e => setEditReserva({ ...editReserva, telefone: e.target.value })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Data:
                      <input
                        type="date"
                        value={editReserva.data}
                        onChange={e => setEditReserva({ ...editReserva, data: e.target.value })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Adultos:
                      <input
                        type="number"
                        value={editReserva.adultos ?? 0}
                        min={0}
                        onChange={e => setEditReserva({ ...editReserva, adultos: Number(e.target.value) })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Crianças:
                      <input
                        type="number"
                        value={editReserva.criancas ?? 0}
                        min={0}
                        onChange={e => setEditReserva({ ...editReserva, criancas: Number(e.target.value) })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Não Pagante:
                      <input
                        type="number"
                        value={editReserva.naoPagante ?? 0}
                        min={0}
                        onChange={e => setEditReserva({ ...editReserva, naoPagante: Number(e.target.value) })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Bariátrica:
                      <input
                        type="number"
                        value={editReserva.bariatrica ?? 0}
                        min={0}
                        onChange={e => setEditReserva({ ...editReserva, bariatrica: Number(e.target.value) })}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                  </div>
                  <label className="block text-xs mb-2">Horário:
                    <input
                      type="time"
                      value={editReserva.horario}
                      onChange={e => setEditReserva({ ...editReserva, horario: e.target.value })}
                      className="w-full border px-2 py-1 rounded mt-1 text-xs"
                    />
                  </label>
                  <label className="block text-xs mb-2">Pet:
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="editPet"
                          checked={editReserva.temPet === true}
                          onChange={() => setEditReserva({ ...editReserva, temPet: true })}
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="editPet"
                          checked={editReserva.temPet === false}
                          onChange={() => setEditReserva({ ...editReserva, temPet: false })}
                        />
                        Não
                      </label>
                    </div>
                  </label>
                  <label className="block text-xs mb-2">Atividade:
                    <select
                      value={editReserva.atividade}
                      onChange={e => setEditReserva({ ...editReserva, atividade: e.target.value })}
                      className="w-full border px-2 py-1 rounded mt-1 text-xs"
                    >
                      <option value="">Todas Atividades</option>
                      <option value="Trilha Ecológica">Trilha Ecológica</option>
                      <option value="Brunch Gastronômico">Brunch Gastronômico</option>
                      <option value="Brunch + trilha">Brunch + trilha</option>
                    </select>
                  </label>
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setModalReserva(false)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs">Cancelar</button>
                    <button onClick={handleSaveReserva} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Salvar</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ========== Pacotes ========== */}
      {aba === 'pacotes' && (
        <section className="bg-white p-4 rounded shadow w-full">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold">Pacotes</h2>
            <button onClick={handleAddPacote} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
              <FaPlus /> Novo Pacote
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left">Nome</th>
                  <th className="px-2 py-2 text-left">Tipo</th>
                  <th className="px-2 py-2 text-left">Preço Adulto</th>
                  <th className="px-2 py-2 text-left">Preço Criança</th>
                  <th className="px-2 py-2 text-left">Preço Bariátrica</th>
                  <th className="px-2 py-2 text-left">Dias</th>
                  <th className="px-2 py-2 text-left">Horários</th>
                  <th className="px-2 py-2 text-left">Limite</th>
                  <th className="px-2 py-2 text-left">Combos</th>
                  <th className="px-2 py-2 text-left">Pets</th>
                  <th className="px-2 py-2 text-left">Datas bloqueadas</th>
                  <th className="px-2 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {pacotes.map(p => (
                  <tr key={p.id}>
                    <td className="px-2 py-1">{p.nome}</td>
                    <td className="px-2 py-1">{p.tipo}</td>
                    <td className="px-2 py-1">R$ {Number(p.precoAdulto).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1">R$ {Number(p.precoCrianca).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1">R$ {Number(p.precoBariatrica).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1">{p.dias.map(i => diasDaSemana[i]).join(', ') || '-'}</td>
                    <td className="px-2 py-1">
                      {p.modoHorario === 'intervalo' && p.horarioInicio && p.horarioFim
                        ? `${p.horarioInicio} - ${p.horarioFim} (faixa)`
                        : p.horarios.join(', ') || '-'}
                    </td>
                    <td className="px-2 py-1">{p.limite}</td>
                    <td className="px-2 py-1 text-xs">
                      {p.pacotesCombinados && p.pacotesCombinados.length > 0
                        ? p.pacotesCombinados
                            .map(id => pacotesPorId[id]?.nome || 'Pacote removido')
                            .join(', ')
                        : '-'}
                    </td>
                    <td className="px-2 py-1">
                      <span className={p.aceitaPet ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {p.aceitaPet ? 'Aceita pets' : 'Nao aceita pets'}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      {p.datasBloqueadas && p.datasBloqueadas.length > 0
                        ? `${p.datasBloqueadas.length} dia(s)`
                        : '-'}
                    </td>
                    <td className="px-2 py-1 flex gap-1">
                      <button className="text-blue-600" onClick={() => handleEditPacote(p)}>Editar</button>
                      <button className="text-red-600" onClick={() => excluirPacote(p.id!)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Pacote */}
          {modalPacote && editPacote && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded shadow w-full max-w-lg max-h-[95vh] overflow-y-auto">
                <h4 className="font-bold mb-2">{isEditingPacote ? 'Editar' : 'Novo'} Pacote</h4>
                <label className="block mb-1 text-xs">Nome da atividade:
                  <input value={editPacote.nome} onChange={e => setEditPacote(f => ({ ...f!, nome: e.target.value }))} className="w-full border px-2 py-1 rounded" />
                </label>
                <label className="block mb-1 text-xs">Tipo de atividade:
                  <input value={editPacote.tipo} onChange={e => setEditPacote(f => ({ ...f!, tipo: e.target.value }))} className="w-full border px-2 py-1 rounded" />
                </label>
                <label className="block mb-1 text-xs">Preço Adulto:
                  <input type="number" value={editPacote.precoAdulto} onChange={e => setEditPacote(f => ({ ...f!, precoAdulto: Number(e.target.value) }))} className="w-full border px-2 py-1 rounded" />
                </label>
                <label className="block mb-1 text-xs">Preço Criança:
                  <input type="number" value={editPacote.precoCrianca} onChange={e => setEditPacote(f => ({ ...f!, precoCrianca: Number(e.target.value) }))} className="w-full border px-2 py-1 rounded" />
                </label>
                <label className="block mb-1 text-xs">Preço Bariátrica:
                  <input type="number" value={editPacote.precoBariatrica} onChange={e => setEditPacote(f => ({ ...f!, precoBariatrica: Number(e.target.value) }))} className="w-full border px-2 py-1 rounded" />
                </label>
                <label className="block mb-1 text-xs">Limite disponível:
                  <input type="number" value={editPacote.limite} onChange={e => setEditPacote(f => ({ ...f!, limite: Number(e.target.value) }))} className="w-full border px-2 py-1 rounded" />
                </label>

                <label className="block mb-1 mt-2 text-xs font-semibold">Política de pets:</label>
                <div className="flex items-center gap-3 mb-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="aceitaPet"
                      checked={editPacote.aceitaPet}
                      onChange={() => setEditPacote(f => ({ ...f!, aceitaPet: true }))}
                    />
                    Aceita pets
                  </label>
                  <label className="flex items-center gap-1 text-red-600">
                    <input
                      type="radio"
                      name="aceitaPet"
                      checked={!editPacote.aceitaPet}
                      onChange={() => setEditPacote(f => ({ ...f!, aceitaPet: false }))}
                    />
                    Nao aceita pets
                  </label>
                </div>

                <label className="block mb-1 mt-2 text-xs font-semibold">Dias disponíveis:</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {diasDaSemana.map((dia, i) => (
                    <label key={dia} className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={editPacote.dias.includes(i)}
                        onChange={e => setEditPacote(f => ({
                          ...f!,
                          dias: e.target.checked
                            ? [...f!.dias, i]
                            : f!.dias.filter(d => d !== i)
                        }))}
                        className="mr-1"
                      />
                      {dia}
                    </label>
                  ))}
                </div>

                <label className="block mb-1 mt-2 text-xs font-semibold">Formato de horarios:</label>
                <select
                  value={editPacote.modoHorario ?? 'lista'}
                  onChange={e => setEditPacote(f => ({ ...f!, modoHorario: e.target.value as 'lista' | 'intervalo' }))}
                  className="w-full border px-2 py-1 rounded text-xs mb-2"
                >
                  <option value="lista">Horários fixos</option>
                  <option value="intervalo">Faixa contínua</option>
                </select>

                <label className="block mb-1 text-xs font-semibold">
                  {editPacote.modoHorario === 'intervalo' ? 'Faixa de horarios:' : 'Horarios disponiveis:'}
                </label>
                {editPacote.modoHorario === 'intervalo' ? (
                  <div className="space-y-2 mb-2">
                    <label className="block text-xs">Horário inicial:
                      <input
                        type="time"
                        value={editPacote.horarioInicio ?? ''}
                        onChange={e => setEditPacote(f => ({ ...f!, horarioInicio: e.target.value }))}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <label className="block text-xs">Horário final:
                      <input
                        type="time"
                        value={editPacote.horarioFim ?? ''}
                        onChange={e => setEditPacote(f => ({ ...f!, horarioFim: e.target.value }))}
                        className="w-full border px-2 py-1 rounded mt-1 text-xs"
                      />
                    </label>
                    <p className="text-[11px] text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {faixaHorarioDescricao || 'Informe horario inicial e final para exibir ao cliente a faixa continua sem selecao de horario.'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {horariosDisponiveis.map(horario => (
                      <label key={horario} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={editPacote.horarios.includes(horario)}
                          onChange={e => setEditPacote(f => ({
                            ...f!,
                            horarios: e.target.checked
                              ? [...f!.horarios, horario]
                              : f!.horarios.filter(h => h !== horario)
                          }))}
                          className="mr-1"
                        />
                        {horario}
                      </label>
                    ))}
                  </div>
                )}

                <label className="block mb-1 mt-2 text-xs font-semibold">Pacotes incluidos (combo opcional):</label>
                <div className="border rounded p-2 mb-2 max-h-28 overflow-y-auto bg-gray-50">
                  {pacotes.filter(p => !editPacote.id || p.id !== editPacote.id).length > 0 ? (
                    pacotes
                      .filter(p => !editPacote.id || p.id !== editPacote.id)
                      .map(p => (
                        <label key={p.id} className="flex items-center justify-between text-xs py-1">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editPacote.pacotesCombinados?.includes(p.id ?? '')}
                              onChange={e => setEditPacote(f => {
                                if (!f) return f;
                                const atual = new Set(f.pacotesCombinados ?? []);
                                if (e.target.checked && p.id) atual.add(p.id);
                                if (!e.target.checked && p.id) atual.delete(p.id);
                                return { ...f, pacotesCombinados: Array.from(atual) };
                              })}
                            />
                            <span>{p.nome}</span>
                          </span>
                          <span className="text-[11px] text-gray-500">{p.tipo}</span>
                        </label>
                      ))
                  ) : (
                    <p className="text-[11px] text-gray-500">Cadastre outros pacotes para criar combos.</p>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mb-2">
                  Os valores promocionais do combo devem ser definidos nos campos de preco acima.
                </p>

                <label className="block mb-1 mt-2 text-xs font-semibold">Datas sem disponibilidade:</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={novaDataBloqueada}
                    onChange={e => setNovaDataBloqueada(e.target.value)}
                    className="flex-1 border px-2 py-1 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={adicionarDataBloqueada}
                    disabled={!novaDataBloqueada}
                    className={`px-2 py-1 rounded text-xs text-white ${novaDataBloqueada ? 'bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    Adicionar
                  </button>
                </div>
                {editPacote.datasBloqueadas && editPacote.datasBloqueadas.length > 0 ? (
                  <ul className="text-xs space-y-1 mb-2 max-h-24 overflow-y-auto">
                    {editPacote.datasBloqueadas.map(data => (
                      <li key={data} className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded">
                        <span>{dayjs(data).format('DD/MM/YYYY')}</span>
                        <button
                          type="button"
                          onClick={() => removerDataBloqueada(data)}
                          className="text-red-600 text-[11px]"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-gray-500 mb-2">Nenhuma data bloqueada.</p>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setModalPacote(false);
                      setEditPacote(null);
                      setNovaDataBloqueada('');
                    }}
                    className="px-2 py-1 bg-gray-400 text-white rounded text-xs"
                  >
                    Cancelar
                  </button>
                  <button onClick={handleSavePacote} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Salvar</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========== Pesquisa de Clientes ========== */}
      {aba === 'pesquisa' && (
        <section className="bg-white p-4 rounded shadow w-full">
          <h2 className="font-bold mb-4">Pesquisa de Clientes</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={termoPesquisa}
              onChange={e => setTermoPesquisa(e.target.value)}
              className="border px-3 py-2 rounded w-full"
              placeholder="Digite nome, CPF ou telefone"
              onKeyDown={e => e.key === 'Enter' && pesquisarClientes()}
            />
            <button onClick={pesquisarClientes} className="bg-blue-600 text-white px-4 py-2 rounded">Pesquisar</button>
          </div>
          {carregandoPesquisa ? (
            <div className="text-sm text-gray-500">Buscando...</div>
          ) : resultadosPesquisa.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left">Nome</th>
                  <th className="px-2 py-2 text-left">CPF</th>
                  <th className="px-2 py-2 text-left">Telefone</th>
                  <th className="px-2 py-2 text-left">Data</th>
                  <th className="px-2 py-2 text-left">Atividade</th>
                </tr>
              </thead>
              <tbody>
                {resultadosPesquisa.map(r => (
                  <tr key={r.id}>
                    <td className="px-2 py-1">{r.nome}</td>
                    <td className="px-2 py-1">{r.cpf}</td>
                    <td className="px-2 py-1">{r.telefone}</td>
                    <td className="px-2 py-1">{r.data}</td>
                    <td className="px-2 py-1">{r.atividade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-gray-500 text-sm">Nenhum cliente encontrado.</div>
          )}
        </section>
      )}
    </main>
  );
}

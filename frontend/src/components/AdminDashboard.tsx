import { useEffect, useState } from 'react';
import React from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { api } from '../sevices/api';
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
  horario?: string;
  atividade: string;
  valor?: number;
  status?: string;
  temPet?: boolean;
  participantes?: number;
  email?: string;
  observacao?: string;
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
}

const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const diasDaSemanaCurto = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const horariosDisponiveis = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '18:00'
];

export default function AdminDashboard() {
  const [user, loading] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [aba, setAba] = useState<'reservas' | 'pacotes' | 'pesquisa'>('reservas');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Tentando login com:', { email, projeto: auth.app.options.projectId });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login realizado com sucesso:', userCredential.user.email);
    } catch (error: any) {
      console.error('❌ Erro no login:', {
        code: error.code,
        message: error.message,
        email: email
      });
      setLoginError(`Erro: ${error.code} - ${error.message}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">Login Admin</h2>
          {loginError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{loginError}</div>}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Senha:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            Entrar
          </button>
        </form>
      </div>
    );
  }

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

  // Pesquisa Clientes
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState<Reserva[]>([]);
  const [carregandoPesquisa, setCarregandoPesquisa] = useState(false);

  // Reservas Logic
  const fetchReservas = async (date: Date) => {
    const formatted = dayjs(date).format('YYYY-MM-DD');
    console.log('🔍 Buscando reservas para:', formatted);
    
    try {
      console.log('📡 Chamando API...');
      const dados: Reserva[] = await api.getReservas();
      console.log('📊 Total de reservas carregadas:', dados.length);
      
      if (dados.length === 0) {
        console.log('⚠️ Nenhuma reserva encontrada');
        setReservas({});
        setFeedback({ type: 'error', message: 'Nenhuma reserva encontrada no banco de dados.' });
        return;
      }
      
      // Filtrar por data
      const reservasDaData = dados.filter(r => r.data === formatted);
      console.log('📊 Reservas da data', formatted, ':', reservasDaData.length);
      
      // Agrupar por horário (todas as reservas)
      const reservasPorHorario = reservasDaData.reduce((acc, reserva) => {
        const horario = reserva.horario || 'Sem horário';
        if (!acc[horario]) acc[horario] = [];
        acc[horario].push(reserva);
        return acc;
      }, {} as Record<string, Reserva[]>);
      
      setReservas(reservasPorHorario);
      
      if (reservasDaData.length === 0) {
        setFeedback({ type: 'error', message: 'Nenhuma reserva encontrada para esta data.' });
      }
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar reservas:', error);
      setReservas({});
      setFeedback({ 
        type: 'error', 
        message: `Erro ao conectar com a API: ${error?.message || 'Erro desconhecido'}` 
      });
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
        await api.deleteReserva(id);
        fetchReservas(selectedDate);
        setFeedback({ type: 'success', message: 'Reserva excluída com sucesso!' });
      } catch (error) {
        setFeedback({ type: 'error', message: 'Erro ao excluir reserva.' });
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
      const reservaData = {
        ...editReserva,
        participantes,
        status: 'pago',
      };

      if (isEditingReserva && editReserva.id) {
        await api.updateReserva(editReserva.id, reservaData);
        setFeedback({ type: 'success', message: 'Reserva atualizada com sucesso!' });
      } else {
        await api.createReserva(reservaData);
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
    try {
      console.log('📦 Buscando pacotes...');
      const pacotesData: Pacote[] = await api.getPacotes();
      console.log('📦 Pacotes encontrados:', pacotesData.length);
      
      if (pacotesData.length === 0) {
        console.log('⚠️ Nenhum pacote encontrado');
        setPacotes([]);
        setFeedback({ type: 'error', message: 'Nenhum pacote encontrado no banco de dados.' });
        return;
      }
      
      setPacotes(pacotesData);
      console.log('✅ Pacotes carregados com sucesso:', pacotesData.length);
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar pacotes:', error);
      setPacotes([]);
      setFeedback({ 
        type: 'error', 
        message: `Erro ao carregar pacotes: ${error?.message || 'Erro desconhecido'}` 
      });
    }
  };

  useEffect(() => {
    if (aba === 'pacotes') fetchPacotes();
  }, [aba]);

  const handleEditPacote = (pacote: Pacote) => {
    setEditPacote(pacote);
    setIsEditingPacote(true);
    setModalPacote(true);
  };

  const handleAddPacote = () => {
    setEditPacote({
      nome: '',
      tipo: '',
      emoji: '✨',
      precoAdulto: 0,
      precoCrianca: 0,
      precoBariatrica: 0,
      horarios: [],
      dias: [],
      limite: 0,
    });
    setIsEditingPacote(false);
    setModalPacote(true);
  };

  const handleSavePacote = async () => {
    if (!editPacote?.nome) {
      setFeedback({ type: 'error', message: 'Nome obrigatório!' });
      return;
    }
    try {
      if (isEditingPacote && editPacote.id) {
        await api.updatePacote(editPacote.id, editPacote);
        setFeedback({ type: 'success', message: 'Pacote atualizado com sucesso!' });
      } else {
        await api.createPacote(editPacote);
        setFeedback({ type: 'success', message: 'Pacote cadastrado com sucesso!' });
      }
      setModalPacote(false);
      setEditPacote(null);
      fetchPacotes();
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao salvar pacote.' });
    }
  };

  const excluirPacote = async (id: string) => {
    if (window.confirm('Excluir pacote?')) {
      try {
        await api.deletePacote(id);
        fetchPacotes();
        setFeedback({ type: 'success', message: 'Pacote excluído com sucesso!' });
      } catch (error) {
        setFeedback({ type: 'error', message: 'Erro ao excluir pacote.' });
      }
    }
  };

  // Pesquisa Clientes
  const pesquisarClientes = async () => {
    if (!termoPesquisa.trim()) {
      setFeedback({ type: 'error', message: 'Digite um termo para pesquisar.' });
      return;
    }
    
    setCarregandoPesquisa(true);
    try {
      console.log('🔍 Pesquisando clientes com termo:', termoPesquisa);
      const dados: Reserva[] = await api.getReservas();
      console.log('📊 Total de reservas para pesquisa:', dados.length);
      
      const matches = dados.filter((r: Reserva) => {
        const termo = termoPesquisa.toLowerCase();
        return (
          (r.nome && r.nome.toLowerCase().includes(termo)) ||
          (r.cpf && r.cpf.includes(termoPesquisa)) ||
          (r.telefone && r.telefone.includes(termoPesquisa))
        );
      });
      
      console.log('🔍 Resultados encontrados:', matches.length);
      setResultadosPesquisa(matches);
      
      if (matches.length === 0) {
        setFeedback({ type: 'error', message: 'Nenhum cliente encontrado com esse termo.' });
      }
      
    } catch (error: any) {
      console.error('❌ Erro na pesquisa:', error);
      setResultadosPesquisa([]);
      setFeedback({ 
        type: 'error', 
        message: `Erro na pesquisa: ${error?.message || 'Erro desconhecido'}` 
      });
    }
    setCarregandoPesquisa(false);
  };

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      
      {/* Header Profissional */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="Vagafogo" 
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vagafogo Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Bem-vindo, <span className="font-medium">{user?.email}</span>
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{feedback.type === 'success' ? '✓' : '⚠'}</span>
            <span>{feedback.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => setAba('reservas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                aba === 'reservas' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaPlus className="inline mr-2" />
              Reservas
            </button>
            <button 
              onClick={() => setAba('pacotes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                aba === 'pacotes' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBox className="inline mr-2" />
              Pacotes
            </button>
            <button 
              onClick={() => setAba('pesquisa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                aba === 'pesquisa' 
                  ? 'border-green-500 text-green-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaSearch className="inline mr-2" />
              Pesquisa de Clientes
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ========== Reservas ========== */}
      {aba === 'reservas' && (
        <>
          {/* Calendário */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
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
          </div>

          {/* Reservas Tabela */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              <div className="flex gap-2">
                <button onClick={handleAddReserva} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm">
                  <FaPlus /> Nova Reserva
                </button>
                <a href={`/#reservas?data=${dayjs(selectedDate).format('YYYY-MM-DD')}`} target="_blank" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 shadow-sm">
                  📅 Abrir Agenda
                </a>
              </div>
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
                      <td colSpan={10} className="px-2 py-3 text-gray-500 text-xs">Nenhuma reserva encontrada para esta data.</td>
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
          </div>
        </>
      )}

      {/* ========== Pacotes ========== */}
      {aba === 'pacotes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold">Pacotes</h2>
            <button onClick={handleAddPacote} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all duration-200 shadow-sm">
              <FaPlus /> Novo Pacote
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-2 text-left">Emoji</th>
                  <th className="px-2 py-2 text-left">Nome</th>
                  <th className="px-2 py-2 text-left">Tipo</th>
                  <th className="px-2 py-2 text-left">Preço Adulto</th>
                  <th className="px-2 py-2 text-left">Preço Criança</th>
                  <th className="px-2 py-2 text-left">Preço Bariátrica</th>
                  <th className="px-2 py-2 text-left">Dias</th>
                  <th className="px-2 py-2 text-left">Horários</th>
                  <th className="px-2 py-2 text-left">Limite</th>
                  <th className="px-2 py-2 text-left"></th>
                </tr>
              </thead>
              <tbody>
                {pacotes.map(p => (
                  <tr key={p.id}>
                    <td className="px-2 py-1 text-2xl">{p.emoji || '✨'}</td>
                    <td className="px-2 py-1">{p.nome}</td>
                    <td className="px-2 py-1">{p.tipo}</td>
                    <td className="px-2 py-1">R$ {Number(p.precoAdulto).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1">R$ {Number(p.precoCrianca).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1">R$ {Number(p.precoBariatrica).toLocaleString('pt-BR')}</td>
                    <td className="px-2 py-1">{p.dias.map(i => diasDaSemana[i]).join(', ') || '-'}</td>
                    <td className="px-2 py-1">{p.horarios.join(', ') || '-'}</td>
                    <td className="px-2 py-1">{p.limite}</td>
                    <td className="px-2 py-1 flex gap-1">
                      <button className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded" onClick={() => handleEditPacote(p)}>Editar</button>
                      <button className="text-red-600 hover:text-red-800 px-2 py-1 rounded" onClick={() => excluirPacote(p.id!)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Pacote */}
          {modalPacote && editPacote && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded shadow w-full max-w-xs max-h-[95vh] overflow-y-auto">
                <h4 className="font-bold mb-2">{isEditingPacote ? 'Editar' : 'Novo'} Pacote</h4>
                <label className="block mb-1 text-xs">Emoji do pacote:
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{editPacote.emoji || '✨'}</span>
                    <input 
                      value={editPacote.emoji || ''} 
                      onChange={e => setEditPacote(f => ({ ...f!, emoji: e.target.value }))} 
                      className="w-full border px-2 py-1 rounded" 
                      placeholder="✨"
                      maxLength={2}
                    />
                  </div>
                </label>
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

                {/* Dias da semana */}
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

                {/* Horários disponíveis */}
                <label className="block mb-1 mt-2 text-xs font-semibold">Horários:</label>
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

                <div className="flex gap-2 mt-2">
                  <button onClick={() => setModalPacote(false)} className="px-2 py-1 bg-gray-400 text-white rounded text-xs">Cancelar</button>
                  <button onClick={handleSavePacote} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Salvar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== Pesquisa de Clientes ========== */}
      {aba === 'pesquisa' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
            <button onClick={pesquisarClientes} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm">Pesquisar</button>
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
        </div>
      )}
      </main>
    </div>
  );
}

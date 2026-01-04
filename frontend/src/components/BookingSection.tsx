import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from '../../firebase';
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";

type PerguntaCondicional = {
  condicao: "sim" | "nao";
  pergunta: string;
  tipo: "sim_nao" | "texto";
  obrigatoria: boolean;
};

type PerguntaPersonalizada = {
  id: string;
  pergunta: string;
  tipo: "sim_nao" | "texto";
  obrigatoria: boolean;
  perguntaCondicional?: PerguntaCondicional;
};

type PerguntaCondicionalRespostaPayload = {
  pergunta: string;
  tipo: "sim_nao" | "texto";
  obrigatoria: boolean;
  resposta: string;
};

type PerguntaPersonalizadaRespostaPayload = {
  pacoteId: string;
  pacoteNome: string;
  perguntaId: string;
  pergunta: string;
  tipo: "sim_nao" | "texto";
  obrigatoria: boolean;
  resposta: string;
  perguntaCondicional?: PerguntaCondicionalRespostaPayload;
};

type TipoCliente = {
  id?: string;
  nome: string;
  descricao?: string;
};

type TipoClienteQuantidade = Record<string, number>;

type TipoClientePreco = Record<string, number>;

type Pacote = {
  id?: string;
  nome: string;
  tipo: "brunch" | "trilha" | "experiencia";
  emoji?: string;
  precoAdulto: number;
  precoCrianca: number;
  precoBariatrica: number;
  precosPorTipo?: TipoClientePreco;
  horarios?: string[];
  dias: number[];
  limite?: number;
  datasBloqueadas?: string[];
  aceitaPet?: boolean;
  modoHorario?: 'lista' | 'intervalo';
  horarioInicio?: string;
  horarioFim?: string;
  perguntasPersonalizadas?: PerguntaPersonalizada[];
};

type Combo = {
  id?: string;
  nome: string;
  pacoteIds: string[];
  preco?: number;
  precoAdulto?: number;
  precoCrianca?: number;
  precoBariatrica?: number;
  precosPorTipo?: TipoClientePreco;
  desconto?: number;
  ativo: boolean;
};

type ReservaResumo = {
  id?: string;
  data?: string;
  horario?: string;
  participantes?: number;
  participantesPorTipo?: Record<string, number>;
  adultos?: number;
  criancas?: number;
  bariatrica?: number;
  naoPagante?: number;
  pacoteIds?: string[];
  atividade?: string;
  status?: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatCurrency = (valor: number) =>
  currencyFormatter.format(Number.isFinite(valor) ? valor : 0);


const normalizarTexto = (valor: string) =>
  valor
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const obterChaveTipo = (tipo: TipoCliente) => tipo.id ?? normalizarTexto(tipo.nome);

const obterValorMapa = (
  mapa: Record<string, number> | undefined,
  tipo: TipoCliente
) => {
  if (!mapa) return undefined;
  if (tipo.id && tipo.id in mapa) return Number(mapa[tipo.id]);
  if (tipo.nome in mapa) return Number(mapa[tipo.nome]);
  const nomeNormalizado = normalizarTexto(tipo.nome);
  for (const [chave, valor] of Object.entries(mapa)) {
    if (normalizarTexto(chave) === nomeNormalizado) {
      return Number(valor);
    }
  }
  return undefined;
};

const obterValorPorTipoNome = (
  mapa: Record<string, number> | undefined,
  tipos: TipoCliente[],
  termo: string
) => {
  const tipo = tipos.find((item) => normalizarTexto(item.nome).includes(termo));
  if (!tipo) return undefined;
  const valor = obterValorMapa(mapa, tipo);
  return Number.isFinite(valor) ? Number(valor) : undefined;
};

const obterPrecoLegado = (
  tipo: TipoCliente,
  legado?: { precoAdulto?: number; precoCrianca?: number; precoBariatrica?: number }
) => {
  if (!legado) return 0;
  const nome = normalizarTexto(tipo.nome);
  if (nome.includes("adult")) return Number(legado.precoAdulto ?? 0);
  if (nome.includes("crian")) return Number(legado.precoCrianca ?? 0);
  if (nome.includes("bariat")) return Number(legado.precoBariatrica ?? 0);
  return 0;
};

const obterPrecoPorTipo = (
  mapa: Record<string, number> | undefined,
  tipo: TipoCliente,
  legado?: { precoAdulto?: number; precoCrianca?: number; precoBariatrica?: number }
) => {
  const valor = obterValorMapa(mapa, tipo);
  if (Number.isFinite(valor)) return Number(valor);
  return obterPrecoLegado(tipo, legado);
};

const normalizarNumero = (valor: unknown) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(numero, 0) : 0;
};

const somarMapa = (mapa?: Record<string, number>) => {
  if (!mapa) return 0;
  return Object.values(mapa).reduce((total, valor) => total + normalizarNumero(valor), 0);
};

type PersonalField = "nome" | "email" | "cpf" | "telefone";

const onlyNumbers = (value: string) => value.replace(/\D/g, "");

type CardBrandId = "visa" | "mastercard" | "amex" | "elo" | "hipercard";

const cardBrandConfigs: Array<{ id: CardBrandId; label: string; pattern: RegExp; badgeClass: string }> = [
  { id: "visa", label: "Visa", pattern: /^4/, badgeClass: "bg-blue-600 text-white" },
  { id: "mastercard", label: "Mastercard", pattern: /^(5[1-5]|2[2-7])/, badgeClass: "bg-rose-600 text-white" },
  { id: "amex", label: "Amex", pattern: /^3[47]/, badgeClass: "bg-sky-600 text-white" },
  {
    id: "elo",
    label: "Elo",
    pattern: /^(4011(78|79)|431274|438935|451416|457393|45763[12]|504175|5067(0|1|2)|5090|627780|636297|636368|650)/,
    badgeClass: "bg-emerald-600 text-white",
  },
  { id: "hipercard", label: "Hipercard", pattern: /^(606282|3841)/, badgeClass: "bg-indigo-600 text-white" },
];

const detectarBandeiraCartao = (valor: string): CardBrandId | null => {
  const digits = onlyNumbers(valor);
  if (!digits) return null;
  const match = cardBrandConfigs.find((config) => config.pattern.test(digits));
  return match?.id ?? null;
};

const obterLimiteNumeroCartao = (brand?: CardBrandId | null) => {
  if (brand === "amex") return 15;
  return 19;
};


const formatCpf = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);

  let formatted = part1;
  if (part2) formatted += `.${part2}`;
  if (part3) formatted += `.${part3}`;
  if (part4) formatted += `-${part4}`;
  return formatted;
};

const formatPhone = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length < 2) {
    return `(${digits}`;
  }
  if (digits.length === 2) {
    return `(${digits})`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCep = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatCardNumber = (value: string): string => {
  const digits = onlyNumbers(value);
  const brand = detectarBandeiraCartao(digits);
  const maxDigits = obterLimiteNumeroCartao(brand);
  const trimmed = digits.slice(0, maxDigits);

  if (brand === "amex") {
    const match = /^(\d{0,4})(\d{0,6})(\d{0,5})$/.exec(trimmed);
    if (!match) return trimmed;
    return [match[1], match[2], match[3]].filter(Boolean).join(" ");
  }

  return trimmed.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const formatCardExpiry = (value: string): string => {
  const digits = onlyNumbers(value).slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidCpf = (value: string): boolean => {
  const cpf = onlyNumbers(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(cpf[9])) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;

  return secondDigit === Number(cpf[10]);
};

const parseCardExpiry = (value: string) => {
  const digits = onlyNumbers(value);
  if (digits.length < 4) return null;
  const month = Number(digits.slice(0, 2));
  if (!Number.isFinite(month) || month < 1 || month > 12) return null;
  let year = Number(digits.slice(2));
  if (!Number.isFinite(year)) return null;
  if (digits.length === 4) {
    year += 2000;
  }
  if (digits.length >= 6) {
    year = Number(digits.slice(2, 6));
  }
  if (!Number.isFinite(year) || year < 2000) return null;
  return { month, year };
};

const isValidCardNumber = (value: string): boolean => {
  const digits = onlyNumbers(value);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

const parseHorarioParaMinutos = (valor: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(valor.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) return null;
  return horas * 60 + minutos;
};

const calcularParticipantesReserva = (reserva: ReservaResumo) => {
  const participantesDeclarados = normalizarNumero(reserva.participantes);
  const participantesMapa =
    reserva.participantesPorTipo && Object.keys(reserva.participantesPorTipo).length > 0
      ? somarMapa(reserva.participantesPorTipo)
      : 0;
  const base =
    participantesMapa > 0
      ? participantesMapa
      : normalizarNumero(reserva.adultos) +
        normalizarNumero(reserva.criancas) +
        normalizarNumero(reserva.bariatrica);
  const total = base + normalizarNumero(reserva.naoPagante);
  return Math.max(total, participantesDeclarados);
};

export function BookingSection() {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [tiposClientes, setTiposClientes] = useState<TipoCliente[]>([]);
  const [loadingPacotes, setLoadingPacotes] = useState(true);
  const [reservasDia, setReservasDia] = useState<ReservaResumo[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  // Formulário
  const [nome, setNome] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [telefone, setTelefone] = useState<string>("");
  const [cpf, setCpf] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [horario, setHorario] = useState<string>("");
  const [diasBloqueados, setDiasBloqueados] = useState<Set<string>>(new Set());
  const [diaSelecionadoFechado, setDiaSelecionadoFechado] = useState(false);
  const [participantesPorTipo, setParticipantesPorTipo] = useState<TipoClienteQuantidade>({});
  const [naoPagante] = useState<number>(0);
  const [temPet, setTemPet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<"CREDIT_CARD" | "PIX">("CREDIT_CARD");
  const [cartaoNome, setCartaoNome] = useState<string>("");
  const [cartaoNumero, setCartaoNumero] = useState<string>("");
  const [cartaoValidade, setCartaoValidade] = useState<string>("");
  const [cartaoCvv, setCartaoCvv] = useState<string>("");
  const [cartaoResultado, setCartaoResultado] = useState<{
    status: "success" | "pending" | "error";
    message: string;
  } | null>(null);
  const [enderecoCep, setEnderecoCep] = useState<string>("");
  const [enderecoRua, setEnderecoRua] = useState<string>("");
  const [enderecoNumero, setEnderecoNumero] = useState<string>("");
  const [enderecoComplemento, setEnderecoComplemento] = useState<string>("");
  const [enderecoBairro, setEnderecoBairro] = useState<string>("");
  const [enderecoCidade, setEnderecoCidade] = useState<string>("");
  const [enderecoEstado, setEnderecoEstado] = useState<string>("");
  const [respostasPersonalizadas, setRespostasPersonalizadas] = useState<Record<string, { resposta?: string; condicional?: string }>>({});
  const [disponibilidadeHorarios, setDisponibilidadeHorarios] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const pacotesRef = useRef<HTMLDivElement | null>(null);
  const nomeRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const cpfRef = useRef<HTMLInputElement | null>(null);
  const telefoneRef = useRef<HTMLInputElement | null>(null);
  const dataRef = useRef<HTMLDivElement | null>(null);
  const horarioRef = useRef<HTMLDivElement | null>(null);
  const participantesRef = useRef<HTMLDivElement | null>(null);
  const petRef = useRef<HTMLDivElement | null>(null);
  const cartaoRef = useRef<HTMLDivElement | null>(null);


  // PIX
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCheckoutUrl(null);
    setPixKey(null);
    setQrCodeImage(null);
    setExpirationDate(null);
    setCartaoResultado(null);
  }, [formaPagamento]);
  const cartaoBrand = useMemo(() => detectarBandeiraCartao(cartaoNumero), [cartaoNumero]);
  const cartaoBrandInfo = useMemo(
    () => (cartaoBrand ? cardBrandConfigs.find((brand) => brand.id === cartaoBrand) ?? null : null),
    [cartaoBrand]
  );
  const cartaoNumeroPlaceholder =
    cartaoBrand === "amex" ? "0000 000000 00000" : "0000 0000 0000 0000";
  const cartaoNumeroMaxLength = cartaoBrand === "amex" ? 17 : 23;
  const cartaoCvvMaxLength = cartaoBrand === "amex" ? 4 : 3;
  const cartaoCvvPlaceholder = cartaoBrand === "amex" ? "1234" : "123";
  const cartaoNumeroExibicao = cartaoNumero.trim() ? cartaoNumero : cartaoNumeroPlaceholder;
  const cartaoNomeExibicao = cartaoNome.trim()
    ? cartaoNome.trim().toUpperCase()
    : "NOME NO CARTAO";
  const cartaoValidadeExibicao = cartaoValidade.trim() ? cartaoValidade : "MM/AA";

  useEffect(() => {
    setCartaoCvv((prev) => prev.slice(0, cartaoCvvMaxLength));
  }, [cartaoCvvMaxLength]);


  const todayStart = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  })();

  const getInputClasses = (field: string) =>
    `w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
      formErrors[field]
        ? 'border-red-400 focus:ring-red-500'
        : 'border-black focus:ring-black'
    }`;

  const setFieldError = useCallback((field: string, message?: string) => {
    setFormErrors((prev) => {
      if (message) {
        if (prev[field] === message) return prev;
        return { ...prev, [field]: message };
      }
      if (!(field in prev)) {
        return prev;
      }
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const personalFields: PersonalField[] = ["nome", "email", "cpf", "telefone"];

  const getPersonalFieldError = (field: PersonalField) => {
    switch (field) {
      case "nome": {
        const valor = nome.trim();
        if (!valor) return "Informe seu nome completo.";
        if (valor.length < 3) return "Digite um nome válido.";
        return "";
      }
      case "email": {
        const valor = email.trim();
        if (!valor) return "Informe seu e-mail.";
        if (!isValidEmail(valor)) return "Digite um e-mail válido.";
        return "";
      }
      case "cpf": {
        const valor = cpf.trim();
        if (!valor) return "Informe seu CPF.";
        if (!isValidCpf(valor)) return "Digite um CPF válido.";
        return "";
      }
      case "telefone": {
        const valor = telefone.trim();
        if (!valor) return "";
        const digits = onlyNumbers(valor);
        if (digits.length < 10) return "Digite um telefone válido com DDD.";
        return "";
      }
      default:
        return "";
    }
  };

  const scrollToErrorField = useCallback((errors: Record<string, string>) => {
    const order = [
      "pacotes",
      "nome",
      "email",
      "cpf",
      "telefone",
      "data",
      "horario",
      "participantes",
      "pet",
      "cartaoNome",
      "cartaoNumero",
      "cartaoValidade",
      "cartaoCvv",
      "enderecoCep",
      "enderecoRua",
      "enderecoNumero",
      "enderecoBairro",
      "enderecoCidade",
      "enderecoEstado",
    ] as const;
    const getTarget = (key: (typeof order)[number]): HTMLElement | null => {
      switch (key) {
        case "pacotes":
          return pacotesRef.current;
        case "nome":
          return nomeRef.current;
        case "email":
          return emailRef.current;
        case "cpf":
          return cpfRef.current;
        case "telefone":
          return telefoneRef.current;
        case "data":
          return dataRef.current;
        case "horario":
          return horarioRef.current;
        case "participantes":
          return participantesRef.current;
        case "pet":
          return petRef.current;
        case "cartaoNome":
        case "cartaoNumero":
        case "cartaoValidade":
        case "cartaoCvv":
        case "enderecoCep":
        case "enderecoRua":
        case "enderecoNumero":
        case "enderecoBairro":
        case "enderecoCidade":
        case "enderecoEstado":
          return cartaoRef.current;
        default:
          return null;
      }
    };

    for (const key of order) {
      if (errors[key]) {
        const target = getTarget(key);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          const maybeFocusable = target as HTMLElement & { focus?: () => void };
          if (typeof maybeFocusable.focus === "function") {
            maybeFocusable.focus();
          }
        }
        break;
      }
    }
  }, []);

  const validatePersonalField = (field: PersonalField) => {
    const message = getPersonalFieldError(field);
    setFieldError(field, message || undefined);
    return !message;
  };

  // BUSCA PACOTES E COMBOS VIA FIRESTORE
  useEffect(() => {
    async function fetchData() {
      try {
        const tiposSnapshot = await getDocs(collection(db, "tipos_clientes"));
        const tiposData = tiposSnapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Partial<TipoCliente>;
            return {
              id: docSnap.id,
              nome: data.nome ?? "",
              descricao: data.descricao ?? "",
            } as TipoCliente;
          })
          .filter((tipo) => tipo.nome.trim().length > 0)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

        // Buscar pacotes do Firestore
        const pacotesSnapshot = await getDocs(collection(db, 'pacotes'));
        const pacotesData = pacotesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Buscar combos do Firestore
        const combosSnapshot = await getDocs(collection(db, 'combos'));
        const combosData = combosSnapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as any;
            const precosPorTipo =
              data.precosPorTipo && typeof data.precosPorTipo === "object"
                ? Object.fromEntries(
                    Object.entries(data.precosPorTipo).map(([chave, valor]) => [chave, Number(valor) || 0])
                  )
                : undefined;
            return {
              id: docSnap.id,
              nome: data.nome || '',
              pacoteIds: Array.isArray(data.pacoteIds) ? data.pacoteIds.map((id: unknown) => (id ?? '').toString()).filter(Boolean) : [],
              preco: Number(data.preco ?? 0),
              precoAdulto: Number(data.precoAdulto ?? 0),
              precoCrianca: Number(data.precoCrianca ?? 0),
              precoBariatrica: Number(data.precoBariatrica ?? 0),
              precosPorTipo,
              desconto: Number(data.desconto ?? 0),
              ativo: data.ativo !== false,
            } as Combo;
          })
          .filter((combo) => combo.ativo && combo.pacoteIds.length > 0);
        
        const arr: Pacote[] = pacotesData.map((d: any) => ({
          id: d.id,
          nome: d.nome,
          tipo: d.tipo,
          emoji: d.emoji,
          precoAdulto: Number(d.precoAdulto),
          precoCrianca: Number(d.precoCrianca),
          precoBariatrica: Number(d.precoBariatrica),
          precosPorTipo:
            d.precosPorTipo && typeof d.precosPorTipo === "object"
              ? Object.fromEntries(
                  Object.entries(d.precosPorTipo).map(([chave, valor]) => [chave, Number(valor) || 0])
                )
              : undefined,
          horarios: d.horarios ?? [],
          dias: Array.isArray(d.dias) ? d.dias : [],
          limite: d.limite !== undefined ? Number(d.limite) : undefined,
          datasBloqueadas: Array.isArray(d.datasBloqueadas) ? d.datasBloqueadas : [],
          aceitaPet: d.aceitaPet !== false,
          modoHorario: d.modoHorario || 'lista',
          horarioInicio: d.horarioInicio || '',
        horarioFim: d.horarioFim || '',
          perguntasPersonalizadas: Array.isArray(d.perguntasPersonalizadas) ? d.perguntasPersonalizadas : [],
      }));
        
        setTiposClientes(tiposData);
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
        setTiposClientes([]);
      } finally {
        setLoadingPacotes(false);
      }
    }
    fetchData();
  }, []);

  const tiposClientesAtivos = useMemo(() => tiposClientes, [tiposClientes]);

  useEffect(() => {
    setParticipantesPorTipo((prev) => {
      const proximo: TipoClienteQuantidade = {};
      tiposClientesAtivos.forEach((tipo, index) => {
        const chave = obterChaveTipo(tipo);
        const existente = obterValorMapa(prev, tipo);
        if (Number.isFinite(existente)) {
          proximo[chave] = Number(existente);
          return;
        }
        if (Object.keys(prev).length === 0 && index === 0) {
          proximo[chave] = 1;
          return;
        }
        proximo[chave] = 0;
      });
      return proximo;
    });
  }, [tiposClientesAtivos]);

  const hasCustomComboPricing = useCallback(
    (combo?: Combo | null) => {
      if (!combo) return false;
      return tiposClientesAtivos.some(
        (tipo) => obterPrecoPorTipo(combo.precosPorTipo, tipo, combo) > 0
      );
    },
    [tiposClientesAtivos]
  );

  const describeComboValores = useCallback(
    (combo: Combo) => {
      const partes = tiposClientesAtivos
        .map((tipo) => {
          const valor = obterPrecoPorTipo(combo.precosPorTipo, tipo, combo);
          return valor > 0 ? `${tipo.nome} ${formatCurrency(valor)}` : "";
        })
        .filter((valor) => valor.length > 0);
      return partes.join(" • ");
    },
    [tiposClientesAtivos]
  );

  useEffect(() => {
    const q = query(collection(db, "disponibilidade"), where("fechado", "==", true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const datas = new Set<string>();
        snapshot.forEach((docSnap) => {
          const dados = docSnap.data();
          const dataStr = typeof dados?.data === "string" ? dados.data : docSnap.id;
          datas.add(dataStr);
        });
        setDiasBloqueados(datas);
      },
      (error) => {
        console.error("Erro ao acompanhar dias bloqueados:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  const selectedPacotes = useMemo(
    () => pacotes.filter((p) => p.id && selectedPackages.includes(p.id)),
    [pacotes, selectedPackages]
  );

  const pacotesMap = useMemo(() => {
    const mapa = new Map<string, Pacote>();
    pacotes.forEach((pacote) => {
      if (pacote.id) {
        mapa.set(pacote.id, pacote);
      }
    });
    return mapa;
  }, [pacotes]);

  const pacotesPorNome = useMemo(() => {
    const mapa = new Map<string, string>();
    pacotes.forEach((pacote) => {
      if (pacote.id) {
        mapa.set(normalizarTexto(pacote.nome), pacote.id);
      }
    });
    return mapa;
  }, [pacotes]);

  const obterPacoteIdsReserva = useCallback(
    (reserva: ReservaResumo) => {
      if (Array.isArray(reserva.pacoteIds) && reserva.pacoteIds.length > 0) {
        return reserva.pacoteIds
          .map((id) => id?.toString())
          .filter((id): id is string => Boolean(id));
      }
      if (!reserva.atividade) return [];
      const atividadeNormalizada = normalizarTexto(reserva.atividade);
      const encontrados: string[] = [];
      pacotesPorNome.forEach((id, nomeNormalizado) => {
        if (atividadeNormalizada.includes(nomeNormalizado)) {
          encontrados.push(id);
        }
      });
      return encontrados;
    },
    [pacotesPorNome]
  );

  const reservasPorPacoteHorario = useMemo(() => {
    const mapa: Record<string, number> = {};
    reservasDia.forEach((reserva) => {
      const horarioReserva = (reserva.horario ?? "").toString().trim();
      if (!horarioReserva) return;
      const participantes = calcularParticipantesReserva(reserva);
      if (participantes <= 0) return;
      const pacoteIds = obterPacoteIdsReserva(reserva);
      if (pacoteIds.length === 0) return;
      Array.from(new Set(pacoteIds)).forEach((pacoteId) => {
        const chave = `${pacoteId}__${horarioReserva}`;
        mapa[chave] = (mapa[chave] ?? 0) + participantes;
      });
    });
    return mapa;
  }, [obterPacoteIdsReserva, reservasDia]);

  const comboAtivo = useMemo(() => {
    if (selectedPackages.length === 0) return undefined;
    return combos.find(
      (c) =>
        c.pacoteIds.length === selectedPackages.length &&
        c.pacoteIds.every((id) => selectedPackages.includes(id))
    );
  }, [combos, selectedPackages]);

  const handleSelectCombo = (combo: Combo) => {
    const jaAtivo = comboAtivo?.id === combo.id;
    if (jaAtivo) {
      setSelectedPackages([]);
    } else {
      const idsValidos = combo.pacoteIds.filter((id) => pacotesMap.has(id));
      setSelectedPackages(idsValidos);
    }
    setHorario("");
    setFieldError("pacotes");
  };

  const temPacoteFaixa = useMemo(
    () =>
      selectedPacotes.some(
        (p) => p.modoHorario === "intervalo" || (p.horarios && p.horarios.length === 0)
      ),
    [selectedPacotes]
  );

  useEffect(() => {
    if (!selectedDay) {
      setReservasDia([]);
      return;
    }
    const dataStr = selectedDay.toISOString().slice(0, 10);
    const q = query(collection(db, "reservas"), where("data", "==", dataStr));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as ReservaResumo[];
        setReservasDia(dados);
      },
      (error) => {
        console.error("Erro ao acompanhar reservas:", error);
        setReservasDia([]);
      }
    );
    return () => unsubscribe();
  }, [selectedDay]);

  useEffect(() => {
    if (!selectedDay) {
      setDisponibilidadeHorarios({});
      setDiaSelecionadoFechado(false);
      return;
    }
    let ativo = true;
    const dataStr = selectedDay.toISOString().slice(0, 10);
    const carregarDisponibilidade = async () => {
      try {
        const ref = doc(db, "disponibilidade", dataStr);
        const snap = await getDoc(ref);
        if (!ativo) return;
        const dados = snap.exists() ? snap.data() : null;
        if (dados && typeof dados.horarios === "object") {
          setDisponibilidadeHorarios(dados.horarios as Record<string, boolean>);
        } else {
          setDisponibilidadeHorarios({});
        }
        setDiaSelecionadoFechado(Boolean(dados?.fechado) || diasBloqueados.has(dataStr));
      } catch (error) {
        console.error("Erro ao carregar disponibilidade:", error);
        if (ativo) {
          setDisponibilidadeHorarios({});
          setDiaSelecionadoFechado(diasBloqueados.has(dataStr));
        }
      }
    };
    carregarDisponibilidade();
    return () => {
      ativo = false;
    };
  }, [selectedDay, diasBloqueados]);

  useEffect(() => {
    if (selectedPacotes.length === 0) {
      setRespostasPersonalizadas({});
      return;
    }
    setRespostasPersonalizadas((prev) => {
      const permitidos = new Set<string>();
      selectedPacotes.forEach((pacote) => {
        if (!pacote.id) return;
        (pacote.perguntasPersonalizadas ?? []).forEach((pergunta) => {
          permitidos.add(`${pacote.id}-${pergunta.id}`);
        });
      });
      const filtrados: Record<string, { resposta?: string; condicional?: string }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (permitidos.has(key)) {
          filtrados[key] = value;
        }
      });
      return filtrados;
    });
  }, [selectedPacotes]);

  const horariosVisiveis = useMemo(() => {
    if (selectedPacotes.length === 0) return [];
    const horariosUnicos = [...new Set(selectedPacotes.flatMap((p) => p.horarios || []))];
    if (!selectedDay) return horariosUnicos;
    if (diaSelecionadoFechado) return [];
    const dataStr = selectedDay.toISOString().slice(0, 10);
    let filtrados = horariosUnicos.filter((horarioLista) =>
      selectedPacotes.every((pacote) => {
        if (!pacote.id) return true;
        const chave = `${dataStr}-${pacote.id}-${horarioLista}`;
        return disponibilidadeHorarios[chave] !== false;
      })
    );
    const hoje = new Date();
    const mesmoDia =
      selectedDay.getFullYear() === hoje.getFullYear() &&
      selectedDay.getMonth() === hoje.getMonth() &&
      selectedDay.getDate() === hoje.getDate();

    if (mesmoDia) {
      const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
      filtrados = filtrados.filter((h) => {
        const minutos = parseHorarioParaMinutos(h);
        if (minutos === null) return true;
        return minutos >= minutosAgora;
      });
    }

    return filtrados;
  }, [selectedDay, selectedPacotes, disponibilidadeHorarios, diaSelecionadoFechado]);

  const vagasRestantesPorHorario = useMemo(() => {
    const mapa: Record<string, number | null> = {};
    if (selectedPacotes.length === 0) return mapa;
    horariosVisiveis.forEach((horarioLista) => {
      let restante: number | null = null;
      selectedPacotes.forEach((pacote) => {
        if (!pacote.id) return;
        const limite = Number(pacote.limite ?? 0);
        if (!Number.isFinite(limite) || limite <= 0) return;
        const chave = `${pacote.id}__${horarioLista}`;
        const reservados = reservasPorPacoteHorario[chave] ?? 0;
        const pacoteRestante = limite - reservados;
        restante = restante === null ? pacoteRestante : Math.min(restante, pacoteRestante);
      });
      mapa[horarioLista] = restante;
    });
    return mapa;
  }, [horariosVisiveis, reservasPorPacoteHorario, selectedPacotes]);

  const horariosDisponiveis = useMemo(
    () =>
      horariosVisiveis.filter((horarioLista) => {
        const restante = vagasRestantesPorHorario[horarioLista];
        return restante === null || restante > 0;
      }),
    [horariosVisiveis, vagasRestantesPorHorario]
  );

  useEffect(() => {
    if (!horario) return;
    if (!horariosDisponiveis.includes(horario)) {
      setHorario("");
    }
  }, [horariosDisponiveis, horario]);

  if (loadingPacotes) {
    return (
      <section id="reservas" className="py-16 bg-[#F7FAEF]">
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-10">
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
        <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-10">
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

  const calcularTotal = () => {
    let total = 0;
    selectedPacotes.forEach((pacote) => {
      const subtotal = tiposClientesAtivos.reduce((acc, tipo) => {
        const quantidade = Number(obterValorMapa(participantesPorTipo, tipo) ?? 0);
        const preco = obterPrecoPorTipo(pacote.precosPorTipo, tipo, pacote);
        return acc + quantidade * preco;
      }, 0);
      total += subtotal;
    });

    if (comboAtivo) {
      if (hasCustomComboPricing(comboAtivo)) {
        total = tiposClientesAtivos.reduce((acc, tipo) => {
          const quantidade = Number(obterValorMapa(participantesPorTipo, tipo) ?? 0);
          const preco = obterPrecoPorTipo(comboAtivo.precosPorTipo, tipo, comboAtivo);
          return acc + quantidade * preco;
        }, 0);
      } else {
        const valorCombo = Number(comboAtivo.preco);
        if (Number.isFinite(valorCombo) && valorCombo > 0) {
          total = valorCombo;
        } else if (comboAtivo.desconto && comboAtivo.desconto > 0) {
          total = total * (1 - comboAtivo.desconto / 100);
        }
      }
    }

    return total;
  };

  const hasDisponibilidadeNoDia = (day: Date) => {
    if (selectedPacotes.length === 0) return false;
    const dayStr = day.toISOString().slice(0, 10);
    if (diasBloqueados.has(dayStr)) return false;

    return selectedPacotes.some((pacote) => {
      const datasBloqueadas = pacote.datasBloqueadas ?? [];
      return !datasBloqueadas.includes(dayStr);
    });
  };

  const isBlockedDay = (day: Date) => {
    if (selectedPacotes.length === 0) return false;
    const dayStr = day.toISOString().slice(0, 10);
    if (diasBloqueados.has(dayStr)) return true;
    return selectedPacotes.every((pacote) =>
      (pacote.datasBloqueadas ?? []).includes(dayStr)
    );
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

  const handleDaySelect = (day?: Date) => {
    setSelectedDay(day);
    setHorario("");
    setFieldError("data");
    setFieldError("horario");
  };

  const handlePackageToggle = (packageId: string) => {
    setSelectedPackages(prev => 
      prev.includes(packageId) 
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId]
    );
    setHorario("");
    setFieldError("pacotes");
    setFieldError("horario");
  };

  const atualizarRespostaBase = (
    chave: string,
    valor: string,
    condicaoEsperada?: string,
    trim?: boolean
  ) => {
    setRespostasPersonalizadas((prev) => {
      const proximo = { ...prev };
      const resultado = trim ? valor.trim() : valor;

      if (!resultado) {
        if (proximo[chave]) {
          delete proximo[chave];
        }
        return proximo;
      }

      const atual = proximo[chave] ?? {};
      const atualizado: { resposta?: string; condicional?: string } = { ...atual, resposta: resultado };

      if (condicaoEsperada && resultado !== condicaoEsperada && atualizado.condicional !== undefined) {
        delete atualizado.condicional;
      }

      proximo[chave] = atualizado;
      return proximo;
    });
  };

  const atualizarRespostaCondicional = (chave: string, valor: string, trim?: boolean) => {
    setRespostasPersonalizadas((prev) => {
      const proximo = { ...prev };
      const resultado = trim ? valor.trim() : valor;

      if (!resultado) {
        if (proximo[chave]) {
          const atualizado = { ...proximo[chave] };
          delete atualizado.condicional;
          proximo[chave] = atualizado;
        }
        return proximo;
      }

      const atual = proximo[chave] ?? {};
      proximo[chave] = { ...atual, condicional: resultado };
      return proximo;
    });
  };

  const montarRespostasPersonalizadas = (): {
    respostas: PerguntaPersonalizadaRespostaPayload[];
    erro?: string;
  } => {
    const respostas: PerguntaPersonalizadaRespostaPayload[] = [];
    for (const pacote of selectedPacotes) {
      if (!pacote.id) continue;
      const perguntas = pacote.perguntasPersonalizadas ?? [];
      for (const pergunta of perguntas) {
        const chave = `${pacote.id}-${pergunta.id}`;
        const registro = respostasPersonalizadas[chave];
        let valorBase = registro?.resposta ?? "";
        if (pergunta.tipo === "texto") {
          valorBase = valorBase.toString().trim();
        } else if (pergunta.tipo === "sim_nao") {
          valorBase = valorBase.toString();
        }

        if (pergunta.obrigatoria) {
          if (pergunta.tipo === "sim_nao") {
            if (valorBase !== "sim" && valorBase !== "nao") {
              return {
                respostas: [],
                erro: `Responda a pergunta "${pergunta.pergunta}" do pacote ${pacote.nome}.`,
              };
            }
          } else if (!valorBase) {
            return {
              respostas: [],
              erro: `Responda a pergunta "${pergunta.pergunta}" do pacote ${pacote.nome}.`,
            };
          }
        }

        const possuiRespostaBase =
          pergunta.tipo === "sim_nao"
            ? valorBase === "sim" || valorBase === "nao"
            : Boolean(valorBase);

        if (!possuiRespostaBase) {
          // Pergunta opcional sem resposta
          continue;
        }

        const respostaFormatada: PerguntaPersonalizadaRespostaPayload = {
          pacoteId: pacote.id,
          pacoteNome: pacote.nome,
          perguntaId: pergunta.id,
          pergunta: pergunta.pergunta,
          tipo: pergunta.tipo,
          obrigatoria: pergunta.obrigatoria,
          resposta: pergunta.tipo === "texto" ? valorBase : valorBase,
        };

        if (pergunta.perguntaCondicional) {
          const cond = pergunta.perguntaCondicional;
          const condicaoAtiva = valorBase === cond.condicao;
          if (condicaoAtiva) {
            let valorCondicional = registro?.condicional ?? "";
            if (cond.tipo === "texto") {
              valorCondicional = valorCondicional.toString().trim();
            } else if (cond.tipo === "sim_nao") {
              valorCondicional = valorCondicional.toString();
            }

            if (cond.obrigatoria) {
              if (cond.tipo === "sim_nao") {
                if (valorCondicional !== "sim" && valorCondicional !== "nao") {
                  return {
                    respostas: [],
                    erro: `Responda a pergunta complementar "${cond.pergunta}" do pacote ${pacote.nome}.`,
                  };
                }
              } else if (!valorCondicional) {
                return {
                  respostas: [],
                  erro: `Responda a pergunta complementar "${cond.pergunta}" do pacote ${pacote.nome}.`,
                };
              }
            }

            const possuiRespostaCondicional =
              cond.tipo === "sim_nao"
                ? valorCondicional === "sim" || valorCondicional === "nao"
                : Boolean(valorCondicional);

            if (possuiRespostaCondicional) {
              respostaFormatada.perguntaCondicional = {
                pergunta: cond.pergunta,
                tipo: cond.tipo,
                obrigatoria: cond.obrigatoria,
                resposta: valorCondicional,
              };
            }
          }
        }

        respostas.push(respostaFormatada);
      }
    }

    return { respostas };
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    personalFields.forEach((field) => {
      const fieldError = getPersonalFieldError(field);
      if (fieldError) {
        errors[field] = fieldError;
      }
    });

    if (selectedPackages.length === 0) {
      errors.pacotes = "Selecione pelo menos um pacote.";
    }

    if (selectedPackages.length > 0) {
      if (!selectedDay) {
        errors.data = "Selecione uma data disponível.";
      } else if (diaSelecionadoFechado) {
        errors.data = "Esta data está indisponível. Escolha outra.";
      }
    }

    const possuiHorariosNosPacotes = selectedPacotes.some(
      (p) => (p.horarios?.length ?? 0) > 0
    );

    const haHorariosVisiveis = horariosVisiveis.length > 0;
    const haHorariosDisponiveis = horariosDisponiveis.length > 0;

    if (selectedDay && haHorariosVisiveis && !horario) {
      errors.horario = haHorariosDisponiveis
        ? "Escolha um horário disponível."
        : "Todos os horários estão lotados para os pacotes selecionados.";
    }

    if (
      selectedDay &&
      !haHorariosVisiveis &&
      !temPacoteFaixa &&
      possuiHorariosNosPacotes
    ) {
      errors.horario = "Não há horários disponíveis para os pacotes selecionados nesta data.";
    }

    const totalParticipantes = somarMapa(participantesPorTipo) + naoPagante;
    if (totalParticipantes <= 0) {
      errors.participantes = "Informe a quantidade de participantes.";
    }

    if (horario) {
      const restante = vagasRestantesPorHorario[horario];
      if (typeof restante === "number" && totalParticipantes > restante) {
        errors.horario = `Restam apenas ${Math.max(restante, 0)} vaga(s) para este horário.`;
      }
    }

    if (temPet === null) {
      errors.pet = "Informe se vai levar pet.";
    }

    if (formaPagamento === "CREDIT_CARD") {
      if (!cartaoNome.trim()) {
        errors.cartaoNome = "Informe o nome no cartao.";
      }
      if (!isValidCardNumber(cartaoNumero)) {
        errors.cartaoNumero = "Informe um numero de cartao valido.";
      }

      const validade = parseCardExpiry(cartaoValidade);
      if (!validade) {
        errors.cartaoValidade = "Informe a validade (MM/AA).";
      } else {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMesValidade = new Date(validade.year, validade.month, 0);
        if (fimMesValidade < inicioMes) {
          errors.cartaoValidade = "Cartao vencido.";
        }
      }

      const cvvDigits = onlyNumbers(cartaoCvv);
      if (cvvDigits.length < 3 || cvvDigits.length > 4) {
        errors.cartaoCvv = "Informe o CVV.";
      }

      const cepDigits = onlyNumbers(enderecoCep);
      if (cepDigits.length !== 8) {
        errors.enderecoCep = "Informe o CEP.";
      }
      if (!enderecoRua.trim()) {
        errors.enderecoRua = "Informe o endereco.";
      }
      if (!enderecoNumero.trim()) {
        errors.enderecoNumero = "Informe o numero.";
      }
      if (!enderecoBairro.trim()) {
        errors.enderecoBairro = "Informe o bairro.";
      }
      if (!enderecoCidade.trim()) {
        errors.enderecoCidade = "Informe a cidade.";
      }
      const estado = enderecoEstado.trim().toUpperCase();
      if (estado.length !== 2) {
        errors.enderecoEstado = "Informe o estado (UF).";
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToErrorField(errors);
      return false;
    }
    return true;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!selectedDay || selectedPackages.length === 0 || temPet === null) {
      return;
    }

    const { respostas, erro } = montarRespostasPersonalizadas();
    if (erro) {
      alert(erro);
      return;
    }

    setLoading(true);
    setCheckoutUrl(null);
    setPixKey(null);
    setQrCodeImage(null);
    setExpirationDate(null);
    setCartaoResultado(null);

    try {
      const dataStr = selectedDay.toISOString().slice(0, 10);
      const totalParticipantes = somarMapa(participantesPorTipo) + naoPagante;
      const total = calcularTotal();
      const horarioSelecionado =
        horariosDisponiveis.length > 0 && horario
          ? horario
          : "Sem horário específico";

      const atividades = selectedPacotes.map(p => p.nome).join(" + ");
      const comboInfo = comboAtivo
        ? hasCustomComboPricing(comboAtivo)
          ? ` (Combo: ${comboAtivo.nome} - ${describeComboValores(comboAtivo)})`
          : comboAtivo.preco && comboAtivo.preco > 0
            ? ` (Combo: ${comboAtivo.nome} - valor especial ${formatCurrency(comboAtivo.preco)})`
            : comboAtivo.desconto && comboAtivo.desconto > 0
              ? ` (Combo: ${comboAtivo.nome} - ${comboAtivo.desconto}% de desconto)`
              : ` (Combo: ${comboAtivo.nome})`
        : "";

      const adultos = obterValorPorTipoNome(participantesPorTipo, tiposClientesAtivos, "adult") ?? 0;
      const criancas = obterValorPorTipoNome(participantesPorTipo, tiposClientesAtivos, "crian") ?? 0;
      const bariatrica = obterValorPorTipoNome(participantesPorTipo, tiposClientesAtivos, "bariat") ?? 0;
      const cartaoExpiracao = formaPagamento === "CREDIT_CARD" ? parseCardExpiry(cartaoValidade) : null;

      const payload: any = {
        nome,
        email,
        valor: total,
        cpf,
        telefone,
        atividade: atividades + comboInfo,
        data: dataStr,
        participantes: totalParticipantes,
        participantesPorTipo,
        adultos,
        bariatrica,
        criancas,
        naoPagante,
        billingType: formaPagamento,
        horario: horarioSelecionado,
        temPet,
        pacoteIds: selectedPackages,
        comboId: comboAtivo?.id || null,
      };

      if (formaPagamento === "CREDIT_CARD" && cartaoExpiracao) {
        payload.creditCard = {
          holderName: cartaoNome.trim(),
          number: onlyNumbers(cartaoNumero),
          expiryMonth: String(cartaoExpiracao.month).padStart(2, "0"),
          expiryYear: String(cartaoExpiracao.year),
          ccv: onlyNumbers(cartaoCvv),
        };
        payload.creditCardHolderInfo = {
          name: cartaoNome.trim(),
          email,
          cpfCnpj: onlyNumbers(cpf),
          postalCode: onlyNumbers(enderecoCep),
          address: enderecoRua.trim(),
          addressNumber: enderecoNumero.trim(),
          addressComplement: enderecoComplemento.trim(),
          province: enderecoBairro.trim(),
          city: enderecoCidade.trim(),
          state: enderecoEstado.trim().toUpperCase(),
          phone: onlyNumbers(telefone),
        };
      }

      if (respostas.length > 0) {
        payload.perguntasPersonalizadas = respostas;
      }

      console.log('📤 Enviando payload:', {
        nome,
        email,
        valor: total,
        data: dataStr,
        billingType: formaPagamento,
      });
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
        console.log('✅ Resposta OK recebida:', resposta);
        console.log('🔗 Invoice URL:', resposta.cobranca?.invoiceUrl);
        console.log('🔑 PIX Key:', resposta.cobranca?.pixKey);

        if (formaPagamento === "PIX") {
          setCheckoutUrl(resposta.cobranca?.invoiceUrl || null);
          setPixKey(resposta.cobranca?.pixKey || null);
          setQrCodeImage(resposta.cobranca?.qrCodeImage || null);
          setExpirationDate(resposta.cobranca?.expirationDate || null);
        } else {
          const statusCobranca = resposta.cobranca?.status;
          const pagamentoConfirmado =
            statusCobranca === "CONFIRMED" || statusCobranca === "RECEIVED";
          setCartaoResultado({
            status: pagamentoConfirmado ? "success" : "pending",
            message: pagamentoConfirmado
              ? "Pagamento confirmado! Em instantes sua reserva sera atualizada."
              : "Pagamento em processamento. Aguarde a confirmacao do cartao.",
          });
        }

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
        console.error('❌ Status não é OK:', resposta?.status);
        alert("Erro ao criar a cobrança. Verifique os dados ou tente novamente.");
      }

    } catch (error) {
      console.error("Erro ao processar reserva:", error);
      alert("Erro ao processar reserva. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="reservas" className="py-16 bg-[#F7FAEF]">
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <span className="text-green-600 font-semibold text-xs uppercase tracking-widest">
            RESERVE SEU PASSEIO
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-[#8B4F23] mt-2 mb-1">
            Faça sua Reserva Agora
          </h2>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            
            {combos.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Combos especiais
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {combos.map((combo) => {
                    const nomes = combo.pacoteIds
                      .map((id) => pacotesMap.get(id)?.nome ?? "Pacote removido")
                      .filter(Boolean)
                      .join(", ");
                    const ativo = comboAtivo?.id === combo.id;
                    const possuiTabela = hasCustomComboPricing(combo);
                    const resumoValores = describeComboValores(combo);
                    return (
                      <button
                        key={combo.id}
                        type="button"
                        onClick={() => handleSelectCombo(combo)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          ativo
                            ? "border-green-500 bg-green-50 shadow-md"
                            : "border-gray-200 hover:border-green-300 hover:bg-green-50/40"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{combo.nome}</p>
                              <p className="text-xs text-gray-500">
                                Inclui: {nomes || "Pacotes removidos"}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-green-700">
                              {possuiTabela
                                ? "Tabela personalizada"
                                : combo.preco && combo.preco > 0
                                ? formatCurrency(combo.preco)
                                : combo.desconto && combo.desconto > 0
                                ? `${combo.desconto}% off`
                                : "Especial"}
                            </span>
                          </div>
                          {possuiTabela && (
                            <div className="text-xs text-gray-600">
                              {resumoValores || "Configuração por tipo"}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Ao selecionar um combo, os pacotes correspondentes são escolhidos automaticamente.
                </p>
              </div>
            )}

            {/* Seleção Múltipla de Pacotes */}
            <div ref={pacotesRef} className="mb-6">
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
                        {tiposClientesAtivos.map((tipo) => (
                          <p key={obterChaveTipo(tipo)} className="text-sm text-gray-600">
                            {tipo.nome}: {formatCurrency(obterPrecoPorTipo(pacote.precosPorTipo, tipo, pacote))}
                          </p>
                        ))}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pacote.id!)}
                        onChange={() => handlePackageToggle(pacote.id!)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-green-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {comboAtivo && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    🎉 Combo ativo: {comboAtivo.nome} —{" "}
                    {hasCustomComboPricing(comboAtivo)
                      ? describeComboValores(comboAtivo) || "valores personalizados"
                      : comboAtivo.preco && comboAtivo.preco > 0
                      ? `valor especial ${formatCurrency(comboAtivo.preco)}`
                      : comboAtivo.desconto && comboAtivo.desconto > 0
                      ? `${comboAtivo.desconto}% de desconto aplicado`
                      : "condições especiais aplicadas"}
                  </p>
                </div>
              )}

              {formErrors.pacotes && (
                <p className="mt-2 text-sm text-red-600">{formErrors.pacotes}</p>
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
                  onChange={(e) => {
                    setNome(e.target.value);
                    setFieldError("nome");
                  }}
                  onBlur={() => validatePersonalField("nome")}
                  className={getInputClasses("nome")}
                  ref={nomeRef}
                  autoComplete="name"
                  required
                />
                {formErrors.nome && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError("email");
                  }}
                  onBlur={() => validatePersonalField("email")}
                  className={getInputClasses("email")}
                  ref={emailRef}
                  autoComplete="email"
                  required
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => {
                    setCpf(formatCpf(e.target.value));
                    setFieldError("cpf");
                  }}
                  onBlur={() => validatePersonalField("cpf")}
                  className={getInputClasses("cpf")}
                  ref={cpfRef}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="off"
                  required
                />
                {formErrors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.cpf}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => {
                    setTelefone(formatPhone(e.target.value));
                    setFieldError("telefone");
                  }}
                  onBlur={() => validatePersonalField("telefone")}
                  className={getInputClasses("telefone")}
                  ref={telefoneRef}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={15}
                />
                {formErrors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.telefone}</p>
                )}
              </div>
            </div>

            {/* Selecao de Data */}
            {selectedPackages.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecione a Data *
                </label>
                <div ref={dataRef} className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={handleDaySelect}
                    disabled={[{ before: todayStart }, (day) => !hasDisponibilidadeNoDia(day)]}
                    locale={ptBR}
                    className="border border-black rounded-lg p-4"
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
                {formErrors.data && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.data}</p>
                )}
              </div>
            )}

            {/* Selecao de Horario */}
            {selectedDay && selectedPacotes.length > 0 && (
              <div ref={horarioRef} className="mb-6">
                {diaSelecionadoFechado ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      Este dia esta fechado para todos os pacotes. Escolha outra data para continuar.
                    </p>
                  </div>
                ) : horariosVisiveis.length > 0 ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horario *
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {horariosVisiveis.map((h) => {
                        const restante = vagasRestantesPorHorario[h];
                        const restanteExibicao =
                          typeof restante === "number" ? Math.max(restante, 0) : null;
                        const lotado = typeof restante === "number" && restante <= 0;
                        const selecionado = horario === h;
                        const base =
                          "flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition";
                        const estado = lotado
                          ? "border-red-300 bg-red-50 text-red-600 cursor-not-allowed"
                          : selecionado
                            ? "border-black bg-black text-white"
                            : "border-black text-gray-900 hover:bg-black hover:text-white";
                        const detalhe = lotado ? "text-red-500" : "text-gray-500";
                        const textoVagas =
                          restanteExibicao === null
                            ? "Sem limite de vagas"
                            : `${restanteExibicao} vaga(s)`;

                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={lotado}
                            onClick={() => {
                              setHorario(h);
                              setFieldError("horario");
                            }}
                            className={`${base} ${estado}`}
                          >
                            <span className="text-base">{h}</span>
                            <span className={`text-xs ${detalhe}`}>{textoVagas}</span>
                          </button>
                        );
                      })}
                    </div>
                    {temPacoteFaixa && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        {selectedPacotes
                          .filter(p => p.modoHorario === 'intervalo' && p.horarioInicio && p.horarioFim)
                          .map(p => (
                            <p key={p.id} className="text-sm text-blue-700 mb-1 last:mb-0">
                              A atividade {p.nome} funciona em faixa de horario, ocorre das {p.horarioInicio} ate {p.horarioFim}
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
                          A atividade {p.nome} funciona em faixa de horario, ocorre das {p.horarioInicio} ate {p.horarioFim}
                        </p>
                      ))
                    }
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      Nenhum horario disponivel para os pacotes selecionados nesta data. Escolha outra data ou ajuste os pacotes.
                    </p>
                  </div>
                )}
              </div>
            )}
            {formErrors.horario && !diaSelecionadoFechado && (
              <p className="mt-2 text-sm text-red-600">{formErrors.horario}</p>
            )}

            {/* Numero de Participantes */}
            <div ref={participantesRef} className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tiposClientesAtivos.map((tipo) => {
                  const chave = obterChaveTipo(tipo);
                  const valor = Number(obterValorMapa(participantesPorTipo, tipo) ?? 0);
                  return (
                    <div key={chave}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span>{tipo.nome}</span>
                        {tipo.descricao && (
                          <span className="mt-1 block text-xs font-normal text-gray-500">
                            {tipo.descricao}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={valor}
                        onChange={(e) => {
                          const valor = Number(e.target.value);
                          setParticipantesPorTipo((prev) => ({
                            ...prev,
                            [chave]: valor,
                          }));
                          setFieldError("participantes");
                        }}
                        className="w-full px-3 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  );
                })}
              </div>

              {formErrors.participantes && (
                <p className="mt-2 text-sm text-red-600">{formErrors.participantes}</p>
              )}
            </div>

            {((obterValorPorTipoNome(participantesPorTipo, tiposClientesAtivos, "bariat") ?? 0) > 0) && (
              <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">
                  ⚠️ <strong>Importante:</strong> É obrigatório apresentar a carteirinha bariátrica via WhatsApp após a reserva para validação.
                </p>
              </div>
            )}

            {/* Pet */}
            <div ref={petRef} className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Vai levar pet? *
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="pet"
                    checked={temPet === true}
                    onChange={() => {
                      setTemPet(true);
                      setFieldError("pet");
                    }}
                    className="mr-3 w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Sim</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="pet"
                    checked={temPet === false}
                    onChange={() => {
                      setTemPet(false);
                      setFieldError("pet");
                    }}
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
            {formErrors.pet && (
              <p className="mt-2 text-sm text-red-600">{formErrors.pet}</p>
            )}
          </div>

            {/* Perguntas Personalizadas */}
            {selectedPacotes.some(p => (p.perguntasPersonalizadas?.length ?? 0) > 0) && (
              <div className="mb-6 space-y-5">
                {selectedPacotes.map((pacote) => {
                  if (!pacote.id || (pacote.perguntasPersonalizadas?.length ?? 0) === 0) return null;
                  return (
                    <div
                      key={`perguntas-${pacote.id}`}
                      className="rounded-lg border border-gray-200 bg-gray-50/60 p-4"
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">
                        Informações adicionais — {pacote.nome}
                      </h4>
                      <div className="space-y-4">
                        {pacote.perguntasPersonalizadas!.map((pergunta) => {
                          const chave = `${pacote.id}-${pergunta.id}`;
                          const registro = respostasPersonalizadas[chave] ?? {};
                          const respostaBase = registro.resposta ?? "";
                          const cond = pergunta.perguntaCondicional;
                          const mostrarCondicional = cond && respostaBase === cond.condicao;
                          return (
                            <div key={pergunta.id} className="space-y-3 rounded-md bg-white p-3 shadow-sm">
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  {pergunta.pergunta}
                                  {pergunta.obrigatoria && <span className="text-red-500"> *</span>}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {pergunta.tipo === 'sim_nao'
                                    ? 'Selecione Sim ou Não conforme necessário.'
                                    : 'Informe a resposta no campo abaixo.'}
                                </p>
                              </div>
                              {pergunta.tipo === 'sim_nao' ? (
                                <div className="flex flex-wrap items-center gap-4">
                                  <label className="inline-flex items-center text-sm text-gray-700">
                                    <input
                                      type="radio"
                                      name={`${chave}-base`}
                                      className="mr-2"
                                      checked={respostaBase === 'sim'}
                                      onChange={() => atualizarRespostaBase(chave, 'sim', cond?.condicao)}
                                    />
                                    Sim
                                  </label>
                                  <label className="inline-flex items-center text-sm text-gray-700">
                                    <input
                                      type="radio"
                                      name={`${chave}-base`}
                                      className="mr-2"
                                      checked={respostaBase === 'nao'}
                                      onChange={() => atualizarRespostaBase(chave, 'nao', cond?.condicao)}
                                    />
                                    Não
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => atualizarRespostaBase(chave, '', cond?.condicao)}
                                    className="text-xs text-gray-500 underline"
                                  >
                                    Limpar
                                  </button>
                                </div>
                              ) : (
                                <textarea
                                  value={typeof respostaBase === 'string' ? respostaBase : ''}
                                  onChange={(e) => atualizarRespostaBase(chave, e.target.value, cond?.condicao, true)}
                                  className="w-full rounded-md border border-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                  rows={3}
                                  placeholder="Digite sua resposta"
                                />
                              )}

                              {cond && (
                                <div
                                  className={`rounded-md border px-3 py-2 ${
                                    mostrarCondicional ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-100'
                                  }`}
                                >
                                  <p className="text-sm font-medium text-gray-700">
                                    {cond.pergunta}
                                    {cond.obrigatoria && <span className="text-red-500"> *</span>}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Condicional exibida quando a resposta anterior for “{cond.condicao === 'sim' ? 'Sim' : 'Não'}”.
                                  </p>
                                  {cond.tipo === 'sim_nao' ? (
                                    <div className="mt-2 flex flex-wrap items-center gap-4">
                                      <label className="inline-flex items-center text-sm text-gray-700">
                                        <input
                                          type="radio"
                                          name={`${chave}-condicional`}
                                          className="mr-2"
                                          checked={registro.condicional === 'sim'}
                                          disabled={!mostrarCondicional}
                                          onChange={() => atualizarRespostaCondicional(chave, 'sim')}
                                        />
                                        Sim
                                      </label>
                                      <label className="inline-flex items-center text-sm text-gray-700">
                                        <input
                                          type="radio"
                                          name={`${chave}-condicional`}
                                          className="mr-2"
                                          checked={registro.condicional === 'nao'}
                                          disabled={!mostrarCondicional}
                                          onChange={() => atualizarRespostaCondicional(chave, 'nao')}
                                        />
                                        Não
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => atualizarRespostaCondicional(chave, '')}
                                        className="text-xs text-gray-500 underline"
                                        disabled={!mostrarCondicional}
                                      >
                                        Limpar
                                      </button>
                                    </div>
                                  ) : (
                                    <textarea
                                      value={typeof registro.condicional === 'string' ? registro.condicional : ''}
                                      onChange={(e) => atualizarRespostaCondicional(chave, e.target.value, true)}
                                      className="mt-2 w-full rounded-md border border-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                                      rows={2}
                                      placeholder="Digite a resposta complementar"
                                      disabled={!mostrarCondicional}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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

            {formaPagamento === "CREDIT_CARD" && (
              <div ref={cartaoRef} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                        Credito
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          cartaoBrandInfo ? cartaoBrandInfo.badgeClass : "bg-white/10 text-white/70"
                        }`}
                      >
                        {cartaoBrandInfo ? cartaoBrandInfo.label : "Bandeira"}
                      </span>
                    </div>

                    <div className="mt-8 text-lg font-semibold tracking-[0.25em]">
                      {cartaoNumeroExibicao}
                    </div>

                    <div className="mt-6 flex items-end justify-between gap-4 text-xs uppercase tracking-widest text-white/70">
                      <div>
                        <span className="block text-[10px] text-white/60">Nome</span>
                        <span className="text-sm font-semibold text-white">{cartaoNomeExibicao}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-white/60">Validade</span>
                        <span className="text-sm font-semibold text-white">{cartaoValidadeExibicao}</span>
                      </div>
                    </div>

                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-indigo-400/20 blur-2xl" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700">Dados do cartao</h3>
                        <p className="text-xs text-slate-500">Digite exatamente como no cartao.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cardBrandConfigs.map((brand) => {
                          const ativo = cartaoBrand === brand.id;
                          return (
                            <span
                              key={brand.id}
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                ativo ? brand.badgeClass : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {brand.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Nome no cartao
                        <input
                          type="text"
                          value={cartaoNome}
                          onChange={(e) => {
                            setCartaoNome(e.target.value);
                            setFieldError("cartaoNome");
                          }}
                          className={`${getInputClasses("cartaoNome")} rounded-xl bg-white shadow-sm`}
                          placeholder="Nome impresso no cartao"
                          autoComplete="cc-name"
                          autoCapitalize="words"
                        />
                        {formErrors.cartaoNome && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.cartaoNome}</p>
                        )}
                      </label>

                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Numero do cartao
                        <input
                          type="text"
                          value={cartaoNumero}
                          onChange={(e) => {
                            setCartaoNumero(formatCardNumber(e.target.value));
                            setFieldError("cartaoNumero");
                          }}
                          className={`${getInputClasses("cartaoNumero")} rounded-xl bg-white shadow-sm`}
                          placeholder={cartaoNumeroPlaceholder}
                          inputMode="numeric"
                          autoComplete="cc-number"
                          maxLength={cartaoNumeroMaxLength}
                          spellCheck={false}
                        />
                        {formErrors.cartaoNumero && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.cartaoNumero}</p>
                        )}
                      </label>

                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Validade
                        <input
                          type="text"
                          value={cartaoValidade}
                          onChange={(e) => {
                            setCartaoValidade(formatCardExpiry(e.target.value));
                            setFieldError("cartaoValidade");
                          }}
                          className={`${getInputClasses("cartaoValidade")} rounded-xl bg-white shadow-sm`}
                          placeholder="MM/AA"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          maxLength={5}
                        />
                        {formErrors.cartaoValidade && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.cartaoValidade}</p>
                        )}
                      </label>

                      <label className="text-xs font-semibold uppercase text-slate-500">
                        CVV
                        <input
                          type="password"
                          value={cartaoCvv}
                          onChange={(e) => {
                            setCartaoCvv(onlyNumbers(e.target.value).slice(0, cartaoCvvMaxLength));
                            setFieldError("cartaoCvv");
                          }}
                          className={`${getInputClasses("cartaoCvv")} rounded-xl bg-white shadow-sm`}
                          placeholder={cartaoCvvPlaceholder}
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          maxLength={cartaoCvvMaxLength}
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          {cartaoBrand === "amex" ? "4 digitos na frente" : "3 digitos no verso"}
                        </p>
                        {formErrors.cartaoCvv && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.cartaoCvv}</p>
                        )}
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <h4 className="text-xs font-semibold uppercase text-slate-500">Endereco de cobranca</h4>
                      <div className="grid gap-3 sm:grid-cols-2 mt-3">
                        <label className="text-xs font-semibold uppercase text-slate-500">
                          CEP
                          <input
                            type="text"
                            value={enderecoCep}
                            onChange={(e) => {
                              setEnderecoCep(formatCep(e.target.value));
                              setFieldError("enderecoCep");
                            }}
                            className={`${getInputClasses("enderecoCep")} rounded-xl bg-white shadow-sm`}
                            placeholder="00000-000"
                            inputMode="numeric"
                          />
                          {formErrors.enderecoCep && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.enderecoCep}</p>
                          )}
                        </label>

                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Rua
                          <input
                            type="text"
                            value={enderecoRua}
                            onChange={(e) => {
                              setEnderecoRua(e.target.value);
                              setFieldError("enderecoRua");
                            }}
                            className={`${getInputClasses("enderecoRua")} rounded-xl bg-white shadow-sm`}
                            placeholder="Rua / Avenida"
                          />
                          {formErrors.enderecoRua && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.enderecoRua}</p>
                          )}
                        </label>

                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Numero
                          <input
                            type="text"
                            value={enderecoNumero}
                            onChange={(e) => {
                              setEnderecoNumero(e.target.value);
                              setFieldError("enderecoNumero");
                            }}
                            className={`${getInputClasses("enderecoNumero")} rounded-xl bg-white shadow-sm`}
                            placeholder="Numero"
                          />
                          {formErrors.enderecoNumero && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.enderecoNumero}</p>
                          )}
                        </label>

                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Complemento (opcional)
                          <input
                            type="text"
                            value={enderecoComplemento}
                            onChange={(e) => setEnderecoComplemento(e.target.value)}
                            className={`${getInputClasses("enderecoComplemento")} rounded-xl bg-white shadow-sm`}
                            placeholder="Apto, casa, bloco"
                          />
                        </label>

                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Bairro
                          <input
                            type="text"
                            value={enderecoBairro}
                            onChange={(e) => {
                              setEnderecoBairro(e.target.value);
                              setFieldError("enderecoBairro");
                            }}
                            className={`${getInputClasses("enderecoBairro")} rounded-xl bg-white shadow-sm`}
                            placeholder="Bairro"
                          />
                          {formErrors.enderecoBairro && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.enderecoBairro}</p>
                          )}
                        </label>

                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Cidade
                          <input
                            type="text"
                            value={enderecoCidade}
                            onChange={(e) => {
                              setEnderecoCidade(e.target.value);
                              setFieldError("enderecoCidade");
                            }}
                            className={`${getInputClasses("enderecoCidade")} rounded-xl bg-white shadow-sm`}
                            placeholder="Cidade"
                          />
                          {formErrors.enderecoCidade && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.enderecoCidade}</p>
                          )}
                        </label>

                        <label className="text-xs font-semibold uppercase text-slate-500">
                          Estado (UF)
                          <input
                            type="text"
                            value={enderecoEstado}
                            onChange={(e) => {
                              setEnderecoEstado(e.target.value.toUpperCase().slice(0, 2));
                              setFieldError("enderecoEstado");
                            }}
                            className={`${getInputClasses("enderecoEstado")} rounded-xl bg-white shadow-sm`}
                            placeholder="UF"
                            maxLength={2}
                          />
                          {formErrors.enderecoEstado && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.enderecoEstado}</p>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                    {hasCustomComboPricing(comboAtivo)
                      ? `Valores do combo ${comboAtivo.nome}: ${describeComboValores(comboAtivo)}.`
                      : comboAtivo.preco && comboAtivo.preco > 0
                      ? `Valor especial do combo ${comboAtivo.nome}.`
                      : comboAtivo.desconto && comboAtivo.desconto > 0
                      ? `Desconto de ${comboAtivo.desconto}% aplicado!`
                      : `Combo ${comboAtivo.nome} aplicado.`}
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
          {(checkoutUrl || cartaoResultado) && (
            <div 
              ref={paymentCardRef}
              className="mt-8 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                animation: 'pulse-glow 3s ease-in-out infinite'
              }}
            >
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                {cartaoResultado ? "Pagamento no cartao" : "Finalize seu Pagamento"}
              </h3>
              
              {cartaoResultado ? (
                <div className="text-center space-y-4">
                  <p className="text-lg text-white/90">
                    {cartaoResultado.message}
                  </p>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${
                      cartaoResultado.status === "success"
                        ? "bg-emerald-500/20 text-emerald-100"
                        : cartaoResultado.status === "pending"
                        ? "bg-amber-500/20 text-amber-100"
                        : "bg-rose-500/20 text-rose-100"
                    }`}
                  >
                    {cartaoResultado.status === "success"
                      ? "Pagamento confirmado"
                      : cartaoResultado.status === "pending"
                      ? "Pagamento em processamento"
                      : "Pagamento nao aprovado"}
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <p className="mb-6 text-lg text-white/90 text-center">
                      Clique no botao abaixo para acessar a pagina de pagamento:
                    </p>
                    <a
                      href={checkoutUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-green-600 text-white py-4 px-8 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors shadow-lg transform hover:scale-105"
                    >
                      Realizar Pagamento PIX
                    </a>
                    <p className="mt-4 text-sm text-white/80 text-center">
                      Voce sera redirecionado para a pagina de pagamento PIX
                    </p>
                  </div>
                  
                  {pixKey && (
                    <div className="mt-6">
                      <p className="mb-4 text-white/90 text-center">Use a chave PIX abaixo para pagamento:</p>
                      <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg mb-4 border border-white/30">
                        <p className="font-mono text-sm break-all text-white">{pixKey}</p>
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
                        <p className="text-sm text-white/80 text-center">
                          Valido ate: {new Date(expirationDate).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
              
        </div>
      </div>
    </section>
  );
}

// Adicionar CSS para animação do card de pagamento
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1);
      transform: translateY(0);
    }
    50% {
      box-shadow: 0 25px 50px -12px rgba(102, 126, 234, 0.4), 0 0 30px rgba(102, 126, 234, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
  }
`;
if (!document.head.querySelector('style[data-payment-card]')) {
  style.setAttribute('data-payment-card', 'true');
  document.head.appendChild(style);
}

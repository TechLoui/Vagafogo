import { createHash, randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";

const PAYMENT_IDEMPOTENCY_COLLECTION = "_payment_idempotency";
const PAYMENT_LEASE_MS = 5 * 60 * 1000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export type PaymentHttpResponse = {
  httpStatus: number;
  body: Record<string, unknown>;
};

export type PaymentAttemptContext = {
  documentId: string;
  ownerId: string;
  requestHash: string;
  reservaId: string;
};

export type PaymentAttemptClaim =
  | { type: "acquired"; context: PaymentAttemptContext }
  | { type: "replay"; response: PaymentHttpResponse }
  | { type: "in_progress"; documentId: string; requestHash: string }
  | { type: "conflict" };

export class PaymentIdempotencyKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentIdempotencyKeyError";
  }
}

export class PaymentIdempotencyUnavailableError extends Error {
  constructor() {
    super("O armazenamento de idempotencia de pagamentos nao esta disponivel.");
    this.name = "PaymentIdempotencyUnavailableError";
  }
}

export const normalizarChaveIdempotenciaPagamento = (value: unknown) => {
  if (typeof value !== "string") {
    throw new PaymentIdempotencyKeyError(
      "Envie o cabecalho Idempotency-Key para processar o pagamento."
    );
  }

  const normalized = value.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    throw new PaymentIdempotencyKeyError(
      "Idempotency-Key deve ter entre 8 e 128 caracteres seguros."
    );
  }

  return normalized;
};

const sanitizarPayloadParaFingerprint = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const sanitized: Record<string, unknown> = { ...source };
  const creditCard = source.creditCard;

  if (creditCard && typeof creditCard === "object" && !Array.isArray(creditCard)) {
    const { number: _number, ccv: _ccv, ...safeCardFields } = creditCard as Record<
      string,
      unknown
    >;
    sanitized.creditCard = {
      ...safeCardFields,
      number: "[redacted]",
      ccv: "[redacted]",
    };
  }

  return sanitized;
};

const stringifyCanonico = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyCanonico(item)).join(",")}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const entries = Object.keys(objectValue)
    .filter((key) => objectValue[key] !== undefined)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stringifyCanonico(objectValue[key])}`
    );
  return `{${entries.join(",")}}`;
};

export const calcularHashRequisicaoPagamento = (payload: unknown) =>
  createHash("sha256")
    .update(stringifyCanonico(sanitizarPayloadParaFingerprint(payload)))
    .digest("hex");

const calcularIdDocumento = (idempotencyKey: string) =>
  createHash("sha256")
    .update("payment-idempotency:v1\0")
    .update(idempotencyKey)
    .digest("hex");

const obterFirestoreObrigatorio = () => {
  const firestore = obterFirestoreAdmin();
  if (!firestore) {
    throw new PaymentIdempotencyUnavailableError();
  }
  return firestore;
};

const obterMillis = (value: unknown) => {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return 0;
};

const lerRespostaArmazenada = (
  data: Record<string, unknown>
): PaymentHttpResponse | null => {
  const httpStatus = Number(data.httpStatus);
  const body = data.responseBody;
  if (
    !Number.isInteger(httpStatus) ||
    httpStatus < 100 ||
    httpStatus > 599 ||
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return null;
  }
  return { httpStatus, body: body as Record<string, unknown> };
};

export const iniciarTentativaPagamento = async (
  idempotencyKey: string,
  payload: unknown
): Promise<PaymentAttemptClaim> => {
  const firestore = obterFirestoreObrigatorio();
  const documentId = calcularIdDocumento(idempotencyKey);
  const requestHash = calcularHashRequisicaoPagamento(payload);
  const ownerId = randomUUID();
  const reservaId = randomUUID();
  const now = Date.now();
  const ref = firestore.collection(PAYMENT_IDEMPOTENCY_COLLECTION).doc(documentId);

  return firestore.runTransaction(async (transaction): Promise<PaymentAttemptClaim> => {
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) {
      transaction.create(ref, {
        requestHash,
        reservaId,
        status: "processing",
        leaseOwner: ownerId,
        leaseExpiresAt: Timestamp.fromMillis(now + PAYMENT_LEASE_MS),
        attemptCount: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        type: "acquired",
        context: { documentId, ownerId, requestHash, reservaId },
      };
    }

    const data = snapshot.data() as Record<string, unknown>;
    if (data.requestHash !== requestHash) {
      return { type: "conflict" };
    }

    if (data.status === "completed") {
      const response = lerRespostaArmazenada(data);
      if (response) {
        return { type: "replay", response };
      }
    }

    if (data.status === "processing" && obterMillis(data.leaseExpiresAt) > now) {
      return { type: "in_progress", documentId, requestHash };
    }

    const storedReservaId =
      typeof data.reservaId === "string" && data.reservaId.trim()
        ? data.reservaId.trim()
        : reservaId;
    transaction.update(ref, {
      reservaId: storedReservaId,
      status: "processing",
      leaseOwner: ownerId,
      leaseExpiresAt: Timestamp.fromMillis(now + PAYMENT_LEASE_MS),
      attemptCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {
      type: "acquired",
      context: {
        documentId,
        ownerId,
        requestHash,
        reservaId: storedReservaId,
      },
    };
  });
};

export const aguardarTentativaPagamento = async (
  documentId: string,
  requestHash: string,
  timeoutMs = 20_000
): Promise<PaymentHttpResponse | null> => {
  const firestore = obterFirestoreObrigatorio();
  const ref = firestore.collection(PAYMENT_IDEMPOTENCY_COLLECTION).doc(documentId);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const snapshot = await ref.get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() as Record<string, unknown>;
    if (data.requestHash !== requestHash) return null;
    if (data.status === "completed") {
      return lerRespostaArmazenada(data);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return null;
};

export const concluirTentativaPagamento = async (
  context: PaymentAttemptContext,
  response: PaymentHttpResponse,
  paymentId?: string
) => {
  const firestore = obterFirestoreObrigatorio();
  const ref = firestore
    .collection(PAYMENT_IDEMPOTENCY_COLLECTION)
    .doc(context.documentId);

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as Record<string, unknown> | undefined;
    if (
      !snapshot.exists ||
      data?.requestHash !== context.requestHash ||
      data?.leaseOwner !== context.ownerId
    ) {
      throw new Error("A posse da tentativa de pagamento foi perdida.");
    }

    transaction.update(ref, {
      status: "completed",
      httpStatus: response.httpStatus,
      responseBody: response.body,
      ...(paymentId ? { paymentId } : {}),
      leaseExpiresAt: Timestamp.fromMillis(0),
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

export const renovarTentativaPagamento = async (
  context: PaymentAttemptContext
) => {
  const firestore = obterFirestoreObrigatorio();
  const ref = firestore
    .collection(PAYMENT_IDEMPOTENCY_COLLECTION)
    .doc(context.documentId);

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as Record<string, unknown> | undefined;
    if (
      !snapshot.exists ||
      data?.status !== "processing" ||
      data?.requestHash !== context.requestHash ||
      data?.leaseOwner !== context.ownerId
    ) {
      throw new Error("A posse da tentativa de pagamento foi perdida.");
    }

    transaction.update(ref, {
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + PAYMENT_LEASE_MS),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

export const liberarTentativaPagamento = async (
  context: PaymentAttemptContext,
  retryAfterMs = 0
) => {
  const firestore = obterFirestoreObrigatorio();
  const ref = firestore
    .collection(PAYMENT_IDEMPOTENCY_COLLECTION)
    .doc(context.documentId);

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() as Record<string, unknown> | undefined;
    if (
      !snapshot.exists ||
      data?.status !== "processing" ||
      data?.requestHash !== context.requestHash ||
      data?.leaseOwner !== context.ownerId
    ) {
      return;
    }

    transaction.update(ref, {
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + Math.max(retryAfterMs, 0)),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
};

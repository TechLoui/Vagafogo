type AgentService = "gateway" | "ai";

export type AgentResponse = {
  status: number;
  contentType: string;
  body: unknown;
};

const cleanBaseUrl = (value: string | undefined) => (value ?? "").trim().replace(/\/+$/, "");

const baseUrlFor = (service: AgentService) =>
  service === "gateway"
    ? cleanBaseUrl(process.env.AGENT_GATEWAY_URL)
    : cleanBaseUrl(process.env.AGENT_AI_URL);

const internalToken = () => (process.env.AGENT_INTERNAL_API_TOKEN ?? "").trim();

export const agentServiceConfigured = (service: AgentService) => Boolean(baseUrlFor(service));

export async function requestAgentService(
  service: AgentService,
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<AgentResponse> {
  const baseUrl = baseUrlFor(service);
  if (!baseUrl) {
    return {
      status: 503,
      contentType: "application/json",
      body: {
        error: service === "gateway" ? "AGENT_GATEWAY_NOT_CONFIGURED" : "AGENT_AI_NOT_CONFIGURED",
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    const token = internalToken();
    const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { "X-Internal-Token": token } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "application/json";
    const raw = await response.text();
    let body: unknown = raw;
    if (contentType.includes("application/json")) {
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = { error: "AGENT_SERVICE_INVALID_JSON" };
      }
    }
    return { status: response.status, contentType, body };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      status: 502,
      contentType: "application/json",
      body: {
        error: isTimeout ? "AGENT_SERVICE_TIMEOUT" : "AGENT_SERVICE_UNAVAILABLE",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

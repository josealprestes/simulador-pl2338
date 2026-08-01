/**
 * Armazenamento da configuração do provedor de IA.
 *
 * Segurança: dados não sensíveis (providerId, endpoint, model) persistem em
 * localStorage; a API key NUNCA é persistida em localStorage. A chave fica
 * apenas em sessionStorage (limpa ao fechar a aba) e é usada somente pelo
 * navegador durante a sessão. A chave não entra em logs, histórico,
 * exportação ou hash.
 */

const AI_PROVIDER_CONFIG_KEY = "aiProviderConfig";
const AI_PROVIDER_API_KEY_SESSION_KEY = "aiProviderApiKey";

export interface AIProviderConfig {
  providerId: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * Lê a configuração do provedor de IA.
 * A API key é lida exclusivamente do sessionStorage da sessão atual.
 */
export function getAIProviderConfig(): AIProviderConfig | null {
  const raw = localStorage.getItem(AI_PROVIDER_CONFIG_KEY);
  if (!raw) return null;
  try {
    const config = JSON.parse(raw) as Record<string, unknown>;
    const apiKey = sessionStorage.getItem(AI_PROVIDER_API_KEY_SESSION_KEY) ?? "";
    return {
      providerId: typeof config.providerId === "string" ? config.providerId : "",
      endpoint: typeof config.endpoint === "string" ? config.endpoint : "",
      apiKey,
      model: typeof config.model === "string" ? config.model : "",
    };
  } catch {
    return null;
  }
}

/** Salva apenas configuração não sensível; a chave vai para o sessionStorage. */
export function saveAIProviderConfig(
  config: { providerId: string; endpoint: string; model: string },
  apiKey?: string,
): void {
  localStorage.setItem(AI_PROVIDER_CONFIG_KEY, JSON.stringify(config));
  if (apiKey) {
    sessionStorage.setItem(AI_PROVIDER_API_KEY_SESSION_KEY, apiKey);
  }
}

/**
 * Migração segura: chaves antigas persistidas em localStorage são movidas
 * para sessionStorage e removidas imediatamente do localStorage.
 */
export function migrateLegacyApiKey(): void {
  try {
    const raw = localStorage.getItem(AI_PROVIDER_CONFIG_KEY);
    if (!raw) return;
    const config = JSON.parse(raw) as Record<string, unknown>;
    if (typeof config.apiKey === "string" && config.apiKey.length > 0) {
      sessionStorage.setItem(AI_PROVIDER_API_KEY_SESSION_KEY, config.apiKey);
    }
    delete config.apiKey;
    localStorage.setItem(AI_PROVIDER_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Configuração corrompida: deixa como está; a leitura normal retorna null.
  }
}

/** Remove a credencial da sessão atual. */
export function clearApiKey(): void {
  sessionStorage.removeItem(AI_PROVIDER_API_KEY_SESSION_KEY);
}

/** Indica se há uma credencial ativa na sessão. */
export function hasApiKey(): boolean {
  return (sessionStorage.getItem(AI_PROVIDER_API_KEY_SESSION_KEY) ?? "") !== "";
}

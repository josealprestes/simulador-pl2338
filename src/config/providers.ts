export interface AIProvider {
  id: string;
  label: string;
  endpoint: string;
  keyPlaceholder: string;
  keyHint?: string;
  keyHintUrl?: string;
  models: { id: string; label: string }[];
  defaultModel: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai", label: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    keyPlaceholder: "sk-[0m[38;5;246m...", keyHint: "Obtenha em platform.openai.com/api-keys",
    keyHintUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "o3-mini", label: "o3-mini" },
    ],
    defaultModel: "gpt-4o",
  },
  {
    id: "google", label: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyPlaceholder: "AIza...", keyHint: "Obtenha em aistudio.google.com/apikey",
    keyHintUrl: "https://aistudio.google.com/apikey",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "anthropic", label: "Anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    keyPlaceholder: "sk-ant-...", keyHint: "Obtenha em console.anthropic.com/settings/keys",
    keyHintUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    id: "xiaomi", label: "Xiaomi MiMo",
    endpoint: "https://token-plan-sgp.xiaomimimo.com/v1/chat/completions",
    keyPlaceholder: "tp-...", keyHint: "Obtenha em mimo.xiaomi.com",
    keyHintUrl: "https://mimo.xiaomi.com",
    models: [
      { id: "mimo-v2.5-pro", label: "MiMo V2.5 Pro" },
      { id: "mimo-v2.5", label: "MiMo V2.5" },
    ],
    defaultModel: "mimo-v2.5-pro",
  },
  {
    id: "ollama", label: "Ollama Local",
    endpoint: "http://localhost:11434/v1/chat/completions",
    keyPlaceholder: "", models: [], defaultModel: "",
  },
  {
    id: "ollama_cloud", label: "Ollama Cloud",
    endpoint: "",
    keyPlaceholder: "Sua API key (opcional)", keyHint: "Informe a API Key se o seu servidor exigir autenticação",
    models: [], defaultModel: "",
  },
];

export const CUSTOM_PROVIDER: AIProvider = {
  id: "custom", label: "Personalizado", endpoint: "",
  keyPlaceholder: "Sua API key", models: [], defaultModel: "",
};
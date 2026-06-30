export type LLMProvider = "anthropic" | "openai" | "google" | "tesseract";

export interface ProviderInfo {
  id: LLMProvider;
  label: string;
  recommended?: boolean;
  free?: boolean;
  needsKey: boolean;
  local?: boolean;
  defaultModel: string;
  supportsPdf: boolean;
  keyHint: string;
  keysUrl: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    recommended: true,
    needsKey: true,
    defaultModel: "claude-opus-4-8",
    supportsPdf: true,
    keyHint: "sk-ant-...",
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    label: "OpenAI (GPT-4o)",
    needsKey: true,
    defaultModel: "gpt-4o",
    supportsPdf: false,
    keyHint: "sk-...",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google",
    label: "Google Gemini",
    needsKey: true,
    defaultModel: "gemini-1.5-flash",
    supportsPdf: true,
    keyHint: "AIza...",
    keysUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "tesseract",
    label: "Tesseract (free, no key)",
    free: true,
    needsKey: false,
    local: true,
    defaultModel: "",
    supportsPdf: false,
    keyHint: "",
    keysUrl: "",
  },
];

export function getProvider(id: LLMProvider): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

const PROVIDER_KEY = "llm_provider";
const MODEL_KEY = (p: LLMProvider) => `llm_model_${p}`;
const APIKEY_KEY = (p: LLMProvider) => `llm_key_${p}`;

export interface LLMSettings {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export function loadSettings(): LLMSettings {
  if (typeof window === "undefined") {
    return { provider: "anthropic", apiKey: "", model: "claude-opus-4-8" };
  }
  const provider = (localStorage.getItem(PROVIDER_KEY) as LLMProvider) || "anthropic";
  const info = getProvider(provider);
  return {
    provider,
    apiKey: localStorage.getItem(APIKEY_KEY(provider)) || "",
    model: localStorage.getItem(MODEL_KEY(provider)) || info.defaultModel,
  };
}

export function saveSettings(s: LLMSettings): void {
  localStorage.setItem(PROVIDER_KEY, s.provider);
  localStorage.setItem(APIKEY_KEY(s.provider), s.apiKey);
  localStorage.setItem(MODEL_KEY(s.provider), s.model);
}

/** The stored key for a provider (used to check the prerequisite is met). */
export function keyFor(provider: LLMProvider): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(APIKEY_KEY(provider)) || "";
}

export function clearKey(provider: LLMProvider): void {
  localStorage.removeItem(APIKEY_KEY(provider));
}

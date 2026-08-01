import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { GearIcon, CheckCircledIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import { AI_PROVIDERS, CUSTOM_PROVIDER, type AIProvider } from "@/config/providers";
import { StepIndicator } from "@/components/config/StepIndicator";
import { ProviderCard } from "@/components/config/ProviderCard";
import { useNavigationStore } from "@/stores/navigation.store";
import {
  getAIProviderConfig,
  migrateLegacyApiKey,
  clearApiKey,
  saveAIProviderConfig,
  hasApiKey,
} from "@/lib/aiConfigStorage";

function getOllamaTagsUrl(endpointUrl: string): string {
  try {
    const url = new URL(endpointUrl);
    if (url.pathname.endsWith("/v1/chat/completions")) {
      url.pathname = url.pathname.replace("/v1/chat/completions", "/api/tags");
    } else if (url.pathname.endsWith("/v1/")) {
      url.pathname = url.pathname.replace("/v1/", "/api/tags");
    } else if (url.pathname.endsWith("/v1")) {
      url.pathname = url.pathname.replace("/v1", "/api/tags");
    } else if (url.pathname === "/") {
      url.pathname = "/api/tags";
    } else if (!url.pathname.endsWith("/api/tags")) {
      url.pathname = "/api/tags";
    }
    return url.toString();
  } catch {
    return endpointUrl.replace(/\/v1\/chat\/completions\/?$/, "") + "/api/tags";
  }
}

interface TestResult {
  ok: boolean;
  message: string;
}

export default function AiConfigScreen() {
  const { t } = useTranslation();
  const { setScreen } = useNavigationStore();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"local" | "remote">("local");
  const [providerId, setProviderId] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [ollamaModels, setOllamaModels] = useState<{ id: string; label: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const [isValidated, setIsValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [useManualOllamaModel, setUseManualOllamaModel] = useState(false);

  const currentProvider = providerId ? [...AI_PROVIDERS, CUSTOM_PROVIDER].find(p => p.id === providerId) || CUSTOM_PROVIDER : null;

  async function fetchOllamaModels(targetEndpoint: string) {
    if (!targetEndpoint) {
      setOllamaModels([]);
      return;
    }
    setValidating(true);
    setValidationError(null);
    setValidationSuccess(false);
    setModelError(null);
    try {
      const tagsUrl = getOllamaTagsUrl(targetEndpoint);
      const res = await fetch(tagsUrl);
      if (!res.ok) {
        throw new Error(`Erro ao buscar modelos: ${res.statusText}`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.models)) {
        const models = data.models.map((m: any) => ({
          id: m.name,
          label: m.name,
        }));
        setOllamaModels(models);
        if (models.length > 0) {
          const exists = models.some((x: any) => x.id === model);
          if (!exists) {
            setModel(models[0].id);
          }
          setIsValidated(true);
          setValidationSuccess(true);
        } else {
          setModelError(t("aiConfig.models_not_found", "Nenhum modelo encontrado no Ollama. Digite o nome do modelo manualmente."));
          setIsValidated(true);
          setValidationSuccess(true);
        }
      } else {
        throw new Error("Formato de resposta inválido.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao conectar ao Ollama";
      setValidationError(msg);
      setOllamaModels([]);
      setIsValidated(false);
    } finally {
      setValidating(false);
    }
  }

  async function validateCredentials() {
    setValidating(true);
    setValidationError(null);
    setValidationSuccess(false);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      
      const testModel = currentProvider?.defaultModel || "gpt-4o-mini";
      const targetEndpoint = endpoint || currentProvider?.endpoint || "";

      if (!targetEndpoint) {
        throw new Error("Endpoint não configurado.");
      }

      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        setIsValidated(true);
        setValidationSuccess(true);
      } else {
        const msg = res.status === 401 || res.status === 403
          ? t("aiConfig.validation_error", "Falha na validação das credenciais. Verifique os dados.")
          : `Erro ${res.status}: ${res.statusText}`;
        setValidationError(msg);
        setIsValidated(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao validar credenciais";
      setValidationError(msg);
      setIsValidated(false);
    } finally {
      setValidating(false);
    }
  }

  function handleProviderChange(newProviderId: string) {
    const p = [...AI_PROVIDERS, CUSTOM_PROVIDER].find(x => x.id === newProviderId);
    if (!p) return;
    setProviderId(p.id);
    if (p.id === "ollama") { 
      setEndpoint("http://localhost:11434/v1/chat/completions"); 
      setModel("llama3");
    } else if (p.id !== "custom") { 
      setEndpoint(p.endpoint); 
      setModel(p.defaultModel);
    }
    setTestResult(null);
    setIsValidated(false);
    setValidationError(null);
    setValidationSuccess(false);
    setOllamaModels([]);
    setUseManualOllamaModel(false);
    setSaveSuccess(false);
  }

  useEffect(() => {
    migrateLegacyApiKey();
    const config = getAIProviderConfig();
    if (config) {
      setProviderId(config.providerId || "ollama");
      setEndpoint(config.endpoint);
      setApiKey(config.apiKey);
      setModel(config.model);
      setMode(config.endpoint.includes("localhost") || config.endpoint.includes("127.0.0.1") ? "local" : "remote");
      setIsValidated(true);
      // Se já tem configuração, vai direto para o passo 4
      if (config.providerId) {
        setStep(4);
      }
    }
  }, []);

  useEffect(() => {
    if (step === 3 && (providerId === "ollama" || providerId === "ollama_cloud") && endpoint) {
      fetchOllamaModels(endpoint);
    }
  }, [step, providerId]);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setSaveSuccess(false);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      if (res.ok) {
        setTestResult({ ok: true, message: "Conexão OK" });
      } else {
        setTestResult({ ok: false, message: `Erro ${res.status}: ${res.statusText}` });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha na conexão";
      setTestResult({ ok: false, message });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    // A API key não vai para o localStorage: apenas configuração não sensível.
    saveAIProviderConfig({ providerId, endpoint, model }, apiKey);
    setSaveSuccess(true);
  }

  function handleRemoveApiKey() {
    clearApiKey();
    setApiKey("");
    setSaveSuccess(false);
  }

  const steps = [
    { id: 1, label: t("aiConfig.step1", "Modo") },
    { id: 2, label: t("aiConfig.step2", "Provedor") },
    { id: 3, label: t("aiConfig.step3", "Configuração") },
    { id: 4, label: t("aiConfig.step4", "Teste") },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <PageHeader
        title={t("aiConfig.title", "Configuração de Provedor de IA")}
        icon={<GearIcon className="w-6 h-6" />}
        showHomeButton={true}
      />

      {/* Step Indicator */}
      <StepIndicator steps={steps} current={step} />

      {/* Step 1: Local vs Remote */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-on-surface">
              {t("aiConfig.step1_title", "Escolha o modo de operação")}
            </h2>
            <div className="flex gap-2">
              <Button
                variant={mode === "local" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (mode !== "local") {
                    setMode("local");
                    setProviderId("");
                  }
                }}
                className="flex-1"
              >
                {t("aiConfig.mode_local", "Local (Ollama)")}
              </Button>
              <Button
                variant={mode === "remote" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (mode !== "remote") {
                    setMode("remote");
                    setProviderId("");
                  }
                }}
                className="flex-1"
              >
                {t("aiConfig.mode_remote", "Remoto (API)")}
              </Button>
            </div>
            <div className="flex justify-end gap-3">
              <Button onClick={() => setStep(2)}>
                {t("aiConfig.continue", "Continuar")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Provider Selection */}
      {step === 2 && (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-on-surface">
              {t("aiConfig.step2_title", "Selecione o provedor")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_PROVIDERS.filter((provider) => {
                if (mode === "local") {
                  return provider.id === "ollama";
                } else {
                  return provider.id !== "ollama";
                }
              }).map((provider) => (
                <ProviderCard
                  key={provider.id}
                  label={provider.label}
                  selected={providerId === provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                />
              ))}
              <ProviderCard
                label={t("aiConfig.provider_custom", "Personalizado")}
                selected={providerId === "custom"}
                onClick={() => handleProviderChange("custom")}
              />
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                {t("common.back", "Voltar")}
              </Button>
              <Button 
                onClick={() => setStep(3)}
                disabled={!providerId}
              >
                {t("aiConfig.continue", "Continuar")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && currentProvider && (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-on-surface">
              {t("aiConfig.step3_title", "Configure o provedor")}
            </h2>

            {/* Endpoint for custom or ollama provider */}
            {(providerId === "custom" || providerId === "ollama" || providerId === "ollama_cloud") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant" htmlFor="ai-endpoint">
                  {providerId === "ollama" || providerId === "ollama_cloud"
                    ? t("aiConfig.endpoint", "Endpoint URL")
                    : t("aiConfig.endpoint_custom", "Endpoint Personalizado")}
                </label>
                <input
                  id="ai-endpoint"
                  type="text"
                  value={endpoint}
                  disabled={validating}
                  onChange={(e) => {
                    setEndpoint(e.target.value);
                    setIsValidated(false);
                    setValidationError(null);
                    setValidationSuccess(false);
                    setOllamaModels([]);
                  }}
                  className="w-full h-8 px-2.5 text-xs bg-background border border-outline-variant rounded-none text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder={providerId === "ollama" || providerId === "ollama_cloud" ? "http://localhost:11434/v1/chat/completions" : "https://api.example.com/v1/chat/completions"}
                />
              </div>
            )}

            {/* API Key for remote providers (except Ollama Local) */}
            {mode === "remote" && providerId !== "ollama" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-on-surface-variant" htmlFor="ai-apikey">
                  {t("aiConfig.api_key", "API Key")}
                  {providerId === "ollama_cloud" && <span className="text-[10px] text-on-surface-variant/60 ml-1">({t("common.optional", "Opcional")})</span>}
                </label>
                <input
                  id="ai-apikey"
                  type="password"
                  value={apiKey}
                  disabled={validating}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsValidated(false);
                    setValidationError(null);
                    setValidationSuccess(false);
                  }}
                  className="w-full h-8 px-2.5 text-xs bg-background border border-outline-variant rounded-none text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder={currentProvider.keyPlaceholder || "sk-..."}
                />
                {currentProvider.keyHint && (
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    {currentProvider.keyHintUrl ? (
                      <a href={currentProvider.keyHintUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                        {currentProvider.keyHint}
                      </a>
                    ) : currentProvider.keyHint}
                  </p>
                )}
              </div>
            )}

            {/* Validation Action Button (if not validated yet) */}
            {!isValidated && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (providerId === "ollama" || providerId === "ollama_cloud") {
                      fetchOllamaModels(endpoint);
                    } else {
                      validateCredentials();
                    }
                  }}
                  disabled={validating || (!endpoint && (providerId === "custom" || providerId === "ollama" || providerId === "ollama_cloud")) || (!apiKey && mode === "remote" && providerId !== "ollama" && providerId !== "ollama_cloud")}
                  className="w-full"
                >
                  {validating
                    ? t("aiConfig.validating", "Validando...")
                    : t("aiConfig.validate_credentials", "Validar Credenciais")}
                </Button>
              </div>
            )}

            {/* Validation Result Feedback */}
            {validationSuccess && (
              <div className="flex items-center gap-2 p-2.5 text-xs rounded bg-green-500/10 text-green-400">
                <CheckCircledIcon className="w-4 h-4 text-green-500 shrink-0" />
                <span>{t("aiConfig.validation_success", "Credenciais validadas com sucesso!")}</span>
              </div>
            )}
            {validationError && (
              <div className="flex items-center gap-2 p-2.5 text-xs rounded bg-red-500/10 text-red-400">
                <CrossCircledIcon className="w-4 h-4 text-red-500 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Model selection (only shown if validated) */}
            {isValidated && (
              <div className="space-y-1.5 pt-2 border-t border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-on-surface-variant" htmlFor="ai-model">
                    {t("aiConfig.model", "Modelo")}
                  </label>
                  {(providerId === "ollama" || providerId === "ollama_cloud") && (
                    <button
                      type="button"
                      onClick={() => fetchOllamaModels(endpoint)}
                      disabled={validating || !endpoint}
                      className="text-[10px] text-primary hover:underline focus:outline-none disabled:opacity-50"
                    >
                      {validating ? "Buscando..." : "Atualizar Modelos"}
                    </button>
                  )}
                </div>
                {(providerId === "ollama" || providerId === "ollama_cloud") && ollamaModels.length > 0 && !useManualOllamaModel ? (
                  <select
                    id="ai-model"
                    value={model}
                    onChange={(e) => {
                      if (e.target.value === "__manual__") {
                        setUseManualOllamaModel(true);
                        setModel("");
                      } else {
                        setModel(e.target.value);
                      }
                    }}
                    className="w-full h-8 px-2.5 text-xs bg-background border border-outline-variant rounded-none text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>{t("aiConfig.model_select", "Selecione um Modelo")}</option>
                    {ollamaModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                    <option value="__manual__">{t("aiConfig.use_manual_model", "Digitar modelo manualmente...")}</option>
                  </select>
                ) : currentProvider && currentProvider.models.length > 0 ? (
                  <select
                    id="ai-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs bg-background border border-outline-variant rounded-none text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {currentProvider.models.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <input
                      id="ai-model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full h-8 px-2.5 text-xs bg-background border border-outline-variant rounded-none text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={providerId === "ollama" || providerId === "ollama_cloud" ? "llama3" : "model-name"}
                    />
                    {(providerId === "ollama" || providerId === "ollama_cloud") && ollamaModels.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseManualOllamaModel(false);
                          if (ollamaModels.length > 0) {
                            setModel(ollamaModels[0].id);
                          }
                        }}
                        className="text-[10px] text-primary hover:underline focus:outline-none"
                      >
                        {t("aiConfig.select_from_list", "Selecionar da lista de modelos...")}
                      </button>
                    )}
                  </div>
                )}
                {(providerId === "ollama" || providerId === "ollama_cloud") && modelError && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {modelError}. Insira o nome do modelo manualmente acima se preferir.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => {
                setStep(2);
                setTestResult(null);
                setValidationError(null);
                setValidationSuccess(false);
              }}>
                {t("common.back", "Voltar")}
              </Button>
              <Button onClick={() => setStep(4)} disabled={!isValidated || !model}>
                {t("aiConfig.continue", "Continuar")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Test and Save */}
      {step === 4 && (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-semibold text-on-surface">
              {t("aiConfig.step4_title", "Teste e salve a configuração")}
            </h2>

            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface">
                {t("aiConfig.summary_title", "Resumo da configuração:")}
              </p>
              <div className="text-xs text-on-surface-variant space-y-1">
                <p><strong>{t("aiConfig.mode", "Modo")}:</strong> {mode === "local" ? t("aiConfig.mode_local", "Local (Ollama)") : t("aiConfig.mode_remote", "Remoto (API)")}</p>
                <p><strong>{t("aiConfig.provider", "Provedor")}:</strong> {currentProvider ? currentProvider.label : providerId}</p>
                {(providerId === "custom" || providerId === "ollama" || providerId === "ollama_cloud") && <p><strong>{t("aiConfig.endpoint", "Endpoint")}:</strong> {endpoint}</p>}
                {mode === "remote" && providerId !== "ollama" && <p><strong>{t("aiConfig.api_key", "API Key")}:</strong> ***</p>}
                <p><strong>{t("aiConfig.model", "Modelo")}:</strong> {model}</p>
              </div>
            </div>

            {mode === "remote" && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-800">
                  {t(
                    "aiConfig.privacy_notice",
                    "Ao usar um provedor externo, os dados necessários à geração do relatório (métricas, parâmetros e eventos da simulação) serão enviados ao endpoint configurado. Consulte a política de privacidade e os termos do provedor antes de prosseguir.",
                  )}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => { setStep(3); setSaveSuccess(false); }}>
                {t("common.back", "Voltar")}
              </Button>
              {apiKey && (
                <Button variant="outline" onClick={handleRemoveApiKey}>
                  {t("aiConfig.remove_api_key", "Remover credencial")}
                </Button>
              )}
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                {testing
                  ? t("aiConfig.testing", "Testando...")
                  : t("aiConfig.test_connection", "Testar Conexão")}
              </Button>
              <Button onClick={handleSave} disabled={testing}>
                {t("aiConfig.save", "Salvar")}
              </Button>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded ${testResult.ok ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {testResult.ok ? (
                  <CheckCircledIcon className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <CrossCircledIcon className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span className={`text-xs ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {testResult.message}
                </span>
              </div>
            )}

            {/* Save success feedback */}
            {saveSuccess && (
              <div className="flex flex-col gap-2.5 p-3.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircledIcon className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-xs font-medium">
                    {t("aiConfig.save_success", "Configurações salvas com sucesso!")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setScreen("HOME")}>
                    {t("common.back_home", "Voltar ao Início")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security notice */}
      <p className="text-[10px] text-on-surface-variant/60 italic leading-relaxed space-y-1">
        <span>{t("aiConfig.security_notice", "A API Key é usada apenas pelo navegador durante a sessão atual (sessionStorage) e é apagada ao fechar a aba. Ela nunca é gravada em localStorage, nem em logs, histórico ou exportações.")}</span>
        <br />
        <span>{t("aiConfig.security_warning", "Não utilize este simulador em computadores compartilhados com credenciais reais de provedores de IA.")}</span>
      </p>
    </div>
  );
}

import type { SimulationParams, ActorConfig, ActorsMap } from "./types";

export class ActorManager {
  private params: SimulationParams;

  constructor(params: SimulationParams) {
    this.params = params;
  }

  /**
   * Atualiza a referência de parâmetros do manager.
   * Deve ser chamado sempre que a simulação substituir `this.params`
   * (reset, setParams), para o manager nunca operar com objeto obsoleto.
   */
  setParams(params: SimulationParams): void {
    this.params = params;
  }

  /**
   * Obtém a configuração de um ator específico
   * @param name Nome do ator (ex: 'ventureCapital', 'stateFund')
   * @returns Configuração do ator ou null se não estiver ativo/configurado
   */
  getActorConfig(name: string): Record<string, any> | null {
    const actor = this.params.actors?.[name];
    if (actor === true) return {};
    if (!actor || actor.active === false) return null;
    return actor;
  }

  /**
   * Verifica se um ator está ativo
   * @param name Nome do ator
   * @returns true se o ator está ativo, false caso contrário
   */
  isActorActive(name: string): boolean {
    return this.getActorConfig(name) !== null;
  }

  /**
   * Lista todos os atores ativos
   * @returns Array com nomes dos atores ativos
   */
  getActiveActors(): string[] {
    if (!this.params.actors) return [];
    
    return Object.keys(this.params.actors).filter(name => 
      this.isActorActive(name)
    );
  }

  /**
   * Verifica se o capital venture está disponível
   * @returns true se venture capital está ativo e tem pool disponível
   */
  isVentureCapitalAvailable(): boolean {
    const vcConfig = this.getActorConfig("ventureCapital");
    return vcConfig?.capitalPool !== undefined && vcConfig.capitalPool > 0;
  }

  /**
   * Verifica se o fundo público está disponível
   * @returns true se state fund está ativo e tem orçamento disponível
   */
  isStateFundAvailable(): boolean {
    const sfConfig = this.getActorConfig("stateFund");
    return sfConfig?.budget !== undefined && sfConfig.budget > 0;
  }

  /**
   * Obtém o pool de capital venture disponível
   * @returns Valor disponível no pool venture capital
   */
  getVentureCapitalPool(): number {
    const vcConfig = this.getActorConfig("ventureCapital");
    return vcConfig?.capitalPool || 0;
  }

  /**
   * Obtém o orçamento do fundo público disponível
   * @returns Valor disponível no fundo público
   */
  getStateFundBudget(): number {
    const sfConfig = this.getActorConfig("stateFund");
    return sfConfig?.budget || 0;
  }

  /**
   * Valida se a configuração de atores é válida
   * @returns true se todas as configurações são válidas
   */
  validateActorConfigs(): boolean {
    if (!this.params.actors) return true;

    return Object.values(this.params.actors).every(config => {
      if (config === true) return true;
      if (typeof config === 'object' && config !== null) {
        // Validar propriedades específicas para cada tipo de ator
        if (config.active === false) return true;
        
        // Se venture capital, validar capitalPool
        if (config.capitalPool !== undefined && typeof config.capitalPool !== 'number') {
          return false;
        }
        
        // Se state fund, validar budget
        if (config.budget !== undefined && typeof config.budget !== 'number') {
          return false;
        }
        
        return true;
      }
      return false;
    });
  }

  /**
   * Cria uma cópia segura da configuração de atores
   * @returns Cópia da configuração de atores
   */
  getActorsCopy(): ActorsMap {
    return JSON.parse(JSON.stringify(this.params.actors || {}));
  }

  /**
   * Atualiza a configuração de um ator específico
   * @param name Nome do ator
   * @param config Nova configuração
   */
  updateActorConfig(name: string, config: boolean | ActorConfig): void {
    if (!this.params.actors) {
      this.params.actors = {};
    }
    
    this.params.actors[name] = config;
  }

  /**
   * Remove um ator da configuração
   * @param name Nome do ator a ser removido
   */
  removeActor(name: string): void {
    if (this.params.actors && name in this.params.actors) {
      delete this.params.actors[name];
    }
  }
}
export default {
	methodology: {
		title: "Metodologia e Limites do Modelo",
		subtitle: "Simulador Baseado em Agentes (ABM) — Versão 3.0.0",
		intro:
			"Este simulador utiliza um modelo baseado em agentes (Agent-Based Modeling - ABM) para projetar os impactos econômicos e regulatórios do PL 2338/2023 sobre o ecossistema de Inteligência Artificial no Brasil.",
		description:
			"Este simulador utiliza um modelo baseado em agentes (Agent-Based Modeling - ABM) para projetar os impactos econômicos e regulatórios do PL 2338/2023 sobre o ecossistema de Inteligência Artificial no Brasil.",
		logic_title: "Motores de Simulação",
		premises: "Motores de Simulação",
		abm: "CapitalFlowEngine: modela o fluxo de capital de risco, fomento estatal e custos operacionais.",
		proxies:
			"LearningEngine: simula a curva de aprendizado em conformidade e maturidade institucional.",
		logic_capital:
			"CapitalFlowEngine: modela o fluxo de capital de risco, fomento estatal e custos operacionais.",
		logic_learning:
			"LearningEngine: simula a curva de aprendizado em conformidade e maturidade institucional.",
		logic_infra:
			"InfrastructureEngine: calcula custos de infraestrutura e drenagem de capital (Cloud Drain).",
		logic_metrics:
			"MetricsEngine: consolida indicadores de concentração (HHI) e bem-estar social.",
		caveats_title: "Limitações e Ressalvas",
		limits: "Limitações e Ressalvas",
		disclaimer:
			"O modelo é estocástico (probabilístico). Resultados variam entre execuções devido à aleatoriedade inerente ao mercado.",
		caveat_1:
			"O modelo é estocástico (probabilístico). Resultados variam entre execuções devido à aleatoriedade inerente ao mercado.",
		caveat_2:
			"Os parâmetros são baseados em literatura de referência, mas representam simplificações da realidade brasileira.",
		caveat_3:
			"O simulador não prevê o futuro; ele explora trajetórias possíveis sob diferentes premissas teóricas.",
		abm_title: "Modelagem Baseada em Agentes (ABM)",
		abm_desc:
			"Este simulador utiliza a técnica de Agent-Based Modeling (ABM) para observar fenômenos emergentes a partir de interações individuais. Diferente de modelos econométricos agregados, o ABM permite capturar a heterogeneidade das firmas (Start-ups vs Big Techs) e como regras locais (como o custo de conformidade do PL 2338) afetam a sobrevivência e a concentração de mercado ao longo do tempo.",
		premises_title: "Premissas Econômicas",
		premise_innovation:
			"Inovação é endógena e depende de investimento em P&D e aprendizado institucional.",
		premise_compliance:
			"Custos de conformidade afetam desproporcionalmente Start-ups e Big Techs.",
		premise_trust:
			"Confiança social é um ativo intangível que impacta a adoção de tecnologia.",
		premise_creative_destruction:
			"Mercados são dinâmicos: empresas falham, novas entram, e a concentração evolui.",
		caveats: "Limitações e Ressalvas",
		limits_text:
			"Este simulador é uma ferramenta exploratória de cenários, não um oráculo. Os resultados devem ser interpretados como trajetórias possíveis dentro das premissas do modelo, não previsões determinísticas.",
		limit_1:
			"O modelo é estocástico (probabilístico). Resultados variam entre execuções devido à aleatoriedade inerente ao mercado.",
		limit_2:
			"Os parâmetros são baseados em literatura de referência, mas representam simplificações da realidade brasileira.",
		limit_3:
			"O simulador não prevê o futuro; ele explora trajetórias possíveis sob diferentes premissas teóricas.",
		limit_4:
			"A dinâmica de mercado é complexa e multifatorial; este modelo captura apenas uma parte dos mecanismos envolvidos.",
		legal_note_title: "Aviso Legal",
		legal_note_desc:
			"Este simulador é uma ferramenta acadêmica e não constitui parecer jurídico ou consultoria regulatória. Os resultados não devem ser usados como base exclusiva para decisões políticas ou empresariais.",
	},
};

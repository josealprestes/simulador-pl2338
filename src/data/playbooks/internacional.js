// Playbooks: Internacional
// Auto-extracted from src/playbooks.js

import { REFERENCES } from "./helpers.js";

const playbooks = [
{
		id: "modelo_nordic",
		category: "Internacional",
		name: "Modelo de Alta Confiança (Neo-Nordic)",
		author: "Economia Institucional",
		public: false,
		work: "Capitalismo de Stakeholders e Fomento à Inovação",
		executiveSummary:
			"Inspirado em economias de alta confiança: fomento estatal massivo, alta exigência de conformidade e forte proteção ao titular. O mercado é estável e resiliente, mas com entrada mais seletiva.",
		theoreticalBasis:
			"A alta confiança reduz custos de transação e permite investimentos de longo prazo (Acemoglu et al., 2012).",
		scenarioSummary: "O cenário é inspirado em economias de alta confiança, caracterizadas por fomento estatal massivo à inovação, alta exigência de conformidade regulatória e forte proteção ao titular de dados. O modelo simula um ecossistema no qual o Estado investe ativamente em pesquisa e desenvolvimento em IA, exige conformidade rigorosa com padrões de governança e proteção de dados, e mantém elevados níveis de confiança social por meio de transparência e participação cidadã. A simulação utiliza parâmetros de investimento estatal em P&D para sistemas de IA, custos de conformidade elevados, alta probabilidade de auditoria, fortes garantias de proteção de dados baseadas na LGPD e mecanismos de participação social na governança algorítmica. O modelo fundamenta-se na literatura de capital social e confiança institucional, que sugere que altos níveis de confiança reduzem custos de transação e permitem investimentos de longo prazo em inovação responsável. O objetivo central é testar se um modelo de alta confiança é viável no contexto brasileiro e em que condições ele pode gerar resultados superiores aos modelos de regulação puramente punitiva ou de laissez-faire, oferecendo uma terceira via para o desenho regulatório da IA no Brasil.",
		modelingAssumption:
			"alta confiança inicial, fomento estatal generoso e baixa tolerância a riscos.",
		interpretiveCaution:
			"Difícil de replicar sem o histórico institucional de coesão social.",
		confidenceLevel: "medium",
		legalDevices:
			"PL 2338/2023: Arts. 4º-6º (Princípios); Art. 18 (Governança).",
		references: [
			REFERENCES.ACEMOGLU_DIRECTED,
			REFERENCES.DOSI_MAZZUCATO,
			REFERENCES.LEE_SEE,
		],
		calibrationControls: [
			{
				key: "actors.stateFund.budget",
				label: "Fundo de Inovação (R$)",
				min: 500000,
				max: 5000000,
				step: 100000,
				unit: "currency",
				defaultValue: 1500000,
			},
			{
				key: "startupComplianceThreshold",
				label: "Cultura de Risco",
				min: 0.8,
				max: 1.0,
				step: 0.02,
				unit: "percent",
				defaultValue: 0.95,
			},
		],
		liveControls: ["actors.stateFund.budget", "socialSensibility"],
		reportMetrics: ["socialTrust", "activeStartups", "stateFundsUsed"],
		keyMetrics: [
			{ id: "socialTrust", label: "Confiança Institucional", type: "percentage", icon: "CheckCircledIcon", description: "Percentual da população que confia nas instituições reguladoras de IA." },
			{ id: "activeStartups", label: "Startups Resilientes", type: "number", icon: "RocketIcon", description: "Número de startups que permanecem ativas apesar das exigências regulatórias." },
			{ id: "stateFundsUsed", label: "Fomento Público", type: "currency", icon: "ActivityLogIcon", description: "Total em R$ de recursos públicos utilizados para fomento à inovação em IA." },
			{ id: "compliantProductsRatio", label: "Padrão de Qualidade", type: "percentage", icon: "ReaderIcon", description: "Proporção de produtos de IA que atendem integralmente aos requisitos de conformidade." },
		],
		charts: [
			{ id: "concentration", title: "Concentração (HHI) e Confiança", description: "HHI mede concentração de mercado. 0 = concorrência perfeita, 10.000 = monopólio.", series: ["hhi", "socialTrust"] },
			{ id: "demographics", title: "Demografia Empresarial", description: "Big Techs: empresas com capital inicial alto. Startups: empresas novas entrantes.", series: ["activeStartups", "activeBigTechs"] },
			{ id: "products", title: "Produtos", description: "Produtos: quantidade total ofertada no mercado simulado.", series: ["totalProducts", "compliantProducts", "nonCompliantProducts"] },
			{ id: "capital", title: "Capital e Dreno", description: "Capital: soma do capital das empresas ativas. Dreno: capital que sai do sistema.", series: ["avgCapital", "cloudDrain", "stateFundsUsed"] },
			{ id: "fomento", title: "Fomento Estatal", description: "Recursos públicos utilizados para inovação e subsídios ao ecossistema.", series: ["stateFundsUsed"] },
			{ id: "compliance", title: "Conformidade Regulatória", description: "Proporção de produtos em conformidade com a regulação de IA.", series: ["compliantProductsRatio"] },
		],
		turnMeaning: "Anos",
		maxTurns: 20,
		params: {
			initialStartups: 15,
			initialBigTechs: 2,
			startupInitialCapital: 120000,
			bigTechInitialCapital: 1000000,
			startupInnovationCapacity: 25,
			bigTechInnovationCapacity: 12,
			trustRevenueFloor: 0.6,
			startupComplianceThreshold: 0.95,
			complianceCostHighRisk: 30000,
			auditProbability: 0.4,
			fineSeverity: 200000,
			sandboxCapacity: 15,
			lgpdIncidentChance: 0.01,
			socialSensibility: 15,
			actors: {
				ventureCapital: false,
				stateFund: { subsidyPerTurn: 8000, voucherCap: 40000, budget: 1500000 },
				infrastructure: false,
				openSource: { releaseCycle: 4 },
				learning: true,
			},
		},
	},
{
		id: "ai_act_vs_pl2338",
		category: "Internacional",
		name: "Rigor Extremo (EU AI Act \u00d7 PL 2338)",
		author: "Direito Comparado",
		public: false,
		work: "EU AI Act (2024) vs. PL 2338/2023",
		executiveSummary:
			"Cenário de convergência para o rigor europeu: classificação ampla de alto risco, auditorias constantes e multas pesadas. Testa o 'efeito Bruxelas' no ecossistema brasileiro, comparando o EU AI Act (lei vigente desde 12/Jul/2024) com o PL 2338 (em tramitação na Câmara em 2026).",
		theoreticalBasis:
			"O Efeito Bruxelas descreve como padrões regulatórios da UE tornam-se normas globais (Bradford, 2020). O EU AI Act entrou em vigor em 1/Ago/2024.",
		scenarioSummary: "O cenário de convergência para o rigor europeu modela a aplicação combinada do EU AI Act (Regulamento 2024/1689) e do PL 2338 brasileiro, representando um regime regulatório de intensidade máxima. A simulação testa os efeitos de classificação ampla de sistemas de alto risco, auditorias obrigatórias constantes, multas pesadas e exigências rigorosas de transparência e governança sobre o ecossistema de IA. O modelo fundamenta-se na tese do Efeito Bruxelas de Anu Bradford, segundo a qual padrões regulatórios rigorosos da União Europeia tendem a se tornar normas globais de fato, influenciando a regulação de IA em todo o mundo, inclusive no Brasil. A simulação utiliza parâmetros de classificação de risco expandida, frequência obrigatória de auditoria externa, multas elevadas proporcionais ao faturamento, custos de conformidade escalonados e requisitos de documentação técnica. O objetivo central é testar se o rigor extremo na regulação de IA gera níveis mais elevados de proteção de direitos fundamentais ou se, alternativamente, produz concentração excessiva de mercado, redução da inovação e fuga de startups para jurisdições menos exigentes.",
		modelingAssumption:
			"custo de conformidade máximo, auditoria quase certa e multas catastróficas para startups.",
		interpretiveCaution:
			"Pode levar à asfixia do mercado local em favor de incumbentes globais que suportam o custo. Note que o EU AI Act já é lei, enquanto o PL 2338 ainda está em tramitação.",
		confidenceLevel: "high",
		legalDevices:
			"EU AI Act (Lei 2024/1689); PL 2338/2023 (em tramitação): Art. 14 (Risco); Art. 25 (Governança).",
		references: [
			REFERENCES.PL2338,
			REFERENCES.ROCHET_TIROLE,
			REFERENCES.CARVALHO,
		],
		calibrationControls: [
			{
				key: "complianceCostHighRisk",
				label: "Custo de Conformidade (UE)",
				min: 10000,
				max: 500000,
				step: 5000,
				unit: "currency",
				defaultValue: 60000,
			},
			{
				key: "fineSeverity",
				label: "Multas Globais (R$)",
				min: 100000,
				max: 2000000,
				step: 100000,
				unit: "currency",
				defaultValue: 400000,
			},
		],
		liveControls: ["complianceCostHighRisk", "auditProbability"],
		reportMetrics: ["activeStartups", "hhi", "hhiHighRiskProducts", "socialTrust"],
		keyMetrics: [
			{ id: "activeStartups", label: "Permanência de Startups", type: "number", icon: "RocketIcon", description: "Quantas startups sobrevivem ao regime de rigor extremo a cada trimestre." },
			{ id: "hhi", label: "Concentração de Mercado", type: "hhi", icon: "BarChartIcon", description: "Índice Herfindahl-Hirschman: quanto maior, mais o mercado está concentrado em poucos players." },
			{ id: "socialTrust", label: "Proteção de Direitos", type: "percentage", icon: "CheckCircledIcon", description: "Percentual da população que sente seus direitos fundamentais protegidos pela regulação." },
			{ id: "avgRunway", label: "Sobrevida Financeira", type: "number", icon: "ActivityLogIcon", description: "Média de trimestres que as startups conseguem operar antes de esgotar o capital." },
		],
		charts: [
			{ id: "concentration", title: "Concentração (HHI) e Confiança", description: "HHI mede concentração de mercado. 0 = concorrência perfeita, 10.000 = monopólio.", series: ["hhi", "socialTrust"] },
			{ id: "demographics", title: "Demografia Empresarial", description: "Big Techs: empresas com capital inicial alto. Startups: empresas novas entrantes.", series: ["activeStartups", "activeBigTechs"] },
			{ id: "products", title: "Produtos", description: "Produtos: quantidade total ofertada no mercado simulado.", series: ["totalProducts", "compliantProducts", "nonCompliantProducts"] },
			{ id: "capital", title: "Capital e Dreno", description: "Capital: soma do capital das empresas ativas. Dreno: capital que sai do sistema.", series: ["avgCapital", "cloudDrain", "stateFundsUsed"] },
		],
		turnMeaning: "Trimestres",
		maxTurns: 40,
		params: {
			initialStartups: 20,
			initialBigTechs: 3,
			startupInitialCapital: 120000,
			bigTechInitialCapital: 3000000,
			startupInnovationCapacity: 15,
			bigTechInnovationCapacity: 12,
			trustRevenueFloor: 0.5,
			startupComplianceThreshold: 0.9,
			complianceCostHighRisk: 60000,
			auditProbability: 0.6,
			fineSeverity: 400000,
			sandboxCapacity: 4,
			lgpdIncidentChance: 0.03,
			socialSensibility: 25,
			actors: {
				ventureCapital: {
					investmentProbability: 0.4,
					ticketSize: 150000,
					complianceFreezeThreshold: 500000,
					fineFreezeThreshold: 1000000,
					trustFreezeThreshold: 50,
					vcFreezeMode: "probabilistic",
				},
				stateFund: false,
				infrastructure: true,
				openSource: false,
				learning: true,
			},
		},
	}
];

export default playbooks;
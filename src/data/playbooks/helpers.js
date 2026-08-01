// Shared helpers for playbook files
// Extracted from src/playbooks.js

function ref(text, url) {
	return {
		text: url && !text.includes(url)
			? text + " disponivel em: " + url + "."
			: text,
		url: url,
	};
}

const REFERENCES = {

	ACEMOGLU_DIRECTED: ref(
		"ACEMOGLU, Daron et al. The Environment and Directed Technical Change. American Economic Review, v. 102, n. 1, p. 131-166, 2012. DOI: https://doi.org/10.1257/aer.102.1.131.",
		"https://doi.org/10.1257/aer.102.1.131",
	),
	ACEMOGLU_JOHNSON: ref(
		"ACEMOGLU, Daron; JOHNSON, Simon. Power and Progress: Our Thousand-Year Struggle Over Technology and Prosperity. New York: PublicAffairs, 2023.",
		"https://www.hachettebookgroup.com/titles/daron-acemoglu/power-and-progress/9781541702530/",
	),
	ACQUISTI: ref(
		"ACQUISTI, Alessandro; TAYLOR, Curtis; WAGMAN, Liad. The Economics of Privacy. Journal of Economic Literature, v. 54, n. 2, p. 442-492, 2016. DOI: https://doi.org/10.1257/jel.54.2.442.",
		"https://doi.org/10.1257/jel.54.2.442",
	),
	AGHION: ref(
		"AGHION, Philippe et al. Competition and Innovation: an Inverted-U Relationship. The Quarterly Journal of Economics, v. 120, n. 2, p. 701-728, 2005. DOI: https://doi.org/10.1093/qje/120.2.701.",
		"https://doi.org/10.1093/qje/120.2.701",
	),
	BECKER: ref(
		"BECKER, Gary S. Crime and Punishment: An Economic Approach. Journal of Political Economy, v. 76, n. 2, p. 169-217, 1968. DOI: https://doi.org/10.1086/259394.",
		"https://doi.org/10.1086/259394",
	),
	BENDER_STOCHASTIC_PARROTS: ref(
		"BENDER, Emily M. et al. On the Dangers of Stochastic Parrots: Can Language Models Be Too Big? Proceedings of the 2021 ACM Conference on Fairness, Accountability, and Transparency, p. 610-623, 2021. DOI: https://doi.org/10.1145/3442188.3445922.",
		"https://doi.org/10.1145/3442188.3445922",
	),
	BIONI: ref(
		"BIONI, Bruno Ricardo. Proteção de Dados Pessoais: a função e os limites do consentimento. Rio de Janeiro: Forense, 2019.",
		"https://brunobioni.com.br/livros/protecao-de-dados-pessoais/",
	),
	BONABEAU: ref(
		"BONABEAU, Eric. Agent-Based Modeling: Methods and Techniques for Simulating Human Systems. Proceedings of the National Academy of Sciences, v. 99, supl. 3, p. 7280-7287, 2002. DOI: https://doi.org/10.1073/pnas.082080899.",
		"https://doi.org/10.1073/pnas.082080899",
	),
	BRYNJOLFSSON: ref(
		"BRYNJOLFSSON, Erik; MCAFEE, Andrew. The Second Machine Age: Work, Progress, and Prosperity in a Time of Brilliant Technologies. New York: W. W. Norton & Company, 2014.",
		"https://secondmachineage.com/",
	),
	CADE: ref(
		"BRASIL. Conselho Administrativo de Defesa Econômica (CADE). Guia: Programas de Compliance. Brasília: CADE, 2016.",
		"https://www.gov.br/cade/pt-br/centrais-de-conteudo/publicacoes/guias-do-cade/guia-compliance.pdf",
	),
	CARVALHO: ref(
		"CARVALHO, Lucas Borges de. O poder público e a proteção de dados pessoais no Brasil: novos desafios, velhas práticas administrativas. Revista de Direito Administrativo, v. 282, n. 2, p. 133-162, 2023. DOI: https://doi.org/10.12660/rda.v282.2023.89347.",
		"https://doi.org/10.12660/rda.v282.2023.89347",
	),
	CARVALHO_GOLDBAUM: ref(
		"CARVALHO, Adilson Santana de; GOLDBAUM, Sergio. The Deterrent Power of Cartel Fines: An Assessment Based on Brazil's Recent Experience. Revista Direito GV, v. 21, 2025. DOI: https://doi.org/10.1590/2317-6172202508.",
		"https://doi.org/10.1590/2317-6172202508",
	),
	CDC: ref(
		"BRASIL. Lei n. 8.078, de 11 de setembro de 1990. Código de Defesa do Consumidor.",
		"https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm",
	),
	COOTER_ULEN: ref(
		"COOTER, Robert; ULEN, Thomas. Law and Economics. Glenview: Scott, Foresman, 1988.",
		"https://lawcat.berkeley.edu/record/1127400/files/fulltext.pdf",
	),
	DIETVORST: ref(
		"DIETVORST, Berkeley J.; SIMMONS, Joseph P.; MASSEY, Cade. Algorithm Aversion: People Erroneously Avoid Algorithms After Seeing Them Err. Journal of Experimental Psychology: General, v. 144, n. 1, p. 114-126, 2015. DOI: https://doi.org/10.1037/xge0000033.",
		"https://doi.org/10.1037/xge0000033",
	),
	DJANKOV: ref(
		"DJANKOV, Simeon et al. The Regulation of Entry. The Quarterly Journal of Economics, v. 117, n. 1, p. 1-37, 2002. DOI: https://doi.org/10.1162/003355302753399436.",
		"https://doi.org/10.1162/003355302753399436",
	),
	DOSI: ref(
		"DOSI, Giovanni. Technological Paradigms and Technological Trajectories. Research Policy, v. 11, n. 3, p. 147-162, 1982. DOI: https://doi.org/10.1016/0048-7333(82)90016-6.",
		"https://doi.org/10.1016/0048-7333(82)90016-6",
	),
	DOSI_MAZZUCATO: ref(
		"DOSI, Giovanni et al. Mission-Oriented Policies and the 'Entrepreneurial State' at Work: An Agent-Based Exploration. Journal of Economic Dynamics and Control, v. 151, p. 104650, 2023. DOI: https://doi.org/10.1016/j.jedc.2023.104650.",
		"https://doi.org/10.1016/j.jedc.2023.104650",
	),
	FLORIDI: ref(
		"FLORIDI, Luciano. The Ethics of Artificial Intelligence: Principles, Challenges, and Opportunities. Oxford: Oxford University Press, 2023.",
		"https://openlibrary.org/books/OL48181907M/Ethics_of_Artificial_Intelligence",
	),
	GOLDFARB_TUCKER: ref(
		"GOLDFARB, Avi; TUCKER, Catherine. Digital Economics. Journal of Economic Literature, v. 57, n. 1, p. 3-43, 2019. DOI: https://doi.org/10.1257/jel.20171452.",
		"https://doi.org/10.1257/jel.20171452",
	),
	HARDIN: ref(
		"HARDIN, Garrett. The Tragedy of the Commons. Science, v. 162, n. 3859, p. 1243-1248, 1968. DOI: https://doi.org/10.1126/science.162.3859.1243.",
		"https://doi.org/10.1126/science.162.3859.1243",
	),
	HIPPEL_KROGH: ref(
		"HIPPEL, Eric von; KROGH, Georg von. Open Source Software and the Private-Collective Innovation Model. Organization Science, v. 14, n. 2, p. 209-223, 2003. DOI: https://doi.org/10.1287/orsc.14.2.209.14992.",
		"https://doi.org/10.1287/orsc.14.2.209.14992",
	),
	IBGC: ref(
		"IBGC. Código das Melhores Práticas de Governança Corporativa. 6ª Edição. São Paulo: IBGC, 2023.",
		"https://www.ibgc.org.br/conhecimento/codigos-de-governanca",
	),
	ISO31000: ref(
		"ABNT. NBR ISO 31000: Gestão de riscos — Diretrizes. Rio de Janeiro: ABNT, 2018.",
		"https://www.abntcatalogo.com.br/norma.aspx?ID=397864",
	),
	LEE_SEE: ref(
		"LEE, John D.; SEE, Katrina A. Trust in Automation: Designing for Appropriate Reliance. Human Factors, v. 46, n. 1, p. 50-80, 2004. DOI: https://doi.org/10.1518/hfes.46.1.50_30392.",
		"https://doi.org/10.1518/hfes.46.1.50_30392",
	),
	LERNER_TIROLE: ref(
		"LERNER, Josh; TIROLE, Jean. The Economics of Technology Sharing: Open Source and Beyond. Journal of Economic Perspectives, v. 19, n. 2, p. 99-120, 2005. DOI: https://doi.org/10.1257/0895330054048678.",
		"https://doi.org/10.1257/0895330054048678",
	),
	LGPD: ref(
		"BRASIL. Lei n. 13.709, de 14 de agosto de 2018. Lei Geral de Proteção de Dados Pessoais.",
		"https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm",
	),
	MACAL_NORTH: ref(
		"MACAL, Charles M.; NORTH, Michael J. Tutorial on Agent-Based Modelling and Simulation. Journal of Simulation, v. 4, n. 3, p. 151-162, 2010. DOI: https://doi.org/10.1057/jos.2010.3.",
		"https://doi.org/10.1057/jos.2010.3",
	),
	MARTIN: ref(
		"MARTIN, Kelly D.; BORAH, Abhishek; PALMATIER, Robert W. Data Privacy: Effects on Customer and Firm Performance. Journal of Marketing, v. 81, n. 1, p. 36-58, 2017. DOI: https://doi.org/1509/jm.15.0497.",
		"https://doi.org/1509/jm.15.0497",
	),
	MAZZUCATO_ARTICLE: ref(
		"MAZZUCATO, Mariana. From Market Fixing to Market-Creating: a New Framework for Innovation Policy. Industry and Innovation, v. 23, n. 2, p. 140-156, 2016. DOI: https://doi.org/10.1080/13662716.2016.1146124.",
		"https://doi.org/10.1080/13662716.2016.1146124",
	),
	MAZZUCATO_BOOK: ref(
		"MAZZUCATO, Mariana. The Entrepreneurial State: Debunking Public vs. Private Sector Myths. London: Anthem Press, 2013.",
		"https://anthempress.com/the-entrepreneurial-state-pb",
	),
	NASH: ref(
		"NASH, John. Non-Cooperative Games. Annals of Mathematics, v. 54, n. 2, p. 286-295, 1951. DOI: https://doi.org/10.2307/1969529.",
		"https://doi.org/10.2307/1969529",
	),
	NELSON_WINTER_ARTICLE: ref(
		"NELSON, Richard R.; WINTER, Sidney G. In Search of Useful Theory of Innovation. Research Policy, v. 6, n. 1, p. 36-76, 1977. DOI: https://doi.org/10.1016/0048-7333(77)90029-4.",
		"https://doi.org/10.1016/0048-7333(77)90029-4",
	),
	NELSON_WINTER_BOOK: ref(
		"NELSON, Richard R.; WINTER, Sidney G. An Evolutionary Theory of Economic Change. Cambridge: Harvard University Press, 1982.",
		"https://www.hup.harvard.edu/books/9780674272286",
	),
	PARKER_NIELSEN: ref(
		"PARKER, Christine; NIELSEN, Vibeke. Explaining Compliance: Business Responses to Regulation. Cheltenham: Edward Elgar Publishing, 2011.",
		"https://www.e-elgar.com/shop/gbp/explaining-compliance-9781848448759.html",
	),
	PELTZMAN: ref(
		"PELTZMAN, Sam. Toward a More General Theory of Regulation. The Journal of Law and Economics, v. 19, n. 2, p. 211-240, 1976. DOI: https://doi.org/10.1086/466865.",
		"https://doi.org/10.1086/466865",
	),
	PL2338: ref(
		"BRASIL. Senado Federal. Projeto de Lei n. 2.338, de 2023. Dispõe sobre o uso da inteligência artificial.",
		"https://www25.senado.leg.br/web/atividade/materias/-/materia/157233",
	),
	POLINSKY_SHAVELL: ref(
		"POLINSKY, A. Mitchell; SHAVELL, Steven. The Economic Theory of Public Enforcement of Law. Journal of Economic Literature, v. 38, n. 1, p. 45-76, 2000. DOI: https://doi.org/10.1257/jel.38.1.45.",
		"https://doi.org/10.1257/jel.38.1.45",
	),
	PORTER: ref(
		"PORTER, Michael E. Competitive Strategy: Techniques for Analyzing Industries and Competitors. New York: Free Press, 1980.",
		"https://openlibrary.org/books/OL350235M/Competitive_Strategy",
	),
	RIBEIRO_SEGATTO: ref(
		"RIBEIRO, Manuella Maia; SEGATTO, Catarina Ianni. Inteligência artificial nas organizações públicas brasileiras: heterogeneidades e capacidades em tecnologia da informação. Revista de Administração Pública, v. 59, n. 1, p. e2024-0066, 2025. DOI: https://doi.org/10.1590/0034-761220240066.",
		"https://doi.org/10.1590/0034-761220240066",
	),
	ROCHET_TIROLE: ref(
		"ROCHET, Jean-Charles; TIROLE, Jean. Platform Competition in Two-Sided Markets. Journal of the European Economic Association, v. 1, n. 4, p. 990-1029, 2003. DOI: https://doi.org/10.1162/154247603322493212.",
		"https://doi.org/10.1162/154247603322493212",
	),
	SCHERTEL: ref(
		"MENDES, Laura Schertel. Direitos Fundamentais e Inteligência Artificial: riscos de sistemas generativos. São Paulo: Saraiva, 2024.",
		"https://www.saraiva.com.br/",
	),
	SCHUMPETER: ref(
		"SCHUMPETER, Joseph A. Capitalism, Socialism and Democracy. New York: Harper & Brothers, 1942.",
		"https://openlibrary.org/works/OL192756W/Capitalism_Socialism_and_Democracy",
	),
	STIGLER: ref(
		"STIGLER, George J. The Theory of Economic Regulation. The Bell Journal of Economics and Management Science, v. 2, n. 1, p. 3-21, 1971. DOI: https://doi.org/10.2307/3003160.",
		"https://doi.org/10.2307/3003160",
	),
	TUCKER: ref(
		"TUCKER, Albert W. A Two-Person Dilemma. Stanford University Press, 1950.",
		"https://archive.org/details/twopersondilemma0000tuck",
	),
	UNESCO_AI: ref(
		"UNESCO. Recomendação sobre a Ética da Inteligência Artificial. Paris: UNESCO, 2021.",
		"https://unesdoc.unesco.org/ark:/48223/pf0000381137_por",
	),

};

export { ref, REFERENCES };

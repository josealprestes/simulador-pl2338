// Auto-derived from playbook data
// Replaces hardcoded PLAYBOOK_CATEGORIES in HomeScreen.jsx

import regulacao from "./regulacao-conformidade";
import concentracao from "./concentracao-poder-mercado";
import acesso from "./acesso-inovacao";
import dinamicas from "./dinamicas-sociais";
import internacional from "./internacional";

function deriveCategories() {
  const allPlaybooks = [
    ...regulacao,
    ...concentracao,
    ...acesso,
    ...dinamicas,
    ...internacional,
  ];

  // Group by category
  const categoryMap = {};
  for (const pb of allPlaybooks) {
    const cat = pb.category || "Outros";
    if (!categoryMap[cat]) {
      categoryMap[cat] = [];
    }
    categoryMap[cat].push(pb.id);
  }

  // Convert to array format and sort by a predefined priority to maintain UI consistency
  // Standard Order: Social/Health -> Incentives/Innovation -> Risks/Regulatory -> Economic/Market -> Others
  const CATEGORY_PRIORITY = {
    "Dinâmicas Sociais": 1,
    "Acesso e Inovação": 2,
    "Regulação e Conformidade": 3,
    "Concentração e Poder de Mercado": 4,
    "Internacional": 5,
    "Outros": 99,
  };

  return Object.entries(categoryMap)
    .map(([label, ids]) => ({
      label,
      ids,
    }))
    .sort((a, b) => (CATEGORY_PRIORITY[a.label] || 100) - (CATEGORY_PRIORITY[b.label] || 100));
}

export const PLAYBOOK_CATEGORIES = deriveCategories();
export default PLAYBOOK_CATEGORIES;

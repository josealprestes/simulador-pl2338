// Playbooks aggregator
// Replaces src/playbooks.js

import regulacao from "./regulacao-conformidade.js";
import concentracao from "./concentracao-poder-mercado.js";
import acesso from "./acesso-inovacao.js";
import dinamicas from "./dinamicas-sociais.js";
import internacional from "./internacional.js";

const PLAYBOOKS = [
  ...regulacao,
  ...concentracao,
  ...acesso,
  ...dinamicas,
  ...internacional,
];

export { PLAYBOOKS };
export default PLAYBOOKS;

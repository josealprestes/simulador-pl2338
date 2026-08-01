declare module "@/data/playbooks" {
  interface Playbook {
    id: string;
    name: string;
    author: string;
    category: string;
    public: boolean;
    work: string;
    params: Record<string, unknown>;
    maxTurns: number;
    [key: string]: unknown;
  }
  const PLAYBOOKS: Playbook[];
  export default PLAYBOOKS;
}

declare module "@/data/playbooks/categories" {
  interface Category {
    label: string;
    ids: string[];
  }
  export const PLAYBOOK_CATEGORIES: Category[];
}

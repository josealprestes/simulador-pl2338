interface ProviderCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function ProviderCard({ label, selected, onClick }: ProviderCardProps) {
  return (
    <button type="button" onClick={onClick}
      className={`p-3 text-left rounded-none border transition-colors ${
        selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-outline-variant hover:bg-surface-variant/30"
      }`}>
      <span className="text-sm font-medium text-on-surface">{label}</span>
    </button>
  );
}
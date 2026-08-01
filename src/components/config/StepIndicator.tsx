interface StepIndicatorProps {
  steps: { id: number; label: string }[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
            s.id === current ? "bg-primary text-primary-on" :
            s.id < current ? "bg-success text-white" :
            "bg-surface-container text-on-surface-variant border border-outline/30"
          }`}>{s.id < current ? "✓" : s.id}</div>
          <span className={`text-xs font-medium hidden sm:inline ${
            s.id === current ? "text-on-surface" : "text-on-surface-variant"
          }`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`w-8 h-px ${
            s.id < current ? "bg-success" : "bg-outline/30"
          }`} />}
        </div>
      ))}
    </div>
  );
}
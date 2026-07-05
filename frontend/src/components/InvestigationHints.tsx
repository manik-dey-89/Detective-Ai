import { Lightbulb, X } from 'lucide-react';
import { ContextualHint } from '../types';

interface InvestigationHintsProps {
  hints: ContextualHint[];
  onDismiss: (id: string) => void;
}

export default function InvestigationHints({ hints, onDismiss }: InvestigationHintsProps) {
  if (hints.length === 0) return null;

  return (
    <div className="mx-4 mb-2 space-y-2">
      {hints.map(hint => (
        <div
          key={hint.id}
          className="glass-card p-3 border-l-4 border-warning flex gap-3 items-start"
        >
          <Lightbulb className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm flex-1">{hint.text}</p>
          <button
            onClick={() => onDismiss(hint.id)}
            className="text-textMuted hover:text-foreground shrink-0"
            aria-label="Dismiss hint"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

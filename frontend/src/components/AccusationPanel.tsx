import { cn } from '../lib/utils';
import { InvestigationStatus, AccusationResult } from '../types';
import { Gavel, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AccusationPanelProps {
  status: InvestigationStatus | null;
  selectedSuspectId: string | null;
  onSelectSuspect: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  caseClosed: boolean;
  result: AccusationResult | null;
}

export default function AccusationPanel({
  status,
  selectedSuspectId,
  onSelectSuspect,
  onSubmit,
  isSubmitting,
  caseClosed,
  result,
}: AccusationPanelProps) {
  if (!status) return null;

  const canSubmit = status.readyToAccuse && selectedSuspectId && !caseClosed && !isSubmitting;

  // Calculate overall progress percentage
  const requirements = Object.values(status.requirements);
  const progressPercentage = requirements.reduce((acc, req) => {
    const reqProgress = (req.current / req.required) * 100;
    return acc + reqProgress;
  }, 0) / requirements.length;

  return (
    <div className="mt-auto pt-4 border-t border-border flex flex-col gap-3 max-h-[50vh] overflow-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Make Accusation</p>
        {!caseClosed && (
          <span className="text-xs text-textMuted">
            {status.wrongAccusationsRemaining} attempt{status.wrongAccusationsRemaining !== 1 ? 's' : ''} left
          </span>
        )}
      </div>

      {/* Investigation Progress Checklist */}
      <div className="text-xs space-y-2 p-3 rounded bg-surfaceLight/30 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-textMuted">Investigation Progress</span>
          <span className="font-bold text-primary">{Math.round(progressPercentage)}%</span>
        </div>
        {Object.values(status.requirements).map(req => (
          <div key={req.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className={cn('pl-4', req.met ? 'text-success' : 'text-textMuted')}>
                {req.met ? '✓' : '○'} {req.label}
              </p>
              <span className="text-textMuted text-xs">{req.current}/{req.required}</span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5 ml-4">
              <div
                className={cn('h-1.5 rounded-full transition-all', req.met ? 'bg-success' : 'bg-primary/50')}
                style={{ width: `${Math.min((req.current / req.required) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Suspect Selection */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
          Select Suspect ({status.suspects.length} available)
        </p>
        {status.suspects.map(suspect => (
          <button
            key={suspect.id}
            onClick={() => !caseClosed && onSelectSuspect(suspect.id)}
            disabled={caseClosed}
            className={cn(
              'w-full text-left p-3 rounded-lg border transition-all text-xs relative',
              selectedSuspectId === suspect.id
                ? 'border-primary bg-primary/15 ring-2 ring-primary/30'
                : 'border-border bg-surfaceLight/20 hover:border-primary/40',
              caseClosed && 'opacity-60 cursor-not-allowed'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                  selectedSuspectId === suspect.id
                    ? 'border-primary bg-primary'
                    : 'border-border'
                )}>
                  {selectedSuspectId === suspect.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold truncate">{suspect.name}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded shrink-0',
                    suspect.suspicionLevel >= 70 ? 'bg-red-500/20 text-red-400' :
                    suspect.suspicionLevel >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  )}>
                    {suspect.suspicionLevel}% suspicious
                  </span>
                </div>
                <p className="text-textMuted truncate mb-1">{suspect.occupation}</p>
                <p className={cn(
                  'text-xs capitalize',
                  suspect.status === 'Lie Exposed' ? 'text-red-400' :
                  suspect.status === 'Uninvestigated' ? 'text-textMuted' :
                  'text-primary'
                )}>
                  {suspect.status}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {!caseClosed && (
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'glass-button w-full flex items-center justify-center gap-2 text-sm py-2',
            !canSubmit && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Gavel className="w-4 h-4" />
          {isSubmitting ? 'Submitting...' : 'Submit Accusation'}
        </button>
      )}

      {result && (
        <div
          className={cn(
            'p-4 rounded-lg border text-xs space-y-3',
            result.correct
              ? 'border-success/40 bg-success/10'
              : result.canRetry
                ? 'border-warning/40 bg-warning/10'
                : 'border-danger/40 bg-danger/10'
          )}
        >
          <p className="font-bold flex items-center gap-2 text-sm">
            {result.correct ? (
              <><CheckCircle className="w-5 h-5 text-success" /> Case Closed — Correct Accusation</>
            ) : result.canRetry ? (
              <><AlertTriangle className="w-5 h-5 text-warning" /> Wrong Suspect</>
            ) : (
              <><XCircle className="w-5 h-5 text-danger" /> Case Failed</>
            )}
          </p>
          <p className="text-sm leading-relaxed">{result.explanation}</p>
          {result.correct && result.clueBreakdown.length > 0 && (
            <div>
              <p className="font-semibold mt-3 mb-2 text-sm">Evidence Chain:</p>
              <ul className="list-disc pl-4 space-y-2 text-textMuted">
                {result.clueBreakdown.map((line, i) => (
                  <li key={i} className="text-sm">{line}</li>
                ))}
              </ul>
            </div>
          )}
          {!result.correct && result.missedClues && result.missedClues.length > 0 && (
            <div>
              <p className="font-semibold mt-2 mb-2 text-sm">Contradicting Evidence:</p>
              <ul className="list-disc pl-4 space-y-1 text-textMuted">
                {result.missedClues.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {result.correct && result.ending && (
            <p className="text-textMuted italic border-t border-border pt-3 mt-3">{result.ending}</p>
          )}
          {result.correct && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <p className="text-success font-semibold text-sm">+{result.score} XP earned</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

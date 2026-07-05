import { Case, GameState, Suspect, BoardConnection } from '../types';

export type HintTrigger =
  | 'manual'
  | 'alibi_contradiction'
  | 'timeline_inconsistency'
  | 'connection_insight'
  | 'lie_exposed';

export interface ContextualHint {
  id: string;
  text: string;
  trigger: HintTrigger;
}

export interface RequirementCheck {
  met: boolean;
  current: number;
  required: number;
  label: string;
}

export interface InvestigationStatus {
  requirements: {
    keyEvidence: RequirementCheck;
    interrogations: RequirementCheck;
    timelineReview: RequirementCheck;
    clueConnections: RequirementCheck;
  };
  readyToAccuse: boolean;
  missing: string[];
  suspects: SuspectProfile[];
  wrongAccusationsRemaining: number;
  maxWrongAccusations: number;
}

export interface SuspectProfile {
  id: string;
  name: string;
  occupation: string;
  status: string;
  suspicionLevel: number;
}

export interface AccusationEvaluation {
  correct: boolean;
  caseClosed: boolean;
  canRetry: boolean;
  wrongAccusations: number;
  explanation: string;
  clueBreakdown: string[];
  missedClues?: string[];
  ending: string;
  score: number;
}

const MAX_WRONG_BY_DIFFICULTY: Record<string, number> = {
  easy: 3,
  medium: 2,
  hard: 2,
  expert: 1,
};

function getMaxWrongAccusations(difficulty: string): number {
  return MAX_WRONG_BY_DIFFICULTY[difficulty] ?? 2;
}

function getRequiredInterrogations(suspectCount: number): number {
  return Math.min(Math.max(2, Math.ceil(suspectCount * 0.5)), suspectCount);
}

function getRequiredConnections(_gameCase: Case): number {
  return 1;
}

function getRequiredKeyEvidence(gameCase: Case): number {
  const keyCount = gameCase.solution.keyEvidence.length;
  return Math.max(1, Math.ceil(keyCount * 0.75));
}

export function computeSuspectProfiles(gameCase: Case, gameState: GameState): SuspectProfile[] {
  return gameCase.suspects.map(suspect => ({
    id: suspect.id,
    name: suspect.name,
    occupation: suspect.occupation,
    status: getSuspectStatus(suspect, gameState),
    suspicionLevel: computeSuspicionLevel(suspect, gameCase, gameState),
  }));
}

function getSuspectStatus(suspect: Suspect, gameState: GameState): string {
  if ((suspect.exposedLies?.length ?? 0) > 0) return 'Lie Exposed';
  if (gameState.interviewedNPCs.includes(suspect.id)) {
    return capitalize(suspect.emotionalState?.current || 'Interviewed');
  }
  return 'Uninvestigated';
}

function computeSuspicionLevel(suspect: Suspect, gameCase: Case, gameState: GameState): number {
  let level = 10;

  const relatedClues = gameCase.clues.filter(
    c => c.relatedSuspects.includes(suspect.id) && gameState.discoveredClues.includes(c.id)
  );
  level += relatedClues.length * 12;

  const connections = gameState.boardConnections.filter(
    c => c.from === suspect.id || c.to === suspect.id
  );
  level += connections.length * 15;

  if ((suspect.exposedLies?.length ?? 0) > 0) level += 25;

  const linkedEvidence = gameCase.evidence.filter(e => {
    if (!gameState.collectedEvidence.includes(e.id)) return false;
    const matches = e.analysis?.fingerprint?.matches ?? [];
    return matches.includes(suspect.id);
  });
  level += linkedEvidence.length * 20;

  const criticalClues = relatedClues.filter(c => c.importance === 'critical' || c.importance === 'high');
  level += criticalClues.length * 5;

  return Math.min(100, level);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getInvestigationStatus(gameCase: Case, gameState: GameState): InvestigationStatus {
  const keyRequired = getRequiredKeyEvidence(gameCase);
  const keyCollected = gameCase.solution.keyEvidence.filter(id =>
    gameState.collectedEvidence.includes(id)
  ).length;

  const interrogateRequired = getRequiredInterrogations(gameCase.suspects.length);
  const suspectsInterviewed = gameCase.suspects.filter(s =>
    gameState.interviewedNPCs.includes(s.id)
  ).length;

  const connectionsRequired = getRequiredConnections(gameCase);
  const connectionCount = gameState.boardConnections.length;

  const timelineReviewed = (gameState.timelineProgress ?? 0) >= 1;

  const keyEvidence: RequirementCheck = {
    met: keyCollected >= keyRequired,
    current: keyCollected,
    required: keyRequired,
    label: `Collect key evidence (${keyCollected}/${keyRequired})`,
  };

  const interrogations: RequirementCheck = {
    met: suspectsInterviewed >= interrogateRequired,
    current: suspectsInterviewed,
    required: interrogateRequired,
    label: `Interrogate suspects (${suspectsInterviewed}/${interrogateRequired})`,
  };

  const timelineReview: RequirementCheck = {
    met: timelineReviewed,
    current: timelineReviewed ? 1 : 0,
    required: 1,
    label: 'Review the case timeline',
  };

  const clueConnections: RequirementCheck = {
    met: connectionCount >= connectionsRequired,
    current: connectionCount,
    required: connectionsRequired,
    label: `Link clues on the crime board (${connectionCount}/${connectionsRequired})`,
  };

  const missing: string[] = [];
  if (!keyEvidence.met) missing.push(keyEvidence.label);
  if (!interrogations.met) missing.push(interrogations.label);
  if (!timelineReview.met) missing.push(timelineReview.label);
  if (!clueConnections.met) missing.push(clueConnections.label);

  const maxWrong = getMaxWrongAccusations(gameCase.difficulty);
  const wrongCount = gameState.wrongAccusations ?? 0;

  return {
    requirements: { keyEvidence, interrogations, timelineReview, clueConnections },
    readyToAccuse: missing.length === 0,
    missing,
    suspects: computeSuspectProfiles(gameCase, gameState),
    wrongAccusationsRemaining: Math.max(0, maxWrong - wrongCount),
    maxWrongAccusations: maxWrong,
  };
}

export function detectContextualHints(
  gameCase: Case,
  gameState: GameState,
  trigger?: HintTrigger,
  context?: { suspectId?: string; connection?: BoardConnection; lieText?: string }
): ContextualHint[] {
  const delivered = new Set(gameState.deliveredHintIds ?? []);
  const hints: ContextualHint[] = [];

  if (trigger === 'lie_exposed' && context?.lieText && context?.suspectId) {
    const suspect = gameCase.suspects.find(s => s.id === context.suspectId);
    if (suspect) {
      hints.push({
        id: `lie-${suspect.id}-${context.lieText.slice(0, 20)}`,
        text: `${suspect.name}'s statement about "${context.lieText.slice(0, 60)}${context.lieText.length > 60 ? '…' : ''}" contradicts evidence you have collected. Cross-reference their alibi (${suspect.alibi}) with ${gameCase.victimName}'s timeline.`,
        trigger: 'lie_exposed',
      });
    }
  }

  if (trigger === 'connection_insight' && context?.connection) {
    const conn = context.connection;
    const fromName = resolveEntityName(conn.from, gameCase);
    const toName = resolveEntityName(conn.to, gameCase);
    if (fromName && toName) {
      hints.push({
        id: `conn-${conn.id}`,
        text: `Your board links ${fromName} to ${toName}${conn.description ? `: ${conn.description}` : ''}. Examine whether this connection places anyone near ${gameCase.victimName} during the critical window at ${gameCase.location}.`,
        trigger: 'connection_insight',
      });
    }
  }

  if (trigger === 'alibi_contradiction' || !trigger || trigger === 'manual') {
    for (const suspect of gameCase.suspects) {
      const contradictingEvidence = gameCase.evidence.filter(e => {
        if (!gameState.collectedEvidence.includes(e.id)) return false;
        const matches = e.analysis?.fingerprint?.matches ?? [];
        return matches.includes(suspect.id);
      });

      if (contradictingEvidence.length > 0 && gameState.interviewedNPCs.includes(suspect.id)) {
        const ev = contradictingEvidence[0];
        hints.push({
          id: `alibi-${suspect.id}-${ev.id}`,
          text: `${suspect.name} claims: "${suspect.alibi}" — yet ${ev.name} places them at the scene. Revisit their interrogation with this evidence.`,
          trigger: 'alibi_contradiction',
        });
      }
    }
  }

  if (trigger === 'timeline_inconsistency' || !trigger || trigger === 'manual') {
    const unverified = gameCase.timeline.filter(e => !e.verified);
    for (const event of unverified) {
      const relatedDiscovered = event.evidence.filter(evId =>
        gameState.discoveredClues.includes(evId) || gameState.collectedEvidence.includes(evId)
      );
      if (relatedDiscovered.length > 0 || gameState.timelineProgress >= 1) {
        const participantNames = event.participants.join(', ');
        hints.push({
          id: `timeline-${event.id}`,
          text: `At ${event.time}, ${event.description} (${event.location}). ${participantNames} ${event.verified ? 'was verified' : 'has not been verified'} — compare witness accounts against this entry.`,
          trigger: 'timeline_inconsistency',
        });
      }
    }
  }

  if (!trigger || trigger === 'manual') {
    const undiscoveredCritical = gameCase.clues.filter(
      c => !gameState.discoveredClues.includes(c.id) && (c.importance === 'critical' || c.importance === 'high')
    );
    for (const clue of undiscoveredCritical.slice(0, 2)) {
      hints.push({
        id: `clue-${clue.id}`,
        text: `Forensics flagged ${clue.name} at ${clue.location}: ${clue.description}`,
        trigger: 'manual',
      });
    }

    const uncollectedKey = gameCase.solution.keyEvidence.filter(
      id => !gameState.collectedEvidence.includes(id)
    );
    for (const evId of uncollectedKey) {
      const ev = gameCase.evidence.find(e => e.id === evId);
      if (ev) {
        hints.push({
          id: `key-ev-${ev.id}`,
          text: `Prosecution-grade evidence awaits: ${ev.name}. ${ev.description}`,
          trigger: 'manual',
        });
      }
    }

    const uninvestigatedSuspects = gameCase.suspects.filter(
      s => !gameState.interviewedNPCs.includes(s.id)
    );
    for (const suspect of uninvestigatedSuspects.slice(0, 1)) {
      hints.push({
        id: `interview-${suspect.id}`,
        text: `${suspect.name} (${suspect.occupation}) remains uninvestigated. Their stated motive: "${suspect.motive}" — and their relationship to ${gameCase.victimName}: ${suspect.relationshipToVictim}.`,
        trigger: 'manual',
      });
    }
  }

  return hints.filter(h => !delivered.has(h.id));
}

export function pickHint(
  gameCase: Case,
  gameState: GameState,
  trigger?: HintTrigger,
  context?: { suspectId?: string; connection?: BoardConnection; lieText?: string }
): ContextualHint | null {
  const available = detectContextualHints(gameCase, gameState, trigger, context);
  if (available.length === 0) return null;

  const priority: HintTrigger[] = [
    'lie_exposed',
    'alibi_contradiction',
    'timeline_inconsistency',
    'connection_insight',
    'manual',
  ];

  if (trigger) {
    const match = available.find(h => h.trigger === trigger);
    if (match) return match;
  }

  for (const t of priority) {
    const match = available.find(h => h.trigger === t);
    if (match) return match;
  }

  return available[0];
}

function resolveEntityName(id: string, gameCase: Case): string | null {
  const suspect = gameCase.suspects.find(s => s.id === id);
  if (suspect) return suspect.name;
  const witness = gameCase.witnesses.find(w => w.id === id);
  if (witness) return witness.name;
  const clue = gameCase.clues.find(c => c.id === id);
  if (clue) return clue.name;
  const evidence = gameCase.evidence.find(e => e.id === id);
  if (evidence) return evidence.name;
  return null;
}

export function evaluateAccusation(
  gameCase: Case,
  gameState: GameState,
  suspectId: string
): AccusationEvaluation {
  const isCorrect = suspectId === gameCase.solution.culpritId;
  const accused = gameCase.suspects.find(s => s.id === suspectId);
  const culprit = gameCase.suspects.find(s => s.id === gameCase.solution.culpritId);
  const score = calculateAccusationScore(gameState, gameCase, isCorrect);

  const clueBreakdown = buildClueBreakdown(gameCase, gameState, culprit!);

  if (isCorrect) {
    return {
      correct: true,
      caseClosed: true,
      canRetry: false,
      wrongAccusations: gameState.wrongAccusations ?? 0,
      explanation: buildCorrectExplanation(gameCase, gameState, culprit!, accused!),
      clueBreakdown,
      ending: gameCase.ending,
      score,
    };
  }

  const wrongCount = (gameState.wrongAccusations ?? 0) + 1;
  const maxWrong = getMaxWrongAccusations(gameCase.difficulty);
  const caseClosed = wrongCount >= maxWrong;
  const canRetry = !caseClosed;

  return {
    correct: false,
    caseClosed,
    canRetry,
    wrongAccusations: wrongCount,
    explanation: buildIncorrectExplanation(gameCase, gameState, accused!, canRetry, wrongCount, maxWrong),
    clueBreakdown: [],
    missedClues: identifyMissedClues(gameCase, gameState),
    ending: caseClosed
      ? (gameCase.solution.alternateEndings?.[0]?.outcome || `The investigation into ${gameCase.victimName}'s death ends without a conviction.`)
      : '',
    score,
  };
}

function buildClueBreakdown(gameCase: Case, gameState: GameState, culprit: Suspect): string[] {
  const lines: string[] = [];

  // Critical Clues
  lines.push('🔍 CRITICAL CLUES:');
  for (const clueId of gameState.discoveredClues) {
    const clue = gameCase.clues.find(c => c.id === clueId);
    if (clue && clue.relatedSuspects.includes(culprit.id)) {
      lines.push(`• ${clue.name} (${clue.location}): ${clue.description}`);
    }
  }

  // Key Evidence
  lines.push('\n📋 KEY EVIDENCE:');
  for (const evId of gameState.collectedEvidence) {
    const ev = gameCase.evidence.find(e => e.id === evId);
    if (ev) {
      const matches = ev.analysis?.fingerprint?.matches ?? [];
      if (matches.includes(culprit.id) || gameCase.solution.keyEvidence.includes(evId)) {
        lines.push(`• ${ev.name}: ${ev.description}`);
      }
    }
  }

  // Timeline Events
  lines.push('\n⏰ TIMELINE RECONSTRUCTION:');
  for (const event of gameCase.timeline) {
    if (event.participants.some(p => p === culprit.name)) {
      lines.push(`• ${event.time}: ${event.description} at ${event.location}`);
    }
  }

  // Interrogation Insights
  lines.push('\n💬 INTERROGATION INSIGHTS:');
  if (gameState.interviewedNPCs.includes(culprit.id)) {
    if ((culprit.exposedLies?.length ?? 0) > 0) {
      lines.push(`• ${culprit.name}'s exposed lies: ${culprit.exposedLies.join(', ')}`);
      lines.push('• These inconsistencies confirmed deliberate deception.');
    } else {
      lines.push(`• ${culprit.name} was interviewed but maintained their alibi.`);
    }
  }

  // Motive and Opportunity
  lines.push('\n🎯 MOTIVE:');
  lines.push(`• ${culprit.motive}`);

  lines.push('\n🚪 OPPORTUNITY:');
  lines.push(`• ${culprit.alibi}`);
  lines.push(`• ${gameCase.solution.method}`);

  // Why Other Suspects Are Innocent
  lines.push('\n✅ WHY OTHER SUSPECTS ARE INNOCENT:');
  for (const suspect of gameCase.suspects) {
    if (suspect.id !== culprit.id) {
      const hasAlibi = suspect.alibi && !suspect.alibi.toLowerCase().includes('alone');
      const interviewed = gameState.interviewedNPCs.includes(suspect.id);
      const liesExposed = (suspect.exposedLies?.length ?? 0) > 0;
      
      if (liesExposed) {
        lines.push(`• ${suspect.name}: Lies were exposed, but they don't match the crime scene evidence.`);
      } else if (hasAlibi) {
        lines.push(`• ${suspect.name}: Has a credible alibi - ${suspect.alibi}`);
      } else if (interviewed) {
        lines.push(`• ${suspect.name}: Interviewed, but no evidence links them to the crime.`);
      } else {
        lines.push(`• ${suspect.name}: No evidence connects them to the murder.`);
      }
    }
  }

  return lines;
}

function buildCorrectExplanation(
  gameCase: Case,
  _gameState: GameState,
  culprit: Suspect,
  accused: Suspect
): string {
  return [
    `Your accusation of ${accused.name} is correct.`,
    `${culprit.name} murdered ${gameCase.victimName} at ${gameCase.location}.`,
    `Motive: ${gameCase.solution.motive}`,
    `${gameCase.solution.method}`,
    `The evidence trail you assembled — key exhibits, witness contradictions, and timeline reconstruction — all converge on ${culprit.name}.`,
  ].join(' ');
}

function buildIncorrectExplanation(
  gameCase: Case,
  gameState: GameState,
  accused: Suspect,
  canRetry: boolean,
  wrongCount: number,
  maxWrong: number
): string {
  const parts: string[] = [];

  parts.push(`${accused.name} is not the killer. Here's why this accusation is incorrect:`);

  // Check if accused has a credible alibi
  if (accused.alibi && !accused.alibi.toLowerCase().includes('alone')) {
    parts.push(`\n❌ ALIBI CONTRADICTION:`);
    parts.push(`• ${accused.name} claims: "${accused.alibi}"`);
    parts.push(`• This alibi places them elsewhere during the critical time window.`);
  }

  // Check if accused was interviewed and what was revealed
  if (gameState.interviewedNPCs.includes(accused.id)) {
    if ((accused.exposedLies?.length ?? 0) > 0) {
      parts.push(`\n❌ INCONSISTENT TESTIMONY:`);
      parts.push(`• ${accused.name} was caught in lies: ${accused.exposedLies.join(', ')}`);
      parts.push(`• However, these lies do not match the forensic evidence at the crime scene.`);
    } else {
      parts.push(`\n❌ NO EVIDENTIAL LINK:`);
      parts.push(`• ${accused.name} was interviewed and their testimony was consistent.`);
      parts.push(`• No forensic evidence connects them to the murder.`);
    }
  }

  // Check if key evidence points elsewhere
  const keyEvidenceCollected = gameCase.solution.keyEvidence.filter(id =>
    gameState.collectedEvidence.includes(id)
  );
  if (keyEvidenceCollected.length > 0) {
    parts.push(`\n❌ FORENSIC EVIDENCE:`);
    for (const evId of keyEvidenceCollected) {
      const ev = gameCase.evidence.find(e => e.id === evId);
      if (ev) {
        const matches = ev.analysis?.fingerprint?.matches ?? [];
        if (!matches.includes(accused.id)) {
          parts.push(`• ${ev.name} does not match ${accused.name}'s forensic profile.`);
        }
      }
    }
  }

  // Check timeline contradictions
  const timelineWithAccused = gameCase.timeline.filter(e =>
    e.participants.some(p => p === accused.name)
  );
  if (timelineWithAccused.length === 0) {
    parts.push(`\n❌ TIMELINE ABSENCE:`);
    parts.push(`• ${accused.name} does not appear in the critical timeline events.`);
    parts.push(`• They were not present at the crime scene during the murder.`);
  }

  const missed = identifyMissedClues(gameCase, gameState);
  if (missed.length > 0) {
    parts.push(`\n💡 AREAS TO RECONSIDER:`);
    missed.slice(0, 4).forEach(m => parts.push(`• ${m}`));
  }

  if (canRetry) {
    parts.push(`\n⚠️ Wrong accusation ${wrongCount} of ${maxWrong}.`);
    parts.push(`Continue investigating. Review the timeline, collect remaining evidence, and interrogate other suspects before accusing again.`);
  } else {
    parts.push(`\n❌ You have exhausted your accusation attempts.`);
    parts.push(`The case is closed without a successful conviction.`);
  }

  return parts.join('\n');
}

function identifyMissedClues(gameCase: Case, gameState: GameState): string[] {
  const missed: string[] = [];

  for (const evId of gameCase.solution.keyEvidence) {
    if (!gameState.collectedEvidence.includes(evId)) {
      const ev = gameCase.evidence.find(e => e.id === evId);
      if (ev) missed.push(`uncollected key evidence: ${ev.name}`);
    }
  }

  const criticalUndiscovered = gameCase.clues.filter(
    c => (c.importance === 'critical' || c.importance === 'high') &&
      !gameState.discoveredClues.includes(c.id)
  );
  for (const clue of criticalUndiscovered.slice(0, 2)) {
    missed.push(`undiscovered clue: ${clue.name} at ${clue.location}`);
  }

  const uninvestigated = gameCase.suspects.filter(s => !gameState.interviewedNPCs.includes(s.id));
  if (uninvestigated.length > 0) {
    missed.push(`uninterrogated suspect: ${uninvestigated[0].name}`);
  }

  if (gameState.boardConnections.length === 0) {
    missed.push('no connections drawn on the crime board');
  }

  if ((gameState.timelineProgress ?? 0) < 1) {
    missed.push('timeline not fully reviewed');
  }

  return missed;
}

function calculateAccusationScore(gameState: GameState, gameCase: Case, correct: boolean): number {
  let score = correct ? 1000 : 0;
  score += gameState.discoveredClues.length * 50;
  score += gameState.collectedEvidence.length * 75;
  score += gameState.interviewedNPCs.length * 100;
  score += gameState.boardConnections.length * 40;
  score -= Math.floor(gameState.playTime / 60) * 2;

  const keyCollected = gameCase.solution.keyEvidence.filter(id =>
    gameState.collectedEvidence.includes(id)
  ).length;
  if (correct && keyCollected === gameCase.solution.keyEvidence.length) {
    score += 200;
  }

  return Math.max(score, 0);
}

export { getMaxWrongAccusations };

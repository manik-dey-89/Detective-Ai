import { Case } from '../types';

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

function extractCaseFingerprint(gameCase: Case): Set<string> {
  const tokens = new Set<string>();

  const add = (text?: string) => {
    if (text) tokenize(text).forEach(t => tokens.add(t));
  };

  add(gameCase.title);
  add(gameCase.description);
  add(gameCase.location);
  add(gameCase.victimName);
  add(gameCase.twist);
  add(gameCase.crimeType);

  gameCase.suspects.forEach(s => {
    add(s.name);
    add(s.occupation);
    add(s.motive);
    add(s.relationshipToVictim);
  });

  gameCase.witnesses.forEach(w => {
    add(w.name);
    add(w.testimony);
  });

  gameCase.clues.forEach(c => add(c.name));
  gameCase.timeline.forEach(e => add(e.description));

  return tokens;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function computeCaseSimilarity(caseA: Case, caseB: Case): number {
  const fpA = extractCaseFingerprint(caseA);
  const fpB = extractCaseFingerprint(caseB);

  const tokenSim = jaccardSimilarity(fpA, fpB);

  const nameOverlap =
    caseA.suspects.some(s =>
      caseB.suspects.some(s2 => s.name.toLowerCase() === s2.name.toLowerCase())
    ) ||
    (caseA.victimName &&
      caseB.victimName &&
      caseA.victimName.toLowerCase() === caseB.victimName.toLowerCase())
      ? 0.3
      : 0;

  const titleSim =
    caseA.title.toLowerCase() === caseB.title.toLowerCase() ? 0.4 : 0;

  return Math.min(1, tokenSim * 0.6 + nameOverlap + titleSim);
}

export function isCaseTooSimilar(
  newCase: Case,
  previousCases: Case[],
  threshold = 0.2
): boolean {
  return previousCases.some(prev => computeCaseSimilarity(newCase, prev) > threshold);
}

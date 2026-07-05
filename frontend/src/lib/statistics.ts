import { PlayerStatistics } from '../types';

export function normalizeStatistics(stats: Partial<PlayerStatistics> | null | undefined): PlayerStatistics {
  const s = stats || {};
  const correctDeductions = s.correctDeductions ?? 0;
  const wrongDeductions = s.wrongDeductions ?? 0;
  const totalDeductions = correctDeductions + wrongDeductions;

  return {
    casesSolved: s.casesSolved ?? 0,
    casesAttempted: s.casesAttempted ?? 0,
    activeCases: s.activeCases ?? 0,
    failedCases: s.failedCases ?? 0,
    totalPlayTime: s.totalPlayTime ?? 0,
    averageInvestigationTime: s.averageInvestigationTime ?? 0,
    cluesFound: s.cluesFound ?? 0,
    cluesTotal: s.cluesTotal ?? 0,
    evidenceCollected: s.evidenceCollected ?? 0,
    suspectsInterrogated: s.suspectsInterrogated ?? 0,
    interrogationsConducted: s.interrogationsConducted ?? 0,
    correctDeductions,
    wrongDeductions,
    accuracyRate: totalDeductions > 0
      ? (correctDeductions / totalDeductions) * 100
      : (s.accuracyRate ?? 0),
    xp: s.xp ?? 0,
    favoriteDifficulty: s.favoriteDifficulty ?? 'medium',
  };
}

export function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatAvgInvestigation(seconds: number): string {
  if (seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return `${hours}h ${rem}m`;
  }
  return `${minutes}m`;
}

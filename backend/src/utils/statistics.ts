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

export function recalculateAccuracy(stats: PlayerStatistics): PlayerStatistics {
  const total = stats.correctDeductions + stats.wrongDeductions;
  return {
    ...stats,
    accuracyRate: total > 0 ? (stats.correctDeductions / total) * 100 : 0,
  };
}

export function updateAverageInvestigationTime(
  stats: PlayerStatistics,
  investigationSeconds: number
): PlayerStatistics {
  const completed = stats.casesSolved + stats.failedCases;
  const prevAvg = stats.averageInvestigationTime;
  const newAvg = completed <= 1
    ? investigationSeconds
    : (prevAvg * (completed - 1) + investigationSeconds) / completed;

  return { ...stats, averageInvestigationTime: Math.round(newAvg) };
}

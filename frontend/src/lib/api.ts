import axios, { AxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const caseApi = {
  generateAndStart: (
    data: { difficulty: string; crimeType: string; location?: string; playerId: string },
    config?: AxiosRequestConfig
  ) => api.post('/api/cases/generate-and-start', data, config),

  generate: (data: { difficulty: string; crimeType: string; location?: string; playerId: string }) =>
    api.post('/api/cases/generate', data),

  get: (id: string) => api.get(`/api/cases/${id}`),

  getPlayerCases: (playerId: string) => api.get(`/api/cases/player/${playerId}`),

  getPlayerGames: (playerId: string) => api.get(`/api/game/player/${playerId}`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/api/cases/${id}/status`, { status }),

  solve: (id: string, solution: { culpritId: string; method: string; evidence: string[] }) =>
    api.post(`/api/cases/${id}/solve`, solution),

  getHint: (id: string, params: { discoveredClues: string[]; stuckDuration: number }) =>
    api.get(`/api/cases/${id}/hint`, { params }),
};

export const memoryApi = {
  remember: (data: {
    playerId: string;
    type: string;
    content: any;
    caseId?: string;
    npcId?: string;
    importance?: number;
    tags?: string[];
  }) => api.post('/api/memory/remember', data),

  recall: (data: {
    playerId: string;
    type?: string;
    caseId?: string;
    npcId?: string;
    keywords?: string[];
    limit?: number;
  }) => api.post('/api/memory/recall', data),

  memify: (id: string, improvements: Record<string, any>) =>
    api.put(`/api/memory/memify/${id}`, { improvements }),

  forget: (id: string) => api.delete(`/api/memory/forget/${id}`),

  getRelated: (id: string) => api.get(`/api/memory/related/${id}`),

  getNPCMemories: (npcId: string, playerId: string) =>
    api.get(`/api/memory/npc/${npcId}`, { params: { playerId } }),
};

export const playerApi = {
  getAll: () => api.get('/api/player'),

  login: (name: string) => api.post('/api/player/login', { name }),

  create: (name: string) => api.post('/api/player', { name }),

  delete: (id: string) => api.delete(`/api/player/${id}`),

  get: (id: string) => api.get(`/api/player/${id}`),

  update: (id: string, data: Partial<any>) => api.patch(`/api/player/${id}`, data),

  updateStats: (id: string, stats: Partial<any>) =>
    api.patch(`/api/player/${id}/stats`, { stats }),

  getAchievements: (id: string) => api.get(`/api/player/${id}/achievements`),

  unlockAchievement: (id: string, achievementId: string) =>
    api.post(`/api/player/${id}/achievements`, { achievementId }),

  updateReputation: (id: string, points: number, organization?: string) =>
    api.patch(`/api/player/${id}/reputation`, { points, organization }),

  getMemoryGraph: (id: string) => api.get(`/api/player/${id}/memory-graph`),

  saveProgress: (id: string, gameState: any) =>
    api.post(`/api/player/${id}/save`, { gameState }),

  loadProgress: (id: string) => api.get(`/api/player/${id}/load`),
};

export const gameApi = {
  start: (caseId: string, playerId: string) =>
    api.post('/api/game/start', { caseId, playerId }),

  getState: (gameId: string) => api.get(`/api/game/state/${gameId}`),

  updateState: (gameId: string, updates: Partial<any>) =>
    api.patch(`/api/game/state/${gameId}`, updates),

  incrementPlayTime: (gameId: string, delta: number) =>
    api.post(`/api/game/${gameId}/playtime`, { delta }),

  discoverClue: (gameId: string, clueId: string) =>
    api.post(`/api/game/${gameId}/clues`, { clueId }),

  collectEvidence: (gameId: string, evidenceId: string) =>
    api.post(`/api/game/${gameId}/evidence`, { evidenceId }),

  interviewNPC: (gameId: string, npcId: string, question: string, approach?: string, evidenceId?: string) =>
    api.post(`/api/game/${gameId}/interview`, { npcId, question, approach, evidenceId }),

  addNote: (gameId: string, note: { content: string; tags?: string[]; relatedClues?: string[] }) =>
    api.post(`/api/game/${gameId}/notes`, note),

  addConnection: (gameId: string, connection: { from: string; to: string; type: string; description?: string }) =>
    api.post(`/api/game/${gameId}/connections`, connection),

  analyzeEvidence: (gameId: string, evidenceId: string, analysisType: string) =>
    api.post(`/api/game/${gameId}/analyze`, { evidenceId, analysisType }),

  autoSave: (gameId: string) => api.post(`/api/game/${gameId}/auto-save`),

  loadGame: (saveId: string) => api.get(`/api/game/load/${saveId}`),

  deleteGame: (gameId: string) => api.delete(`/api/game/${gameId}`),

  makeAccusation: (gameId: string, suspectId: string) =>
    api.post(`/api/game/${gameId}/accuse`, { suspectId }),

  getInvestigationStatus: (gameId: string) =>
    api.get(`/api/game/${gameId}/investigation-status`),

  requestHint: (gameId: string, trigger?: string) =>
    api.post(`/api/game/${gameId}/hint`, { trigger: trigger || 'manual' }),

  markTimelineReviewed: (gameId: string) =>
    api.post(`/api/game/${gameId}/timeline-reviewed`),
};

export default api;

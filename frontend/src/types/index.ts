export interface VictimProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary';
  occupation: string;
  city: string;
  background: string;
  relationships: string[];
  personality: string;
  shortBiography: string;
  lifestyle: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  crimeType: string;
  location: string;
  country: string;
  victim: VictimProfile;
  victimName: string; // Deprecated, kept for compatibility
  victimDetails: string; // Deprecated, kept for compatibility
  twist: string;
  ending: string;
  date: string;
  status: 'active' | 'solved' | 'failed';
  createdAt: string;
  completedAt?: string;
  suspects: Suspect[];
  witnesses: Witness[];
  clues: Clue[];
  evidence: Evidence[];
  timeline: TimelineEvent[];
  solution: CaseSolution;
}

export interface NPCRelationship {
  targetName: string;
  relationship: string;
  detail: string;
}

export interface DialogueTopic {
  keywords: string[];
  truthfulResponse: string;
  lieResponse?: string;
  emotionalReaction: string;
}

export interface Suspect {
  id: string;
  name: string;
  age: number;
  occupation: string;
  appearance: string;
  personality: string;
  alibi: string;
  motive: string;
  relationshipToVictim: string;
  isGuilty: boolean;
  portrait?: string;
  secrets: string[];
  relationships: NPCRelationship[];
  truthfulFacts: string[];
  lies: string[];
  exposedLies: string[];
  dialogueTopics: DialogueTopic[];
  memories: NPCMemory[];
  emotionalState: EmotionalState;
}

export interface Witness {
  id: string;
  name: string;
  age: number;
  occupation: string;
  testimony: string;
  reliability: number;
  location: string;
  personality: string;
  secrets: string[];
  relationships: NPCRelationship[];
  truthfulFacts: string[];
  lies: string[];
  exposedLies: string[];
  dialogueTopics: DialogueTopic[];
  memories: NPCMemory[];
  emotionalState: EmotionalState;
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  type: 'physical' | 'digital' | 'testimonial' | 'circumstantial';
  location: string;
  discovered: boolean;
  discoveredAt?: string;
  relatedSuspects: string[];
  relatedEvidence: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface Evidence {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'photo' | 'video' | 'audio' | 'object' | 'digital';
  content?: string;
  analysis?: EvidenceAnalysis;
  collected: boolean;
  collectedAt?: string;
}

export interface EvidenceAnalysis {
  fingerprint?: FingerprintAnalysis;
  document?: DocumentAnalysis;
  digital?: DigitalAnalysis;
}

export interface FingerprintAnalysis {
  matches: string[];
  confidence: number;
  partialMatch: boolean;
}

export interface DocumentAnalysis {
  author?: string;
  date?: string;
  authenticity: number;
  alterations: string[];
}

export interface DigitalAnalysis {
  source: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  time: string;
  description: string;
  participants: string[];
  location: string;
  verified: boolean;
  evidence: string[];
}

export interface CaseSolution {
  culpritId: string;
  method: string;
  motive: string;
  keyEvidence: string[];
  alternateEndings?: AlternateEnding[];
}

export interface AlternateEnding {
  condition: string;
  description: string;
  outcome: string;
}

export interface NPCMemory {
  id: string;
  type: 'conversation' | 'accusation' | 'threat' | 'promise' | 'observation';
  content: string;
  timestamp: string;
  emotionalImpact: number;
  trustLevel: number;
}

export interface EmotionalState {
  current: 'calm' | 'nervous' | 'angry' | 'sad' | 'defensive' | 'cooperative' | 'hostile';
  intensity: number;
  factors: string[];
}

export interface InterrogationMessage {
  type: 'player' | 'npc';
  content: string;
  timestamp: string;
  emotionalReaction?: string;
  evidenceId?: string;
  npcName?: string;
}

export interface Player {
  id: string;
  name: string;
  brainId: string;
  createdAt: string;
  updatedAt: string;
  statistics: PlayerStatistics;
  reputation: Reputation;
  achievements: Achievement[];
  currentCase?: string;
  settings: PlayerSettings;
}

export interface PlayerStatistics {
  casesSolved: number;
  casesAttempted: number;
  activeCases: number;
  failedCases: number;
  totalPlayTime: number;
  averageInvestigationTime: number;
  cluesFound: number;
  cluesTotal: number;
  evidenceCollected: number;
  suspectsInterrogated: number;
  interrogationsConducted: number;
  correctDeductions: number;
  wrongDeductions: number;
  accuracyRate: number;
  xp: number;
  favoriteDifficulty: string;
}

export interface Reputation {
  level: number;
  points: number;
  rank: string;
  traits: string[];
  organizationStanding: Record<string, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
}

export interface PlayerSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  soundEnabled: boolean;
  musicEnabled: boolean;
  autoSave: boolean;
  notifications: boolean;
  theme: 'dark' | 'light';
}

export interface GameState {
  gameId: string;
  caseId: string;
  playerId: string;
  currentLocation: string;
  phase: 'investigation' | 'interrogation' | 'analysis' | 'conclusion';
  discoveredClues: string[];
  collectedEvidence: string[];
  interviewedNPCs: string[];
  interrogationHistory: Record<string, InterrogationMessage[]>;
  shownEvidence: string[];
  timelineProgress: number;
  wrongAccusations?: number;
  deliveredHintIds?: string[];
  notes: CaseNote[];
  boardConnections: BoardConnection[];
  evidenceAnalyses: EvidenceAnalysis[];
  startTime: string;
  lastPlayed: string;
  playTime: number;
  lastSaved: string;
}

export interface CaseNote {
  id: string;
  content: string;
  timestamp: string;
  tags: string[];
  relatedClues: string[];
}

export interface BoardConnection {
  id: string;
  from: string;
  to: string;
  type: 'evidence' | 'suspect' | 'location' | 'timeline';
  strength: number;
  description: string;
}

export interface ContextualHint {
  id: string;
  text: string;
  trigger: string;
}

export interface RequirementCheck {
  met: boolean;
  current: number;
  required: number;
  label: string;
}

export interface SuspectProfile {
  id: string;
  name: string;
  occupation: string;
  status: string;
  suspicionLevel: number;
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

export interface AccusationResult {
  correct: boolean;
  caseClosed: boolean;
  canRetry: boolean;
  explanation: string;
  clueBreakdown: string[];
  missedClues?: string[];
  score: number;
  ending: string;
  wrongAccusations: number;
}

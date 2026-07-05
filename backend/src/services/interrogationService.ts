import { v4 as uuidv4 } from 'uuid';
import {
  Case,
  Suspect,
  Witness,
  InterrogationMessage,
  EmotionalState,
  DialogueTopic,
} from '../types';
import { llmClient } from '../config/openai';
import logger from '../config/logger';

type InterrogatableNPC = (Suspect | Witness) & {
  isGuilty?: boolean;
  dialogueTopics?: DialogueTopic[];
  secrets?: string[];
  relationships?: { targetName: string; relationship: string; detail: string }[];
  truthfulFacts?: string[];
  lies?: string[];
  exposedLies?: string[];
  personality?: string;
  emotionalState?: EmotionalState;
};

export interface InterrogationResult {
  dialogue: string;
  emotionalReaction: string;
  npcId: string;
  npcName: string;
  lieDetected?: boolean;
  lieExposed?: string;
  updatedEmotionalState: EmotionalState;
}

function scoreTopicMatch(question: string, topic: DialogueTopic): number {
  const q = question.toLowerCase();
  return topic.keywords.reduce((score, kw) => (q.includes(kw) ? score + 1 : score), 0);
}

function findBestTopic(question: string, topics: DialogueTopic[]): DialogueTopic | null {
  let best: DialogueTopic | null = null;
  let bestScore = 0;
  for (const topic of topics) {
    const score = scoreTopicMatch(question, topic);
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return bestScore > 0 ? best : null;
}

function buildCaseContext(
  gameCase: Case,
  npc: InterrogatableNPC,
  history: InterrogationMessage[],
  shownEvidenceIds: string[],
  collectedEvidenceIds: string[]
): string {
  const evidenceShown = gameCase.evidence.filter(e => shownEvidenceIds.includes(e.id));
  const evidenceCollected = gameCase.evidence.filter(e => collectedEvidenceIds.includes(e.id));

  return JSON.stringify({
    caseTitle: gameCase.title,
    location: gameCase.location,
    country: gameCase.country,
    victimName: gameCase.victimName,
    victimDetails: gameCase.victimDetails,
    crimeType: gameCase.crimeType,
    twist: gameCase.twist,
    npc: {
      id: npc.id,
      name: npc.name,
      age: npc.age,
      occupation: npc.occupation,
      personality: (npc as Suspect).personality || (npc as Witness).personality,
      appearance: (npc as Suspect).appearance,
      alibi: (npc as Suspect).alibi,
      motive: (npc as Suspect).motive,
      relationshipToVictim: (npc as Suspect).relationshipToVictim,
      testimony: (npc as Witness).testimony,
      reliability: (npc as Witness).reliability,
      isGuilty: (npc as Suspect).isGuilty ?? false,
      secrets: npc.secrets || [],
      relationships: npc.relationships || [],
      truthfulFacts: npc.truthfulFacts || [],
      lies: npc.lies || [],
      exposedLies: npc.exposedLies || [],
      emotionalState: npc.emotionalState,
    },
    otherSuspects: gameCase.suspects
      .filter(s => s.id !== npc.id)
      .map(s => ({ name: s.name, occupation: s.occupation, relationshipToVictim: s.relationshipToVictim })),
    witnesses: gameCase.witnesses
      .filter(w => w.id !== npc.id)
      .map(w => ({ name: w.name, testimony: w.testimony })),
    timeline: gameCase.timeline,
    cluesDiscovered: gameCase.clues.map(c => ({ name: c.name, description: c.description })),
    evidencePresented: evidenceShown.map(e => ({ name: e.name, description: e.description })),
    evidenceCollected: evidenceCollected.map(e => ({ name: e.name, description: e.description })),
    conversationHistory: history.map(h => ({
      speaker: h.type === 'player' ? 'Detective' : npc.name,
      content: h.content,
      evidenceShown: h.evidenceId,
    })),
  }, null, 2);
}

function respondFromCaseData(
  npc: InterrogatableNPC,
  question: string,
  shownEvidenceIds: string[],
  gameCase: Case
): { dialogue: string; emotionalReaction: string; lieExposed?: string } {
  const isGuilty = (npc as Suspect).isGuilty === true;
  const topics = npc.dialogueTopics || [];
  const q = question.toLowerCase();

  // Evidence confrontation — use case-linked evidence only
  if (shownEvidenceIds.length > 0 || q.includes('evidence') || q.includes('proof')) {
    const relevantEvidence = gameCase.evidence.filter(
      e =>
        shownEvidenceIds.includes(e.id) ||
        (e.analysis?.fingerprint?.matches?.includes(npc.id))
    );

    if (relevantEvidence.length > 0 && isGuilty) {
      const ev = relevantEvidence[0];
      const lie = npc.lies?.[0];
      if (lie && !(npc.exposedLies || []).includes(lie)) {
        return {
          dialogue: `That ${ev.name}... I can explain. Fine — ${lie} wasn't entirely accurate. ${npc.secrets?.[0] || "There are things I have not said."}`,
          emotionalReaction: 'nervous',
          lieExposed: lie,
        };
      }
      return {
        dialogue: `The ${ev.name} doesn't prove what you think. ${npc.truthfulFacts?.[0] || 'I stand by my account.'}`,
        emotionalReaction: 'defensive',
      };
    }

    if (relevantEvidence.length > 0 && !isGuilty) {
      return {
        dialogue: `I've seen that ${relevantEvidence[0].name} report. It aligns with what I told you — ${(npc as Witness).testimony || (npc as Suspect).alibi}`,
        emotionalReaction: 'cooperative',
      };
    }
  }

  // Accusation
  if (q.includes('guilty') || q.includes('did you') || q.includes('killer') || q.includes('murderer')) {
    if (isGuilty) {
      return {
        dialogue: `How dare you accuse me! ${npc.truthfulFacts?.[0] || 'I had no reason to harm ' + gameCase.victimName + '.'} You're grasping at shadows.`,
        emotionalReaction: 'angry',
      };
    }
    return {
      dialogue: `I am not the killer. Look at the timeline — ${(npc as Suspect).alibi || (npc as Witness).testimony}. ${gameCase.victimName} deserved justice, and so do the innocent.`,
      emotionalReaction: 'defensive',
    };
  }

  // Relationship questions
  if (q.includes('relationship') || q.includes('know') && q.includes('victim')) {
    const rel = (npc as Suspect).relationshipToVictim;
    if (rel) {
      return {
        dialogue: `${gameCase.victimName} and I were ${rel.toLowerCase()}. ${npc.relationships?.[0]?.detail || "Our history was complicated, but that does not make me a murderer."}`,
        emotionalReaction: isGuilty ? 'nervous' : 'calm',
      };
    }
  }

  // Topic matching from pre-generated case dialogue
  const topic = findBestTopic(question, topics);
  if (topic) {
    const useLie = isGuilty && topic.lieResponse && !(npc.exposedLies || []).length;
    let response = useLie ? topic.lieResponse! : topic.truthfulResponse;
    if (q.includes('where') || q.includes('alibi')) {
      response = response.startsWith('I ') ? response : `I was ${response.charAt(0).toLowerCase()}${response.slice(1)}. That is my account of where I was when ${gameCase.victimName} died.`;
    }
    return {
      dialogue: response,
      emotionalReaction: topic.emotionalReaction,
    };
  }

  // Witness testimony fallback — still case-specific
  if ((npc as Witness).testimony) {
    return {
      dialogue: `${(npc as Witness).testimony} That's what I observed regarding ${gameCase.victimName}.`,
      emotionalReaction: 'cooperative',
    };
  }

  // Suspect alibi/motive — case-specific only
  const suspect = npc as Suspect;
  if (suspect.alibi) {
    return {
      dialogue: `Regarding ${gameCase.victimName} — my alibi is clear: ${suspect.alibi}. ${suspect.personality ? 'And I suggest you focus on facts, not speculation.' : ''}`,
      emotionalReaction: suspect.isGuilty ? 'nervous' : 'calm',
    };
  }

  return {
    dialogue: `I can only speak about what I know of ${gameCase.victimName}'s case at ${gameCase.location}. Ask me about the timeline, my whereabouts, or the other people present.`,
    emotionalReaction: 'calm',
  };
}

function updateEmotionalState(
  current: EmotionalState | undefined,
  reaction: string,
  pressure: number
): EmotionalState {
  const base = current || { current: 'calm', intensity: 0.3, factors: [] };
  const validStates = ['calm', 'nervous', 'angry', 'sad', 'defensive', 'cooperative', 'hostile'] as const;
  const newState = validStates.includes(reaction as any)
    ? (reaction as EmotionalState['current'])
    : base.current;

  return {
    current: newState,
    intensity: Math.min(1, base.intensity + pressure * 0.1),
    factors: [...new Set([...base.factors, reaction])],
  };
}

export class InterrogationService {
  async interrogate(params: {
    gameCase: Case;
    npcId: string;
    question: string;
    approach?: string;
    history: InterrogationMessage[];
    shownEvidenceIds: string[];
    collectedEvidenceIds: string[];
  }): Promise<InterrogationResult> {
    const { gameCase, npcId, question, history, shownEvidenceIds, collectedEvidenceIds } = params;

    const npc =
      gameCase.suspects.find(s => s.id === npcId) ||
      gameCase.witnesses.find(w => w.id === npcId);

    if (!npc) {
      throw new Error('NPC not found in current case');
    }

    const context = buildCaseContext(gameCase, npc, history, shownEvidenceIds, collectedEvidenceIds);
    let dialogue: string;
    let emotionalReaction: string;
    let lieExposed: string | undefined;

    const llmAvailable = llmClient.isAvailable();

    if (llmAvailable) {
      try {
        const llmResult = await llmClient.generateCaseGroundedDialogue({
          npcName: npc.name,
          caseContext: context,
          playerQuestion: question,
          approach: params.approach,
        });
        dialogue = llmResult.dialogue;
        emotionalReaction = llmResult.emotionalReaction;
      } catch (error) {
        logger.warn('LLM interrogation failed, falling back to procedural', { error, npcName: npc.name });
        const caseResponse = respondFromCaseData(npc, question, shownEvidenceIds, gameCase);
        dialogue = caseResponse.dialogue;
        emotionalReaction = caseResponse.emotionalReaction;
        lieExposed = caseResponse.lieExposed;
      }
    } else {
      const caseResponse = respondFromCaseData(npc, question, shownEvidenceIds, gameCase);
      dialogue = caseResponse.dialogue;
      emotionalReaction = caseResponse.emotionalReaction;
      lieExposed = caseResponse.lieExposed;
    }

    // Validate response doesn't reference wrong NPC names
    const otherNames = [
      ...gameCase.suspects.filter(s => s.id !== npcId).map(s => s.name),
      ...gameCase.witnesses.filter(w => w.id !== npcId).map(w => w.name),
    ];
    // Ensure response uses correct speaker identity
    if (dialogue.includes('John Smith') || dialogue.includes('Sarah Johnson') || dialogue.includes('Mary Wilson')) {
      const caseResponse = respondFromCaseData(npc, question, shownEvidenceIds, gameCase);
      dialogue = caseResponse.dialogue;
      emotionalReaction = caseResponse.emotionalReaction;
    }

    const pressure = history.filter(h => h.type === 'player').length;
    const updatedEmotionalState = updateEmotionalState(npc.emotionalState, emotionalReaction, pressure);

    // Update NPC in case
    if ('isGuilty' in npc) {
      const suspect = gameCase.suspects.find(s => s.id === npcId);
      if (suspect) {
        suspect.emotionalState = updatedEmotionalState;
        suspect.memories.push({
          id: uuidv4(),
          type: 'conversation',
          content: `Detective asked: "${question}". I responded about ${gameCase.victimName}.`,
          timestamp: new Date().toISOString(),
          emotionalImpact: 0.3,
          trustLevel: params.approach === 'aggressive' ? -0.2 : 0.1,
        });
        if (lieExposed && suspect.lies) {
          suspect.exposedLies = [...(suspect.exposedLies || []), lieExposed];
        }
      }
    } else {
      const witness = gameCase.witnesses.find(w => w.id === npcId);
      if (witness) {
        witness.memories.push({
          id: uuidv4(),
          type: 'conversation',
          content: `Detective asked: "${question}". I shared what I know about ${gameCase.victimName}.`,
          timestamp: new Date().toISOString(),
          emotionalImpact: 0.2,
          trustLevel: 0.1,
        });
      }
    }

    return {
      dialogue,
      emotionalReaction,
      npcId,
      npcName: npc.name,
      lieDetected: !!lieExposed,
      lieExposed,
      updatedEmotionalState,
    };
  }
}

export const interrogationService = new InterrogationService();

import { v4 as uuidv4 } from 'uuid';
import {
  Case,
  Suspect,
  Witness,
  Clue,
  Evidence,
  TimelineEvent,
  CaseSolution,
  DialogueTopic,
  NPCRelationship,
} from '../types';

const CASE_JSON_SCHEMA = `{
  "title": "string - unique case title",
  "description": "string - 2-3 sentence case overview",
  "country": "string - country setting for realistic names",
  "location": "string - specific crime location",
  "victimName": "string - culturally appropriate victim name",
  "victimDetails": "string - victim background",
  "twist": "string - plot twist",
  "ending": "string - resolution when killer is caught",
  "suspects": [{
    "name": "string", "age": number, "occupation": "string", "appearance": "string",
    "personality": "string", "alibi": "string", "motive": "string",
    "relationshipToVictim": "string", "isGuilty": boolean,
    "secrets": ["string"], "truthfulFacts": ["string"], "lies": ["string - only if guilty"],
    "relationships": [{"targetName": "string", "relationship": "string", "detail": "string"}],
    "dialogueTopics": [{"keywords": ["string"], "truthfulResponse": "string", "lieResponse": "string or null", "emotionalReaction": "calm|nervous|angry|sad|defensive|cooperative|hostile"}]
  }],
  "witnesses": [{
    "name": "string", "age": number, "occupation": "string", "testimony": "string",
    "reliability": number, "location": "string", "personality": "string",
    "secrets": ["string"], "truthfulFacts": ["string"],
    "dialogueTopics": [{"keywords": ["string"], "truthfulResponse": "string", "emotionalReaction": "string"}]
  }],
  "clues": [{"name": "string", "description": "string", "type": "physical|digital|testimonial|circumstantial", "location": "string", "importance": "low|medium|high|critical", "relatedSuspectNames": ["string"]}],
  "evidence": [{"name": "string", "description": "string", "type": "document|photo|video|audio|object|digital", "content": "string optional", "linkedSuspectName": "string optional"}],
  "timeline": [{"time": "string", "description": "string", "participantNames": ["string"], "location": "string", "verified": boolean}],
  "solution": {"culpritName": "string", "method": "string", "motive": "string", "keyEvidenceNames": ["string"]},
  "alternateEndings": [{"condition": "string", "description": "string", "outcome": "string"}]
}`;

class LLMClient {
  private client: import('openai').default | null = null;
  private provider: string = 'openai';
  private initialized = false;

  initialize() {
    if (this.initialized) return this.client;

    const provider = process.env.LLM_PROVIDER || 'openai';
    this.provider = provider;

    const apiKey =
      provider === 'openrouter'
        ? process.env.OPENROUTER_API_KEY
        : process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.startsWith('your_')) {
      this.initialized = true;
      return null;
    }

    const OpenAI = require('openai').default;
    if (provider === 'openrouter') {
      this.client = new OpenAI({
        apiKey,
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'Detective AI',
        },
      });
    } else {
      this.client = new OpenAI({ apiKey });
    }

    this.initialized = true;
    return this.client;
  }

  isAvailable(): boolean {
    return this.initialize() !== null;
  }

  private getModel(): string {
    if (this.provider === 'openrouter') {
      return process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    }
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  private getModelFallbacks(): string[] {
    const primary = this.getModel();
    const fallbacks = [
      'openai/gpt-4o-mini',
      'meta-llama/llama-3.1-8b-instruct',
      'google/gemini-flash-1.5',
      'mistralai/mistral-7b-instruct',
    ];
    return [primary, ...fallbacks.filter(m => m !== primary)];
  }

  private async chatCompletion(params: {
    messages: { role: string; content: string }[];
    response_format?: { type: string };
    temperature?: number;
    max_tokens?: number;
  }) {
    const client = this.initialize();
    if (!client) throw new Error('LLM not configured');

    let lastError: Error | null = null;
    for (const model of this.getModelFallbacks()) {
      try {
        return await client.chat.completions.create({
          model,
          ...params,
        } as any);
      } catch (err: any) {
        lastError = err;
        if (err?.status === 404 || err?.code === 404) continue;
        throw err;
      }
    }
    throw lastError || new Error('All LLM models failed');
  }

  async generateCase(params: {
    difficulty: string;
    crimeType: string;
    location?: string;
    avoidNames?: string[];
    avoidTitles?: string[];
    attempt?: number;
  }): Promise<any> {
    const client = this.initialize();
    if (!client) {
      throw new Error('LLM not configured');
    }

    const avoidContext =
      params.avoidNames?.length || params.avoidTitles?.length
        ? `\nAVOID reusing these names: ${(params.avoidNames || []).join(', ')}.\nAVOID similar titles: ${(params.avoidTitles || []).join(', ')}.\nGenerate something completely different.`
        : '';

    const systemPrompt = `You are a master mystery writer for a procedural detective game like L.A. Noire.
Generate a COMPLETE, UNIQUE murder mystery as JSON matching this schema:
${CASE_JSON_SCHEMA}

RULES:
- Use culturally realistic names for the country setting. NEVER use John Smith, Mary Wilson, Sarah Johnson, Robert Davis, Emily Carter, Richard Thorne.
- Exactly ONE suspect must have isGuilty: true
- All dialogueTopics must contain case-specific responses referencing actual characters and events
- Lies must be logically consistent until evidence exposes them
- Every element must interconnect: timeline, clues, evidence, motives
- Return ONLY valid JSON, no markdown`;

    const userPrompt = `Generate a ${params.difficulty} difficulty ${params.crimeType} mystery.
${params.location ? `Setting: ${params.location}` : 'Choose an interesting international setting.'}
${avoidContext}
Seed for uniqueness: ${Date.now()}-${params.attempt || 0}-${Math.random()}`;

    const response = await this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.95,
      max_tokens: 8000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty LLM response');
    return JSON.parse(content);
  }

  async generateCaseGroundedDialogue(params: {
    npcName: string;
    caseContext: string;
    playerQuestion: string;
    approach?: string;
  }): Promise<{ dialogue: string; emotionalReaction: string }> {
    const client = this.initialize();
    if (!client) throw new Error('LLM not configured');

    const systemPrompt = `You ARE ${params.npcName} in a detective interrogation. You must respond ONLY using facts from the CASE DATA below.
STRICT RULES:
- NEVER invent characters, events, or evidence not in the case data
- NEVER use generic responses like "I don't know" or "ask someone else" unless backed by case facts
- NEVER mention names not in the case data
- Stay in character as ${params.npcName} — first person
- If guilty: maintain lies until evidence in CASE DATA exposes them, then show nervousness
- Reference previous conversation history when relevant
- React emotionally: calm, nervous, angry, sad, defensive, cooperative, hostile
- Keep responses 2-4 sentences, natural dialogue
- Approach: ${params.approach || 'neutral'}

CASE DATA:
${params.caseContext}

Return JSON: {"dialogue": "your in-character response", "emotionalReaction": "calm|nervous|angry|sad|defensive|cooperative|hostile"}`;

    const response = await this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: params.playerQuestion },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty dialogue response');
    const parsed = JSON.parse(content);
    return {
      dialogue: parsed.dialogue || '',
      emotionalReaction: parsed.emotionalReaction || 'calm',
    };
  }

  async generateHint(params: {
    caseContext: string;
    discoveredClues: string[];
    stuckDuration: number;
    difficulty: string;
  }): Promise<string> {
    const client = this.initialize();
    if (!client) throw new Error('LLM not configured');

    const response = await this.chatCompletion({
      messages: [
        {
          role: 'system',
          content: 'Provide a subtle detective hint using ONLY the case data provided. Do not reveal the killer.',
        },
        {
          role: 'user',
          content: `Case: ${params.caseContext}\nDiscovered clues: ${params.discoveredClues.join(', ')}\nStuck: ${params.stuckDuration}min\nDifficulty: ${params.difficulty}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || 'Review the timeline and cross-reference witness statements.';
  }
}

export const llmClient = new LLMClient();

export function normalizeLLMCase(raw: any, params: {
  difficulty: string;
  crimeType: string;
}): Omit<Case, 'id' | 'playerId' | 'createdAt' | 'status'> {
  const nameToId = new Map<string, string>();

  const suspects: Suspect[] = (raw.suspects || []).map((s: any) => {
    const id = uuidv4();
    nameToId.set(s.name, id);
    return {
      id,
      name: s.name || `Suspect ${Math.floor(Math.random() * 1000)}`,
      age: s.age || 28 + Math.floor(Math.random() * 35),
      occupation: s.occupation || 'Business Professional',
      appearance: s.appearance || 'Average height, dressed professionally',
      personality: s.personality || 'Reserved and cautious',
      alibi: s.alibi || 'No alibi provided',
      motive: s.motive || 'Unknown motive',
      relationshipToVictim: s.relationshipToVictim || 'Acquaintance',
      isGuilty: !!s.isGuilty,
      secrets: s.secrets || [],
      relationships: (s.relationships || []) as NPCRelationship[],
      truthfulFacts: s.truthfulFacts || [],
      lies: s.lies || [],
      exposedLies: [],
      dialogueTopics: (s.dialogueTopics || []) as DialogueTopic[],
      memories: [],
      emotionalState: {
        current: s.isGuilty ? 'nervous' : 'calm',
        intensity: s.isGuilty ? 0.5 : 0.2,
        factors: s.isGuilty ? ['guilt'] : [],
      },
    };
  });

  const witnesses: Witness[] = (raw.witnesses || []).map((w: any) => {
    const id = uuidv4();
    nameToId.set(w.name, id);
    return {
      id,
      name: w.name || `Witness ${Math.floor(Math.random() * 1000)}`,
      age: w.age || 25 + Math.floor(Math.random() * 40),
      occupation: w.occupation || 'Local Resident',
      testimony: w.testimony || 'I saw nothing unusual.',
      reliability: w.reliability ?? 0.7,
      location: w.location || raw.location || 'Near the scene',
      personality: w.personality || 'Cooperative but nervous',
      secrets: w.secrets || [],
      relationships: w.relationships || [],
      truthfulFacts: w.truthfulFacts || [],
      lies: [],
      exposedLies: [],
      dialogueTopics: w.dialogueTopics || [],
      memories: [],
      emotionalState: { current: 'cooperative', intensity: 0.3, factors: [] },
    };
  });

  const evidence: Evidence[] = (raw.evidence || []).map((e: any) => ({
    id: uuidv4(),
    name: e.name,
    description: e.description || '',
    type: e.type || 'document',
    content: e.content,
    collected: false,
    analysis: e.linkedSuspectName && nameToId.has(e.linkedSuspectName)
      ? { fingerprint: { matches: [nameToId.get(e.linkedSuspectName)!], confidence: 0.85, partialMatch: false } }
      : undefined,
  }));

  const evidenceByName = new Map(evidence.map(e => [e.name, e.id]));

  const clues: Clue[] = (raw.clues || []).map((c: any) => ({
    id: uuidv4(),
    name: c.name,
    description: c.description || '',
    type: c.type || 'physical',
    location: c.location || raw.location || '',
    discovered: false,
    relatedSuspects: (c.relatedSuspectNames || [])
      .map((n: string) => nameToId.get(n))
      .filter(Boolean) as string[],
    relatedEvidence: [],
    importance: c.importance || 'medium',
  }));

  const timeline: TimelineEvent[] = (raw.timeline || []).map((t: any) => ({
    id: uuidv4(),
    time: t.time,
    description: t.description || '',
    participants: t.participantNames || [],
    location: t.location || raw.location || '',
    verified: !!t.verified,
    evidence: [],
  }));

  const culpritName = raw.solution?.culpritName;
  const culprit = suspects.find(s => s.name === culpritName) || suspects.find(s => s.isGuilty);

  const solution: CaseSolution = {
    culpritId: culprit?.id || suspects[0]?.id || '',
    method: raw.solution?.method || '',
    motive: raw.solution?.motive || culprit?.motive || '',
    keyEvidence: (raw.solution?.keyEvidenceNames || [])
      .map((n: string) => evidenceByName.get(n))
      .filter(Boolean) as string[],
    alternateEndings: raw.alternateEndings || [],
  };

  return {
    title: raw.title || `The ${raw.victimName || 'Mysterious'} Case`,
    description: raw.description || 'A complex investigation requiring careful analysis.',
    difficulty: params.difficulty as Case['difficulty'],
    crimeType: params.crimeType,
    location: raw.location || 'City Center',
    country: raw.country || 'United States',
    victim: {
      name: raw.victimName || 'John Doe',
      age: raw.victim?.age || 25 + Math.floor(Math.random() * 45),
      gender: raw.victim?.gender || (['male', 'female', 'non-binary'] as const)[Math.floor(Math.random() * 3)],
      occupation: raw.victim?.occupation || 'Professional',
      city: (raw.location || 'City Center').split(',')[0].trim(),
      background: raw.victimDetails || raw.description || 'A well-known member of the community with various connections.',
      relationships: raw.victim?.relationships || ['Close to family', 'Had business connections'],
      personality: raw.victim?.personality || 'Reserved but observant',
      shortBiography: raw.victim?.shortBiography || 'Born and raised in the area, had a successful career before their untimely death.',
      lifestyle: raw.victim?.lifestyle || 'Lived a comfortable life'
    },
    victimName: raw.victimName || 'John Doe',
    victimDetails: raw.victimDetails || 'The victim was a prominent figure in the community.',
    twist: raw.twist || 'The investigation reveals unexpected connections.',
    ending: raw.ending || 'The truth comes to light through careful deduction.',
    date: new Date().toISOString(),
    suspects,
    witnesses,
    clues,
    evidence,
    timeline,
    solution,
  };
}

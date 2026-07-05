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

const CULTURES = [
  {
    country: 'Japan',
    first: ['Haruki', 'Yuki', 'Kenji', 'Sakura', 'Ren', 'Aiko', 'Takeshi', 'Miyu', 'Daichi', 'Hana'],
    last: ['Tanaka', 'Suzuki', 'Nakamura', 'Yamamoto', 'Kobayashi', 'Saito', 'Ito', 'Watanabe'],
    locations: ['Kyoto teahouse district', 'Osaka waterfront warehouse', 'Tokyo corporate tower', 'Hokkaido ski lodge'],
  },
  {
    country: 'France',
    first: ['Élodie', 'Lucien', 'Camille', 'Théo', 'Margaux', 'Henri', 'Clémence', 'Bastien', 'Inès', 'Rémy'],
    last: ['Dubois', 'Moreau', 'Laurent', 'Fontaine', 'Mercier', 'Garnier', 'Chevalier', 'Rousseau'],
    locations: ['Marseille harbor café', 'Lyon silk atelier', 'Paris Belle Époque hotel', 'Bordeaux vineyard estate'],
  },
  {
    country: 'India',
    first: ['Arjun', 'Priya', 'Vikram', 'Ananya', 'Rohan', 'Meera', 'Dev', 'Kavya', 'Sanjay', 'Nisha'],
    last: ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Kapoor', 'Menon', 'Chatterjee', 'Banerjee'],
    locations: ['Mumbai heritage bungalow', 'Kerala backwater resort', 'Delhi diplomatic quarter', 'Jaipur palace hotel'],
  },
  {
    country: 'Brazil',
    first: ['Rafael', 'Beatriz', 'Thiago', 'Camila', 'Lucas', 'Mariana', 'Felipe', 'Juliana', 'Bruno', 'Larissa'],
    last: ['Silva', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Rodrigues'],
    locations: ['Rio cliffside penthouse', 'São Paulo art gallery', 'Salvador colonial mansion', 'Manaus river station'],
  },
  {
    country: 'Sweden',
    first: ['Erik', 'Astrid', 'Magnus', 'Linnea', 'Oskar', 'Freja', 'Lars', 'Ingrid', 'Nils', 'Saga'],
    last: ['Lindqvist', 'Bergström', 'Ekström', 'Holm', 'Nyström', 'Sundberg', 'Vikström', 'Åkesson'],
    locations: ['Stockholm archipelago villa', 'Gothenburg shipyard', 'Uppsala university hall', 'Kiruna mining lodge'],
  },
  {
    country: 'Mexico',
    first: ['Diego', 'Valentina', 'Mateo', 'Sofía', 'Emilio', 'Catalina', 'Javier', 'Paloma', 'Andrés', 'Lucía'],
    last: ['Herrera', 'Vega', 'Morales', 'Castillo', 'Delgado', 'Fuentes', 'Navarro', 'Ríos'],
    locations: ['Oaxaca colonial hacienda', 'Mexico City rooftop bar', 'Guadalajara ceramics studio', 'Cancún marina club'],
  },
  {
    country: 'Nigeria',
    first: ['Chidi', 'Amara', 'Emeka', 'Ngozi', 'Tunde', 'Adaeze', 'Kelechi', 'Zainab', 'Femi', 'Chioma'],
    last: ['Okonkwo', 'Adeyemi', 'Bello', 'Okafor', 'Eze', 'Nwachukwu', 'Abubakar', 'Obi'],
    locations: ['Lagos executive suite', 'Abuja diplomatic residence', 'Port Harcourt oil office', 'Kano merchant house'],
  },
  {
    country: 'South Korea',
    first: ['Min-jun', 'Seo-yeon', 'Jae-ho', 'Hae-won', 'Do-yun', 'Ji-woo', 'Sung-min', 'Yeon-ji', 'Hyun-seok', 'Su-bin'],
    last: ['Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Han'],
    locations: ['Seoul Hanok guesthouse', 'Busan film studio', 'Jeju coastal resort', 'Incheon tech campus'],
  },
];

const OCCUPATIONS = [
  'Art curator', 'Private banker', 'Ship captain', 'Forensic accountant', 'Antique dealer',
  'Political strategist', 'Film producer', 'Neurosurgeon', 'Wine importer', 'Architect',
  'Investigative podcaster', 'Diplomatic attaché', 'Marine biologist', 'Luxury concierge', 'Cryptographer',
];

const CRIME_METHODS = [
  'poisoned during a private dinner',
  'pushed from a balcony during a storm',
  'struck with a ceremonial object',
  'electrocuted via sabotaged equipment',
  'smothered in a locked study',
  'injected with a rare toxin',
  'bludgeoned during a power outage',
  'drowned in a flooded basement',
];

const TWISTS = [
  'The apparent victim staged earlier events to frame someone else',
  'A trusted witness was coerced into false testimony',
  'The murder weapon was planted after the fact',
  'Financial records were forged to mislead investigators',
  'The timeline was manipulated using a synchronized clock trick',
  'A secret twin created confusion about identities',
  'An alibi was manufactured using a body double',
  'The crime scene was rearranged before police arrived',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function uniqueName(used: Set<string>, culture: typeof CULTURES[0]): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const name = `${pick(culture.first)} ${pick(culture.last)}`;
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase());
      return name;
    }
  }
  return `${pick(culture.first)} ${pick(culture.last)}-${uuidv4().slice(0, 4)}`;
}

export function validateCase(caseData: Omit<Case, 'id' | 'playerId' | 'createdAt' | 'status'>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const forbiddenPlaceholders = ['Unknown', 'N/A', 'undefined', 'null', 'adversary'];

  // Validate victim fields (NO placeholders allowed!)
  if (!caseData.victim.name || forbiddenPlaceholders.includes(caseData.victim.name)) {
    errors.push('Victim name is missing or placeholder');
  }
  if (!caseData.victim.age || caseData.victim.age < 1) {
    errors.push('Victim age is missing or invalid');
  }
  if (!caseData.victim.gender) {
    errors.push('Victim gender is missing');
  }
  if (!caseData.victim.occupation || forbiddenPlaceholders.includes(caseData.victim.occupation)) {
    errors.push('Victim occupation is missing or placeholder');
  }
  if (!caseData.victim.city || forbiddenPlaceholders.includes(caseData.victim.city)) {
    errors.push('Victim city is missing or placeholder');
  }
  if (!caseData.victim.background || forbiddenPlaceholders.includes(caseData.victim.background)) {
    errors.push('Victim background is missing or placeholder');
  }
  if (!caseData.victim.relationships || caseData.victim.relationships.length === 0) {
    errors.push('Victim relationships are missing');
  }
  if (!caseData.victim.personality || forbiddenPlaceholders.includes(caseData.victim.personality)) {
    errors.push('Victim personality is missing or placeholder');
  }
  if (!caseData.victim.shortBiography || forbiddenPlaceholders.includes(caseData.victim.shortBiography)) {
    errors.push('Victim short biography is missing or placeholder');
  }
  if (!caseData.victim.lifestyle || forbiddenPlaceholders.includes(caseData.victim.lifestyle)) {
    errors.push('Victim lifestyle is missing or placeholder');
  }

  // Validate suspects
  if (!caseData.suspects || caseData.suspects.length < 4) {
    errors.push(`Suspects count is ${caseData.suspects?.length || 0}, minimum 4 required`);
  }

  // Validate killer exists
  const killer = caseData.suspects.find(s => s.id === caseData.solution.culpritId);
  if (!killer) {
    errors.push('Killer does not exist in suspects list');
  }

  // Validate evidence
  if (!caseData.evidence || caseData.evidence.length < 4) {
    errors.push(`Evidence count is ${caseData.evidence?.length || 0}, minimum 4 required`);
  }

  // Validate timeline
  if (!caseData.timeline || caseData.timeline.length < 5) {
    errors.push(`Timeline count is ${caseData.timeline?.length || 0}, minimum 5 required`);
  }

  // Validate interrogations (witnesses count should be sufficient)
  if (!caseData.witnesses || caseData.witnesses.length < 2) {
    errors.push(`Witnesses count is ${caseData.witnesses?.length || 0}, minimum 2 required`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function buildDialogueTopics(
  npcName: string,
  role: string,
  alibi: string,
  motive: string,
  isGuilty: boolean,
  otherNames: string[]
): DialogueTopic[] {
  const other = pick(otherNames.filter(n => n !== npcName)) || 'someone present';
  return [
    {
      keywords: ['where', 'alibi', 'were you', 'time', 'night', 'when'],
      truthfulResponse: isGuilty
        ? `I was ${alibi.split('.')[0].toLowerCase()}. I have no reason to lie about that.`
        : alibi,
      lieResponse: isGuilty ? alibi : undefined,
      emotionalReaction: isGuilty ? 'nervous' : 'calm',
    },
    {
      keywords: ['motive', 'why', 'reason', 'benefit', 'gain'],
      truthfulResponse: isGuilty
        ? `People always assume money or grudges. My connection to the victim was purely ${role.toLowerCase()}.`
        : `If you're asking about motive — ${motive}. That doesn't make me a killer.`,
      lieResponse: isGuilty ? `I had no reason to hurt anyone. We got along fine.` : undefined,
      emotionalReaction: isGuilty ? 'defensive' : 'cooperative',
    },
    {
      keywords: ['victim', 'deceased', 'dead', 'murder', 'killed'],
      truthfulResponse: isGuilty
        ? `What happened is a tragedy. I barely knew the details of their private affairs.`
        : `The victim and I were connected as ${role.toLowerCase()}. Their death shocked everyone who knew them.`,
      emotionalReaction: isGuilty ? 'nervous' : 'sad',
    },
    {
      keywords: ['suspect', 'who', 'other', 'witness', 'anyone else'],
      truthfulResponse: `I'd look closely at ${other}. There was tension between them that night.`,
      emotionalReaction: 'cooperative',
    },
    {
      keywords: ['secret', 'hide', 'truth', 'lying', 'honest'],
      truthfulResponse: isGuilty
        ? `I'm telling you what matters. Not every private detail is your business.`
        : `I haven't withheld anything relevant to the investigation.`,
      emotionalReaction: isGuilty ? 'defensive' : 'calm',
    },
  ];
}

export function generateProceduralCase(params: {
  difficulty: string;
  crimeType: string;
  location?: string;
  seed?: string;
}): Omit<Case, 'id' | 'playerId' | 'createdAt' | 'status'> {
  const culture = pick(CULTURES);
  const usedNames = new Set<string>();
  const victimName = uniqueName(usedNames, culture);
  const location = params.location || pick(culture.locations);
  const method = pick(CRIME_METHODS);
  const twist = pick(TWISTS);
  
  // Always generate 4-6 suspects, never fewer than 4
  const suspectCount = params.difficulty === 'expert' ? 6 : params.difficulty === 'hard' ? 5 : 4;
  const guiltyIndex = Math.floor(Math.random() * suspectCount);

  // Generate complete victim profile with all required fields
    const victimAge = 25 + Math.floor(Math.random() * 45);
    const victimGender: 'male' | 'female' | 'non-binary' = pick(['male', 'female', 'non-binary']) as 'male' | 'female' | 'non-binary';
    const victimOccupation = pick(OCCUPATIONS);
    const victimCity = pick(culture.locations).split(',').map(s => s.trim())[0] || culture.locations[0];
    const victimBackground = pick([
      `A respected ${victimOccupation.toLowerCase()} known for their philanthropic work in ${culture.country}.`,
      `Recently returned to ${culture.country} after years abroad, rebuilding connections in the ${victimOccupation.toLowerCase()} industry.`,
      `A controversial figure in ${culture.country}'s ${victimOccupation.toLowerCase()} community, with both powerful allies and bitter enemies.`,
      `An ambitious ${victimOccupation.toLowerCase()} who rose from humble beginnings to become a prominent figure in ${culture.country}.`,
      `Known for their collection of rare artifacts and their involvement in high-stakes ${victimOccupation.toLowerCase()} deals across ${culture.country}.`,
    ]);
    const victimRelationships = pickN([
      'Married with two children',
      'Recently divorced',
      'Caring for elderly parent',
      'Single, focused on career',
      'In a long-term partnership',
      'Widowed',
    ], 2);
    const victimPersonality = pick([
      'Charismatic and outgoing',
      'Reserved and observant',
      'Analytical and detail-oriented',
      'Warm and empathetic',
      'Bold and decisive',
      'Cautious and thoughtful',
    ]);
    const victimShortBiography = pick([
      `Born and raised in ${culture.country}, ${victimName} had a successful career as a ${victimOccupation.toLowerCase()} with a reputation for integrity.`,
      `${victimName} moved to ${victimCity} 10 years ago and quickly became a well-known figure in the local community.`,
      `A lifelong resident of ${culture.country}, ${victimName} dedicated their life to their work and family.`,
      `${victimName} was a self-made ${victimOccupation.toLowerCase()} who overcame many obstacles to achieve success.`,
      `After studying abroad, ${victimName} returned to ${culture.country} to pursue their passion as a ${victimOccupation.toLowerCase()}.`,
    ]);
    const victimLifestyle = pick([
      'Lived a lavish lifestyle with frequent international travel',
      'Maintained a modest, private life away from the public eye',
      'Known for hosting exclusive social gatherings',
      'Devoted to their work with little social life',
      'Active in local charity and community events',
      'Enjoyed collecting rare items and antiques',
    ]);

  const suspectNames = Array.from({ length: suspectCount }, () => uniqueName(usedNames, culture));
  const witnessNames = [uniqueName(usedNames, culture), uniqueName(usedNames, culture)];

  const suspects: Suspect[] = suspectNames.map((name, i) => {
    const isGuilty = i === guiltyIndex;
    const occupation = pick(OCCUPATIONS);
    const relationship = pick([
      'childhood friend', 'business rival', 'estranged sibling', 'former protégé',
      'secret creditor', 'romantic partner', 'estate beneficiary', 'political adversary',
    ]);
    const motive = pick([
      `Inheritance worth millions tied to ${victimName}'s will`,
      `A scandal ${victimName} was about to expose involving ${occupation.toLowerCase()} fraud`,
      `A broken partnership that cost ${name.split(' ')[0]} their reputation`,
      `Jealousy over ${victimName}'s recent promotion of a rival`,
      `Blackmail material ${victimName} held over ${name.split(' ')[0]}`,
    ]);
    const alibi = isGuilty
      ? `Alone in the ${pick(['library', 'garden pavilion', 'service corridor', 'rooftop terrace'])} with no witnesses`
      : `With ${pick(suspectNames.filter(n => n !== name))} near the ${pick(['main hall', 'kitchen', 'gallery', 'courtyard'])}`;
    const secrets = [
      pick([
        `Owes a substantial debt to ${victimName}`,
        `Was seen arguing with ${victimName} hours before the incident`,
        `Possesses a key that accesses the crime scene`,
        `Received a cryptic message from ${victimName} that morning`,
      ]),
    ];
    const relationships: NPCRelationship[] = suspectNames
      .filter(n => n !== name)
      .slice(0, 2)
      .map(other => ({
        targetName: other,
        relationship: pick(['professional rivalry', 'secret alliance', 'mutual distrust', 'old friendship', 'financial dependency']),
        detail: `${name.split(' ')[0]} and ${other.split(' ')[0]} have a complicated history tied to the victim's estate.`,
      }));

    return {
      id: uuidv4(),
      name,
      age: 28 + Math.floor(Math.random() * 35),
      occupation,
      appearance: pick([
        'Impeccably dressed with an anxious grip on a pocket watch',
        'Disheveled, ink-stained fingers, avoids eye contact',
        'Cold composure, measured speech, clenched jaw when pressed',
        'Warm demeanor that falters when evidence is mentioned',
      ]),
      personality: pick([
        'Methodical and guarded, chooses words carefully',
        'Charismatic but evasive, deflects with humor',
        'Emotional and reactive, voice rises under pressure',
        'Stoic and terse, reveals little unless cornered',
      ]),
      alibi,
      motive,
      relationshipToVictim: relationship,
      isGuilty,
      secrets,
      relationships,
      truthfulFacts: isGuilty
        ? [`Was present at ${location} on the night of the crime`, `Had access to the area where ${victimName} was found`]
        : [alibi, `Had no financial dispute with ${victimName} that would justify violence`],
      lies: isGuilty
        ? [`Denies being near the victim during the critical window`, `Claims no knowledge of the ${params.crimeType}`]
        : [],
      exposedLies: [],
      dialogueTopics: buildDialogueTopics(name, relationship, alibi, motive, isGuilty, suspectNames),
      memories: [],
      emotionalState: {
        current: isGuilty ? 'nervous' : 'calm',
        intensity: isGuilty ? 0.6 : 0.2,
        factors: isGuilty ? ['guilt', 'fear'] : [],
      },
    };
  });

  const culprit = suspects[guiltyIndex];

  const witnesses: Witness[] = witnessNames.map(name => ({
    id: uuidv4(),
    name,
    age: 25 + Math.floor(Math.random() * 40),
    occupation: pick(OCCUPATIONS),
    testimony: `${name.split(' ')[0]} reports hearing a disturbance near ${location} and seeing ${pick(suspectNames)} leaving in a hurry.`,
    reliability: 0.5 + Math.random() * 0.4,
    location: pick(['main corridor', 'service entrance', 'adjacent balcony', 'staff quarters']),
    secrets: [`Knows more about ${victimName}'s final conversation than they initially admitted`],
    relationships: [],
    truthfulFacts: [`Was at ${location} during the incident window`],
    lies: [],
    exposedLies: [],
    dialogueTopics: buildDialogueTopics(name, 'witness', `Observing from ${location}`, 'None — witness only', false, suspectNames),
    memories: [],
    personality: pick(['Cooperative but nervous', 'Reluctant, fearing retaliation', 'Eager to help, overly detailed']),
    emotionalState: { current: 'cooperative', intensity: 0.4, factors: [] },
  }));

  const clueIds = Array.from({ length: 6 }, () => uuidv4());
  const evidenceIds = Array.from({ length: 4 }, () => uuidv4());

  const clues: Clue[] = [
    {
      id: clueIds[0],
      name: 'Disturbed Personal Effects',
      description: `Items belonging to ${victimName} were rearranged, suggesting a struggle or search.`,
      type: 'physical',
      location: location,
      discovered: false,
      relatedSuspects: [culprit.id],
      relatedEvidence: [evidenceIds[0]],
      importance: 'critical',
    },
    {
      id: clueIds[1],
      name: 'Unidentified Fiber',
      description: 'A rare fabric fiber found near the body, inconsistent with the victim\'s clothing.',
      type: 'physical',
      location: 'Crime scene',
      discovered: false,
      relatedSuspects: [culprit.id, suspects[(guiltyIndex + 1) % suspectCount].id],
      relatedEvidence: [evidenceIds[1]],
      importance: 'high',
    },
    {
      id: clueIds[2],
      name: 'Altered Security Log',
      description: 'Digital access records show a gap during the critical time window.',
      type: 'digital',
      location: 'Security office',
      discovered: false,
      relatedSuspects: [culprit.id],
      relatedEvidence: [evidenceIds[2]],
      importance: 'critical',
    },
    {
      id: clueIds[3],
      name: 'Anonymous Note',
      description: `A handwritten note warning ${victimName} to "stop digging."`,
      type: 'physical',
      location: "Victim's desk",
      discovered: false,
      relatedSuspects: suspects.map(s => s.id),
      relatedEvidence: [],
      importance: 'medium',
    },
    {
      id: clueIds[4],
      name: 'Witness Contradiction',
      description: `${witnessNames[0]} and ${witnessNames[1]} disagree about who left the scene first.`,
      type: 'testimonial',
      location: 'Interview room',
      discovered: false,
      relatedSuspects: suspects.map(s => s.id),
      relatedEvidence: [],
      importance: 'high',
    },
    {
      id: clueIds[5],
      name: 'Financial Anomaly',
      description: `Recent transfers from ${victimName}'s accounts point to a concealed beneficiary.`,
      type: 'circumstantial',
      location: 'Financial records',
      discovered: false,
      relatedSuspects: [culprit.id],
      relatedEvidence: [evidenceIds[3]],
      importance: 'high',
    },
  ];

  const evidence: Evidence[] = [
    {
      id: evidenceIds[0],
      name: 'Forensic Trace Report',
      description: `Lab analysis linking physical traces to a suspect present at ${location}.`,
      type: 'document',
      analysis: { fingerprint: { matches: [culprit.id], confidence: 0.88, partialMatch: false } },
      collected: false,
    },
    {
      id: evidenceIds[1],
      name: 'Fabric Comparison',
      description: 'Microscopic match between crime scene fiber and suspect clothing.',
      type: 'document',
      analysis: { document: { author: 'Forensics Unit', date: new Date().toISOString(), authenticity: 0.92, alterations: [] } },
      collected: false,
    },
    {
      id: evidenceIds[2],
      name: 'Recovered Security Footage',
      description: `Footage showing a figure matching ${culprit.name} near the scene.`,
      type: 'video',
      content: `Timestamped recording from ${location} security system`,
      analysis: { digital: { source: 'Security camera', timestamp: new Date().toISOString(), metadata: { quality: 'medium' } } },
      collected: false,
    },
    {
      id: evidenceIds[3],
      name: 'Bank Transfer Record',
      description: `Document showing suspicious movement of ${victimName}'s funds before death.`,
      type: 'document',
      analysis: { document: { author: 'Bank compliance', date: new Date().toISOString(), authenticity: 0.95, alterations: [] } },
      collected: false,
    },
  ];

  const timeline: TimelineEvent[] = [
    { id: uuidv4(), time: '6:00 PM', description: `${victimName} arrives at ${location}`, participants: [victimName], location, verified: true, evidence: [] },
    { id: uuidv4(), time: '7:15 PM', description: `Heated exchange between ${victimName} and ${culprit.name}`, participants: [victimName, culprit.name], location, verified: false, evidence: [clueIds[3]] },
    { id: uuidv4(), time: '8:30 PM', description: `${witnessNames[0]} hears a loud noise`, participants: [witnessNames[0]], location, verified: true, evidence: [] },
    { id: uuidv4(), time: '8:45 PM', description: `${victimName} found incapacitated — victim ${params.crimeType}`, participants: [victimName], location, verified: true, evidence: [evidenceIds[0]] },
    { id: uuidv4(), time: '9:00 PM', description: `${culprit.name} seen leaving via service entrance`, participants: [culprit.name], location: 'Service entrance', verified: false, evidence: [evidenceIds[2]] },
    { id: uuidv4(), time: '9:20 PM', description: 'Authorities notified', participants: [witnessNames[1]], location, verified: true, evidence: [] },
  ];

  const title = `The ${pick(['Midnight', 'Silent', 'Broken', 'Hidden', 'Final', 'Vanishing'])} ${pick(['Alibi', 'Testimony', 'Ledger', 'Covenant', 'Confession', 'Witness'])}`;

  const solution: CaseSolution = {
    culpritId: culprit.id,
    method: `${culprit.name} ${method}.`,
    motive: culprit.motive,
    keyEvidence: [evidenceIds[0], evidenceIds[2]],
    alternateEndings: [
      {
        condition: 'Accuse wrong suspect with partial evidence',
        description: 'The real killer escapes while an innocent person is detained.',
        outcome: 'Case remains open with public outcry.',
      },
      {
        condition: 'Present all key evidence before accusation',
        description: `${culprit.name} breaks down and confesses when confronted with proof.`,
        outcome: 'Full confession and detailed reconstruction of events.',
      },
    ],
  };

  const generatedCase: Omit<Case, 'id' | 'playerId' | 'createdAt' | 'status'> = {
    title,
    description: `In ${culture.country}, at ${location}, ${victimName} has become the victim of a ${params.crimeType}. Multiple suspects with motive and opportunity remain at large — only careful interrogation and evidence analysis will reveal the truth.`,
    difficulty: params.difficulty as Case['difficulty'],
    crimeType: params.crimeType,
    location,
    country: culture.country,
    victim: {
      name: victimName,
      age: victimAge,
      gender: victimGender,
      occupation: victimOccupation,
      city: victimCity,
      background: victimBackground,
      relationships: victimRelationships,
      personality: victimPersonality,
      shortBiography: victimShortBiography,
      lifestyle: victimLifestyle,
    },
    victimName,
    victimDetails: `${victimName} was a prominent ${victimOccupation.toLowerCase()} with powerful enemies and hidden debts.`,
    twist,
    ending: `When exposed, ${culprit.name} reveals ${twist.toLowerCase()}, leading to a dramatic confrontation at ${location}.`,
    date: new Date().toISOString(),
    suspects,
    witnesses,
    clues,
    evidence,
    timeline,
    solution,
  };

  // Validate the generated case and regenerate missing fields if needed
  const validation = validateCase(generatedCase);
  const forbiddenPlaceholders = ['Unknown', 'N/A', 'undefined', 'null', 'adversary'];
  if (!validation.isValid) {
    // Regenerate only the missing fields
    if (!generatedCase.victim.name || forbiddenPlaceholders.includes(generatedCase.victim.name)) {
      generatedCase.victim.name = uniqueName(usedNames, culture);
      generatedCase.victimName = generatedCase.victim.name;
    }
    if (!generatedCase.victim.age || generatedCase.victim.age < 1) {
      generatedCase.victim.age = 25 + Math.floor(Math.random() * 45);
    }
    if (!generatedCase.victim.gender) {
      generatedCase.victim.gender = pick(['male', 'female', 'non-binary']) as 'male' | 'female' | 'non-binary';
    }
    if (!generatedCase.victim.occupation || forbiddenPlaceholders.includes(generatedCase.victim.occupation)) {
      generatedCase.victim.occupation = pick(OCCUPATIONS);
    }
    if (!generatedCase.victim.city || forbiddenPlaceholders.includes(generatedCase.victim.city)) {
      generatedCase.victim.city = pick(culture.locations).split(',').map(s => s.trim())[0] || culture.locations[0];
    }
    if (!generatedCase.victim.background || forbiddenPlaceholders.includes(generatedCase.victim.background)) {
      generatedCase.victim.background = pick([
        `A respected ${generatedCase.victim.occupation.toLowerCase()} known for their philanthropic work in ${culture.country}.`,
        `Recently returned to ${culture.country} after years abroad, rebuilding connections in the ${generatedCase.victim.occupation.toLowerCase()} industry.`,
        `A controversial figure in ${culture.country}'s ${generatedCase.victim.occupation.toLowerCase()} community, with both powerful allies and bitter enemies.`,
      ]);
    }
    if (!generatedCase.victim.relationships || generatedCase.victim.relationships.length === 0) {
      generatedCase.victim.relationships = pickN([
        'Married with two children',
        'Recently divorced',
        'Caring for elderly parent',
        'Single, focused on career',
        'In a long-term partnership',
        'Widowed',
      ], 2);
    }
    if (!generatedCase.victim.personality || forbiddenPlaceholders.includes(generatedCase.victim.personality)) {
      generatedCase.victim.personality = pick([
        'Charismatic and outgoing',
        'Reserved and observant',
        'Analytical and detail-oriented',
        'Warm and empathetic',
        'Bold and decisive',
      ]);
    }
    if (!generatedCase.victim.shortBiography || forbiddenPlaceholders.includes(generatedCase.victim.shortBiography)) {
      generatedCase.victim.shortBiography = pick([
        `Born and raised in ${culture.country}, ${generatedCase.victim.name} had a successful career as a ${generatedCase.victim.occupation.toLowerCase()}.`,
        `${generatedCase.victim.name} was a well-respected member of the community with many connections.`,
      ]);
    }
    if (!generatedCase.victim.lifestyle || forbiddenPlaceholders.includes(generatedCase.victim.lifestyle)) {
      generatedCase.victim.lifestyle = pick([
        'Lived a comfortable life',
        'Maintained a private lifestyle',
      ]);
    }
  }

  return generatedCase;
}

type VocabularyTerm = {
  term: string;
  aliases: string[];
  category?: string;
};

const INDUSTRY_VOCABULARY: VocabularyTerm[] = [
  { term: "PAX", aliases: ["packs", "pax", "packs", "pack", "pecs", "pecks", "facts", "fax"], category: "hardware" },
  { term: "POS", aliases: ["pause", "post", "pose", "boss", "pass"], category: "hardware" },
  { term: "terminal", aliases: ["terminale", "terminal", "termine"], category: "hardware" },
  { term: "Clover", aliases: ["clover", "cover", "clever", "clovers"], category: "hardware" },
  { term: "Square", aliases: ["square", "squire", "squared"], category: "hardware" },
  { term: "Stripe", aliases: ["stripe", "strip", "stripes", "stripped"], category: "payment" },
  { term: "EMV", aliases: ["emv", "e m v", "emp", "mv"], category: "payment" },
  { term: "NFC", aliases: ["nfc", "n f c", "mfc"], category: "payment" },
  { term: "API", aliases: ["api", "a p i", "ap eye"], category: "technical" },
  { term: "SDK", aliases: ["sdk", "s d k", "s t k"], category: "technical" },
  { term: "webhook", aliases: ["web hook", "web book", "web hug"], category: "technical" },
  { term: "ACH", aliases: ["ach", "a c h", "ache", "each"], category: "payment" },
  { term: "PCI", aliases: ["pci", "p c i", "pc i", "pca"], category: "compliance" },
  { term: "DSS", aliases: ["dss", "d s s", "ds s"], category: "compliance" },
  { term: "chargeback", aliases: ["charge back", "char back", "charge bag"], category: "payment" },
  { term: "refund", aliases: ["we fund", "re fund"], category: "payment" },
  { term: "invoice", aliases: ["in voice", "invoiced"], category: "billing" },
  { term: "receipt", aliases: ["receit", "recept", "re-seat"], category: "billing" },
  { term: "merchant", aliases: ["merge ant", "merchants"], category: "business" },
  { term: "transaction", aliases: ["trans action", "transactions"], category: "payment" },
  { term: "authorization", aliases: ["author ization", "authorisation"], category: "payment" },
  { term: "settlement", aliases: ["settle meant", "settlements"], category: "payment" },
  { term: "batch", aliases: ["badge", "botch", "batched"], category: "payment" },
  { term: "void", aliases: ["voided", "boys", "boy"], category: "payment" },
  { term: "tip", aliases: ["tips", "typed"], category: "payment" },
  { term: "Bluetooth", aliases: ["blue tooth", "blue to"], category: "hardware" },
  { term: "WiFi", aliases: ["wi-fi", "why fi", "wife i"], category: "hardware" },
  { term: "Ethernet", aliases: ["ether net", "either net"], category: "hardware" },
  { term: "USB", aliases: ["usb", "u s b", "use b"], category: "hardware" },
  { term: "RapidRMS", aliases: ["rapid rms", "rapid r m s", "rapid arms"], category: "brand" },
];

let customTerms: VocabularyTerm[] = [];
let kbTerms: VocabularyTerm[] = [];

export function addCustomTerm(term: string, aliases: string[], category?: string) {
  const exists = customTerms.find(t => t.term.toLowerCase() === term.toLowerCase());
  if (!exists) {
    customTerms.push({ term, aliases, category });
  }
}

export function setKBTerms(terms: string[]) {
  kbTerms = terms.map(term => ({
    term,
    aliases: [term.toLowerCase()],
    category: 'knowledge-base'
  }));
}

export function getAllTerms(): VocabularyTerm[] {
  return [...INDUSTRY_VOCABULARY, ...customTerms, ...kbTerms];
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function findBestMatch(word: string, threshold: number = 0.7): { term: string; confidence: number } | null {
  const lowerWord = word.toLowerCase();
  const allTerms = getAllTerms();
  
  let bestMatch: { term: string; confidence: number } | null = null;
  
  for (const vocabTerm of allTerms) {
    for (const alias of vocabTerm.aliases) {
      const aliasLower = alias.toLowerCase();
      
      if (aliasLower === lowerWord) {
        return { term: vocabTerm.term, confidence: 1.0 };
      }
      
      const distance = levenshteinDistance(lowerWord, aliasLower);
      const maxLen = Math.max(lowerWord.length, aliasLower.length);
      const similarity = 1 - (distance / maxLen);
      
      if (similarity >= threshold) {
        if (!bestMatch || similarity > bestMatch.confidence) {
          bestMatch = { term: vocabTerm.term, confidence: similarity };
        }
      }
    }
  }
  
  return bestMatch;
}

export function correctTranscript(transcript: string): { corrected: string; corrections: Array<{ original: string; corrected: string; confidence: number }> } {
  const words = transcript.split(/\s+/);
  const corrections: Array<{ original: string; corrected: string; confidence: number }> = [];
  
  const correctedWords = words.map((word, index) => {
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '');
    const punctuation = word.slice(cleanWord.length);
    
    if (cleanWord.length < 2) return word;
    
    const match = findBestMatch(cleanWord);
    
    if (match && match.confidence >= 0.75 && match.term.toLowerCase() !== cleanWord.toLowerCase()) {
      corrections.push({
        original: cleanWord,
        corrected: match.term,
        confidence: match.confidence
      });
      return match.term + punctuation;
    }
    
    if (index > 0) {
      const prevWord = words[index - 1].toLowerCase().replace(/[.,!?;:'"()[\]{}]/g, '');
      const twoWordPhrase = `${prevWord} ${cleanWord}`;
      const phraseMatch = findBestMatch(twoWordPhrase.replace(' ', ''), 0.8);
      
      if (phraseMatch && phraseMatch.confidence >= 0.85) {
        return '';
      }
    }
    
    return word;
  }).filter(w => w !== '');
  
  return {
    corrected: correctedWords.join(' '),
    corrections
  };
}

export async function fetchKBKeywords(): Promise<string[]> {
  try {
    const response = await fetch('/api/knowledge-base/keywords');
    if (response.ok) {
      const data = await response.json();
      return data.keywords || [];
    }
  } catch (error) {
    console.error('Failed to fetch KB keywords:', error);
  }
  return [];
}

export async function initializeDomainVocabulary(): Promise<void> {
  const keywords = await fetchKBKeywords();
  setKBTerms(keywords);
  console.log(`[DomainVocabulary] Loaded ${keywords.length} KB keywords`);
}

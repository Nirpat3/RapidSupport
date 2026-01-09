type VocabularyTerm = {
  term: string;
  aliases: string[];
  category?: string;
};

const STORAGE_KEY = 'support_board_custom_vocabulary';

const INDUSTRY_VOCABULARY: VocabularyTerm[] = [
  { term: "PAX", aliases: ["packs", "pax", "pack", "pecs", "pecks", "facts", "fax"], category: "hardware" },
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
  { term: "PAX terminal", aliases: ["pax terminal", "packs terminal", "pax terminals"], category: "hardware" },
  { term: "POS system", aliases: ["pos system", "pause system", "post system"], category: "hardware" },
];

let customTerms: VocabularyTerm[] = [];
let kbTerms: VocabularyTerm[] = [];

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function loadCustomVocabularyFromStorage(): VocabularyTerm[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[DomainVocabulary] Failed to load from localStorage:', error);
  }
  return [];
}

function saveCustomVocabularyToStorage(terms: VocabularyTerm[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  } catch (error) {
    console.error('[DomainVocabulary] Failed to save to localStorage:', error);
  }
}

function ensureCustomTermsLoaded(): void {
  if (customTerms.length === 0) {
    customTerms = loadCustomVocabularyFromStorage();
  }
}

export function getCustomVocabulary(): Array<{ term: string; aliases: string[] }> {
  ensureCustomTermsLoaded();
  return customTerms.map(t => ({ term: t.term, aliases: t.aliases }));
}

export function addCustomVocabularyTerm(term: string, aliases: string[]): void {
  ensureCustomTermsLoaded();
  const exists = customTerms.find(t => t.term.toLowerCase() === term.toLowerCase());
  if (!exists) {
    customTerms.push({ term, aliases, category: 'custom' });
    saveCustomVocabularyToStorage(customTerms);
  }
}

export function removeCustomVocabularyTerm(term: string): void {
  ensureCustomTermsLoaded();
  customTerms = customTerms.filter(t => t.term.toLowerCase() !== term.toLowerCase());
  saveCustomVocabularyToStorage(customTerms);
}

export function addCustomTerm(term: string, aliases: string[], category?: string) {
  ensureCustomTermsLoaded();
  const exists = customTerms.find(t => t.term.toLowerCase() === term.toLowerCase());
  if (!exists) {
    customTerms.push({ term, aliases, category: category || 'custom' });
    saveCustomVocabularyToStorage(customTerms);
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
  ensureCustomTermsLoaded();
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

function findPhraseMatch(phrase: string, threshold: number = 0.8): { term: string; confidence: number } | null {
  const lowerPhrase = phrase.toLowerCase();
  const allTerms = getAllTerms();
  
  let bestMatch: { term: string; confidence: number } | null = null;
  
  for (const vocabTerm of allTerms) {
    if (!vocabTerm.term.includes(' ')) continue;
    
    for (const alias of vocabTerm.aliases) {
      const aliasLower = alias.toLowerCase();
      
      if (aliasLower === lowerPhrase) {
        return { term: vocabTerm.term, confidence: 1.0 };
      }
      
      const distance = levenshteinDistance(lowerPhrase, aliasLower);
      const maxLen = Math.max(lowerPhrase.length, aliasLower.length);
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

export function correctTranscript(transcript: string): { corrected: string; corrections: Array<{ original: string; corrected: string; confidence?: number }> } {
  const words = transcript.split(/\s+/);
  const corrections: Array<{ original: string; corrected: string; confidence?: number }> = [];
  const processedIndices = new Set<number>();
  const result: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    if (processedIndices.has(i)) continue;
    
    if (i < words.length - 1) {
      const word1 = words[i].replace(/[.,!?;:'"()[\]{}]/g, '');
      const word2 = words[i + 1].replace(/[.,!?;:'"()[\]{}]/g, '');
      const twoWordPhrase = `${word1} ${word2}`;
      const phraseMatch = findPhraseMatch(twoWordPhrase);
      
      if (phraseMatch && phraseMatch.confidence >= 0.85) {
        const punctuation = words[i + 1].slice(word2.length);
        corrections.push({
          original: twoWordPhrase,
          corrected: phraseMatch.term,
          confidence: phraseMatch.confidence
        });
        result.push(phraseMatch.term + punctuation);
        processedIndices.add(i);
        processedIndices.add(i + 1);
        i++;
        continue;
      }
    }
    
    const word = words[i];
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '');
    const punctuation = word.slice(cleanWord.length);
    
    if (cleanWord.length < 2) {
      result.push(word);
      continue;
    }
    
    const match = findBestMatch(cleanWord);
    
    if (match && match.confidence >= 0.75 && match.term.toLowerCase() !== cleanWord.toLowerCase()) {
      corrections.push({
        original: cleanWord,
        corrected: match.term,
        confidence: match.confidence
      });
      result.push(match.term + punctuation);
    } else {
      result.push(word);
    }
  }
  
  return {
    corrected: result.join(' '),
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
  ensureCustomTermsLoaded();
  const keywords = await fetchKBKeywords();
  setKBTerms(keywords);
  console.log(`[DomainVocabulary] Loaded ${customTerms.length} custom terms and ${keywords.length} KB keywords`);
}

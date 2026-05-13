// Roulette AI Prediction Engine v3.0
// Upgraded with: Anti-Streak Protection, Deep Pattern Analysis, Recovery Mode,
// Gap Analysis, Enhanced Markov Chain, Dynamic System Switching, Consensus Scoring

import { 
  Dozen, Prediction, SystemPrediction, PatternType, 
  SpinRecord, PatternMemoryEntry, MarkovNode,
  getDozen, formatPrediction 
} from './types';

// ============================================================
// HISTORY ENTRY TYPE
// ============================================================
export interface HistoryEntry {
  uniqueId: number;
  result: string;
  triggerNumber: number;
  totalNumber: number;
  isWin: boolean;
  explanation: string;
  system1Result: string;
  system2Result: string;
  system3Result: string;
  combinedResult: string;
  patternType: PatternType;
}

// ============================================================
// DANGER DOZEN PREDICTION TABLES (from PHP source code)
// ============================================================

// BEEM Patterns: All 3 dozens appear in last 3 spins
const BEEM_SYSTEM1: Record<string, number[]> = {
  '1-2-3': [1, 3],
  '2-3-1': [1, 2],
  '3-1-2': [2, 3],
  '1-3-2': [1, 2],
  '2-1-3': [2, 3],
  '3-2-1': [1, 3],
};

const BEEM_SYSTEM2: Record<string, number[]> = {
  '1-2-3': [2, 3],
  '2-3-1': [1, 3],
  '3-1-2': [1, 2],
  '1-3-2': [2, 3],
  '2-1-3': [1, 3],
  '3-2-1': [1, 2],
};

const BEEM_SYSTEM3: Record<string, number[]> = {
  '1-2-3': [2, 3],
  '2-3-1': [1, 3],
  '3-1-2': [1, 2],
  '1-3-2': [1, 3],
  '2-1-3': [1, 2],
  '3-2-1': [2, 3],
};

// TWO-DOZEN PATTERNS: Last 2 spins are from different dozens
const TWO_DOZEN_SYSTEM1: Record<string, number[]> = {
  '1-2': [1, 2],
  '2-3': [1, 3],
  '1-3': [1, 2],
  '3-2': [1, 3],
  '3-1': [1, 2],
  '2-1': [1, 2],
};

const TWO_DOZEN_SYSTEM2: Record<string, number[]> = {
  '1-2': [2, 3],
  '2-3': [1, 3],
  '1-3': [1, 2],
  '3-2': [1, 3],
  '3-1': [1, 2],
  '2-1': [2, 3],
};

const TWO_DOZEN_SYSTEM3: Record<string, number[]> = {
  '1-2': [1, 3],
  '2-3': [1, 2],
  '1-3': [2, 3],
  '3-2': [1, 2],
  '3-1': [2, 3],
  '2-1': [1, 3],
};

// SAME-DOZEN PATTERNS
const SAME_DOZEN_SYSTEM1: Record<string, number[]> = {
  '1-1': [1, 2],
  '2-2': [2, 3],
  '3-3': [2, 3],
};

const SAME_DOZEN_SYSTEM2: Record<string, number[]> = {
  '1-1': [2, 3],
  '2-2': [1, 3],
  '3-3': [1, 3],
};

const SAME_DOZEN_SYSTEM3: Record<string, number[]> = {
  '1-1': [1, 3],
  '2-2': [1, 2],
  '3-3': [1, 2],
};

// ============================================================
// EXTENDED DEEP PATTERN TABLES (4-spin and 5-spin patterns)
// NEW in v3.0: These look deeper into history for stronger predictions
// ============================================================

// 4-spin patterns: key = "d1-d2-d3-d4" where d1=newest
// These patterns track what happens AFTER a specific 4-dozen sequence
const DEEP4_SYSTEM: Record<string, number[]> = {
  // Same dozen x3 then different
  '1-1-1-2': [1, 2], '1-1-1-3': [1, 3],
  '2-2-2-1': [2, 3], '2-2-2-3': [2, 3],
  '3-3-3-1': [1, 3], '3-3-3-2': [2, 3],
  // Alternating patterns (ABAB)
  '1-2-1-2': [1, 3], '2-1-2-1': [2, 3],
  '1-3-1-3': [1, 2], '3-1-3-1': [2, 3],
  '2-3-2-3': [1, 2], '3-2-3-2': [1, 3],
  // ABCA patterns (3 different then return)
  '1-2-3-1': [1, 2], '1-3-2-1': [1, 3],
  '2-1-3-2': [2, 3], '2-3-1-2': [1, 2],
  '3-1-2-3': [1, 3], '3-2-1-3': [2, 3],
};

// ============================================================
// PATTERN LEARNING ENGINE v3.0 (Enhanced)
// ============================================================

class PatternLearner {
  private patternMemory: Map<string, PatternMemoryEntry> = new Map();
  private markovChain: Map<string, MarkovNode> = new Map();
  private markovChain2: Map<string, MarkovNode> = new Map(); // 2nd order Markov
  private recentPatterns: string[] = [];
  private recentResults: { patternKey: string; predicted: number[]; actual: Dozen; hit: boolean }[] = [];
  private maxMemorySize = 2000;
  private markovOrder = 3;
  
  // NEW: Track consecutive misses for anti-streak
  private consecutiveMisses = 0;
  private lastPredictedDozens: number[] = [];
  private missedDozenHistory: number[] = []; // Track which dozen we missed

  learn(patternKey: string, predictedDozens: number[], actualDozen: Dozen): void {
    const hit = predictedDozens.includes(actualDozen);
    
    // Track consecutive misses
    if (hit) {
      this.consecutiveMisses = 0;
    } else {
      this.consecutiveMisses++;
      // Track which dozen appeared instead (the one we didn't predict)
      const missedDozen = actualDozen;
      if (missedDozen > 0) {
        this.missedDozenHistory.push(missedDozen);
        if (this.missedDozenHistory.length > 20) this.missedDozenHistory.shift();
      }
    }
    this.lastPredictedDozens = [...predictedDozens];
    
    // Track recent results for adaptive learning
    this.recentResults.push({ patternKey, predicted: predictedDozens, actual: actualDozen, hit });
    if (this.recentResults.length > 100) this.recentResults.shift();

    // Update pattern memory
    const memoryKey = `${patternKey}->${predictedDozens.join(',')}`;
    const entry = this.patternMemory.get(memoryKey);
    
    if (entry) {
      if (hit) {
        entry.hitCount++;
        entry.weight = Math.min(entry.weight * 1.08, 3.0); // Stronger boost
      } else {
        entry.missCount++;
        entry.weight = Math.max(entry.weight * 0.88, 0.05); // Stronger penalty
      }
      entry.lastSeen = Date.now();
    } else {
      this.patternMemory.set(memoryKey, {
        patternKey,
        predictedDozens,
        hitCount: hit ? 1 : 0,
        missCount: hit ? 0 : 1,
        weight: hit ? 1.2 : 0.8,
        lastSeen: Date.now(),
      });
    }

    // Update Markov chains
    this.updateMarkovChain(this.markovChain, patternKey, actualDozen);
    
    // Update 2nd order Markov (uses last 2 pattern keys)
    if (this.recentPatterns.length >= 2) {
      const key2 = `${this.recentPatterns[this.recentPatterns.length - 1]}|${patternKey}`;
      this.updateMarkovChain(this.markovChain2, key2, actualDozen);
    }

    this.recentPatterns.push(patternKey);
    if (this.recentPatterns.length > 150) {
      this.recentPatterns.shift();
    }

    if (this.patternMemory.size > this.maxMemorySize) {
      this.prunePatterns();
    }
  }

  private updateMarkovChain(chain: Map<string, MarkovNode>, state: string, nextState: Dozen): void {
    const node = chain.get(state);
    const nextKey = String(nextState);
    
    if (node) {
      node.transitions[nextKey] = (node.transitions[nextKey] || 0) + 1;
      node.totalTransitions++;
    } else {
      chain.set(state, {
        transitions: { [nextKey]: 1 },
        totalTransitions: 1,
      });
    }
  }

  // Get Markov chain prediction - ENHANCED with 2nd order
  getMarkovPrediction(patternKey: string): { dozens: number[]; confidence: number } | null {
    // Try 2nd order Markov first (more specific, more accurate)
    if (this.recentPatterns.length >= 2) {
      const key2 = `${this.recentPatterns[this.recentPatterns.length - 1]}|${patternKey}`;
      const pred2 = this.getMarkovPredictionFromChain(this.markovChain2, key2, 2);
      if (pred2 && pred2.confidence > 0.55) {
        return pred2; // Use 2nd order if confident enough
      }
    }
    
    // Fall back to 1st order
    return this.getMarkovPredictionFromChain(this.markovChain, patternKey, 3);
  }
  
  private getMarkovPredictionFromChain(
    chain: Map<string, MarkovNode>, 
    state: string, 
    minTransitions: number
  ): { dozens: number[]; confidence: number } | null {
    const node = chain.get(state);
    if (!node || node.totalTransitions < minTransitions) return null;

    const probs: Record<number, number> = {};
    for (const [nextDozen, count] of Object.entries(node.transitions)) {
      probs[Number(nextDozen)] = count / node.totalTransitions;
    }

    // Find the two most likely dozens (exclude 0)
    const sortedDozens = Object.entries(probs)
      .filter(([d]) => Number(d) !== 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([d]) => Number(d));

    if (sortedDozens.length < 2) return null;

    const combinedProb = sortedDozens.reduce((sum, d) => sum + (probs[d] || 0), 0);
    
    return {
      dozens: sortedDozens,
      confidence: Math.min(combinedProb, 0.98),
    };
  }

  // Get pattern weight
  getPatternWeight(patternKey: string, predictedDozens: number[]): number {
    const memoryKey = `${patternKey}->${predictedDozens.join(',')}`;
    const entry = this.patternMemory.get(memoryKey);
    if (!entry) return 1.0;

    const total = entry.hitCount + entry.missCount;
    if (total < 3) return 1.0;

    return entry.weight;
  }

  // NEW: Get consecutive miss count
  getConsecutiveMisses(): number {
    return this.consecutiveMisses;
  }

  // NEW: Get the dozen that keeps appearing when we miss
  getRecurringMissDozen(): number | null {
    if (this.missedDozenHistory.length < 2) return null;
    const last5 = this.missedDozenHistory.slice(-5);
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const d of last5) {
      if (d >= 1 && d <= 3) counts[d]++;
    }
    // If one dozen appeared 3+ times in last 5 misses, it's recurring
    for (const [d, c] of Object.entries(counts)) {
      if (c >= 3) return Number(d);
    }
    return null;
  }

  // NEW: Get recent accuracy for a specific pattern
  getRecentPatternAccuracy(patternKey: string): number {
    const recent = this.recentResults.slice(-20);
    let hits = 0;
    let total = 0;
    for (const r of recent) {
      if (r.patternKey === patternKey) {
        total++;
        if (r.hit) hits++;
      }
    }
    return total > 0 ? hits / total : -1; // -1 means no data
  }

  // NEW: Get best performing prediction for a pattern
  getBestPredictionForPattern(patternKey: string): number[] | null {
    const candidates: { dozens: number[]; score: number }[] = [];
    
    for (const [key, entry] of this.patternMemory.entries()) {
      if (key.startsWith(patternKey + '->')) {
        const total = entry.hitCount + entry.missCount;
        if (total >= 3) {
          const accuracy = entry.hitCount / total;
          candidates.push({
            dozens: entry.predictedDozens,
            score: accuracy * entry.weight * Math.log(total + 1),
          });
        }
      }
    }
    
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].dozens;
  }

  detectStreak(): { type: 'hot' | 'cold' | 'none'; length: number; hotDozen?: number } {
    if (this.recentPatterns.length < 5) return { type: 'none', length: 0 };

    const lastDozens = this.recentPatterns.slice(-10);
    let streakDozen: number | null = null;
    let streakLength = 0;

    for (let i = lastDozens.length - 1; i >= 0; i--) {
      const dozen = this.extractDozenFromPattern(lastDozens[i]);
      if (dozen === null) break;
      if (streakDozen === null) {
        streakDozen = dozen;
        streakLength = 1;
      } else if (dozen === streakDozen) {
        streakLength++;
      } else {
        break;
      }
    }

    if (streakLength >= 3) {
      return { type: 'hot', length: streakLength, hotDozen: streakDozen ?? undefined };
    }

    if (this.recentPatterns.length >= 6) {
      const last6 = this.recentPatterns.slice(-6);
      const dozens = last6.map(p => this.extractDozenFromPattern(p));
      const uniqueDozens = new Set(dozens.filter(d => d !== null));
      if (uniqueDozens.size >= 3) {
        return { type: 'cold', length: 6 };
      }
    }

    return { type: 'none', length: 0 };
  }

  private extractDozenFromPattern(pattern: string): number | null {
    const parts = pattern.split('-');
    if (parts.length > 0) {
      const d = parseInt(parts[parts.length - 1]);
      return isNaN(d) ? null : d;
    }
    return null;
  }

  private prunePatterns(): void {
    const entries = Array.from(this.patternMemory.entries());
    entries.sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.patternMemory.delete(entries[i][0]);
    }
  }

  getPatternMemories(): PatternMemoryEntry[] {
    return Array.from(this.patternMemory.values());
  }

  serialize(): string {
    return JSON.stringify({
      patternMemory: Array.from(this.patternMemory.entries()),
      markovChain: Array.from(this.markovChain.entries()),
      markovChain2: Array.from(this.markovChain2.entries()),
      recentPatterns: this.recentPatterns,
      consecutiveMisses: this.consecutiveMisses,
      missedDozenHistory: this.missedDozenHistory,
    });
  }

  static deserialize(data: string): PatternLearner {
    const learner = new PatternLearner();
    try {
      const parsed = JSON.parse(data);
      if (parsed.patternMemory) learner['patternMemory'] = new Map(parsed.patternMemory);
      if (parsed.markovChain) learner['markovChain'] = new Map(parsed.markovChain);
      if (parsed.markovChain2) learner['markovChain2'] = new Map(parsed.markovChain2);
      if (parsed.recentPatterns) learner['recentPatterns'] = parsed.recentPatterns;
      if (parsed.consecutiveMisses !== undefined) learner['consecutiveMisses'] = parsed.consecutiveMisses;
      if (parsed.missedDozenHistory) learner['missedDozenHistory'] = parsed.missedDozenHistory;
    } catch {
      // Return empty learner on parse error
    }
    return learner;
  }
}

// ============================================================
// GAP ANALYZER - Tracks how long since each dozen appeared
// ============================================================

class GapAnalyzer {
  // Calculate gap (spins since last appearance) for each dozen
  calculateGaps(spins: SpinRecord[]): Record<number, number> {
    const gaps: Record<number, number> = { 1: 999, 2: 999, 3: 999 };
    
    for (let i = spins.length - 1; i >= 0; i--) {
      const d = spins[i].dozen;
      if (d >= 1 && d <= 3 && gaps[d] === 999) {
        gaps[d] = spins.length - 1 - i;
      }
    }
    
    return gaps;
  }
  
  // Get "due" dozen score - dozens that haven't appeared for a while
  getDueScore(spins: SpinRecord[]): Record<number, number> {
    const gaps = this.calculateGaps(spins);
    const score: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    
    // Normalize gaps - higher gap = more "due"
    const maxGap = Math.max(gaps[1], gaps[2], gaps[3], 1);
    for (const d of [1, 2, 3] as const) {
      score[d] = gaps[d] / maxGap;
    }
    
    return score;
  }
  
  // Get overdue dozens (haven't appeared in 6+ spins)
  getOverdueDozens(spins: SpinRecord[]): number[] {
    const gaps = this.calculateGaps(spins);
    const overdue: number[] = [];
    for (const d of [1, 2, 3] as const) {
      if (gaps[d] >= 6) overdue.push(d);
    }
    return overdue;
  }
  
  // Get the "coldest" dozen (longest gap)
  getColdestDozen(spins: SpinRecord[]): number {
    const gaps = this.calculateGaps(spins);
    let coldest = 1;
    for (const d of [2, 3] as const) {
      if (gaps[d] > gaps[coldest]) coldest = d;
    }
    return coldest;
  }
}

// ============================================================
// MAIN PREDICTION ENGINE v3.0
// ============================================================

export class RouletteEngine {
  private spins: SpinRecord[] = [];
  private learner: PatternLearner;
  private gapAnalyzer: GapAnalyzer;
  private sessionId: string | null = null;
  private history: HistoryEntry[] = [];
  private uniqueCounter: number = 1;

  // Scoring for each system
  private scores = {
    system1: 0,
    system2: 0,
    system3: 0,
    combined: 0,
  };

  // Stats tracking
  private stats = {
    system1: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    system2: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    system3: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    combined: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
  };

  // Last predictions for verification
  private lastPredictions: SystemPrediction | null = null;
  
  // NEW: Track recent combined results for anti-streak
  private recentCombinedResults: boolean[] = [];
  
  // NEW: Track recent actual dozens for repetition detection
  private recentActualDozens: Dozen[] = [];

  constructor() {
    this.learner = new PatternLearner();
    this.gapAnalyzer = new GapAnalyzer();
  }

  getSpins(): SpinRecord[] {
    return [...this.spins];
  }

  getScores() {
    return { ...this.scores };
  }

  getStats() {
    return { ...this.stats };
  }

  getLastPredictions(): SystemPrediction | null {
    return this.lastPredictions;
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  addSpin(number: number): { 
    prediction: SystemPrediction; 
    previousResult?: { 
      system1: boolean; 
      system2: boolean; 
      system3: boolean; 
      combined: boolean;
      previousNumber: number;
    } 
  } {
    const dozen = getDozen(number);
    const spin: SpinRecord = { number, dozen, timestamp: Date.now() };

    // Track actual dozens
    if (dozen > 0) {
      this.recentActualDozens.push(dozen);
      if (this.recentActualDozens.length > 30) this.recentActualDozens.shift();
    }

    // Check previous predictions
    let previousResult: { system1: boolean; system2: boolean; system3: boolean; combined: boolean; previousNumber: number } | undefined;
    
    if (this.lastPredictions && this.spins.length > 0) {
      const prevDozen = dozen;
      const s1Correct = this.lastPredictions.system1.dozens.includes(prevDozen);
      const s2Correct = this.lastPredictions.system2.dozens.includes(prevDozen);
      const s3Correct = this.lastPredictions.system3.dozens.includes(prevDozen);
      const combinedCorrect = this.lastPredictions.combined.dozens.includes(prevDozen);

      // Check if the previous prediction was "wait" (no prediction)
      const isWaitPred = this.lastPredictions.combined.dozens.length === 0;

      // Update scores - DON'T penalize for "wait" (no prediction)
      if (!isWaitPred) {
        this.scores.system1 += s1Correct ? 1 : -1;
        this.scores.system2 += s2Correct ? 1 : -1;
        this.scores.system3 += s3Correct ? 1 : -1;
        this.scores.combined += combinedCorrect ? 1 : -1;

        // Track combined results for anti-streak (only for actual predictions)
        this.recentCombinedResults.push(combinedCorrect);
        if (this.recentCombinedResults.length > 30) this.recentCombinedResults.shift();

        this.updateStats('system1', s1Correct);
        this.updateStats('system2', s2Correct);
        this.updateStats('system3', s3Correct);
        this.updateStats('combined', combinedCorrect);
      }

      // Feed the AI learner (even for wait, we want to learn the pattern)
      if (this.lastPredictions.patternKey) {
        this.learner.learn(
          this.lastPredictions.patternKey,
          this.lastPredictions.combined.dozens,
          prevDozen
        );
      }

      previousResult = {
        system1: s1Correct,
        system2: s2Correct,
        system3: s3Correct,
        combined: combinedCorrect,
        previousNumber: number,
      };

      // Record in history
      const prevPred = this.lastPredictions;
      const prevCombinedResult = prevPred.combined.dozens.length > 0 
        ? `${prevPred.combined.label} (${prevPred.combined.patternType})`
        : 'wait';
      const prevS1Result = prevPred.system1.dozens.length > 0 
        ? `${prevPred.system1.label} (${prevPred.system1.patternType})`
        : 'wait';
      const prevS2Result = prevPred.system2.dozens.length > 0 
        ? `${prevPred.system2.label} (${prevPred.system2.patternType})`
        : 'wait';
      const prevS3Result = prevPred.system3.dozens.length > 0 
        ? `${prevPred.system3.label} (${prevPred.system3.patternType})`
        : 'wait';
      
      const isWait = prevCombinedResult === 'wait';
      const explanation = isWait
        ? `${number} = wait`
        : combinedCorrect
          ? `${number} = ${prevCombinedResult} YES বাড়ানো হয়েছে।`
          : `${number} = ${prevCombinedResult} NO কমানো হয়েছে।`;

      this.history.push({
        uniqueId: this.uniqueCounter++,
        result: prevCombinedResult,
        triggerNumber: number,
        totalNumber: this.scores.combined,
        isWin: combinedCorrect && !isWait,
        explanation,
        system1Result: prevS1Result,
        system2Result: prevS2Result,
        system3Result: prevS3Result,
        combinedResult: prevCombinedResult,
        patternType: prevPred.patternType,
      });
    }

    // Add the new spin
    this.spins.push(spin);

    // Generate new prediction
    const prediction = this.generatePrediction();

    // Store for next verification
    this.lastPredictions = prediction;

    return { prediction, previousResult };
  }

  private updateStats(system: keyof typeof this.stats, correct: boolean): void {
    const s = this.stats[system];
    s.total++;
    if (correct) {
      s.correct++;
      s.streak = Math.max(0, s.streak) + 1;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    } else {
      s.streak = Math.min(0, s.streak) - 1;
    }
  }

  // ============================================================
  // MAIN PREDICTION GENERATOR v3.0
  // ============================================================
  private generatePrediction(): SystemPrediction {
    const defaultPrediction: Prediction = {
      dozens: [],
      label: 'Wait',
      patternType: 'wait',
      confidence: 0,
    };

    if (this.spins.length < 3) {
      return {
        system1: { ...defaultPrediction, label: 'Need more spins' },
        system2: { ...defaultPrediction, label: 'Need more spins' },
        system3: { ...defaultPrediction, label: 'Need more spins' },
        combined: { ...defaultPrediction, label: 'Need more spins' },
        patternKey: '',
        patternType: 'wait',
      };
    }

    const recentSpins = this.spins.slice(-8);
    const dozens = recentSpins.map(s => s.dozen);
    const nonZeroDozens = dozens.filter(d => d !== 0);
    
    if (nonZeroDozens.length < 2) {
      return {
        system1: { ...defaultPrediction },
        system2: { ...defaultPrediction },
        system3: { ...defaultPrediction },
        combined: { ...defaultPrediction },
        patternKey: '',
        patternType: 'wait',
      };
    }

    // Get pattern keys at different depths
    const last2 = nonZeroDozens.slice(-2).reverse();
    const last3 = nonZeroDozens.slice(-3).reverse();
    const last4 = nonZeroDozens.slice(-4).reverse();
    const last5 = nonZeroDozens.slice(-5).reverse();

    const patternKey2 = last2.join('-');
    const patternKey3 = last3.join('-');
    const patternKey4 = last4.join('-');
    const patternKey5 = last5.join('-');

    let system1Pred: Prediction;
    let system2Pred: Prediction;
    let system3Pred: Prediction;
    let patternType: PatternType = 'wait';

    // Priority: Deep4 > BEEM > Two/Same dozen
    // Check deep 4-spin patterns first (stronger signal)
    const deep4Result = this.checkDeep4Pattern(last4, patternKey4);
    if (deep4Result) {
      system1Pred = deep4Result.system1;
      system2Pred = deep4Result.system2;
      system3Pred = deep4Result.system3;
      patternType = deep4Result.patternType;
    } else if (last3.length === 3) {
      const uniqueDozens = new Set(last3);
      if (uniqueDozens.size === 3) {
        // BEEM pattern
        patternType = 'beem';
        const s1Dozens = BEEM_SYSTEM1[patternKey3] || [];
        const s2Dozens = BEEM_SYSTEM2[patternKey3] || [];
        const s3Dozens = BEEM_SYSTEM3[patternKey3] || [];

        system1Pred = {
          dozens: s1Dozens,
          label: formatPrediction(s1Dozens),
          patternType: 'beem',
          confidence: 0.85,
        };
        system2Pred = {
          dozens: s2Dozens,
          label: formatPrediction(s2Dozens),
          patternType: 'beem',
          confidence: 0.85,
        };
        system3Pred = {
          dozens: s3Dozens,
          label: formatPrediction(s3Dozens),
          patternType: 'beem',
          confidence: 0.85,
        };
      } else {
        const result = this.checkTwoOrSameDozenPatterns(last2, patternKey2);
        system1Pred = result.system1;
        system2Pred = result.system2;
        system3Pred = result.system3;
        patternType = result.patternType;
      }
    } else {
      const result = this.checkTwoOrSameDozenPatterns(last2, patternKey2);
      system1Pred = result.system1;
      system2Pred = result.system2;
      system3Pred = result.system3;
      patternType = result.patternType;
    }

    // Apply AI-learned overrides if available
    system1Pred = this.applyAILearning(system1Pred, patternKey3 || patternKey2);
    system2Pred = this.applyAILearning(system2Pred, patternKey3 || patternKey2);
    system3Pred = this.applyAILearning(system3Pred, patternKey3 || patternKey2);

    // Generate AI-combined prediction with all enhancements
    const combined = this.generateCombinedPrediction(
      system1Pred, system2Pred, system3Pred, 
      patternKey3 || patternKey2, patternKey4, patternKey5
    );

    return {
      system1: system1Pred,
      system2: system2Pred,
      system3: system3Pred,
      combined,
      patternKey: patternKey3 || patternKey2,
      patternType,
    };
  }

  // NEW: Check deep 4-spin patterns
  private checkDeep4Pattern(
    last4: number[], 
    patternKey4: string
  ): { system1: Prediction; system2: Prediction; system3: Prediction; patternType: PatternType } | null {
    if (last4.length < 4) return null;
    
    const deep4Dozens = DEEP4_SYSTEM[patternKey4];
    if (!deep4Dozens) return null;

    // Deep4 pattern found - generate predictions for all 3 systems
    // Each system slightly varies the prediction
    const d = deep4Dozens;
    const otherDozen = [1, 2, 3].find(x => !d.includes(x)) || 1;
    
    return {
      system1: {
        dozens: d,
        label: formatPrediction(d),
        patternType: 'ai-learned',
        confidence: 0.88,
      },
      system2: {
        dozens: [d[0], otherDozen].sort(),
        label: formatPrediction([d[0], otherDozen].sort()),
        patternType: 'ai-learned',
        confidence: 0.82,
      },
      system3: {
        dozens: [d[1], otherDozen].sort(),
        label: formatPrediction([d[1], otherDozen].sort()),
        patternType: 'ai-learned',
        confidence: 0.82,
      },
      patternType: 'ai-learned',
    };
  }

  // NEW: Apply AI learning overrides to individual system predictions
  private applyAILearning(pred: Prediction, patternKey: string): Prediction {
    if (pred.dozens.length === 0) return pred;
    
    // Check if AI has a better prediction for this pattern
    const bestAI = this.learner.getBestPredictionForPattern(patternKey);
    if (bestAI && bestAI.length === 2) {
      const aiWeight = this.learner.getPatternWeight(patternKey, bestAI);
      const origWeight = this.learner.getPatternWeight(patternKey, pred.dozens);
      
      // If AI's best prediction is significantly better, use it
      if (aiWeight > origWeight * 1.3) {
        return {
          dozens: bestAI,
          label: formatPrediction(bestAI),
          patternType: 'ai-learned',
          confidence: Math.min(pred.confidence * 1.1, 0.95),
        };
      }
    }
    
    return pred;
  }

  private checkTwoOrSameDozenPatterns(
    last2: number[], 
    patternKey2: string
  ): { system1: Prediction; system2: Prediction; system3: Prediction; patternType: PatternType } {
    const defaultPred: Prediction = {
      dozens: [],
      label: 'Wait',
      patternType: 'wait',
      confidence: 0,
    };

    if (last2.length < 2) {
      return { system1: defaultPred, system2: defaultPred, system3: defaultPred, patternType: 'wait' };
    }

    const [newest, second] = last2;

    if (newest === second) {
      // SAME DOZEN pattern
      const sameKey = `${newest}-${second}`;
      const s1Dozens = SAME_DOZEN_SYSTEM1[sameKey] || [];
      const s2Dozens = SAME_DOZEN_SYSTEM2[sameKey] || [];
      const s3Dozens = SAME_DOZEN_SYSTEM3[sameKey] || [];

      const patternTypes: Record<string, PatternType> = {
        '1-1': 'n', '2-2': 'o', '3-3': 'q',
      };

      return {
        system1: {
          dozens: s1Dozens,
          label: formatPrediction(s1Dozens),
          patternType: patternTypes[sameKey] || 'wait',
          confidence: 0.70,
        },
        system2: {
          dozens: s2Dozens,
          label: formatPrediction(s2Dozens),
          patternType: patternTypes[sameKey] || 'wait',
          confidence: 0.70,
        },
        system3: {
          dozens: s3Dozens,
          label: formatPrediction(s3Dozens),
          patternType: patternTypes[sameKey] || 'wait',
          confidence: 0.70,
        },
        patternType: patternTypes[sameKey] || 'wait',
      };
    }

    // TWO DIFFERENT DOZENS pattern
    const diffKey = `${newest}-${second}`;
    const s1Dozens = TWO_DOZEN_SYSTEM1[diffKey] || [];
    const s2Dozens = TWO_DOZEN_SYSTEM2[diffKey] || [];
    const s3Dozens = TWO_DOZEN_SYSTEM3[diffKey] || [];

    const patternTypes: Record<string, PatternType> = {
      '1-2': 'new', '2-3': 'i', '1-3': 'j',
      '3-2': 'k', '3-1': 'll', '2-1': 'm',
    };

    if (s1Dozens.length === 0) {
      return { system1: defaultPred, system2: defaultPred, system3: defaultPred, patternType: 'wait' };
    }

    return {
      system1: {
        dozens: s1Dozens,
        label: formatPrediction(s1Dozens),
        patternType: patternTypes[diffKey] || 'wait',
        confidence: 0.75,
      },
      system2: {
        dozens: s2Dozens,
        label: formatPrediction(s2Dozens),
        patternType: patternTypes[diffKey] || 'wait',
        confidence: 0.75,
      },
      system3: {
        dozens: s3Dozens,
        label: formatPrediction(s3Dozens),
        patternType: patternTypes[diffKey] || 'wait',
        confidence: 0.75,
      },
      patternType: patternTypes[diffKey] || 'wait',
    };
  }

  // ============================================================
  // AI-POWERED COMBINATION v3.0
  // Enhanced with: Anti-Streak, Gap Analysis, Recovery Mode,
  // Consensus Scoring, Dynamic System Switching
  // ============================================================
  private generateCombinedPrediction(
    s1: Prediction, s2: Prediction, s3: Prediction, 
    patternKey: string, patternKey4: string, patternKey5: string
  ): Prediction {
    // Step 0: Check for SAME-DOZEN STREAK (3+ same dozens in a row)
    const sameDozenStreak = this.detectSameDozenStreak();
    if (sameDozenStreak.streakDozen > 0 && sameDozenStreak.length >= 3) {
      // Include the streaking dozen AND the coldest dozen (likely to break)
      const coldest = this.gapAnalyzer.getColdestDozen(this.spins);
      const streakD = sameDozenStreak.streakDozen;
      if (coldest !== streakD) {
        return {
          dozens: [streakD, coldest].sort(),
          label: formatPrediction([streakD, coldest].sort()),
          patternType: 'hot-streak',
          confidence: Math.min(0.85 + sameDozenStreak.length * 0.02, 0.95),
        };
      }
    }
    
    // Step 1: Check for RECOVERY MODE (anti-streak protection)
    // Now activates after just 2 consecutive misses (was 3 before)
    const consecutiveMisses = this.learner.getConsecutiveMisses();
    
    if (consecutiveMisses >= 2) {
      // RECOVERY MODE: After 2+ consecutive misses, use aggressive strategy
      const recoveryPred = this.recoveryModePrediction(consecutiveMisses);
      if (recoveryPred) return recoveryPred;
    }

    // Step 2: Count votes for each dozen pair with enhanced weighting
    const voteMap: Record<string, { score: number; sources: string[] }> = {};
    
    const addVote = (dozens: number[], weight: number, source: string) => {
      if (dozens.length < 2) return;
      const key = [...dozens].sort().join(',');
      if (!voteMap[key]) {
        voteMap[key] = { score: 0, sources: [] };
      }
      voteMap[key].score += weight;
      if (!voteMap[key].sources.includes(source)) {
        voteMap[key].sources.push(source);
      }
    };

    // System weights - much more dynamic now
    const s1Weight = this.getSystemWeight('system1');
    const s2Weight = this.getSystemWeight('system2');
    const s3Weight = this.getSystemWeight('system3');

    addVote(s1.dozens, s1Weight * s1.confidence * 2.0, 'sys1');
    addVote(s2.dozens, s2Weight * s2.confidence * 2.0, 'sys2');
    addVote(s3.dozens, s3Weight * s3.confidence * 2.0, 'sys3');

    // Step 3: Markov chain prediction (now with 2nd order)
    const markovPred = this.learner.getMarkovPrediction(patternKey);
    if (markovPred) {
      addVote(markovPred.dozens, markovPred.confidence * 1.5, 'markov'); // Higher weight now
    }
    
    // Also try Markov with 4-deep key
    if (patternKey4 && this.spins.length >= 6) {
      const markovPred4 = this.learner.getMarkovPrediction(patternKey4);
      if (markovPred4 && markovPred4.confidence > 0.6) {
        addVote(markovPred4.dozens, markovPred4.confidence * 1.2, 'markov4');
      }
    }

    // Step 4: Gap analysis - overdue dozens
    const dueScores = this.gapAnalyzer.getDueScore(this.spins);
    for (const [key, data] of Object.entries(voteMap)) {
      const dozens = key.split(',').map(Number);
      const dueBonus = dozens.reduce((sum, d) => sum + (dueScores[d] || 0), 0);
      voteMap[key].score += dueBonus * 0.8; // Stronger gap bonus
    }
    
    // Step 5: Overdue dozen override
    const overdue = this.gapAnalyzer.getOverdueDozens(this.spins);
    if (overdue.length === 1) {
      // Only one dozen is very overdue - it's likely to appear
      const overdueD = overdue[0];
      // Find or create a pair that includes this dozen
      for (const d of [1, 2, 3] as const) {
        if (d !== overdueD) {
          const pair = [overdueD, d].sort();
          const key = pair.join(',');
          if (!voteMap[key]) {
            voteMap[key] = { score: 0, sources: [] };
          }
          voteMap[key].score += 1.0; // Boost pairs including overdue dozen
          voteMap[key].sources.push('overdue');
        }
      }
    }

    // Step 6: Streak detection
    const streak = this.learner.detectStreak();
    if (streak.type === 'hot' && streak.hotDozen) {
      // Hot dozen - boost predictions that include it
      for (const [key, data] of Object.entries(voteMap)) {
        const dozens = key.split(',').map(Number);
        if (dozens.includes(streak.hotDozen)) {
          voteMap[key].score += 0.5;
        }
      }
    } else if (streak.type === 'cold') {
      // Cold pattern - reduce confidence, prefer gap analysis
      for (const [key, data] of Object.entries(voteMap)) {
        voteMap[key].score *= 0.85; // Reduce all scores slightly
      }
    }

    // Step 7: Recurring miss dozen detection
    const recurringMiss = this.learner.getRecurringMissDozen();
    if (recurringMiss) {
      // The same dozen keeps appearing when we miss - include it!
      for (const d of [1, 2, 3] as const) {
        if (d !== recurringMiss) {
          const pair = [recurringMiss, d].sort();
          const key = pair.join(',');
          if (!voteMap[key]) {
            voteMap[key] = { score: 0, sources: [] };
          }
          voteMap[key].score += 1.5; // Strong boost for including recurring miss dozen
          voteMap[key].sources.push('recurring-miss');
        }
      }
    }

    // Step 8: Recent actual dozen frequency
    if (this.recentActualDozens.length >= 10) {
      const last10 = this.recentActualDozens.slice(-10);
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      for (const d of last10) counts[d]++;
      
      // Boost pairs that include frequently appearing dozens
      for (const [key, data] of Object.entries(voteMap)) {
        const dozens = key.split(',').map(Number);
        const freqScore = dozens.reduce((sum, d) => sum + counts[d], 0);
        voteMap[key].score += freqScore * 0.15;
      }
    }

    // Step 9: Anti-consecutive-miss adjustment
    if (consecutiveMisses >= 2) {
      // After 2+ misses, slightly shift predictions toward the missing dozen
      const lastMissedDozens: number[] = [];
      const lastResults = this.recentCombinedResults.slice(-3);
      for (let i = this.history.length - 1; i >= 0 && lastMissedDozens.length < 3; i--) {
        if (!this.history[i].isWin && this.history[i].result !== 'wait') {
          // Find which dozen appeared that we didn't predict
          const triggerD = getDozen(this.history[i].triggerNumber);
          if (triggerD > 0) lastMissedDozens.push(triggerD);
        }
      }
      
      if (lastMissedDozens.length > 0) {
        // Boost predictions that include recently missed dozens
        for (const [key, data] of Object.entries(voteMap)) {
          const dozens = key.split(',').map(Number);
          const overlap = dozens.filter(d => lastMissedDozens.includes(d)).length;
          if (overlap > 0) {
            voteMap[key].score += overlap * 0.6;
          }
        }
      }
    }

    // Step 10: Select best prediction using CONSENSUS
    const sortedVotes = Object.entries(voteMap)
      .sort(([, a], [, b]) => b.score - a.score);

    if (sortedVotes.length === 0) {
      return { dozens: [], label: 'Wait', patternType: 'wait', confidence: 0 };
    }

    const [bestKey, bestData] = sortedVotes[0];
    const bestDozens = bestKey.split(',').map(Number);
    
    // Consensus bonus: if multiple sources agree, boost confidence
    const consensusCount = bestData.sources.length;
    const consensusBonus = Math.min(consensusCount * 0.05, 0.2);
    
    // Calculate confidence
    const totalScore = sortedVotes.reduce((sum, [, d]) => sum + d.score, 0);
    const baseConfidence = totalScore > 0 ? Math.min(bestData.score / totalScore, 0.98) : 0;
    const confidence = Math.min(baseConfidence + consensusBonus, 0.98);

    // Determine if AI improved the prediction
    const isAILearned = bestData.sources.includes('markov') || 
                        bestData.sources.includes('markov4') ||
                        bestData.sources.includes('recurring-miss') ||
                        bestData.sources.includes('overdue');

    return {
      dozens: bestDozens,
      label: formatPrediction(bestDozens),
      patternType: isAILearned ? 'ai-learned' : s1.patternType,
      confidence,
    };
  }

  // ============================================================
  // RECOVERY MODE - Activated after 3+ consecutive misses
  // Uses completely different strategies to break losing streaks
  // ============================================================
  private recoveryModePrediction(consecutiveMisses: number): Prediction | null {
    const recentDozens = this.recentActualDozens;
    if (recentDozens.length < 5) return null;

    // Strategy 1: Include the most recent dozen (it might repeat or be part of a trend)
    const lastDozen = recentDozens[recentDozens.length - 1];
    if (lastDozen <= 0) return null;
    
    // Strategy 2: Include the coldest dozen (gap analysis - it's due)
    const coldestDozen = this.gapAnalyzer.getColdestDozen(this.spins);
    
    // Strategy 3: Check what dozen keeps appearing in misses
    const recurringMiss = this.learner.getRecurringMissDozen();
    
    // Combine strategies based on severity
    let predDozens: number[];
    let recoveryType: string;
    
    if (consecutiveMisses >= 5) {
      // CRITICAL: After 5+ misses, use aggressive gap + recurring strategy
      if (recurringMiss && recurringMiss !== coldestDozen) {
        // Include both the recurring miss dozen AND the coldest dozen
        const thirdDozen = [1, 2, 3].find(d => d !== recurringMiss && d !== coldestDozen) || lastDozen;
        predDozens = [recurringMiss, coldestDozen].sort();
        recoveryType = 'critical-recovery';
      } else {
        predDozens = [coldestDozen, lastDozen].sort();
        recoveryType = 'critical-gap';
      }
    } else if (consecutiveMisses >= 3) {
      // After 3+ misses, include the coldest dozen and last dozen
      if (coldestDozen !== lastDozen) {
        predDozens = [coldestDozen, lastDozen].sort();
        recoveryType = 'gap-last';
      } else {
        // If coldest = last, include last + second coldest
        const gaps = this.gapAnalyzer.calculateGaps(this.spins);
        const otherDozens = [1, 2, 3].filter(d => d !== lastDozen)
          .sort((a, b) => gaps[b] - gaps[a]);
        predDozens = [lastDozen, otherDozens[0]].sort();
        recoveryType = 'gap-secondary';
      }
      
      // If recurring miss is different from our current pick, consider it
      if (recurringMiss && !predDozens.includes(recurringMiss)) {
        // Replace the weaker dozen with the recurring miss dozen
        predDozens = [recurringMiss, predDozens[0]].sort();
        recoveryType = 'recurring-override';
      }
    } else {
      return null; // Not in recovery mode
    }
    
    // Ensure we have exactly 2 unique dozens
    predDozens = [...new Set(predDozens)].slice(0, 2);
    if (predDozens.length < 2) {
      const other = [1, 2, 3].find(d => !predDozens.includes(d));
      if (other) predDozens.push(other);
      predDozens.sort();
    }

    return {
      dozens: predDozens,
      label: formatPrediction(predDozens),
      patternType: 'ai-learned',
      confidence: 0.80 + Math.min(consecutiveMisses * 0.02, 0.15),
    };
  }

  // NEW: Detect same-dozen streak in recent spins
  private detectSameDozenStreak(): { streakDozen: number; length: number } {
    if (this.recentActualDozens.length < 3) return { streakDozen: 0, length: 0 };
    
    const last = this.recentActualDozens;
    const lastDozen = last[last.length - 1];
    if (lastDozen <= 0) return { streakDozen: 0, length: 0 };
    
    let streakLength = 1;
    for (let i = last.length - 2; i >= 0; i--) {
      if (last[i] === lastDozen) {
        streakLength++;
      } else {
        break;
      }
    }
    
    return { streakDozen: lastDozen, length: streakLength };
  }

  // Calculate system weight - more dynamic and responsive
  private getSystemWeight(system: 'system1' | 'system2' | 'system3'): number {
    const s = this.stats[system];
    if (s.total < 5) return 1.0;
    
    const winRate = s.correct / s.total;
    
    // Also factor in recent performance (last 10 results)
    const recentWinRate = this.getRecentSystemWinRate(system);
    
    // Combined weight: 70% recent + 30% overall
    const combinedRate = recentWinRate >= 0 
      ? (recentWinRate * 0.7 + winRate * 0.3)
      : winRate;
    
    // Weight ranges from 0.3 to 3.0 (much wider range now)
    return Math.max(0.3, Math.min(3.0, combinedRate * 2.5));
  }
  
  // NEW: Get recent win rate for a specific system
  private getRecentSystemWinRate(system: 'system1' | 'system2' | 'system3'): number {
    // Check recent history entries
    const recentHistory = this.history.slice(-10);
    if (recentHistory.length === 0) return -1;
    
    let correct = 0;
    let total = 0;
    
    for (const entry of recentHistory) {
      const sysResult = system === 'system1' ? entry.system1Result 
        : system === 'system2' ? entry.system2Result 
        : entry.system3Result;
      
      if (sysResult !== 'wait') {
        total++;
        // Check if the trigger number's dozen was in the prediction
        const triggerDozen = getDozen(entry.triggerNumber);
        const predictedDozens = this.extractDozensFromResult(sysResult);
        if (predictedDozens.includes(triggerDozen)) {
          correct++;
        }
      }
    }
    
    return total > 0 ? correct / total : -1;
  }
  
  private extractDozensFromResult(result: string): number[] {
    // Parse result like "1st & 2nd (n)" to extract dozen numbers
    const dozens: number[] = [];
    if (result.includes('1st')) dozens.push(1);
    if (result.includes('2nd')) dozens.push(2);
    if (result.includes('3rd')) dozens.push(3);
    return dozens;
  }

  // Undo last spin
  undoLastSpin(): boolean {
    if (this.spins.length === 0) return false;
    this.spins.pop();
    if (this.recentActualDozens.length > 0) this.recentActualDozens.pop();
    if (this.recentCombinedResults.length > 0) this.recentCombinedResults.pop();
    this.lastPredictions = null;
    if (this.history.length > 0) {
      this.history.pop();
      this.uniqueCounter = Math.max(1, this.uniqueCounter - 1);
    }
    return true;
  }

  clear(): void {
    this.spins = [];
    this.history = [];
    this.uniqueCounter = 1;
    this.lastPredictions = null;
    this.recentCombinedResults = [];
    this.recentActualDozens = [];
    this.scores = { system1: 0, system2: 0, system3: 0, combined: 0 };
    this.stats = {
      system1: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
      system2: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
      system3: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
      combined: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    };
    this.learner = new PatternLearner();
  }

  getDozenDistribution(): Record<number, number> {
    const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const spin of this.spins) {
      dist[spin.dozen] = (dist[spin.dozen] || 0) + 1;
    }
    return dist;
  }

  getRecentWinRate(lastN: number = 20): number {
    if (this.stats.combined.total < 5) return 0;
    return this.stats.combined.correct / this.stats.combined.total;
  }

  serialize(): string {
    return JSON.stringify({
      spins: this.spins,
      scores: this.scores,
      stats: this.stats,
      learner: this.learner.serialize(),
      recentCombinedResults: this.recentCombinedResults,
      recentActualDozens: this.recentActualDozens,
    });
  }

  static deserialize(data: string): RouletteEngine {
    const engine = new RouletteEngine();
    try {
      const parsed = JSON.parse(data);
      if (parsed.spins) engine.spins = parsed.spins;
      if (parsed.scores) engine.scores = parsed.scores;
      if (parsed.stats) engine.stats = parsed.stats;
      if (parsed.learner) engine.learner = PatternLearner.deserialize(parsed.learner);
      if (parsed.recentCombinedResults) engine.recentCombinedResults = parsed.recentCombinedResults;
      if (parsed.recentActualDozens) engine.recentActualDozens = parsed.recentActualDozens;
    } catch {
      // Return empty engine on parse error
    }
    return engine;
  }
}

// Singleton engine instance (server-side only)
let engineInstance: RouletteEngine | null = null;

export function getEngine(): RouletteEngine {
  if (!engineInstance) {
    engineInstance = new RouletteEngine();
  }
  return engineInstance;
}

export function resetEngine(): void {
  engineInstance = new RouletteEngine();
}

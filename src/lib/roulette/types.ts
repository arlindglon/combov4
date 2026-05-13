// Roulette Prediction Engine - Types

export type Dozen = 0 | 1 | 2 | 3; // 0=zero, 1=1st(1-12), 2=2nd(13-24), 3=3rd(25-36)

export type PatternType = 
  | 'beem' | 'new' | 'i' | 'j' | 'k' | 'll' | 'm' 
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' 
  | 'wait' | 'hot-streak' | 'cold-streak' | 'ai-learned'
  | 'gap-last' | 'gap-secondary' | 'recurring-override' | 'critical-recovery' | 'critical-gap';

export interface Prediction {
  dozens: number[]; // which dozens to bet on (e.g., [1, 2])
  label: string; // e.g., "1st and 2nd"
  patternType: PatternType;
  confidence: number; // 0-1
}

export interface SystemPrediction {
  system1: Prediction;
  system2: Prediction;
  system3: Prediction;
  combined: Prediction;
  patternKey: string;
  patternType: PatternType;
}

export interface SpinRecord {
  number: number;
  dozen: Dozen;
  timestamp: number;
}

export interface SessionStats {
  totalSpins: number;
  system1Stats: SystemStatDetail;
  system2Stats: SystemStatDetail;
  system3Stats: SystemStatDetail;
  combinedStats: SystemStatDetail;
  dozenDistribution: Record<number, number>;
  recentAccuracy: number;
}

export interface SystemStatDetail {
  totalPredictions: number;
  correctPredictions: number;
  winRate: number;
  totalScore: number;
  currentStreak: number;
  bestStreak: number;
}

export interface PatternMemoryEntry {
  patternKey: string;
  predictedDozens: number[];
  hitCount: number;
  missCount: number;
  weight: number;
  lastSeen: number;
}

export interface MarkovNode {
  transitions: Record<string, number>; // next state -> count
  totalTransitions: number;
}

export const DOZEN_RANGES = {
  0: [0, 0],
  1: [1, 12],
  2: [13, 24],
  3: [25, 36],
} as const;

export const DOZEN_LABELS: Record<number, string> = {
  0: 'Zero',
  1: '1st Dozen (1-12)',
  2: '2nd Dozen (13-24)',
  3: '3rd Dozen (25-36)',
};

export const DOZEN_COLORS: Record<number, string> = {
  0: 'bg-gray-500',
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-rose-500',
};

export const DOZEN_BG_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-800',
  1: 'bg-emerald-100 text-emerald-800',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-rose-100 text-rose-800',
};

// Red numbers on roulette wheel
export const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
export const BLACK_NUMBERS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

export function getDozen(num: number): Dozen {
  if (num === 0) return 0;
  if (num >= 1 && num <= 12) return 1;
  if (num >= 13 && num <= 24) return 2;
  if (num >= 25 && num <= 36) return 3;
  return 0;
}

export function isRed(num: number): boolean {
  return RED_NUMBERS.includes(num);
}

export function isBlack(num: number): boolean {
  return BLACK_NUMBERS.includes(num);
}

export function getDozenLabel(dozen: number): string {
  return DOZEN_LABELS[dozen] || 'Unknown';
}

export function formatPrediction(dozens: number[]): string {
  const labels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
  return dozens.map(d => labels[d]).join(' & ');
}

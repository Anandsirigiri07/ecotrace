export type ActivityCategory = 'transport' | 'food' | 'energy' | 'shopping';

export interface UserProfile {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  country: string;
  dietPreference: string;
  joinedAt: unknown; // Firestore Timestamp
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null; // YYYY-MM-DD
}

export interface CarbonActivity {
  id?: string;
  category: ActivityCategory;
  activityType: string;
  quantity: number;
  unit: string;
  co2Kg: number;
  date: string; // YYYY-MM-DD
  createdAt: unknown; // Firestore Timestamp
  geminiTip: string;
  userId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface CarbonSummary {
  todayKg: number;
  weekKg: number;
  monthKg: number;
  streak: number;
}

export type Activity = CarbonActivity;

export interface EcoAction {
  day: number;
  action: string;
  category: ActivityCategory;
  savingKg: number;
  difficulty: 'easy' | 'medium' | 'hard';
  localContext: string;
}

export interface QuickWin {
  title: string;
  impact: string;
  howTo: string;
}

export interface MonthlyChallenge {
  title: string;
  description: string;
  targetReductionKg: number;
  reward: string;
}

export interface EcoPlan {
  ecoScore: number;
  scoreLabel: 'Carbon Hero' | 'On Track' | 'Needs Work' | 'Critical';
  weeklyTarget: number;
  topInsight: string;
  actions: EcoAction[];
  quickWins: QuickWin[];
  monthlyChallenge: MonthlyChallenge;
}

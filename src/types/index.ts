export type ActivityCategory = 'transport' | 'food' | 'energy' | 'shopping';

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  country: string;
  dietPreference: string;
  joinedAt: any; // Firestore Timestamp
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string; // YYYY-MM-DD
}

export interface CarbonActivity {
  id?: string;
  category: ActivityCategory;
  activityType: string;
  quantity: number;
  unit: string;
  co2Kg: number;
  date: string; // YYYY-MM-DD
  createdAt: any; // Firestore Timestamp
  geminiTip: string;
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

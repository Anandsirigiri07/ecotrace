/**
 * Safe Google Analytics 4 event tracking helpers.
 * All calls are wrapped in try-catch to prevent crashes
 * in ad-blocked or tracking-restricted browsers.
 */
import { logEvent } from 'firebase/analytics';
import { analytics } from '../services/firebase';

const safeLog = (eventName: string, params?: object) => {
  if (!analytics) return; // silently skip if blocked
  try {
    logEvent(analytics, eventName, params);
  } catch (err) {
    console.warn('Analytics event failed:', eventName);
  }
};

export const trackEvent = {
  // Track every activity log with CO2 value
  activityLogged: (category: string, co2Kg: number) =>
    safeLog('activity_logged', { category, co2_kg: co2Kg }),
    
  // Track when user views AI insights
  insightViewed: (ecoScore: number) =>
    safeLog('insight_viewed', { eco_score: ecoScore }),
    
  // Track carbon saved actions committed
  actionCommitted: (title: string, savingKg: number) =>
    safeLog('action_committed', { 
      action: title, 
      potential_saving_kg: savingKg 
    }),
    
  // Track streaks achieved
  streakAchieved: (days: number) =>
    safeLog('streak_achieved', { days }),
    
  // Track EcoScore over time
  ecoScoreCalculated: (score: number, annualKg: number) =>
    safeLog('eco_score_calculated', {
      score,
      annual_kg: annualKg,
      label: score >= 80 ? 'hero' :
             score >= 60 ? 'on_track' :
             score >= 40 ? 'needs_work' : 'critical'
    }),

  // Track chat messages
  chatMessageSent: (hasContext: boolean) =>
    safeLog('chat_message_sent', { has_context: hasContext }),

  // Track heatmap views
  heatmapViewed: (weeksWithData: number) =>
    safeLog('heatmap_viewed', { weeks_with_data: weeksWithData })
};

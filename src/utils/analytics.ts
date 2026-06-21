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
  /**
   * Tracks when a user logs a carbon activity.
   * @param category - Activity category (transport/food/energy/shopping)
   * @param co2Kg - CO2 emitted in kilograms
   */
  activityLogged: (category: string, co2Kg: number): void =>
    safeLog('activity_logged', { category, co2_kg: co2Kg }),

  /**
   * Tracks when a user views their AI insights page.
   * @param ecoScore - User's current EcoScore (0-100)
   */
  insightViewed: (ecoScore: number): void =>
    safeLog('insight_viewed', { eco_score: ecoScore }),

  /**
   * Tracks when a user commits to a carbon-saving action.
   * @param title - Name of the action committed to
   * @param savingKg - Potential CO2 saving in kilograms
   */
  actionCommitted: (title: string, savingKg: number): void =>
    safeLog('action_committed', {
      action: title,
      potential_saving_kg: savingKg
    }),

  /**
   * Tracks when a user achieves a daily logging streak.
   * @param days - Number of consecutive days logged
   */
  streakAchieved: (days: number): void =>
    safeLog('streak_achieved', { days }),

  /**
   * Tracks EcoScore calculation events with categorization.
   * @param score - Calculated score (0-100)
   * @param annualKg - Projected annual CO2 in kilograms
   */
  ecoScoreCalculated: (score: number, annualKg: number): void =>
    safeLog('eco_score_calculated', {
      score,
      annual_kg: annualKg,
      label: score >= 80 ? 'hero' :
             score >= 60 ? 'on_track' :
             score >= 40 ? 'needs_work' : 'critical'
    }),

  /**
   * Tracks when a user sends a message in the AI chat.
   * @param hasContext - Whether user carbon context was included
   */
  chatMessageSent: (hasContext: boolean): void =>
    safeLog('chat_message_sent', { has_context: hasContext }),

  /**
   * Tracks when user views the 52-week carbon heatmap.
   * @param weeksWithData - Number of weeks that have logged data
   */
  heatmapViewed: (weeksWithData: number): void =>
    safeLog('heatmap_viewed', { weeks_with_data: weeksWithData })
};

import { trackEvent } from './analytics';
import { logEvent } from 'firebase/analytics';

// Define a mutable value for our getter mock
let mockAnalyticsInstance: unknown = {};

// Mock firebase/analytics
jest.mock('firebase/analytics', () => ({
  logEvent: jest.fn()
}));

// Mock ../firebase with a dynamic getter for analytics
jest.mock('../firebase', () => ({
  get analytics() {
    return mockAnalyticsInstance;
  }
}));

describe('analytics tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsInstance = {}; // Reset to default mock instance
  });

  it('tracks activityLogged', () => {
    trackEvent.activityLogged('transport', 2.5);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'activity_logged',
      { category: 'transport', co2_kg: 2.5 }
    );
  });

  it('silently skips if analytics is not configured/blocked', () => {
    mockAnalyticsInstance = null; // Disable analytics
    trackEvent.activityLogged('transport', 2.5);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('handles logEvent failure gracefully', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Make logEvent throw an error
    (logEvent as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Analytics failed');
    });

    trackEvent.activityLogged('transport', 2.5);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Analytics event failed:',
      'activity_logged'
    );
    
    consoleWarnSpy.mockRestore();
  });

  it('tracks insightViewed', () => {
    trackEvent.insightViewed(85);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'insight_viewed',
      { eco_score: 85 }
    );
  });

  it('tracks actionCommitted', () => {
    trackEvent.actionCommitted('Take metro', 1.2);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'action_committed',
      { action: 'Take metro', potential_saving_kg: 1.2 }
    );
  });

  it('tracks streakAchieved', () => {
    trackEvent.streakAchieved(5);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'streak_achieved',
      { days: 5 }
    );
  });

  it('tracks ecoScoreCalculated', () => {
    trackEvent.ecoScoreCalculated(82, 1200);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'eco_score_calculated',
      { score: 82, annual_kg: 1200, label: 'hero' }
    );

    trackEvent.ecoScoreCalculated(65, 1200);
    expect(logEvent).toHaveBeenLastCalledWith(
      {},
      'eco_score_calculated',
      { score: 65, annual_kg: 1200, label: 'on_track' }
    );

    trackEvent.ecoScoreCalculated(45, 1200);
    expect(logEvent).toHaveBeenLastCalledWith(
      {},
      'eco_score_calculated',
      { score: 45, annual_kg: 1200, label: 'needs_work' }
    );

    trackEvent.ecoScoreCalculated(20, 1200);
    expect(logEvent).toHaveBeenLastCalledWith(
      {},
      'eco_score_calculated',
      { score: 20, annual_kg: 1200, label: 'critical' }
    );
  });

  it('tracks chatMessageSent', () => {
    trackEvent.chatMessageSent(true);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'chat_message_sent',
      { has_context: true }
    );
  });

  it('tracks heatmapViewed', () => {
    trackEvent.heatmapViewed(4);
    expect(logEvent).toHaveBeenCalledWith(
      {},
      'heatmap_viewed',
      { weeks_with_data: 4 }
    );
  });
});

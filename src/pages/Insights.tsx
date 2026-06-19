import React, { useState, useMemo, useEffect } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCarbon } from '../hooks/useCarbon';
import { useGemini } from '../hooks/useGemini';
import { useLiveData } from '../context/LiveDataContext';
import { trackEvent } from '../utils/analytics';
import InsightChat from '../components/InsightChat';
import { ChatMessage } from '../types';

export function Insights() {
  const { user, profile } = useAuth();
  const { activities } = useCarbon(user ? user.uid : null);
  const liveData = useLiveData();
  
  const { 
    plan, 
    generatePlan, 
    streamChat, 
    loading: aiLoading, 
    error: aiError, 
    isStreaming 
  } = useGemini();

  // Chat message states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');

  // 1. Calculate weekly total CO2 for preloading context
  const weeklyTotal = useMemo(() => {
    const getPast7DateStrings = () => {
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
      return dates;
    };
    const last7Days = getPast7DateStrings();
    return activities
      .filter(act => last7Days.includes(act.date))
      .reduce((sum, act) => sum + act.co2Kg, 0);
  }, [activities]);

  // Generate the plan on load
  useEffect(() => {
    if (user && profile) {
      generatePlan(user.uid, activities, liveData, profile);
      trackEvent.insightViewed(plan?.ecoScore || 0);
    }
  }, [user, profile, activities, liveData]);

  // Pre-loaded chips questions
  const suggestionChips = [
    "How can I reduce my footprint this week?",
    "What's my biggest source of emissions?",
    "Give me a 7-day green challenge"
  ];

  // Send message handler
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isStreaming) return;

    // Create user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputVal('');

    // Create placeholder for AI streaming response
    const aiPlaceholderId = Math.random().toString(36).substring(7);
    const aiMsgPlaceholder: ChatMessage = {
      id: aiPlaceholderId,
      role: 'model',
      content: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsgPlaceholder]);
    trackEvent.chatMessageSent(true);

    try {
      let accumulatedText = '';
      
      // Call streaming function
      await streamChat(
        textToSend,
        updatedMessages,
        { activities, liveData },
        (chunk) => {
          accumulatedText += chunk;
          setMessages(prev => 
            prev.map(m => m.id === aiPlaceholderId ? { ...m, content: accumulatedText } : m)
          );
        }
      );
    } catch (err) {
      console.error('Error generating AI response:', err);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputVal);
  };

  // Render plan section
  const renderPlanSection = () => {
    if (aiLoading && !plan) {
      return (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 flex flex-col space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-gray-250 rounded"></div>
          <div className="h-4 w-full bg-gray-250 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-250 rounded-2xl"></div>
            ))}
          </div>
        </div>
      );
    }

    if (!plan) return null;

    return (
      <div className="flex flex-col space-y-6">
        {/* Main Eco Plan Overview */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-extrabold text-primary text-sm md:text-base uppercase tracking-wider">
              7-Day Action Plan 🗓️
            </h3>
            <span className="text-[10px] md:text-xs font-bold text-secondary bg-mintBg px-3 py-1 rounded-full border border-secondary/10">
              Target: -{plan.weeklyTarget || 30} kg CO₂
            </span>
          </div>
          
          <p className="text-xs text-textPrimary font-semibold leading-relaxed border-l-4 border-secondary pl-3 bg-mintBg/25 py-2.5 rounded-r-xl">
            💡 {plan.topInsight}
          </p>

          <div className="space-y-3">
            {plan.actions?.map((act: any, idx: number) => {
              const diffColor = act.difficulty === 'easy' ? 'text-green-600 bg-green-50' : 
                                act.difficulty === 'medium' ? 'text-yellow-600 bg-yellow-50' : 
                                'text-red-600 bg-red-50';
              return (
                <div 
                  key={idx} 
                  className="p-4 border border-gray-100 hover:border-secondary/30 bg-mintBg/10 hover:bg-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 cursor-pointer"
                  onClick={() => trackEvent.actionCommitted(act.action, act.savingKg)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">
                        Day {act.day}
                      </span>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">
                        {act.category}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${diffColor}`}>
                        {act.difficulty}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-textPrimary leading-snug">{act.action}</h4>
                    <p className="text-[10px] text-textSecondary font-semibold leading-tight">{act.localContext}</p>
                  </div>
                  
                  <div className="text-right sm:shrink-0 flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2">
                    <span className="text-xs md:text-sm font-extrabold text-secondary block">
                      -{act.savingKg.toFixed(1)} kg
                    </span>
                    <span className="text-[8px] font-bold text-textSecondary uppercase block">CO₂ Saved</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Wins */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-3">
          <h3 className="font-extrabold text-primary text-xs uppercase tracking-wider">
            Quick Wins ⚡
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plan.quickWins?.map((win: any, idx: number) => (
              <div key={idx} className="p-3 bg-amber-50/40 border border-amber-100 rounded-2xl flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="text-[11px] font-bold text-textPrimary leading-snug">{win.title}</h4>
                  <p className="text-[10px] text-textSecondary font-semibold leading-tight mt-1">{win.howTo}</p>
                </div>
                <span className="text-[9px] font-extrabold text-warningColor uppercase tracking-wide block mt-2">
                  {win.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Challenge */}
        {plan.monthlyChallenge && (
          <div className="bg-gradient-to-r from-[#40916C]/10 to-teal-50 border border-[#40916C]/15 rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h4 className="text-xs font-bold text-[#2d6a4f] uppercase tracking-wider">Monthly Challenge</h4>
              </div>
              <h5 className="text-sm font-extrabold text-[#1b4332]">{plan.monthlyChallenge.title}</h5>
              <p className="text-[11px] text-textSecondary font-semibold leading-relaxed">
                {plan.monthlyChallenge.description}
              </p>
            </div>
            
            <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-[#40916C]/20 pt-4 sm:pt-0 sm:pl-4 space-y-1 w-full sm:w-auto">
              <span className="text-xl font-extrabold text-primary block leading-none">
                -{plan.monthlyChallenge.targetReductionKg} kg
              </span>
              <span className="text-[8px] font-bold text-textSecondary uppercase block">CO₂ reduction</span>
              <span className="inline-block text-[9px] font-bold text-[#2d6a4f] bg-white border border-[#40916C]/20 px-2 py-0.5 rounded-full mt-1.5">
                🏅 {plan.monthlyChallenge.reward}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col space-y-6" role="main">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
          AI Sustainable Workspace
        </h2>
        <p className="text-xs md:text-sm text-textSecondary font-medium">
          Get real-time advice powered by Google Gemini 1.5 Pro and sync your carbon score.
        </p>
      </div>

      {aiError && (
        <div 
          className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2 animate-bounce"
          role="alert"
        >
          <span className="font-semibold" aria-hidden="true">Notice:</span>
          <span>{aiError}</span>
        </div>
      )}

      {/* Responsive layout: double columns on md/lg, single column on small screens */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left 3 columns: Personalized Eco Plan */}
        <div className="lg:col-span-3 space-y-6">
          {renderPlanSection()}
        </div>

        {/* Right 2 columns: Chat Advisor */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="bg-white rounded-3xl shadow-md p-6 border border-gray-100 flex flex-col h-[500px]">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
              <div className="w-8 h-8 bg-mintBg text-secondary rounded-lg flex items-center justify-center font-bold shadow-inner">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-primary uppercase tracking-wide">
                  AI Carbon Advisor
                </h3>
                <span className="text-[8px] font-bold text-secondary uppercase bg-mintBg px-2 py-0.5 rounded-full">
                  Real-time Stream
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              <InsightChat messages={messages} loading={isStreaming} />
            </div>

            {/* Suggested Questions Chips */}
            {messages.length === 0 && (
              <div className="space-y-2.5 mb-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-textSecondary block">
                  Suggested Questions:
                </span>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested chat questions">
                  {suggestionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      disabled={isStreaming}
                      aria-label={`Ask: ${chip}`}
                      className="bg-white hover:bg-mintBg/40 border border-gray-150 text-textSecondary hover:text-secondary hover:border-secondary transition-all text-[10px] font-semibold px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input box form */}
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Type your question..."
                  aria-label="Enter chat message for Gemini carbon advisor"
                  className="w-full rounded-2xl border-2 border-gray-200 p-3 pr-12 text-xs focus:border-secondary transition-all outline-none font-semibold"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isStreaming}
                  aria-label="Send message"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary hover:bg-secondary/95 text-white p-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Insights;

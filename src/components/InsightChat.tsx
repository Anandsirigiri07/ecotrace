import { useEffect, useRef } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

interface InsightChatProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export function InsightChat({ messages, loading }: InsightChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Helper parser for basic markdown elements (*bold* or **bold**, lists, and newlines)
  const parseMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      
      // Render bullet list items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc mb-1.5 leading-relaxed">
            {renderBoldText(content)}
          </li>
        );
      }

      // Render standard paragraph lines
      return (
        <p key={idx} className="mb-2 leading-relaxed">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-semibold">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <div 
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-h-[460px] min-h-[300px] bg-mintBg/20 rounded-2xl border border-gray-150"
      role="log"
      aria-label="AI conversation history"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-textSecondary space-y-3">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-secondary animate-bounce">
            <Bot size={28} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-textPrimary">Ask EcoTrace AI</h4>
            <p className="text-xs text-textSecondary max-w-xs mt-1">
              Your recent 7-day carbon activity is pre-loaded! Ask about your biggest emission sources, tips to offset, or challenge requests.
            </p>
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id} 
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-secondary shadow-sm shrink-0">
                  <Bot size={16} />
                </div>
              )}

              {/* Message Bubble */}
              <div 
                className={`max-w-[80%] rounded-2xl p-4 text-xs font-normal shadow-sm ${
                  isUser 
                    ? 'bg-secondary text-white rounded-tr-none' 
                    : 'bg-white text-textPrimary border border-gray-100 rounded-tl-none'
                }`}
              >
                {isUser ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="markdown-body select-text">
                    {parseMarkdown(msg.content)}
                  </div>
                )}
                <span className={`block text-[9px] mt-2 text-right opacity-60`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-8 h-8 rounded-full bg-accent text-primary flex items-center justify-center shadow-sm shrink-0 font-bold text-xs">
                  <User size={16} />
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Pulsing AI Typing indicator */}
      {loading && (
        <div className="flex items-start gap-2.5 justify-start">
          <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-secondary shadow-sm shrink-0">
            <Sparkles size={14} className="animate-spin text-accent" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
            <div className="flex items-center space-x-1.5 py-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
export default InsightChat;

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader, Sparkles, Bot, User, Trash2, ChevronDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { aiAssistantApi } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  actionSuggestion?: any | null;
  timestamp: Date;
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const QUICK_PROMPTS = [
  { label: '🚗 Fleet status', value: 'Show me the current fleet status' },
  { label: '📋 Pending jobs', value: 'List pending jobs and unassigned vehicles' },
  { label: '👤 Driver overview', value: 'Show driver performance overview' },
  { label: '❓ How it works', value: 'How does this FleetPro system work?' },
];

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to **FleetPro AI**! 🚀\n\nI am your intelligent fleet assistant. Ask me about vehicles, drivers, routes, maintenance, or anything else fleet-related.',
      recommendations: [],
      actionSuggestion: null,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      actionSuggestion: null,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiAssistantApi.sendMessage(trimmed);

      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        recommendations: response.recommendations,
        actionSuggestion: response.actionSuggestion || null,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.recommendations && response.recommendations.length > 0) {
        response.recommendations.forEach((rec: any) => {
          toast.info(typeof rec === 'string' ? rec : rec.text);
        });
      }
    } catch (error: any) {
      const detail = error?.body?.details || error?.body?.error || error?.message || 'Failed to get a response.';
      toast.error(detail);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${detail}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;
    try {
      await aiAssistantApi.clearHistory();
      setMessages([]);
      toast.success('Chat history cleared');
    } catch (error: any) {
      toast.error(error.message || 'Failed to clear history');
    }
  };

  const handleExecuteAction = async (_msg: Message) => {
    // Read-only assistant — no actions supported.
  };

  return (
    <>
      {/* FAB Launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setIsOpen(true)}
            title="Open FleetPro AI"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9999,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.45)',
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={26} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9999,
              width: 420,
              maxWidth: 'calc(100vw - 32px)',
              height: '75vh',
              maxHeight: 680,
              minHeight: 420,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              background: '#fff',
            }}
          >
            {/* ── HEADER ── */}
            <div style={{
              flexShrink: 0,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* glow blob */}
              <div style={{
                position: 'absolute', top: -30, right: -20, width: 120, height: 120,
                borderRadius: '50%', background: 'rgba(59,130,246,0.35)', filter: 'blur(30px)',
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={20} color="#bfdbfe" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>FleetPro AI</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
                      background: 'rgba(34,197,94,0.2)', color: '#86efac',
                      border: '1px solid rgba(34,197,94,0.3)',
                      padding: '2px 7px', borderRadius: 20,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      ONLINE
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(191,219,254,0.85)', margin: 0, marginTop: 1 }}>
                    Powered by advanced ML
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                <button
                  onClick={handleClearHistory}
                  title="Clear history"
                  style={{
                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  style={{
                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </div>

            {/* ── MESSAGES ── */}
            <div
              ref={scrollContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                background: '#f8f9fc',
                scrollBehavior: 'smooth',
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 8,
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    flexShrink: 0,
                    width: 30, height: 30,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: msg.role === 'assistant'
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      : '#e5e7eb',
                    boxShadow: msg.role === 'assistant' ? '0 2px 8px rgba(59,130,246,0.35)' : 'none',
                    border: msg.role === 'user' ? '1px solid #d1d5db' : 'none',
                    marginBottom: 2,
                  }}>
                    {msg.role === 'assistant'
                      ? <Sparkles size={13} color="#fff" />
                      : <User size={13} color="#6b7280" />
                    }
                  </div>

                  {/* Bubble */}
                  <div style={{
                    maxWidth: '78%',
                    padding: '12px 16px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                      : '#ffffff',
                    color: msg.role === 'user' ? '#fff' : '#1f2937',
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    boxShadow: msg.role === 'user'
                      ? '0 4px 12px rgba(37,99,235,0.25)'
                      : '0 2px 8px rgba(0,0,0,0.07)',
                    border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}>
                    <div>{renderContent(msg.content)}</div>

                    {/* Recommendations */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {msg.recommendations.map((rec: any, i: number) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 6,
                            fontSize: 12, padding: '8px 10px', borderRadius: 10,
                            background: 'rgba(59,130,246,0.08)', color: '#1d4ed8',
                            border: '1px solid rgba(59,130,246,0.18)',
                          }}>
                            <Sparkles size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                            <span>{typeof rec === 'string' ? rec : rec.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    {msg.role === 'assistant' && msg.actionSuggestion && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                        <button
                          onClick={() => handleExecuteAction(msg)}
                          style={{
                            width: '100%', padding: '8px 14px', border: 'none',
                            borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                            color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          ⚡ Execute Suggested Action
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                  }}>
                    <Sparkles size={13} color="#fff" />
                  </div>
                  <div style={{
                    padding: '14px 18px', borderRadius: '18px 18px 18px 4px',
                    background: '#fff', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    display: 'flex', gap: 5, alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#60a5fa',
                        animation: 'bounce 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} style={{ height: 4 }} />
            </div>

            {/* ── QUICK PROMPTS ── */}
            {messages.length <= 1 && !isLoading && (
              <div style={{
                flexShrink: 0,
                padding: '8px 16px 0',
                background: '#f8f9fc',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}>
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => sendMessage(p.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: '#fff', color: '#1d4ed8',
                      border: '1px solid #bfdbfe', cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#1d4ed8';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.color = '#1d4ed8';
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── INPUT ── */}
            <div style={{
              flexShrink: 0,
              padding: '12px 16px 16px',
              background: '#fff',
              borderTop: '1px solid #f1f5f9',
            }}>
              <form
                onSubmit={handleSendMessage}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask FleetPro AI anything..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 14,
                    fontSize: 13.5,
                    color: '#1f2937',
                    background: '#f9fafb',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    minWidth: 0,
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
                    e.target.style.background = '#fff';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = '#f9fafb';
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  style={{
                    flexShrink: 0,
                    width: 44, height: 44,
                    borderRadius: 12,
                    border: 'none',
                    cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                    background: isLoading || !input.trim()
                      ? '#e5e7eb'
                      : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    color: isLoading || !input.trim() ? '#9ca3af' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 12px rgba(37,99,235,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {isLoading
                    ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={18} />
                  }
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: 10.5, color: '#9ca3af', margin: '8px 0 0', letterSpacing: '0.2px' }}>
                FleetPro AI · Powered by Gemini
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global keyframe styles */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader, Sparkles, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { aiAssistantApi, type ChatResponse } from '../lib/api';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  timestamp: Date;
}

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "👋 Hi! I'm your Fleet Management AI Assistant. Ask me anything about your fleet - vehicle status, driver performance, route optimization, or general questions. What can I help with?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiAssistantApi.sendMessage(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        recommendations: response.recommendations,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show recommendations as toast if any
      if (response.recommendations?.length > 0) {
        response.recommendations.forEach((rec: any) => {
          if (typeof rec === 'string') {
            toast.info(rec);
          } else if (rec.text) {
            toast.info(rec.text);
          }
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to get response');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all chat history? This cannot be undone.')) {
      try {
        await aiAssistantApi.clearHistory();
        setMessages([
          {
            id: '0',
            role: 'assistant',
            content: "👋 Chat history cleared! How can I help you today?",
            timestamp: new Date(),
          }
        ]);
        toast.success('Chat history cleared');
      } catch (error: any) {
        toast.error(error.message || 'Failed to clear history');
      }
    }
  };

  return (
    <>
      {/* Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center hover:scale-110 active:scale-95"
            title="Open Chat Assistant"
          >
            <MessageCircle size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">FleetPro AI</h3>
                  <p className="text-xs text-indigo-100">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-xs px-4 py-2.5 rounded-lg text-sm',
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                    )}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                        {msg.recommendations.map((rec: any, i: number) => (
                          <div key={i} className="text-xs bg-amber-50 text-amber-900 p-1.5 rounded">
                            💡 {typeof rec === 'string' ? rec : rec.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg rounded-bl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl space-y-2">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 text-sm"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
              <button
                onClick={handleClearHistory}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 px-2 rounded hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
              >
                <LogOut size={12} /> Clear History
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

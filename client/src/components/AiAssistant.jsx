/**
 * AiAssistant.jsx – Floating AI chat widget
 * SRS FR16: AI Assistant for platform guidance
 */
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { askAssistant } from '../services/aiService';
import { Spinner } from './Loader';

const AiAssistant = () => {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I'm the LocalPulse AI assistant. Ask me anything about reporting civic issues, tracking status, or using this platform.' },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const result = await askAssistant(q);
      setMessages((m) => [...m, { role: 'bot', text: result.answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-6 right-6 z-50 p-3.5 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-105"
        aria-label="Open AI Assistant"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="bg-primary-600 px-4 py-3 flex items-center gap-2">
            <Bot size={18} className="text-white" />
            <div>
              <p className="text-white font-semibold text-sm">LocalPulse AI</p>
              <p className="text-primary-200 text-xs">Always here to help</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-slate-500">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="input flex-1 text-sm py-1.5"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn-primary px-3 py-1.5 text-sm"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiAssistant;

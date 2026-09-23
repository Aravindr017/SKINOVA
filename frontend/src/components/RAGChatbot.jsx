import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, RotateCcw, Shield, AlertTriangle } from 'lucide-react';
import { api, sanitizeText, isPromptInjection } from '../services/api';

const SUGGESTIONS = [
  'What are the signs of melanoma?',
  'How do I prevent skin cancer?',
  'Difference between a mole and a lesion?',
  'When should I see a dermatologist?',
  'What is eczema and how is it treated?',
];

export default function RAGChatbot({ currentUser, lastResult }) {
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'ai',
      text: "Hello! I'm SKINOVA's AI dermatology consultant, trained on WHO guidelines and DermNet clinical database. Ask me anything about skin conditions, prevention, or treatments.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const raw = (text || input).trim();
    if (!raw || loading) return;
    setInput('');
    setBlocked(false);

    // ── Frontend security: sanitize & check injection
    const q = sanitizeText(raw, 500);
    if (isPromptInjection(q)) {
      setBlocked(true);
      setMessages(prev => [...prev,
        { id: Date.now(), role: 'user', text: raw, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: Date.now()+1, role: 'ai', text: '⚠️ Your message contains patterns that are not allowed. Please ask a skin-health related question.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isWarning: true }
      ]);
      return;
    }

    const userMsg = { id: Date.now(), role: 'user', text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Use /api/chat for conversational AI (LLM + RAG)
      const data = await api.chat({
        query: q,
        predictedClass: lastResult?.predicted_class || null,
        confidence: lastResult?.confidence || null,
        topK: 4
      });

      // Parse and deduplicate sources array
      const rawSources = (data.sources || []).map(s => {
        if (typeof s === 'string') return s;
        const disease = s?.chunk?.disease;
        const title = s?.chunk?.title;
        const sourceName = s?.chunk?.source;
        if (disease && title && disease !== title) return `${disease} — ${title}`;
        return title || disease || s?.chunk?.filename || sourceName || '';
      }).filter(Boolean);
      const sources = [...new Set(rawSources)];

      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        text: data.answer || 'I found some relevant medical information. Please consult a dermatologist for personalized advice.',
        sources: sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errText = err?.message || '';
      const isInjectionBlocked = errText.toLowerCase().includes('disallowed');

      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        text: isInjectionBlocked
          ? '⚠️ Your query was blocked for security reasons. Please ask a dermatology-related question.'
          : `I'm having trouble connecting to the AI server right now. Please ensure the backend is running and try again.\n\nError: ${errText}`,
        isWarning: isInjectionBlocked,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const resetChat = () => setMessages([{
    id: 1, role: 'ai',
    text: "Hello! I'm SKINOVA's AI consultant. How can I help you today?",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] max-h-[700px] animate-fade-up">
      {/* Header */}
      <div className="card p-4 flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
             style={{background:'linear-gradient(135deg,#CCFBF1,#0D9488)'}}>
          <Bot size={20} className="text-white"/>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style={{background:'#10B981'}}/>
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-slate-900">SKINOVA AI Consultant</h1>
          <p className="text-xs text-slate-500">WHO & DermNet guidelines · RAG-powered · Secure</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{background:'#F0FDFA'}}>
            <Shield size={11} className="text-teal-600"/>
            <span className="text-xs text-teal-700 font-semibold">Protected</span>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={resetChat}>
            <RotateCcw size={14}/> Reset
          </button>
        </div>
      </div>

      {/* Context card if scan done */}
      {lastResult && (
        <div className="card-sm p-3 mb-3 flex items-center gap-2 flex-shrink-0" style={{background:'#F0FDFA', border:'1px solid #99F6E4'}}>
          <Bot size={13} className="text-teal-600 flex-shrink-0"/>
          <p className="text-xs text-teal-700">
            Discussing your recent scan: <strong>{lastResult.class_name || lastResult.prediction}</strong> ({Math.round((lastResult.confidence||0)*100)}% confidence)
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="card flex-1 overflow-y-auto p-4 space-y-4 mb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                 style={{background: msg.role === 'ai' ? 'linear-gradient(135deg,#14B8A6,#0D9488)' : '#6366F1'}}>
              {msg.role === 'ai' ? <Bot size={14}/> : <span>{currentUser?.name?.[0] || 'U'}</span>}
            </div>
            <div className={`flex-1 max-w-[85%] ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
              {msg.role === 'ai' ? (
                <div className={`chat-bubble-ai ${msg.isWarning ? 'border border-amber-200' : ''}`}
                     style={msg.isWarning ? {background:'#FFFBEB'} : {}}>
                  {msg.isWarning && <AlertTriangle size={14} className="text-amber-500 inline mr-1"/>}
                  <p className="leading-relaxed whitespace-pre-wrap text-sm">{msg.text}</p>
                  {msg.sources?.length > 0 && (
                    <div className="mt-3 pt-2 border-t" style={{borderColor:'#E2E8F0'}}>
                      <p className="text-xs text-slate-400 font-semibold mb-1.5">📚 Sources:</p>
                      {msg.sources.slice(0, 4).map((s, i) => (
                        <p key={i} className="text-xs text-teal-600 truncate">• {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="chat-bubble-user">{msg.text}</div>
              )}
              <p className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                 style={{background:'linear-gradient(135deg,#14B8A6,#0D9488)'}}>
              <Bot size={14} className="text-white"/>
            </div>
            <div className="chat-bubble-ai">
              <div className="flex gap-1.5 py-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-slate-400"
                       style={{animation:`bounce 1s ease-in-out ${i*0.15}s infinite`}}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="badge badge-primary cursor-pointer hover:opacity-80 transition-opacity text-xs py-2 px-3">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
        <Shield size={11}/> Messages are scanned for security. Ask only dermatology-related questions.
      </div>

      {/* Input */}
      <div className="card p-3 flex gap-3 flex-shrink-0">
        <textarea
          ref={inputRef}
          className="flex-1 resize-none text-sm text-slate-800 outline-none bg-transparent placeholder-slate-400 max-h-32"
          placeholder="Ask about skin conditions, treatments, prevention…"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          style={{lineHeight:'1.5'}}
          maxLength={500}
        />
        <button
          className="btn btn-primary btn-icon self-end flex-shrink-0"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, RotateCcw, Shield, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { api, sanitizeText, isPromptInjection } from '../services/api';

const SUGGESTIONS = [
  'What are the signs of melanoma?',
  'How do I prevent skin cancer?',
  'Difference between a mole and a lesion?',
  'When should I see a dermatologist?',
  'What is eczema and how is it treated?',
];

// Renders inline markdown tokens (**bold**, *italic*) into styled elements without raw asterisks
function formatInlineTokens(str) {
  if (!str) return '';
  const parts = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }
  return parts.length > 0 ? parts : str;
}

// Clean chat message parser that removes raw ###, ---, and renders styled headings, paragraphs, and bullets
function FormattedChatMessage({ content }) {
  if (!content) return null;

  // Pre-clean horizontal rules, redundant meta lines, and normalize bullets
  const cleaned = content
    .replace(/^---\s*$/gm, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .trim();

  const lines = cleaned.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Header check (### or ##)
        if (trimmed.startsWith('#')) {
          const headerContent = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1 text-teal-900">
              {formatInlineTokens(headerContent)}
            </h4>
          );
        }

        // Bullet list item
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          const bulletContent = trimmed.replace(/^[•\-]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-teal-600 font-bold select-none">•</span>
              <div className="flex-1 text-slate-700">{formatInlineTokens(bulletContent)}</div>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-slate-800">
            {formatInlineTokens(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function RAGChatbot({ currentUser, lastResult, onRecordSearch, initialQuery = '' }) {
  const [messages, setMessages] = useState([
    {
      id: 1, role: 'ai',
      text: "Hello! I'm SKINOVA's AI dermatology consultant, trained on WHO guidelines and DermNet clinical database. Ask me anything about skin conditions, prevention, or treatments.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [blocked, setBlocked]       = useState(false);
  const [historySession, setHistorySession] = useState(null);
  const bottomRef = useRef();
  const inputRef  = useRef();

  // Helper to fetch response for older history items without stored answers
  const autoFetchAnswer = async (queryText) => {
    setLoading(true);
    try {
      const data = await api.chat({
        query: queryText,
        predictedClass: lastResult?.predicted_class || null,
        confidence: lastResult?.confidence || null,
        topK: 4
      });

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

      // Cache this answer in user activity history
      onRecordSearch?.(queryText, 'ai_consultation', {
        answer: aiMsg.text,
        sources: sources,
      });
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: 'Could not load response from AI service. Please ensure the backend is connected.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuery) return;

    // Never place the historical question in the input textarea - keep it empty like ChatGPT!
    setInput('');

    if (typeof initialQuery === 'object' && initialQuery !== null) {
      const q = typeof initialQuery.query === 'string' ? initialQuery.query : '';
      const ans = typeof initialQuery.answer === 'string' ? initialQuery.answer : '';
      const sources = Array.isArray(initialQuery.sources) ? initialQuery.sources : [];
      const timestamp = initialQuery.date
        ? new Date(initialQuery.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const fullDate = initialQuery.date
        ? new Date(initialQuery.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Saved Chat';

      setHistorySession({
        query: q,
        date: fullDate,
      });

      if (Array.isArray(initialQuery.messages) && initialQuery.messages.length > 0) {
        setMessages(initialQuery.messages);
      } else if (ans && q) {
        // Load the chat history conversation thread directly like ChatGPT
        setMessages([
          {
            id: 1,
            role: 'user',
            text: q,
            time: timestamp
          },
          {
            id: 2,
            role: 'ai',
            text: ans,
            sources: sources,
            time: timestamp
          }
        ]);
      } else if (q) {
        // If older item without stored answer, display question and retrieve response
        setMessages([
          {
            id: 1,
            role: 'user',
            text: q,
            time: timestamp
          }
        ]);
        autoFetchAnswer(q);
      }
    }
  }, [initialQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const raw = typeof text === 'string' ? text.trim() : (typeof input === 'string' ? input.trim() : '');
    if (!raw || loading) return;
    setInput('');
    setBlocked(false);

    // ── Frontend security: sanitize & check injection
    const q = sanitizeText(raw, 500);
    if (isPromptInjection(q)) {
      setBlocked(true);
      const blockText = '⚠️ Your message contains patterns that are not allowed. Please ask a skin-health related question.';
      setMessages(prev => [...prev,
        { id: Date.now(), role: 'user', text: raw, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: Date.now()+1, role: 'ai', text: blockText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isWarning: true }
      ]);
      onRecordSearch?.(q, 'ai_consultation', { answer: blockText, sources: [] });
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

      // Record in user activity history with full AI answer and sources
      onRecordSearch?.(q, 'ai_consultation', {
        answer: aiMsg.text,
        sources: sources,
      });
    } catch (err) {
      const errText = err?.message || '';
      const isTimeout = errText.toLowerCase().includes('timeout');
      const isInjectionBlocked = errText.toLowerCase().includes('disallowed');
      const failText = isInjectionBlocked
        ? '⚠️ Your query was blocked for security reasons. Please ask a dermatology-related question.'
        : isTimeout
        ? '⏱️ The AI server took longer than expected to process your request. Please tap Retry below to re-query with instant clinical synthesis.'
        : `I'm having trouble connecting to the AI server right now. Please ensure the backend is running and try again.\n\nError: ${errText}`;

      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai',
        text: failText,
        isWarning: isInjectionBlocked || isTimeout,
        canRetry: !isInjectionBlocked,
        queryText: q,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      onRecordSearch?.(q, 'ai_consultation', {
        answer: failText,
        sources: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const resetChat = () => {
    setHistorySession(null);
    setInput('');
    setMessages([{
      id: 1, role: 'ai',
      text: "Hello! I'm SKINOVA's AI consultant. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-10.5rem)] sm:h-[calc(100dvh-8rem)] max-h-[720px] animate-fade-up">
      {/* Header */}
      <div className="card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3 flex-shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center relative flex-shrink-0"
             style={{background:'linear-gradient(135deg,#CCFBF1,#0D9488)'}}>
          <Bot size={18} className="text-white"/>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{background:'#10B981'}}/>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-900 text-sm sm:text-base truncate">SKINOVA AI Consultant</h1>
          <p className="text-[11px] sm:text-xs text-slate-500 truncate">WHO & DermNet guidelines · RAG-powered</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg" style={{background:'#F0FDFA'}}>
            <Shield size={11} className="text-teal-600"/>
            <span className="text-xs text-teal-700 font-semibold">Protected</span>
          </div>
          <button
            className="btn btn-sm btn-ghost text-xs px-2.5 sm:px-3 text-teal-700 hover:bg-teal-50 flex items-center gap-1 border border-teal-100"
            onClick={resetChat}
            title="Start new conversation"
          >
            <RotateCcw size={13}/> <span className="hidden xs:inline sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* History Session Banner (when viewing chat from history) */}
      {historySession && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-xl bg-teal-50/80 border border-teal-200/80 text-xs text-slate-700 flex-shrink-0 animate-fade-up">
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={13} className="text-teal-600 flex-shrink-0" />
            <span className="font-semibold text-teal-900 flex-shrink-0">Chat History:</span>
            <span className="text-slate-600 truncate">{historySession.date}</span>
          </div>
          <button
            onClick={resetChat}
            className="btn btn-sm btn-ghost text-[11px] text-teal-700 hover:bg-teal-100 py-0.5 px-2 h-auto flex items-center gap-1 font-semibold flex-shrink-0"
            title="Start a new chat conversation"
          >
            <Sparkles size={11} className="text-teal-600" />
            <span>New Chat</span>
          </button>
        </div>
      )}

      {/* Context card if scan done */}
      {lastResult && (
        <div className="card-sm p-2.5 sm:p-3 mb-2.5 sm:mb-3 flex items-center gap-2 flex-shrink-0" style={{background:'#F0FDFA', border:'1px solid #99F6E4'}}>
          <Bot size={13} className="text-teal-600 flex-shrink-0"/>
          <p className="text-xs text-teal-700 truncate">
            Discussing your scan: <strong>{lastResult.class_name || lastResult.prediction}</strong> ({Math.round((lastResult.confidence||0)*100)}% confidence)
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="card flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 mb-3 sm:mb-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] sm:text-xs font-bold"
                 style={{background: msg.role === 'ai' ? 'linear-gradient(135deg,#14B8A6,#0D9488)' : '#6366F1'}}>
              {msg.role === 'ai' ? <Bot size={13}/> : <span>{currentUser?.name?.[0] || 'U'}</span>}
            </div>
            <div className={`flex-1 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
              {msg.role === 'ai' ? (
                <div className={`chat-bubble-ai ${msg.isWarning ? 'border border-amber-200' : ''}`}
                     style={msg.isWarning ? {background:'#FFFBEB'} : {}}>
                  {msg.isWarning && <AlertTriangle size={14} className="text-amber-500 inline mr-1"/>}
                  <FormattedChatMessage content={msg.text} />
                  {msg.sources?.length > 0 && (
                    <div className="mt-3 pt-2 border-t" style={{borderColor:'#E2E8F0'}}>
                      <p className="text-xs text-slate-400 font-semibold mb-1.5">📚 Sources:</p>
                      {msg.sources.slice(0, 4).map((s, i) => (
                        <p key={i} className="text-xs text-teal-600 truncate">• {s}</p>
                      ))}
                    </div>
                  )}
                  {msg.canRetry && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary text-xs mt-3 flex items-center gap-1.5"
                      onClick={() => sendMessage(msg.queryText)}
                    >
                      <RotateCcw size={12} /> Retry Question
                    </button>
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
          <div className="flex gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                 style={{background:'linear-gradient(135deg,#14B8A6,#0D9488)'}}>
              <Bot size={13} className="text-white"/>
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

      {/* Suggestions (only in fresh new chat) */}
      {!historySession && messages.length <= 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2 sm:mb-3 flex-nowrap">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)}
              className="badge badge-primary cursor-pointer hover:opacity-80 transition-opacity text-xs py-1.5 px-3 flex-shrink-0">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="text-[11px] sm:text-xs text-slate-400 mb-2 flex items-center gap-1.5 truncate">
        <Shield size={11} className="flex-shrink-0"/> Messages are protected. Ask dermatology-related questions.
      </div>

      {/* Input */}
      <div className="card p-2.5 sm:p-3 flex gap-2 sm:gap-3 flex-shrink-0">
        <textarea
          ref={inputRef}
          className="flex-1 resize-none text-xs sm:text-sm text-slate-800 outline-none bg-transparent placeholder-slate-400 max-h-32"
          placeholder={historySession ? "Reply to this chat or ask a follow-up…" : "Ask about skin conditions, treatments, prevention…"}
          rows={1}
          value={typeof input === 'string' ? input : ''}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          style={{lineHeight:'1.5'}}
          maxLength={500}
        />
        <button
          className="btn btn-primary btn-icon self-end flex-shrink-0"
          onClick={() => sendMessage()}
          disabled={!(typeof input === 'string' && input.trim()) || loading}
        >
          {loading ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

const SUGGESTED_QUERIES = [
  "Why did my financial score decrease?",
  "Where am I spending the most?",
  "How much emergency fund do I have?",
  "How much should I save this month?",
  "What happens if I reduce expenses by ₹3,000?",
  "What is causing my current risk?"
];

export default function AssistantView() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: "intro",
      sender: "bot",
      text: `Hello ${user?.name || "there"}! I am your FinGuard Financial Immune Assistant. I can analyze your spending anomalies, explain your financial health score, calculate your emergency fund runway, or simulate budgeting adjustments. How can I help you today?`,
      time: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(questionText) {
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: "usr-" + Date.now(),
      sender: "user",
      text: textToSend,
      time: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await apiRequest("/api/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ question: textToSend })
      });

      const botMsg = {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: response.answer,
        followups: response.suggested_followups || [],
        disclaimer: response.disclaimer,
        time: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "bot",
          text: "I encountered an error retrieving your financial analytics: " + err.message,
          time: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bot size={22} className="text-indigo-400" />
            <span>FinGuard AI Assistant</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Context-aware financial advisor strictly scoped to your private financial accounts and telemetry.
          </p>
        </div>
      </div>

      {/* Chat Window */}
      <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[650px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map(m => {
            const isBot = m.sender === "bot";
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isBot ? "self-start" : "ml-auto flex-row-reverse"}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isBot
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {isBot ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div className="space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isBot
                        ? "bg-slate-900/80 border border-slate-800 text-slate-200"
                        : "bg-indigo-600 text-white font-medium"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    {m.disclaimer && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 italic">
                        {m.disclaimer}
                      </div>
                    )}
                  </div>

                  {/* Followup chips */}
                  {m.followups && m.followups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.followups.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(f)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                <span>Analyzing your financial telemetry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt suggestion pills */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 overflow-x-auto flex gap-2 no-scrollbar">
          {SUGGESTED_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="text-[11px] px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 transition-colors whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat input box */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800">
          <form
            onSubmit={e => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about your score, spending, risk, or emergency fund..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>Scoped strictly to your personal financial database</span>
            <span>Non-speculative educational analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}

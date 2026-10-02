import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, BookOpen, Bot, Headphones, Lightbulb, Mic, Radio, Send, ThumbsDown, ThumbsUp, Trophy, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "./imc-assistant.css";

const categories = [
  { label: "Quran", icon: BookOpen, examples: ["How do I listen to Quran?", "How do I change reciter?", "How do I use Quran Tracker?"] },
  { label: "Hadith", icon: BookOpen, examples: ["Where can I find Hadith?"] },
  { label: "Kids Zone", icon: Lightbulb, examples: ["Where are the Kids Games?"] },
  { label: "Quiz & Leaderboard", icon: Trophy, examples: ["How do I enter the quiz?", "How does the leaderboard work?"] },
  { label: "Podcasts", icon: Headphones, examples: ["Where can I find podcasts?"] },
  { label: "Live Radio", icon: Radio, examples: ["How do I listen to Radio?"] },
  { label: "Live Programmes", icon: Radio, examples: ["Where can I watch live programmes?"] },
  { label: "Nasheeds & Qiraat", icon: Headphones, examples: ["Where can I find nasheeds and Qiraat?"] },
  { label: "Notifications", icon: Lightbulb, examples: ["How do I turn notifications on?"] },
  { label: "Account & Settings", icon: UserRound, examples: ["How do I create an account?", "I forgot my password. What should I do?"] },
];

const greeting = "Assalamu Alaikum! I'm here to help you understand and use Islam Media Central.";

function currentFeature(pathname) {
  const segment = pathname.split("/").filter(Boolean).pop() || "home";
  return segment.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function formatAnswer(text) {
  return String(text || "").split("\n").map((line, index) => {
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (numbered) return <div className="imc-answer-step" key={index}><span>{numbered[1]}</span><p>{numbered[2]}</p></div>;
    if (bullet) return <p className="imc-answer-bullet" key={index}>{bullet[1]}</p>;
    return line ? <p key={index}>{line}</p> : <br key={index} />;
  });
}

async function authHeaders() {
  const { data } = await supabase?.auth.getSession() || { data: { session: null } };
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export default function IMCAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [assistantSettings, setAssistantSettings] = useState({ assistant_name: "IMC Assistant", assistant_greeting: greeting, voice_enabled: false, default_language: "en" });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [voiceState, setVoiceState] = useState("");
  const recognitionRef = useRef(null);
  const endRef = useRef(null);
  const feature = useMemo(() => location.state?.currentScreen || currentFeature(location.pathname), [location.pathname, location.state]);
  const suggestions = activeCategory?.examples || (assistantSettings.suggested_questions?.length ? assistantSettings.suggested_questions : ["How do I listen to Quran?", "Where are the Kids Games?", "What features are available?"]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    let active = true;
    try { setSelectedLanguage(localStorage.getItem("imc-assistant-language") || "en"); } catch { setSelectedLanguage("en"); }
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "public_settings" }) });
        if (response.ok) {
          const result = await response.json();
          if (active) {
            setAssistantSettings((current) => ({ ...current, ...(result.settings || {}) }));
            if (result.settings?.preferred_language) setSelectedLanguage(result.settings.preferred_language);
          }
        }
      } catch { return; }
    };
    void loadSettings();
    return () => { active = false; recognitionRef.current?.stop?.(); };
  }, []);

  useEffect(() => {
    let active = true;
    authHeaders()
      .then((headers) => {
        if (!headers.Authorization) return null;
        return fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ operation: "history" }) });
      })
      .then((response) => response?.ok ? response.json() : null)
      .then((result) => { if (active && result) setRecentSessions(result.sessions || []); })
      .catch(() => false);
    return () => { active = false; };
  }, []);

  async function openSession(id) {
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ operation: "load_session", sessionId: id }) });
      if (!response.ok) return;
      const result = await response.json();
      setSessionId(id);
      setMessages((result.messages || []).map((item) => ({ role: item.role, message: item.message, action: item.metadata?.action, messageId: item.id, requiresSupport: item.metadata?.requires_support })));
    } catch { setError("Unable to load that saved conversation."); }
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!assistantSettings.voice_enabled) return;
    if (!SpeechRecognition) {
      setVoiceState("Voice input is not supported by this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = ({ en: "en-GB", ur: "ur-PK", gu: "gu-IN", ar: "ar" })[selectedLanguage] || "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceState("Listening...");
    recognition.onerror = () => setVoiceState("Microphone access was unavailable. You can type your question instead.");
    recognition.onend = () => { recognitionRef.current = null; setVoiceState(""); };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) { setDraft(transcript); sendQuestion(transcript); }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { setVoiceState("Microphone access was unavailable. You can type your question instead."); }
  }

  async function sendQuestion(question = draft) {
    const value = question.trim();
    if (!value || loading) return;
    setDraft("");
    setError("");
    setMessages((items) => [...items, { role: "user", message: value }, { role: "assistant", pending: true }]);
    setLoading(true);
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/imc-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ question: value, preferred_language: selectedLanguage, sessionId, context: { current_screen: feature, current_feature: feature, preferred_language: selectedLanguage } }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Sorry, I'm having trouble answering right now. Please try again.");
      if (result.sessionId) setSessionId(result.sessionId);
        setMessages((items) => [...items.slice(0, -1), { role: "assistant", message: result.answer, action: result.action || null, messageId: result.messageId || null, requiresSupport: Boolean(result.requires_support) }]);
    } catch (requestError) {
      setMessages((items) => {
        const next = items.filter((item) => !item.pending);
        const last = next[next.length - 1];
        if (last?.role === "user" && last.message === value) next.pop();
        return next;
      });
      setError(requestError.message || "Sorry, I'm having trouble answering right now. Please try again.");
      setDraft(value);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback(messageId, rating) {
    if (!messageId) return;
    try {
      const headers = await authHeaders();
      await fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ operation: "feedback", messageId, rating }) });
    } catch { setError("Your feedback could not be saved. Please try again."); return; }
      setMessages((items) => items.map((item) => item.messageId === messageId ? { ...item, feedback: rating, requiresSupport: Boolean(item.requiresSupport) } : item));
  }

    async function logNavigation(item) {
      try {
        const headers = await authHeaders();
        await fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ operation: "navigation_click", messageId: item.messageId, route: item.action.route, feature }) });
      } catch { setError("Unable to record this navigation action."); }
      navigate(item.action.route);
    }

    async function clearRecentHistory() {
      if (!window.confirm("Delete your saved IMC Assistant conversations?")) return;
      try {
        const headers = await authHeaders();
        const response = await fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ operation: "delete_history" }) });
        if (response.ok) setRecentSessions([]);
      } catch { setError("Unable to delete saved conversations. Please try again."); }
    }

    async function selectLanguage(language) {
      setSelectedLanguage(language);
      try { localStorage.setItem("imc-assistant-language", language); } catch { setError("This browser could not save your language preference."); }
      try {
        const headers = await authHeaders();
        if (headers.Authorization) await fetch("/api/imc-assistant", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ operation: "update_language", language }) });
      } catch { setError("Your language preference could not be saved to your account."); }
    }

  return (
    <div className="imc-assistant-page">
      <div className="imc-assistant-shell">
        <header className="imc-assistant-header">
          <div className="imc-brand-mark"><Bot aria-hidden="true" /></div>
          <div className="imc-brand-copy"><h1>{assistantSettings.assistant_name}</h1><p>Your guide to Islam Media Central</p></div>
          <button className="imc-back-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></button>
        </header>

        <section className="imc-chat" aria-label="IMC Assistant chat">
          <div className="imc-chat-scroll">
            <div className="imc-welcome">
              <span className="imc-welcome-icon"><Bot /></span>
              <div><h2>Assalamu Alaikum <span aria-hidden="true">👋</span></h2><p>{assistantSettings.assistant_greeting}</p></div>
            </div>

            {!messages.length && <>
              {recentSessions.length > 0 && <section className="imc-recent-questions"><div><strong>Recent Questions</strong><span><button onClick={() => { setSessionId(null); setMessages([]); }}>New Chat</button><button onClick={clearRecentHistory}>Clear history</button></span></div>{recentSessions.slice(0, 5).map((item) => <button key={item.id} onClick={() => openSession(item.id)}>{item.question}</button>)}</section>}
              <div className="imc-category-grid" aria-label="Help categories">
                {categories.map(({ label, icon: Icon }) => <button key={label} className={`imc-category ${activeCategory?.label === label ? "is-selected" : ""}`} onClick={() => setActiveCategory(categories.find((item) => item.label === label))}><Icon /><span>{label}</span></button>)}
              </div>
              <div className="imc-suggestions"><p>Suggested questions</p><div>{suggestions.map((item) => <button key={item} onClick={() => sendQuestion(item)}>{item}</button>)}</div></div>
            </>}

            <div className="imc-message-list" aria-live="polite">
              {messages.map((item, index) => <article key={`${item.role}-${index}`} className={`imc-message imc-message-${item.role}`}>
                <span className="imc-message-avatar">{item.role === "user" ? <UserRound /> : <Bot />}</span>
                <div className="imc-message-content">
                  {item.pending ? <p className="imc-thinking"><span className="imc-dots" />IMC Assistant is thinking...</p> : <>
                    <div className="imc-answer">{formatAnswer(item.message)}</div>
                        {item.action?.route && <button className="imc-action-button" onClick={() => logNavigation(item)}>{item.action.label || "Open feature"}<ArrowUp className="imc-action-arrow" /></button>}
                    {item.requiresSupport && <div className="imc-support-links">{assistantSettings.support_email && <a href={`mailto:${assistantSettings.support_email}`}>Email support</a>}{assistantSettings.support_whatsapp && <a href={assistantSettings.support_whatsapp} target="_blank" rel="noreferrer">WhatsApp support</a>}{assistantSettings.support_website && <a href={assistantSettings.support_website} target="_blank" rel="noreferrer">Support website</a>}</div>}
                    {item.role === "assistant" && item.messageId && <div className="imc-feedback" aria-label="Rate this response"><span>Was this helpful?</span><button aria-label="Helpful" className={item.feedback === "helpful" ? "selected" : ""} onClick={() => submitFeedback(item.messageId, "helpful")}><ThumbsUp /></button><button aria-label="Not helpful" className={item.feedback === "not_helpful" ? "selected" : ""} onClick={() => submitFeedback(item.messageId, "not_helpful")}><ThumbsDown /></button></div>}
                  </>}
                </div>
              </article>)}
              {error && <div className="imc-error" role="alert"><span>{error}</span><button onClick={() => sendQuestion(draft)} aria-label="Try again"><Send /></button><button onClick={() => setError("")} aria-label="Dismiss"><X /></button></div>}
              <div ref={endRef} />
            </div>
          </div>

          <form className="imc-composer" onSubmit={(event) => { event.preventDefault(); sendQuestion(); }}>
            <label className="sr-only" htmlFor="imc-question">Ask me anything about the app...</label>
            <input id="imc-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask me anything about the app..." maxLength={1200} disabled={loading} />
            <label className="sr-only" htmlFor="imc-language">Answer language</label><select className="imc-language-select" id="imc-language" value={selectedLanguage} onChange={(event) => selectLanguage(event.target.value)}><option value="en">EN</option><option value="ur">اردو</option><option value="gu">ગુજ</option><option value="ar">عربي</option></select>
            <button type="button" className="imc-mic-button" title={assistantSettings.voice_enabled ? "Ask by voice" : "Voice input disabled"} aria-label={assistantSettings.voice_enabled ? "Ask by voice" : "Voice input disabled"} onClick={startVoiceInput} disabled={!assistantSettings.voice_enabled || loading}><Mic /></button>
            <button type="submit" className="imc-send-button" aria-label="Send question" disabled={!draft.trim() || loading}><ArrowUp /></button>
          </form>
          {voiceState && <p className="imc-voice-state" role="status">{voiceState}</p>}
          <p className="imc-privacy-note">Answers are based on published Islam Media Central help articles. Voice transcripts are sent as text and are not saved as audio.</p>
        </section>
      </div>
    </div>
  );
}
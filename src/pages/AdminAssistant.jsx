import { useCallback, useEffect, useState } from "react";
import { BookOpen, CirclePlus, FileText, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "./imc-assistant.css";

const emptyArticle = { id: "", title: "", category: "General App Information", feature: "", question: "", questions: "", answer: "", keywords: "", navigation_route: "", priority: 0, is_published: false };
const categories = ["Quran", "Hadith", "Kids Zone", "Games", "Quiz", "Leaderboard", "Competitions", "Giveaways", "Podcasts", "Radio", "Live Programmes", "Nasheeds", "Qiraat", "Notifications", "Account", "Profile", "Settings", "Technical Support", "General App Information"];

export default function AdminAssistant() {
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(emptyArticle);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [unanswered, setUnanswered] = useState([]);
  const [settingsDraft, setSettingsDraft] = useState({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [featureFilter, setFeatureFilter] = useState("");

  async function request(operation, payload = {}) {
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const token = data.session?.access_token;
    const response = await fetch("/api/imc-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ operation, ...payload }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Assistant management is unavailable.");
    return result;
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setStatus("");
    try {
      const [articleResult, statsResult, unansweredResult, settingsResult] = await Promise.all([request("admin_list_articles"), request("admin_stats"), request("admin_list_unanswered"), request("admin_get_settings")]);
      setArticles(articleResult.articles || []);
      setStats(statsResult.stats || null);
      setUnanswered(unansweredResult.questions || []);
      setSettingsDraft(settingsResult.settings || {});
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const payload = { ...article, questions: article.questions.split("\n").map((item) => item.trim()).filter(Boolean), keywords: article.keywords.split(",").map((item) => item.trim()).filter(Boolean), priority: Number(article.priority) };
      await request(article.id ? "admin_update_article" : "admin_create_article", { article: payload });
      setArticle(emptyArticle);
      await refresh();
      setStatus(article.is_published ? "Article saved and published to retrieval." : "Draft saved.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function togglePublished(row) {
    setBusy(true);
    try {
      await request("admin_update_article", { article: { ...row, is_published: !row.is_published } });
      await refresh();
      setStatus(row.is_published ? "Article unpublished." : "Article published.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function removeArticle(row) {
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    setBusy(true);
    try { await request("admin_delete_article", { id: row.id }); await refresh(); setStatus("Article deleted."); }
    catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await request("admin_update_settings", { settings: settingsDraft });
      setStatus("Assistant settings saved.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function createDraftFromQuestion(item) {
    setBusy(true);
    const draft = {
      ...emptyArticle,
      title: item.question.slice(0, 180),
      category: categories.includes(item.category) ? item.category : "General App Information",
      feature: item.current_screen || "",
      question: item.question,
      answer: "Draft for administrator review. Add a verified answer before publishing.",
      is_published: false,
    };
    try {
      const result = await request("admin_create_article", { article: draft });
      await request("admin_update_unanswered", { id: item.id, status: "reviewing" });
      setArticle({ ...emptyArticle, ...result.article, questions: (result.article.questions || []).join("\n"), keywords: (result.article.keywords || []).join(", ") });
      await refresh();
      setStatus("Draft created. Review the answer before publishing.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function updateQuestionStatus(item, nextStatus) {
    try {
      await request("admin_update_unanswered", { id: item.id, status: nextStatus });
      setUnanswered((items) => items.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus } : entry));
    } catch (error) { setStatus(error.message); }
  }

  function editArticle(row) {
    setArticle({ ...emptyArticle, ...row, questions: (row.questions || []).join("\n"), keywords: (row.keywords || []).join(", ") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const features = [...new Set(articles.map((row) => row.feature).filter(Boolean))].sort();
  const filtered = articles.filter((row) => `${row.title} ${row.category} ${row.feature || ""}`.toLowerCase().includes(search.toLowerCase()) && (!categoryFilter || row.category === categoryFilter) && (!featureFilter || row.feature === featureFilter));

  return <div className="imc-assistant-page imc-admin-page"><div className="imc-assistant-shell">
    <header className="imc-assistant-header"><div className="imc-brand-mark"><BookOpen /></div><div className="imc-brand-copy"><h1>AI Assistant Management</h1><p>Knowledge Base · Official published guidance</p></div><button className="imc-back-button" onClick={refresh} aria-label="Refresh articles" disabled={busy}><RefreshCw /></button></header>
    {stats && <><section className="imc-admin-stats" aria-label="Assistant question statistics">{[["Questions today", stats.today], ["This week", stats.week], ["This month", stats.month], ["Total questions", stats.total], ["Unanswered", stats.unanswered], ["Helpful", stats.helpful], ["Not helpful", stats.notHelpful]].map(([label, value]) => <div key={label}><strong>{value ?? 0}</strong><span>{label}</span></div>)}</section><p className="imc-admin-analytics-line">Helpful rating {stats.helpfulPercent}% <span>·</span> Average response {stats.averageResponseMs ? `${(stats.averageResponseMs / 1000).toFixed(1)}s` : "—"} <span>·</span> Navigation clicks {stats.navigationClicks}</p>{stats.requestedFeatures?.length > 0 && <p className="imc-admin-analytics-line">Most requested: {stats.requestedFeatures.map((item) => `${item.feature} (${item.count})`).join(" · ")}</p>}</>}
    <div className="imc-admin-columns">
      <form className="imc-admin-form" onSubmit={save}>
        <div className="imc-admin-form-heading"><div><p className="imc-admin-eyebrow">Knowledge Base</p><h2>{article.id ? "Edit help article" : "Create help article"}</h2></div><button type="button" title="New article" aria-label="New article" onClick={() => setArticle(emptyArticle)}><CirclePlus /></button></div>
        <label>Title<input required maxLength={180} value={article.title} onChange={(e) => setArticle({ ...article, title: e.target.value })} /></label>
        <div className="imc-admin-fields"><label>Category<select required value={article.category} onChange={(e) => setArticle({ ...article, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Feature key<input value={article.feature || ""} placeholder="e.g. quran_tracker" onChange={(e) => setArticle({ ...article, feature: e.target.value })} /></label></div>
        <label>Primary question<input value={article.question || ""} placeholder="How do I use this feature?" onChange={(e) => setArticle({ ...article, question: e.target.value })} /></label>
        <label>Common questions, one per line<textarea rows="3" value={article.questions} onChange={(e) => setArticle({ ...article, questions: e.target.value })} placeholder="How can I...?&#10;Where do I find...?" /></label>
        <label>Approved answer<textarea required rows="6" value={article.answer} onChange={(e) => setArticle({ ...article, answer: e.target.value })} /></label>
        <label>Keywords, comma-separated<input value={article.keywords} onChange={(e) => setArticle({ ...article, keywords: e.target.value })} /></label>
        <div className="imc-admin-fields"><label>Navigation route<select value={article.navigation_route || ""} onChange={(e) => setArticle({ ...article, navigation_route: e.target.value })}><option value="">No action</option>{[["/FullQuran", "Quran"], ["/Hadith", "Hadith"], ["/KidsZone", "Kids Zone"], ["/Games", "Games"], ["/Quizzes", "Quizzes"], ["/Leaderboard", "Leaderboard"], ["/Videos", "Videos"], ["/AudioNew", "Audio library"], ["/Multimedia", "Multimedia"], ["/Stories", "Stories"], ["/Features", "Features"], ["/About", "About"], ["/Competition", "Competitions"], ["/ContactUs", "Contact support"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Priority<input type="number" min="0" max="100" value={article.priority} onChange={(e) => setArticle({ ...article, priority: e.target.value })} /></label></div>
        <label className="imc-publish-toggle"><input type="checkbox" checked={Boolean(article.is_published)} onChange={(e) => setArticle({ ...article, is_published: e.target.checked })} /> Publish to AI retrieval</label>
        <button className="imc-admin-save" disabled={busy}><Save />{article.is_published ? "Save & Publish" : "Save Draft"}</button>
      </form>

      <section className="imc-admin-list"><div className="imc-admin-form-heading"><div><p className="imc-admin-eyebrow">Manage content</p><h2>Help articles <span>{articles.length}</span></h2></div><button type="button" onClick={refresh} aria-label="Refresh list" disabled={busy}><RefreshCw /></button></div>
        <label className="imc-admin-search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles" /></label>
        <div className="imc-admin-filters"><select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter by feature" value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)}><option value="">All features</option>{features.map((item) => <option key={item}>{item}</option>)}</select></div>
        {status && <p className="imc-admin-status" role="status">{status}</p>}
        <div className="imc-admin-article-list">{filtered.map((row) => <article key={row.id} className="imc-admin-article"><div className="imc-admin-article-copy"><h3>{row.title}</h3><p>{row.category}{row.feature ? ` · ${row.feature}` : ""}</p><span className={row.is_published ? "is-published" : "is-draft"}>{row.is_published ? "Published" : "Draft"}</span></div><div className="imc-admin-article-actions"><button onClick={() => editArticle(row)} title="Edit article"><FileText /></button><button onClick={() => togglePublished(row)} title={row.is_published ? "Unpublish" : "Publish"}>{row.is_published ? "Unpublish" : "Publish"}</button><button onClick={() => removeArticle(row)} title="Delete article"><Trash2 /></button></div></article>)}{!filtered.length && <p className="imc-admin-empty">{busy ? "Loading articles..." : "No articles found."}</p>}</div>
      </section>
    </div>
    <section className="imc-admin-settings-section"><form className="imc-admin-form" onSubmit={saveSettings}><div className="imc-admin-form-heading"><div><p className="imc-admin-eyebrow">Configuration</p><h2>AI Assistant Settings</h2></div></div>
      <div className="imc-admin-setting-toggles">{[["ai_enabled", "AI enabled"], ["voice_enabled", "Voice input enabled"], ["anonymous_chat_enabled", "Allow anonymous chat"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(settingsDraft[key])} onChange={(e) => setSettingsDraft({ ...settingsDraft, [key]: e.target.checked })} />{label}</label>)}</div>
      <div className="imc-admin-fields"><label>Assistant name<input value={settingsDraft.assistant_name || "IMC Assistant"} onChange={(e) => setSettingsDraft({ ...settingsDraft, assistant_name: e.target.value })} /></label><label>Default language<select value={settingsDraft.default_language || "en"} onChange={(e) => setSettingsDraft({ ...settingsDraft, default_language: e.target.value })}>{[["en", "English"], ["ur", "Urdu"], ["gu", "Gujarati"], ["ar", "Arabic"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Greeting<textarea rows="2" value={settingsDraft.assistant_greeting || ""} onChange={(e) => setSettingsDraft({ ...settingsDraft, assistant_greeting: e.target.value })} /></label>
      <label>Fallback message<textarea rows="2" value={settingsDraft.fallback_message || ""} onChange={(e) => setSettingsDraft({ ...settingsDraft, fallback_message: e.target.value })} /></label>
      <div className="imc-admin-fields"><label>Anonymous questions per hour<input type="number" min="1" max="1000" value={settingsDraft.anonymous_questions_per_hour || 10} onChange={(e) => setSettingsDraft({ ...settingsDraft, anonymous_questions_per_hour: Number(e.target.value) })} /></label><label>Signed-in questions per hour<input type="number" min="1" max="1000" value={settingsDraft.authenticated_questions_per_hour || 50} onChange={(e) => setSettingsDraft({ ...settingsDraft, authenticated_questions_per_hour: Number(e.target.value) })} /></label></div>
      <label>Support email<input type="email" value={settingsDraft.support_email || ""} onChange={(e) => setSettingsDraft({ ...settingsDraft, support_email: e.target.value })} /></label><label>Support WhatsApp URL<input type="url" value={settingsDraft.support_whatsapp || ""} onChange={(e) => setSettingsDraft({ ...settingsDraft, support_whatsapp: e.target.value })} /></label>
      <label>Support website URL<input type="url" value={settingsDraft.support_website || ""} onChange={(e) => setSettingsDraft({ ...settingsDraft, support_website: e.target.value })} /></label>
      <label>Support page<select value={settingsDraft.support_url || "/ContactUs"} onChange={(e) => setSettingsDraft({ ...settingsDraft, support_url: e.target.value })}>{[["/ContactUs", "Contact Us"], ["/About", "About"], ["/Home", "Home"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Suggested questions, one per line<textarea rows="4" value={(settingsDraft.suggested_questions || []).join("\n")} onChange={(e) => setSettingsDraft({ ...settingsDraft, suggested_questions: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
      <button className="imc-admin-save" disabled={busy}><Save />Save Assistant Settings</button>
    </form></section>
    <section className="imc-admin-unanswered"><div className="imc-admin-form-heading"><div><p className="imc-admin-eyebrow">Review queue</p><h2>Questions AI Couldn&apos;t Answer <span>{unanswered.length}</span></h2></div></div>
      <div className="imc-admin-article-list">{unanswered.map((item) => <article key={item.id} className="imc-admin-article"><div className="imc-admin-article-copy"><h3>{item.question}</h3><p>Asked {item.frequency} time{item.frequency === 1 ? "" : "s"} · {item.current_screen || "Unknown screen"} · Last asked {new Date(item.last_asked_at || item.updated_at).toLocaleDateString()}</p><span className={item.frequency >= 5 ? "is-published" : "is-draft"}>{item.frequency >= 5 ? "New FAQ suggestion" : item.status}</span></div><div className="imc-admin-article-actions"><button onClick={() => createDraftFromQuestion(item)} disabled={busy}>Create Help Article</button><select aria-label="Question status" value={item.status} onChange={(e) => updateQuestionStatus(item, e.target.value)}><option value="new">New</option><option value="reviewing">Reviewing</option><option value="answered">Answered</option><option value="ignored">Ignored</option></select></div></article>)}{!unanswered.length && <p className="imc-admin-empty">No unanswered questions yet.</p>}</div>
    </section>
  </div></div>;
}
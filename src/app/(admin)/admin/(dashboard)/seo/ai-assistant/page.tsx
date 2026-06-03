"use client";

import { useEffect, useState } from "react";
import {
  Bot, Zap, RefreshCw, Copy, Check, ChevronDown, ChevronUp,
  FileText, Code2, HelpCircle, Link2, TrendingUp, Send, User, Sparkles
} from "lucide-react";
import {
  generateMetaTitle, generateMetaDescription, generateFaqQuestions,
  generateContentImprovements, generateEEATImprovements
} from "@/lib/seo/aiRecommender";
import { toast } from "sonner";

interface PageOption {
  id: string; type: string; url: string; title: string;
  metaTitle: string | null; metaDescription: string | null;
  wordCount: number; hasFaq: boolean; hasSchema: boolean;
}

interface Recommendations {
  title?: string;
  description?: string;
  faqs?: Array<{ question: string; answer: string }>;
  improvements?: string[];
  eeat?: string[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistantPage() {
  const [pages, setPages] = useState<PageOption[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageOption | null>(null);
  const [recs, setRecs] = useState<Recommendations>({});
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["title"]);
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const [loadingPages, setLoadingPages] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<"optimizer" | "chat">("optimizer");

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am your AI SEO Assistant. How can I help you improve Karmakoders' search engine performance today?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    fetch("/api/seo/pages")
      .then((r) => r.json())
      .then((d) => setPages(d.pages || []))
      .finally(() => setLoadingPages(false));
  }, []);

  const toggleExpand = (key: string) => setExpanded((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
  const isExpanded = (key: string) => expanded.includes(key);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied((p) => ({ ...p, [key]: true }));
    setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
    toast.success("Copied to clipboard!");
  };

  const generateAll = async () => {
    if (!selectedPage) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    const ctx = {
      title: selectedPage.title,
      url: selectedPage.url,
      metaTitle: selectedPage.metaTitle,
      metaDescription: selectedPage.metaDescription,
      wordCount: selectedPage.wordCount,
      hasFaq: selectedPage.hasFaq,
      hasSchema: selectedPage.hasSchema,
    };
    setRecs({
      title: generateMetaTitle(ctx),
      description: generateMetaDescription(ctx),
      faqs: generateFaqQuestions(ctx),
      improvements: generateContentImprovements(ctx),
      eeat: generateEEATImprovements(ctx),
    });
    setExpanded(["title", "description", "faqs", "improvements", "eeat"]);
    setGenerating(false);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((p) => [...p, userMsg]);
    setInputMessage("");
    setTyping(true);

    // Simulate AI typing and streaming
    await new Promise((r) => setTimeout(r, 1200));

    let reply = "I analyzed the site. To rank higher for custom software, we need to improve the E-E-A-T section by adding client reviews and credentials.";
    if (textToSend.toLowerCase().includes("schema")) {
      reply = "Structured Schema JSON-LD is crucial. I recommend creating organization details or FAQ markup using the Schema Markup Center, then embedding it.";
    } else if (textToSend.toLowerCase().includes("ctr")) {
      reply = "To boost CTR: Make sure page titles are under 60 chars, include a call-to-action like 'Best Services 2026', and match descriptions closely.";
    } else if (textToSend.toLowerCase().includes("title")) {
      reply = "Optimized Title suggestion for Karmakoders: 'Karmakoders — Enterprise Software & Mobile App Development'. length is 59 chars.";
    }

    const assistantMsg: Message = { role: "assistant", content: reply };
    setMessages((p) => [...p, assistantMsg]);
    setTyping(false);
  };

  const RecommendationBlock = ({ id, icon: Icon, label, children, color = "#FFC300" }: { id: string; icon: React.ElementType; label: string; children: React.ReactNode; color?: string }) => {
    const IconComp = Icon as React.FC<{ className?: string; style?: React.CSSProperties }>;
    return (
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <button onClick={() => toggleExpand(id)} className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-colors bg-white/2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <IconComp className="w-4 h-4" style={{ color }} />
            </div>
            <span className="font-black text-white text-sm">{label}</span>
          </div>
          {isExpanded(id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {isExpanded(id) && <div className="border-t border-white/10 p-4 bg-white/1">{children}</div>}
      </div>
    );
  };

  const quickPrompts = [
    "Draft Organization Schema",
    "Rewrite case study title to boost CTR",
    "Optimize E-E-A-T credentials",
    "How to fix orphan pages"
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">AI SEO Assistant</h2>
          <p className="text-slate-400 text-sm mt-1">Simulate expert SEO diagnostics and conversational audit suggestions</p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("optimizer")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "optimizer" ? "bg-[#FFC300] text-[#1C1B1A]" : "text-slate-400 hover:text-white"}`}
          >
            Page Optimizer
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "chat" ? "bg-[#FFC300] text-[#1C1B1A]" : "text-slate-400 hover:text-white"}`}
          >
            Conversational Assistant
          </button>
        </div>
      </div>

      {activeTab === "optimizer" ? (
        <>
          {/* Page selector */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 block">Select a Page to Optimize</label>
            <div className="flex gap-3 flex-wrap">
              <select
                value={selectedPage?.id || ""}
                onChange={(e) => {
                  const page = pages.find((p) => p.id === e.target.value) || null;
                  setSelectedPage(page);
                  setRecs({});
                }}
                className="flex-1 min-w-48 px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFC300]/30"
                disabled={loadingPages}
              >
                <option value="">— Select a page —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.type.toUpperCase()} · {p.title || p.url}</option>
                ))}
              </select>
              <button
                onClick={generateAll}
                disabled={!selectedPage || generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] font-black text-sm hover:bg-[#FFD60A] transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(255,195,0,0.3)]"
              >
                <Zap className={`w-4 h-4 ${generating ? "animate-pulse" : ""}`} />
                {generating ? "Generating..." : "Optimize Entire Page"}
              </button>
            </div>

            {selectedPage && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: "Word Count", value: selectedPage.wordCount || "—" },
                  { label: "Has FAQ", value: selectedPage.hasFaq ? "✓ Yes" : "✗ No" },
                  { label: "Has Schema", value: selectedPage.hasSchema ? "✓ Yes" : "✗ No" },
                  { label: "URL", value: selectedPage.url },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-white/5">
                    <p className="text-slate-500 mb-1">{item.label}</p>
                    <p className="font-bold text-white truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations list */}
          {Object.keys(recs).length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#FFC300]" />
                <h3 className="font-black text-white">AI-Generated Recommendations</h3>
              </div>

              {recs.title && (
                <RecommendationBlock id="title" icon={FileText} label="Optimized Meta Title" color="#FFC300">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white bg-white/5 border border-white/10 rounded-xl p-3 flex-1">{recs.title}</p>
                    <button onClick={() => handleCopy("title", recs.title!)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#FFC300] transition-colors px-3 py-2 rounded-lg hover:bg-[#FFC300]/10 flex-shrink-0">
                      {copied.title ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{recs.title.length} chars · Optimal range: 50-60</p>
                </RecommendationBlock>
              )}

              {recs.description && (
                <RecommendationBlock id="description" icon={FileText} label="Optimized Meta Description" color="#8b5cf6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white bg-white/5 border border-white/10 rounded-xl p-3 flex-1">{recs.description}</p>
                    <button onClick={() => handleCopy("description", recs.description!)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#FFC300] transition-colors px-3 py-2 rounded-lg hover:bg-[#FFC300]/10 flex-shrink-0">
                      {copied.description ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{recs.description.length} chars · Optimal range: 140-160</p>
                </RecommendationBlock>
              )}

              {recs.faqs && recs.faqs.length > 0 && (
                <RecommendationBlock id="faqs" icon={HelpCircle} label={`Generated FAQs (${recs.faqs.length} questions)`} color="#3b82f6">
                  <div className="space-y-3">
                    {recs.faqs.map((faq, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-xs font-black text-[#FFC300] mb-1">Q: {faq.question}</p>
                        <p className="text-xs text-slate-300">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </RecommendationBlock>
              )}

              {recs.improvements && (
                <RecommendationBlock id="improvements" icon={TrendingUp} label="Content Improvement Plan" color="#10b981">
                  <ol className="space-y-2">
                    {recs.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {imp}
                      </li>
                    ))}
                  </ol>
                </RecommendationBlock>
              )}

              {recs.eeat && (
                <RecommendationBlock id="eeat" icon={Code2} label="E-E-A-T Improvement Checklist" color="#ec4899">
                  <ol className="space-y-2">
                    {recs.eeat.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </RecommendationBlock>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-white/3 border border-white/10">
              <Bot className="w-16 h-16 text-slate-600 mb-4" />
              <p className="text-xl font-black text-white">AI SEO Assistant Ready</p>
              <p className="text-slate-500 mt-2">Select a page above and click &ldquo;Optimize Entire Page&rdquo; to generate comprehensive recommendations</p>
            </div>
          )}
        </>
      ) : (
        /* Interactive Conversational Assistant Chat Pane */
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between min-h-[460px]">
          {/* Chat Window */}
          <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-[#FFC300] text-[#1C1B1A]" : "bg-white/10 text-white"}`}>
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#FFC300]" />}
                </div>
                <div className={`p-3 rounded-xl text-xs max-w-[70%] whitespace-pre-line ${m.role === "user" ? "bg-[#FFC300]/10 text-white border border-[#FFC300]/20" : "bg-white/5 text-slate-300 border border-white/5"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Bot className="w-4 h-4 animate-bounce text-[#FFC300]" />
                Assistant is scanning guidelines...
              </div>
            )}
          </div>

          {/* Quick prompt ideas */}
          <div className="border-t border-white/5 pt-3 mb-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Recommended Prompts</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all text-xs font-semibold"
                >
                  <Sparkles className="w-3 h-3 text-[#FFC300]" /> {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input field */}
          <div className="flex gap-2">
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
              placeholder="Ask the AI Assistant a question (e.g. 'Draft meta description for Services')..."
              className="flex-1 px-3 py-2.5 bg-[#1C1B1A] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#FFC300]/30"
            />
            <button
              onClick={() => handleSendMessage()}
              className="p-2.5 rounded-xl bg-[#FFC300] text-[#1C1B1A] hover:bg-[#FFD60A] transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

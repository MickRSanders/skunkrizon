import { useState, useRef, useCallback, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

type Msg = { role: "user" | "assistant"; content: string };
type CreatedSim = { id: string; sim_code: string; employee_name: string };
type CreatedPolicy = { id: string; name: string; status: string; tier: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const STORAGE_KEY = "ai-chat-history";

const SUGGESTIONS = [
  "What policies do I have?",
  "Summarize my active simulations",
  "Create a new Gold Tier assignment policy",
  "Create a simulation for John Smith relocating from US to Germany",
];

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createdSims, setCreatedSims] = useState<CreatedSim[]>([]);
  const [createdPolicies, setCreatedPolicies] = useState<CreatedPolicy[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { activeTenant } = useTenantContext();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, createdSims, createdPolicies]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* storage full or unavailable */ }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCreatedSims([]);
    setCreatedPolicies([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const userMsg: Msg = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsLoading(true);

      let assistantSoFar = "";
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          upsert("You must be logged in to use the AI assistant.");
          setIsLoading(false);
          return;
        }

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: newMessages,
            includeContext: messages.length === 0,
            tenant_id: activeTenant?.tenant_id || null,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Request failed" }));
          upsert(err.error || "Something went wrong. Please try again.");
          setIsLoading(false);
          return;
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;
        let currentEvent = "";

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            // Track SSE event type
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
              continue;
            }

            if (line.startsWith(":") || line.trim() === "") {
              if (line.trim() === "") currentEvent = "";
              continue;
            }
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();

            // Handle custom simulation_created event
            if (currentEvent === "simulation_created") {
              try {
                const simData = JSON.parse(jsonStr) as CreatedSim;
                setCreatedSims((prev) => [...prev, simData]);
              } catch { /* ignore */ }
              currentEvent = "";
              continue;
            }

            if (currentEvent === "policy_created") {
              try {
                const polData = JSON.parse(jsonStr) as CreatedPolicy;
                setCreatedPolicies((prev) => [...prev, polData]);
              } catch { /* ignore */ }
              currentEvent = "";
              continue;
            }

            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsert(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsert(content);
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        console.error("Chat error:", e);
        upsert("Sorry, I encountered an error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const goToSimulation = (simId: string) => {
    setOpen(false);
    navigate(`/simulations?highlight=${simId}`);
  };

  const goToPolicy = (policyId: string) => {
    setOpen(false);
    navigate(`/policies?highlight=${policyId}`);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105",
          "bg-primary text-primary-foreground",
          open && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-4rem)] rounded-2xl shadow-2xl border border-border bg-card flex flex-col transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border rounded-t-2xl bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Assistant</p>
              <p className="text-xs text-muted-foreground">Ask about policies, tax & simulations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Bot className="w-4 h-4" />
                <span>How can I help you today?</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center mt-1">
                  <User className="w-3 h-3 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Simulation created cards */}
          {createdSims.map((sim) => (
            <div key={sim.id} className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <button
                onClick={() => goToSimulation(sim.id)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-foreground text-left"
              >
                <div>
                  <p className="font-medium text-primary">{sim.sim_code}</p>
                  <p className="text-xs text-muted-foreground">{sim.employee_name} — Draft created</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              </button>
            </div>
          ))}

          {/* Policy created cards */}
          {createdPolicies.map((pol) => (
            <div key={pol.id} className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-1">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <button
                onClick={() => goToPolicy(pol.id)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors text-foreground text-left"
              >
                <div>
                  <p className="font-medium text-accent">{pol.name}</p>
                  <p className="text-xs text-muted-foreground">{pol.tier} tier — {pol.status}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              </button>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 items-center">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-24"
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

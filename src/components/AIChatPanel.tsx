import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Mic, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AIChatPanelProps {
  onAIResponse: (placeNames: string[]) => void;
  isProcessing: boolean;
}

export default function AIChatPanel({ onAIResponse, isProcessing }: AIChatPanelProps) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const askAI = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg = text.trim();
      setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
      setQuery("");
      setLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("tour-guide-ai", {
          body: {
            messages: [{ role: "user", content: userMsg }],
          },
        });

        if (error) throw error;
        const content = data.choices?.[0]?.message?.content || "[]";

        // Parse place names from response
        let placeNames: string[] = [];
        try {
          const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          placeNames = JSON.parse(cleaned);
        } catch {
          // Try extracting names from text
          placeNames = content
            .split("\n")
            .map((l: string) => l.replace(/^\d+\.\s*/, "").replace(/["\[\]]/g, "").trim())
            .filter((l: string) => l.length > 2)
            .slice(0, 5);
        }

        const aiText = `Here are my top recommendations:\n${placeNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}`;
        setMessages((prev) => [...prev, { role: "ai", text: aiText }]);

        if (placeNames.length > 0) {
          onAIResponse(placeNames);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: "Sorry, I couldn't process that request. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, onAIResponse]
  );

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Speech recognition is not supported in your browser." },
      ]);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      askAI(transcript);
    };

    recognition.start();
  }, [listening, askAI]);

  const speakText = useCallback(
    (text: string) => {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text.replace(/\d+\.\s*/g, ""));
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [speaking]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p className="font-display text-base mb-1">Ask me anything! 🗺️</p>
            <p className="text-xs">Try: "Best temples near me" or "Parks to visit nearby"</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.role === "ai" && (
                  <button
                    onClick={() => speakText(msg.text)}
                    className="mt-1 text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    {speaking ? "Stop" : "Listen"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {(loading || isProcessing) && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isProcessing ? "Searching places..." : "Thinking..."}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <button
            onClick={handleVoiceInput}
            className={`shrink-0 p-2.5 rounded-lg border transition-all ${
              listening
                ? "bg-primary text-primary-foreground border-primary voice-active"
                : "bg-secondary text-secondary-foreground border-border hover:border-primary/40"
            }`}
            title="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI(query)}
            placeholder="Ask about places..."
            className="flex-1 bg-secondary text-foreground text-sm rounded-lg px-3 py-2.5 border border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground"
          />
          <button
            onClick={() => askAI(query)}
            disabled={!query.trim() || loading}
            className="shrink-0 p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:brightness-110"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

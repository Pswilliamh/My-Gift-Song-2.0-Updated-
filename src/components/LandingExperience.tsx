import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Send,
  Sparkles,
  Gift,
  ArrowRight,
  Disc,
  Mic,
  CheckCircle2,
  Crown,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  id: string;
  sender: "haddi" | "user";
  text: string;
  timestamp: string;
}

interface LandingExperienceProps {
  freeSongsRemaining: number;
  referralCount: number;
  audioSource: string | null;
  lyriaAudioUrl: string | null;
  narrationAudioUrl: string | null;
  activeTrackType: "lyria" | "narration";
  onSelectTrackType: (type: "lyria" | "narration") => void;
  isPlayingDemo: boolean;
  onToggleDemoPlayback: () => void;
  onInitiateSystem: (prefill?: {
    target?: string;
    context?: string;
    genre?: string;
    autoGenerate?: boolean;
    initialSection?: "studio" | "free-songs" | "lifetime" | "affiliate";
  }) => void;
}

export const LandingExperience: React.FC<LandingExperienceProps> = ({
  freeSongsRemaining,
  referralCount,
  audioSource,
  lyriaAudioUrl,
  narrationAudioUrl,
  activeTrackType,
  onSelectTrackType,
  isPlayingDemo,
  onToggleDemoPlayback,
  onInitiateSystem,
}) => {
  // Chat flow state for "Create Your First Gift Song"
  const [recipientInput, setRecipientInput] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Acoustic Folk");
  const [chatStep, setChatStep] = useState<"recipient" | "story" | "ready">("recipient");
  const [chatInput, setChatInput] = useState("");
  const [volume, setVolume] = useState(85);
  const [muted, setMuted] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "haddi",
      text: "Selamat datang, my friend! I'm Haddi the Street Minstrel. Welcome to my acoustic sanctuary.",
      timestamp: "Just now",
    },
    {
      id: "welcome-2",
      sender: "haddi",
      text: `Your first ${freeSongsRemaining} custom gift songs are 100% FREE. Who are we blessing with your first gift song today? (e.g., "My daughter Maya", "Mom & Dad", "Best friend David")`,
      timestamp: "Just now",
    },
  ]);

  // Auto-scroll chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate progress bar when demo Lute is playing and no HTML5 audio element is active
  useEffect(() => {
    if (!isPlayingDemo || audioSource) return;
    const timer = window.setInterval(() => {
      setDemoProgress((prev) => (prev >= 100 ? 0 : prev + 1.5));
    }, 500);
    return () => clearInterval(timer);
  }, [isPlayingDemo, audioSource]);

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    if (chatStep === "recipient") {
      setRecipientInput(trimmed);
      setChatStep("story");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `A song for ${trimmed}—what an honor! Tell me the occasion, a favorite memory, or the blessing you want me to sing for ${trimmed}.`,
            timestamp: "Just now",
          },
        ]);
      }, 350);
    } else if (chatStep === "story") {
      setStoryInput(trimmed);
      setChatStep("ready");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `Beautiful! I have the silver strings tuned for ${recipientInput}. Click "Create My First Gift Song" below to initiate the full studio and render your track!`,
            timestamp: "Just now",
          },
        ]);
      }, 350);
    } else {
      setStoryInput((prev) => `${prev}. ${trimmed}`);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `I've woven that detail into the lyrics for ${recipientInput || "your loved one"}. Ready whenever you are!`,
            timestamp: "Just now",
          },
        ]);
      }, 350);
    }
  };

  const handleQuickPrompt = (recipient: string, story: string, genre: string) => {
    setRecipientInput(recipient);
    setStoryInput(story);
    setSelectedGenre(genre);
    setChatStep("ready");
    setMessages([
      {
        id: "welcome-1",
        sender: "haddi",
        text: "Selamat datang, my friend! I'm Haddi the Street Minstrel. Welcome to my acoustic sanctuary.",
        timestamp: "Just now",
      },
      {
        id: `user-quick-${Date.now()}`,
        sender: "user",
        text: `I'd love a ${genre} song for ${recipient}: "${story}"`,
        timestamp: "Just now",
      },
      {
        id: `haddi-quick-${Date.now() + 1}`,
        sender: "haddi",
        text: `Wonderful choice! My guitar is tuned for ${recipient}. Click the golden button below to initiate the studio and create your free gift song!`,
        timestamp: "Just now",
      },
    ]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative z-10 px-4 sm:px-8 py-6 max-w-6xl mx-auto">
      {/* Minimal Clean Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#C5A880]/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#C5A880] flex items-center justify-center text-black font-bold shadow-[0_0_20px_rgba(255,215,0,0.25)]">
            <Music size={20} />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-wide text-[#FAF9F6] block leading-none">
              mygiftsong.ai
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5A880]">
              Haddi the Street Minstrel
            </span>
          </div>
        </div>

        {/* Clean Status & Initiate Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-mono hover:bg-[#FFD700]/20 transition-all cursor-pointer"
          >
            <Gift size={13} />
            <span>{freeSongsRemaining} of 5 Free Songs Left</span>
          </button>

          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "studio" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF9F6]/10 hover:bg-[#FFD700] text-[#FAF9F6] hover:text-black border border-[#C5A880]/30 text-xs font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            <span>Enter Full Studio</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Clutter-Free Center Stage: Haddi Media Player + Welcome Chat Window */}
      <main className="my-auto py-8 md:py-12">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-[#FFD700]">
            Custom Acoustic & Studio Gift Songs
          </p>
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-[#FAF9F6] tracking-tight leading-tight">
            Turn Your Heartfelt Story Into a{" "}
            <span className="text-[#FFD700] italic font-serif">Playable Gift Song</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* LEFT COLUMN: HADDI MEDIA PLAYER (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 bg-[#120e0c]/90 border border-[#C5A880]/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md"
          >
            <div className="space-y-5">
              {/* Top Media Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#C5A880] font-semibold">
                    Haddi Media Player
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 px-2.5 py-0.5 rounded">
                  Lyria 3 + Acoustic Voice
                </span>
              </div>

              {/* Haddi Visual Portrait & Acoustic Vinyl Showcase */}
              <div className="relative rounded-xl overflow-hidden border border-[#C5A880]/25 bg-gradient-to-b from-[#1f1814] to-[#0d0a08] p-6 text-center">
                <div className="relative mx-auto w-28 h-28 rounded-full border-2 border-[#FFD700]/70 overflow-hidden shadow-[0_0_30px_rgba(255,215,0,0.2)] mb-4">
                  <img
                    src="/haddi-portrait.jpg"
                    alt="Haddi the Street Minstrel"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className=" inset-0 flex items-center justify-center bg-[#1c1510] -z-10">
                    <Disc
                      size={44}
                      className={`text-[#FFD700] ${isPlayingDemo ? "animate-spin" : ""}`}
                    />
                  </div>
                </div>

                <h2 className="font-display text-lg font-bold text-[#FAF9F6]">
                  {audioSource ? "Your Custom Gift Song" : "The Sound of Honor & Covenant"}
                </h2>
                <p className="text-xs text-[#C5A880] font-sans mt-0.5">
                  {audioSource
                    ? "Rendered in Studio • Ready to Share"
                    : "Sample Serenade • Performed by Haddi"}
                </p>

                {/* Animated Audio Waveform Bars */}
                <div className="flex items-end justify-center gap-1.5 h-8 mt-4">
                  {[40, 75, 55, 95, 65, 85, 50, 90, 60, 80, 45, 70].map((height, idx) => (
                    <div
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlayingDemo ? "bg-[#FFD700] visualizer-pillar" : "bg-[#C5A880]/30"
                      }`}
                      style={{
                        height: isPlayingDemo ? `${height}%` : "25%",
                        animationDelay: `${idx * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Dual Engine Mode Switcher if both tracks exist */}
              {(lyriaAudioUrl || narrationAudioUrl) && (
                <div className="grid grid-cols-2 gap-2 bg-black/50 p-1 rounded-xl border border-[#C5A880]/20">
                  <button
                    type="button"
                    onClick={() => onSelectTrackType("lyria")}
                    disabled={!lyriaAudioUrl}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      activeTrackType === "lyria"
                        ? "bg-[#FFD700] text-black"
                        : "text-white/70 hover:text-white disabled:opacity-40"
                    }`}
                  >
                    🎸 Lyria 3 Sung Song
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTrackType("narration")}
                    disabled={!narrationAudioUrl}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      activeTrackType === "narration"
                        ? "bg-[#FFD700] text-black"
                        : "text-white/70 hover:text-white disabled:opacity-40"
                    }`}
                  >
                    🎙️ Haddi Voice
                  </button>
                </div>
              )}

              {/* Audio Player Controls */}
              {audioSource ? (
                <div className="bg-black/60 rounded-xl p-3 border border-[#C5A880]/20">
                  <audio
                    ref={audioRef}
                    controls
                    src={audioSource}
                    className="w-full h-10 accent-[#FFD700]"
                  />
                </div>
              ) : (
                <div className="bg-black/60 rounded-xl p-4 border border-[#C5A880]/20 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={onToggleDemoPlayback}
                      className="w-12 h-12 rounded-full bg-[#FFD700] hover:brightness-110 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
                      title={isPlayingDemo ? "Pause Sample" : "Play Haddi Acoustic Sample"}
                    >
                      {isPlayingDemo ? (
                        <Pause size={20} fill="black" />
                      ) : (
                        <Play size={20} fill="black" className="ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-[#C5A880]">
                        <span>{isPlayingDemo ? "Strumming Silver Strings..." : "Listen to Haddi's Guitar"}</span>
                        <span>78 BPM</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FFD700] transition-all duration-300"
                          style={{ width: `${isPlayingDemo ? Math.max(15, demoProgress) : 0}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMuted(!muted)}
                      className="text-[#C5A880] hover:text-white transition-colors cursor-pointer"
                    >
                      {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Program Highlights Footer inside Player Card */}
            <div className="pt-5 mt-5 border-t border-[#C5A880]/15 grid grid-cols-3 gap-2 text-center">
              <button
                type="button"
                onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
                className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-[#C5A880]/15 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#FFD700]">5 Free Songs</p>
                <p className="text-[10px] text-white/60">No card needed</p>
              </button>
              <button
                type="button"
                onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
                className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-[#C5A880]/15 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#FFD700]">Lifetime Account</p>
                <p className="text-[10px] text-white/60">10 $0.99 or 10 Premium</p>
              </button>
              <button
                type="button"
                onClick={() => onInitiateSystem({ initialSection: "affiliate" })}
                className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-[#C5A880]/15 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#FFD700]">Affiliate Hub</p>
                <p className="text-[10px] text-white/60">One-Time Premium Comm.</p>
              </button>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: WELCOME CHAT WINDOW — CREATE YOUR FIRST GIFT SONG (7 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="lg:col-span-7 bg-[#120e0c]/90 border border-[#C5A880]/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md"
          >
            {/* Chat Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#C5A880]/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#251e19] border border-[#FFD700] flex items-center justify-center text-[#FFD700] font-serif font-bold">
                    H
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#120e0c]" />
                </div>
                <div>
                  <h2 className="text-base font-display font-bold text-[#FAF9F6]">
                    Welcome Chat • Create Your First Gift Song
                  </h2>
                  <p className="text-xs text-[#C5A880]">
                    Chat with Haddi to start your song — First 5 songs are free
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                <Sparkles size={12} /> {freeSongsRemaining}/5 Free Songs Available
              </span>
            </div>

            {/* Chat Conversation Feed */}
            <div
              ref={chatContainerRef}
              className="my-4 space-y-3 max-h-[250px] min-h-[210px] overflow-y-auto pr-1"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[#FFD700] text-black font-medium rounded-br-xs"
                          : "bg-[#1e1814] text-[#FAF9F6] border border-[#C5A880]/25 rounded-bl-xs"
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Quick Idea Starters */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880]/70 mr-1">
                  Quick Starters:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Mom",
                      "Thank you for your endless prayers, warm hugs, and guiding light through every season.",
                      "Acoustic Folk"
                    )
                  }
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-black/50 hover:bg-[#FFD700]/15 text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/20 transition-colors cursor-pointer"
                >
                  💐 For Mom
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "My Beloved Partner",
                      "Celebrating our anniversary, every laugh we share, and walking hand in hand forever.",
                      "Indie Pop"
                    )
                  }
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-black/50 hover:bg-[#FFD700]/15 text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/20 transition-colors cursor-pointer"
                >
                  💍 Anniversary Gift
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "Baby Grace",
                      "Welcome to the world little miracle, may your life be filled with joy, peace, and wonder.",
                      "Modern Worship"
                    )
                  }
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-black/50 hover:bg-[#FFD700]/15 text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/20 transition-colors cursor-pointer"
                >
                  👶 New Baby Blessing
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPrompt(
                      "David",
                      "Happy birthday brother! Grateful for decades of loyalty, courage, and unforgettable memories.",
                      "Bluegrass"
                    )
                  }
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-black/50 hover:bg-[#FFD700]/15 text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/20 transition-colors cursor-pointer"
                >
                  🎂 Best Friend Birthday
                </button>
              </div>

              {/* Chat Input Row */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    chatStep === "recipient"
                      ? "Type who the gift song is for (e.g. Sarah)..."
                      : "Type a special memory, occasion, or blessing..."
                  }
                  className="flex-1 bg-black/70 border border-[#C5A880]/35 focus:border-[#FFD700] rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-3 rounded-xl bg-[#251e19] hover:bg-[#332922] text-[#FFD700] border border-[#FFD700]/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Reply</span>
                  <Send size={14} />
                </button>
              </form>

              {/* Primary System Initiation CTA Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const finalRecipient = recipientInput || chatInput.trim() || "Someone Special";
                    const finalStory =
                      storyInput ||
                      (recipientInput && chatInput.trim() ? chatInput.trim() : "") ||
                      `A heartfelt acoustic blessing song dedicated to ${finalRecipient}.`;
                    onInitiateSystem({
                      target: finalRecipient,
                      context: finalStory,
                      genre: selectedGenre,
                      autoGenerate: Boolean(recipientInput || chatInput.trim()),
                      initialSection: "studio",
                    });
                  }}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#FCE068] to-[#FFD700] hover:brightness-110 text-black font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,215,0,0.25)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>
                    {recipientInput
                      ? `Create ${recipientInput}'s Gift Song Now (Free)`
                      : "Create Your First Gift Song & Initiate Studio"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Clean Minimal Footer with Direct Links to Separate System Sections */}
      <footer className="pt-4 border-t border-[#C5A880]/15 flex flex-wrap items-center justify-between gap-4 text-xs text-[#C5A880]/70 font-mono">
        <span>© 2026 mygiftsong.ai • Haddi the Street Minstrel</span>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
            className="hover:text-[#FFD700] transition-colors cursor-pointer"
          >
            🎁 First 5 Songs Free
          </button>
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
            className="hover:text-[#FFD700] transition-colors cursor-pointer"
          >
            👑 Invite 10 = Lifetime License
          </button>
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "affiliate" })}
            className="hover:text-[#FFD700] transition-colors cursor-pointer"
          >
            🤝 Affiliate Program
          </button>
        </div>
      </footer>
    </div>
  );
};

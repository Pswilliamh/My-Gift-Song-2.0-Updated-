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
  Video,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PWAInstallButton } from "./PWAInstallButton";

interface ChatMessage {
  id: string;
  sender: "haddi" | "user";
  text: string;
  timestamp: string;
}

interface LandingExperienceProps {
  freeSongsRemaining: number;
  referralCount: number;
  adminEmail?: string;
  onResetFreeSongs?: () => void;
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
    initialSection?: "studio" | "free-songs" | "lifetime" | "affiliate" | "admin";
  }) => void;
}

export const LandingExperience: React.FC<LandingExperienceProps> = ({
  freeSongsRemaining,
  adminEmail,
  onResetFreeSongs,
  audioSource,
  lyriaAudioUrl,
  narrationAudioUrl,
  activeTrackType,
  onSelectTrackType,
  onInitiateSystem,
}) => {
  // Chat flow state for "Create Your First Gift Song"
  const [recipientInput, setRecipientInput] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Acoustic Folk");
  const [chatStep, setChatStep] = useState<"recipient" | "story" | "ready">("recipient");
  const [chatInput, setChatInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Haddi Video Player state
  const [selectedVideo, setSelectedVideo] = useState<"flagship" | "encore">("flagship");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoSources = {
    flagship: {
      src: "/video/song-gift.mp4",
      title: "Haddi Performing: The Gift of a Song",
      subtitle: "Live Street Minstrel Performance • Jakarta Acoustic Corner",
    },
    encore: {
      src: "/video/premium-preview.mp4",
      title: "Haddi Encore: Acoustic Blessing Serenade",
      subtitle: "Custom Gift Song Video Showcase • Performed by Haddi",
    },
  };

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

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "welcome-2"
          ? {
              ...m,
              text: `Your first ${freeSongsRemaining} custom gift songs are 100% FREE. Who are we blessing with your first gift song today? (e.g., "My daughter Maya", "Mom & Dad", "Best friend David")`,
            }
          : m
      )
    );
  }, [freeSongsRemaining]);

  // Auto-scroll chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleToggleVideoPlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.muted = false;
      setIsVideoMuted(false);
      vid.play().catch((err) => {
        console.warn("Video play fallback:", err);
      });
    } else {
      vid.pause();
    }
  };

  const handleToggleVideoMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const nextMute = !vid.muted;
    vid.muted = nextMute;
    setIsVideoMuted(nextMute);
  };

  const handleRestartVideo = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    vid.muted = false;
    setIsVideoMuted(false);
    vid.play().catch(console.warn);
  };

  const handleSwitchVideo = (type: "flagship" | "encore") => {
    setSelectedVideo(type);
    setIsVideoPlaying(false);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.load();
      }
    }, 50);
  };

  const [secretClicks, setSecretClicks] = useState(0);

  const handleCopyrightClick = () => {
    const next = secretClicks + 1;
    if (next >= 5) {
      setSecretClicks(0);
      onInitiateSystem({ initialSection: "admin" });
    } else {
      setSecretClicks(next);
    }
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    // Secret hidden admin login trigger via chat input
    const lower = trimmed.toLowerCase();
    if (lower === "/admin" || lower === "pswilliamh@gmail.com" || lower === "admin:pswilliamh") {
      setChatInput("");
      onInitiateSystem({ initialSection: "admin" });
      return;
    }

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
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col justify-between relative z-10 px-4 sm:px-8 py-6 max-w-6xl mx-auto">
      {/* Minimal Clean Top Header on White Background */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img
            src="/pwa-192x192.png"
            alt="mygiftsong.ai App Icon"
            className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
          />
          <div>
            <span className="font-display text-lg font-bold tracking-wide text-slate-900 block leading-none">
              mygiftsong.ai
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-700 font-semibold">
              Haddi the Street Minstrel
            </span>
          </div>
        </div>

        {/* Clean Status, Android/Desktop PWA Install & Initiate Button */}
        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton variant="light" />

          <div className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-300 overflow-hidden">
            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-amber-900 text-xs font-mono font-semibold hover:bg-amber-100 transition-all cursor-pointer"
            >
              <Gift size={14} className="text-amber-600" />
              <span>{freeSongsRemaining} of 5 Free Songs Left</span>
            </button>
            {freeSongsRemaining < 5 && onResetFreeSongs && (
              <button
                type="button"
                onClick={onResetFreeSongs}
                className="px-2.5 py-2 bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-[11px] font-mono font-bold border-l border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset Free Song Pass back to 5/5"
              >
                <RotateCcw size={12} />
                <span>Reset 5/5</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "studio" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 text-xs font-mono font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <span>Enter Full Studio</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Main Clutter-Free Center Stage: Haddi Video Player + Welcome Chat Window */}
      <main className="my-auto py-8 md:py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-amber-700 font-bold">
            Custom Acoustic & Studio Gift Songs
          </p>
          <h1 className="text-3xl sm:text-5xl font-display font-bold text-slate-900 tracking-tight leading-tight">
            Turn Your Heartfelt Story Into a{" "}
            <span className="text-amber-600 italic font-serif">Playable Gift Song</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* LEFT COLUMN: HADDI VIDEO MEDIA PLAYER (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-slate-200/70"
          >
            <div className="space-y-4">
              {/* Top Media Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-800 font-bold">
                    Haddi Video Player
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Video size={11} className="text-amber-600" />
                  Haddi Playing Song
                </span>
              </div>

              {/* Video Performance Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSwitchVideo("flagship")}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    selectedVideo === "flagship"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎬 Haddi Flagship Song
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchVideo("encore")}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    selectedVideo === "encore"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎸 Encore Song Video
                </button>
              </div>

              {/* Haddi Video Player Showcase */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md aspect-video group">
                <video
                  ref={videoRef}
                  src={videoSources[selectedVideo].src}
                  poster="/images/guiter-rescaled-9music.png"
                  controls
                  playsInline
                  preload="metadata"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  className="w-full h-full object-cover"
                />

                {/* Play Overlay Button when Paused */}
                {!isVideoPlaying && (
                  <button
                    type="button"
                    onClick={handleToggleVideoPlay}
                    className="absolute inset-0 bg-black/35 hover:bg-black/25 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                    title="Watch & Listen to Haddi Playing Song"
                  >
                    <div className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.7)] transition-transform hover:scale-105 active:scale-95">
                      <Play size={28} fill="currentColor" className="ml-1" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-black/75 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-amber-400/40">
                      Watch Haddi Play Song
                    </span>
                  </button>
                )}
              </div>

              {/* Video Title & Quick Controls Bar */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-900 truncate">
                    {videoSources[selectedVideo].title}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-sans truncate">
                    {videoSources[selectedVideo].subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleVideoPlay}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    {isVideoPlaying ? (
                      <>
                        <Pause size={13} fill="currentColor" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVideoMute}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    title={isVideoMuted ? "Unmute Video" : "Mute Video"}
                  >
                    {isVideoMuted ? <VolumeX size={15} className="text-red-500" /> : <Volume2 size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleRestartVideo}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    title="Restart Video"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>

              {/* Official Minstrel Quote Banner */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-3.5 py-2.5 text-center">
                <p className="text-[11px] text-amber-900 font-mono font-bold uppercase tracking-wide leading-relaxed">
                  "There is no greater gift than a song... it is worth more than a thousand words!"
                </p>
              </div>

              {/* Custom Generated Audio Player (Only appears if a user has already rendered a custom track) */}
              {audioSource && (
                <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-900">
                      Your Rendered Gift Song Audio
                    </span>
                    {(lyriaAudioUrl || narrationAudioUrl) && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectTrackType("lyria")}
                          disabled={!lyriaAudioUrl}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            activeTrackType === "lyria"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-white text-slate-600 border border-slate-200 disabled:opacity-40"
                          }`}
                        >
                          Lyria 3 Song
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectTrackType("narration")}
                          disabled={!narrationAudioUrl}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            activeTrackType === "narration"
                              ? "bg-amber-500 text-slate-950"
                              : "bg-white text-slate-600 border border-slate-200 disabled:opacity-40"
                          }`}
                        >
                          Haddi Voice
                        </button>
                      </div>
                    )}
                  </div>
                  <audio controls src={audioSource} className="w-full h-9 accent-amber-500" />
                </div>
              )}
            </div>

            {/* Subtle Program Highlights Footer inside Player Card */}
            <div className="pt-4 mt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
              <button
                type="button"
                onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
                className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-amber-700">5 Free Songs</p>
                <p className="text-[10px] text-slate-600">No card needed</p>
              </button>
              <button
                type="button"
                onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
                className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-amber-700">Lifetime Account</p>
                <p className="text-[10px] text-slate-600">10 $0.99 or 10 Premium</p>
              </button>
              <button
                type="button"
                onClick={() => onInitiateSystem({ initialSection: "affiliate" })}
                className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-amber-700">Affiliate Hub</p>
                <p className="text-[10px] text-slate-600">One-Time Premium Comm.</p>
              </button>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: WELCOME CHAT WINDOW — CREATE YOUR FIRST GIFT SONG (7 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-slate-200/70"
          >
            {/* Chat Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-800 font-serif font-bold">
                    H
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <h2 className="text-base font-display font-bold text-slate-900">
                    Welcome Chat • Create Your First Gift Song
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chat with Haddi to start your song — First 5 songs are free
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                <Sparkles size={12} className="text-emerald-600" /> {freeSongsRemaining}/5 Free Songs Available
              </span>
            </div>

            {/* Chat Conversation Feed */}
            <div
              ref={chatContainerRef}
              className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 max-h-[260px] min-h-[220px] overflow-y-auto"
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
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-2xs ${
                        msg.sender === "user"
                          ? "bg-amber-500 text-slate-950 font-medium rounded-br-xs"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
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
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mr-1">
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
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
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
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
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
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
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
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
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
                  className="flex-1 bg-white border border-slate-300 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
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
                  className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
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
      <footer className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-mono">
        <span
          onClick={handleCopyrightClick}
          className="select-none cursor-default"
        >
          © 2026 mygiftsong.ai • Haddi the Street Minstrel
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
            className="text-slate-600 hover:text-amber-700 font-semibold transition-colors cursor-pointer"
          >
            🎁 First 5 Songs Free
          </button>
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
            className="text-slate-600 hover:text-amber-700 font-semibold transition-colors cursor-pointer"
          >
            👑 Invite 10 = Lifetime License
          </button>
          <button
            type="button"
            onClick={() => onInitiateSystem({ initialSection: "affiliate" })}
            className="text-slate-600 hover:text-amber-700 font-semibold transition-colors cursor-pointer"
          >
            🤝 Affiliate Program
          </button>
        </div>
      </footer>
    </div>
  );
};

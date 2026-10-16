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
  ShieldCheck,
  Globe,
  Smile,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PWAInstallButton } from "./PWAInstallButton";
import { YosiaChildrenSection, SUPPORTED_SONG_LANGUAGES } from "./YosiaChildrenSection";
import { SongData, SetType } from "../types";

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
  oneTimeRedoUsed?: boolean;
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
    language?: string;
    setType?: SetType;
    artistPersona?: "haddi" | "yosia";
    preloadedSong?: SongData;
    autoGenerate?: boolean;
    initialSection?: "studio" | "yosia-kids" | "free-songs" | "lifetime" | "affiliate" | "admin";
  }) => void;
}

export const LandingExperience: React.FC<LandingExperienceProps> = ({
  freeSongsRemaining,
  adminEmail,
  oneTimeRedoUsed = false,
  audioSource,
  lyriaAudioUrl,
  narrationAudioUrl,
  activeTrackType,
  onSelectTrackType,
  onInitiateSystem,
}) => {
  // Separate Page View State:
  // "haddi-main" = Original main focus on Haddi
  // "yosia-children" = Separate page for Children's Songs with Haddi's little brother Yosia
  const [activeLandingPage, setActiveLandingPage] = useState<"haddi-main" | "yosia-children">("haddi-main");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 3-Step Chat & Song Builder state:
  // Step 1: Who the song is for (recipient)
  // Step 2: What's the occasion (occasion)
  // Step 3: What words / lyrics are wanted (lyricsWanted)
  const [recipientInput, setRecipientInput] = useState("");
  const [occasionInput, setOccasionInput] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Acoustic Folk");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedSetType, setSelectedSetType] = useState<SetType>("full");
  const [selectedPersona, setSelectedPersona] = useState<"haddi" | "yosia">("haddi");
  const [chatStep, setChatStep] = useState<"recipient" | "occasion" | "lyrics" | "ready">("recipient");
  const [chatInput, setChatInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Haddi Video Player state
  const [selectedVideo, setSelectedVideo] = useState<"flagship" | "encore">("flagship");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Yosia Video Player state (underneath Haddi's media player)
  const [isYosiaPlaying, setIsYosiaPlaying] = useState(false);
  const [isYosiaMuted, setIsYosiaMuted] = useState(false);
  const yosiaVideoRef = useRef<HTMLVideoElement | null>(null);

  const videoSources = {
    flagship: {
      src: "/video/song-gift.mp4",
      title: "Haddi Performing: The Gift of a Song",
      subtitle: "mygiftsong.org • AI Assisted Song Generator Showcase",
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
      text: "Selamat datang, my friend! Welcome to mygiftsong.org — your AI assisted song generator with Haddi the Street Minstrel.",
      timestamp: "Just now",
    },
    {
      id: "welcome-2",
      sender: "haddi",
      text: `Your first ${freeSongsRemaining} custom gift songs are 100% FREE! Follow the 3 easy steps below:\n• Step 1: Who is the song for?\n• Step 2: What is the occasion?\n• Step 3: What words or lyrics do you want in the song?\n\nLet's start with Step 1 — Who is this song for?`,
      timestamp: "Just now",
    },
  ]);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "welcome-2"
          ? {
              ...m,
              text: `Your first ${freeSongsRemaining} custom gift songs are 100% FREE! Follow the 3 easy steps below:\n• Step 1: Who is the song for?\n• Step 2: What is the occasion?\n• Step 3: What words or lyrics do you want in the song?\n\nLet's start with Step 1 — Who is this song for?`,
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
      if (yosiaVideoRef.current && !yosiaVideoRef.current.paused) {
        yosiaVideoRef.current.pause();
      }
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
    if (yosiaVideoRef.current && !yosiaVideoRef.current.paused) {
      yosiaVideoRef.current.pause();
    }
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

  const handleToggleYosiaPlay = () => {
    const vid = yosiaVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      vid.muted = false;
      setIsYosiaMuted(false);
      vid.play().catch((err) => {
        console.warn("Yosia video play fallback:", err);
      });
    } else {
      vid.pause();
    }
  };

  const handleToggleYosiaMute = () => {
    const vid = yosiaVideoRef.current;
    if (!vid) return;
    const nextMute = !vid.muted;
    vid.muted = nextMute;
    setIsYosiaMuted(nextMute);
  };

  const handleRestartYosiaVideo = () => {
    const vid = yosiaVideoRef.current;
    if (!vid) return;
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    vid.currentTime = 0;
    vid.muted = false;
    setIsYosiaMuted(false);
    vid.play().catch(console.warn);
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

  const handleSelectStepManual = (step: "recipient" | "occasion" | "lyrics") => {
    setChatStep(step);
    if (step === "recipient") {
      setChatInput(recipientInput);
    } else if (step === "occasion") {
      setChatInput(occasionInput);
    } else if (step === "lyrics") {
      setChatInput(storyInput);
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
      setChatStep("occasion");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `Step 1 complete! We are creating this song for ${trimmed}. Now for Step 2 of 3: What is the occasion? (e.g., "Birthday", "Anniversary", "Mother's Day", "Graduation", "Just Because")`,
            timestamp: "Just now",
          },
        ]);
      }, 300);
    } else if (chatStep === "occasion") {
      setOccasionInput(trimmed);
      setChatStep("lyrics");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `Step 2 complete! Occasion: "${trimmed}". Now for Step 3 of 3: What words, memories, or lyrics do you want in ${recipientInput || "their"}'s song?`,
            timestamp: "Just now",
          },
        ]);
      }, 300);
    } else if (chatStep === "lyrics") {
      setStoryInput(trimmed);
      setChatStep("ready");
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `All 3 steps complete! I have everything ready for ${recipientInput || "your loved one"} (${occasionInput || "Special Occasion"}). Click "Create the Song Now" below to produce your song immediately, or click "Go Into Full Studio for More Options"!`,
            timestamp: "Just now",
          },
        ]);
      }, 300);
    } else {
      setStoryInput((prev) => (prev ? `${prev}. ${trimmed}` : trimmed));
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `haddi-${Date.now()}`,
            sender: "haddi",
            text: `I've added those extra words into the lyrics for ${recipientInput || "your loved one"}. Click "Create the Song Now" or "Go Into Full Studio for More Options" below!`,
            timestamp: "Just now",
          },
        ]);
      }, 300);
    }
  };

  const handleQuickPrompt = (
    recipient: string,
    occasion: string,
    lyricsWords: string,
    genre: string,
    language: string = "English",
    persona: "haddi" | "yosia" = "haddi"
  ) => {
    setRecipientInput(recipient);
    setOccasionInput(occasion);
    setStoryInput(lyricsWords);
    setSelectedGenre(genre);
    setSelectedLanguage(language);
    setSelectedPersona(persona);
    setChatStep("ready");
    setChatInput("");
    setMessages([
      {
        id: "welcome-1",
        sender: "haddi",
        text:
          persona === "yosia"
            ? "Halo! I'm Yosia, Haddi's little brother! Let's play our guitar and make people happy!"
            : "Selamat datang, my friend! Welcome to mygiftsong.org — your AI assisted song generator.",
        timestamp: "Just now",
      },
      {
        id: `user-quick-${Date.now()}`,
        sender: "user",
        text: `Step 1 (Who): ${recipient} • Step 2 (Occasion): ${occasion} • Step 3 (Lyrics/Words): "${lyricsWords}" • Language: ${language}`,
        timestamp: "Just now",
      },
      {
        id: `haddi-quick-${Date.now() + 1}`,
        sender: "haddi",
        text: `All 3 steps are filled in for ${recipient} (${language})! Click "Create the Song Now" below to generate your song right away, or "Go Into Full Studio for More Options"!`,
        timestamp: "Just now",
      },
    ]);
  };

  const buildCombinedContext = () => {
    const pendingTrimmed = chatInput.trim();
    const finalRecipient =
      recipientInput || (chatStep === "recipient" && pendingTrimmed ? pendingTrimmed : "") || "Someone Special";
    const finalOccasion =
      occasionInput || (chatStep === "occasion" && pendingTrimmed ? pendingTrimmed : "");
    const finalLyrics =
      storyInput || (chatStep === "lyrics" && pendingTrimmed ? pendingTrimmed : "");

    const parts: string[] = [];
    if (finalOccasion) {
      parts.push(`Occasion: ${finalOccasion}.`);
    }
    if (finalLyrics) {
      parts.push(`Desired Words & Lyrics: ${finalLyrics}`);
    }
    if (parts.length === 0) {
      parts.push(`A heartfelt custom blessing song dedicated to ${finalRecipient}.`);
    }
    return {
      finalRecipient,
      finalContext: parts.join(" "),
      hasUserContent: Boolean(recipientInput || occasionInput || storyInput || pendingTrimmed),
    };
  };

  const currentStepNumber =
    chatStep === "recipient" ? 1 : chatStep === "occasion" ? 2 : chatStep === "lyrics" ? 3 : 3;

  return (
    <div className="min-h-screen w-full bg-[#F8FAF9] text-slate-900 flex flex-col justify-between relative z-10">
      {/* =====================================================================
          NEW UNCLUTTERED WHITE & TEAL NAVIGATION BAR (INSPIRED BY SCREENSHOTS)
      ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo (Left) */}
          <button
            type="button"
            onClick={() => {
              setActiveLandingPage("haddi-main");
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <img
              src="/pwa-192x192.png"
              alt="mygiftsong.org App Icon"
              className="w-9 h-9 rounded-xl object-cover border border-teal-600/30 shadow-xs"
            />
            <div>
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-none group-hover:text-teal-700 transition-colors">
                mygiftsong.org
              </span>
              <span className="font-sans text-[11px] text-teal-700 font-medium block mt-0.5">
                AI Assisted Song Generator
              </span>
            </div>
          </button>

          {/* Clean Borderless Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveLandingPage("haddi-main")}
              className={`py-5 border-b-2 transition-colors cursor-pointer ${
                activeLandingPage === "haddi-main"
                  ? "border-teal-600 text-teal-700 font-semibold"
                  : "border-transparent hover:text-slate-900"
              }`}
            >
              Haddi&apos;s Song Builder
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLandingPage("yosia-children");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`py-5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeLandingPage === "yosia-children"
                  ? "border-teal-600 text-teal-700 font-semibold"
                  : "border-transparent hover:text-slate-900"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
              </span>
              <span>Children&apos;s Songs (Yosia)</span>
            </button>

            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
              className="py-5 border-b-2 border-transparent hover:text-teal-700 transition-colors cursor-pointer"
            >
              5 Free Songs ({freeSongsRemaining}/5)
            </button>

            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
              className="py-5 border-b-2 border-transparent hover:text-teal-700 transition-colors cursor-pointer"
            >
              Lifetime &amp; Affiliates
            </button>
          </nav>

          {/* Right Actions: Clean Free Status + Primary Teal CTA + Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5">
            <PWAInstallButton variant="light" />

            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-medium hover:bg-teal-100/70 transition-colors cursor-pointer"
              title="5 Free Songs + 1 single redo option"
            >
              <Gift size={13} className="text-teal-600" />
              <span>{freeSongsRemaining}/5 Free</span>
            </button>

            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "studio" })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>Full Studio</span>
              <ArrowRight size={14} />
            </button>

            {/* Mobile Hamburger Button (Matches Screenshot 1) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Clean Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-4 py-3 space-y-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setActiveLandingPage("haddi-main");
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between cursor-pointer ${
                activeLandingPage === "haddi-main"
                  ? "bg-teal-50 text-teal-800 font-semibold"
                  : "text-slate-700 hover:bg-stone-50"
              }`}
            >
              <span>🎸 Haddi&apos;s Song Builder</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveLandingPage("yosia-children");
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between cursor-pointer ${
                activeLandingPage === "yosia-children"
                  ? "bg-teal-50 text-teal-800 font-semibold"
                  : "text-slate-700 hover:bg-stone-50"
              }`}
            >
              <span>👦🎸 Children&apos;s Song Page (Yosia)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onInitiateSystem({ initialSection: "free-songs" });
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50 flex items-center justify-between cursor-pointer"
            >
              <span>🎁 First 5 Free Songs Pass</span>
              <span className="text-xs font-mono text-teal-700 font-bold">
                {freeSongsRemaining}/5 Left {oneTimeRedoUsed ? "(1 Redo Used)" : "(+1 Redo)"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onInitiateSystem({ initialSection: "lifetime" });
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50 cursor-pointer"
            >
              👑 10 Signups = Lifetime License
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onInitiateSystem({ initialSection: "affiliate" });
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-stone-50 cursor-pointer"
            >
              🤝 Affiliate Partner Hub
            </button>
          </div>
        )}
      </header>

      {/* SEPARATE PAGE FOR YOSIA (CHILDREN'S SONGS) VS. HADDI'S MAIN PAGE */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 flex-1 flex flex-col justify-center">
        {activeLandingPage === "yosia-children" ? (
          <main className="py-8">
            <YosiaChildrenSection
              variant="light"
              freeSongsRemaining={freeSongsRemaining}
              onBackToMainPage={() => {
                setActiveLandingPage("haddi-main");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onGenerateYosiaSong={(params) => {
                onInitiateSystem({
                  target: params.target,
                  context: params.context,
                  genre: params.genre,
                  language: params.language,
                  setType: params.setType,
                  artistPersona: params.artistPersona,
                  preloadedSong: params.preloadedSong,
                  autoGenerate: params.autoGenerate,
                  initialSection: "studio",
                });
              }}
            />
          </main>
        ) : (
          /* Main Uncluttered Center Stage: Haddi Video Showcase + Clean 3-Step Builder */
          <main className="py-8 md:py-12">
            {/* Airy, Spacious Hero Heading */}
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
              <span className="inline-block text-xs font-mono uppercase tracking-[0.18em] text-teal-700 font-semibold bg-teal-50 border border-teal-200/80 px-3 py-1 rounded-full">
                Haddi the Street Minstrel • Custom Acoustic Gift Songs
              </span>
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-slate-900 tracking-tight leading-tight">
                Turn Your Heartfelt Story Into a{" "}
                <span className="text-teal-700">Playable Gift Song</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                Share who the song is for, the occasion, and the memories you want included. Your first 5 custom songs are free.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* LEFT COLUMN: HADDI VIDEO MEDIA PLAYER (5 cols) — UNCLUTTERED WHITE & TEAL */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="lg:col-span-5 bg-white border border-stone-200/90 rounded-2xl p-6 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-4">
                  {/* Minimal Header & Switcher */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Haddi Acoustic Showcase
                      </span>
                    </div>

                    <div className="inline-flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                      <button
                        type="button"
                        onClick={() => handleSwitchVideo("flagship")}
                        className={`py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          selectedVideo === "flagship"
                            ? "bg-white text-teal-800 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Flagship Song
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchVideo("encore")}
                        className={`py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          selectedVideo === "encore"
                            ? "bg-white text-teal-800 shadow-2xs font-semibold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Encore Video
                      </button>
                    </div>
                  </div>

                  {/* Haddi Video Frame */}
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-slate-900 aspect-video group">
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

                    {!isVideoPlaying && (
                      <button
                        type="button"
                        onClick={handleToggleVideoPlay}
                        className="absolute inset-0 bg-slate-950/30 hover:bg-slate-950/20 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer"
                        title="Watch & Listen to Haddi Playing Song"
                      >
                        <div className="w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                          <Play size={24} fill="currentColor" className="ml-0.5" />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/95 text-teal-900 text-xs font-semibold shadow-sm">
                          Watch Haddi Play
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Clean Controls Bar */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <h2 className="font-display text-sm font-semibold text-slate-900 truncate">
                        {videoSources[selectedVideo].title}
                      </h2>
                      <p className="text-xs text-slate-500 truncate">
                        {videoSources[selectedVideo].subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleToggleVideoPlay}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isVideoPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                        <span>{isVideoPlaying ? "Pause" : "Play"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleVideoMute}
                        className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-slate-600 border border-stone-200 transition-colors cursor-pointer"
                        title={isVideoMuted ? "Unmute Video" : "Mute Video"}
                      >
                        {isVideoMuted ? <VolumeX size={15} className="text-red-500" /> : <Volume2 size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={handleRestartVideo}
                        className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-slate-600 border border-stone-200 transition-colors cursor-pointer"
                        title="Restart Video"
                      >
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </div>

                  {/* ==========================================================
                      YOSIA MEDIA PLAYER UNDERNEATH HADDI'S MEDIA PLAYER
                      With statement: "Check out our Children's Song Section"
                  ========================================================== */}
                  <div className="pt-4 mt-2 border-t border-stone-200/90 space-y-3">
                    {/* Prominent Statement Banner */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLandingPage("yosia-children");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50 to-amber-50/70 hover:from-teal-100/80 hover:to-amber-100/70 border border-teal-300/90 flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse shrink-0" />
                        <span className="text-xs sm:text-sm font-display font-bold text-teal-950 truncate">
                          👦🎸 Check out our Children&apos;s Song Section!
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 group-hover:bg-teal-700 text-white text-[11px] font-semibold shrink-0 transition-colors">
                        <span>Open Section</span>
                        <ArrowRight size={12} />
                      </span>
                    </button>

                    {/* Yosia Video Frame */}
                    <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-slate-900 aspect-video group">
                      <video
                        ref={yosiaVideoRef}
                        src="/video/yosia-children.mp4"
                        controls
                        playsInline
                        preload="metadata"
                        onPlay={() => {
                          if (videoRef.current && !videoRef.current.paused) {
                            videoRef.current.pause();
                          }
                          setIsYosiaPlaying(true);
                        }}
                        onPause={() => setIsYosiaPlaying(false)}
                        onEnded={() => setIsYosiaPlaying(false)}
                        className="w-full h-full object-cover"
                      />

                      {!isYosiaPlaying && (
                        <button
                          type="button"
                          onClick={handleToggleYosiaPlay}
                          className="absolute inset-0 bg-slate-950/30 hover:bg-slate-950/20 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer"
                          title="Watch & Listen to Yosia Playing Children's Song"
                        >
                          <div className="w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                            <Play size={24} fill="currentColor" className="ml-0.5" />
                          </div>
                          <span className="px-3 py-1 rounded-full bg-white/95 text-teal-900 text-xs font-semibold shadow-sm">
                            Watch Yosia Play
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Yosia Clean Controls Bar */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-semibold text-slate-900 truncate">
                          Yosia Performing: Children&apos;s Song Showcase
                        </h3>
                        <p className="text-xs text-teal-700 font-medium truncate">
                          Check out our Children&apos;s Song Section • Haddi&apos;s Little Brother
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleToggleYosiaPlay}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {isYosiaPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                          <span>{isYosiaPlaying ? "Pause" : "Play"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleYosiaMute}
                          className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-slate-600 border border-stone-200 transition-colors cursor-pointer"
                          title={isYosiaMuted ? "Unmute Yosia Video" : "Mute Yosia Video"}
                        >
                          {isYosiaMuted ? <VolumeX size={15} className="text-red-500" /> : <Volume2 size={15} />}
                        </button>

                        <button
                          type="button"
                          onClick={handleRestartYosiaVideo}
                          className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-slate-600 border border-stone-200 transition-colors cursor-pointer"
                          title="Restart Yosia Video"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Custom Generated Audio Player (Only appears if a user has rendered a custom track) */}
                  {audioSource && (
                    <div className="bg-teal-50/70 rounded-xl p-3 border border-teal-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-teal-900">
                          Your Rendered Gift Song Audio
                        </span>
                        {(lyriaAudioUrl || narrationAudioUrl) && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onSelectTrackType("lyria")}
                              disabled={!lyriaAudioUrl}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                                activeTrackType === "lyria"
                                  ? "bg-teal-600 text-white"
                                  : "bg-white text-slate-600 border border-stone-200 disabled:opacity-40"
                              }`}
                            >
                              Sung Song
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectTrackType("narration")}
                              disabled={!narrationAudioUrl}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                                activeTrackType === "narration"
                                  ? "bg-teal-600 text-white"
                                  : "bg-white text-slate-600 border border-stone-200 disabled:opacity-40"
                              }`}
                            >
                              Haddi Voice
                            </button>
                          </div>
                        )}
                      </div>
                      <audio controls src={audioSource} className="w-full h-9 accent-teal-600" />
                    </div>
                  )}
                </div>

                {/* Earthy Minstrel Quote & Clean Links */}
                <div className="pt-5 mt-5 border-t border-stone-200/80 space-y-4">
                  <p className="text-xs text-slate-600 italic text-center leading-relaxed">
                    &ldquo;There is no greater gift than a song... it is worth more than a thousand words.&rdquo;
                  </p>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <button
                      type="button"
                      onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
                      className="p-2.5 rounded-xl bg-stone-50/80 hover:bg-teal-50/60 border border-stone-200/80 hover:border-teal-300 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-teal-800">5 Free Songs</p>
                      <p className="text-[11px] text-slate-500">No card needed</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
                      className="p-2.5 rounded-xl bg-stone-50/80 hover:bg-teal-50/60 border border-stone-200/80 hover:border-teal-300 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-teal-800">Lifetime Pass</p>
                      <p className="text-[11px] text-slate-500">Invite 10 friends</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onInitiateSystem({ initialSection: "affiliate" })}
                      className="p-2.5 rounded-xl bg-stone-50/80 hover:bg-teal-50/60 border border-stone-200/80 hover:border-teal-300 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-teal-800">Affiliate Hub</p>
                      <p className="text-[11px] text-slate-500">Partner rewards</p>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* RIGHT COLUMN: UNCLUTTERED 3-STEP GIFT SONG BUILDER (7 cols) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 }}
                className="lg:col-span-7 bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-sm"
              >
                {/* Clean Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-300 flex items-center justify-center text-teal-800 font-display font-bold">
                      H
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-display font-bold text-slate-900">
                        Create Your Gift Song in 3 Simple Steps
                      </h2>
                      <p className="text-xs text-slate-500">
                        Tell Haddi who it&apos;s for, the occasion, and your desired lyrics
                      </p>
                    </div>
                  </div>

                  {/* Language Selector neatly integrated in the card header */}
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                    <Globe size={13} className="text-teal-600" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                      aria-label="Select Song Language"
                    >
                      {SUPPORTED_SONG_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CLEAN 3-STEP PROGRESS BAR (STEP 1, STEP 2, STEP 3) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-teal-800">
                      {chatStep === "ready"
                        ? "✓ All 3 steps complete — ready to create your song"
                        : `Step ${currentStepNumber} of 3 — Click any step to edit`}
                    </span>
                    {(recipientInput || occasionInput || storyInput) && (
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientInput("");
                          setOccasionInput("");
                          setStoryInput("");
                          setChatInput("");
                          setChatStep("recipient");
                        }}
                        className="text-xs text-slate-500 hover:text-teal-700 underline cursor-pointer"
                      >
                        Reset steps
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {/* STEP 1 */}
                    <button
                      type="button"
                      onClick={() => handleSelectStepManual("recipient")}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        chatStep === "recipient"
                          ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-500/15"
                          : recipientInput
                          ? "bg-stone-50 border-teal-300 text-slate-900"
                          : "bg-white border-stone-200 text-slate-500 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            chatStep === "recipient" || recipientInput
                              ? "bg-teal-600 text-white"
                              : "bg-stone-200 text-slate-600"
                          }`}
                        >
                          Step 1
                        </span>
                        {recipientInput && (
                          <span className="text-[10px] font-medium text-teal-700">✓</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 mt-1.5 truncate">
                        Who Is It For?
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {recipientInput ? recipientInput : "Recipient name"}
                      </p>
                    </button>

                    {/* STEP 2 */}
                    <button
                      type="button"
                      onClick={() => handleSelectStepManual("occasion")}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        chatStep === "occasion"
                          ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-500/15"
                          : occasionInput
                          ? "bg-stone-50 border-teal-300 text-slate-900"
                          : "bg-white border-stone-200 text-slate-500 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            chatStep === "occasion" || occasionInput
                              ? "bg-teal-600 text-white"
                              : "bg-stone-200 text-slate-600"
                          }`}
                        >
                          Step 2
                        </span>
                        {occasionInput && (
                          <span className="text-[10px] font-medium text-teal-700">✓</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 mt-1.5 truncate">
                        Occasion
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {occasionInput ? occasionInput : "Birthday, Anniversary..."}
                      </p>
                    </button>

                    {/* STEP 3 */}
                    <button
                      type="button"
                      onClick={() => handleSelectStepManual("lyrics")}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        chatStep === "lyrics"
                          ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-500/15"
                          : storyInput
                          ? "bg-stone-50 border-teal-300 text-slate-900"
                          : "bg-white border-stone-200 text-slate-500 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            chatStep === "lyrics" || storyInput
                              ? "bg-teal-600 text-white"
                              : "bg-stone-200 text-slate-600"
                          }`}
                        >
                          Step 3
                        </span>
                        {storyInput && (
                          <span className="text-[10px] font-medium text-teal-700">✓</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 mt-1.5 truncate">
                        Words &amp; Lyrics
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {storyInput ? storyInput : "Memories or message"}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Uncluttered Input & Actions (Duplicate Selamat Datang chat box removed) */}
                <div className="space-y-4 mt-4">
                  {/* Quick Starter Templates */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">
                      Quick fill:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "Mom",
                          "Mother's Day & Gratitude Blessing",
                          "Thank you for your endless prayers, warm hugs, and guiding light through every season.",
                          "Acoustic Folk",
                          selectedLanguage,
                          "haddi"
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-stone-200/80 transition-colors cursor-pointer"
                    >
                      For Mom
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "My Beloved Partner",
                          "Wedding Anniversary",
                          "Celebrating our anniversary, every laugh we share, and walking hand in hand forever.",
                          "Indie Pop",
                          selectedLanguage,
                          "haddi"
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-stone-200/80 transition-colors cursor-pointer"
                    >
                      Anniversary
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "My Best Friend",
                          "Happy Birthday Celebration",
                          "Wishing you a year filled with joy, laughter, good health, and unforgettable blessings.",
                          "Acoustic Folk",
                          selectedLanguage,
                          "haddi"
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-stone-200/80 transition-colors cursor-pointer"
                    >
                      Birthday
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPrompt(
                          "Our Family & Church",
                          "Morning Worship & Covenant Blessing",
                          "Lifting hands in gratitude for His unfailing grace, peace, and faithfulness over our home.",
                          "Modern Worship",
                          selectedLanguage,
                          "haddi"
                        )
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-stone-200/80 transition-colors cursor-pointer"
                    >
                      🙏 Worship
                    </button>
                  </div>

                  {/* Step Input Bar */}
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={
                        chatStep === "recipient"
                          ? "Step 1: Who is this song for? (e.g., Sarah, Mom, Dad)..."
                          : chatStep === "occasion"
                          ? "Step 2: What is the occasion? (e.g., Birthday, Anniversary)..."
                          : chatStep === "lyrics"
                          ? "Step 3: What words or memories do you want in the lyrics?..."
                          : "Optional: Add extra words or click Create below..."
                      }
                      className="flex-1 bg-white border border-stone-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <span>
                        {chatStep === "recipient"
                          ? "Next Step"
                          : chatStep === "occasion"
                          ? "Next Step"
                          : chatStep === "lyrics"
                          ? "Save Lyrics"
                          : "Add"}
                      </span>
                      <Send size={13} />
                    </button>
                  </form>

                  {/* Musical Style (Worship, Acoustic Folk, etc.) & Song Package ($1.99 Longer Song vs Quick 60s) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-stone-50/90 border border-stone-200/80">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-teal-900 block">
                        🎶 Musical Style:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: "Acoustic Folk", label: "🎸 Acoustic Folk" },
                          { id: "Modern Worship", label: "🙏 Worship" },
                          { id: "Indie Pop", label: "✨ Indie Pop" },
                          { id: "Lofi Acoustic", label: "🌿 Lofi" },
                        ].map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGenre(g.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              selectedGenre === g.id
                                ? "bg-teal-700 text-white border-teal-700"
                                : "bg-white text-slate-700 border-stone-200 hover:border-teal-300"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-teal-900 block">
                        ⏱️ Song Length &amp; Packet:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSetType("quick")}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            selectedSetType === "quick"
                              ? "bg-teal-50 border-teal-600 text-teal-950 font-bold"
                              : "bg-white border-stone-200 text-slate-600 hover:border-teal-300"
                          }`}
                        >
                          <div className="text-[11px] font-bold">Quick (60s)</div>
                          <div className="text-[10px] text-slate-500">1-Min Song ($0.99)</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSetType("full")}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            selectedSetType === "full"
                              ? "bg-teal-50 border-teal-600 text-teal-950 font-bold"
                              : "bg-white border-stone-200 text-slate-600 hover:border-teal-300"
                          }`}
                        >
                          <div className="text-[11px] font-bold">Full Song ($1.99)</div>
                          <div className="text-[10px] text-teal-700 font-semibold">2-Min Longer Song</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notice: Please Check Lyrics Before Creating a Song */}
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 font-medium flex items-center gap-2">
                    <span className="text-amber-700 font-bold shrink-0">⚠️ NOTICE:</span>
                    <span>
                      <strong>PLEASE CHECK LYRICS BEFORE CREATING A SONG.</strong> (You can also edit the lyrics on the next screen after your song is created!)
                    </span>
                  </div>

                  {/* Primary & Secondary Action Buttons */}
                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const { finalRecipient, finalContext } = buildCombinedContext();
                        onInitiateSystem({
                          target: finalRecipient,
                          context: finalContext,
                          genre: selectedGenre,
                          language: selectedLanguage,
                          setType: selectedSetType,
                          artistPersona: "haddi",
                          autoGenerate: true,
                          initialSection: "studio",
                        });
                      }}
                      className="py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-display font-semibold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Sparkles size={15} />
                      <span>
                        {recipientInput
                          ? `Create ${recipientInput}'s ${selectedSetType === "full" ? "2-Min Full" : "60s"} Song`
                          : `Create ${selectedSetType === "full" ? "2-Min Full ($1.99)" : "60s"} Song Now`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const { finalRecipient, finalContext, hasUserContent } = buildCombinedContext();
                        onInitiateSystem({
                          target: hasUserContent ? finalRecipient : undefined,
                          context: hasUserContent ? finalContext : undefined,
                          genre: selectedGenre,
                          language: selectedLanguage,
                          setType: selectedSetType,
                          artistPersona: "haddi",
                          autoGenerate: false,
                          initialSection: "studio",
                        });
                      }}
                      className="py-3 px-4 rounded-xl bg-white hover:bg-stone-50 text-slate-800 border border-stone-300 font-display font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Music size={15} className="text-teal-600" />
                      <span>Jump Into Full Studio Options</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* HIGH-VISIBILITY FLASHING CHILDREN'S SONG PAGE CALLOUT BANNER */}
                  <div className="mt-2 p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-500 shadow-[0_0_20px_rgba(13,148,136,0.2)] flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-teal-600 text-white text-lg shrink-0 shadow-sm animate-bounce">
                        👦🎸
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
                        </span>
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                          <span className="text-xs sm:text-sm font-display font-extrabold text-teal-950">
                            Is this song for a child?
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-mono font-extrabold uppercase tracking-wider animate-pulse">
                            ✨ Kids Page
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-teal-800 font-medium mt-0.5">
                          We have a separate page for children with Haddi&apos;s little brother, Yosia!
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveLandingPage("yosia-children");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-display font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all ring-2 ring-amber-300/80 animate-pulse hover:animate-none shrink-0"
                    >
                      <span>Open Yosia&apos;s Children&apos;s Song Page</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>

                  {/* Single Concise 1-Time Redo Note */}
                  <div className="text-center pt-1">
                    <span className="text-[11px] text-slate-500">
                      {oneTimeRedoUsed
                        ? "1-Time Redo used • Remaining 4 free songs are kept as generated"
                        : "Includes 1 single song redo option across your 5 free songs"}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </main>
        )}
      </div>

      {/* Clean Minimal Footer */}
      <footer className="w-full border-t border-stone-200/80 bg-white mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span
            onClick={handleCopyrightClick}
            className="select-none cursor-default"
          >
            © 2026 mygiftsong.org • AI Assisted Song Generator
          </span>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "free-songs" })}
              className="text-slate-600 hover:text-teal-700 font-medium transition-colors cursor-pointer"
            >
              First 5 Songs Free
            </button>
            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "lifetime" })}
              className="text-slate-600 hover:text-teal-700 font-medium transition-colors cursor-pointer"
            >
              Invite 10 = Lifetime License
            </button>
            <button
              type="button"
              onClick={() => onInitiateSystem({ initialSection: "affiliate" })}
              className="text-slate-600 hover:text-teal-700 font-medium transition-colors cursor-pointer"
            >
              Affiliate Program
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};


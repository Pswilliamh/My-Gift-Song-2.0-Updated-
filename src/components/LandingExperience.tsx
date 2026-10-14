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
  Smile
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PWAInstallButton } from "./PWAInstallButton";
import { YosiaChildrenSection, SUPPORTED_SONG_LANGUAGES } from "./YosiaChildrenSection";
import { SongData } from "../types";

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

  // 3-Step Chat & Song Builder state:
  // Step 1: Who the song is for (recipient)
  // Step 2: What's the occasion (occasion)
  // Step 3: What words / lyrics are wanted (lyricsWanted)
  const [recipientInput, setRecipientInput] = useState("");
  const [occasionInput, setOccasionInput] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Acoustic Folk");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedPersona, setSelectedPersona] = useState<"haddi" | "yosia">("haddi");
  const [chatStep, setChatStep] = useState<"recipient" | "occasion" | "lyrics" | "ready">("recipient");
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
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col justify-between relative z-10 px-4 sm:px-8 py-6 max-w-6xl mx-auto">
      {/* Minimal Clean Top Header on White Background */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img
            src="/pwa-192x192.png"
            alt="mygiftsong.org App Icon"
            className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
          />
          <div>
            <span className="font-display text-lg font-bold tracking-wide text-slate-900 block leading-none">
              mygiftsong.org
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-700 font-semibold">
              AI Assisted Song Generator • Haddi the Street Minstrel
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
              title="You get 5 free songs + 1 single redo option across your 5 songs"
            >
              <Gift size={14} className="text-amber-600" />
              <span>{freeSongsRemaining} of 5 Free Songs Left</span>
              <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 text-[10px] font-bold">
                {oneTimeRedoUsed ? "1 Redo Used" : "+ 1 Redo Option"}
              </span>
            </button>
          </div>

          {activeLandingPage === "haddi-main" ? (
            <button
              type="button"
              onClick={() => {
                setActiveLandingPage("yosia-children");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <Smile size={14} className="text-amber-600" />
              <span>👦🎸 Children&apos;s Song Page (Yosia)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setActiveLandingPage("haddi-main");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <span>🎸 Back to Haddi&apos;s Main Page</span>
            </button>
          )}

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

      {/* SEPARATE PAGE FOR YOSIA (CHILDREN'S SONGS) VS. HADDI'S MAIN PAGE */}
      {activeLandingPage === "yosia-children" ? (
        <main className="my-auto py-8">
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
                artistPersona: params.artistPersona,
                preloadedSong: params.preloadedSong,
                autoGenerate: params.autoGenerate,
                initialSection: "studio",
              });
            }}
          />
        </main>
      ) : (
      /* Main Clutter-Free Center Stage: Haddi Video Player + Welcome Chat Window */
      <main className="my-auto py-8 md:py-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-amber-700 font-bold">
            mygiftsong.org • AI Assisted Song Generator
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-800 font-serif font-bold">
                    H
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <h2 className="text-base font-display font-bold text-slate-900">
                    Create Your First Gift Song in 3 Easy Steps
                  </h2>
                  <p className="text-xs text-slate-500">
                    mygiftsong.org • AI Assisted Song Generator — First 5 songs are free
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                <Sparkles size={12} className="text-emerald-600" /> {freeSongsRemaining}/5 Free Songs
              </span>
            </div>

            {/* CLEAR 3-STEP INDICATOR BAR (STEP 1, STEP 2, STEP 3) */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-amber-800">
                  {chatStep === "ready"
                    ? "✅ All 3 Steps Complete — Ready to Create Song!"
                    : `👉 Currently on Step ${currentStepNumber} of 3 (Click any step to edit)`}
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
                    className="text-[10px] font-mono text-slate-500 hover:text-amber-700 underline cursor-pointer"
                  >
                    Start Over
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* STEP 1 PILL: WHO THE SONG IS FOR */}
                <button
                  type="button"
                  onClick={() => handleSelectStepManual("recipient")}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    chatStep === "recipient"
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/30 shadow-xs"
                      : recipientInput
                      ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        chatStep === "recipient"
                          ? "bg-amber-500 text-slate-950"
                          : recipientInput
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Step 1
                    </span>
                    {recipientInput && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700">✓ Done</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                    1. Who Is It For?
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    {recipientInput ? `For: ${recipientInput}` : "Type recipient's name"}
                  </p>
                </button>

                {/* STEP 2 PILL: WHAT'S THE OCCASION */}
                <button
                  type="button"
                  onClick={() => handleSelectStepManual("occasion")}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    chatStep === "occasion"
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/30 shadow-xs"
                      : occasionInput
                      ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        chatStep === "occasion"
                          ? "bg-amber-500 text-slate-950"
                          : occasionInput
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Step 2
                    </span>
                    {occasionInput && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700">✓ Done</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                    2. What's the Occasion?
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    {occasionInput ? occasionInput : "Birthday, Anniversary..."}
                  </p>
                </button>

                {/* STEP 3 PILL: WHAT WORDS / LYRICS YOU WANT */}
                <button
                  type="button"
                  onClick={() => handleSelectStepManual("lyrics")}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    chatStep === "lyrics"
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/30 shadow-xs"
                      : storyInput
                      ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        chatStep === "lyrics"
                          ? "bg-amber-500 text-slate-950"
                          : storyInput
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Step 3
                    </span>
                    {storyInput && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700">✓ Done</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">
                    3. Words &amp; Lyrics
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    {storyInput ? storyInput : "Memories or lyrics"}
                  </p>
                </button>
              </div>
            </div>

            {/* Chat Conversation Feed */}
            <div
              ref={chatContainerRef}
              className="my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 max-h-[210px] min-h-[175px] overflow-y-auto"
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
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs whitespace-pre-line ${
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

            {/* Quick Idea Starters + Guided Step Input (Focused on Haddi) */}
            <div className="space-y-2.5">
              {/* QUESTION FOR GUESTS: IS THIS SONG FOR A CHILD? WE HAVE A SEPARATE PAGE FOR CHILDREN! */}
              <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">👦🎸</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      Is this song for a child? We have a separate page for children!
                    </p>
                    <p className="text-[11px] text-amber-900">
                      Meet Haddi&apos;s little brother, <strong>Yosia</strong> — he plays guitar too and loves making children happy!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLandingPage("yosia-children");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  <span>Open Children&apos;s Page</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mr-1">
                    1-Click Fill All 3 Steps:
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
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
                  >
                    💐 For Mom
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
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
                  >
                    💍 Anniversary Gift
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickPrompt(
                        "Pak Sonni (Mr. Sonni)",
                        "Membawa Senyum & Kebahagiaan (Making People Happy)",
                        "Terima kasih Pak Sonni atas senyum hangat, kebaikan hati, dan semangat yang memberkati semua orang.",
                        "Acoustic Folk",
                        "Bahasa Indonesia",
                        "haddi"
                      )
                    }
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold border border-amber-300 transition-colors cursor-pointer"
                  >
                    🇮🇩 Mr. Sonni (Bahasa Indonesia)
                  </button>
                </div>

                {/* Language Selector Bar inside Haddi's Builder */}
                <div className="flex items-center gap-1.5">
                  <Globe size={13} className="text-amber-600" />
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-600">Language:</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    {SUPPORTED_SONG_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Step Prompt Label Above Input */}
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-mono font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase">
                    {chatStep === "recipient"
                      ? "Step 1 of 3"
                      : chatStep === "occasion"
                      ? "Step 2 of 3"
                      : chatStep === "lyrics"
                      ? "Step 3 of 3"
                      : "Steps 1–3 Done"}
                  </span>
                  <span>
                    {chatStep === "recipient"
                      ? "Who is this gift song for?"
                      : chatStep === "occasion"
                      ? `What is the occasion for ${recipientInput || "them"}?`
                      : chatStep === "lyrics"
                      ? "What words or lyrics do you want in the song?"
                      : "Add any extra lyrics, or click a button below:"}
                  </span>
                </label>
              </div>

              {/* Chat Input Row */}
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    chatStep === "recipient"
                      ? "Step 1: Type who the song is for (e.g., Sarah, Mom, Mr. Sonni)..."
                      : chatStep === "occasion"
                      ? "Step 2: Type the occasion (e.g., Birthday, Anniversary, Thank You)..."
                      : chatStep === "lyrics"
                      ? "Step 3: Type the words, memories, or lyrics you want in the song..."
                      : "Optional: Type any extra lyrics or words to include..."
                  }
                  className="flex-1 bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <span>
                    {chatStep === "recipient"
                      ? "Next: Step 2"
                      : chatStep === "occasion"
                      ? "Next: Step 3"
                      : chatStep === "lyrics"
                      ? "Save Step 3"
                      : "Add Words"}
                  </span>
                  <Send size={13} />
                </button>
              </form>

              {/* TWO SIDE-BY-SIDE FINAL ACTION BUTTONS:
                  1) CREATE THE SONG NOW
                  2) GO INTO FULL STUDIO FOR MORE OPTIONS */}
              <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const { finalRecipient, finalContext } = buildCombinedContext();
                    onInitiateSystem({
                      target: finalRecipient,
                      context: finalContext,
                      genre: selectedGenre,
                      language: selectedLanguage,
                      artistPersona: "haddi",
                      autoGenerate: true,
                      initialSection: "studio",
                    });
                  }}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>
                    {recipientInput
                      ? `Create ${recipientInput}'s Song (${selectedLanguage.split(" ")[0]})`
                      : `Create the Song Now (${selectedLanguage.split(" ")[0]})`}
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
                      artistPersona: "haddi",
                      autoGenerate: false,
                      initialSection: "studio",
                    });
                  }}
                  className="py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 font-display font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Music size={15} className="text-amber-400" />
                  <span>Go Into Full Studio for More Options</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* 1-TIME REDO POLICY REMINDER FOR GUESTS */}
              <p className="text-[11px] font-mono text-slate-500 text-center pt-1">
                🎁 <strong>5 Free Songs Policy:</strong> You get <strong>1 option to redo a song</strong> if it&apos;s not good. Once you use your 1 redo option, whatever song is generated is the one you keep for the other 4 songs.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      )}

      {/* Clean Minimal Footer with Direct Links to Separate System Sections */}
      <footer className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-mono">
        <span
          onClick={handleCopyrightClick}
          className="select-none cursor-default"
        >
          © 2026 mygiftsong.org • AI Assisted Song Generator
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


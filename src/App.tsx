/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Music, Sparkles, Share2, Play, Pause, Volume2, VolumeX, 
  RefreshCw, Download, User, Calendar, Sliders, ChevronRight,
  Disc, Star, Phone, Instagram, Send, Info, Check, Copy, X, Clock,
  Gift, Crown, Users, TrendingUp, ArrowLeft, ShieldCheck, RotateCcw
} from "lucide-react";
import { SongData, SetType, LyricSection } from "./types";
import { LyricCanvas } from "./components/LyricCanvas";
import { luteEngineInstance } from "./components/AudioEngine";
import { GiftSongCard } from "./components/GiftSongCard";
import { LandingExperience } from "./components/LandingExperience";
import { RewardsAndAffiliateSections, ReferralEntry } from "./components/RewardsAndAffiliateSections";
import { PWAInstallButton, OfflineIndicator } from "./components/PWAInstallButton";
import { AdminAccountDashboard, AdminUser, MASTER_ADMIN_EMAIL } from "./components/AdminAccountDashboard";

const FREE_SONGS_RESET_VERSION = "mygiftsong_free_reset_v2_2026_10";

export default function App() {
  // --- Lifecycles & State Management ---
  const [target, setTarget] = useState("");
  const [context, setContext] = useState("");
  const mainVideoSrc = "https://drive.google.com/uc?export=download&id=1H7bdSkULkzoNQGqqno26_KJzAPsZUPL2";
  const previewVideoSrc = "https://drive.google.com/uc?export=download&id=1dvyq1PS79s4e3GZlcDxZ3tK2lGKktyiC";
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyriaAudioUrl, setLyriaAudioUrl] = useState<string | null>(null);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [audioGenerationMode, setAudioGenerationMode] = useState<"lyria" | "narration" | "both">("both");
  const [activeTrackType, setActiveTrackType] = useState<"lyria" | "narration">("lyria");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sunoStatus, setSunoStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [sunoMessage, setSunoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioSource, setAudioSourceState] = useState<string | null>(null);

  const setAudioSource = (url: string) => {
    setAudioSourceState(url);
    setAudioUrl(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      audioRef.current.play().catch(console.warn);
    }
    setIsAudioPlaying(true);
  };

  const handleSelectTrackType = (type: "lyria" | "narration") => {
    setActiveTrackType(type);
    const nextUrl = type === "narration" ? (narrationAudioUrl || lyriaAudioUrl) : (lyriaAudioUrl || narrationAudioUrl);
    if (nextUrl) {
      setAudioSource(nextUrl);
    }
  };
  const [setType, setSetType] = useState<SetType>("quick");
  const [customGenre, setCustomGenre] = useState("Acoustic Folk");
  const [gifterEmail, setGifterEmail] = useState(MASTER_ADMIN_EMAIL);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isPurposeExpanded, setIsPurposeExpanded] = useState(false);

  // --- Master Admin Account State (PsWilliamh@gmail.com) ---
  const [adminUser, setAdminUser] = useState<AdminUser>(() => {
    try {
      const saved = localStorage.getItem("mygiftsong_admin_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      }
    } catch {
      // ignore
    }
    return {
      email: MASTER_ADMIN_EMAIL,
      name: "PsWilliamh (Master Admin)",
      role: "Founder & Super Admin",
      isAuthenticated: true,
      unlimitedBypass: false,
    };
  });

  const handleUpdateAdminUser = (next: AdminUser) => {
    setAdminUser(next);
    localStorage.setItem("mygiftsong_admin_user", JSON.stringify(next));
  };

  // --- Hidden Admin Menu Visibility (Hidden from public by default) ---
  const [isAdminMenuVisible, setIsAdminMenuVisible] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("admin") === "true" || window.location.hash === "#admin";
  });
  const [footerSecretClicks, setFooterSecretClicks] = useState(0);

  // --- Landing Page vs Initiated Full System State ---
  const [isSystemInitiated, setIsSystemInitiated] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("test") === "true" ||
      params.get("admin") === "true" ||
      window.location.hash === "#admin" ||
      params.has("session_id")
    );
  });
  const [activeSystemTab, setActiveSystemTab] = useState<"studio" | "free-songs" | "lifetime" | "affiliate" | "admin">(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true" || window.location.hash === "#admin") {
      return "admin";
    }
    return "studio";
  });

  // --- First 5 Songs Free & 10-Signup Lifetime License State (with automatic 5/5 reset migration) ---
  const [freeSongsRemaining, setFreeSongsRemaining] = useState<number>(() => {
    if (localStorage.getItem(FREE_SONGS_RESET_VERSION) !== "done") {
      localStorage.setItem("mygiftsong_free_remaining", "5");
      localStorage.setItem("mygiftsong_free_history", JSON.stringify([]));
      localStorage.setItem(FREE_SONGS_RESET_VERSION, "done");
      return 5;
    }
    const saved = localStorage.getItem("mygiftsong_free_remaining");
    return saved !== null ? Math.max(0, parseInt(saved, 10)) : 5;
  });

  const [freeSongsUsedHistory, setFreeSongsUsedHistory] = useState<{ title: string; recipient: string; date: string }[]>(() => {
    try {
      const saved = localStorage.getItem("mygiftsong_free_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [referrals, setReferrals] = useState<ReferralEntry[]>(() => {
    try {
      const saved = localStorage.getItem("mygiftsong_referrals");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const basic099ReferralCount = referrals.filter((r) => (r.tier || "basic_099") === "basic_099").length;
  const premiumReferralCount = referrals.filter((r) => r.tier === "premium").length;
  const isLifetimeUnlocked =
    basic099ReferralCount >= 10 ||
    premiumReferralCount >= 10 ||
    (adminUser.isAuthenticated && adminUser.unlimitedBypass);

  const handleResetFreeSongs = () => {
    setFreeSongsRemaining(5);
    setFreeSongsUsedHistory([]);
    localStorage.setItem("mygiftsong_free_remaining", "5");
    localStorage.setItem("mygiftsong_free_history", JSON.stringify([]));
    localStorage.setItem(FREE_SONGS_RESET_VERSION, "done");
  };

  const handleRefundSongSlot = (index: number) => {
    setFreeSongsUsedHistory((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem("mygiftsong_free_history", JSON.stringify(next));
      return next;
    });
    setFreeSongsRemaining((prev) => {
      const next = Math.min(5, prev + 1);
      localStorage.setItem("mygiftsong_free_remaining", String(next));
      return next;
    });
  };

  const handleClearReferrals = () => {
    setReferrals([]);
    localStorage.setItem("mygiftsong_referrals", JSON.stringify([]));
  };

  const recordFreeSongUsage = (songTitle: string, recipientName: string) => {
    if (isLifetimeUnlocked) return; // Lifetime License or Admin Unlimited Bypass = no deduction
    setFreeSongsRemaining((prev) => {
      const next = Math.max(0, prev - 1);
      localStorage.setItem("mygiftsong_free_remaining", String(next));
      return next;
    });
    setFreeSongsUsedHistory((prev) => {
      const next = [
        ...prev,
        { title: songTitle, recipient: recipientName, date: new Date().toLocaleDateString() },
      ];
      localStorage.setItem("mygiftsong_free_history", JSON.stringify(next));
      return next;
    });
  };

  const handleAddReferral = (name: string, email: string, tier: "basic_099" | "premium" = "basic_099") => {
    setReferrals((prev) => {
      const next: ReferralEntry[] = [
        ...prev,
        {
          id: `ref-${Date.now()}`,
          name,
          email,
          date: new Date().toLocaleDateString(),
          status: "Verified",
          tier,
        },
      ];
      localStorage.setItem("mygiftsong_referrals", JSON.stringify(next));
      return next;
    });
  };
  
  // --- Stripe Live Session Variables ---
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const publishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || "";

  useEffect(() => {
    console.log("[Stripe Integration] Client-side Publishable Key detection:", publishableKey ? "Loaded. Ready for active checkouts." : "No live Publishable Key fallback active.");
  }, [publishableKey]);
  
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");

  const [currentSong, setCurrentSong] = useState<SongData | null>(null);
  const [allVariations, setAllVariations] = useState<SongData[]>([]);
  const [activeVariationIdx, setActiveVariationIdx] = useState(0);

  // --- Audio Player States ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);

  // --- Suno Player States ---
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(120);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn(e));
      setIsAudioPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const cur = Math.floor(audioRef.current.currentTime);
      setAudioCurrentTime(audioRef.current.currentTime);
      setCurrentTime(cur);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setAudioDuration(audioRef.current.duration);
      }
    }
  };

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const seekTime = percentage * audioDuration;
    audioRef.current.currentTime = seekTime;
    setAudioCurrentTime(seekTime);
  };

  // --- Keepsake Modal State ---
  const [showKeepsake, setShowKeepsake] = useState(false);
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [isVocalizing, setIsVocalizing] = useState(false);

  const trackerRef = useRef<number | null>(null);

  // --- Introductory Video Audio Controls ---
  const [introVideoMuted, setIntroVideoMuted] = useState(true);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  const toggleMinstrelAudio = () => {
    if (introVideoRef.current && typeof introVideoRef.current.play === 'function') {
      const targetMute = !introVideoRef.current.muted;
      introVideoRef.current.muted = targetMute;
      setIntroVideoMuted(targetMute);
    } else {
      setIntroVideoMuted(prev => !prev);
    }
  };

  // Expose toggleMinstrelAudio globally in case of external/script control
  useEffect(() => {
    const globalWin = window as any;
    globalWin.toggleMinstrelAudio = () => {
      if (introVideoRef.current && typeof introVideoRef.current.play === 'function') {
        const targetMute = !introVideoRef.current.muted;
        introVideoRef.current.muted = targetMute;
        setIntroVideoMuted(targetMute);
      } else {
        setIntroVideoMuted(prev => !prev);
      }
    };
    return () => {
      delete globalWin.toggleMinstrelAudio;
    };
  }, []);

  // --- Admin Sandbox Gate States & Handlers ---
  const [isAdminGateVisible, setIsAdminGateVisible] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isTestStudio, setIsTestStudio] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const checkAdminRoute = () => {
      if (window.location.hash === "#admin") {
        setIsAdminMenuVisible(true);
        setIsSystemInitiated(true);
        setActiveSystemTab("admin");
        return;
      }
      const active = window.location.href.includes('/admin/test-studio') || window.location.hash === '#test-studio';
      setIsTestStudio(active);
      setIsAdminGateVisible(active);
      if (active) {
        setTimeout(() => {
          const el = document.getElementById('admin-gate-container');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    };
    
    checkAdminRoute();

    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('load', checkAdminRoute);
    
    return () => {
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('load', checkAdminRoute);
    };
  }, []);

  // --- Read URL for post-payments success triggers ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const successParam = params.get("stripe_checkout") === "success";
    const mockParam = params.get("stripe_mock") === "true";
    const cancelParam = params.get("stripe_checkout") === "cancel";

    if (cancelParam) {
      setPaymentNotice("Checkout cancelled - Adjust your choices or strum again, Haddi is ready whenever you are!");
      window.history.replaceState(null, "", window.location.pathname);
    } else if (successParam || mockParam) {
      const urlTarget = params.get("target") || "";
      const urlContext = params.get("context") || "";
      const urlSetType = (params.get("setType") as SetType) || "quick";
      const urlCustomGenre = params.get("customGenre") || "Acoustic Folk";
      const urlGifterEmail = params.get("gifterEmail") || "";
      const urlRecipientEmail = params.get("recipientEmail") || "";

      if (urlTarget) {
        setTarget(urlTarget);
        setContext(urlContext);
        setSetType(urlSetType);
        setCustomGenre(urlCustomGenre);
        if (urlGifterEmail) setGifterEmail(urlGifterEmail);
        if (urlRecipientEmail) setRecipientEmail(urlRecipientEmail);
        
        const modeLabel = successParam ? "live Stripe payment session" : "sandbox payment simulation";
        setPaymentNotice(`🎉 SECURE CHECKOUT COMPLETION via ${modeLabel}! Compiling Haddi's blessing now...`);
        
        // Auto-run the generation!
        triggerSongGeneration(urlTarget, urlContext, urlSetType, urlCustomGenre);
      }
      
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleValidateAuthorization = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phrase = passwordInput.trim().toUpperCase();
    if (phrase === "SHALOM" || phrase === "ADMIN") {
      setIsAuthorized(true);
      setIsAdminUnlocked(true);
      setPasswordError("");
    } else {
      setPasswordError("Invalid authorization phrase. Please try again.");
    }
  };

  const handleCancelAuthorization = () => {
    setPasswordInput("");
    setPasswordError("");
    setIsAuthorized(false);
    setIsTestStudio(false);
    setIsAdminGateVisible(false);
    window.location.hash = "";
    window.history.replaceState(null, "", window.location.pathname || "/");
  };

  const verifyAdminGate = () => {
    const enteredEmail = (document.getElementById('admin-email-input') as HTMLInputElement | null)?.value.trim() || "";
    const masterDeveloperId = "Pswilliamh@gmail.com";
    
    if (!isAuthorized) {
      alert("Please authorize through the Seraphim Test Studio secure gateway first.");
      return;
    }
    
    if (enteredEmail.toLowerCase() === masterDeveloperId.toLowerCase()) {
      setIsAdminUnlocked(true);
    } else {
      alert("Access Denied: Terminal mismatch. Please enter your registered master developer credentials.");
    }
  };

  // Production handler supporting Lyria 3 Full Sung Song, Haddi Narration, or Both
  const handleGenerateLiveSong = async (storyPrompt: string, overrideMode?: "lyria" | "narration" | "both") => {
    if (!storyPrompt.trim()) return;

    const selectedMode = overrideMode || audioGenerationMode;
    const recipient = (document.getElementById('test-target-email') as HTMLInputElement | null)?.value.trim() || target || "Someone Special";

    setIsLoading(true);
    setStatusMessage(
      selectedMode === "lyria"
        ? "Haddi is composing your full sung studio song via Google AI Studio Lyria 3..."
        : selectedMode === "narration"
        ? "Haddi is recording your spoken acoustic blessing via Google AI Studio..."
        : "Haddi is composing both your Lyria 3 sung studio song & spoken blessing via Google AI Studio..."
    );

    try {
      const response = await fetch('/api/generate-haddi-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: storyPrompt,
          mode: selectedMode,
          target: recipient,
          customGenre,
          setType,
          imageDataUrl: uploadedImages[0] || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio track from server.');
      }

      const data = await response.json();
      
      if (data.audioUrl) {
        if (data.lyriaAudioUrl) setLyriaAudioUrl(data.lyriaAudioUrl);
        if (data.narrationAudioUrl) setNarrationAudioUrl(data.narrationAudioUrl);
        const initialTrackType = selectedMode === "narration" && data.narrationAudioUrl ? "narration" : data.lyriaAudioUrl ? "lyria" : "narration";
        setActiveTrackType(initialTrackType);
        setAudioSource(data.audioUrl);
        setStatusMessage(
          data.lyriaAudioUrl && data.narrationAudioUrl
            ? "Both Lyria 3 Sung Song & Haddi Spoken Blessing generated! Ready to play."
            : data.lyriaAudioUrl
            ? "Lyria 3 Sung Studio Song successfully generated! Ready to play."
            : "Haddi Spoken Blessing successfully generated! Ready to play."
        );

        const lyricText = data.lyrics || storyPrompt;
        setCurrentSong(prev => prev || {
          id: `haddi-${Date.now()}`,
          title: `Acoustic Blessing for ${recipient}`,
          target: recipient,
          context: storyPrompt,
          setType: "quick",
          tempo: "Peaceful Plucking (78 BPM)",
          genre: customGenre || "Modern Worship",
          artistIntro: `Halo kawanku! Haddi here with a song for ${recipient}.`,
          lyricSections: [
            {
              sectionName: "Blessing Verse",
              lines: lyricText.split("\n").filter((l: string) => l.trim().length > 0),
              chords: ["G", "C", "D", "Em"],
              timestamps: [0, 15]
            }
          ],
          totalDurationSeconds: 120
        });
      } else {
        throw new Error('No audio track returned in response payload.');
      }

    } catch (error) {
      console.error("Audio generation failed:", error);
      setStatusMessage("Generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const executeMockSongGeneration = async (storyParam?: string) => {
    const story = (typeof storyParam === 'string' && storyParam)
      ? storyParam
      : (document.getElementById('test-story-context') as HTMLTextAreaElement | null)?.value.trim() || context || "";
    if (!story) {
      alert("Please fill in the target email and blessing story.");
      return;
    }
    return handleGenerateLiveSong(story);
  };

  // --- Mobile Browser Native Voice Blessing ---
  const playHaddiMobileVoice = (generatedLyrics: string) => {
    // Check if the mobile browser supports native speech
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsVocalizing(false);
        return;
      }

      const speech = new SpeechSynthesisUtterance(generatedLyrics);
      
      // Fine-tuning the frequency for a warm, humble, resonant male voice
      speech.pitch = 0.9;  // Slightly deeper tone
      speech.rate = 0.85;  // Deliberate, meaningful cadence
      speech.volume = 1.0; // Full presence
      
      // Find an English male voice model built into your phone
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;
      for (let i = 0; i < voices.length; i++) {
        if (voices[i].name.includes('Male') || voices[i].name.includes('Google US English')) {
          selectedVoice = voices[i];
          break;
        }
      }
      if (selectedVoice) {
        speech.voice = selectedVoice;
      }
      
      speech.onstart = () => {
        setIsVocalizing(true);
      };
      speech.onend = () => {
        setIsVocalizing(false);
      };
      speech.onerror = () => {
        setIsVocalizing(false);
      };

      // Execute the vocal blessing live on your phone
      window.speechSynthesis.speak(speech);
    } else {
      alert("Mobile audio synthesis node not supported on this device.");
    }
  };

  // Expose verifyAdminGate, handleGenerateLiveSong, and executeMockSongGeneration globally for compatibility
  useEffect(() => {
    const globalWin = window as any;
    globalWin.verifyAdminGate = verifyAdminGate;
    globalWin.handleGenerateLiveSong = handleGenerateLiveSong;
    globalWin.executeMockSongGeneration = executeMockSongGeneration;
    globalWin.playHaddiMobileVoice = (generatedLyrics: string) => playHaddiMobileVoice(generatedLyrics);
    return () => {
      delete globalWin.verifyAdminGate;
      delete globalWin.handleGenerateLiveSong;
      delete globalWin.executeMockSongGeneration;
      delete globalWin.playHaddiMobileVoice;
    };
  }, []);

  // --- Strum audio synchronization helpers ---
  // Returns what chord should ring out at the current elapsed player time
  const getChordAtTime = (): string => {
    if (!currentSong) return "G";
    // Search the lyric sections chronologically
    const sections = currentSong.lyricSections;
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      // Pick the chord matching the active timeline line
      for (let j = section.timestamps.length - 1; j >= 0; j--) {
        if (currentTime >= section.timestamps[j]) {
          return section.chords[j] || section.chords[0] || "G";
        }
      }
    }
    return "G";
  };

  // Synchronized progress trigger (only used if no real audio element is playing)
  useEffect(() => {
    if (isPlaying && currentSong && !audioUrl) {
      trackerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= currentSong.totalDurationSeconds) {
            setIsPlaying(false);
            luteEngineInstance.stopLutePlayback();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (trackerRef.current) {
        clearInterval(trackerRef.current);
        trackerRef.current = null;
      }
    }

    return () => {
      if (trackerRef.current) {
        clearInterval(trackerRef.current);
      }
    };
  }, [isPlaying, currentSong, audioUrl]);

  // Audio engine volume bindings (controls both real HTML5 audio and fallback engine)
  useEffect(() => {
    const vol = muted ? 0 : volume / 100;
    luteEngineInstance.setVolume(vol);
    setAudioVolume(vol);
    setIsAudioMuted(muted);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Sync variations with main active track selection
  useEffect(() => {
    if (allVariations.length > 0 && allVariations[activeVariationIdx]) {
      setCurrentSong(allVariations[activeVariationIdx]);
      setCurrentTime(0);
      setIsPlaying(false);
      luteEngineInstance.stopLutePlayback();
    }
  }, [activeVariationIdx, allVariations]);

  // --- Action Handlers ---
  const triggerSongGeneration = async (
    targetVal: string,
    contextVal: string,
    setTypeVal: SetType,
    customGenreVal: string
  ) => {
    setError("");
    setIsRendering(true);
    setStage(2); // Jump to Avatar loader Screen
    setLoadingStep(0);

    // Simulated staggered loading visual increments while calling backend
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    try {
      // 1. Submit Request to the Full-Stack server API
      const res = await fetch("/api/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: targetVal.trim(),
          context: contextVal.trim(),
          setType: setTypeVal,
          customGenre: customGenreVal
        })
      });

      const data = await res.json();
      if (!data.success || !data.song) {
        throw new Error(data.error || "Internal generation failed.");
      }

      const returnedSong: SongData = data.song;
      
      // Determine if variations list was populated via Extended Encore, Premium, or Legacy selection
      if ((setTypeVal === "extended" || setTypeVal === "premium" || setTypeVal === "legacy") && data.variations) {
        setAllVariations(data.variations);
        setActiveVariationIdx(0);
        setCurrentSong(data.variations[0]);
      } else {
        setAllVariations([returnedSong]);
        setActiveVariationIdx(0);
        setCurrentSong(returnedSong);
      }

      // 2. Generate Real AI Audio Track (Lyria 3 Sung Song, Haddi Narration, or Both)
      const compiledLyrics = returnedSong.lyricSections
        ?.filter(s => s.sectionName !== "Intro")
        .flatMap(s => s.lines)
        .join("\n") || contextVal;

      try {
        const audioRes = await fetch("/api/generate-haddi-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: contextVal.trim() || `A special ${customGenreVal} blessing song for ${targetVal.trim()}`,
            mode: audioGenerationMode,
            target: targetVal.trim(),
            customGenre: customGenreVal,
            setType: setTypeVal,
            lyrics: compiledLyrics,
            imageDataUrl: uploadedImages[0] || undefined,
          }),
        });
        const audioData = await audioRes.json();
        if (audioData.audioUrl) {
          if (audioData.lyriaAudioUrl) setLyriaAudioUrl(audioData.lyriaAudioUrl);
          if (audioData.narrationAudioUrl) setNarrationAudioUrl(audioData.narrationAudioUrl);
          const initType = audioGenerationMode === "narration" && audioData.narrationAudioUrl ? "narration" : audioData.lyriaAudioUrl ? "lyria" : "narration";
          setActiveTrackType(initType);
          setAudioSource(audioData.audioUrl);
        }
      } catch (audioGenErr) {
        console.warn("AI audio track generation warning:", audioGenErr);
      }

      // Transition smoothly into Stage 3 Playing Screen with the complete AI song ready to play!
      luteEngineInstance.stopLutePlayback();
      recordFreeSongUsage(returnedSong.title, returnedSong.target);
      clearInterval(interval);
      setStage(3);
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      setError("Trouble tuning to this exact frequency. Let us retry.");
      setStage(1);
    } finally {
      setIsRendering(false);
    }
  };

  const handleInitiateSystem = (prefill?: {
    target?: string;
    context?: string;
    genre?: string;
    autoGenerate?: boolean;
    initialSection?: "studio" | "free-songs" | "lifetime" | "affiliate" | "admin";
  }) => {
    // Stop demo lute if playing on landing page
    if (isPlaying) {
      luteEngineInstance.stopLutePlayback();
      setIsPlaying(false);
    }

    if (prefill?.target) setTarget(prefill.target);
    if (prefill?.context) setContext(prefill.context);
    if (prefill?.genre) setCustomGenre(prefill.genre);
    if (prefill?.initialSection) {
      if (prefill.initialSection === "admin") {
        setIsAdminMenuVisible(true);
      }
      setActiveSystemTab(prefill.initialSection);
    } else {
      setActiveSystemTab("studio");
    }

    setIsSystemInitiated(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (prefill?.autoGenerate && prefill.target) {
      const storyText =
        prefill.context || `A heartfelt custom blessing song dedicated to ${prefill.target}.`;
      triggerSongGeneration(
        prefill.target,
        storyText,
        setType,
        prefill.genre || customGenre
      );
    }
  };

  const handleStrumSong = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const valEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const hasFreePassOrLifetime = freeSongsRemaining > 0 || isLifetimeUnlocked;

    if (!hasFreePassOrLifetime && !gifterEmail.trim()) {
      setError("Please specify Your Email (Gifter) - this is required so Haddi can deliver your digital keepsake!");
      return;
    }
    if (gifterEmail.trim() && !valEmail(gifterEmail)) {
      setError("Please enter a valid Gifter Email format.");
      return;
    }
    if (!hasFreePassOrLifetime && !recipientEmail.trim()) {
      setError("Please specify the Recipient's Email - this is required so Haddi can dedicate the song correctly!");
      return;
    }
    if (recipientEmail.trim() && !valEmail(recipientEmail)) {
      setError("Please enter a valid Recipient Email format.");
      return;
    }
    if (!target.trim()) {
      setError("Please specify who you are creating this song for.");
      return;
    }
    const wordCount = context.trim() === "" ? 0 : context.trim().split(/\s+/).length;
    if (wordCount > 500) {
      setError("Please keep your Context & Special Story under 500 words before strumming.");
      return;
    }
    setError("");
    setIsGenerating(true);
    setIsRendering(true);
    setStage(2);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    try {
      // 1. Prepare user's context payload and execute fetch request to `/api/generate-song` gateway
      const res = await fetch("/api/generate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          context: context.trim(),
          setType,
          customGenre,
          gifterEmail: gifterEmail.trim(),
          recipientEmail: recipientEmail.trim()
        })
      });

      const data = await res.json();
      if (!data.success || !data.song) {
        throw new Error(data.error || "Minstrel song generation failed. Please try again.");
      }

      const returnedSong: SongData = data.song;
      setCurrentSong(returnedSong);

      if ((setType === "extended" || setType === "premium" || setType === "legacy") && data.variations) {
        setAllVariations(data.variations);
        setActiveVariationIdx(0);
      } else {
        setAllVariations([returnedSong]);
        setActiveVariationIdx(0);
      }

      // 2. Generate Real AI Audio via Google AI Studio (Lyria 3 Sung Studio Song, Haddi Narration, or Both!)
      const compiledLyrics = returnedSong.lyricSections
        ?.filter(s => s.sectionName !== "Intro")
        .flatMap(s => s.lines)
        .join("\n") || context.trim();

      const audioRes = await fetch("/api/generate-haddi-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: context.trim() || `A heartfelt ${customGenre} blessing song dedicated to ${target.trim()}`,
          mode: audioGenerationMode,
          target: target.trim(),
          customGenre,
          setType,
          lyrics: compiledLyrics,
          imageDataUrl: uploadedImages[0] || undefined,
        }),
      });

      const audioData = await audioRes.json();
      if (audioData.audioUrl) {
        if (audioData.lyriaAudioUrl) setLyriaAudioUrl(audioData.lyriaAudioUrl);
        if (audioData.narrationAudioUrl) setNarrationAudioUrl(audioData.narrationAudioUrl);
        const initType = audioGenerationMode === "narration" && audioData.narrationAudioUrl ? "narration" : audioData.lyriaAudioUrl ? "lyria" : "narration";
        setActiveTrackType(initType);
        setAudioSource(audioData.audioUrl);
      }

      recordFreeSongUsage(returnedSong.title, returnedSong.target);
      clearInterval(interval);
      setStage(3);
      setIsPlaying(true);

    } catch (err: any) {
      console.error(err);
      clearInterval(interval);
      setError(err.message || "Trouble processing complete song generation. Please retry.");
      setStage(1);
    } finally {
      setIsGenerating(false);
      setIsRendering(false);
    }
  };

  const togglePlayback = () => {
    // Always prioritize the complete AI-generated song audio (Lyria 3 / Haddi Audio) over the procedural lute synthesizer
    if (audioUrl && audioRef.current) {
      luteEngineInstance.stopLutePlayback();
      if (isAudioPlaying || !audioRef.current.paused) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.warn("Audio playback notice:", e));
        setIsAudioPlaying(true);
        setIsPlaying(true);
      }
      return;
    }

    if (isPlaying) {
      luteEngineInstance.stopLutePlayback();
      setIsPlaying(false);
    } else {
      luteEngineInstance.initContext();
      luteEngineInstance.startLutePlayback(() => getChordAtTime());
      setIsPlaying(true);
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = seconds;
      setAudioCurrentTime(seconds);
    }
  };

  const handleReset = () => {
    luteEngineInstance.stopLutePlayback();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsAudioPlaying(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setTarget("");
    setContext("");
    setSetType("quick");
    setStage(1);
  };

  const handleShareWhatsApp = () => {
    if (!currentSong) return;
    const text = encodeURIComponent(
      `🎵 I created a personalized song titled "${currentSong.title}" for ${currentSong.target} on mysong.ai!\n` +
      `Occasion: ${currentSong.context}\n` +
      `Check out this custom acoustic masterpiece! 🌟`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleCopyLyrics = () => {
    if (!currentSong) return;
    const text = currentSong.lyricSections.map(s => 
      `[${s.sectionName}]\n` + s.lines.join("\n")
    ).join("\n\n");

    navigator.clipboard.writeText(`"${currentSong.title}" for ${currentSong.target}\n\n${text}`);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  // Render format helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={
        !isSystemInitiated
          ? "min-h-screen bg-white text-slate-900 flex flex-col justify-between font-sans selection:bg-amber-400 selection:text-black"
          : "min-h-screen bg-[#0d0a08] text-white flex flex-col justify-between font-sans selection:bg-[#FFD700] selection:text-black main-studio-bg"
      }
    >
      {/* --- Ambient Star Decor & Floating Note Stream (Only in Full Studio View) --- */}
      {isSystemInitiated && (
        <>
          <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="absolute top-[10%] left-[5%] text-[#C5A880] text-lg ambient-decor"><Star size={16} /></div>
            <div className="absolute top-[40%] right-[8%] text-[#C5A880]/30 text-xl ambient-decor delay-1000"><Star size={12} /></div>
            <div className="absolute bottom-[25%] left-[12%] text-[#C5A880]/40 text-lg ambient-decor delay-3000"><Star size={14} /></div>
            <div className="absolute top-[80%] right-[20%] text-[#C5A880]/25 text-2xl ambient-decor delay-500"><Star size={10} /></div>
          </div>

          <div className="fixed w-full pointer-events-none overflow-hidden z-10" style={{ top: "15%", height: "180px" }}>
            <div className="music-note-stream">
              <span className="note-item" style={{ animationDelay: "0s", top: "10%" }}>♫</span>
              <span className="note-item" style={{ animationDelay: "2s", top: "35%" }}>♪</span>
              <span className="note-item" style={{ animationDelay: "4.5s", top: "15%" }}>♬</span>
              <span className="note-item" style={{ animationDelay: "6.5s", top: "65%" }}>♫</span>
              <span className="note-item" style={{ animationDelay: "8s", top: "25%" }}>♪</span>
              <span className="note-item" style={{ animationDelay: "10s", top: "45%" }}>♬</span>
              <span className="note-item" style={{ animationDelay: "12s", top: "5%" }}>♫</span>
            </div>
          </div>
        </>
      )}

      {/* --- CLEAN CLUTTER-FREE LANDING PAGE (BEFORE SYSTEM INITIATION) --- */}
      {!isSystemInitiated ? (
        <LandingExperience
          freeSongsRemaining={freeSongsRemaining}
          referralCount={referrals.length}
          adminEmail={adminUser.isAuthenticated ? adminUser.email : undefined}
          onResetFreeSongs={handleResetFreeSongs}
          audioSource={audioSource}
          lyriaAudioUrl={lyriaAudioUrl}
          narrationAudioUrl={narrationAudioUrl}
          activeTrackType={activeTrackType}
          onSelectTrackType={handleSelectTrackType}
          isPlayingDemo={isPlaying}
          onToggleDemoPlayback={togglePlayback}
          onInitiateSystem={handleInitiateSystem}
        />
      ) : (
        <>
          {/* --- FULL SYSTEM HEADER (SHOWN AFTER USER INITIATES SYSTEM) --- */}
          <header className="border-b border-[#C5A880]/20 bg-[#0c0b0a]/95 backdrop-blur-lg sticky top-0 z-40 px-4 sm:px-6 py-4">
            <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  setActiveSystemTab("studio");
                  handleReset();
                }}
              >
                <img
                  src="/pwa-192x192.png"
                  alt="mygiftsong.ai App Icon"
                  className="w-11 h-11 rounded-2xl border-2 border-[#FFD700] object-cover shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                />
                <div>
                  <h1 className="text-lg md:text-xl font-display font-bold tracking-wide text-white flex items-center gap-1.5">
                    mygiftsong.aiapps.com <span className="text-[#FFD700] text-xs font-mono font-semibold">STUDIO</span>
                  </h1>
                  <p className="text-[11px] text-[#FFD700]/80 tracking-widest uppercase font-mono font-medium">
                    Haddi the Street Minstrel
                  </p>
                </div>
              </div>

              {/* Navigation Tabs for All Full System Features */}
              <nav className="flex flex-wrap items-center gap-2">
                <PWAInstallButton variant="dark" />

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("studio")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeSystemTab === "studio"
                      ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                      : "bg-[#1c1815] text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/25"
                  }`}
                >
                  <Music size={13} />
                  <span>Song Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("free-songs")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeSystemTab === "free-songs"
                      ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                      : "bg-[#1c1815] text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/25"
                  }`}
                >
                  <Gift size={13} />
                  <span>First 5 Free ({isLifetimeUnlocked ? "∞" : `${freeSongsRemaining}/5`})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("lifetime")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeSystemTab === "lifetime"
                      ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                      : "bg-[#1c1815] text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/25"
                  }`}
                >
                  <Crown size={13} />
                  <span>10 Signups = Lifetime ({Math.min(10, basic099ReferralCount)}/10 • {Math.min(10, premiumReferralCount)}/10)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("affiliate")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeSystemTab === "affiliate"
                      ? "bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                      : "bg-[#1c1815] text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/25"
                  }`}
                >
                  <TrendingUp size={13} />
                  <span>Affiliate Hub</span>
                </button>

                {isAdminMenuVisible && (
                  <button
                    type="button"
                    onClick={() => setActiveSystemTab("admin")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeSystemTab === "admin"
                        ? "bg-emerald-400 text-black shadow-[0_0_15px_rgba(52,211,153,0.35)]"
                        : "bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900 border border-emerald-500/40"
                    }`}
                    title="Private Master Admin Console"
                  >
                    <ShieldCheck size={13} />
                    <span>Admin</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsSystemInitiated(false)}
                  className="px-3 py-2 rounded-xl text-xs font-mono text-[#C5A880] hover:text-white bg-black/50 border border-[#C5A880]/20 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Return to Clean Welcome Landing Page"
                >
                  <ArrowLeft size={13} />
                  <span className="hidden sm:inline">Welcome Page</span>
                </button>
              </nav>
            </div>
          </header>

          {/* --- MAIN STAGES MATRIX & SEPARATE SYSTEM SECTIONS --- */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
            {activeSystemTab === "admin" ? (
              <AdminAccountDashboard
                adminUser={adminUser}
                onUpdateAdminUser={handleUpdateAdminUser}
                freeSongsRemaining={freeSongsRemaining}
                freeSongsUsedHistory={freeSongsUsedHistory}
                onResetFreeSongs={handleResetFreeSongs}
                onRefundSongSlot={handleRefundSongSlot}
                referrals={referrals}
                onClearReferrals={handleClearReferrals}
                onAddReferral={handleAddReferral}
                onOpenStudio={() => {
                  setActiveSystemTab("studio");
                  setStage(1);
                }}
                onHideAdmin={() => {
                  setIsAdminMenuVisible(false);
                  setActiveSystemTab("studio");
                  if (window.location.hash === "#admin") {
                    window.history.replaceState(null, "", window.location.pathname);
                  }
                }}
                onOpenSandbox={() => {
                  setIsAdminGateVisible(true);
                  setIsAuthorized(true);
                  setIsAdminUnlocked(true);
                  setTimeout(() => {
                    const el = document.getElementById("admin-gate-container");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 150);
                }}
              />
            ) : activeSystemTab !== "studio" ? (
              <RewardsAndAffiliateSections
                activeSubPage={activeSystemTab}
                freeSongsRemaining={freeSongsRemaining}
                freeSongsUsedHistory={freeSongsUsedHistory}
                referrals={referrals}
                onAddReferral={handleAddReferral}
                onResetFreeSongs={handleResetFreeSongs}
                onRefundSongSlot={handleRefundSongSlot}
                onStartSongInStudio={(preset) => {
                  if (preset?.target) setTarget(preset.target);
                  if (preset?.context) setContext(preset.context);
                  if (preset?.genre) setCustomGenre(preset.genre);
                  setActiveSystemTab("studio");
                  setStage(1);
                }}
              />
            ) : (
              <AnimatePresence mode="wait">

                {/* STAGE 1: THE STUDIO INPUT FORM */}
                {stage === 1 && (
                  <motion.div
                    key="stage1"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-6 w-full max-w-[1100px] mx-auto py-2 animate-fade-in"
                  >
              {paymentNotice && (
                <div id="stripe-checkout-notice" className="bg-[#1c1815]/95 border-2 border-[#FFD700] rounded-2xl p-4 md:p-5 w-full flex items-center justify-between text-xs md:text-sm text-amber-200 font-medium tracking-wide shadow-[0_0_20px_rgba(255,215,0,0.25)] animate-pulse mb-2">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-[#FFD700] shrink-0" size={18} />
                    <span>{paymentNotice}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setPaymentNotice(null)} 
                    className="text-[#FFD700] hover:text-white transition-colors p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Expandable Accordion: Our Purpose & How to Use */}
              <div className="w-full bg-[#121110]/85 border border-[#C5A880]/30 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl transition-all">
                <button
                  type="button"
                  id="purpose_accordion_toggle"
                  onClick={() => setIsPurposeExpanded(!isPurposeExpanded)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-[#FFD700] tracking-wider uppercase bg-[#1c1917]/85 hover:bg-[#2c2824]/90 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    ✨ OUR PURPOSE & HOW TO USE THIS APP {isPurposeExpanded ? "(CLICK TO COLLAPSE)" : "(CLICK TO EXPAND)"}
                  </span>
                  <ChevronRight size={18} className={`text-[#FFD700] transition-transform duration-300 ${isPurposeExpanded ? 'rotate-90' : 'rotate-0'}`} />
                </button>
                
                {isPurposeExpanded && (
                  <div className="p-6 md:p-8 space-y-6 border-t border-[#C5A880]/20 bg-black/60 text-white/90 animate-fade-in text-left">
                    {/* Official 5+3 Lyre Mandate */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-mono font-bold text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
                        📜 The Official 5+3 Lyre Mandate
                      </h4>
                      <p className="text-xs md:text-sm leading-relaxed text-[#FAF9F6]/90 font-sans pl-4 border-l border-[#FFD700]/40">
                        Haddi’s system integrates five distinct digital narrative dimensions (character, location, history, milestone, and blessing) with three traditional acoustic plucking intentions (sincerity, honor, and resonance). Every single track is engineered not as generic ambient music, but as an active sonic keepsake.
                      </p>
                    </div>

                    {/* The 4-Step Gifting Journey */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-mono font-bold text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
                        🚀 The 4-Step Gifting Journey
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pl-4">
                        <div className="bg-[#1c1917]/70 border border-[#C5A880]/15 rounded-xl p-4 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-widest bg-[#2c1e14] px-2 py-0.5 rounded">Step 01</span>
                          <h5 className="text-xs font-bold text-white font-sans uppercase">Identify & Honor</h5>
                          <p className="text-[11px] text-white/75 leading-relaxed font-sans">
                            Specify the name of the special person or group the custom song is created to dedicate.
                          </p>
                        </div>
                        <div className="bg-[#1c1917]/70 border border-[#C5A880]/15 rounded-xl p-4 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-widest bg-[#2c1e14] px-2 py-0.5 rounded">Step 02</span>
                          <h5 className="text-xs font-bold text-white font-sans uppercase">Weave the Lore</h5>
                          <p className="text-[11px] text-white/75 leading-relaxed font-sans">
                            Describe memories, details, and message prompts to feed the acoustic AI songcrafting engine.
                          </p>
                        </div>
                        <div className="bg-[#1c1917]/70 border border-[#C5A880]/15 rounded-xl p-4 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-widest bg-[#2c1e14] px-2 py-0.5 rounded">Step 03</span>
                          <h5 className="text-xs font-bold text-white font-sans uppercase">Choose Frequency & Images</h5>
                          <p className="text-[11px] text-white/75 leading-relaxed font-sans">
                            Select a dedicated music theme and package bundle. For Premium Video ($4.99) or Legacy Bundle ($12.99), attach up to 5 personal photos to build a custom lyric slideshow.
                          </p>
                        </div>
                        <div className="bg-[#1c1917]/70 border border-[#C5A880]/15 rounded-xl p-4 space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-widest bg-[#2c1e14] px-2 py-0.5 rounded">Step 04</span>
                          <h5 className="text-xs font-bold text-white font-sans uppercase">Strum & Receive</h5>
                          <p className="text-[11px] text-white/75 leading-relaxed font-sans">
                            Securely checkout to compile Haddi's blessing. The high-fidelity audio or video link will be deployed directly to the recipient's inbox!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Section: Side-by-Side 50/50 Layout for Intro Text & Video/Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 items-stretch p-6 rounded-2xl bg-[#0c0b0a]/70 border border-[#C5A880]/15 backdrop-blur-md shadow-2xl max-w-[1100px] mx-auto w-full">
                
                {/* Left Side: Centered Smoked Charcoal Greeting Text Block & Flagship Video */}
                <div className="flex flex-col justify-start items-center text-center space-y-5 p-6 md:p-8 rounded-xl bg-[#121110]/95 border border-[#C5A880]/15 h-full">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#251e19] border border-[#C5A880]/20 rounded-full text-[10px] md:text-xs font-mono text-[#FFD700] uppercase tracking-wider">
                    <Sparkles size={12} className="text-[#FFD700]" /> 5+3 Lyre Method
                  </div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-black tracking-wide text-white" style={{ textShadow: "2px 4px 12px rgba(0, 0, 0, 0.95), 0px 0px 20px rgba(0, 0, 0, 0.6)" }}>
                    Who is your <span className="text-[#FFD700]">Acoustic Song</span> honoring today?
                  </h1>
                  <p className="text-[#FAF9F6]/85 text-xs md:text-sm leading-relaxed font-sans">
                    Shalom! Welcome. My name is Haddi, a local street musician here in Jakarta, and this is my digital musician street corner. There is no greater gift than a song... so tell me, whose heart are we honoring with our silver strings today?
                  </p>

                  {/* Flagship Video Canvas: universal, front-and-center landing track layout with zero barriers */}
                  <div className="relative w-full rounded-xl overflow-hidden border border-[#C5A880]/20 shadow-xl bg-black/80 flex items-center justify-center aspect-video min-h-[200px]">
                    <iframe 
                      id="haddi-video"
                      src="https://drive.google.com/file/d/1H7bdSkULkzoNQGqqno26_KJzAPsZUPL2/preview" 
                      width="100%" 
                      height="450" 
                      allow="autoplay" 
                      style={{ border: "none", borderRadius: "12px", backgroundColor: "#050b14" }}
                    ></iframe>

                    {/* Golden unmute/mute overlay button */}
                    <button 
                      id="unmute-btn" 
                      type="button"
                      onClick={toggleMinstrelAudio}
                      style={{
                        position: "absolute",
                        bottom: "15px",
                        right: "15px",
                        background: "rgba(12, 11, 10, 0.85)",
                        border: "1.5px solid #FFD700",
                        color: "#FFD700",
                        borderRadius: "50%",
                        width: "42px",
                        height: "42px",
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        boxShadow: "0 0 12px rgba(255, 215, 0, 0.4)",
                        zIndex: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                      className="hover:scale-105 active:scale-95"
                    >
                      {introVideoMuted ? "🔇" : "🔊"}
                    </button>
                  </div>

                  {/* Official Anthem Lyrics Banner Container: Dedicated full-width banner container positioned underneath the media player */}
                  <div className="w-full bg-[#1c1917]/95 border-2 border-[#FFD700]/40 rounded-xl px-4 py-3.5 text-center shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/5 to-transparent animate-pulse pointer-events-none" />
                    <p className="text-xs sm:text-sm md:text-md text-[#FFD700] font-mono font-extrabold tracking-wider uppercase leading-relaxed select-none relative z-10 text-shadow-md">
                      "THERE IS NO GREATER GIFT THAN A SONG... IT IS WORTH MORE THAN A THOUSAND WORDS!"
                    </p>
                  </div>

                  {/* BOTTOM video player or custom audio player or loader depending on Suno state */}
                  {isGenerating ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-[#FFD700]/30 shadow-[0_0_25px_rgba(255,215,0,0.15)] bg-[#120e0a]/90 flex flex-col items-center justify-center aspect-video min-h-[200px] p-6 space-y-4">
                      <div className="relative flex items-center justify-center">
                        <Disc size={40} className="text-[#FFD700] animate-spin [animation-duration:3s]" />
                        <Sparkles size={16} className="text-[#FFD700] absolute -top-1 -right-1 animate-ping" />
                      </div>
                      <div className="space-y-1 text-center max-w-xs">
                        <p className="text-xs font-mono font-bold text-[#FFD700] uppercase tracking-widest animate-pulse">HADDI IS STRUMMING...</p>
                        <p className="text-[10px] text-[#FAF9F6]/70 font-sans italic leading-relaxed">
                          "Plucking silver strings with Sumatra passion and Jakarta energy..."
                        </p>
                      </div>
                    </div>
                  ) : audioUrl ? (
                    <div className="relative w-full rounded-xl overflow-hidden border border-[#FFD700]/40 shadow-[0_0_25px_rgba(255,215,0,0.2)] bg-[#120e0a]/95 flex flex-col justify-center items-center p-5 aspect-video min-h-[200px] space-y-3.5">
                      <div className="flex items-center gap-3.5 w-full">
                        <div className={`p-3.5 rounded-full bg-black/60 border-2 border-[#FFD700] text-[#FFD700] relative shrink-0 ${isAudioPlaying ? 'animate-spin [animation-duration:10s]' : ''}`}>
                          <Disc size={26} />
                          <div className="absolute -inset-1 bg-[#FFD700]/10 blur-md rounded-full -z-10" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <span className="text-[9px] font-mono text-[#FFD700] uppercase tracking-widest block font-bold">
                            {activeTrackType === "narration" ? "Haddi Minstrel Spoken Blessing" : "Lyria 3 Sung Studio Master"}
                          </span>
                          <h4 className="text-xs md:text-sm font-bold text-white truncate font-sans uppercase">
                            {currentSong?.title || "Bespoke Acoustic Masterpiece"}
                          </h4>
                          <p className="text-[10px] text-white/50 font-mono truncate">
                            Style: {customGenre} • {setType.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      {/* Dual Option Track Switcher inside Main Studio Player */}
                      {(lyriaAudioUrl || narrationAudioUrl) && (
                        <div className="grid grid-cols-2 gap-2 w-full bg-black/60 p-1 rounded-lg border border-[#FFD700]/20">
                          <button
                            type="button"
                            onClick={() => handleSelectTrackType("lyria")}
                            disabled={!lyriaAudioUrl}
                            className={`py-1 px-2 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-40 ${
                              activeTrackType === "lyria" && lyriaAudioUrl
                                ? "bg-[#FFD700] text-black"
                                : "text-white/70 hover:text-white"
                            }`}
                          >
                            🎸 Sung Song (Lyria 3)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectTrackType("narration")}
                            disabled={!narrationAudioUrl}
                            className={`py-1 px-2 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-40 ${
                              activeTrackType === "narration" && narrationAudioUrl
                                ? "bg-[#FFD700] text-black"
                                : "text-white/70 hover:text-white"
                            }`}
                          >
                            🎙️ Haddi Narration
                          </button>
                        </div>
                      )}

                      {/* Active HTML5 Audio Player */}
                      <audio
                        id="suno-audio-player"
                        src={audioUrl}
                        ref={audioRef}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onEnded={() => setIsAudioPlaying(false)}
                        autoPlay={true}
                        muted={false}
                        controls={true}
                        className="w-full mt-2 block rounded-lg bg-black/40 border border-[#FFD700]/20 text-white"
                      />

                      {/* Progress Line */}
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-white/40">
                          <span>{formatTime(audioCurrentTime)}</span>
                          <span>{formatTime(audioDuration || 120)}</span>
                        </div>
                        <div
                          onClick={handleAudioSeek}
                          className="h-1.5 w-full bg-white/10 rounded-full cursor-pointer relative overflow-hidden group hover:h-2 transition-all"
                        >
                          <div
                            className="h-full bg-gradient-to-r from-[#FFD700] via-[#FCE068] to-[#FFD700] rounded-full transition-all duration-100"
                            style={{ width: `${(audioCurrentTime / (audioDuration || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Lower Action Layout */}
                      <div className="flex items-center justify-between w-full pt-1.5">
                        <button
                          type="button"
                          onClick={toggleAudioPlayback}
                          className="bg-[#FFD700] hover:bg-[#FCE068] text-black rounded-lg px-4 py-1.5 text-[10px] font-mono tracking-wider font-extrabold uppercase transition-all duration-200 active:scale-95 flex items-center gap-1.5 shadow-[0_2px_8px_rgba(255,215,0,0.15)] shrink-0"
                        >
                          {isAudioPlaying ? (
                            <>
                              <Pause size={12} fill="currentColor" /> PAUSE
                            </>
                          ) : (
                            <>
                              <Play size={12} fill="currentColor" /> PLAY
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-1 border border-white/5">
                          <p className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#FFD700] animate-ping" />
                            LIVE
                          </p>
                        </div>

                        {/* Mute and volume */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (audioRef.current) {
                                const targetMute = !audioRef.current.muted;
                                audioRef.current.muted = targetMute;
                                setIsAudioMuted(targetMute);
                              }
                            }}
                            className="text-white/60 hover:text-white p-1"
                          >
                            {isAudioMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-[#FFD700]" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={audioVolume}
                            onChange={(e) => {
                              const newVol = parseFloat(e.target.value);
                              setAudioVolume(newVol);
                              if (audioRef.current) {
                                audioRef.current.volume = newVol;
                                audioRef.current.muted = false;
                                setIsAudioMuted(false);
                              }
                            }}
                            className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full rounded-xl overflow-hidden border border-[#C5A880]/20 shadow-xl bg-black/80 flex items-center justify-center aspect-video min-h-[200px]">
                      <iframe 
                        id="premium-preview-video"
                        src="https://drive.google.com/file/d/1dvyq1PS79s4e3GZlcDxZ3tK2lGKktyiC/preview" 
                        width="100%" 
                        height="450" 
                        allow="autoplay" 
                        style={{ border: "none", borderRadius: "12px", backgroundColor: "#050b14" }}
                      ></iframe>
                    </div>
                  )}

                  {/* The Sound of Honor & Covenant definition panel */}
                  <div className="w-full p-5 bg-[#1c1917]/60 border border-[#C5A880]/20 rounded-xl text-left backdrop-blur-md shadow-lg space-y-2 mt-1">
                    <h4 className="text-xs sm:text-sm font-mono font-semibold text-[#FFD700] uppercase tracking-widest flex items-center gap-1.5">
                      🎻 The Sound of Honor & Covenant
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#FAF9F6]/90 leading-relaxed font-sans">
                      A bespoke acoustic song is more than a melody; it is a sacred covenant of remembrance. Through Haddi's silver strings, your shared history, milestones, and blessings are bound into a living testament of honor, designed to persist as an unbreakable heritage of love and devotion.
                    </p>
                  </div>

                  {/* Custom Gift Song Card Preview */}
                  {audioUrl && (
                    <div className="w-full mt-2">
                      <GiftSongCard
                        audioUrl={audioSource || audioUrl}
                        lyriaAudioUrl={lyriaAudioUrl}
                        narrationAudioUrl={narrationAudioUrl}
                        activeTrackType={activeTrackType}
                        onSelectTrackType={handleSelectTrackType}
                        songTitle={currentSong?.title || "The Sound of Honor & Covenant"}
                        lyrics={
                          currentSong?.lyricSections?.filter(s => s.sectionName !== "Intro").flatMap(s => s.lines).join("\n") ||
                          context ||
                          "A gentle melody of blessings and remembrance, plucked upon silver strings with honor and grace."
                        }
                        recipientName={currentSong?.target || target || "Someone Special"}
                      />
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-xl text-xs font-mono text-red-300 w-full text-center">
                      ⚠️ {error}
                    </div>
                  )}
                </div>

                {/* Right Side: Interactive Studio Form */}
                <div className="input-panel-container window relative right-interaction-box w-full p-6 bg-[#0c0b0a]/40 border border-[#C5A880]/15 rounded-xl flex flex-col justify-between min-h-full h-auto">
                  
                  {/* Decorative Frame */}
                  <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-[#C5A880]/30 rounded-tl"></div>
                  <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[#C5A880]/30 rounded-tr"></div>
                  <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-[#C5A880]/30 rounded-bl"></div>
                  <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[#C5A880]/30 rounded-br"></div>

                  <div className="space-y-6">
                    
                    {/* --- REQUIRED GIFTER & RECIPIENT EMAILS --- */}
                    <div className="flex flex-col gap-4 bg-black/40 border border-[#C5A880]/15 p-4 rounded-xl">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] md:text-xs font-mono text-[#FFD700] uppercase tracking-widest font-bold flex items-center gap-1.5">
                            📨 Your Email *
                          </label>
                          {gifterEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAdminMenuVisible(true);
                                setActiveSystemTab("admin");
                              }}
                              className="text-[10px] font-mono font-bold text-emerald-400 hover:text-[#FFD700] flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldCheck size={12} /> Open Admin Console
                            </button>
                          )}
                        </div>
                        <input
                          id="gifter_email_input"
                          type="email"
                          required
                          placeholder="gifter@example.com"
                          value={gifterEmail}
                          onChange={(e) => setGifterEmail(e.target.value)}
                          className="w-full bg-black/90 border-2 border-[#C5A880]/80 rounded-xl px-3 py-2 text-[#FAF9F6] text-xs placeholder-white/30 focus:outline-none focus:border-[#FFD700] transition-all font-sans font-medium custom-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-mono text-[#FFD700] uppercase tracking-widest font-bold flex items-center gap-1.5">
                          ✉️ Recipient's Email *
                        </label>
                        <input
                          id="recipient_email_input"
                          type="email"
                          required
                          placeholder="recipient@example.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="w-full bg-black/90 border-2 border-[#C5A880]/80 rounded-xl px-3 py-2 text-[#FAF9F6] text-xs placeholder-white/30 focus:outline-none focus:border-[#FFD700] transition-all font-sans font-medium custom-input"
                        />
                      </div>
                    </div>

                    {/* [1. THE TARGET] */}
                    <div className="space-y-2">
                      <label className="text-[1.1rem] md:text-[1.3rem] font-mono text-[#FFD700] uppercase tracking-widest flex items-center gap-2 font-semibold">
                        <User size={16} /> Play a Song For...
                      </label>
                      <input
                        id="target_recipient_input"
                        type="text"
                        maxLength={40}
                        placeholder="e.g. Audrey, Johnny, My Eco-Brand"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className="w-full bg-black/90 border-2 border-[#C5A880] rounded-xl px-4 py-3 text-[#FAF9F6] placeholder-white/30 focus:outline-none focus:border-[#FFD700] transition-all font-sans text-[1.1rem] md:text-[1.3rem] font-medium custom-input"
                      />
                    </div>

                    {/* [2. THE CONTEXT] */}
                    <div className="space-y-2">
                      <label className="text-sm md:text-md font-mono text-[#FFD700] uppercase tracking-widest flex items-center gap-2 font-semibold">
                        <Calendar size={16} /> The Context & Special Story
                      </label>
                      <textarea
                        id="context_story_textarea"
                        rows={5}
                        placeholder="e.g., Pour out your heart here up to 500 words. Describe their character, covenant promises, or a special milestone moment..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        className={`w-full bg-black/95 border-2 rounded-xl px-3.5 py-2.5 text-[#FAF9F6] text-xs sm:text-sm leading-relaxed placeholder-white/30 focus:outline-none transition-all font-sans font-normal resize-y min-h-[120px] custom-input ${
                          (context.trim() === "" ? 0 : context.trim().split(/\s+/).length) > 500
                            ? "border-red-500 focus:border-red-500 text-red-100"
                            : "border-[#C5A880] focus:border-[#FFD700]"
                        }`}
                      />
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-white/50">Include ocean, morning, hero prompts...</span>
                        <span className={
                          (context.trim() === "" ? 0 : context.trim().split(/\s+/).length) > 500
                            ? "text-red-400 font-bold"
                            : "text-white/50"
                        }>
                          {context.trim() === "" ? 0 : context.trim().split(/\s+/).length} / 500 words
                        </span>
                      </div>
                    </div>

                    {/* [3. CONDITIONAL IMAGE UPLOADER] */}
                    {(setType === "premium" || setType === "legacy") && (
                      <div className="space-y-2 animate-fade-in bg-black/50 border border-[#C5A880]/20 p-4 rounded-xl text-left">
                        <label className="text-[11px] md:text-xs font-mono text-[#FFD700] uppercase tracking-widest font-semibold block">
                          📸 Add a Visual Touch (Optional - Max 5 Photos)
                        </label>
                        
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (uploadedImages.length >= 5) return;
                            const files = Array.from(e.dataTransfer.files) as File[];
                            const imageFiles = files.filter(f => f.type.startsWith("image/")).slice(0, 5 - uploadedImages.length);
                            imageFiles.forEach(file => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) {
                                  setUploadedImages(prev => [...prev, ev.target!.result as string].slice(0, 5));
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }}
                          onClick={() => {
                            const fileInput = document.getElementById("uploader-file-input") as HTMLInputElement | null;
                            if (fileInput) fileInput.click();
                          }}
                          className="border-2 border-dashed border-[#C5A880]/30 hover:border-[#FFD700]/70 rounded-xl p-4 text-center cursor-pointer bg-black/40 hover:bg-[#121110]/85 transition-all text-white/50"
                        >
                          <input
                            id="uploader-file-input"
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (uploadedImages.length >= 5) return;
                              const files = Array.from(e.target.files || []) as File[];
                              const imageFiles = files.filter(f => f.type.startsWith("image/")).slice(0, 5 - uploadedImages.length);
                              imageFiles.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  if (ev.target?.result) {
                                    setUploadedImages(prev => [...prev, ev.target!.result as string].slice(0, 5));
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                          />
                          <p className="text-xs font-sans">
                            Drag & drop your photos here, or <span className="text-[#FFD700] underline font-bold">browse</span>
                          </p>
                          <p className="text-[10px] font-mono text-white/30 uppercase mt-1">Image files (Max 5)</p>
                        </div>

                        {uploadedImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1.5 justify-start">
                            {uploadedImages.map((imgSrc, idx) => (
                              <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#C5A880]/40 group bg-black">
                                <img src={imgSrc} alt={`Visual Touch ${idx + 1}`} className="w-full h-full object-cover animate-fade-in" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-red-400 font-bold"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* [Musical Style Theme Selector] */}
                    <div className="style-selector-section">
                      <label className="text-xs font-mono text-[#FFD700] uppercase tracking-widest block font-bold mb-2">
                        Select Your Musical Style Theme:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          type="button" 
                          onClick={() => setCustomGenre("Acoustic Folk")} 
                          className={`px-2 py-2 text-[10px] md:text-xs font-semibold rounded-lg border text-center transition-all ${customGenre === "Acoustic Folk" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-black/40 text-white/70 border-[#C5A880]/20 hover:border-white/50"}`}
                        >
                          Acoustic Folk
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCustomGenre("Bluegrass")} 
                          className={`px-2 py-2 text-[10px] md:text-xs font-semibold rounded-lg border text-center transition-all ${customGenre === "Bluegrass" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-black/40 text-white/70 border-[#C5A880]/20 hover:border-white/50"}`}
                        >
                          Bluegrass
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCustomGenre("Rustic Lute")} 
                          className={`px-2 py-2 text-[10px] md:text-xs font-semibold rounded-lg border text-center transition-all ${customGenre === "Rustic Lute" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-black/40 text-white/70 border-[#C5A880]/20 hover:border-white/50"}`}
                        >
                          Rustic Lute
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCustomGenre("Modern Worship")} 
                          className={`px-2 py-2 text-[10px] md:text-xs font-semibold rounded-lg border text-center transition-all ${customGenre === "Modern Worship" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-black/40 text-white/70 border-[#C5A880]/20 hover:border-white/50"}`}
                        >
                          Worship
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCustomGenre("Lofi Acoustic")} 
                          className={`px-2 py-2 text-[10px] md:text-xs font-semibold rounded-lg border text-center transition-all ${customGenre === "Lofi Acoustic" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-black/40 text-white/70 border-[#C5A880]/20 hover:border-white/50"}`}
                        >
                          Lofi Acoustic
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setCustomGenre("Indie Pop")} 
                          className={`px-2 py-2 text-[10px] md:text-xs font-semibold rounded-lg border text-center transition-all ${customGenre === "Indie Pop" ? "bg-[#FFD700] text-black border-[#FFD700]" : "bg-black/40 text-white/70 border-[#C5A880]/20 hover:border-white/50"}`}
                        >
                          Indie Pop
                        </button>
                      </div>
                    </div>

                    {/* [AI AUDIO GENERATION ENGINE SELECTOR: BOTH OPTIONS] */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-[#FFD700] uppercase tracking-widest flex items-center gap-2 font-bold">
                        <Music size={15} /> Select Song Generation Engine:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setAudioGenerationMode("lyria")}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            audioGenerationMode === "lyria"
                              ? "border-[#FFD700] bg-[#251e19]/80 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                              : "border-[#C5A880]/20 bg-black/40 text-white/70 hover:border-[#C5A880]/50"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase">🎸 Lyria 3 Song</span>
                          <span className="text-[8px] text-white/50 font-mono">Full Sung Vocals</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAudioGenerationMode("narration")}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                            audioGenerationMode === "narration"
                              ? "border-[#FFD700] bg-[#251e19]/80 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                              : "border-[#C5A880]/20 bg-black/40 text-white/70 hover:border-[#C5A880]/50"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase">🎙️ Haddi Voice</span>
                          <span className="text-[8px] text-white/50 font-mono">Spoken + Chords</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAudioGenerationMode("both")}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                            audioGenerationMode === "both"
                              ? "border-[#FFD700] bg-[#251e19]/80 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                              : "border-[#C5A880]/20 bg-black/40 text-white/70 hover:border-[#C5A880]/50"
                          }`}
                        >
                          <span className="absolute -top-1.5 -right-1 bg-[#FFD700] text-black text-[6px] font-mono font-bold px-1 rounded uppercase tracking-wider">DUAL</span>
                          <span className="text-[10px] font-bold uppercase">✨ Both Options</span>
                          <span className="text-[8px] text-white/50 font-mono">Sung + Narration</span>
                        </button>
                      </div>
                    </div>

                    {/* [3. THE RUNTIME FREQUENCY SET] */}
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-mono text-[#FFD700] uppercase tracking-widest flex items-center gap-2 font-semibold">
                        <Clock size={16} /> Select Your Dedicated Set Option:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Quick Strum */}
                        <div
                          id="set_type_quick"
                          onClick={() => setSetType("quick")}
                          className={`p-2 rounded-xl border cursor-pointer flex flex-col justify-between items-center text-center transition-all ${setType === "quick" ? "border-[#FFD700] bg-[#251e19]/60 shadow-[0_0_15px_rgba(255,215,0,0.15)]" : "border-[#C5A880]/20 bg-black/40 hover:border-[#C5A880]/50"}`}
                        >
                          <span className="text-[10px] font-bold text-[#FFD700]">⏱️ QUICK STRUM</span>
                          <span className="text-[8px] text-white/50 font-mono">(60s • $0.99)</span>
                        </div>

                        {/* Full Set */}
                        <div
                          id="set_type_full"
                          onClick={() => setSetType("full")}
                          className={`p-2 rounded-xl border cursor-pointer flex flex-col justify-between items-center text-center transition-all ${setType === "full" ? "border-[#FFD700] bg-[#251e19]/60 shadow-[0_0_15px_rgba(255,215,0,0.15)]" : "border-[#C5A880]/20 bg-black/40 hover:border-[#C5A880]/50"}`}
                        >
                          <span className="text-[10px] font-bold text-[#FFD700]">📀 FULL SET</span>
                          <span className="text-[8px] text-white/50 font-mono">(125s • $1.99)</span>
                        </div>

                        {/* Premium Video */}
                        <div
                          id="set_type_premium"
                          onClick={() => setSetType("premium")}
                          className={`p-2 rounded-xl border cursor-pointer flex flex-col justify-between items-center text-center transition-all relative ${setType === "premium" ? "border-[#FFD700] bg-[#251e19]/60 shadow-[0_0_15px_rgba(255,215,0,0.2)]" : "border-[#C5A880]/20 bg-black/40 hover:border-[#C5A880]/50"}`}
                        >
                          <span className="absolute -top-1.5 -right-1 bg-[#FFD700] text-black text-[6px] font-mono font-bold px-1 rounded uppercase tracking-wider scale-90">HOT</span>
                          <span className="text-[10px] font-bold text-[#FFD700]">🚀 PREMIUM VIDEO</span>
                          <span className="text-[8px] text-white/50 font-mono">(3-Songs • $4.99)</span>
                        </div>

                        {/* Legacy Bundle */}
                        <div
                          id="set_type_legacy"
                          onClick={() => setSetType("legacy")}
                          className={`p-2 rounded-xl border cursor-pointer flex flex-col justify-between items-center text-center transition-all relative ${setType === "legacy" ? "border-[#FFD700] bg-[#251e19]/60 shadow-[0_0_15px_rgba(255,215,0,0.2)]" : "border-[#C5A880]/20 bg-black/40 hover:border-[#C5A880]/50"}`}
                        >
                          <span className="text-[10px] font-bold text-[#FFD700]">📦 LEGACY BUNDLE</span>
                          <span className="text-[8px] text-white/50 font-mono">(Ultimate • $12.99)</span>
                        </div>
                      </div>
                    </div>

                    {/* FREE PASS STATUS BANNER ABOVE SUBMIT */}
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Gift size={14} className="text-[#FFD700]" />
                        {adminUser.isAuthenticated && adminUser.unlimitedBypass
                          ? `🛡️ Admin Unlimited Mode (${adminUser.email})`
                          : premiumReferralCount >= 10
                          ? "👑 Lifetime Premium Account Active — Unlimited Free Songs"
                          : basic099ReferralCount >= 10
                          ? "👑 Lifetime $0.99 Account Active — Unlimited Free Songs"
                          : `🎁 First 5 Songs Free Pass: ${freeSongsRemaining} of 5 Remaining`}
                      </span>
                      <div className="flex items-center gap-2">
                        {freeSongsRemaining < 5 && (
                          <button
                            type="button"
                            onClick={handleResetFreeSongs}
                            className="px-2 py-0.5 rounded bg-[#251e19] hover:bg-[#332922] text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Reset Free Song Counter back to 5/5"
                          >
                            <RotateCcw size={10} /> Reset 5/5
                          </button>
                        )}
                        <span className="bg-[#FFD700] text-black px-2 py-0.5 rounded font-extrabold text-[10px]">
                          $0.00 FREE
                        </span>
                      </div>
                    </div>

                    {/* STRUM THE STRINGS / SUBMIT */}
                    <div className="pt-2">
                      <button
                        id="strum_generate_button"
                        type="button"
                        onClick={handleStrumSong}
                        className="w-full text-black font-display font-extrabold rounded-xl text-center py-4 text-xs md:text-sm tracking-widest uppercase cursor-pointer bg-gradient-to-r from-[#FFD700] via-[#FCE068] to-[#FFD700] hover:brightness-110 active:scale-[0.99] transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.25)] flex items-center justify-center gap-2 border border-white/10"
                      >
                        {freeSongsRemaining > 0 || isLifetimeUnlocked
                          ? `🎵 STRUM & RENDER FREE SONG (${isLifetimeUnlocked ? "LIFETIME" : `${freeSongsRemaining}/5 FREE`})`
                          : "🎵 STRUM THE STRINGS & RENDER"}
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* Quick Access Feature Cards on the Full System Page */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div
                  onClick={() => setActiveSystemTab("free-songs")}
                  className="bg-[#121110]/90 hover:bg-[#1c1814] border border-[#FFD700]/40 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#FFD700] font-bold flex items-center gap-1.5">
                      <Gift size={15} /> First 5 Songs Free
                    </span>
                    <span className="text-[11px] font-mono bg-[#FFD700]/15 text-[#FFD700] px-2.5 py-0.5 rounded-md font-bold">
                      {freeSongsRemaining}/5 Left
                    </span>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed">
                    View your 5 complimentary custom gift song slots. Includes Lyria 3 Sung Vocals & Haddi Narration.
                  </p>
                  <span className="text-[11px] font-mono text-[#FFD700] flex items-center gap-1 font-semibold">
                    Open Free Song Pass <ChevronRight size={13} />
                  </span>
                </div>

                <div
                  onClick={() => setActiveSystemTab("lifetime")}
                  className="bg-[#121110]/90 hover:bg-[#1c1814] border border-[#FFD700]/40 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#FFD700] font-bold flex items-center gap-1.5">
                      <Crown size={15} /> Lifetime License
                    </span>
                    <span className="text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-md font-bold">
                      $0.99: {Math.min(10, basic099ReferralCount)}/10 • Prem: {Math.min(10, premiumReferralCount)}/10
                    </span>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed">
                    Sign up 10 $0.99 cent users to get a Lifetime $0.99 Account, or sign up 10 Premium accounts to get a Lifetime Premium Account for free.
                  </p>
                  <span className="text-[11px] font-mono text-[#FFD700] flex items-center gap-1 font-semibold">
                    Invite Friends & Track Progress <ChevronRight size={13} />
                  </span>
                </div>

                <div
                  onClick={() => setActiveSystemTab("affiliate")}
                  className="bg-[#121110]/90 hover:bg-[#1c1814] border border-[#FFD700]/40 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#FFD700] font-bold flex items-center gap-1.5">
                      <TrendingUp size={15} /> Affiliate Partner Hub
                    </span>
                    <span className="text-[11px] font-mono bg-[#FFD700] text-black px-2.5 py-0.5 rounded-md font-extrabold">
                      One-Time License
                    </span>
                  </div>
                  <p className="text-xs text-white/75 leading-relaxed">
                    One-time commission on Premium sign-ups and one-time Lifetime License rewards (10 $0.99 users or 10 Premium accounts).
                  </p>
                  <span className="text-[11px] font-mono text-[#FFD700] flex items-center gap-1 font-semibold">
                    Open Affiliate Dashboard <ChevronRight size={13} />
                  </span>
                </div>
              </div>

            </motion.div>
          )}

          {/* STAGE 2: THE AVATAR ACTIVATING & RESOLVING */}
          {stage === 2 && (
            <motion.div
              key="stage2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="max-w-xl mx-auto w-full text-center space-y-8"
            >
              
              {/* Pulsing avatar placeholder frame */}
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full border-4 border-[#FFD700] bg-gradient-to-tr from-[#251e19] to-[#0c0907] flex items-center justify-center shadow-[0_0_35px_rgba(255,215,0,0.3)] overflow-hidden mx-auto">
                  {/* Highly polished stylized silhouette of Haddi */}
                  <div className="relative">
                    <Music size={42} className="text-[#FFD700] opacity-80 animate-pulse" />
                    <div className="absolute -inset-2 bg-[#FFD700]/10 blur-xl rounded-full"></div>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FFD700] text-black text-[9px] font-mono font-bold tracking-widest px-3 py-1 rounded-full uppercase">
                  HADDI THE MINSTREL
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-display font-extrabold tracking-wider text-[#FFD700]">Haddi</h2>
                <p className="text-[11px] text-white/60 font-mono uppercase tracking-widest">Sumatran Soul • Jakarta Street Musician</p>
              </div>

              {/* Status information detailing what step is taking place */}
              <div className="space-y-4">
                <h3 className="text-xl font-display font-semibold text-white tracking-wide flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-ping"></span>
                  Plucking {target || "Audrey"}'s song frequency...
                </h3>

                {/* Highly descriptive dialog bubble displaying what the bard sees */}
                <div className="bg-black/90 border-2 border-[#C5A880] rounded-2xl p-6 text-left relative max-w-md mx-auto backdrop-blur-md">
                  <div className="absolute -top-[10px] left-[50%] -translate-x-1/2 w-4 h-4 bg-black border-t-2 border-l-2 border-[#C5A880] transform rotate-45"></div>
                  <p className="text-[#FAF9F6]/95 text-sm italic font-sans leading-relaxed text-center font-medium">
                    "{loadingStep === 0 && "Selamat datang! Haddi is tuning the acoustic guitar..."}
                     {loadingStep === 1 && "Aligning chords on the silver strings for Jakarta's warm breeze..."}
                     {loadingStep === 2 && "Reciting your special story with Sumatran soul and Jakarta energy..."}
                     {loadingStep === 3 && "Setting up my digital musician street corner vocals..."}
                     {loadingStep >= 4 && "Ada lagu! The silver strings are ready to sing your blessing..."}"
                  </p>
                </div>
              </div>

              {/* [ANIMATION: 3 GOLDEN PILLARS] Pulsing Visualizer */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-[#FFD700]/85 tracking-widest uppercase font-semibold">Geometric Acoustic Flow</p>
                <div className="flex justify-center items-end gap-3 h-14">
                  <div className="w-1.5 bg-[#FFD700]/50 rounded-full visualizer-pillar" style={{ height: "100%", animationDelay: "0.1s" }}></div>
                  <div className="w-1.5 bg-[#FFD700] rounded-full visualizer-pillar" style={{ height: "70%", animationDelay: "0.4s" }}></div>
                  <div className="w-1.5 bg-[#FFD700]/75 rounded-full visualizer-pillar" style={{ height: "85%", animationDelay: "0.25s" }}></div>
                  <div className="w-1.5 bg-[#FFD700]/45 rounded-full visualizer-pillar" style={{ height: "40%", animationDelay: "0.6s" }}></div>
                  <div className="w-1.5 bg-[#FFD700]/90 rounded-full visualizer-pillar" style={{ height: "95%", animationDelay: "0.33s" }}></div>
                </div>
              </div>

            </motion.div>
          )}

          {/* STAGE 3: THE NOW PLAYING SCREEN REVEAL */}
          {stage === 3 && currentSong && (
            <motion.div
              key="stage3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              
              {/* Back button and Sharing controls header */}
              <div className="flex justify-between items-center bg-black/85 border-2 border-[#C5A880] rounded-2xl px-5 py-4 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-[#FFD700] hover:text-white font-mono font-bold uppercase transition-colors"
                >
                  <RefreshCw size={13} /> Back to Studio
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeepsake(true)}
                    className="flex items-center gap-1.5 text-xs text-black bg-[#FFD700] hover:brightness-110 px-3.5 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer"
                  >
                    <Download size={13} /> Printable Card
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-1.5 text-xs text-white bg-green-700 hover:bg-green-600 px-3.5 py-1.5 rounded-lg font-mono font-semibold transition-colors cursor-pointer"
                  >
                    <Phone size={13} /> Send WhatsApp
                  </button>
                </div>
              </div>

              {/* Main Performance Center Block */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side: Now playing title & Interactive Vinyl block */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* ASCII styled typography banner for Target */}
                  <div className="bg-black/90 border-2 border-[#C5A880] rounded-2xl p-6 text-center space-y-3 shadow-xl">
                    <span className="text-xs font-mono text-[#FFD700] tracking-widest uppercase font-bold">🎵 Now Playing For 🎵</span>
                    
                    {/* Generative big retro text displaying target name */}
                    <div className="font-mono text-xs text-neutral-500 overflow-x-auto whitespace-pre leading-none py-2 text-center max-w-full">
                      {"+-----------------------------------------------+\n"}
                      {`|    ${currentSong.target.toUpperCase().padEnd(38, " ")} |\n`}
                      {"+-----------------------------------------------+"}
                    </div>

                    <h3 className="text-2xl font-display font-semibold tracking-wide text-white">
                      {currentSong.title}
                    </h3>

                    <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#FFD700] bg-black/80 border border-[#C5A880]/40 px-3 py-1 rounded font-semibold">
                      <Disc size={13} className={isPlaying ? "animate-spin text-[#FFD700]" : ""} /> 
                      {currentSong.genre} • {currentSong.tempo}
                    </div>
                  </div>

                  {/* Complete AI Studio Song Player Console (Replaces old synthesized strumming lyre player) */}
                  <div className="bg-black/90 border-2 border-[#C5A880] rounded-2xl p-6 space-y-5 shadow-xl">
                    <div className="flex justify-between items-center text-xs font-mono text-[#C5A880] font-bold">
                      <span>
                        {activeTrackType === "narration"
                          ? "🎙️ HADDI SPOKEN BLESSING"
                          : "🎸 COMPLETE STUDIO SONG (LYRIA 3)"}
                      </span>
                      <span className="text-[#FFD700] uppercase">
                        {isAudioPlaying || isPlaying ? "● NOW PLAYING" : "READY"}
                      </span>
                    </div>

                    {/* Dual Option Track Switcher inside Stage 3 Now Playing Console */}
                    {(lyriaAudioUrl || narrationAudioUrl) && (
                      <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-[#C5A880]/30">
                        <button
                          type="button"
                          onClick={() => handleSelectTrackType("lyria")}
                          disabled={!lyriaAudioUrl}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-40 ${
                            activeTrackType === "lyria" && lyriaAudioUrl
                              ? "bg-[#FFD700] text-black shadow"
                              : "text-white/75 hover:text-white"
                          }`}
                        >
                          🎸 Complete Sung Song
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectTrackType("narration")}
                          disabled={!narrationAudioUrl}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-40 ${
                            activeTrackType === "narration" && narrationAudioUrl
                              ? "bg-[#FFD700] text-black shadow"
                              : "text-white/75 hover:text-white"
                          }`}
                        >
                          🎙️ Haddi Narration
                        </button>
                      </div>
                    )}

                    {/* Primary HTML5 Audio Element for the Complete Generated Song */}
                    {audioUrl && (
                      <audio
                        id="stage3-complete-song-player"
                        src={audioSource || audioUrl}
                        ref={audioRef}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onPlay={() => {
                          luteEngineInstance.stopLutePlayback();
                          setIsAudioPlaying(true);
                          setIsPlaying(true);
                        }}
                        onPause={() => {
                          setIsAudioPlaying(false);
                          setIsPlaying(false);
                        }}
                        onEnded={() => {
                          setIsAudioPlaying(false);
                          setIsPlaying(false);
                        }}
                        autoPlay
                        controls
                        className="w-full rounded-xl bg-neutral-900 border border-[#FFD700]/30 accent-[#FFD700]"
                      />
                    )}

                    {/* Timeline and Drag-Seeker */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono text-white/50">
                        <span>{formatTime(Math.floor(audioUrl ? audioCurrentTime : currentTime))}</span>
                        <span>{formatTime(Math.floor(audioUrl && audioDuration ? audioDuration : currentSong.totalDurationSeconds))}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min={0}
                          max={Math.floor(audioUrl && audioDuration ? audioDuration : currentSong.totalDurationSeconds)}
                          value={Math.floor(audioUrl ? audioCurrentTime : currentTime)}
                          onChange={(e) => handleSeek(Number(e.target.value))}
                          className="w-full accent-[#FFD700] bg-neutral-800 h-1 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {/* Playback action toggle (controls the complete generated song) */}
                        <button
                          type="button"
                          onClick={togglePlayback}
                          className="w-14 h-14 rounded-full bg-[#FFD700] hover:brightness-110 text-black shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
                          title="Play/Pause Complete Song"
                        >
                          {isAudioPlaying || isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
                        </button>

                        <div className="text-left">
                          <p className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                            {isAudioPlaying || isPlaying ? "Playing Complete Song" : "Play Complete Song"}
                          </p>
                          <p className="text-[10px] text-white/60 font-mono">
                            Full Vocals & Studio Arrangement
                          </p>
                        </div>
                      </div>

                      {/* Dynamic Volume Console */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setMuted(!muted)}
                          className="text-[#C5A880] hover:text-white transition-colors"
                        >
                          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={volume}
                          onChange={(e) => {
                            setVolume(Number(e.target.value));
                            setMuted(false);
                          }}
                          className="w-20 accent-[#C5A880] bg-neutral-800 h-1 rounded"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-white/40 font-mono text-center">
                      Your complete custom song with vocals and full instrumentation is ready above. Switch between the Sung Studio Track and Haddi's Spoken Blessing anytime.
                    </p>
                  </div>

                  {/* Variation Swapper (Only populated in multi-track modes) */}
                  {(setType === "extended" || setType === "premium" || setType === "legacy") && allVariations.length > 1 && (
                    <div className="bg-black/90 border-2 border-[#C5A880] rounded-2xl p-5 space-y-3">
                      <span className="text-xs font-mono text-[#FFD700] tracking-wider uppercase font-bold">
                        🎁 Select Your Encore Variation:
                      </span>
                      <div className="space-y-2">
                        {allVariations.map((song, vIdx) => (
                          <button
                            key={vIdx}
                            type="button"
                            onClick={() => {
                              setActiveVariationIdx(vIdx);
                            }}
                            className={`w-full flex justify-between items-center px-3.5 py-2.5 rounded-xl text-left text-xs font-mono transition-all border-2 ${
                              activeVariationIdx === vIdx
                                ? "bg-[#271d15] border-[#FFD700] text-white"
                                : "bg-black/60 border-transparent text-[#ffffff]/50 hover:bg-black hover:text-white hover:border-[#C5A880]/50"
                            }`}
                          >
                            <span>Variation {vIdx + 1}: {song.genre}</span>
                            <span className="opacity-75">{song.tempo.split(" ")[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gift Song Card with Dual Audio Player (Lyria 3 Sung Song & Haddi Narration) */}
                  <GiftSongCard
                    audioUrl={audioSource || audioUrl}
                    lyriaAudioUrl={lyriaAudioUrl}
                    narrationAudioUrl={narrationAudioUrl}
                    activeTrackType={activeTrackType}
                    onSelectTrackType={handleSelectTrackType}
                    songTitle={currentSong.title}
                    lyrics={
                      currentSong.lyricSections
                        .filter(s => s.sectionName !== "Intro")
                        .flatMap(s => s.lines)
                        .join("\n")
                    }
                    recipientName={currentSong.target}
                  />

                  {/* Back & Redo / Restore Slot buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (freeSongsUsedHistory.length > 0) {
                          handleRefundSongSlot(freeSongsUsedHistory.length - 1);
                        } else {
                          handleResetFreeSongs();
                        }
                        luteEngineInstance.stopLutePlayback();
                        if (audioRef.current) audioRef.current.pause();
                        setIsAudioPlaying(false);
                        setIsPlaying(false);
                        setStage(1);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#251e19] hover:bg-[#332922] text-[#FFD700] border border-[#FFD700]/40 text-xs font-mono font-bold cursor-pointer transition-all"
                      title="Song not good? Restore your free song credit and redo!"
                    >
                      <RotateCcw size={13} />
                      <span>Song Not Good? Redo & Restore Free Slot ({Math.min(5, freeSongsRemaining + 1)}/5)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-1 text-xs text-[#C5A880]/70 hover:text-[#FFD700] font-mono cursor-pointer"
                    >
                      Strum a New Dedication <ChevronRight size={12} />
                    </button>
                  </div>

                </div>

                {/* Right side: The Bronze Lyric Canvas */}
                <div className="lg:col-span-7">
                  <LyricCanvas
                    lyricSections={currentSong.lyricSections}
                    currentTimeSeconds={currentTime}
                    onLineClick={(stamp) => handleSeek(stamp)}
                  />
                </div>

              </div>

            </motion.div>
          )}

                </AnimatePresence>
            )}

          </main>
        </>
      )}

      {/* --- KEEPSAKE MODAL --- */}
      {showKeepsake && currentSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#faf6f0] text-[#1c1612] w-full max-w-lg rounded-2xl shadow-2xl border-8 border-[#C5A880]/40 overflow-hidden relative"
          >
            {/* Modal actions */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 bg-[#1c1612]/5 hover:bg-[#1c1612]/10 rounded-full text-xs font-mono flex items-center gap-1 transition-colors"
                title="Print KeepSake Card"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setShowKeepsake(false)}
                className="p-1 text-[#1c1612]/60 hover:text-[#1c1612] rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Keepsake Portrait frame */}
            <div className="p-8 md:p-10 space-y-6 pt-12 text-center text-print">
              
              {/* Elegant header */}
              <div className="space-y-1">
                <p className="text-[10px] font-mono tracking-widest text-[#C5A880] uppercase font-bold">A Lute & Lyre Dedication Track</p>
                <h3 className="text-3xl font-display font-bold text-[#201813]">{currentSong.title}</h3>
                <div className="w-16 h-px bg-[#C5A880] mx-auto my-3"></div>
                <p className="text-xs uppercase font-mono tracking-wider font-semibold text-[#C5A880]">Playable song for {currentSong.target}</p>
              </div>

              {/* Body message section */}
              <div className="border border-[#C5A880]/30 rounded-xl p-5 bg-white/70 max-h-[240px] overflow-y-auto text-left space-y-4">
                {currentSong.lyricSections.filter(s => s.sectionName !== "Intro").map((section, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <p className="font-mono text-[9px] text-[#C5A880] font-bold uppercase">{section.sectionName}</p>
                    {section.lines.map((line, lIdx) => (
                      <p key={lIdx} className="font-sans text-[#1c1612]/90 leading-relaxed font-medium">{line}</p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Keepsake Footer signature info */}
              <div className="flex justify-between items-center pt-4 border-t border-[#C5A880]/30 text-[9px] font-mono text-[#C5A880]">
                <span>MEMBER CERTIFICATION</span>
                <span className="uppercase">mygiftsong.aiapps.com - {currentSong.genre}</span>
              </div>

              {/* Action row at bottom */}
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyLyrics}
                  className="px-4 py-2 bg-[#201813] hover:bg-[#3d2e24] text-[#faf6f0] text-xs font-mono font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLyrics ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLyrics ? "Copied!" : "Copy Full Lyrics"}
                </button>
              </div>

            </div>

          </motion.div>
        </div>
      )}

      {/* --- PASSWORD AUTHORIZATION MODAL GATEWAY --- */}
      {isTestStudio && !isAuthorized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md bg-[#121110] border border-[#C5A880]/30 rounded-2xl p-8 shadow-2xl flex flex-col gap-6 text-center">
            {/* Decorative top grid accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-800 via-[#C5A880] to-red-800 rounded-t-2xl"></div>
            
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl">🔒</span>
              <h3 className="font-sans text-xl font-semibold tracking-tight text-[#C5A880]">
                Seraphim Test Studio Authorization Required
              </h3>
              <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                Bypassing active production streams requires the master security validation phrase.
              </p>
            </div>

            <form onSubmit={handleValidateAuthorization} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] uppercase tracking-wider font-mono text-[#C5A880]/70 font-bold">
                  Validation Secret
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-950/80 border border-[#C5A880]/25 rounded-xl text-white text-center font-mono placeholder-neutral-700 focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] transition-all"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-[11px] font-mono mt-1 text-center font-medium">
                    ⚠️ {passwordError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#C5A880] hover:bg-[#b0936b] text-[#121110] font-bold text-sm tracking-widest uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 animate-pulse"
                >
                  Verify Access
                </button>
                <button
                  type="button"
                  onClick={handleCancelAuthorization}
                  className="w-full py-2.5 bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 text-xs tracking-wider uppercase font-medium rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MINSTREL STUDIO SANDBOX ADMIN GATE --- */}
      <div 
        id="admin-gate-container" 
        style={{ 
          display: (isAdminGateVisible && isAuthorized) ? "block" : "none", 
          margin: "40px auto", 
          maxWidth: "600px", 
          padding: "30px", 
          background: "rgba(12, 11, 10, 0.95)", 
          border: "2px dashed #FFD700", 
          borderRadius: "16px", 
          boxShadow: "0 0 30px rgba(255, 215, 0, 0.2)", 
          backdropFilter: "blur(20px)", 
          WebkitBackdropFilter: "blur(20px)", 
          color: "#fff", 
          fontFamily: "sans-serif" 
        }}
        className="relative z-20"
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "2rem" }}>👑</span>
            <h2 style={{ color: "#FFD700", margin: "10px 0 5px 0", letterSpacing: "1px", fontWeight: "bold" }}>Minstrel Studio Sandbox</h2>
            <p style={{ color: "rgba(169, 169, 161, 0.7)", fontSize: "0.9rem" }}>Bypassing Live Production Lines for Verified Admin System Testing</p>
        </div>

        {/* login form */}
        <div id="sandbox-login-form" style={{ display: isAdminUnlocked ? "none" : "block" }}>
            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", color: "#FFD700", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "5px", textTransform: "uppercase" }}>Master Developer ID</label>
                <input type="email" id="admin-email-input" placeholder="Enter master development email..." style={{ width: "100%", padding: "12px", background: "rgba(20, 18, 15, 0.8)", border: "1px solid rgba(255, 215, 0, 0.3)", borderRadius: "8px", color: "#fff", fontSize: "1rem", boxSizing: "border-box" }} />
            </div>
            <button onClick={verifyAdminGate} style={{ width: "100%", padding: "12px", background: "#FFD700", color: "#0c0b0a", fontWeight: "bold", fontSize: "1rem", border: "none", borderRadius: "8px", cursor: "pointer", transition: "background 0.3s ease" }}>
                Unlock Sandbox Controls
            </button>
        </div>

        {/* controls panel */}
        <div id="sandbox-controls-panel" style={{ display: isAdminUnlocked ? "block" : "none" }}>
            <div style={{ background: "rgba(255, 215, 0, 0.05)", border: "1px solid rgba(255, 215, 0, 0.2)", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#FFD700", lineHeight: "1.4" }}>
                    <strong>System Active:</strong> Operating under user verification: <code>Pswilliamh@gmail.com</code>. Transactions are fully simulated.
                </p>
            </div>

            <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", color: "rgba(169, 169, 161, 0.9)", fontSize: "0.85rem", marginBottom: "5px" }}>Recipient Email (Friend's Daughter)</label>
                <input type="email" id="test-target-email" placeholder="name@example.com" style={{ width: "100%", padding: "10px", background: "#14120f", border: "1px solid #333", borderRadius: "6px", color: "#fff", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", color: "rgba(169, 169, 161, 0.9)", fontSize: "0.85rem", marginBottom: "5px" }}>Custom Blessing Note / Story Details</label>
                <textarea id="test-story-context" rows={3} placeholder="Describe the sweet baby birth moment..." style={{ width: "100%", padding: "10px", background: "#14120f", border: "1px solid #333", borderRadius: "6px", color: "#fff", boxSizing: "border-box", resize: "vertical" }}></textarea>
            </div>

            {/* Contemporary Style Selector layout buttons inside Sandbox */}
            <div className="style-selector-section" style={{ marginTop: "15px", marginBottom: "20px" }}>
                <label style={{ color: "#FFD700", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "10px" }}>
                    Select Your Musical Style Theme:
                </label>
                <div className="style-grid-container">
                    <button 
                      type="button" 
                      onClick={() => setCustomGenre("Acoustic Folk")} 
                      className={`style-card ${customGenre === "Acoustic Folk" ? "active" : ""}`}
                    >
                      Acoustic Folk
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomGenre("Bluegrass")} 
                      className={`style-card ${customGenre === "Bluegrass" ? "active" : ""}`}
                    >
                      Bluegrass
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomGenre("Rustic Lute")} 
                      className={`style-card ${customGenre === "Rustic Lute" ? "active" : ""}`}
                    >
                      Rustic Lute
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => setCustomGenre("Modern Worship")} 
                      className={`style-card contemporary ${customGenre === "Modern Worship" ? "active" : ""}`}
                    >
                      Modern Worship
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomGenre("Lofi Acoustic")} 
                      className={`style-card contemporary ${customGenre === "Lofi Acoustic" ? "active" : ""}`}
                    >
                      Lofi Acoustic
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomGenre("Indie Pop")} 
                      className={`style-card contemporary ${customGenre === "Indie Pop" ? "active" : ""}`}
                    >
                      Indie Pop
                    </button>
                </div>
            </div>

            {/* Dual Option Selector inside Sandbox */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#FFD700", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "10px" }}>
                Select Audio Generation Option:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAudioGenerationMode("lyria")}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    audioGenerationMode === "lyria"
                      ? "bg-[#FFD700] text-black border-[#FFD700]"
                      : "bg-[#14120f] text-white/80 border-white/20 hover:border-[#FFD700]/50"
                  }`}
                >
                  🎸 Lyria 3 Sung Song
                </button>
                <button
                  type="button"
                  onClick={() => setAudioGenerationMode("narration")}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    audioGenerationMode === "narration"
                      ? "bg-[#FFD700] text-black border-[#FFD700]"
                      : "bg-[#14120f] text-white/80 border-white/20 hover:border-[#FFD700]/50"
                  }`}
                >
                  🎙️ Haddi Narration
                </button>
                <button
                  type="button"
                  onClick={() => setAudioGenerationMode("both")}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    audioGenerationMode === "both"
                      ? "bg-[#FFD700] text-black border-[#FFD700]"
                      : "bg-[#14120f] text-white/80 border-white/20 hover:border-[#FFD700]/50"
                  }`}
                >
                  ✨ Both Options
                </button>
              </div>
            </div>

            <button 
              onClick={() => {
                const story = (document.getElementById('test-story-context') as HTMLTextAreaElement | null)?.value.trim() || context || "";
                if (!story) {
                  alert("Please enter a custom blessing note or story details.");
                  return;
                }
                handleGenerateLiveSong(story, audioGenerationMode);
              }} 
              id="test-submit-btn" 
              disabled={isLoading}
              style={{ width: "100%", padding: "14px", background: isLoading ? "#7f8c8d" : "#2ecc71", color: "#fff", fontWeight: "bold", fontSize: "1rem", border: "none", borderRadius: "8px", cursor: isLoading ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: "0.5px" }}
            >
              {isLoading ? "🎵 Composing with Google AI Studio..." : "🚀 Render Song & Send Digital Gift Card"}
            </button>

            {statusMessage && (
              <div id="sandbox-status-message" style={{ marginTop: "12px", padding: "12px 14px", borderRadius: "8px", background: "rgba(255, 215, 0, 0.1)", border: "1px solid rgba(255, 215, 0, 0.3)", color: "#FFD700", fontSize: "0.9rem", lineHeight: "1.4" }}>
                <strong>Status:</strong> {statusMessage}
              </div>
            )}

            <GiftSongCard
              audioUrl={audioSource || audioUrl}
              lyriaAudioUrl={lyriaAudioUrl}
              narrationAudioUrl={narrationAudioUrl}
              activeTrackType={activeTrackType}
              onSelectTrackType={handleSelectTrackType}
              songTitle={currentSong?.title || "The Sound of Honor & Covenant"}
              lyrics={
                currentSong?.lyricSections?.filter(s => s.sectionName !== "Intro").flatMap(s => s.lines).join("\n") ||
                context ||
                (document.getElementById('test-story-context') as HTMLTextAreaElement | null)?.value.trim() ||
                "A customized blessing plucked upon silver strings with enduring warmth and grace."
              }
              recipientName={
                currentSong?.target ||
                target ||
                (document.getElementById('test-target-email') as HTMLInputElement | null)?.value.trim() ||
                "Someone Special"
              }
            />

            <div id="sandbox-terminal" style={{ display: "none", marginTop: "20px", padding: "15px", background: "#000", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.85rem", color: "#2ecc71", lineHeight: "1.5", border: "1px solid #2ecc71" }}>
            </div>
        </div>
      </div>

      {/* --- FOOTER (SHOWN IN FULL SYSTEM VIEW) --- */}
      {isSystemInitiated && (
        <footer className="studio-footer">
          <div className="footer-container">
            <p
              className="footer-text select-none cursor-default"
              onClick={() => {
                const next = footerSecretClicks + 1;
                if (next >= 5) {
                  setFooterSecretClicks(0);
                  setIsAdminMenuVisible(true);
                  setActiveSystemTab("admin");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  setFooterSecretClicks(next);
                }
              }}
            >
              © 2026 mygiftsong.org | All Rights Reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 my-2 text-xs font-mono text-[#C5A880]">
              <button
                type="button"
                onClick={() => setActiveSystemTab("free-songs")}
                className="hover:text-[#FFD700] transition-colors cursor-pointer"
              >
                🎁 First 5 Songs Free
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveSystemTab("lifetime")}
                className="hover:text-[#FFD700] transition-colors cursor-pointer"
              >
                👑 Invite 10 = Lifetime License
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveSystemTab("affiliate")}
                className="hover:text-[#FFD700] transition-colors cursor-pointer"
              >
                🤝 Affiliate Partner Hub
              </button>
            </div>
            <a href="https://inflow.com/your-partner-id" target="_blank" rel="noopener noreferrer" className="affiliate-link">
              Powered by <span className="gold-text">Inflow</span> Network Architecture
            </a>
          </div>
        </footer>
      )}

      <OfflineIndicator />
    </div>
  );
}

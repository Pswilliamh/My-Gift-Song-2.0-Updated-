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
  Gift, Crown, Users, TrendingUp, ArrowLeft, ShieldCheck, RotateCcw, Globe, Smile
} from "lucide-react";
import { SongData, SetType, LyricSection } from "./types";
import { LyricCanvas } from "./components/LyricCanvas";
import { luteEngineInstance } from "./components/AudioEngine";
import { GiftSongCard } from "./components/GiftSongCard";
import { LandingExperience } from "./components/LandingExperience";
import { RewardsAndAffiliateSections, ReferralEntry } from "./components/RewardsAndAffiliateSections";
import { PWAInstallButton, OfflineIndicator } from "./components/PWAInstallButton";
import { AdminAccountDashboard, AdminUser, MASTER_ADMIN_EMAIL } from "./components/AdminAccountDashboard";
import { YosiaChildrenSection, SUPPORTED_SONG_LANGUAGES } from "./components/YosiaChildrenSection";

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
  const [audioGenerationMode, setAudioGenerationMode] = useState<"lyria" | "narration" | "both">("lyria");
  const [activeTrackType, setActiveTrackType] = useState<"lyria" | "narration">("lyria");
  const [isSwitchingTrack, setIsSwitchingTrack] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sunoStatus, setSunoStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [sunoMessage, setSunoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioSource, setAudioSourceState] = useState<string | null>(null);
  const [directAudioUrl, setDirectAudioUrl] = useState<string | null>(null);
  const [shareableSongUrl, setShareableSongUrl] = useState<string | null>(null);
  const [copiedAudioLinkModal, setCopiedAudioLinkModal] = useState(false);

  const getPublicOrigin = () => {
    if (typeof window === "undefined") return "https://www.mygiftsong.org";
    const host = window.location.hostname;
    if (host === "mygiftsong.org" || host === "www.mygiftsong.org") {
      return "https://www.mygiftsong.org";
    }
    return window.location.origin;
  };

  const getCanonicalSongLinks = (songId?: string) => {
    const origin = getPublicOrigin();
    const id = songId || currentSong?.id;
    const songLink = shareableSongUrl || (id ? `${origin}/?song=${encodeURIComponent(id)}` : "https://www.mygiftsong.org");
    const audioLink =
      directAudioUrl
        ? directAudioUrl.startsWith("http")
          ? directAudioUrl
          : `${origin}${directAudioUrl}`
        : id
        ? `${origin}/api/songs/${encodeURIComponent(id)}/audio`
        : audioSource && !audioSource.startsWith("data:")
        ? audioSource.startsWith("http")
          ? audioSource
          : `${origin}${audioSource}`
        : songLink;
    return { songLink, audioLink };
  };

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

  const handleSelectTrackType = async (type: "lyria" | "narration") => {
    setActiveTrackType(type);
    const existingUrl = type === "narration" ? narrationAudioUrl : lyriaAudioUrl;
    if (existingUrl) {
      setAudioSource(existingUrl);
      return;
    }

    // If user clicked Sung Song or Narration and that variant hasn't been rendered yet, generate it on demand
    if (currentSong && !isSwitchingTrack) {
      setIsSwitchingTrack(true);
      try {
        const compiledLyrics =
          currentSong.lyricSections
            ?.filter((s) => s.sectionName !== "Intro")
            .flatMap((s) => s.lines)
            .join("\n") || currentSong.context;

        const res = await fetch("/api/generate-haddi-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: currentSong.context || `A heartfelt ${currentSong.genre} song for ${currentSong.target}`,
            mode: type,
            target: currentSong.target,
            customGenre: currentSong.genre || customGenre,
            setType: currentSong.setType || setType,
            lyrics: compiledLyrics,
            language: currentSong.language || songLanguage,
            artistPersona: currentSong.artistPersona || artistPersona,
            shareId: currentSong.id,
          }),
        });
        const data = await res.json();
        if (data.directAudioUrl) setDirectAudioUrl(data.directAudioUrl);
        if (data.shareableSongUrl) setShareableSongUrl(data.shareableSongUrl);
        if (type === "lyria" && (data.lyriaAudioUrl || data.audioUrl)) {
          const url = data.lyriaAudioUrl || data.audioUrl;
          setLyriaAudioUrl(url);
          setAudioSource(url);
        } else if (type === "narration" && (data.narrationAudioUrl || data.audioUrl)) {
          const url = data.narrationAudioUrl || data.audioUrl;
          setNarrationAudioUrl(url);
          setAudioSource(url);
        }
      } catch (err) {
        console.warn("On-demand track switch generation error:", err);
      } finally {
        setIsSwitchingTrack(false);
      }
    }
  };
  const [setType, setSetType] = useState<SetType>("full");
  const [customGenre, setCustomGenre] = useState("Acoustic Folk");
  const [songLanguage, setSongLanguage] = useState("English");
  const [artistPersona, setArtistPersona] = useState<"haddi" | "yosia">("haddi");
  const [originalLyricSections, setOriginalLyricSections] = useState<LyricSection[]>([]);
  const [isTranslatingSong, setIsTranslatingSong] = useState(false);
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
      params.has("song") ||
      params.get("test") === "true" ||
      params.get("admin") === "true" ||
      window.location.hash === "#admin" ||
      params.has("session_id")
    );
  });
  const [activeSystemTab, setActiveSystemTab] = useState<"studio" | "yosia-kids" | "free-songs" | "lifetime" | "affiliate" | "admin">(() => {
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

  const [oneTimeRedoUsed, setOneTimeRedoUsed] = useState<boolean>(() => {
    return localStorage.getItem("mygiftsong_one_time_redo_used_v1") === "true";
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
    setOneTimeRedoUsed(false);
    localStorage.setItem("mygiftsong_free_remaining", "5");
    localStorage.setItem("mygiftsong_free_history", JSON.stringify([]));
    localStorage.setItem("mygiftsong_one_time_redo_used_v1", "false");
    localStorage.setItem(FREE_SONGS_RESET_VERSION, "done");
  };

  const handleRefundSongSlot = (index: number) => {
    // Guests only get 1 single redo across their 5 free songs
    if (oneTimeRedoUsed && activeSystemTab !== "admin") {
      return;
    }
    setOneTimeRedoUsed(true);
    localStorage.setItem("mygiftsong_one_time_redo_used_v1", "true");

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

  // --- Read URL for shared song link (?song=<shareId>) or post-payments success triggers ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedSongId = params.get("song");
    if (sharedSongId) {
      setIsSystemInitiated(true);
      setActiveSystemTab("studio");
      setIsRendering(true);
      setStage(2);
      fetch(`/api/songs/${encodeURIComponent(sharedSongId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success && data.song) {
            const loadedSong: SongData = data.song;
            setCurrentSong(loadedSong);
            setAllVariations([loadedSong]);
            setActiveVariationIdx(0);
            setOriginalLyricSections(loadedSong.lyricSections || []);
            setTarget(loadedSong.target || "");
            setContext(loadedSong.context || "");
            if (loadedSong.artistPersona) setArtistPersona(loadedSong.artistPersona);
            const origin = getPublicOrigin();
            setShareableSongUrl(`${origin}/?song=${encodeURIComponent(sharedSongId)}`);
            if (data.directAudioUrl) {
              const fullAudioUrl = data.directAudioUrl.startsWith("http")
                ? data.directAudioUrl
                : `${origin}${data.directAudioUrl}`;
              setDirectAudioUrl(fullAudioUrl);
              setLyriaAudioUrl(fullAudioUrl);
              setAudioSource(fullAudioUrl);
            }
            setStage(3);
          } else {
            setStage(1);
          }
        })
        .catch((err) => {
          console.warn("Could not load shared song:", err);
          setStage(1);
        })
        .finally(() => {
          setIsRendering(false);
        });
      return;
    }

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
    customGenreVal: string,
    languageVal: string = songLanguage,
    personaVal: "haddi" | "yosia" = artistPersona,
    preloadedSong?: SongData
  ) => {
    setError("");
    setIsRendering(true);
    setLyriaAudioUrl(null);
    setNarrationAudioUrl(null);
    setAudioUrl(null);
    setAudioSourceState(null);
    setActiveTrackType("lyria");
    setStage(2); // Jump to Avatar loader Screen
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1500);

    try {
      let returnedSong: SongData;

      if (preloadedSong) {
        returnedSong = preloadedSong;
        setAllVariations([returnedSong]);
        setActiveVariationIdx(0);
        setCurrentSong(returnedSong);
        setOriginalLyricSections(returnedSong.lyricSections);
      } else {
        // 1. Submit Request to the Full-Stack server API
        const res = await fetch("/api/generate-song", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: targetVal.trim(),
            context: contextVal.trim(),
            setType: setTypeVal,
            customGenre: customGenreVal,
            language: languageVal,
            artistPersona: personaVal,
          })
        });

        const data = await res.json();
        if (!data.success || !data.song) {
          throw new Error(data.error || "Internal generation failed.");
        }

        returnedSong = data.song;
        setOriginalLyricSections(returnedSong.lyricSections);

        if ((setTypeVal === "extended" || setTypeVal === "premium" || setTypeVal === "legacy") && data.variations) {
          setAllVariations(data.variations);
          setActiveVariationIdx(0);
          setCurrentSong(data.variations[0]);
        } else {
          setAllVariations([returnedSong]);
          setActiveVariationIdx(0);
          setCurrentSong(returnedSong);
        }
      }

      // 2. Generate Real AI Sung Music Track via Lyria 3 by default
      const compiledLyrics = returnedSong.lyricSections
        ?.filter(s => s.sectionName !== "Intro")
        .flatMap(s => s.lines)
        .join("\n") || contextVal;

      const requestedMode = audioGenerationMode === "narration" ? "narration" : "lyria";
      const origin = getPublicOrigin();
      setShareableSongUrl(`${origin}/?song=${encodeURIComponent(returnedSong.id)}`);
      setDirectAudioUrl(`${origin}/api/songs/${encodeURIComponent(returnedSong.id)}/audio`);

      try {
        const audioRes = await fetch("/api/generate-haddi-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: contextVal.trim() || `A special ${customGenreVal} blessing song for ${targetVal.trim()}`,
            mode: requestedMode,
            target: targetVal.trim(),
            customGenre: customGenreVal,
            setType: setTypeVal,
            lyrics: compiledLyrics,
            language: languageVal,
            artistPersona: personaVal,
            shareId: returnedSong.id,
            imageDataUrl: uploadedImages[0] || undefined,
          }),
        });
        const audioData = await audioRes.json();
        if (audioData.directAudioUrl) {
          setDirectAudioUrl(
            audioData.directAudioUrl.startsWith("http")
              ? audioData.directAudioUrl
              : `${origin}${audioData.directAudioUrl}`
          );
        }
        if (audioData.shareableSongUrl) {
          setShareableSongUrl(audioData.shareableSongUrl);
        }
        if (audioData.audioUrl) {
          if (audioData.lyriaAudioUrl) setLyriaAudioUrl(audioData.lyriaAudioUrl);
          if (audioData.narrationAudioUrl) setNarrationAudioUrl(audioData.narrationAudioUrl);
          const initType = requestedMode === "narration" && audioData.narrationAudioUrl ? "narration" : audioData.lyriaAudioUrl ? "lyria" : "narration";
          const primaryPlayUrl = initType === "lyria" ? (audioData.lyriaAudioUrl || audioData.audioUrl) : (audioData.narrationAudioUrl || audioData.audioUrl);
          setActiveTrackType(initType);
          setAudioSource(primaryPlayUrl);
        }
      } catch (audioGenErr) {
        console.warn("AI audio track generation warning:", audioGenErr);
      }

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

  // Live Song Language Translator handler for Stage 3 LyricCanvas
  const handleTranslateActiveSong = async (targetLanguage: string) => {
    if (!currentSong) return;
    setSongLanguage(targetLanguage);
    setIsTranslatingSong(true);

    try {
      const res = await fetch("/api/translate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          song: {
            ...currentSong,
            lyricSections:
              originalLyricSections.length > 0 ? originalLyricSections : currentSong.lyricSections,
          },
          targetLanguage,
        }),
      });
      const data = await res.json();
      if (data.success && data.song) {
        setCurrentSong(data.song);
      }
    } catch (err) {
      console.warn("Song translation error:", err);
    } finally {
      setIsTranslatingSong(false);
    }
  };

  // Re-generate audio in the translated language so the user can hear it sung/narrated in Bahasa Indonesia or chosen language!
  const handleResingActiveSongInLanguage = async (targetLanguage: string) => {
    if (!currentSong) return;
    setIsTranslatingSong(true);
    try {
      const compiledLyrics =
        currentSong.lyricSections
          ?.filter((s) => s.sectionName !== "Intro")
          .flatMap((s) => s.lines)
          .join("\n") || currentSong.context;

      const audioRes = await fetch("/api/generate-haddi-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Sing and narrate this song in ${targetLanguage} for ${currentSong.target}: ${currentSong.title}`,
          mode: audioGenerationMode,
          target: currentSong.target,
          customGenre: currentSong.genre || customGenre,
          setType: currentSong.setType || setType,
          lyrics: compiledLyrics,
          language: targetLanguage,
          artistPersona: currentSong.artistPersona || artistPersona,
        }),
      });
      const audioData = await audioRes.json();
      if (audioData.audioUrl) {
        if (audioData.lyriaAudioUrl) setLyriaAudioUrl(audioData.lyriaAudioUrl);
        if (audioData.narrationAudioUrl) setNarrationAudioUrl(audioData.narrationAudioUrl);
        setAudioSource(audioData.audioUrl);
      }
    } catch (err) {
      console.warn("Re-sing audio error:", err);
    } finally {
      setIsTranslatingSong(false);
    }
  };

  const handleInitiateSystem = (prefill?: {
    target?: string;
    context?: string;
    genre?: string;
    language?: string;
    setType?: SetType;
    artistPersona?: "haddi" | "yosia";
    preloadedSong?: SongData;
    autoGenerate?: boolean;
    initialSection?: "studio" | "yosia-kids" | "free-songs" | "lifetime" | "affiliate" | "admin";
  }) => {
    if (isPlaying) {
      luteEngineInstance.stopLutePlayback();
      setIsPlaying(false);
    }

    if (prefill?.target) setTarget(prefill.target);
    if (prefill?.context) setContext(prefill.context);
    if (prefill?.genre) setCustomGenre(prefill.genre);
    if (prefill?.language) setSongLanguage(prefill.language);
    if (prefill?.setType) setSetType(prefill.setType);
    if (prefill?.artistPersona) setArtistPersona(prefill.artistPersona);

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
        prefill.setType || setType,
        prefill.genre || customGenre,
        prefill.language || songLanguage,
        prefill.artistPersona || artistPersona,
        prefill.preloadedSong
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
    setLyriaAudioUrl(null);
    setNarrationAudioUrl(null);
    setAudioUrl(null);
    setAudioSourceState(null);
    setActiveTrackType(audioGenerationMode === "narration" ? "narration" : "lyria");
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
          language: songLanguage,
          artistPersona,
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
      setOriginalLyricSections(returnedSong.lyricSections);

      if ((setType === "extended" || setType === "premium" || setType === "legacy") && data.variations) {
        setAllVariations(data.variations);
        setActiveVariationIdx(0);
      } else {
        setAllVariations([returnedSong]);
        setActiveVariationIdx(0);
      }

      // 2. Generate Real AI Audio via Google AI Studio (Lyria 3 Sung Studio Song by default!)
      const compiledLyrics = returnedSong.lyricSections
        ?.filter(s => s.sectionName !== "Intro")
        .flatMap(s => s.lines)
        .join("\n") || context.trim();

      const origin = getPublicOrigin();
      setShareableSongUrl(`${origin}/?song=${encodeURIComponent(returnedSong.id)}`);
      setDirectAudioUrl(`${origin}/api/songs/${encodeURIComponent(returnedSong.id)}/audio`);

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
          language: songLanguage,
          artistPersona,
          shareId: returnedSong.id,
          imageDataUrl: uploadedImages[0] || undefined,
        }),
      });

      const audioData = await audioRes.json();
      if (audioData.directAudioUrl) {
        setDirectAudioUrl(
          audioData.directAudioUrl.startsWith("http")
            ? audioData.directAudioUrl
            : `${origin}${audioData.directAudioUrl}`
        );
      }
      if (audioData.shareableSongUrl) {
        setShareableSongUrl(audioData.shareableSongUrl);
      }
      if (audioData.audioUrl) {
        if (audioData.lyriaAudioUrl) setLyriaAudioUrl(audioData.lyriaAudioUrl);
        if (audioData.narrationAudioUrl) setNarrationAudioUrl(audioData.narrationAudioUrl);
        const initType = audioGenerationMode === "narration" && audioData.narrationAudioUrl ? "narration" : audioData.lyriaAudioUrl ? "lyria" : "narration";
        const primaryPlayUrl = initType === "lyria" ? (audioData.lyriaAudioUrl || audioData.audioUrl) : (audioData.narrationAudioUrl || audioData.audioUrl);
        setActiveTrackType(initType);
        setAudioSource(primaryPlayUrl);
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
    setSetType("full");
    setStage(1);
  };

  const handleShareWhatsApp = () => {
    if (!currentSong) return;
    const { songLink, audioLink } = getCanonicalSongLinks(currentSong.id);
    const text = encodeURIComponent(
      `🎵 I created a personalized song titled "${currentSong.title}" for ${currentSong.target} on www.mygiftsong.org!\n\n` +
      `👉 Click to Open & Play Your Song:\n${songLink}\n\n` +
      `🔊 Direct Link to Song Audio:\n${audioLink}\n\n` +
      `🌐 Created at https://www.mygiftsong.org 🌟`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleCopyLyrics = () => {
    if (!currentSong) return;
    const { songLink, audioLink } = getCanonicalSongLinks(currentSong.id);
    const text = currentSong.lyricSections.map(s => 
      `[${s.sectionName}]\n` + s.lines.join("\n")
    ).join("\n\n");

    navigator.clipboard.writeText(
      `"${currentSong.title}" — Dedicated to ${currentSong.target}\n` +
      `🎵 Listen to Song: ${songLink}\n` +
      `🔊 Direct Audio Link: ${audioLink}\n\n` +
      `${text}\n\n` +
      `Created on https://www.mygiftsong.org`
    );
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  // Update lyrics after song creation and optionally re-sing the studio song audio
  const handleUpdateSongLyrics = async (newLyricsText: string, shouldResingAudio?: boolean) => {
    if (!currentSong || !newLyricsText.trim()) return;

    const rawLines = newLyricsText.split("\n").map((l) => l.trim()).filter(Boolean);
    const introSection = currentSong.lyricSections.find((s) => s.sectionName === "Intro");
    const nonIntroExisting = currentSong.lyricSections.filter((s) => s.sectionName !== "Intro");

    const parsedSections: typeof currentSong.lyricSections = [];
    let currentSectionName = nonIntroExisting[0]?.sectionName || "Verse 1";
    let currentLines: string[] = [];

    for (const line of rawLines) {
      const headerMatch = line.match(/^\[(.+)\]$/);
      if (headerMatch) {
        if (currentLines.length > 0) {
          parsedSections.push({
            sectionName: currentSectionName,
            lines: currentLines,
            timestamps: currentLines.map((_, idx) => (parsedSections.length * 16) + idx * 4),
            chords: currentLines.map((_, idx) => ["G", "C", "Em", "D"][idx % 4]),
          });
          currentLines = [];
        }
        currentSectionName = headerMatch[1].trim();
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      parsedSections.push({
        sectionName: currentSectionName,
        lines: currentLines,
        timestamps: currentLines.map((_, idx) => (parsedSections.length * 16) + idx * 4),
        chords: currentLines.map((_, idx) => ["G", "C", "Em", "D"][idx % 4]),
      });
    }

    const updatedSections = introSection
      ? [introSection, ...parsedSections]
      : parsedSections;

    setAllVariations((prev) =>
      prev.map((song, idx) =>
        idx === activeVariationIdx
          ? { ...song, lyricSections: updatedSections }
          : song
      )
    );

    if (shouldResingAudio) {
      const plainLyricsOnly = parsedSections.flatMap((s) => s.lines).join("\n");
      setIsSwitchingTrack(true);
      try {
        const res = await fetch("/api/generate-haddi-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${currentSong.context || context || "Special blessing song"}. ${plainLyricsOnly}`,
            target: currentSong.target || target || "Someone Special",
            genre: currentSong.genre || customGenre,
            lyrics: plainLyricsOnly,
            mode: "lyria",
            useClipModel: (currentSong.setType || setType) === "quick",
            setType: currentSong.setType || setType,
            language: currentSong.language || songLanguage,
            artistPersona: currentSong.artistPersona || artistPersona,
            shareId: currentSong.id,
          }),
        });
        const data = await res.json();
        if (data?.directAudioUrl) {
          const origin = getPublicOrigin();
          setDirectAudioUrl(
            data.directAudioUrl.startsWith("http")
              ? data.directAudioUrl
              : `${origin}${data.directAudioUrl}`
          );
        }
        if (data?.shareableSongUrl) {
          setShareableSongUrl(data.shareableSongUrl);
        }
        const freshUrl = data?.lyriaAudioUrl || data?.audioUrl || null;
        if (freshUrl) {
          setLyriaAudioUrl(freshUrl);
          setActiveTrackType("lyria");
          setAudioUrl(freshUrl);
          setAudioSource(freshUrl);
        }
      } catch (err) {
        console.warn("Re-singing edited lyrics error:", err);
      } finally {
        setIsSwitchingTrack(false);
      }
    }
  };

  // Render format helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between font-sans selection:bg-teal-600 selection:text-white">
      {/* --- CLEAN CLUTTER-FREE LANDING PAGE (BEFORE SYSTEM INITIATION) --- */}
      {!isSystemInitiated ? (
        <LandingExperience
          freeSongsRemaining={freeSongsRemaining}
          referralCount={referrals.length}
          adminEmail={adminUser.isAuthenticated ? adminUser.email : undefined}
          oneTimeRedoUsed={oneTimeRedoUsed}
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
          {/* --- CLEAN WHITE & EARTHY TEAL STUDIO NAVIGATION BAR --- */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              {/* Left: Brand Logo & Wordmark */}
              <div
                className="flex items-center gap-3 cursor-pointer shrink-0"
                onClick={() => {
                  setActiveSystemTab("studio");
                  handleReset();
                }}
              >
                <img
                  src="/pwa-192x192.png"
                  alt="mygiftsong.org App Icon"
                  className="w-10 h-10 rounded-xl border border-teal-600/30 object-cover shadow-xs"
                />
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                      mygiftsong<span className="text-teal-700">.org</span>
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                      Studio
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                    AI Assisted Song Generator • Haddi the Street Minstrel
                  </p>
                </div>
              </div>

              {/* Center: Uncluttered Horizontal Text Links */}
              <nav className="hidden lg:flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setActiveSystemTab("studio")}
                  className={`py-5 text-sm font-semibold transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                    activeSystemTab === "studio"
                      ? "text-teal-800"
                      : "text-slate-600 hover:text-teal-700"
                  }`}
                >
                  <Music size={15} className="text-teal-600" />
                  <span>Haddi Studio</span>
                  {activeSystemTab === "studio" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("yosia-kids")}
                  className={`py-5 text-sm font-semibold transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                    activeSystemTab === "yosia-kids"
                      ? "text-teal-800"
                      : "text-slate-600 hover:text-teal-700"
                  }`}
                >
                  <Smile size={15} className="text-teal-600" />
                  <span>Children&apos;s Page (Yosia)</span>
                  {activeSystemTab === "yosia-kids" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("free-songs")}
                  className={`py-5 text-sm font-semibold transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                    activeSystemTab === "free-songs"
                      ? "text-teal-800"
                      : "text-slate-600 hover:text-teal-700"
                  }`}
                >
                  <Gift size={15} className="text-teal-600" />
                  <span>5 Free Songs ({isLifetimeUnlocked ? "∞" : `${freeSongsRemaining}/5`})</span>
                  {activeSystemTab === "free-songs" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("lifetime")}
                  className={`py-5 text-sm font-semibold transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                    activeSystemTab === "lifetime"
                      ? "text-teal-800"
                      : "text-slate-600 hover:text-teal-700"
                  }`}
                >
                  <Crown size={15} className="text-teal-600" />
                  <span>Lifetime Pass</span>
                  {activeSystemTab === "lifetime" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSystemTab("affiliate")}
                  className={`py-5 text-sm font-semibold transition-colors relative cursor-pointer flex items-center gap-1.5 ${
                    activeSystemTab === "affiliate"
                      ? "text-teal-800"
                      : "text-slate-600 hover:text-teal-700"
                  }`}
                >
                  <TrendingUp size={15} className="text-teal-600" />
                  <span>Affiliate Hub</span>
                  {activeSystemTab === "affiliate" && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-teal-600 rounded-full" />
                  )}
                </button>
              </nav>

              {/* Right: Actions & Mobile Pill Switcher */}
              <div className="flex items-center gap-2.5">
                <PWAInstallButton variant="light" />

                {isAdminMenuVisible && (
                  <button
                    type="button"
                    onClick={() => setActiveSystemTab("admin")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeSystemTab === "admin"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-teal-800 bg-stone-100 hover:bg-teal-50 border border-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Return to Welcome Home Page"
                >
                  <ArrowLeft size={13} />
                  <span className="hidden sm:inline">Home</span>
                </button>
              </div>
            </div>

            {/* Secondary Sub-Navigation Bar for Mobile / Tablet */}
            <div className="lg:hidden border-t border-stone-100 bg-stone-50/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSystemTab("studio")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeSystemTab === "studio"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 border border-stone-200"
                }`}
              >
                Haddi Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveSystemTab("yosia-kids")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeSystemTab === "yosia-kids"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 border border-stone-200"
                }`}
              >
                👦🎸 Children&apos;s Page
              </button>
              <button
                type="button"
                onClick={() => setActiveSystemTab("free-songs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeSystemTab === "free-songs"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 border border-stone-200"
                }`}
              >
                5 Free ({freeSongsRemaining}/5)
              </button>
              <button
                type="button"
                onClick={() => setActiveSystemTab("lifetime")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeSystemTab === "lifetime"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 border border-stone-200"
                }`}
              >
                Lifetime Pass
              </button>
              <button
                type="button"
                onClick={() => setActiveSystemTab("affiliate")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  activeSystemTab === "affiliate"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 border border-stone-200"
                }`}
              >
                Affiliate Hub
              </button>
            </div>
          </header>

          {/* --- MAIN STAGES MATRIX & SEPARATE SYSTEM SECTIONS --- */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
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
            ) : activeSystemTab === "yosia-kids" ? (
              <YosiaChildrenSection
                variant="light"
                freeSongsRemaining={freeSongsRemaining}
                onBackToMainPage={() => setActiveSystemTab("studio")}
                onGenerateYosiaSong={(params) => {
                  handleInitiateSystem({
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
            ) : activeSystemTab !== "studio" ? (
              <RewardsAndAffiliateSections
                activeSubPage={activeSystemTab}
                freeSongsRemaining={freeSongsRemaining}
                freeSongsUsedHistory={freeSongsUsedHistory}
                oneTimeRedoUsed={oneTimeRedoUsed}
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
                      <div id="stripe-checkout-notice" className="bg-teal-50 border border-teal-300 rounded-2xl p-4 w-full flex items-center justify-between text-xs md:text-sm text-teal-900 font-medium shadow-xs mb-2">
                        <div className="flex items-center gap-3">
                          <Sparkles className="text-teal-700 shrink-0" size={18} />
                          <span>{paymentNotice}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentNotice(null)}
                          className="text-teal-700 hover:text-teal-950 transition-colors p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Expandable Accordion: Our Purpose & How to Use */}
                    <div className="w-full bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs transition-all">
                      <button
                        type="button"
                        id="purpose_accordion_toggle"
                        onClick={() => setIsPurposeExpanded(!isPurposeExpanded)}
                        className="w-full text-left px-6 py-4 flex items-center justify-between text-xs sm:text-sm font-semibold text-teal-900 bg-stone-50/70 hover:bg-teal-50/50 transition-all cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles size={15} className="text-teal-600" />
                          <span>Our Purpose & How to Use the Full Studio {isPurposeExpanded ? "(Hide)" : "(Learn More)"}</span>
                        </span>
                        <ChevronRight size={18} className={`text-teal-700 transition-transform duration-300 ${isPurposeExpanded ? "rotate-90" : "rotate-0"}`} />
                      </button>

                      {isPurposeExpanded && (
                        <div className="p-6 md:p-8 space-y-6 border-t border-stone-200 bg-white text-slate-700 animate-fade-in text-left">
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-2">
                              📜 The Official 5+3 Lyre Mandate
                            </h4>
                            <p className="text-xs md:text-sm leading-relaxed text-slate-600 pl-4 border-l-2 border-teal-500">
                              Haddi’s system integrates five distinct narrative dimensions (character, location, history, milestone, and blessing) with three acoustic intentions (sincerity, honor, and resonance). Every track is crafted as a personal sonic keepsake.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-teal-800 uppercase tracking-widest bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">Step 01</span>
                              <h5 className="text-xs font-bold text-slate-900">Identify & Honor</h5>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Enter the name of the special person or group your custom song honors.
                              </p>
                            </div>
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-teal-800 uppercase tracking-widest bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">Step 02</span>
                              <h5 className="text-xs font-bold text-slate-900">Weave the Story</h5>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Share memories, occasion details, and personal words for the lyrics.
                              </p>
                            </div>
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-teal-800 uppercase tracking-widest bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">Step 03</span>
                              <h5 className="text-xs font-bold text-slate-900">Choose Style & Language</h5>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Pick your musical style and language (including Bahasa Indonesia).
                              </p>
                            </div>
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-1.5">
                              <span className="text-[10px] font-mono font-bold text-teal-800 uppercase tracking-widest bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">Step 04</span>
                              <h5 className="text-xs font-bold text-slate-900">Create & Gift</h5>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Generate your complete vocal song and share the digital gift card!
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Top Section: Side-by-Side 50/50 Layout for Intro Video & Studio Form */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                      {/* Left Side: Clean White Greeting & Video Card */}
                      <div className="flex flex-col justify-start items-center text-center space-y-5 p-6 md:p-7 rounded-2xl bg-white border border-stone-200 shadow-xs">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-800">
                          <Sparkles size={13} className="text-teal-600" /> Haddi&apos;s Acoustic Studio
                        </div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">
                          Who is your <span className="text-teal-700">Acoustic Song</span> honoring today?
                        </h1>
                        <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                          Shalom! Welcome. My name is Haddi, a local street musician in Jakarta. There is no greater gift than a song — tell me whose heart we are honoring today.
                        </p>

                        {/* Flagship Video Canvas */}
                        <div className="relative w-full rounded-xl overflow-hidden border border-stone-200 shadow-xs bg-slate-900 flex items-center justify-center aspect-video min-h-[200px]">
                          <iframe
                            id="haddi-video"
                            src="https://drive.google.com/file/d/1H7bdSkULkzoNQGqqno26_KJzAPsZUPL2/preview"
                            width="100%"
                            height="450"
                            allow="autoplay"
                            style={{ border: "none", borderRadius: "12px", backgroundColor: "#0f172a" }}
                          ></iframe>

                          <button
                            id="unmute-btn"
                            type="button"
                            onClick={toggleMinstrelAudio}
                            className="absolute bottom-3.5 right-3.5 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-teal-800 border border-teal-300 shadow-md flex items-center justify-center text-base cursor-pointer transition-transform hover:scale-105 z-10"
                          >
                            {introVideoMuted ? "🔇" : "🔊"}
                          </button>
                        </div>

                        {/* Quote Banner */}
                        <div className="w-full bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-3 text-center">
                          <p className="text-xs font-semibold text-teal-900 tracking-wide">
                            &ldquo;There is no greater gift than a song... it is worth more than a thousand words!&rdquo;
                          </p>
                        </div>

                        {/* Active Studio Audio Player or Secondary Preview */}
                        {isGenerating ? (
                          <div className="relative w-full rounded-xl overflow-hidden border border-teal-200 bg-teal-50/50 flex flex-col items-center justify-center aspect-video min-h-[180px] p-6 space-y-3">
                            <Disc size={36} className="text-teal-700 animate-spin [animation-duration:3s]" />
                            <div className="space-y-1 text-center max-w-xs">
                              <p className="text-xs font-mono font-bold text-teal-800 uppercase tracking-widest">
                                HADDI IS COMPOSING...
                              </p>
                              <p className="text-xs text-slate-600 italic">
                                &ldquo;Plucking silver strings with warmth and sincerity...&rdquo;
                              </p>
                            </div>
                          </div>
                        ) : audioUrl ? (
                          <div className="w-full rounded-xl border border-teal-200 bg-stone-50 p-5 space-y-3.5 text-left">
                            <div className="flex items-center gap-3.5 w-full">
                              <div className={`p-3 rounded-full bg-teal-700 text-white shrink-0 ${isAudioPlaying ? "animate-spin [animation-duration:10s]" : ""}`}>
                                <Disc size={22} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-mono text-teal-700 uppercase tracking-widest block font-bold">
                                  {activeTrackType === "narration" ? "Haddi Spoken Blessing" : "Lyria 3 Sung Studio Master"}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 truncate">
                                  {currentSong?.title || "Bespoke Acoustic Masterpiece"}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">
                                  Style: {customGenre} • {setType.toUpperCase()}
                                </p>
                              </div>
                            </div>

                            {(lyriaAudioUrl || narrationAudioUrl) && (
                              <div className="grid grid-cols-2 gap-2 w-full bg-white p-1 rounded-lg border border-stone-200">
                                <button
                                  type="button"
                                  onClick={() => handleSelectTrackType("lyria")}
                                  disabled={!lyriaAudioUrl}
                                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                                    activeTrackType === "lyria" && lyriaAudioUrl
                                      ? "bg-teal-700 text-white"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  🎸 Sung Song
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectTrackType("narration")}
                                  disabled={!narrationAudioUrl}
                                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                                    activeTrackType === "narration" && narrationAudioUrl
                                      ? "bg-teal-700 text-white"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  🎙️ Haddi Narration
                                </button>
                              </div>
                            )}

                            <audio
                              id="suno-audio-player"
                              src={audioUrl}
                              ref={audioRef}
                              onTimeUpdate={handleAudioTimeUpdate}
                              onEnded={() => setIsAudioPlaying(false)}
                              autoPlay={true}
                              muted={false}
                              controls={true}
                              className="w-full mt-2 block rounded-lg accent-teal-700"
                            />
                          </div>
                        ) : (
                          <div className="relative w-full rounded-xl overflow-hidden border border-stone-200 shadow-xs bg-slate-900 flex items-center justify-center aspect-video min-h-[180px]">
                            <iframe
                              id="premium-preview-video"
                              src="https://drive.google.com/file/d/1dvyq1PS79s4e3GZlcDxZ3tK2lGKktyiC/preview"
                              width="100%"
                              height="450"
                              allow="autoplay"
                              style={{ border: "none", borderRadius: "12px", backgroundColor: "#0f172a" }}
                            ></iframe>
                          </div>
                        )}

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
                              userWords={currentSong?.context || context}
                              recipientName={currentSong?.target || target || "Someone Special"}
                              artistPersona={currentSong?.artistPersona || artistPersona}
                              onUpdateLyrics={handleUpdateSongLyrics}
                            />
                          </div>
                        )}

                        {error && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs font-medium text-red-700 w-full text-center">
                            ⚠️ {error}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Interactive Studio Form */}
                      <div className="w-full p-6 md:p-7 bg-white border border-stone-200 rounded-2xl shadow-xs flex flex-col justify-between space-y-6">
                        <div className="space-y-5">
                          {/* Step 1: Recipient */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <User size={15} className="text-teal-600" /> Step 1: Who is this song for?
                            </label>
                            <input
                              id="target_recipient_input"
                              type="text"
                              maxLength={40}
                              placeholder="e.g. Sarah, Mom & Dad, My Best Friend"
                              value={target}
                              onChange={(e) => setTarget(e.target.value)}
                              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all text-sm font-medium"
                            />
                          </div>

                          {/* Step 2: Story & Lyrics */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar size={15} className="text-teal-600" /> Step 2: Occasion, Memories & Lyrics
                            </label>
                            <textarea
                              id="context_story_textarea"
                              rows={4}
                              placeholder="Describe the occasion (Birthday, Anniversary, Thank You) and special memories or exact words to weave into the chorus..."
                              value={context}
                              onChange={(e) => setContext(e.target.value)}
                              className={`w-full bg-stone-50 border rounded-xl px-4 py-3 text-slate-900 text-xs sm:text-sm leading-relaxed placeholder-slate-400 focus:outline-none focus:bg-white transition-all resize-y min-h-[110px] ${
                                (context.trim() === "" ? 0 : context.trim().split(/\s+/).length) > 500
                                  ? "border-red-500 focus:border-red-500"
                                  : "border-stone-300 focus:border-teal-600"
                              }`}
                            />
                            <div className="flex justify-between items-center text-[11px] text-slate-500">
                              <span>Include personal names, places, or favorite memories</span>
                              <span className={(context.trim() === "" ? 0 : context.trim().split(/\s+/).length) > 500 ? "text-red-600 font-bold" : ""}>
                                {context.trim() === "" ? 0 : context.trim().split(/\s+/).length} / 500 words
                              </span>
                            </div>
                          </div>

                          {/* Optional Gifter & Recipient Emails */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 border border-stone-200 p-3.5 rounded-xl">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-slate-700">
                                  Your Email
                                </label>
                                {gifterEmail.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAdminMenuVisible(true);
                                      setActiveSystemTab("admin");
                                    }}
                                    className="text-[10px] font-mono font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <ShieldCheck size={11} /> Admin
                                  </button>
                                )}
                              </div>
                              <input
                                id="gifter_email_input"
                                type="email"
                                placeholder="you@example.com"
                                value={gifterEmail}
                                onChange={(e) => setGifterEmail(e.target.value)}
                                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-teal-600"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Recipient&apos;s Email (Optional)
                              </label>
                              <input
                                id="recipient_email_input"
                                type="email"
                                placeholder="recipient@example.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:border-teal-600"
                              />
                            </div>
                          </div>

                          {/* Step 3: Musical Style Theme Selector */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                              Step 3: Musical Style & Language
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { id: "Acoustic Folk", label: "🎸 Acoustic Folk" },
                                { id: "Modern Worship", label: "🙏 Worship" },
                                { id: "Children's Joyful Acoustic Sing-Along", label: "👦 Kids Sing-Along" },
                                { id: "Birthday Acoustic Celebration", label: "🎂 Birthday Song" },
                                { id: "Bluegrass", label: "🪕 Bluegrass" },
                                { id: "Rustic Lute", label: "🎶 Rustic Lute" },
                                { id: "Lofi Acoustic", label: "🌿 Lofi Acoustic" },
                                { id: "Indie Pop", label: "✨ Indie Pop" },
                              ].map((genreItem) => (
                                <button
                                  key={genreItem.id}
                                  type="button"
                                  onClick={() => setCustomGenre(genreItem.id)}
                                  className={`px-2.5 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                                    customGenre === genreItem.id
                                      ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                                      : "bg-stone-50 text-slate-700 border-stone-200 hover:border-teal-300"
                                  }`}
                                >
                                  {genreItem.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Language Translator Selector */}
                          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Globe size={14} className="text-teal-700" /> Song Language & Translator:
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {SUPPORTED_SONG_LANGUAGES.slice(0, 6).map((lang) => (
                                <button
                                  key={lang.code}
                                  type="button"
                                  onClick={() => setSongLanguage(lang.code)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    songLanguage === lang.code
                                      ? "bg-teal-700 text-white shadow-xs"
                                      : "bg-white text-slate-700 border border-stone-200 hover:border-teal-300"
                                  }`}
                                >
                                  {lang.short}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Question for Guests: Separate Page for Children (Flashing High-Visibility Callout) */}
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border-2 border-teal-500 shadow-[0_0_20px_rgba(13,148,136,0.2)] flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs sm:text-sm font-bold text-teal-950 flex items-center gap-1.5">
                                  <span className="animate-bounce inline-block">👦🎸</span>
                                  <span>Is this song for a child? We have a separate page for children!</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-mono font-extrabold uppercase tracking-wider animate-pulse">
                                  ✨ Kids Page
                                </span>
                              </div>
                              <p className="text-[11px] text-teal-800 font-medium">
                                Meet Haddi&apos;s little brother, Yosia — open our dedicated Children&apos;s Song Page.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSystemTab("yosia-kids");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md ring-2 ring-amber-300/80 animate-pulse hover:animate-none"
                            >
                              <span>Open Children&apos;s Page</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>

                          {/* Audio Engine & Package Set */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                                Vocal Mode
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { id: "lyria", label: "🎸 Sung" },
                                  { id: "narration", label: "🎙️ Voice" },
                                  { id: "both", label: "✨ Both" },
                                ].map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setAudioGenerationMode(m.id as "lyria" | "narration" | "both")}
                                    className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                      audioGenerationMode === m.id
                                        ? "border-teal-700 bg-teal-50 text-teal-900"
                                        : "border-stone-200 bg-stone-50 text-slate-600 hover:border-stone-300"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                                Dedicated Set &amp; Song Length
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { id: "quick", label: "Quick ($0.99 • 60s)" },
                                  { id: "full", label: "Full ($1.99 • 2-Min)" },
                                  { id: "premium", label: "Video ($4.99 • 2-Min)" },
                                  { id: "legacy", label: "Legacy ($12.99 • 2-Min)" },
                                ].map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSetType(s.id as SetType)}
                                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                                      setType === s.id
                                        ? "border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-600/30"
                                        : "border-stone-200 bg-stone-50 text-slate-600 hover:border-stone-300"
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Conditional Image Uploader for Video/Legacy */}
                          {(setType === "premium" || setType === "legacy") && (
                            <div className="space-y-2 bg-stone-50 border border-stone-200 p-4 rounded-xl text-left">
                              <label className="text-xs font-semibold text-teal-900 block">
                                📸 Add Photos for Lyric Video (Optional - Max 5)
                              </label>
                              <div
                                onClick={() => {
                                  const fileInput = document.getElementById("uploader-file-input") as HTMLInputElement | null;
                                  if (fileInput) fileInput.click();
                                }}
                                className="border-2 border-dashed border-stone-300 hover:border-teal-600 rounded-xl p-4 text-center cursor-pointer bg-white transition-all text-slate-500"
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
                                <p className="text-xs">
                                  Click to upload photos (<span className="text-teal-700 font-semibold underline">browse</span>)
                                </p>
                              </div>
                              {uploadedImages.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {uploadedImages.map((imgSrc, idx) => (
                                    <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-stone-300 group">
                                      <img src={imgSrc} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                                        }}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Free Pass & 1-Time Redo Policy Banner */}
                          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1 text-xs text-teal-950">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 font-bold">
                                <Gift size={14} className="text-teal-700" />
                                {adminUser.isAuthenticated && adminUser.unlimitedBypass
                                  ? `Admin Unlimited Mode (${adminUser.email})`
                                  : isLifetimeUnlocked
                                  ? "Lifetime Account Active — Unlimited Free Songs"
                                  : `First 5 Songs Free Pass: ${freeSongsRemaining} of 5 Remaining`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white text-teal-800 border border-teal-200 text-[11px] font-semibold">
                                {oneTimeRedoUsed ? "1-Time Redo Used" : "1-Time Redo Available"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              <strong>1-Time Redo Policy:</strong> You get <strong>1 redo option</strong> across your 5 free songs. Once used, whatever song is generated is kept for the remaining 4 songs.
                            </p>
                          </div>

                          {/* Notice: Please Check Lyrics Before Creating a Song */}
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 font-medium flex items-center gap-2">
                            <span className="text-amber-700 font-bold shrink-0">⚠️ NOTICE:</span>
                            <span>
                              <strong>PLEASE CHECK LYRICS BEFORE CREATING A SONG.</strong> Double-check spelling and names above, or use the <strong>Edit Lyrics</strong> button on the next screen after your song is created!
                            </span>
                          </div>

                          {/* Submit Button */}
                          <button
                            id="strum_generate_button"
                            type="button"
                            onClick={handleStrumSong}
                            className="w-full bg-teal-700 hover:bg-teal-800 text-white font-display font-bold rounded-xl text-center py-4 text-sm tracking-wide cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <Music size={17} />
                            <span>
                              {freeSongsRemaining > 0 || isLifetimeUnlocked
                                ? `Create & Render Complete Song (${isLifetimeUnlocked ? "Lifetime" : `${freeSongsRemaining}/5 Free`})`
                                : "Create & Render Complete Song"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 2: COMPOSING & VOCAL RENDERING */}
                {stage === 2 && (
                  <motion.div
                    key="stage2"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="max-w-xl mx-auto w-full bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-6 shadow-xs"
                  >
                    <div className="relative inline-block">
                      <div className="w-24 h-24 rounded-full border-2 border-teal-500 bg-teal-50 flex items-center justify-center mx-auto">
                        <Music size={36} className="text-teal-700 animate-pulse" />
                      </div>
                      <div className="mt-2 inline-block bg-teal-700 text-white text-[10px] font-mono font-bold tracking-widest px-3 py-1 rounded-full uppercase">
                        {artistPersona === "yosia" ? "YOSIA • LITTLE GUITAR BROTHER" : "HADDI THE MINSTREL"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl font-display font-bold text-slate-900">
                        {artistPersona === "yosia" ? "Yosia (Haddi's Little Brother)" : "Haddi"}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
                        {artistPersona === "yosia"
                          ? `Joyful Children's Guitar Star • Singing in ${songLanguage}`
                          : `Sumatran Soul • Jakarta Street Musician (${songLanguage})`}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-display font-semibold text-teal-800 flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
                        Composing {target || "Your Special"}&apos;s Complete Song ({songLanguage})...
                      </h3>

                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-center max-w-md mx-auto">
                        <p className="text-slate-700 text-sm italic leading-relaxed">
                          &ldquo;{loadingStep === 0 && (artistPersona === "yosia" ? "Halo teman-teman! Yosia is tuning his happy acoustic guitar..." : "Selamat datang! Haddi is tuning the acoustic guitar...")}
                          {loadingStep === 1 && "Aligning warm acoustic chords and melody..."}
                          {loadingStep === 2 && `Composing your personalized song lyrics in ${songLanguage}...`}
                          {loadingStep === 3 && (artistPersona === "yosia" ? "Yosia is warming up his cheerful voice!" : "Recording studio vocals and guitar harmony...")}
                          {loadingStep >= 4 && "Ada lagu! Your custom gift song is ready!"}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center items-end gap-2.5 h-10">
                      <div className="w-1.5 bg-teal-500 rounded-full visualizer-pillar" style={{ height: "100%", animationDelay: "0.1s" }}></div>
                      <div className="w-1.5 bg-teal-700 rounded-full visualizer-pillar" style={{ height: "70%", animationDelay: "0.4s" }}></div>
                      <div className="w-1.5 bg-teal-600 rounded-full visualizer-pillar" style={{ height: "85%", animationDelay: "0.25s" }}></div>
                      <div className="w-1.5 bg-teal-400 rounded-full visualizer-pillar" style={{ height: "45%", animationDelay: "0.6s" }}></div>
                      <div className="w-1.5 bg-teal-700 rounded-full visualizer-pillar" style={{ height: "95%", animationDelay: "0.33s" }}></div>
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
                    className="space-y-6"
                  >
                    {/* Back button and Sharing controls header */}
                    <div className="flex flex-wrap justify-between items-center gap-3 bg-white border border-stone-200 rounded-2xl px-5 py-4 shadow-xs">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-xs text-teal-800 hover:text-teal-950 font-semibold transition-colors cursor-pointer"
                      >
                        <RefreshCw size={14} /> Back to Studio
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowKeepsake(true)}
                          className="flex items-center gap-1.5 text-xs text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer"
                        >
                          <Download size={14} /> Printable Keepsake Card
                        </button>
                        <button
                          type="button"
                          onClick={handleShareWhatsApp}
                          className="flex items-center gap-1.5 text-xs text-white bg-teal-700 hover:bg-teal-800 px-3.5 py-2 rounded-xl font-semibold transition-colors cursor-pointer"
                        >
                          <Phone size={14} /> Share on WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* Main Performance Center Block */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {/* Left side: Now playing title & Complete Song Player */}
                      <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <span className="inline-block text-[11px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full uppercase font-semibold">
                              🎵 Dedicated to {currentSong.target}
                            </span>
                            <span className="inline-block text-[11px] font-mono text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase font-bold">
                              {currentSong.setType === "quick"
                                ? "⏱️ 60s Quick Strum ($0.99)"
                                : "🎶 2:00 Full Longer Song ($1.99 Packet)"}
                            </span>
                          </div>

                          <h3 className="text-2xl font-display font-bold text-slate-900">
                            {currentSong.title}
                          </h3>

                          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 bg-stone-100 px-3 py-1 rounded-lg font-medium">
                            <Disc size={14} className={isPlaying ? "animate-spin text-teal-700" : "text-teal-700"} />
                            {currentSong.genre} • {currentSong.tempo}
                          </div>

                          {currentSong.setType === "quick" && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSetType("full");
                                  triggerSongGeneration(
                                    currentSong.target,
                                    currentSong.context,
                                    "full",
                                    currentSong.genre || customGenre,
                                    currentSong.language || songLanguage,
                                    currentSong.artistPersona || artistPersona
                                  );
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <Sparkles size={13} />
                                <span>Extend to 2-Minute Longer Song ($1.99 Packet)</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Complete AI Studio Song Player Console */}
                        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
                          <div className="flex justify-between items-center text-xs font-mono text-slate-500 font-semibold">
                            <span>
                              {activeTrackType === "narration"
                                ? "🎙️ HADDI SPOKEN BLESSING"
                                : "🎸 COMPLETE STUDIO SONG"}
                            </span>
                            <span className="text-teal-700 font-bold uppercase">
                              {isAudioPlaying || isPlaying ? "● NOW PLAYING" : "READY"}
                            </span>
                          </div>

                          {(lyriaAudioUrl || narrationAudioUrl) && (
                            <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                              <button
                                type="button"
                                onClick={() => handleSelectTrackType("lyria")}
                                disabled={isSwitchingTrack}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                                  activeTrackType === "lyria"
                                    ? "bg-teal-700 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {isSwitchingTrack && activeTrackType === "lyria" && !lyriaAudioUrl
                                  ? "⏳ Rendering Music..."
                                  : "🎸 Complete Sung Song"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectTrackType("narration")}
                                disabled={isSwitchingTrack}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                                  activeTrackType === "narration"
                                    ? "bg-teal-700 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                {isSwitchingTrack && activeTrackType === "narration" && !narrationAudioUrl
                                  ? "⏳ Recording Voice..."
                                  : "🎙️ Haddi Narration"}
                              </button>
                            </div>
                          )}

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
                              className="w-full rounded-xl accent-teal-700"
                            />
                          )}

                          {/* Timeline and Drag-Seeker */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-mono text-slate-500">
                              <span>{formatTime(Math.floor(audioUrl ? audioCurrentTime : currentTime))}</span>
                              <span>{formatTime(Math.floor(audioUrl && audioDuration ? audioDuration : currentSong.totalDurationSeconds))}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={Math.floor(audioUrl && audioDuration ? audioDuration : currentSong.totalDurationSeconds)}
                              value={Math.floor(audioUrl ? audioCurrentTime : currentTime)}
                              onChange={(e) => handleSeek(Number(e.target.value))}
                              className="w-full accent-teal-700 bg-stone-200 h-1.5 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Controls Row */}
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={togglePlayback}
                                className="w-12 h-12 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-sm flex items-center justify-center transition-all cursor-pointer"
                                title="Play/Pause Complete Song"
                              >
                                {isAudioPlaying || isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                              </button>

                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-900">
                                  {isAudioPlaying || isPlaying ? "Playing Complete Song" : "Play Complete Song"}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Full Vocals & Acoustic Arrangement
                                </p>
                              </div>
                            </div>

                            {/* Volume Console */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setMuted(!muted)}
                                className="text-slate-500 hover:text-teal-700 transition-colors"
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
                                className="w-20 accent-teal-700 bg-stone-200 h-1.5 rounded"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Variation Swapper */}
                        {(setType === "extended" || setType === "premium" || setType === "legacy") && allVariations.length > 1 && (
                          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
                            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                              🎁 Select Encore Variation:
                            </span>
                            <div className="space-y-2">
                              {allVariations.map((song, vIdx) => (
                                <button
                                  key={vIdx}
                                  type="button"
                                  onClick={() => setActiveVariationIdx(vIdx)}
                                  className={`w-full flex justify-between items-center px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all border cursor-pointer ${
                                    activeVariationIdx === vIdx
                                      ? "bg-teal-50 border-teal-600 text-teal-950"
                                      : "bg-stone-50 border-stone-200 text-slate-600 hover:border-teal-300"
                                  }`}
                                >
                                  <span>Variation {vIdx + 1}: {song.genre}</span>
                                  <span className="text-slate-500">{song.tempo.split(" ")[0]}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Gift Song Card */}
                        <GiftSongCard
                          songId={currentSong.id}
                          audioUrl={audioSource || audioUrl}
                          directAudioUrl={getCanonicalSongLinks(currentSong.id).audioLink}
                          shareableSongUrl={getCanonicalSongLinks(currentSong.id).songLink}
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
                          userWords={currentSong.context || context}
                          recipientName={currentSong.target}
                          artistPersona={currentSong.artistPersona || artistPersona}
                          onUpdateLyrics={handleUpdateSongLyrics}
                        />

                        {/* Strict 1-Time Redo Policy Controls */}
                        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2 text-center shadow-xs">
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            {!oneTimeRedoUsed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (freeSongsUsedHistory.length > 0) {
                                    handleRefundSongSlot(freeSongsUsedHistory.length - 1);
                                  } else {
                                    setOneTimeRedoUsed(true);
                                    localStorage.setItem("mygiftsong_one_time_redo_used_v1", "true");
                                    setFreeSongsRemaining((prev) => {
                                      const next = Math.min(5, prev + 1);
                                      localStorage.setItem("mygiftsong_free_remaining", String(next));
                                      return next;
                                    });
                                  }
                                  luteEngineInstance.stopLutePlayback();
                                  if (audioRef.current) audioRef.current.pause();
                                  setIsAudioPlaying(false);
                                  setIsPlaying(false);
                                  setStage(1);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold cursor-pointer transition-all"
                              >
                                <RotateCcw size={13} />
                                <span>Song Not Good? Use Your 1-Time Redo (1 of 1 Left)</span>
                              </button>
                            ) : (
                              <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 text-slate-600 border border-stone-200 text-xs font-medium">
                                <Check size={13} className="text-teal-700" />
                                <span>1-Time Redo Used — This Song Is Kept ({freeSongsRemaining}/5 Free Left)</span>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleReset}
                              className="inline-flex items-center justify-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
                            >
                              Create Another Song <ChevronRight size={13} />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                            {!oneTimeRedoUsed
                              ? "You get an option to redo ONE song. Once you use that option, whatever song is generated is the one you keep for the other 4 songs."
                              : "You have already used your 1-time song redo option. Whatever song is generated is the one you keep for the remaining 4 songs."}
                          </p>
                        </div>
                      </div>

                      {/* Right side: The Clean White & Teal Lyric Sheet */}
                      <div className="lg:col-span-7">
                        <LyricCanvas
                          lyricSections={currentSong.lyricSections}
                          originalLyricSections={originalLyricSections}
                          currentTimeSeconds={currentTime}
                          onLineClick={(stamp) => handleSeek(stamp)}
                          currentLanguage={currentSong.language || songLanguage}
                          isTranslating={isTranslatingSong}
                          onSelectLanguage={(lang) => handleTranslateCurrentSong(lang, false)}
                          onReSingInLanguage={(lang) => handleTranslateCurrentSong(lang, true)}
                          onUpdateLyrics={handleUpdateSongLyrics}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white text-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden relative"
          >
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Print Card
              </button>
              <button
                type="button"
                onClick={() => setShowKeepsake(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 md:p-10 space-y-6 pt-12 text-center">
              <div className="space-y-1">
                <p className="text-[10px] font-mono tracking-widest text-teal-700 uppercase font-bold">
                  A Custom Acoustic Gift Song
                </p>
                <h3 className="text-2xl font-display font-bold text-slate-900">{currentSong.title}</h3>
                <div className="w-16 h-0.5 bg-teal-600/30 mx-auto my-3"></div>
                <p className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-500">
                  Dedicated to {currentSong.target}
                </p>
              </div>

              {/* Direct Link to Song Audio & Song Page inside Printable Keepsake Gift Card */}
              <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-left space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-wider text-teal-900 font-bold">
                  🔊 Listen to Your Custom Song Audio:
                </p>
                <div className="space-y-1 text-xs">
                  <p className="font-mono text-[11px] text-teal-800 break-all">
                    <strong>Audio Link:</strong>{" "}
                    <a
                      href={getCanonicalSongLinks(currentSong.id).audioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-teal-950"
                    >
                      {getCanonicalSongLinks(currentSong.id).audioLink}
                    </a>
                  </p>
                  <p className="font-mono text-[11px] text-teal-800 break-all">
                    <strong>Song Page:</strong>{" "}
                    <a
                      href={getCanonicalSongLinks(currentSong.id).songLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-teal-950"
                    >
                      {getCanonicalSongLinks(currentSong.id).songLink}
                    </a>
                  </p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl p-5 bg-stone-50/70 max-h-[210px] overflow-y-auto text-left space-y-4">
                {currentSong.lyricSections.filter(s => s.sectionName !== "Intro").map((section, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <p className="font-mono text-[10px] text-teal-700 font-bold uppercase">{section.sectionName}</p>
                    {section.lines.map((line, lIdx) => (
                      <p key={lIdx} className="font-sans text-slate-700 leading-relaxed">{line}</p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-stone-200 text-[10px] font-mono text-slate-400">
                <span>AI ASSISTED SONG GENERATOR</span>
                <span className="uppercase">www.mygiftsong.org • {currentSong.genre}</span>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyLyrics}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLyrics ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLyrics ? "Copied Lyrics + Audio Link!" : "Copy Lyrics + Audio Link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getCanonicalSongLinks(currentSong.id).audioLink);
                    setCopiedAudioLinkModal(true);
                    setTimeout(() => setCopiedAudioLinkModal(false), 2000);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedAudioLinkModal ? <Check size={14} /> : <Copy size={14} />}
                  {copiedAudioLinkModal ? "Copied Audio Link!" : "Copy Direct Audio Link"}
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
              © 2026 mygiftsong.org • AI Assisted Song Generator | All Rights Reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 my-2 text-xs font-medium text-slate-500">
              <button
                type="button"
                onClick={() => setActiveSystemTab("free-songs")}
                className="hover:text-teal-700 transition-colors cursor-pointer"
              >
                First 5 Songs Free
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveSystemTab("lifetime")}
                className="hover:text-teal-700 transition-colors cursor-pointer"
              >
                Invite 10 = Lifetime License
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setActiveSystemTab("affiliate")}
                className="hover:text-teal-700 transition-colors cursor-pointer"
              >
                Affiliate Partner Hub
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

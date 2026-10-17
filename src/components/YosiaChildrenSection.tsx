import React, { useState, useRef } from "react";
import {
  Music,
  Sparkles,
  Play,
  Pause,
  Globe,
  Heart,
  Smile,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Gift,
  Video,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Send,
} from "lucide-react";
import { SongData, SetType } from "../types";
import { GiftSongCard } from "./GiftSongCard";
import {
  safeParseJson,
  buildClientFallbackSong,
  synthesizeClientAcousticSongWavDataUrl,
} from "../utils/clientSongGenerator";

export const DEFAULT_YOSIA_DRIVE_FILE_ID = "1N7lspWodacNk-VICZyxKYdVvFCeQMu9Y";
export const DEFAULT_YOSIA_DRIVE_VIEW_URL =
  "https://drive.google.com/file/d/1N7lspWodacNk-VICZyxKYdVvFCeQMu9Y/view?usp=drivesdk";

function extractGoogleDriveFileId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const matchSlashD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchSlashD?.[1]) return matchSlashD[1];
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam?.[1]) return matchIdParam[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export const SUPPORTED_SONG_LANGUAGES = [
  { code: "Bahasa Indonesia", label: "🇮🇩 Bahasa Indonesia", short: "🇮🇩 Indonesia" },
  { code: "English", label: "🇺🇸 English", short: "🇺🇸 English" },
  {
    code: "Bilingual (English & Bahasa Indonesia)",
    label: "🇮🇩+🇺🇸 Bilingual (Indonesia & English)",
    short: "🇮🇩+🇺🇸 Bilingual"
  },
  { code: "Bahasa Melayu", label: "🇲🇾 Bahasa Melayu", short: "🇲🇾 Melayu" },
  { code: "Spanish (Español)", label: "🇪🇸 Español (Spanish)", short: "🇪🇸 Español" },
  { code: "Tagalog (Filipino)", label: "🇵🇭 Tagalog (Filipino)", short: "🇵🇭 Tagalog" },
  { code: "Mandarin Chinese (中文)", label: "🇨🇳 中文 (Mandarin)", short: "🇨🇳 中文" },
  { code: "Korean (한국어)", label: "🇰🇷 한국어 (Korean)", short: "🇰🇷 한국어" },
  { code: "Japanese (日本語)", label: "🇯🇵 日本語 (Japanese)", short: "🇯🇵 日本語" },
  { code: "French (Français)", label: "🇫🇷 Français (French)", short: "🇫🇷 Français" },
];

/**
 * Photorealistic Studio Portrait of Yosia (Haddi's little brother)
 * Uses Yosia's real studio footage from `/video/yosia-children.mp4?v=2`
 * (or Google Drive cloud thumbnail fallback / user-uploaded photo) — NO cartoon SVG avatars!
 */
export const YosiaStudioArtwork: React.FC<{
  scene: "standing" | "fireside";
  customImageUrl?: string | null;
  className?: string;
}> = ({ scene, customImageUrl, className = "" }) => {
  const [useDriveThumb, setUseDriveThumb] = useState(false);

  if (customImageUrl) {
    return (
      <img
        src={customImageUrl}
        alt={
          scene === "standing"
            ? "Yosia — Haddi's Little Brother Holding Guitar in Studio"
            : "Yosia Strumming Acoustic Guitar by the Fireplace"
        }
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-950 ${className}`}>
      {!useDriveThumb ? (
        <video
          src={
            scene === "standing"
              ? "/video/yosia-children.mp4?v=2#t=0.8"
              : "/video/yosia-children.mp4?v=2#t=5.2"
          }
          muted
          playsInline
          preload="metadata"
          onLoadedData={(e) => {
            try {
              e.currentTarget.currentTime = scene === "standing" ? 0.8 : 5.2;
            } catch {
              // ignore seek restriction
            }
          }}
          onError={() => setUseDriveThumb(true)}
          className={`w-full h-full object-cover ${
            scene === "fireside" ? "scale-110 object-center" : "object-center"
          }`}
        />
      ) : (
        <img
          src={`https://drive.google.com/thumbnail?id=${DEFAULT_YOSIA_DRIVE_FILE_ID}&sz=w1000`}
          alt="Yosia — Haddi's Little Brother Playing Guitar"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover ${
            scene === "fireside" ? "scale-110 object-center" : "object-center"
          }`}
        />
      )}
      <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/75 border border-amber-300/40 text-amber-200 text-[11px] font-mono font-bold shadow-sm">
        {scene === "standing"
          ? "👦🎸 Yosia — Haddi's Little Brother"
          : "🔥🎶 Yosia Strumming by the Fireplace"}
      </div>
    </div>
  );
};

interface YosiaChildrenSectionProps {
  variant?: "light" | "dark";
  freeSongsRemaining: number;
  onBackToMainPage?: () => void;
  onGenerateYosiaSong: (params: {
    target: string;
    context: string;
    genre: string;
    language: string;
    setType?: SetType;
    artistPersona: "yosia";
    autoGenerate: boolean;
    preloadedSong?: SongData;
  }) => void;
}

export const YosiaChildrenSection: React.FC<YosiaChildrenSectionProps> = ({
  freeSongsRemaining,
  onBackToMainPage,
  onGenerateYosiaSong,
}) => {
  // Video player state for Yosia's Google Drive featured video
  const yosiaVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isYosiaVideoPlaying, setIsYosiaVideoPlaying] = useState(false);
  const [isYosiaVideoMuted, setIsYosiaVideoMuted] = useState(false);
  const [videoPlaybackMode, setVideoPlaybackMode] = useState<"native" | "gdrive">("native");
  const [customDriveUrlInput, setCustomDriveUrlInput] = useState("");
  const [activeDriveFileId, setActiveDriveFileId] = useState<string>(() => {
    try {
      return localStorage.getItem("mygiftsong_yosia_drive_id") || DEFAULT_YOSIA_DRIVE_FILE_ID;
    } catch {
      return DEFAULT_YOSIA_DRIVE_FILE_ID;
    }
  });
  const [showDriveLinkEditor, setShowDriveLinkEditor] = useState(false);
  const [showAnimationGuide, setShowAnimationGuide] = useState(false);

  const handleToggleYosiaVideo = () => {
    const vid = yosiaVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const handleToggleYosiaMute = () => {
    const vid = yosiaVideoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsYosiaVideoMuted(vid.muted);
  };

  const handleRestartYosiaVideo = () => {
    const vid = yosiaVideoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    vid.play().catch(() => {});
  };

  const handleApplyDriveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = extractGoogleDriveFileId(customDriveUrlInput);
    if (extractedId) {
      setActiveDriveFileId(extractedId);
      setVideoPlaybackMode("gdrive");
      try {
        localStorage.setItem("mygiftsong_yosia_drive_id", extractedId);
      } catch {
        // ignore storage errors
      }
      setCustomDriveUrlInput("");
      setShowDriveLinkEditor(false);
    }
  };

  // Persisted custom Yosia photos if the user uploads their screenshots
  const [yosiaPhoto1, setYosiaPhoto1] = useState<string | null>(() => {
    try {
      return localStorage.getItem("mygiftsong_yosia_photo_1");
    } catch {
      return null;
    }
  });
  const [yosiaPhoto2, setYosiaPhoto2] = useState<string | null>(() => {
    try {
      return localStorage.getItem("mygiftsong_yosia_photo_2");
    } catch {
      return null;
    }
  });

  // Yosia Custom Children's Song Builder state
  const [childName, setChildName] = useState("");
  const [childOccasion, setChildOccasion] = useState("");
  const [childWords, setChildWords] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedChildGenre, setSelectedChildGenre] = useState("Children's Joyful Acoustic Sing-Along");
  const [selectedSetType, setSelectedSetType] = useState<SetType>("full");

  // In-Page Yosia Song Studio & Player State (stays right on Yosia's page!)
  const [isCreatingYosiaSong, setIsCreatingYosiaSong] = useState(false);
  const [yosiaCreatedSong, setYosiaCreatedSong] = useState<SongData | null>(null);
  const [yosiaCreatedAudioUrl, setYosiaCreatedAudioUrl] = useState<string | null>(null);
  const [yosiaEditableLyrics, setYosiaEditableLyrics] = useState("");
  const [isEditingYosiaLyrics, setIsEditingYosiaLyrics] = useState(false);
  const [isSpeakingYosiaVoice, setIsSpeakingYosiaVoice] = useState(false);
  const yosiaAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const yosiaResultCardRef = useRef<HTMLDivElement | null>(null);

  const buildYosiaParams = (autoGenerate: boolean) => {
    const targetVal = childName.trim() || "Our Special Child";
    const contextVal = [
      childOccasion.trim()
        ? `Occasion: ${childOccasion.trim()}.`
        : "Occasion: Joyful Children's & Family Blessing.",
      childWords.trim()
        ? `Desired Words & Lyrics: ${childWords.trim()}`
        : "Make it cheerful, warm, and full of smiles with Yosia's acoustic guitar!",
    ].join(" ");
    return {
      target: targetVal,
      context: contextVal,
      genre: selectedChildGenre,
      language: selectedLanguage,
      setType: selectedSetType,
      artistPersona: "yosia" as const,
      autoGenerate,
      preloadedSong: yosiaCreatedSong || undefined,
    };
  };

  const handleCreateInPageYosiaSong = async () => {
    const params = buildYosiaParams(true);
    setIsCreatingYosiaSong(true);

    try {
      let generatedSong: SongData | null = null;

      // 1. Try server /api/generate-song first, fall back cleanly on Vercel static hosting
      try {
        const res = await fetch("/api/generate-song", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: params.target,
            context: params.context,
            setType: params.setType,
            customGenre: params.genre,
            language: params.language,
            artistPersona: "yosia",
          }),
        });
        const data = await safeParseJson(res);
        if (data?.success && data?.song) {
          generatedSong = data.song;
        }
      } catch {
        // Fallback below
      }

      if (!generatedSong) {
        const fallback = buildClientFallbackSong({
          target: params.target,
          context: params.context,
          setType: params.setType,
          customGenre: params.genre,
          language: params.language,
          artistPersona: "yosia",
        });
        generatedSong = fallback.song;
      }

      const compiledLyrics =
        generatedSong.lyricSections
          ?.filter((s) => s.sectionName !== "Intro")
          .flatMap((s) => s.lines)
          .join("\n") || params.context;

      setYosiaCreatedSong(generatedSong);
      setYosiaEditableLyrics(compiledLyrics);

      // 2. Try server /api/generate-haddi-audio first, fall back to client acoustic WAV synthesis on Vercel
      let finalAudioUrl: string | null = null;
      try {
        const audioRes = await fetch("/api/generate-haddi-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: params.context,
            mode: "lyria",
            target: params.target,
            customGenre: params.genre,
            setType: params.setType,
            lyrics: compiledLyrics,
            language: params.language,
            artistPersona: "yosia",
            shareId: generatedSong.id,
          }),
        });
        const audioData = await safeParseJson(audioRes);
        if (audioData?.audioUrl || audioData?.lyriaAudioUrl) {
          finalAudioUrl = audioData.lyriaAudioUrl || audioData.audioUrl;
        }
      } catch {
        // Fallback below
      }

      if (!finalAudioUrl) {
        finalAudioUrl = synthesizeClientAcousticSongWavDataUrl({
          durationSeconds: params.setType === "quick" ? 24 : 32,
          artistPersona: "yosia",
        });
      }

      setYosiaCreatedAudioUrl(finalAudioUrl);
      try {
        localStorage.setItem(
          `mygiftsong_saved_song_${generatedSong.id}`,
          JSON.stringify({
            song: generatedSong,
            directAudioUrl: `/api/songs/${encodeURIComponent(generatedSong.id)}/audio`,
            lyriaAudioUrl: finalAudioUrl && !finalAudioUrl.startsWith("data:") ? finalAudioUrl : `/api/songs/${encodeURIComponent(generatedSong.id)}/audio`,
          })
        );
      } catch {
        // ignore storage quota errors
      }

      setTimeout(() => {
        yosiaResultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (yosiaAudioPlayerRef.current) {
          yosiaAudioPlayerRef.current.play().catch(() => {});
        }
      }, 150);
    } finally {
      setIsCreatingYosiaSong(false);
    }
  };

  const handleSpeakYosiaLyricsWithGuitar = () => {
    if (!("speechSynthesis" in window) || !yosiaCreatedSong) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingYosiaVoice(false);
      return;
    }
    if (yosiaAudioPlayerRef.current && yosiaAudioPlayerRef.current.paused) {
      yosiaAudioPlayerRef.current.volume = 0.35;
      yosiaAudioPlayerRef.current.currentTime = 0;
      yosiaAudioPlayerRef.current.play().catch(() => {});
    }
    const utter = new SpeechSynthesisUtterance(
      `Hi ${yosiaCreatedSong.target}! I'm Yosia! ${yosiaEditableLyrics.replace(/\n+/g, ". ")}`
    );
    utter.pitch = 1.25;
    utter.rate = 0.96;
    utter.onstart = () => setIsSpeakingYosiaVoice(true);
    utter.onend = () => {
      setIsSpeakingYosiaVoice(false);
      if (yosiaAudioPlayerRef.current) yosiaAudioPlayerRef.current.volume = 1.0;
    };
    utter.onerror = () => setIsSpeakingYosiaVoice(false);
    window.speechSynthesis.speak(utter);
  };

  const handlePhotoUpload = (slot: 1 | 2, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      if (slot === 1) {
        setYosiaPhoto1(dataUrl);
        try {
          localStorage.setItem("mygiftsong_yosia_photo_1", dataUrl);
        } catch {
          // ignore storage quota errors
        }
      } else {
        setYosiaPhoto2(dataUrl);
        try {
          localStorage.setItem("mygiftsong_yosia_photo_2", dataUrl);
        } catch {
          // ignore storage quota errors
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-8 shadow-sm text-slate-900">
      {/* TOP NAVIGATION BAR FOR CHILDREN'S PAGE */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-stone-200">
        <div className="flex flex-wrap items-center gap-2.5">
          {onBackToMainPage && (
            <button
              type="button"
              onClick={onBackToMainPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-200 transition-all cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Haddi&apos;s Main Page</span>
            </button>
          )}
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
            👦🎸 Dedicated Children&apos;s Song Page
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const text = encodeURIComponent(
                `🎁🎵 Check out this awesome Gift Song App — www.mygiftsong.org!\n\n` +
                  `You can create personalized acoustic gift songs and children's songs (with Haddi & his little brother Yosia) in 60 seconds — and your first 5 custom songs are 100% FREE!\n\n` +
                  `👉 Try it now at:\nhttps://www.mygiftsong.org 🌟`
              );
              window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
            }}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <span>💬 Share App on WhatsApp</span>
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl border bg-teal-50 border-teal-200 text-teal-800 flex items-center gap-1.5">
            <Smile size={15} className="text-teal-600" />
            Making Children Happy
          </span>
          <button
            type="button"
            onClick={() => onGenerateYosiaSong(buildYosiaParams(false))}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Music size={14} />
            <span>Jump Into Full Studio</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* SECTION 1 (ABOVE): CREATE A CUSTOM CHILDREN'S OR MULTILINGUAL SONG WITH YOSIA */}
      <div className="rounded-2xl border border-stone-200 bg-[#F8FAF9] p-5 sm:p-6 space-y-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
              🎸 Create a Custom Children&apos;s Song with Yosia
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Pick a quick starter below or enter your 3 steps and choose your song language
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg">
            <Gift size={13} className="inline mr-1" />
            {freeSongsRemaining} of 5 Free Songs Available
          </span>
        </div>

        {/* 1-Click Starter Templates */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            Quick starters:
          </span>
          <button
            type="button"
            onClick={() => {
              setChildName("Little Toby");
              setChildOccasion("Happy 6th Birthday Sing-Along");
              setChildWords("Loves dinosaurs, playing guitar like Yosia, big hugs, and making everyone laugh!");
              setSelectedLanguage("English");
            }}
            className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-teal-50 text-slate-700 border-stone-200 transition-colors cursor-pointer"
          >
            🎂 Kids Birthday Song
          </button>
          <button
            type="button"
            onClick={() => {
              setChildName("Adik Maya");
              setChildOccasion("Lagu Pengantar Tidur & Berkat Malam (Bedtime Lullaby)");
              setChildWords("Tidur nyenyak bintang kecil, Tuhan menjaga mimpimu dengan penuh kasih dan damai.");
              setSelectedLanguage("Bahasa Indonesia");
            }}
            className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-teal-50 text-slate-700 border-stone-200 transition-colors cursor-pointer"
          >
            🌙 Bedtime Lullaby (Bahasa Indonesia)
          </button>
          <button
            type="button"
            onClick={() => {
              setChildName("Sunday School Kids");
              setChildOccasion("Joyful Morning Praise & Worship Song");
              setChildWords("Clap your hands, share your smile, praise the Lord, and shine God's love today!");
              setSelectedChildGenre("Modern Worship");
              setSelectedLanguage("Bilingual (English & Bahasa Indonesia)");
            }}
            className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-teal-50 text-slate-700 border-stone-200 transition-colors cursor-pointer"
          >
            🙏 Kids Worship &amp; Praise Song
          </button>
        </div>

        {/* 3-Step Form + Language Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-teal-800 block">
              Step 1: Child&apos;s Name
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g., Toby, Maya, Noah..."
              className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border bg-white border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-teal-800 block">
              Step 2: Occasion
            </label>
            <input
              type="text"
              value={childOccasion}
              onChange={(e) => setChildOccasion(e.target.value)}
              placeholder="e.g., Birthday, Worship, Bedtime..."
              className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border bg-white border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-teal-800 block">
              Step 3: Words &amp; Lyrics
            </label>
            <input
              type="text"
              value={childWords}
              onChange={(e) => setChildWords(e.target.value)}
              placeholder="Exact words, hobbies, birthday wish..."
              className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border bg-white border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-teal-800 block">
              🌐 Song Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-xs sm:text-sm border font-medium bg-white border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
            >
              {SUPPORTED_SONG_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Musical Style (Worship, Sing-Along, Birthday, Lullaby) & Song Length ($1.99 Longer Song vs Quick) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-stone-200/80">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-teal-800 block">
              🎶 Musical Style (Choose Worship, Sing-Along, or Birthday):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "Modern Worship", label: "🙏 Worship & Praise" },
                { id: "Children's Joyful Acoustic Sing-Along", label: "🎸 Joyful Sing-Along" },
                { id: "Birthday Acoustic Celebration", label: "🎂 Birthday Song" },
                { id: "Acoustic Bedtime Lullaby", label: "🌙 Bedtime Lullaby" },
                { id: "Acoustic Folk", label: "☀️ Acoustic Folk" },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedChildGenre(style.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedChildGenre === style.id
                      ? "bg-teal-700 text-white border-teal-700 shadow-2xs"
                      : "bg-white text-slate-700 border-stone-200 hover:border-teal-300"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-teal-800 block">
              ⏱️ Song Length &amp; Package (60s or Longer 2-Min $1.99 Packet):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {[
                { id: "quick" as SetType, title: "Quick (60s)", sub: "1-Min Song" },
                { id: "full" as SetType, title: "Longer Song ($1.99)", sub: "2-Min Full Multi-Verse" },
                { id: "premium" as SetType, title: "Premium ($4.99)", sub: "2-Min + 3 Variations" },
              ].map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedSetType(pkg.id)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedSetType === pkg.id
                      ? "bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-500/15"
                      : "bg-white border-stone-200 text-slate-700 hover:border-teal-300"
                  }`}
                >
                  <div className="text-xs font-bold">{pkg.title}</div>
                  <div className="text-[10px] text-slate-500">{pkg.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notice: Please Check Lyrics Before Creating a Song */}
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 font-medium flex items-center gap-2">
          <span className="text-amber-700 font-bold shrink-0">⚠️ NOTICE:</span>
          <span>
            <strong>PLEASE CHECK LYRICS BEFORE CREATING A SONG.</strong> (You can also edit the lyrics after your song is created!)
          </span>
        </div>

        {/* Action Buttons: Create & Play Right Here on Yosia's Page OR Open Full Studio */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => onGenerateYosiaSong(buildYosiaParams(true))}
            className="px-4 py-3 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-display font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <Music size={15} className="text-teal-700" />
            <span>Open in Full Multi-Stage Studio</span>
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            disabled={isCreatingYosiaSong}
            onClick={handleCreateInPageYosiaSong}
            className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-display font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles size={16} />
            <span>
              {isCreatingYosiaSong
                ? `Yosia Is Strumming & Creating ${childName.trim() || "Your Child"}'s Song...`
                : `🎸 Create & Play ${childName.trim() ? `${childName.trim()}'s` : "Children's"} ${
                    selectedSetType === "full" ? "2-Min Full" : selectedSetType === "premium" ? "Premium" : "60s"
                  } Song Now`}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* =====================================================================
            IN-PAGE YOSIA CUSTOM SONG PLAYER & KEEPSAKE CARD
            Appears right here on Yosia's Children's Page when a song is created!
        ===================================================================== */}
        {yosiaCreatedSong && (
          <div
            ref={yosiaResultCardRef}
            className="mt-6 rounded-2xl border-2 border-teal-500 bg-white p-5 sm:p-6 space-y-5 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[11px] font-bold uppercase tracking-wider">
                  👦🎸 Yosia&apos;s Custom Children&apos;s Song Ready!
                </span>
                <h3 className="text-lg sm:text-xl font-display font-bold text-slate-900 mt-1">
                  {yosiaCreatedSong.title}
                </h3>
                <p className="text-xs text-slate-600">
                  Dedicated to <strong>{yosiaCreatedSong.target}</strong> • {yosiaCreatedSong.genre} •{" "}
                  {yosiaCreatedSong.language}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {yosiaCreatedAudioUrl && (
                  <a
                    href={yosiaCreatedAudioUrl}
                    download={`${yosiaCreatedSong.title.replace(/\s+/g, "-")}.wav`}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download size={14} />
                    <span>Download Song Audio</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleSpeakYosiaLyricsWithGuitar}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Volume2 size={14} />
                  <span>{isSpeakingYosiaVoice ? "Stop Yosia Voice" : "Hear Yosia Sing/Speak Lyrics"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const msg = encodeURIComponent(
                      `👦🎸 Yosia created a custom song "${yosiaCreatedSong.title}" for ${yosiaCreatedSong.target} on www.mygiftsong.org!\n\n` +
                        `${yosiaEditableLyrics}\n\n` +
                        `👉 Create your free custom song at https://www.mygiftsong.org 🌟`
                    );
                    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Audio Player Bar */}
            {yosiaCreatedAudioUrl && (
              <div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                  <span>🎵 {yosiaCreatedSong.title} — Studio Acoustic Track</span>
                  <span className="text-[11px] font-mono text-teal-700">Ready to Play &amp; Download</span>
                </div>
                <audio
                  ref={yosiaAudioPlayerRef}
                  src={yosiaCreatedAudioUrl}
                  controls
                  className="w-full h-10"
                />
              </div>
            )}

            {/* Personalized Lyrics + Edit Lyrics Toggle */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  📜 Personalized Song Lyrics for {yosiaCreatedSong.target}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingYosiaLyrics((prev) => !prev)}
                  className="px-3 py-1 rounded-lg bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 text-xs font-semibold cursor-pointer"
                >
                  {isEditingYosiaLyrics ? "✓ Save Lyrics" : "✏️ Edit Lyrics"}
                </button>
              </div>

              {isEditingYosiaLyrics ? (
                <textarea
                  value={yosiaEditableLyrics}
                  onChange={(e) => setYosiaEditableLyrics(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl p-3 text-xs sm:text-sm bg-white border border-teal-400 text-slate-900 focus:outline-none"
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {yosiaEditableLyrics}
                </pre>
              )}
            </div>

            {/* Yosia's 10-Second Personal Birthday Greeting Video & Printable QR Gift Card */}
            <div className="pt-2">
              <GiftSongCard
                songId={yosiaCreatedSong.id}
                audioUrl={yosiaCreatedAudioUrl}
                lyriaAudioUrl={yosiaCreatedAudioUrl}
                recipientName={yosiaCreatedSong.target}
                songTitle={yosiaCreatedSong.title}
                userWords={childWords || yosiaCreatedSong.context}
                lyrics={yosiaEditableLyrics}
                artistPersona="yosia"
              />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2 (BELOW): MEET YOSIA — HADDI'S LITTLE BROTHER, VIDEO SHOWCASE & STUDIO IMAGES */}
      <div className="pt-4 border-t border-stone-200 space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900">
            Meet <span className="text-teal-700">Yosia</span> — Haddi&apos;s Little Brother
          </h2>
          <p className="text-xs sm:text-sm max-w-2xl leading-relaxed text-slate-600">
            Welcome to our dedicated Children&apos;s Song Page! Yosia plays acoustic guitar just like his big brother Haddi, and he loves helping make children and families happy. Create joyful children&apos;s songs in <strong className="text-teal-800">English</strong>, <strong className="text-teal-800">Bahasa Indonesia</strong>, or 10+ languages.
          </p>
        </div>

        {/* FEATURED YOSIA ANIMATED CHILDREN'S VIDEO SHOWCASE (FROM GOOGLE DRIVE) */}
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-stone-50 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Video size={18} className="text-teal-600" />
                  <span>Yosia&apos;s Animated Children&apos;s Song Showcase</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Watch Yosia perform on acoustic guitar • Connected to Google Drive Video
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Switch between Direct Instant MP4 & Google Drive Player */}
              <div className="inline-flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => setVideoPlaybackMode("native")}
                  className={`py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    videoPlaybackMode === "native"
                      ? "bg-white text-teal-800 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Studio HD Player
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (yosiaVideoRef.current) yosiaVideoRef.current.pause();
                    setVideoPlaybackMode("gdrive");
                  }}
                  className={`py-1 px-2.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    videoPlaybackMode === "gdrive"
                      ? "bg-white text-teal-800 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Google Drive Player
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDriveLinkEditor(!showDriveLinkEditor)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-50 text-teal-800 border border-stone-200 transition-colors cursor-pointer"
              >
                {showDriveLinkEditor ? "Close Link Input" : "Update Drive Link"}
              </button>

              <a
                href={`https://drive.google.com/file/d/${activeDriveFileId}/view?usp=drivesdk`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-teal-50 text-slate-700 border border-stone-200 flex items-center gap-1 transition-colors"
                title="Open video in Google Drive"
              >
                <span>Drive</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Optional Google Drive Link Updater */}
          {showDriveLinkEditor && (
            <form
              onSubmit={handleApplyDriveUrl}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-3 rounded-xl border border-teal-200"
            >
              <input
                type="text"
                value={customDriveUrlInput}
                onChange={(e) => setCustomDriveUrlInput(e.target.value)}
                placeholder="Paste Google Drive video link (e.g., https://drive.google.com/file/d/.../view)"
                className="flex-1 rounded-lg px-3 py-2 text-xs border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Load Drive Video
                </button>
                {activeDriveFileId !== DEFAULT_YOSIA_DRIVE_FILE_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDriveFileId(DEFAULT_YOSIA_DRIVE_FILE_ID);
                      setVideoPlaybackMode("native");
                      localStorage.removeItem("mygiftsong_yosia_drive_id");
                    }}
                    className="px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    Reset Default
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Video Frame */}
          <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-slate-950 aspect-video max-w-3xl mx-auto shadow-md">
            {videoPlaybackMode === "native" && activeDriveFileId === DEFAULT_YOSIA_DRIVE_FILE_ID ? (
              <>
                <video
                  ref={yosiaVideoRef}
                  src="/video/yosia-children.mp4?v=2"
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoPlaybackMode("gdrive")}
                  onPlay={() => setIsYosiaVideoPlaying(true)}
                  onPause={() => setIsYosiaVideoPlaying(false)}
                  onEnded={() => setIsYosiaVideoPlaying(false)}
                  className="w-full h-full object-contain bg-slate-950"
                />
                {!isYosiaVideoPlaying && (
                  <button
                    type="button"
                    onClick={handleToggleYosiaVideo}
                    className="absolute inset-0 bg-slate-950/30 hover:bg-slate-950/20 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer"
                    title="Watch Yosia's Children's Song Video"
                  >
                    <div className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                      <Play size={28} fill="currentColor" className="ml-1" />
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-white/95 text-teal-900 text-xs font-bold shadow-sm">
                      ▶ Watch Yosia&apos;s Children&apos;s Song Video
                    </span>
                  </button>
                )}
              </>
            ) : (
              <iframe
                src={`https://drive.google.com/file/d/${activeDriveFileId}/preview`}
                title="Yosia Animated Children's Song Video"
                allow="autoplay; fullscreen"
                className="w-full h-full border-0"
              />
            )}
          </div>

          {/* Controls & Animated Video Production Guide Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-3xl mx-auto pt-1">
            <div className="flex items-center gap-2">
              {videoPlaybackMode === "native" && activeDriveFileId === DEFAULT_YOSIA_DRIVE_FILE_ID && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleYosiaVideo}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isYosiaVideoPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                    <span>{isYosiaVideoPlaying ? "Pause Video" : "Play Video"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleYosiaMute}
                    className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-slate-700 border border-stone-200 transition-colors cursor-pointer"
                    title={isYosiaVideoMuted ? "Unmute Video" : "Mute Video"}
                  >
                    {isYosiaVideoMuted ? <VolumeX size={15} className="text-red-500" /> : <Volume2 size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleRestartYosiaVideo}
                    className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-slate-700 border border-stone-200 transition-colors cursor-pointer"
                    title="Restart Video"
                  >
                    <RotateCcw size={15} />
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAnimationGuide(!showAnimationGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
            >
              <HelpCircle size={14} className="text-amber-600" />
              <span>How to Create Realistic Animated Children&apos;s Videos</span>
              {showAnimationGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Collapsible Studio Guide: How to Create Realistic Animated Children's Videos */}
          {showAnimationGuide && (
            <div className="max-w-3xl mx-auto mt-3 rounded-xl border border-amber-200 bg-white p-4 sm:p-5 space-y-3 text-xs text-slate-700 shadow-2xs">
              <h4 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles size={15} className="text-teal-600" />
                <span>3-Step Studio Recipe for Realistic 3D Animated Children&apos;s Videos (Like Yosia!)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                  <div className="font-bold text-teal-800">1. Consistent 3D Character Image</div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Start with one high-resolution 3D Pixar-style character image of Yosia (using <strong>Google Gemini Imagen / Nano Banana</strong>, Midjourney, or Leonardo AI). Keep the same reference image so his face, woven cap, and yellow hoodie stay 100% consistent.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                  <div className="font-bold text-teal-800">2. Generate the Song Audio</div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Create your complete song here on <strong>mygiftsong.org</strong> and click <strong>Download Song</strong> to save the audio track, or trim a 15–60 second chorus clip for your video scene.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                  <div className="font-bold text-teal-800">3. Animate Singing &amp; Guitar Motion</div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    • <strong>For Lip-Sync Singing:</strong> Upload Yosia&apos;s image + song audio to <strong>Hedra (Character-3)</strong>, <strong>Kling AI Lip-Sync</strong>, <strong>HeyGen Avatar IV</strong>, or <strong>Runway Act-One</strong>.<br />
                    • <strong>For 3D Guitar Action Scenes:</strong> Use <strong>Google Veo 3.1</strong> or <strong>Kling AI Image-to-Video</strong> with Yosia&apos;s photo as the starting frame!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* YOSIA'S TWO STUDIO SHOWCASE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Yosia Standing with Guitar in Studio */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden flex flex-col justify-between shadow-2xs">
            <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden">
              <YosiaStudioArtwork scene="standing" customImageUrl={yosiaPhoto1} />
              <div className="absolute top-3 right-3 flex gap-1.5">
                <label
                  className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-teal-900 text-[10px] font-semibold uppercase tracking-wider border border-stone-200 flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                  title="Upload your exact Yosia photo from your device"
                >
                  <Upload size={11} />
                  <span>{yosiaPhoto1 ? "Change Photo 1" : "Use Your Photo 1"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(1, e)}
                    className="hidden"
                  />
                </label>
                {yosiaPhoto1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setYosiaPhoto1(null);
                      localStorage.removeItem("mygiftsong_yosia_photo_1");
                    }}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-red-600 border border-stone-200 cursor-pointer"
                    title="Reset to studio illustration"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-teal-700 font-medium">
                <span>Yosia • Little Minstrel Guitarist</span>
                <span>·</span>
                <span>Jakarta Studio</span>
              </div>
              <h3 className="font-display text-base font-bold text-slate-900">
                &ldquo;Hi! I&apos;m Yosia, Haddi&apos;s Little Brother!&rdquo;
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Wearing his colorful woven cap, golden hoodie, and yellow socks, Yosia strums cheerful guitar chords to put a big smile on every child&apos;s and friend&apos;s face.
              </p>
            </div>
          </div>

          {/* Card 2: Yosia Sitting in Wooden Armchair by Fireplace Playing Guitar */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden flex flex-col justify-between shadow-2xs">
            <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden">
              <YosiaStudioArtwork scene="fireside" customImageUrl={yosiaPhoto2} />
              <div className="absolute top-3 right-3 flex gap-1.5">
                <label
                  className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-teal-900 text-[10px] font-semibold uppercase tracking-wider border border-stone-200 flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                  title="Upload your exact Yosia fireside photo from your device"
                >
                  <Upload size={11} />
                  <span>{yosiaPhoto2 ? "Change Photo 2" : "Use Your Photo 2"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(2, e)}
                    className="hidden"
                  />
                </label>
                {yosiaPhoto2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setYosiaPhoto2(null);
                      localStorage.removeItem("mygiftsong_yosia_photo_2");
                    }}
                    className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-red-600 border border-stone-200 cursor-pointer"
                    title="Reset to studio illustration"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-teal-700 font-medium">
                <span>Fireside Sing-Along Session</span>
                <span>·</span>
                <span>Joy &amp; Blessing</span>
              </div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Fireside Children&apos;s Songs &amp; Happy Melodies
              </h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Cozy by the fireplace with musical notes floating in the air, Yosia and Haddi sing custom songs in English, Bahasa Indonesia, and more!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

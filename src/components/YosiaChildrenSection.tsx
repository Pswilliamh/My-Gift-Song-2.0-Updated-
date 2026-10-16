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
  ChevronUp
} from "lucide-react";
import { SongData, SetType } from "../types";

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
 * Pixar-style warm illustrated SVG portrait of Yosia (Haddi's little brother)
 * matching the uploaded screenshots:
 * - Scene 1 ("standing"): Yosia standing in studio with woven cap, golden hoodie, denim jacket, yellow socks, holding acoustic guitar by fireplace & mic.
 * - Scene 2 ("fireside"): Yosia sitting in wooden armchair by warm fireplace playing guitar with floating golden musical notes.
 */
export const YosiaStudioArtwork: React.FC<{
  scene: "standing" | "fireside";
  customImageUrl?: string | null;
  className?: string;
}> = ({ scene, customImageUrl, className = "" }) => {
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
    <svg
      viewBox="0 0 600 420"
      className={`w-full h-full object-cover select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`studioWall-${scene}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a2214" />
          <stop offset="50%" stopColor="#52301c" />
          <stop offset="100%" stopColor="#24130b" />
        </linearGradient>
        <radialGradient id={`fireGlow-${scene}`} cx="0.78" cy="0.65" r="0.45">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
          <stop offset="55%" stopColor="#ea580c" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`hoodieGold-${scene}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={`denimBlue-${scene}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id={`guitarWood-${scene}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="60%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      {/* Cozy Wood Studio Background */}
      <rect width="600" height="420" fill={`url(#studioWall-${scene})`} />
      <rect width="600" height="420" fill={`url(#fireGlow-${scene})`} />

      {/* Warm Fairy Lights at Top */}
      <path d="M 0 30 Q 150 65 300 28 T 600 40" stroke="#92400e" strokeWidth="2" fill="none" />
      {[45, 110, 175, 240, 310, 380, 450, 520, 570].map((cx, idx) => (
        <g key={idx}>
          <circle cx={cx} cy={35 + (idx % 2) * 8} r="10" fill="#fde68a" opacity="0.25" />
          <circle cx={cx} cy={35 + (idx % 2) * 8} r="4.5" fill="#fef08a" />
        </g>
      ))}

      {/* Framed Gold Record on Left Wall */}
      <rect x="34" y="68" width="86" height="105" rx="6" fill="#1c120c" stroke="#d97706" strokeWidth="3" />
      <circle cx="77" cy="116" r="28" fill="#111827" stroke="#fbbf24" strokeWidth="2" />
      <circle cx="77" cy="116" r="10" fill="#fbbf24" />
      <circle cx="77" cy="116" r="3" fill="#111827" />

      {/* Vintage Studio Condenser Microphone on Left */}
      <line x1="145" y1="165" x2="145" y2="390" stroke="#78716c" strokeWidth="5" />
      <rect x="133" y="128" width="24" height="38" rx="12" fill="#d6d3d1" stroke="#fbbf24" strokeWidth="2.5" />
      <line x1="135" y1="140" x2="155" y2="140" stroke="#57534e" strokeWidth="2" />
      <line x1="135" y1="148" x2="155" y2="148" stroke="#57534e" strokeWidth="2" />

      {/* Cozy Brick Fireplace on Right */}
      <rect x="395" y="115" width="175" height="235" rx="8" fill="#7c2d12" stroke="#431407" strokeWidth="3" />
      <rect x="385" y="102" width="195" height="18" rx="4" fill="#451a03" stroke="#92400e" strokeWidth="2" />
      {/* Fireplace Hearth Arch */}
      <path d="M 425 350 L 425 215 Q 482 175 540 215 L 540 350 Z" fill="#1c0a04" stroke="#f59e0b" strokeWidth="2" />
      {/* Glowing Animated Flames */}
      <g>
        <path d="M 450 345 Q 465 255 482 230 Q 505 265 515 345 Z" fill="#f97316">
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1 1; 1 1.05; 1 0.97; 1 1"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M 462 345 Q 475 275 485 255 Q 498 285 505 345 Z" fill="#fbbf24">
          <animate opacity="0.85;1;0.85" dur="0.9s" repeatCount="indefinite" />
        </path>
        <path d="M 472 345 Q 482 300 486 282 Q 492 305 496 345 Z" fill="#fef08a" />
      </g>

      {/* Studio Wooden Floor & Warm Rug */}
      <rect x="0" y="345" width="600" height="75" fill="#2e190e" />
      <ellipse cx="295" cy="378" rx="210" ry="28" fill="#9a3412" stroke="#fbbf24" strokeWidth="2" opacity="0.85" />

      {/* Floating Animated Golden Musical Notes */}
      <g fill="#fde047" opacity="0.92">
        <text x="195" y="110" fontSize="28" fontWeight="bold">
          ♪
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-12; 0,0"
            dur="2.2s"
            repeatCount="indefinite"
          />
        </text>
        <text x="360" y="95" fontSize="32" fontWeight="bold">
          ♫
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-15; 0,0"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </text>
        <text x="415" y="155" fontSize="24" fontWeight="bold">
          ♬
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-10; 0,0"
            dur="1.9s"
            repeatCount="indefinite"
          />
        </text>
        <text x="175" y="210" fontSize="22" fontWeight="bold">
          ♪
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-11; 0,0"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </text>
      </g>

      {/* Wooden Armchair if Fireside Scene */}
      {scene === "fireside" && (
        <g>
          <rect x="210" y="185" width="155" height="145" rx="18" fill="#78350f" stroke="#b45309" strokeWidth="4" />
          <rect x="192" y="255" width="25" height="75" rx="8" fill="#5c280b" stroke="#92400e" strokeWidth="3" />
          <rect x="358" y="255" width="25" height="75" rx="8" fill="#5c280b" stroke="#92400e" strokeWidth="3" />
        </g>
      )}

      {/* YOSIA CHARACTER (Haddi's Joyful Little Brother) */}
      <g transform={scene === "fireside" ? "translate(10, -6)" : "translate(0, 0)"}>
        {/* Legs & Rolled-up Denim Jeans */}
        <rect x="252" y="305" width="28" height="48" rx="10" fill="#1e3a8a" />
        <rect x="298" y="305" width="28" height="48" rx="10" fill="#1e3a8a" />
        {/* Rolled Cuffs */}
        <rect x="250" y="343" width="32" height="9" rx="4" fill="#93c5fd" />
        <rect x="296" y="343" width="32" height="9" rx="4" fill="#93c5fd" />
        {/* Bright Yellow Socks (matching screenshot!) */}
        <ellipse cx="264" cy="364" rx="18" ry="11" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
        <ellipse cx="314" cy="364" rx="18" ry="11" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />

        {/* Golden Yellow Hoodie Torso */}
        <rect x="234" y="198" width="110" height="115" rx="26" fill={`url(#hoodieGold-${scene})`} />
        {/* Blue Denim Jacket Layered Over Hoodie */}
        <path d="M 234 210 Q 234 198 255 198 L 270 198 L 270 310 L 234 310 Z" fill={`url(#denimBlue-${scene})`} />
        <path d="M 344 210 Q 344 198 323 198 L 308 198 L 308 310 L 344 310 Z" fill={`url(#denimBlue-${scene})`} />
        {/* Hoodie Collar & Drawstrings */}
        <path d="M 262 198 Q 289 218 316 198" fill="#f59e0b" stroke="#b45309" strokeWidth="3" />

        {/* Yosia's Warm Expressive Head */}
        <circle cx="289" cy="142" r="48" fill="#d99b66" />
        {/* Cute Ears */}
        <circle cx="241" cy="146" r="10" fill="#c6864e" />
        <circle cx="337" cy="146" r="10" fill="#c6864e" />
        {/* Rosy Happy Cheeks */}
        <ellipse cx="260" cy="154" rx="9" ry="5.5" fill="#f87171" opacity="0.45" />
        <ellipse cx="318" cy="154" rx="9" ry="5.5" fill="#f87171" opacity="0.45" />

        {/* Big Expressive Dark Brown Eyes */}
        <circle cx="271" cy="138" r="8.5" fill="#1c1917" />
        <circle cx="307" cy="138" r="8.5" fill="#1c1917" />
        {/* Eye Sparkles */}
        <circle cx="268" cy="135" r="3" fill="#ffffff" />
        <circle cx="304" cy="135" r="3" fill="#ffffff" />
        {/* Happy Eyebrows */}
        <path d="M 259 124 Q 271 118 281 124" stroke="#292524" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 297 124 Q 307 118 319 124" stroke="#292524" strokeWidth="3.5" strokeLinecap="round" fill="none" />

        {/* Cute Button Nose */}
        <ellipse cx="289" cy="148" rx="5" ry="3.5" fill="#b87642" />

        {/* Big Joyful Beaming Smile */}
        <path d="M 268 159 Q 289 179 310 159 Z" fill="#7f1d1d" />
        <path d="M 272 160 Q 289 167 306 160" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
        <ellipse cx="289" cy="169" rx="10" ry="4.5" fill="#f87171" />

        {/* Dark Wavy Hair Peeking Under Cap */}
        <path d="M 242 125 Q 255 102 289 104 Q 323 102 336 125" stroke="#1c1917" strokeWidth="12" strokeLinecap="round" fill="none" />

        {/* Colorful Traditional Woven Cap (Red, Gold, Teal Geometric Pattern) */}
        <path d="M 242 115 Q 289 72 336 115 Z" fill="#b91c1c" stroke="#fbbf24" strokeWidth="3" />
        <rect x="241" y="106" width="96" height="13" rx="5" fill="#0f766e" stroke="#fbbf24" strokeWidth="2" />
        {/* Geometric Triangles on Cap Band */}
        {[248, 264, 280, 296, 312, 326].map((xPos, i) => (
          <polygon
            key={i}
            points={`${xPos},117 ${xPos + 5},108 ${xPos + 10},117`}
            fill={i % 2 === 0 ? "#fbbf24" : "#ef4444"}
          />
        ))}

        {/* Acoustic Guitar Held by Yosia */}
        <g transform="rotate(-14 295 265)">
          {/* Guitar Body */}
          <ellipse cx="272" cy="272" rx="46" ry="38" fill={`url(#guitarWood-${scene})`} stroke="#fde68a" strokeWidth="2.5" />
          <ellipse cx="312" cy="268" rx="34" ry="28" fill={`url(#guitarWood-${scene})`} stroke="#fde68a" strokeWidth="2.5" />
          {/* Soundhole */}
          <circle cx="294" cy="270" r="14" fill="#1c1008" stroke="#fbbf24" strokeWidth="2.5" />
          {/* Bridge */}
          <rect x="256" y="258" width="7" height="24" rx="2" fill="#291509" />
          {/* Guitar Neck & Headstock */}
          <rect x="338" y="261" width="78" height="13" rx="3" fill="#451a03" stroke="#d97706" strokeWidth="1.5" />
          <rect x="412" y="258" width="22" height="19" rx="4" fill="#78350f" stroke="#fbbf24" strokeWidth="1.5" />
          {/* Silver Strings */}
          <line x1="262" y1="264" x2="412" y2="264" stroke="#fef08a" strokeWidth="1" />
          <line x1="262" y1="268" x2="412" y2="268" stroke="#fef08a" strokeWidth="1" />
          <line x1="262" y1="272" x2="412" y2="272" stroke="#fef08a" strokeWidth="1" />
        </g>

        {/* Yosia's Hands Strumming */}
        <circle cx="276" cy="258" r="11" fill="#d99b66">
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,-5; 0,8; 0,-5"
            dur="0.55s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="358" cy="246" r="10" fill="#d99b66" />
      </g>

      {/* Bottom Caption Pill inside SVG */}
      <rect x="18" y="378" width="320" height="28" rx="8" fill="#000000" opacity="0.65" />
      <text x="30" y="396" fill="#fde68a" fontSize="12" fontFamily="monospace" fontWeight="bold">
        {scene === "standing"
          ? "👦🎸 Yosia — Haddi's Little Brother"
          : "🔥🎶 Yosia Strumming by the Fireplace"}
      </text>
    </svg>
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
    };
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

        {/* Action Buttons: Create Song Immediately OR Jump Into Full Studio */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => onGenerateYosiaSong(buildYosiaParams(false))}
            className="px-4 py-3 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-display font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <Music size={15} className="text-teal-700" />
            <span>Jump Into Full Studio (Worship, Longer Song &amp; More Options)</span>
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            onClick={() => onGenerateYosiaSong(buildYosiaParams(true))}
            className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-display font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles size={16} />
            <span>
              Create {childName.trim() ? `${childName.trim()}'s` : "Children's"}{" "}
              {selectedSetType === "full" ? "2-Min Full" : selectedSetType === "premium" ? "Premium" : "60s"} Song Now
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
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
                  src="/video/yosia-children.mp4"
                  controls
                  playsInline
                  preload="metadata"
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

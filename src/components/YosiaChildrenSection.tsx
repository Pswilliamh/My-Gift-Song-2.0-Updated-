import React, { useState } from "react";
import {
  Music,
  Sparkles,
  Play,
  Globe,
  Heart,
  Smile,
  Upload,
  RotateCcw,
  Volume2,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Gift
} from "lucide-react";
import { SongData } from "../types";

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

export const MR_SONNI_ENGLISH_SONG: SongData = {
  id: "mr-sonni-en",
  title: "The Mr. Sonni Song (Making People Happy)",
  target: "Mr. Sonni",
  context: "A joyful acoustic guitar song by Yosia & Haddi celebrating Mr. Sonni's kind heart, warm smile, and blessing to everyone around him.",
  setType: "full",
  tempo: "Happy Bouncy Guitar Strum (104 BPM)",
  genre: "Children's Joyful Acoustic Sing-Along",
  language: "English",
  artistPersona: "yosia",
  totalDurationSeconds: 90,
  artistIntro:
    "Halo my friends! I'm Yosia, Haddi's little brother! I play guitar too and I love helping make people happy! Big brother Haddi and I wrote this special song by our warm fireplace for our wonderful friend Mr. Sonni!",
  lyricSections: [
    {
      sectionName: "Intro",
      lines: [
        "[Yosia & Haddi Cheerful Acoustic Guitar Strumming by the Fireplace]",
        "[Happy hums and handclaps: La-la-la, thank you Mr. Sonni!]"
      ],
      chords: ["G", "C"],
      timestamps: [0, 4]
    },
    {
      sectionName: "Verse 1",
      lines: [
        "Good morning Mr. Sonni, the sun is shining bright,",
        "Your friendly smile and kindness fill the room with light!",
        "With a heart of gold and a helping hand to share,",
        "You spread the joy of Blessing and Grace everywhere."
      ],
      chords: ["G", "D", "Em", "C"],
      timestamps: [8, 14, 20, 26]
    },
    {
      sectionName: "Chorus",
      lines: [
        "Oh Mr. Sonni, you make the whole world smile,",
        "Yosia strums his guitar in a happy island style!",
        "May God's Covenant Favor and Faithfulness stay,",
        "Blessing Mr. Sonni each and every single day!"
      ],
      chords: ["C", "G", "D", "G"],
      timestamps: [32, 38, 44, 50]
    },
    {
      sectionName: "Verse 2",
      lines: [
        "From Sumatra to Jakarta, the silver strings ring out,",
        "Praise and pure happiness are what this song's about!",
        "Every little act of love plants a seed of peace,",
        "May the joy inside your Sanctuary never, ever cease!"
      ],
      chords: ["Em", "C", "G", "D"],
      timestamps: [56, 62, 68, 74]
    },
    {
      sectionName: "Outro",
      lines: [
        "Thank you Mr. Sonni, keep shining warm and true,",
        "Yosia and Haddi are singing this blessing just for you!"
      ],
      chords: ["C", "G"],
      timestamps: [80, 86]
    }
  ]
};

export const MR_SONNI_INDONESIAN_SONG: SongData = {
  id: "mr-sonni-id",
  title: "Lagu Bahagia Pak Sonni (Membawa Senyum & Berkat)",
  target: "Pak Sonni (Mr. Sonni)",
  context: "Lagu gitar akustik ceria dari Yosia & Haddi untuk Pak Sonni dalam Bahasa Indonesia, merayakan kebaikan hati, senyum hangat, dan berkat Tuhan.",
  setType: "full",
  tempo: "Petikan Gitar Ceria (104 BPM)",
  genre: "Lagu Anak & Sukacita Akustik",
  language: "Bahasa Indonesia",
  artistPersona: "yosia",
  totalDurationSeconds: 90,
  artistIntro:
    "Halo semuanya! Aku Yosia, adik kecil Bang Haddi! Aku suka sekali bermain gitar dan membuat hati semua orang gembira! Lagu dalam Bahasa Indonesia ini khusus kami nyanyikan di dekat perapian hangat untuk Pak Sonni (Mr. Sonni) yang baik hati!",
  lyricSections: [
    {
      sectionName: "Intro",
      lines: [
        "[Petikan Gitar Ceria Yosia & Bang Haddi di Depan Perapian]",
        "[Senandung hangat penuh sukacita: La-la-la, terima kasih Pak Sonni!]"
      ],
      chords: ["G", "C"],
      timestamps: [0, 4]
    },
    {
      sectionName: "Verse 1",
      lines: [
        "Selamat pagi Pak Sonni, mentari bersinar cerah,",
        "Senyummu yang ramah membuat hati kami gembira!",
        "Dengan hati yang tulus dan tangan yang suka menolong,",
        "Engkau menabur Berkat dan Kasih Karunia yang agung."
      ],
      chords: ["G", "D", "Em", "C"],
      timestamps: [8, 14, 20, 26]
    },
    {
      sectionName: "Chorus",
      lines: [
        "Oh Pak Sonni, engkau membuat dunia tersenyum bahagia,",
        "Yosia memetik gitarnya dengan irama penuh sukacita!",
        "Kiranya Berkat Perjanjian dan Kesetiaan Tuhan selalu nyata,",
        "Memberkati hidup Pak Sonni hari ini dan selamanya!"
      ],
      chords: ["C", "G", "D", "G"],
      timestamps: [32, 38, 44, 50]
    },
    {
      sectionName: "Verse 2",
      lines: [
        "Dari Sumatera hingga Jakarta senar gitar berbunyi merdu,",
        "Pujian dan kebahagiaan murni mengalir di dalam lagu!",
        "Setiap kebaikan kecil menanam benih damai sejahtera,",
        "Kiranya sukacita di hatimu bersinar sepanjang masa!"
      ],
      chords: ["Em", "C", "G", "D"],
      timestamps: [56, 62, 68, 74]
    },
    {
      sectionName: "Outro",
      lines: [
        "Terima kasih Pak Sonni, tetaplah bersinar hangat selalu,",
        "Yosia dan Bang Haddi menyanyikan berkat ini khusus untukmu!"
      ],
      chords: ["C", "G"],
      timestamps: [80, 86]
    }
  ]
};

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
      {/* Glowing Flames */}
      <path d="M 450 345 Q 465 255 482 230 Q 505 265 515 345 Z" fill="#f97316" />
      <path d="M 462 345 Q 475 275 485 255 Q 498 285 505 345 Z" fill="#fbbf24" />
      <path d="M 472 345 Q 482 300 486 282 Q 492 305 496 345 Z" fill="#fef08a" />

      {/* Studio Wooden Floor & Warm Rug */}
      <rect x="0" y="345" width="600" height="75" fill="#2e190e" />
      <ellipse cx="295" cy="378" rx="210" ry="28" fill="#9a3412" stroke="#fbbf24" strokeWidth="2" opacity="0.85" />

      {/* Floating Golden Musical Notes */}
      <g fill="#fde047" opacity="0.92">
        <text x="195" y="110" fontSize="28" fontWeight="bold">♪</text>
        <text x="360" y="95" fontSize="32" fontWeight="bold">♫</text>
        <text x="415" y="155" fontSize="24" fontWeight="bold">♬</text>
        <text x="175" y="210" fontSize="22" fontWeight="bold">♪</text>
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
        <circle cx="276" cy="258" r="11" fill="#d99b66" />
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
    artistPersona: "yosia";
    autoGenerate: boolean;
    preloadedSong?: SongData;
  }) => void;
}

export const YosiaChildrenSection: React.FC<YosiaChildrenSectionProps> = ({
  variant = "light",
  freeSongsRemaining,
  onBackToMainPage,
  onGenerateYosiaSong,
}) => {
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

  // Featured Mr. Sonni Song Translator state
  const [mrSonniLanguage, setMrSonniLanguage] = useState<string>("Bahasa Indonesia");
  const [mrSonniSong, setMrSonniSong] = useState<SongData>(MR_SONNI_INDONESIAN_SONG);
  const [isTranslatingMrSonni, setIsTranslatingMrSonni] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(true);
  const [copiedSonni, setCopiedSonni] = useState(false);
  const [isSpeakingSonni, setIsSpeakingSonni] = useState(false);

  // Yosia Custom Children's Song Builder state
  const [childName, setChildName] = useState("");
  const [childOccasion, setChildOccasion] = useState("");
  const [childWords, setChildWords] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");

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

  const handleTranslateMrSonni = async (targetLang: string) => {
    setMrSonniLanguage(targetLang);
    if (targetLang === "English") {
      setMrSonniSong(MR_SONNI_ENGLISH_SONG);
      return;
    }
    if (targetLang === "Bahasa Indonesia") {
      setMrSonniSong(MR_SONNI_INDONESIAN_SONG);
      return;
    }

    setIsTranslatingMrSonni(true);
    try {
      const res = await fetch("/api/translate-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          song: MR_SONNI_ENGLISH_SONG,
          targetLanguage: targetLang,
        }),
      });
      const data = await res.json();
      if (data.success && data.song) {
        setMrSonniSong(data.song);
      }
    } catch (err) {
      console.warn("Translation fallback:", err);
    } finally {
      setIsTranslatingMrSonni(false);
    }
  };

  const handleSpeakMrSonni = () => {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeakingSonni(false);
      return;
    }
    const textToSpeak = [
      mrSonniSong.artistIntro,
      ...mrSonniSong.lyricSections
        .filter((s) => s.sectionName !== "Intro")
        .flatMap((s) => s.lines),
    ].join(". ");

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const isIndo = mrSonniLanguage.toLowerCase().includes("indonesia");
    utterance.lang = isIndo ? "id-ID" : "en-US";
    utterance.pitch = 1.15; // Young joyful Yosia pitch
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeakingSonni(true);
    utterance.onend = () => setIsSpeakingSonni(false);
    utterance.onerror = () => setIsSpeakingSonni(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopySonniLyrics = () => {
    const formatted = mrSonniSong.lyricSections
      .map((s) => `[${s.sectionName}]\n${s.lines.join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(`${mrSonniSong.title}\n\n${formatted}`);
    setCopiedSonni(true);
    setTimeout(() => setCopiedSonni(false), 2000);
  };

  const isDark = variant === "dark";

  return (
    <section
      className={`rounded-2xl border p-6 sm:p-8 space-y-8 transition-all ${
        isDark
          ? "bg-[#14110e] border-[#FFD700]/35 text-white shadow-2xl"
          : "bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 border-amber-300 text-slate-900 shadow-xl shadow-amber-100/60"
      }`}
    >
      {/* TOP HEADER: MEET YOSIA (HADDI'S LITTLE BROTHER) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5 border-amber-300/40">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {onBackToMainPage && (
              <button
                type="button"
                onClick={onBackToMainPage}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isDark
                    ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                    : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs"
                }`}
              >
                <ArrowLeft size={13} />
                <span>Back to Haddi&apos;s Main Page</span>
              </button>
            )}
            <span className="text-xs font-mono uppercase tracking-widest font-extrabold text-amber-600">
              👦🎸 Dedicated Children&apos;s Song Page • Multilingual Translator
            </span>
          </div>
          <h2
            className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Meet <span className="text-amber-500">Yosia</span> — Haddi&apos;s Little Brother!
          </h2>
          <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? "text-white/80" : "text-slate-600"}`}>
            Welcome to our dedicated Children&apos;s Song Page! Yosia plays acoustic guitar just like his big brother Haddi, and he loves helping make children and families happy! Create joyful children&apos;s songs or translate songs like{" "}
            <strong className={isDark ? "text-[#FFD700]" : "text-amber-800"}>The Mr. Sonni Song</strong> into{" "}
            <strong className={isDark ? "text-[#FFD700]" : "text-amber-800"}>Bahasa Indonesia</strong> or 10+ languages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isDark
                ? "bg-amber-500/15 border-amber-400/40 text-[#FFD700]"
                : "bg-amber-100 border-amber-300 text-amber-900"
            }`}
          >
            <Smile size={15} className="text-amber-500" />
            Making Children Happy!
          </span>
        </div>
      </div>

      {/* YOSIA'S TWO STUDIO SHOWCASE CARDS (MATCHING THE 2 UPLOADED IMAGES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Yosia Standing with Guitar in Studio */}
        <div
          className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
            isDark ? "bg-black/60 border-[#C5A880]/30" : "bg-white border-slate-200 shadow-md"
          }`}
        >
          <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden">
            <YosiaStudioArtwork scene="standing" customImageUrl={yosiaPhoto1} />
            <div className="absolute top-3 right-3 flex gap-1.5">
              <label
                className="px-2.5 py-1.5 rounded-lg bg-black/75 hover:bg-black text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-400/40 flex items-center gap-1 cursor-pointer backdrop-blur-xs transition-all"
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
                  className="p-1.5 rounded-lg bg-black/75 text-white hover:text-red-400 border border-white/20 cursor-pointer"
                  title="Reset to studio illustration"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-amber-600 font-mono font-bold">
              <span>Yosia • Little Minstrel Guitarist</span>
              <span>·</span>
              <span>Jakarta Studio</span>
            </div>
            <h3 className={`font-display text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              &ldquo;Hi! I&apos;m Yosia, Haddi&apos;s Little Brother!&rdquo;
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? "text-white/70" : "text-slate-600"}`}>
              Wearing his colorful woven cap, golden hoodie, and yellow socks, Yosia strums cheerful guitar chords to put a big smile on every child&apos;s and friend&apos;s face.
            </p>
          </div>
        </div>

        {/* Card 2: Yosia Sitting in Wooden Armchair by Fireplace Playing Guitar */}
        <div
          className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
            isDark ? "bg-black/60 border-[#C5A880]/30" : "bg-white border-slate-200 shadow-md"
          }`}
        >
          <div className="relative aspect-4/3 w-full bg-slate-950 overflow-hidden">
            <YosiaStudioArtwork scene="fireside" customImageUrl={yosiaPhoto2} />
            <div className="absolute top-3 right-3 flex gap-1.5">
              <label
                className="px-2.5 py-1.5 rounded-lg bg-black/75 hover:bg-black text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-400/40 flex items-center gap-1 cursor-pointer backdrop-blur-xs transition-all"
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
                  className="p-1.5 rounded-lg bg-black/75 text-white hover:text-red-400 border border-white/20 cursor-pointer"
                  title="Reset to studio illustration"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-amber-600 font-mono font-bold">
              <span>Fireside Sing-Along Session</span>
              <span>·</span>
              <span>Joy &amp; Blessing</span>
            </div>
            <h3 className={`font-display text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              Fireside Children&apos;s Songs &amp; Happy Melodies
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? "text-white/70" : "text-slate-600"}`}>
              Cozy by the fireplace with golden musical notes floating in the air, Yosia and Haddi sing custom songs in English, Bahasa Indonesia, and more!
            </p>
          </div>
        </div>
      </div>

      {/* FEATURED SHOWCASE: THE MR. SONNI SONG IN BAHASA INDONESIA & MULTILINGUAL TRANSLATOR */}
      <div
        className={`rounded-2xl border-2 p-5 sm:p-6 space-y-5 ${
          isDark
            ? "bg-[#1c1611] border-[#FFD700]/50"
            : "bg-white border-amber-400 shadow-lg shadow-amber-100/50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-amber-300/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 uppercase tracking-wider">
              <Globe size={14} />
              <span>Featured Song &amp; Live Language Translator</span>
            </div>
            <h3 className={`text-xl font-display font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              🎵 {mrSonniSong.title}
            </h3>
            <p className={`text-xs ${isDark ? "text-white/70" : "text-slate-600"}`}>
              Performed by Yosia &amp; Haddi • Currently showing in{" "}
              <strong className={isDark ? "text-[#FFD700]" : "text-amber-800"}>{mrSonniLanguage}</strong>
            </p>
          </div>

          {/* Language Switcher Buttons for Mr. Sonni Song */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_SONG_LANGUAGES.slice(0, 6).map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleTranslateMrSonni(lang.code)}
                disabled={isTranslatingMrSonni}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  mrSonniLanguage === lang.code
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : isDark
                    ? "bg-black/60 text-white/80 hover:text-white border border-white/15"
                    : "bg-slate-100 text-slate-700 hover:bg-amber-50 border border-slate-200"
                }`}
              >
                {lang.short}
              </button>
            ))}
          </div>
        </div>

        {/* Yosia's Spoken Greeting in Selected Language */}
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm italic leading-relaxed ${
            isDark
              ? "bg-black/50 border-[#C5A880]/30 text-amber-200"
              : "bg-amber-50/90 border-amber-200 text-amber-950"
          }`}
        >
          <span className="font-mono font-bold not-italic uppercase text-[11px] block mb-1 text-amber-600">
            👦🎸 Yosia&apos;s Fireside Intro ({mrSonniLanguage}):
          </span>
          &ldquo;{mrSonniSong.artistIntro}&rdquo;
        </div>

        {/* View Toggle: Side-by-Side (English + Bahasa Indonesia) vs Single Language */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSideBySide(!showSideBySide)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border cursor-pointer transition-colors ${
                showSideBySide
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : isDark
                  ? "bg-black/40 text-white/70 border-white/20"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              {showSideBySide ? "✓ Side-by-Side (English + Translation)" : "Show Side-by-Side Comparison"}
            </button>
            {isTranslatingMrSonni && (
              <span className="text-xs font-mono text-amber-500 animate-pulse">
                Translating Mr. Sonni&apos;s song into {mrSonniLanguage}...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSpeakMrSonni}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                isSpeakingSonni
                  ? "bg-red-500 text-white"
                  : isDark
                  ? "bg-[#251e19] text-[#FFD700] border border-[#FFD700]/40 hover:bg-[#332922]"
                  : "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
              }`}
            >
              <Volume2 size={14} />
              <span>{isSpeakingSonni ? "Stop Voice Preview" : `Hear Yosia Read (${mrSonniLanguage})`}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySonniLyrics}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1 cursor-pointer border ${
                isDark
                  ? "bg-black/50 text-white border-white/20 hover:bg-black"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {copiedSonni ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedSonni ? "Copied!" : "Copy Lyrics"}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onGenerateYosiaSong({
                  target: "Mr. Sonni",
                  context:
                    mrSonniLanguage === "Bahasa Indonesia"
                      ? "Lagu anak dan sukacita akustik dalam Bahasa Indonesia oleh Yosia & Haddi untuk Pak Sonni (Mr. Sonni) yang suka membuat orang bahagia dan penuh berkat."
                      : `A joyful acoustic guitar song in ${mrSonniLanguage} by Yosia & Haddi for Mr. Sonni celebrating his kindness, warm smile, and blessing.`,
                  genre: "Children's Joyful Acoustic Sing-Along",
                  language: mrSonniLanguage,
                  artistPersona: "yosia",
                  autoGenerate: true,
                  preloadedSong: mrSonniSong,
                })
              }
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Play size={14} fill="currentColor" />
              <span>Sing &amp; Play Mr. Sonni Song in {mrSonniLanguage}</span>
            </button>
          </div>
        </div>

        {/* Mr. Sonni Lyrics Display (Side-by-Side or Single) */}
        <div
          className={`grid grid-cols-1 ${
            showSideBySide && mrSonniLanguage !== "English" ? "lg:grid-cols-2" : ""
          } gap-4 max-h-[340px] overflow-y-auto p-4 rounded-xl border ${
            isDark ? "bg-black/60 border-white/10" : "bg-slate-50 border-slate-200"
          }`}
        >
          {/* Translated / Active Language Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1.5 border-amber-400/30">
              <span className="text-xs font-mono font-extrabold uppercase text-amber-600">
                🌟 {mrSonniLanguage} Version
              </span>
              <span className="text-[11px] font-mono text-slate-400">Chords Included</span>
            </div>
            {mrSonniSong.lyricSections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-600">
                    {sec.sectionName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({sec.chords.join(" - ")})
                  </span>
                </div>
                {sec.lines.map((line, lIdx) => (
                  <p
                    key={lIdx}
                    className={`text-xs sm:text-sm leading-relaxed font-medium ${
                      isDark ? "text-white/95" : "text-slate-800"
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {/* Original English Reference Column when Side-by-Side is enabled */}
          {showSideBySide && mrSonniLanguage !== "English" && (
            <div className="space-y-3 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-4 border-slate-300/40">
              <div className="flex items-center justify-between border-b pb-1.5 border-slate-300/30">
                <span className="text-xs font-mono font-bold uppercase text-slate-500">
                  🇺🇸 Original English Reference
                </span>
              </div>
              {MR_SONNI_ENGLISH_SONG.lyricSections.map((sec, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                    {sec.sectionName}
                  </span>
                  {sec.lines.map((line, lIdx) => (
                    <p
                      key={lIdx}
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isDark ? "text-white/65" : "text-slate-600"
                      }`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE A NEW CHILDREN'S OR MULTILINGUAL SONG WITH YOSIA */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 space-y-5 ${
          isDark ? "bg-black/50 border-[#C5A880]/30" : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={`text-lg font-display font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              🎸 Create a Custom Children&apos;s or Family Song with Yosia
            </h3>
            <p className={`text-xs ${isDark ? "text-white/65" : "text-slate-500"}`}>
              Pick a quick starter below or type your 3 steps and choose your song language!
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600">
            <Gift size={13} className="inline mr-1" />
            {freeSongsRemaining} of 5 Free Songs Available
          </span>
        </div>

        {/* 1-Click Starter Templates */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-600">
            1-Click Yosia Starters:
          </span>
          <button
            type="button"
            onClick={() => {
              setChildName("Pak Sonni (Mr. Sonni)");
              setChildOccasion("Membawa Senyum & Kebahagiaan (Making People Happy)");
              setChildWords("Terima kasih Pak Sonni atas senyum hangat, kebaikan hati, dan semangat yang memberkati semua orang.");
              setSelectedLanguage("Bahasa Indonesia");
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold border border-amber-300 transition-colors cursor-pointer"
          >
            🇮🇩 Mr. Sonni (Bahasa Indonesia)
          </button>
          <button
            type="button"
            onClick={() => {
              setChildName("Little Toby");
              setChildOccasion("Happy 6th Birthday Sing-Along");
              setChildWords("Loves dinosaurs, playing guitar like Yosia, big hugs, and making everyone laugh!");
              setSelectedLanguage("English");
            }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white border-white/15"
                : "bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200"
            }`}
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
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white border-white/15"
                : "bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200"
            }`}
          >
            🌙 Bedtime Lullaby (Indonesia)
          </button>
          <button
            type="button"
            onClick={() => {
              setChildName("Sunday School Kids");
              setChildOccasion("Joyful Morning Praise & Kindness Song");
              setChildWords("Clap your hands, share your smile, help your friends, and shine God's love today!");
              setSelectedLanguage("Bilingual (English & Bahasa Indonesia)");
            }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? "bg-white/10 hover:bg-white/20 text-white border-white/15"
                : "bg-slate-100 hover:bg-amber-50 text-slate-700 border-slate-200"
            }`}
          >
            ☀️ Bilingual Kids Joy Song
          </button>
        </div>

        {/* 3-Step Form + Language Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase text-amber-600 block">
              Step 1: Who Is It For?
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g., Mr. Sonni, Toby, Maya..."
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border focus:outline-none ${
                isDark
                  ? "bg-black/80 border-[#C5A880]/40 text-white focus:border-[#FFD700]"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase text-amber-600 block">
              Step 2: What&apos;s the Occasion?
            </label>
            <input
              type="text"
              value={childOccasion}
              onChange={(e) => setChildOccasion(e.target.value)}
              placeholder="e.g., Birthday, Making People Happy..."
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border focus:outline-none ${
                isDark
                  ? "bg-black/80 border-[#C5A880]/40 text-white focus:border-[#FFD700]"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase text-amber-600 block">
              Step 3: Words &amp; Lyrics Wanted
            </label>
            <input
              type="text"
              value={childWords}
              onChange={(e) => setChildWords(e.target.value)}
              placeholder="Favorite things, smile, kindness..."
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border focus:outline-none ${
                isDark
                  ? "bg-black/80 border-[#C5A880]/40 text-white focus:border-[#FFD700]"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase text-amber-600 block">
              🌐 Song Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-xs sm:text-sm border font-medium focus:outline-none ${
                isDark
                  ? "bg-black/80 border-[#C5A880]/40 text-white focus:border-[#FFD700]"
                  : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
              }`}
            >
              {SUPPORTED_SONG_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              const targetVal = childName.trim() || "Mr. Sonni";
              const contextVal = [
                childOccasion.trim() ? `Occasion: ${childOccasion.trim()}.` : "Occasion: Joyful Children's & Family Blessing.",
                childWords.trim() ? `Desired Words & Lyrics: ${childWords.trim()}` : "Make it cheerful, warm, and full of smiles with Yosia's acoustic guitar!",
              ].join(" ");
              onGenerateYosiaSong({
                target: targetVal,
                context: contextVal,
                genre: "Children's Joyful Acoustic Sing-Along",
                language: selectedLanguage,
                artistPersona: "yosia",
                autoGenerate: true,
              });
            }}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles size={16} />
            <span>
              Create {childName.trim() ? `${childName.trim()}'s` : "Yosia's"} Song in {selectedLanguage} (Free)
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
};

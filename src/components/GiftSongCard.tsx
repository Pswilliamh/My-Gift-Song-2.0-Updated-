import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Play,
  Pause,
  Download,
  Mail,
  Share2,
  Sparkles,
  Upload,
  Check,
  Edit3,
  AlertCircle,
  Music,
  Link2,
  Copy,
  Volume2,
  QrCode,
  Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  safeParseJson,
  apiFetchJson,
  resolveBackendMediaUrl,
  LIVE_BACKEND_ORIGINS,
  synthesizeClientAcousticSongWavDataUrl,
  mixVoiceMp3WithAcousticGuitarWav,
} from "../utils/clientSongGenerator";

interface GiftSongCardProps {
  songId?: string;
  audioUrl: string | null;
  directAudioUrl?: string | null;
  shareableSongUrl?: string | null;
  lyrics: string;
  userWords?: string;
  recipientName?: string;
  songTitle?: string;
  lyriaAudioUrl?: string | null;
  narrationAudioUrl?: string | null;
  activeTrackType?: "lyria" | "narration";
  onSelectTrackType?: (type: "lyria" | "narration") => void;
  artistPersona?: "haddi" | "yosia";
  onUpdateLyrics?: (newLyrics: string, resingAudio?: boolean) => void;
  onOpenPrintableCard?: () => void;
  isSharedRecipientView?: boolean;
}

function extractCleanUserWords(rawContext?: string): string {
  if (!rawContext) return "";
  let cleaned = rawContext.trim();
  if (!cleaned) return "";
  for (let i = 0; i < 4; i++) {
    const next = cleaned
      .replace(/^Occasion:\s*[^.\n]+[.\n]?\s*/i, "")
      .replace(/^(?:Desired Words & Lyrics|Desired Words|Words|Lyrics|Memory|Special Message):\s*/i, "")
      .trim();
    if (next === cleaned) break;
    cleaned = next;
  }
  return cleaned;
}

// Convert a data: URI or fetchable URL into an ArrayBuffer for Web Audio decoding (with live backend fallback on Vercel)
async function fetchAudioArrayBuffer(src: string): Promise<ArrayBuffer> {
  if (src.startsWith("data:")) {
    const commaIdx = src.indexOf(",");
    const base64 = commaIdx >= 0 ? src.slice(commaIdx + 1) : src;
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const resolved = resolveBackendMediaUrl(src);
  try {
    const resp = await fetch(resolved);
    if (resp.ok) {
      const ct = resp.headers.get("content-type") || "";
      if (!ct.includes("text/html")) {
        return await resp.arrayBuffer();
      }
    }
  } catch {
    // try remote backend origins below
  }
  const pathPart = src.startsWith("http") ? new URL(src).pathname : src;
  for (const origin of LIVE_BACKEND_ORIGINS) {
    try {
      const r = await fetch(`${origin}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`, { mode: "cors" });
      if (r.ok) {
        return await r.arrayBuffer();
      }
    } catch {
      // continue
    }
  }
  const fallbackResp = await fetch(src);
  return await fallbackResp.arrayBuffer();
}

export const GiftSongCard: React.FC<GiftSongCardProps> = ({
  songId,
  audioUrl,
  directAudioUrl,
  shareableSongUrl,
  lyrics,
  userWords = "",
  recipientName = "Someone Special",
  songTitle = "The Sound of Honor & Covenant",
  lyriaAudioUrl,
  narrationAudioUrl,
  activeTrackType = "lyria",
  onSelectTrackType,
  artistPersona = "haddi",
  onUpdateLyrics,
  onOpenPrintableCard,
  isSharedRecipientView = false,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<"lyria" | "narration">(activeTrackType);
  const [copiedSongLink, setCopiedSongLink] = useState(false);
  const [copiedAudioLink, setCopiedAudioLink] = useState(false);
  const [copiedNarrationLink, setCopiedNarrationLink] = useState(false);
  const [copiedCardWithAudio, setCopiedCardWithAudio] = useState(false);
  const [cardQrTarget, setCardQrTarget] = useState<"song" | "audio">("song");
  const [tenSecAudioMode, setTenSecAudioMode] = useState<"songClip" | "spokenGreeting">("spokenGreeting");

  // Lyrics editor state inside GiftSongCard
  const [isEditingCardLyrics, setIsEditingCardLyrics] = useState(false);
  const [editableLyricsText, setEditableLyricsText] = useState(lyrics);
  const [lyricsSavedNotice, setLyricsSavedNotice] = useState(false);

  // 10-Second Personal Greeting & Song Video state (Real Yosia / Haddi Photo + Real 10s Spoken/Sung Greeting)
  const [characterChoice, setCharacterChoice] = useState<"haddi" | "yosia">(artistPersona);
  const [cardTheme, setCardTheme] = useState<"birthday" | "blessing">("birthday");
  const [customCharacterImage, setCustomCharacterImage] = useState<string | null>(null);
  const [isPreviewing10sVideo, setIsPreviewing10sVideo] = useState(false);
  const [isRecording10sVideo, setIsRecording10sVideo] = useState(false);
  const [isGenerating10sGreeting, setIsGenerating10sGreeting] = useState(false);
  const [tenSecGreetingAudioUrl, setTenSecGreetingAudioUrl] = useState<string | null>(null);
  const [videoCountdown, setVideoCountdown] = useState<number>(10);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  // Build default 10-second personal greeting script ("Hi Johnny! This is Yosia, wishing you a happy, blessed birthday! ...")
  const buildDefaultGreetingScript = (
    persona: "haddi" | "yosia",
    theme: "birthday" | "blessing",
    recName: string,
    rawWords: string
  ) => {
    const cleanName = recName.trim() || "my friend";
    const speakerName = persona === "yosia" ? "Yosia" : "Haddi";
    const cleanWords = extractCleanUserWords(rawWords);
    const shortUserSnippet = cleanWords
      ? cleanWords.split(/\s+/).slice(0, 14).join(" ")
      : "";
    if (theme === "birthday") {
      return shortUserSnippet
        ? `Hi ${cleanName}! This is ${speakerName}, wishing you a happy, blessed birthday! ${shortUserSnippet}`
        : `Hi ${cleanName}! This is ${speakerName}, wishing you a happy, blessed birthday filled with joy, love, and music!`;
    }
    return shortUserSnippet
      ? `Hi ${cleanName}! This is ${speakerName}, sending you a special acoustic blessing! ${shortUserSnippet}`
      : `Hi ${cleanName}! This is ${speakerName}, sending you a joyful acoustic blessing today and always!`;
  };

  const [greetingScript, setGreetingScript] = useState<string>(() =>
    buildDefaultGreetingScript(characterChoice, "birthday", recipientName, userWords)
  );
  const [isEditingGreetingScript, setIsEditingGreetingScript] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasServerVoiceRef = useRef<boolean>(true);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioCtxRef = useRef<AudioContext | null>(null);
  const previewSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const voiceLevelRef = useRef<number>(0);
  const decodedGreetingBufferRef = useRef<{ src: string; buffer: AudioBuffer } | null>(null);
  const modeStartRef = useRef<number>(performance.now());
  const drawFrameFnRef = useRef<(elapsedSec: number) => void>(() => {});
  const autoGeneratedKeyRef = useRef<string>("");

  useEffect(() => {
    setSelectedTrack(activeTrackType);
  }, [activeTrackType]);

  useEffect(() => {
    setCharacterChoice(artistPersona);
  }, [artistPersona]);

  useEffect(() => {
    setEditableLyricsText(lyrics);
  }, [lyrics]);

  // Keep default greeting script synced when recipient, persona, theme, or userWords change (unless manually edited)
  useEffect(() => {
    if (!isEditingGreetingScript) {
      setGreetingScript(
        buildDefaultGreetingScript(characterChoice, cardTheme, recipientName, userWords || editableLyricsText)
      );
    }
  }, [characterChoice, cardTheme, recipientName, userWords]);

  // Determine active audio source for the main song audio player
  const resolvedAudioSource =
    selectedTrack === "narration" && narrationAudioUrl
      ? narrationAudioUrl
      : selectedTrack === "lyria" && lyriaAudioUrl
      ? lyriaAudioUrl
      : audioUrl || lyriaAudioUrl || narrationAudioUrl || "";

  // Construct real, clickable shareable URLs for the Song Page and the Direct Audio File
  const getBasePublicUrl = () => {
    if (typeof window === "undefined") return "https://www.mygiftsong.org";
    const host = window.location.hostname;
    if (host === "mygiftsong.org" || host === "www.mygiftsong.org") {
      return "https://www.mygiftsong.org";
    }
    return window.location.origin;
  };

  const basePublicUrl = getBasePublicUrl();

  const resolvedShareableSongUrl =
    shareableSongUrl ||
    (songId ? `${basePublicUrl}/?song=${encodeURIComponent(songId)}` : "https://www.mygiftsong.org");

  // Always keep the main Singing Song Link and Spoken Blessing Link clearly separated!
  const resolvedDirectAudioLink =
    directAudioUrl
      ? directAudioUrl.startsWith("http")
        ? directAudioUrl
        : `${basePublicUrl}${directAudioUrl}`
      : songId
      ? `${basePublicUrl}/api/songs/${encodeURIComponent(songId)}/audio`
      : lyriaAudioUrl && !lyriaAudioUrl.startsWith("data:")
      ? lyriaAudioUrl.startsWith("http")
        ? lyriaAudioUrl
        : `${basePublicUrl}${lyriaAudioUrl}`
      : resolvedAudioSource && !resolvedAudioSource.startsWith("data:")
      ? resolvedAudioSource.startsWith("http")
        ? resolvedAudioSource
        : `${basePublicUrl}${resolvedAudioSource}`
      : resolvedShareableSongUrl;

  const resolvedDirectNarrationLink =
    songId && narrationAudioUrl
      ? `${basePublicUrl}/api/songs/${encodeURIComponent(songId)}/narration`
      : narrationAudioUrl && !narrationAudioUrl.startsWith("data:")
      ? narrationAudioUrl.startsWith("http")
        ? narrationAudioUrl
        : `${basePublicUrl}${narrationAudioUrl}`
      : null;

  const handleTrackSwitch = (type: "lyria" | "narration") => {
    setSelectedTrack(type);
    if (onSelectTrackType) {
      onSelectTrackType(type);
    }
  };

  // Load real Yosia or Haddi video AND photo onto canvas (Never use a generic cartoon!)
  useEffect(() => {
    const vid = document.createElement("video");
    vid.crossOrigin = "anonymous";
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.src =
      characterChoice === "yosia" ? "/video/yosia-children.mp4" : "/video/song-gift.mp4";
    vid.currentTime = 0.4;
    // Keep video paused when idle so mouth only moves while audio is actively playing!
    stageVideoRef.current = vid;

    const img = new Image();
    img.crossOrigin = "anonymous";
    let savedYosia: string | null = null;
    try {
      savedYosia = localStorage.getItem("mygiftsong_yosia_photo_1");
    } catch {
      savedYosia = null;
    }

    if (customCharacterImage) {
      img.src = customCharacterImage;
    } else if (characterChoice === "yosia" && savedYosia) {
      img.src = savedYosia;
    } else {
      img.src = "/images/guiter-rescaled-9music.png";
    }

    img.onload = () => {
      loadedImageRef.current = img;
    };

    return () => {
      try {
        vid.pause();
      } catch {
        // ignore
      }
    };
  }, [characterChoice, customCharacterImage]);

  // Extract the exact words the user gave or edited for their birthday/gift song
  const getHighlightLyrics = (): string[] => {
    const activeLyrics = editableLyricsText || lyrics;
    const rawLyricLines = activeLyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("["));

    const cleanGivenWords = extractCleanUserWords(userWords);
    if (cleanGivenWords) {
      const wordTokens = cleanGivenWords.split(/\s+/);
      const userLines: string[] = [];
      let currentLine = "";
      for (const word of wordTokens) {
        if ((currentLine + " " + word).trim().length <= 46) {
          currentLine = (currentLine + " " + word).trim();
        } else {
          if (currentLine) userLines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) userLines.push(currentLine);

      const combined = [...userLines, ...rawLyricLines].slice(0, 4);
      while (combined.length < 4) {
        combined.push(`Happy Birthday & Blessings, ${recipientName}!`);
      }
      return combined;
    }

    if (rawLyricLines.length === 0) {
      return [
        `Hi ${recipientName}! This is ${characterChoice === "yosia" ? "Yosia" : "Haddi"}!`,
        `Wishing you a happy, blessed birthday!`,
        "Strummed with love and acoustic joy,",
        "Blessings today and always!",
      ];
    }
    return rawLyricLines.slice(0, 4);
  };

  // Generate the real 10-second personal spoken & sung greeting ("Hi Johnny, this is Yosia, wishing you a happy blessed birthday!")
  const handleGenerate10sPersonalGreeting = async (autoPlayAfter = false): Promise<string | null> => {
    if (isGenerating10sGreeting) return null;
    setIsGenerating10sGreeting(true);
    if (autoPlayAfter) {
      stop10sPreview();
      pauseOtherPageAudio();
    }

    try {
      const cleanUserWords = extractCleanUserWords(userWords) || getHighlightLyrics().slice(0, 2).join(" ");
      const data = await apiFetchJson("/api/generate-10s-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          artistPersona: characterChoice,
          cardTheme,
          userWords: cleanUserWords,
          customGreetingScript: greetingScript,
          customGreetingText: greetingScript,
          shareId: songId,
        }),
      });
      hasServerVoiceRef.current = Boolean(data && data.hasSpokenVoice !== false);
      let newGreetingUrl: string | null =
        data?.greetingDataUrl ||
        data?.audioDataUrl ||
        (data?.greetingAudioUrl ? resolveBackendMediaUrl(data.greetingAudioUrl) : null) ||
        (data?.audioUrl ? resolveBackendMediaUrl(data.audioUrl) : null) ||
        null;

      if (data?.needsClientGuitarMix && data?.voiceMp3DataUrl) {
        newGreetingUrl = await mixVoiceMp3WithAcousticGuitarWav(data.voiceMp3DataUrl, {
          durationSeconds: 10,
          artistPersona: characterChoice,
          guitarGain: 0.22,
        });
      }

      if (!newGreetingUrl) {
        hasServerVoiceRef.current = false;
        newGreetingUrl = synthesizeClientAcousticSongWavDataUrl({
          durationSeconds: 10,
          artistPersona: characterChoice,
        });
      }

      if (newGreetingUrl) {
        setTenSecGreetingAudioUrl(newGreetingUrl);
        try {
          const arrayBuf = await fetchAudioArrayBuffer(newGreetingUrl);
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const tempCtx = new AudioCtx();
          const decoded = await tempCtx.decodeAudioData(arrayBuf.slice(0));
          await tempCtx.close().catch(() => {});
          decodedGreetingBufferRef.current = {
            src: newGreetingUrl,
            buffer: decoded,
          };
        } catch {
          // ignore decode error
        }
        if (autoPlayAfter) {
          await start10sPreviewWithSource(newGreetingUrl);
        }
        return newGreetingUrl;
      }
    } catch (err) {
      console.warn("Could not generate 10s personal greeting:", err);
      hasServerVoiceRef.current = false;
      const fallback10s = synthesizeClientAcousticSongWavDataUrl({
        durationSeconds: 10,
        artistPersona: characterChoice,
      });
      setTenSecGreetingAudioUrl(fallback10s);
      if (autoPlayAfter) {
        await start10sPreviewWithSource(fallback10s);
      }
      return fallback10s;
    } finally {
      setIsGenerating10sGreeting(false);
    }
    return null;
  };

  // Auto-generate the 10-second Yosia/Haddi greeting when the card loads so it's immediately ready
  useEffect(() => {
    const key = `${recipientName}-${characterChoice}-${cardTheme}`;
    if (autoGeneratedKeyRef.current === key) return;
    autoGeneratedKeyRef.current = key;
    handleGenerate10sPersonalGreeting(false);
  }, [recipientName, characterChoice, cardTheme]);

  // Draw a single frame of the 10-Second Personal Greeting Video using the real photo of Yosia or Haddi
  const drawAnimatedFrame = (elapsedSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const t = elapsedSec;

    // Sample live voice energy from AnalyserNode if playing
    let liveEnergy = 0;
    if (analyserNodeRef.current && (isPreviewing10sVideo || isRecording10sVideo)) {
      const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
      analyserNodeRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      liveEnergy = Math.min(1, sum / (dataArray.length * 115));
      voiceLevelRef.current = voiceLevelRef.current * 0.7 + liveEnergy * 0.3;
    } else if (isPreviewing10sVideo || isRecording10sVideo) {
      voiceLevelRef.current = 0.35 + Math.abs(Math.sin(t * 7.5)) * 0.45;
    } else {
      voiceLevelRef.current = 0.08 + Math.abs(Math.sin(t * 2.2)) * 0.08;
    }
    const voicePulse = voiceLevelRef.current;

    // 1. Rich Studio Background Gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    if (cardTheme === "birthday") {
      grad.addColorStop(0, "#042f2e");
      grad.addColorStop(0.5, "#0f766e");
      grad.addColorStop(1, "#0f172a");
    } else {
      grad.addColorStop(0, "#042f2e");
      grad.addColorStop(0.5, "#115e59");
      grad.addColorStop(1, "#0f172a");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Center Stage: Real Photo of Yosia or Haddi (or User's Uploaded Photo) with Live Voice-Reactive Motion
    const stageX = 20;
    const stageY = 82;
    const stageW = W - 40;
    const stageH = 202;
    const centerX = W * 0.5;
    const centerY = stageY + stageH * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(stageX, stageY, stageW, stageH, 18);
    ctx.closePath();
    ctx.clip();

    const vidEl = stageVideoRef.current;
    if (!customCharacterImage && vidEl && vidEl.readyState >= 2 && vidEl.videoWidth > 0) {
      // Sync video playback with active voice energy so mouth movement only happens while singing/speaking!
      if (isPreviewing10sVideo || isRecording10sVideo) {
        if (vidEl.paused && voicePulse > 0.12) {
          vidEl.play().catch(() => {});
        } else if (!vidEl.paused && voicePulse <= 0.08) {
          vidEl.pause();
        }
        try {
          vidEl.playbackRate = Math.max(0.75, Math.min(1.35, 0.85 + voicePulse * 0.45));
        } catch {
          // ignore playbackRate error
        }
      } else if (!vidEl.paused) {
        vidEl.pause();
      }
      const zoom = 1.02 + voicePulse * 0.025;
      const scale = Math.max(stageW / vidEl.videoWidth, stageH / vidEl.videoHeight) * zoom;
      const drawW = vidEl.videoWidth * scale;
      const drawH = vidEl.videoHeight * scale;
      ctx.drawImage(vidEl, centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    } else if (loadedImageRef.current) {
      const img = loadedImageRef.current;
      // Subtle cinema pan + voice-synced breathing zoom on the real photo
      const zoom = 1.04 + Math.sin(t * 1.6) * 0.025 + voicePulse * 0.035;
      const panX = Math.sin(t * 1.1) * 6;
      const panY = Math.cos(t * 1.4) * 4;
      const scale = Math.max(stageW / img.width, stageH / img.height) * zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, centerX - drawW / 2 + panX, centerY - drawH / 2 + panY, drawW, drawH);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(stageX, stageY, stageW, stageH);
    }

    // Subtle warm vignette at bottom of photo stage
    const vidVignette = ctx.createLinearGradient(0, stageY + stageH - 70, 0, stageY + stageH);
    vidVignette.addColorStop(0, "rgba(15, 23, 42, 0)");
    vidVignette.addColorStop(1, "rgba(15, 23, 42, 0.82)");
    ctx.fillStyle = vidVignette;
    ctx.fillRect(stageX, stageY + stageH - 70, stageW, 70);

    // Live Speaking Indicator Pill inside the bottom of the photo stage
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(stageX + 14, stageY + stageH - 36, stageW - 28, 26, 13);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    const speakerLabel =
      characterChoice === "yosia"
        ? `🎤 Yosia Greeting ${recipientName}: "Hi ${recipientName}, Happy Blessed Birthday!"`
        : `🎸 Haddi Greeting ${recipientName}: "Hi ${recipientName}, Happy Blessed Birthday!"`;
    ctx.fillText(
      speakerLabel.length > 62 ? speakerLabel.slice(0, 60) + "..." : speakerLabel,
      W / 2,
      stageY + stageH - 19
    );
    ctx.restore();

    // Voice-reactive glowing gold border around Yosia/Haddi stage
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(stageX, stageY, stageW, stageH, 18);
    ctx.strokeStyle = isPreviewing10sVideo || isRecording10sVideo ? "#fbbf24" : "rgba(251, 191, 36, 0.75)";
    ctx.lineWidth = 2.5 + voicePulse * 3;
    ctx.shadowColor = "rgba(251, 191, 36, 0.7)";
    ctx.shadowBlur = 8 + voicePulse * 18;
    ctx.stroke();
    ctx.restore();

    // 3. Subtle Floating Musical Notes & Sparkles around the Stage
    const noteSymbols = ["♪", "♫", "♬", "♩"];
    for (let n = 0; n < 4; n++) {
      const noteCycle = (t * 0.65 + n * 0.25) % 1;
      const nx = 48 + n * 135 + Math.sin(t * 2.5 + n) * 14;
      const ny = stageY + stageH - 12 - noteCycle * 75;
      ctx.save();
      ctx.font = `bold ${15 + (n % 2) * 3}px sans-serif`;
      ctx.fillStyle = n % 2 === 0 ? "#fde047" : "#5eead4";
      ctx.globalAlpha = Math.sin(noteCycle * Math.PI) * 0.85;
      ctx.fillText(noteSymbols[n % noteSymbols.length], nx, ny);
      ctx.restore();
    }

    // 4. Top Banner Header
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.beginPath();
    ctx.roundRect(20, 12, W - 40, 62, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      cardTheme === "birthday"
        ? `🎂 10-SECOND BIRTHDAY GREETING & SONG • ${characterChoice === "yosia" ? "YOSIA" : "HADDI"}`
        : `🎁 10-SECOND BLESSING GREETING & SONG • ${characterChoice === "yosia" ? "YOSIA" : "HADDI"}`,
      W / 2,
      32
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 19px sans-serif";
    ctx.fillText(`For ${recipientName}`, W / 2, 58);
    ctx.restore();

    // 5. Synchronized 10-Second Greeting & Lyric Caption Box (Matches either Sung Song Lyrics or Spoken Greeting)
    const activeCaptionSource =
      tenSecAudioMode === "songClip"
        ? getHighlightLyrics().join(" • ")
        : greetingScript || "";
    const greetingChunks: string[] = [];
    const words = activeCaptionSource.split(/\s+/).filter(Boolean);
    let currentLine = "";
    for (const w of words) {
      if ((currentLine + " " + w).trim().length <= 48) {
        currentLine = (currentLine + " " + w).trim();
      } else {
        if (currentLine) greetingChunks.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) greetingChunks.push(currentLine);
    while (greetingChunks.length < 2) {
      greetingChunks.push(`Happy Blessed Birthday, ${recipientName}!`);
    }

    const cycleSec = Math.min(9.99, t % 10);
    const activeLineIndex = Math.min(
      greetingChunks.length - 1,
      Math.floor((cycleSec / 10) * greetingChunks.length)
    );
    const lineProgress = ((cycleSec / 10) * greetingChunks.length) % 1;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(20, H - 146, W - 40, 96, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(94, 234, 212, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = "center";
    const startPairIdx = Math.floor(activeLineIndex / 2) * 2;
    for (let idx = 0; idx < 2; idx++) {
      const lineIdx = startPairIdx + idx;
      const lineText = greetingChunks[lineIdx] || "";
      const isCurrent = lineIdx === activeLineIndex;
      ctx.fillStyle = isCurrent ? "#fef08a" : "rgba(255,255,255,0.72)";
      ctx.font = isCurrent ? "bold 14.5px sans-serif" : "italic 13px sans-serif";
      const truncated = lineText.length > 52 ? lineText.slice(0, 50) + "..." : lineText;
      const lineY = H - 110 + idx * 28;
      ctx.fillText(truncated, W / 2, lineY);

      if (isCurrent && truncated) {
        const textWidth = Math.min(W - 90, ctx.measureText(truncated).width);
        const ballX = W / 2 - textWidth / 2 + lineProgress * textWidth;
        const ballBounce = Math.abs(Math.sin(t * 12)) * 6;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(ballX, lineY - 14 - ballBounce, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Smooth 10-Second Progress Bar inside Caption Box
    const barW = W - 68;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.roundRect(34, H - 63, barW, 5, 3);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(34, H - 63, Math.max(8, barW * (cycleSec / 10)), 5, 3);
    ctx.fill();
    ctx.restore();

    // 6. Voice-Reactive Equalizer Bars & www.mygiftsong.org Footer
    const barCount = 16;
    const barAreaWidth = 176;
    const startX = (W - barAreaWidth) / 2;
    for (let b = 0; b < barCount; b++) {
      const activeAmp = (isPreviewing10sVideo || isRecording10sVideo ? 16 : 6) + voicePulse * 10;
      const barH = 5 + Math.abs(Math.sin(t * 8.5 + b * 0.65)) * activeAmp;
      ctx.fillStyle = b % 2 === 0 ? "#fbbf24" : "#2dd4bf";
      ctx.fillRect(startX + b * 11, H - 27 - barH / 2, 6, barH);
    }

    ctx.fillStyle = "#ccfbf1";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText("www.mygiftsong.org", W - 22, H - 16);

    ctx.textAlign = "left";
    ctx.fillText(
      isPreviewing10sVideo || isRecording10sVideo
        ? `🎤 SPEAKING: ${Math.max(1, 10 - Math.floor(cycleSec))}s / 10s`
        : "▶ CLICK FOR 10s GREETING",
      22,
      H - 16
    );
  };

  drawFrameFnRef.current = drawAnimatedFrame;

  // Run continuous 60 FPS video canvas loop whenever not actively recording a download
  useEffect(() => {
    if (isRecording10sVideo) return;

    let rafId: number;
    const startTime = performance.now();
    modeStartRef.current = startTime;

    const tick = (now: number) => {
      const rawElapsed = (now - modeStartRef.current) / 1000;

      if (isPreviewing10sVideo) {
        setVideoCountdown(Math.max(0, 10 - Math.floor(rawElapsed)));
        if (rawElapsed >= 10) {
          stop10sAudioNodes();
          setIsPreviewing10sVideo(false);
          setVideoCountdown(10);
          modeStartRef.current = now;
        }
      }

      const loopElapsed = rawElapsed % 10;
      drawFrameFnRef.current(loopElapsed);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPreviewing10sVideo, isRecording10sVideo]);

  const stop10sAudioNodes = () => {
    if (previewSourceNodeRef.current) {
      try {
        previewSourceNodeRef.current.stop();
      } catch {
        // ignore
      }
      previewSourceNodeRef.current = null;
    }
    analyserNodeRef.current = null;
    if (previewAudioCtxRef.current) {
      previewAudioCtxRef.current.close().catch(() => {});
      previewAudioCtxRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  const stop10sPreview = () => {
    stop10sAudioNodes();
    if (stageVideoRef.current) {
      try {
        stageVideoRef.current.pause();
      } catch {
        // ignore
      }
    }
    setIsPreviewing10sVideo(false);
    setVideoCountdown(10);
    modeStartRef.current = performance.now();
  };

  const pauseOtherPageAudio = () => {
    if (typeof document === "undefined") return;
    const allAudios = document.querySelectorAll("audio");
    allAudios.forEach((a) => {
      try {
        a.pause();
      } catch {
        // ignore
      }
    });
  };

  // Start playing the 10-second personal greeting with live Web Audio AnalyserNode
  const start10sPreviewWithSource = async (sourceUrl: string) => {
    stop10sAudioNodes();
    pauseOtherPageAudio();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (stageVideoRef.current) {
      stageVideoRef.current.currentTime = 0;
      stageVideoRef.current.play().catch(() => {});
    }

    modeStartRef.current = performance.now();
    setVideoCountdown(10);
    setIsPreviewing10sVideo(true);

    // If the server returned the guitar-only backing WAV (e.g. if TTS was rate-limited), layer browser speech synthesis so the greeting is ALWAYS spoken out loud!
    if (!hasServerVoiceRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const utter = new SpeechSynthesisUtterance(greetingScript);
        utter.rate = 1.02;
        utter.pitch = characterChoice === "yosia" ? 1.18 : 0.98;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis error
      }
    }

    try {
      let cached = decodedGreetingBufferRef.current;
      if (!cached || cached.src !== sourceUrl) {
        const arrayBuf = await fetchAudioArrayBuffer(sourceUrl);
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const tempCtx = new AudioCtx();
        const decoded = await tempCtx.decodeAudioData(arrayBuf.slice(0));
        await tempCtx.close().catch(() => {});
        cached = { src: sourceUrl, buffer: decoded };
        decodedGreetingBufferRef.current = cached;
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const playCtx = new AudioCtx();
      if (playCtx.state === "suspended") {
        await playCtx.resume().catch(() => {});
      }
      const analyser = playCtx.createAnalyser();
      analyser.fftSize = 64;
      const sourceNode = playCtx.createBufferSource();
      sourceNode.buffer = cached.buffer;
      sourceNode.connect(analyser);
      analyser.connect(playCtx.destination);
      sourceNode.start(0, 0, 10);

      previewAudioCtxRef.current = playCtx;
      previewSourceNodeRef.current = sourceNode;
      analyserNodeRef.current = analyser;
      return;
    } catch {
      const audio = new Audio(sourceUrl);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
    }
  };

  // Play the 10-Second Personal Greeting Video (Plays 10s Sung Song Clip or 10s Spoken Greeting)
  const handleStart10sPreview = async () => {
    if (isPreviewing10sVideo) {
      stop10sPreview();
      return;
    }

    // If user selected "10s Sung Song Clip" and we have the sung song audio, play a 10-second synced clip of the actual sung song!
    const primarySungSource = lyriaAudioUrl || audioUrl || resolvedAudioSource;
    if (tenSecAudioMode === "songClip" && primarySungSource) {
      hasServerVoiceRef.current = true;
      await start10sPreviewWithSource(primarySungSource);
      return;
    }

    let activeGreetingUrl = tenSecGreetingAudioUrl || "";
    if (!activeGreetingUrl) {
      const generated = await handleGenerate10sPersonalGreeting(true);
      if (!generated && primarySungSource) {
        await start10sPreviewWithSource(primarySungSource);
      }
      return;
    }

    await start10sPreviewWithSource(activeGreetingUrl);
  };

  // Record & Export a real 10-Second Greeting Video (.webm) with Yosia/Haddi's 10s song or voice greeting baked in!
  const handleRecordAndDownload10sVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording10sVideo) return;

    stop10sPreview();
    pauseOtherPageAudio();

    const primarySungSource = lyriaAudioUrl || audioUrl || resolvedAudioSource;
    let activeGreetingUrl =
      tenSecAudioMode === "songClip" && primarySungSource
        ? primarySungSource
        : tenSecGreetingAudioUrl || "";
    if (!activeGreetingUrl) {
      const generated = await handleGenerate10sPersonalGreeting(false);
      if (generated) activeGreetingUrl = generated;
    }
    if (!activeGreetingUrl) {
      activeGreetingUrl = primarySungSource;
    }

    setIsRecording10sVideo(true);
    setRecordedVideoUrl(null);
    setVideoCountdown(10);

    try {
      const canvasStream = canvas.captureStream(30);
      let combinedStream = canvasStream;
      let audioEl: HTMLAudioElement | null = null;
      let audioCtx: AudioContext | null = null;
      let bufferSourceNode: AudioBufferSourceNode | null = null;

      if (activeGreetingUrl) {
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtx = new AudioCtx();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume().catch(() => {});
          }

          let cached = decodedGreetingBufferRef.current;
          if (!cached || cached.src !== activeGreetingUrl) {
            const arrayBuf = await fetchAudioArrayBuffer(activeGreetingUrl);
            const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
            cached = { src: activeGreetingUrl, buffer: decoded };
            decodedGreetingBufferRef.current = cached;
          }

          const destNode = audioCtx.createMediaStreamDestination();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserNodeRef.current = analyser;

          bufferSourceNode = audioCtx.createBufferSource();
          bufferSourceNode.buffer = cached.buffer;
          bufferSourceNode.connect(analyser);
          analyser.connect(destNode);
          analyser.connect(audioCtx.destination);
          bufferSourceNode.start(0, 0, 10);

          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destNode.stream.getAudioTracks(),
          ]);
        } catch {
          combinedStream = canvasStream;
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

      const recorder = mimeType
        ? new MediaRecorder(combinedStream, { mimeType })
        : new MediaRecorder(combinedStream);

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setIsRecording10sVideo(false);
        setVideoCountdown(10);

        if (bufferSourceNode) {
          try {
            bufferSourceNode.stop();
          } catch {
            // ignore
          }
        }
        analyserNodeRef.current = null;
        if (audioEl) audioEl.pause();
        if (audioCtx) audioCtx.close().catch(() => {});

        const a = document.createElement("a");
        a.href = url;
        a.download = `${recipientName.replace(/\s+/g, "_")}_10s_Birthday_Greeting_Video.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      recorder.start(200);
      const startTime = performance.now();

      const animateRecord = (now: number) => {
        const elapsedSec = (now - startTime) / 1000;
        setVideoCountdown(Math.max(0, 10 - Math.floor(elapsedSec)));
        drawFrameFnRef.current(elapsedSec);

        if (elapsedSec < 10) {
          animFrameRef.current = requestAnimationFrame(animateRecord);
        } else if (recorder.state !== "inactive") {
          recorder.stop();
        }
      };

      animFrameRef.current = requestAnimationFrame(animateRecord);
    } catch (err) {
      console.warn("Video recording fallback notice:", err);
      setIsRecording10sVideo(false);
    }
  };

  // Save edited lyrics & optionally re-sing the main song
  const handleSaveEditedLyrics = async (shouldResingAudio: boolean) => {
    const cleaned = editableLyricsText.trim();
    if (!cleaned) return;
    setIsEditingCardLyrics(false);
    setLyricsSavedNotice(true);
    setTimeout(() => setLyricsSavedNotice(false), 3500);

    if (onUpdateLyrics) {
      onUpdateLyrics(cleaned, shouldResingAudio);
    }
  };

  // Construct a direct mailto link to send the gift card via email with BOTH the Direct Song Link and Direct Audio Link
  const handleEmailShare = () => {
    const subject = encodeURIComponent(
      cardTheme === "birthday"
        ? `🎂 Happy Birthday ${recipientName}! Your Custom Song & Gift Card (${songTitle})`
        : `🎁 A Special Custom Song for You: ${songTitle} (www.mygiftsong.org)`
    );
    const body = encodeURIComponent(
      `Hello ${recipientName},\n\n${
        characterChoice === "yosia" ? "Yosia (Haddi's Little Brother)" : "Haddi the Street Minstrel"
      } created a custom ${
        cardTheme === "birthday" ? "Happy Birthday " : ""
      }gift song & 10-second greeting card just for you on www.mygiftsong.org!\n\n🎵 Direct Link to Open & Play Your Song:\n${resolvedShareableSongUrl}\n\n🔊 Direct Link to Your Song Audio File:\n${resolvedDirectAudioLink}\n\n💬 10-Second Personal Greeting:\n"${greetingScript}"\n\n📜 Your Custom Song Lyrics:\n${
        editableLyricsText || lyrics
      }\n\nSent with love from https://www.mygiftsong.org`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Construct a direct WhatsApp share link that opens the dedicated song card AND clearly labels the Singing Song MP3 link vs Spoken Blessing link
  const handleWhatsAppGiftShare = () => {
    const narrationLine = resolvedDirectNarrationLink
      ? `🎙️ *Spoken Blessing Version:* ${resolvedDirectNarrationLink}\n`
      : "";
    const text = encodeURIComponent(
      `🎂🎵 *Happy Birthday ${recipientName}!* 🎁\n\n` +
        `💬 *${characterChoice === "yosia" ? "Yosia" : "Haddi"}'s Greeting:* "${greetingScript}"\n\n` +
        `🎶 *Song Title:* "${songTitle}"\n` +
        `🎵 *Open ${recipientName}'s Dedicated Song & Video Card:* ${resolvedShareableSongUrl}\n` +
        `🎸 *Direct Singing Song Audio (MP3):* ${resolvedDirectAudioLink}\n` +
        narrationLine +
        `\n📜 *Lyrics Preview:*\n${getHighlightLyrics().join("\n")}\n\n` +
        `🌐 Created on https://www.mygiftsong.org`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleCopySongPageLink = () => {
    navigator.clipboard.writeText(resolvedShareableSongUrl);
    setCopiedSongLink(true);
    setTimeout(() => setCopiedSongLink(false), 2500);
  };

  const handleCopyDirectAudioLink = () => {
    navigator.clipboard.writeText(resolvedDirectAudioLink);
    setCopiedAudioLink(true);
    setTimeout(() => setCopiedAudioLink(false), 2500);
  };

  const handleCopyDirectNarrationLink = () => {
    if (!resolvedDirectNarrationLink) return;
    navigator.clipboard.writeText(resolvedDirectNarrationLink);
    setCopiedNarrationLink(true);
    setTimeout(() => setCopiedNarrationLink(false), 2500);
  };

  const handleCopyGiftCardWithAudioLink = () => {
    const narrationBlock = resolvedDirectNarrationLink
      ? `🎙️ Spoken Blessing Audio Link:\n${resolvedDirectNarrationLink}\n\n`
      : "";
    const fullGiftCardText =
      `🎁 CUSTOM GIFT SONG CARD FOR ${recipientName.toUpperCase()}\n` +
      `Song Title: "${songTitle}"\n` +
      `From: ${characterChoice === "yosia" ? "Yosia" : "Haddi"} (www.mygiftsong.org)\n\n` +
      `🎵 Open Dedicated Song & Video Card:\n${resolvedShareableSongUrl}\n\n` +
      `🎸 Direct Singing Song Audio (MP3):\n${resolvedDirectAudioLink}\n\n` +
      narrationBlock +
      `💬 10-Second Greeting:\n"${greetingScript}"\n\n` +
      `📜 Song Lyrics:\n${editableLyricsText || lyrics}\n`;
    navigator.clipboard.writeText(fullGiftCardText);
    setCopiedCardWithAudio(true);
    setTimeout(() => setCopiedCardWithAudio(false), 2500);
  };

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setCustomCharacterImage(res);
        if (characterChoice === "yosia") {
          try {
            localStorage.setItem("mygiftsong_yosia_photo_1", res);
          } catch {
            // ignore
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md border border-stone-200 p-4 sm:p-6 text-slate-900 my-4 space-y-5">
      {/* =====================================================================
          PDF-STYLE PRINTABLE & SHAREABLE KEEPSAKE GIFT CARD CERTIFICATE
          Styled like a formal PDF Gift Card with QR Code, Dedication & Lyrics
      ===================================================================== */}
      <div
        id="printable-keepsake-card"
        className="printable-keepsake-certificate rounded-2xl border-2 border-teal-800 bg-gradient-to-b from-[#fffdf7] via-white to-[#f3faf8] p-1.5 shadow-sm"
      >
        <div className="rounded-xl border border-amber-400/80 p-4 sm:p-6 space-y-4">
          {/* Certificate Header & Seal */}
          <div className="text-center border-b border-amber-300/70 pb-3.5 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-900 text-amber-200 text-[10px] font-mono font-bold uppercase tracking-widest">
              <span>✨ Official Custom Gift Song Certificate • www.mygiftsong.org ✨</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-slate-900 pt-1">
              {songTitle}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-teal-800">
              Presented with Love &amp; Blessing To{" "}
              <span className="underline decoration-amber-400 decoration-2 underline-offset-4 font-bold text-slate-950">
                {recipientName}
              </span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Performed by{" "}
              {characterChoice === "yosia"
                ? "Yosia (Haddi's Little Brother) • Acoustic Guitar & Vocals"
                : "Haddi the Street Minstrel • Acoustic Guitar & Vocals"}
            </p>
          </div>

          {/* Personal Blessing Message Quote on the PDF Certificate */}
          <div className="rounded-xl bg-amber-50/70 border border-amber-300/80 px-3.5 py-2.5 text-center">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 mb-0.5">
              💬 Personal Audio Blessing Included with Your Card:
            </p>
            <p className="text-xs text-slate-800 italic font-medium leading-relaxed">
              &ldquo;{greetingScript}&rdquo;
            </p>
          </div>

          {/* Formatted Song Lyrics Sheet on the PDF Certificate */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-900">
                📜 Custom Song Lyrics Dedicated to {recipientName}:
              </span>
              {!isSharedRecipientView && (
                <button
                  type="button"
                  onClick={() => setIsEditingCardLyrics(!isEditingCardLyrics)}
                  className="no-print text-[10px] font-bold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={10} />
                  <span>{isEditingCardLyrics ? "Close Editor" : "Edit Lyrics"}</span>
                </button>
              )}
            </div>
            <div className="print-full-lyrics rounded-xl bg-white/95 border border-stone-200/90 p-3.5 max-h-48 overflow-y-auto text-xs text-slate-800 italic leading-relaxed whitespace-pre-line shadow-2xs">
              {editableLyricsText || lyrics}
            </div>
          </div>

          {/* Scannable QR Code + Direct Clickable Song & Audio Links on the PDF Certificate */}
          <div className="rounded-xl bg-teal-50/85 border border-teal-300 p-3.5 space-y-2.5 text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              {/* High-Contrast Scannable QR Code */}
              <div className="p-2 bg-white rounded-xl border-2 border-teal-700 shadow-2xs shrink-0 flex flex-col items-center">
                <QRCodeSVG
                  value={
                    cardQrTarget === "song"
                      ? `${resolvedShareableSongUrl}${resolvedShareableSongUrl.includes("?") ? "&" : "?"}autoplay=1`
                      : resolvedDirectAudioLink
                  }
                  size={88}
                  level="M"
                  fgColor="#0f766e"
                  bgColor="#ffffff"
                />
                <span className="mt-1 text-[9px] font-mono font-bold uppercase tracking-wider text-teal-950">
                  📱 Scan to Play
                </span>
              </div>

              {/* Direct Clickable Links inside Certificate */}
              <div className="flex-1 min-w-0 w-full space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-teal-950 flex items-center gap-1">
                    <QrCode size={13} className="text-teal-700 shrink-0" />
                    <span>Scan QR with Phone Camera or Click Links:</span>
                  </span>
                  <div className="no-print flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCardQrTarget("song")}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                        cardQrTarget === "song"
                          ? "bg-teal-700 text-white"
                          : "bg-white text-slate-600 border border-stone-200"
                      }`}
                    >
                      QR: Song Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardQrTarget("audio")}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                        cardQrTarget === "audio"
                          ? "bg-teal-700 text-white"
                          : "bg-white text-slate-600 border border-stone-200"
                      }`}
                    >
                      QR: Audio
                    </button>
                  </div>
                </div>

                {/* Link 1: Dedicated Song & Video Card Page */}
                <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-teal-200">
                  <div className="truncate">
                    <span className="text-[10px] font-bold uppercase text-teal-800 block">
                      🎵 1. Dedicated Song &amp; Video Card Page:
                    </span>
                    <a
                      href={resolvedShareableSongUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-teal-700 hover:underline font-mono truncate block"
                    >
                      {resolvedShareableSongUrl}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySongPageLink}
                    className="no-print px-2 py-1 rounded bg-stone-100 hover:bg-teal-100 text-teal-900 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    {copiedSongLink ? "✓ Copied" : "Copy"}
                  </button>
                </div>

                {/* Link 2: Direct Singing Song Audio Link */}
                <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-teal-200">
                  <div className="truncate">
                    <span className="text-[10px] font-bold uppercase text-teal-800 block">
                      🎸 2. Full Singing Song Audio Link (MP3):
                    </span>
                    <a
                      href={resolvedDirectAudioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-teal-700 hover:underline font-mono truncate block"
                    >
                      {resolvedDirectAudioLink}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDirectAudioLink}
                    className="no-print px-2 py-1 rounded bg-stone-100 hover:bg-teal-100 text-teal-900 text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    {copiedAudioLink ? "✓ Copied" : "Copy"}
                  </button>
                </div>

                {/* Link 3: Spoken Blessing Audio Link */}
                {resolvedDirectNarrationLink && (
                  <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-teal-200">
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase text-teal-800 block">
                        🎙️ 3. Spoken Blessing Audio Link (Voice Narration):
                      </span>
                      <a
                        href={resolvedDirectNarrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-teal-700 hover:underline font-mono truncate block"
                      >
                        {resolvedDirectNarrationLink}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyDirectNarrationLink}
                      className="no-print px-2 py-1 rounded bg-stone-100 hover:bg-teal-100 text-teal-900 text-[10px] font-bold shrink-0 cursor-pointer"
                    >
                      {copiedNarrationLink ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Footer Line */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-300/70 text-[9px] font-mono text-slate-500 uppercase">
            <span>MYGIFTSONG.ORG • OFFICIAL GIFT SONG KEEPSAKE</span>
            <span>SCAN QR CODE OR CLICK LINK TO PLAY</span>
          </div>
        </div>
      </div>

      {/* PROMINENT PDF PRINT, WHATSAPP & EMAIL GIFT CARD ACTION BAR */}
      <div className="no-print rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 p-3.5 text-white space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Printer size={13} />
            <span>Print PDF Gift Card or Send via WhatsApp / Email</span>
          </span>
          <button
            type="button"
            onClick={handleCopyGiftCardWithAudioLink}
            className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            {copiedCardWithAudio ? <Check size={11} /> : <Copy size={11} />}
            <span>{copiedCardWithAudio ? "Copied All!" : "Copy Card + Links"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Printer size={14} />
            <span>Print / Save PDF Card</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppGiftShare}
            className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Share2 size={14} />
            <span>Send on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleEmailShare}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-teal-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Mail size={14} />
            <span>Send via Email</span>
          </button>
        </div>
      </div>

      {/* Notice & Edit Lyrics Option After Song Creation (Shown to Creator Only) */}
      {!isSharedRecipientView && (
        <div className="rounded-xl bg-amber-50/90 border border-amber-300 p-3 space-y-2 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 text-[11px] text-amber-950 leading-snug">
              <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>PLEASE CHECK LYRICS:</strong> Your exact words are included! Want to adjust any lines? Edit below:
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingCardLyrics(!isEditingCardLyrics)}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-teal-900 border border-amber-300 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-all shadow-2xs"
            >
              <Edit3 size={11} />
              <span>{isEditingCardLyrics ? "Close Editor" : "Edit Lyrics"}</span>
            </button>
          </div>

          {lyricsSavedNotice && (
            <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
              ✓ Lyrics updated! Your gift card and song now use your edited words.
            </p>
          )}

          {isEditingCardLyrics && (
            <div className="space-y-2 pt-1">
              <textarea
                rows={5}
                value={editableLyricsText}
                onChange={(e) => setEditableLyricsText(e.target.value)}
                placeholder="Edit your song lyrics here..."
                className="w-full rounded-xl bg-white border border-teal-400 px-3 py-2 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveEditedLyrics(false)}
                  className="flex-1 py-2 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  💾 Save Edited Lyrics
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditedLyrics(true)}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer transition-all"
                >
                  🎸 Save &amp; Re-Sing Song
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10-Second Personal Greeting & Song Video Card (Real Yosia / Haddi Photo + 10s Spoken/Sung Greeting) */}
      <div className="rounded-2xl border-2 border-teal-500/80 bg-gradient-to-b from-teal-50/70 to-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Film size={15} className="text-teal-700" />
            <span className="text-xs font-bold text-teal-950">
              10-Second Personal Birthday Video (Strict 10.0s)
            </span>
          </div>
          <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
            <button
              type="button"
              onClick={() => {
                stop10sPreview();
                setTenSecAudioMode("songClip");
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                tenSecAudioMode === "songClip"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🎸 10s Sung Song
            </button>
            <button
              type="button"
              onClick={() => {
                stop10sPreview();
                setTenSecAudioMode("spokenGreeting");
              }}
              className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                tenSecAudioMode === "spokenGreeting"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🎤 10s Spoken Intro
            </button>
          </div>
        </div>

        {/* Character Switcher: Haddi vs. Yosia + Theme + Video Play Trigger (Creator Mode Only) */}
        {!isSharedRecipientView && (
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setCustomCharacterImage(null);
                  setCharacterChoice("haddi");
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  characterChoice === "haddi"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎸 Haddi
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomCharacterImage(null);
                  setCharacterChoice("yosia");
                }}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  characterChoice === "yosia"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👦 Yosia
              </button>
            </div>

            <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200">
              <button
                type="button"
                onClick={() => setCardTheme("birthday")}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  cardTheme === "birthday"
                    ? "bg-amber-500 text-slate-950 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎂 B-Day
              </button>
              <button
                type="button"
                onClick={() => setCardTheme("blessing")}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  cardTheme === "blessing"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎁 Bless
              </button>
            </div>

            <button
              type="button"
              onClick={handleStart10sPreview}
              className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white p-1 border border-teal-800 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
              title="Play 10-Second Personal Greeting Video"
            >
              🎥 {isPreviewing10sVideo ? `Stop (${videoCountdown}s)` : "Play 10s"}
            </button>
          </div>
        )}

        {/* Editable 10-Second Personal Greeting Script */}
        <div className="rounded-xl bg-white/95 border border-teal-200 px-3 py-2 text-left space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800">
              💬 {characterChoice === "yosia" ? "Yosia's" : "Haddi's"} 10-Second Personal Greeting:
            </span>
            {!isSharedRecipientView && (
              <button
                type="button"
                onClick={() => setIsEditingGreetingScript(!isEditingGreetingScript)}
                className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
              >
                {isEditingGreetingScript ? "Done" : "Customize Greeting"}
              </button>
            )}
          </div>

          {isEditingGreetingScript && !isSharedRecipientView ? (
            <div className="space-y-1.5">
              <textarea
                rows={2}
                value={greetingScript}
                onChange={(e) => setGreetingScript(e.target.value)}
                className="w-full rounded-lg border border-teal-300 px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setIsEditingGreetingScript(false);
                  handleGenerate10sPersonalGreeting(true);
                }}
                disabled={isGenerating10sGreeting}
                className="w-full py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold cursor-pointer"
              >
                🎤 Update &amp; Play 10-Second Greeting
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-800 font-medium italic">
              &ldquo;{greetingScript}&rdquo;
            </p>
          )}
        </div>

        {/* Interactive 10-Second Studio Video Canvas (Uses Real Yosia/Haddi Photo — No Cartoon!) */}
        <div
          onClick={handleStart10sPreview}
          title="Click to play 10-second personal birthday greeting video"
          className="relative rounded-xl overflow-hidden border border-teal-900/20 bg-slate-950 shadow-inner cursor-pointer group"
        >
          <canvas
            ref={canvasRef}
            width={520}
            height={440}
            className="w-full h-auto block"
          />

          {!isSharedRecipientView && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5"
            >
              <label className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/85 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer backdrop-blur-xs border border-white/25">
                <Upload size={11} />
                <span>{customCharacterImage ? "Change Yosia/Haddi Photo" : "Upload Yosia/Haddi Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Play 10s Greeting Video & Download 10s Video Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleStart10sPreview}
            disabled={isGenerating10sGreeting}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs disabled:opacity-50"
          >
            {isPreviewing10sVideo ? (
              <>
                <Pause size={14} className="text-teal-700" />
                <span>Stop 10s Greeting ({videoCountdown}s)</span>
              </>
            ) : (
              <>
                <Play size={14} className="text-teal-700" fill="currentColor" />
                <span>{isGenerating10sGreeting ? "Recording..." : "Play 10s Greeting Video"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRecordAndDownload10sVideo}
            disabled={isRecording10sVideo || isGenerating10sGreeting}
            className="py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            {isRecording10sVideo ? (
              <>
                <Sparkles size={14} className="animate-spin text-amber-300" />
                <span>Recording ({videoCountdown}s)...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Download 10s Video</span>
              </>
            )}
          </button>
        </div>

        {/* Direct 10-Second Greeting Audio Player (Verify Voice + Guitar Track) */}
        {tenSecGreetingAudioUrl && (
          <div className="rounded-xl bg-white border border-teal-200 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-teal-900">
              <span>
                🎤 {characterChoice === "yosia" ? "Yosia's" : "Haddi's"} 10-Second Spoken &amp; Guitar Audio Track:
              </span>
              <span className="text-emerald-700 font-mono">● 10s Ready</span>
            </div>
            <audio
              controls
              src={tenSecGreetingAudioUrl}
              className="w-full h-8 accent-teal-700"
            />
          </div>
        )}

        {recordedVideoUrl && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-950">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Check size={14} className="text-emerald-700 shrink-0" />
                <span>10s Greeting Video Ready! Attach to WhatsApp or Email:</span>
              </span>
              <a
                href={recordedVideoUrl}
                download={`${recipientName.replace(/\s+/g, "_")}_10s_Birthday_Greeting_Video.webm`}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-bold shrink-0 hover:bg-emerald-800"
              >
                Save Again
              </a>
            </div>
            <video
              src={recordedVideoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full rounded-lg border border-emerald-300 bg-slate-950"
            />
          </div>
        )}
      </div>

      {/* Dual Option Switcher: Option 1 (Lyria 3 Sung Song) & Option 2 (Haddi Spoken Narration) */}
      {(lyriaAudioUrl || narrationAudioUrl || audioUrl) && (
        <div className="grid grid-cols-2 gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            type="button"
            onClick={() => handleTrackSwitch("lyria")}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTrack === "lyria"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🎸 Full Sung Song
          </button>
          <button
            type="button"
            onClick={() => handleTrackSwitch("narration")}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedTrack === "narration"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🎙️ Spoken Blessing
          </button>
        </div>
      )}

      {/* Main Song Audio Player */}
      {resolvedAudioSource && (
        <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-teal-900">
            <span className="flex items-center gap-1">
              <Music size={12} className="text-teal-700" />
              <span>Full Custom Song Audio</span>
            </span>
            <a
              href={resolvedDirectAudioLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 hover:underline font-mono text-[10px]"
            >
              🔊 Open Direct Audio Link ↗
            </a>
          </div>
          <audio
            controls
            src={resolvedAudioSource}
            className="w-full h-10 accent-teal-700"
          />
        </div>
      )}

      {/* Lyrics + Audio Link Preview Box on the Gift Card */}
      <div className="p-4 bg-stone-50/80 rounded-xl max-h-48 overflow-y-auto text-xs text-slate-700 border border-stone-200/80 leading-relaxed space-y-2">
        <div className="pb-2 border-b border-stone-200 not-italic font-sans space-y-1">
          <p className="text-[11px] font-bold text-teal-800">
            🔊 Direct Link to Song Audio:
          </p>
          <a
            href={resolvedDirectAudioLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-teal-700 underline break-all block"
          >
            {resolvedDirectAudioLink}
          </a>
        </div>
        <div className="italic whitespace-pre-line">{editableLyricsText || lyrics}</div>
      </div>

      {/* Share & Send Gift Card Actions: WhatsApp, Email, Download Audio, Copy Link */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block text-center">
          Send Gift Card, Lyrics &amp; Direct Audio Link
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleWhatsAppGiftShare}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Share2 size={14} />
            <span>Send on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleEmailShare}
            className="py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Mail size={14} />
            <span>Send via Email</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {resolvedAudioSource ? (
            <a
              href={resolvedAudioSource}
              download={`${recipientName.replace(/\s+/g, "_")}_Gift_Song.${
                resolvedAudioSource.startsWith("data:audio/mpeg") ||
                resolvedAudioSource.startsWith("data:audio/mp3")
                  ? "mp3"
                  : "wav"
              }`}
              className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-200 font-semibold rounded-xl text-center text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Download size={13} />
              <span>Download Song Audio</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="py-2 px-3 bg-stone-100 text-slate-400 font-semibold rounded-xl text-center text-xs cursor-not-allowed"
            >
              Audio Unavailable
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyDirectAudioLink}
            className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-200 font-semibold rounded-xl text-center text-xs transition-colors cursor-pointer"
          >
            {copiedAudioLink ? "✓ Audio Link Copied!" : "Copy Direct Audio Link"}
          </button>
        </div>
      </div>
    </div>
  );
};

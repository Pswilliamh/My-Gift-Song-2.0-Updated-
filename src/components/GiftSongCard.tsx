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
}

function extractCleanUserWords(rawContext?: string): string {
  if (!rawContext) return "";
  const trimmed = rawContext.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/(?:Desired Words & Lyrics|Words|Lyrics|Memory|Special Message):\s*(.+)$/is);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed.replace(/^Occasion:\s*[^.\n]+[.\n]\s*/i, "").trim();
}

// Convert a data: URI or fetchable URL into an ArrayBuffer for Web Audio decoding
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
  const resp = await fetch(src);
  return await resp.arrayBuffer();
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
}) => {
  const [selectedTrack, setSelectedTrack] = useState<"lyria" | "narration">(activeTrackType);
  const [copiedSongLink, setCopiedSongLink] = useState(false);
  const [copiedAudioLink, setCopiedAudioLink] = useState(false);
  const [copiedCardWithAudio, setCopiedCardWithAudio] = useState(false);
  const [cardQrTarget, setCardQrTarget] = useState<"song" | "audio">("song");

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
    buildDefaultGreetingScript(artistPersona, "birthday", recipientName, userWords)
  );
  const [isEditingGreetingScript, setIsEditingGreetingScript] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
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

  const resolvedDirectAudioLink =
    directAudioUrl
      ? directAudioUrl.startsWith("http")
        ? directAudioUrl
        : `${basePublicUrl}${directAudioUrl}`
      : songId
      ? `${basePublicUrl}/api/songs/${encodeURIComponent(songId)}/audio`
      : resolvedAudioSource && !resolvedAudioSource.startsWith("data:")
      ? resolvedAudioSource.startsWith("http")
        ? resolvedAudioSource
        : `${basePublicUrl}${resolvedAudioSource}`
      : resolvedShareableSongUrl;

  const handleTrackSwitch = (type: "lyria" | "narration") => {
    setSelectedTrack(type);
    if (onSelectTrackType) {
      onSelectTrackType(type);
    }
  };

  // Load real Yosia or Haddi photo onto canvas (Never use a generic cartoon!)
  useEffect(() => {
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
    } else if (characterChoice === "yosia") {
      img.src = savedYosia || "/images/yosia-boy.png";
    } else {
      img.src = "/images/guiter-rescaled-9music.png";
    }

    img.onload = () => {
      loadedImageRef.current = img;
    };
    img.onerror = () => {
      // Fallback to secondary real photo if primary path fails
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "anonymous";
      fallbackImg.src = "/images/guiter-rescaled-9music.png";
      fallbackImg.onload = () => {
        loadedImageRef.current = fallbackImg;
      };
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
      const response = await fetch("/api/generate-10s-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          artistPersona: characterChoice,
          cardTheme,
          userWords: cleanUserWords,
          customGreetingText: greetingScript,
          shareId: songId,
        }),
      });
      const data = await response.json();
      const newGreetingUrl = data?.audioDataUrl || data?.audioUrl || null;
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

    if (loadedImageRef.current) {
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

    // 5. Synchronized 10-Second Greeting & Lyric Caption Box
    const greetingChunks: string[] = [];
    const words = (greetingScript || "").split(/\s+/).filter(Boolean);
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

    const cycleSec = t % 10;
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

    modeStartRef.current = performance.now();
    setVideoCountdown(10);
    setIsPreviewing10sVideo(true);

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

  // Play the 10-Second Personal Greeting Video ("Hi [Name], this is Yosia wishing you a happy blessed birthday!")
  const handleStart10sPreview = async () => {
    if (isPreviewing10sVideo) {
      stop10sPreview();
      return;
    }

    let activeGreetingUrl = tenSecGreetingAudioUrl || "";
    if (!activeGreetingUrl) {
      const generated = await handleGenerate10sPersonalGreeting(true);
      if (!generated && resolvedAudioSource) {
        await start10sPreviewWithSource(resolvedAudioSource);
      }
      return;
    }

    await start10sPreviewWithSource(activeGreetingUrl);
  };

  // Record & Export a real 10-Second Greeting Video (.webm) with Yosia/Haddi's 10s voice & guitar greeting baked in!
  const handleRecordAndDownload10sVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording10sVideo) return;

    stop10sPreview();
    pauseOtherPageAudio();

    let activeGreetingUrl = tenSecGreetingAudioUrl || "";
    if (!activeGreetingUrl) {
      const generated = await handleGenerate10sPersonalGreeting(false);
      if (generated) activeGreetingUrl = generated;
    }
    if (!activeGreetingUrl) {
      activeGreetingUrl = lyriaAudioUrl || audioUrl || resolvedAudioSource;
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

  // Construct a direct WhatsApp share link that opens the exact song AND provides the direct audio link
  const handleWhatsAppGiftShare = () => {
    const text = encodeURIComponent(
      `🎂🎵 *Happy Birthday ${recipientName}!* 🎁\n\n` +
        `💬 *${characterChoice === "yosia" ? "Yosia" : "Haddi"}'s Greeting:* "${greetingScript}"\n\n` +
        `🎶 *Song Title:* "${songTitle}"\n` +
        `👉 *Click to Listen to Your Song:* ${resolvedShareableSongUrl}\n` +
        `🔊 *Direct Audio Link:* ${resolvedDirectAudioLink}\n\n` +
        `📜 *Lyrics Preview:*\n${getHighlightLyrics().join("\n")}\n\n` +
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

  const handleCopyGiftCardWithAudioLink = () => {
    const fullGiftCardText =
      `🎁 CUSTOM GIFT SONG CARD FOR ${recipientName.toUpperCase()}\n` +
      `Song Title: "${songTitle}"\n` +
      `From: ${characterChoice === "yosia" ? "Yosia" : "Haddi"} (www.mygiftsong.org)\n\n` +
      `🎵 Listen to Your Song Here:\n${resolvedShareableSongUrl}\n\n` +
      `🔊 Direct Link to Song Audio:\n${resolvedDirectAudioLink}\n\n` +
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
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 p-6 text-slate-900 my-4 space-y-4">
      <div className="text-center">
        <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
          Custom {characterChoice === "yosia" ? "Yosia" : "Haddi"} Gift Card
        </span>
        <h3 className="text-xl font-display font-bold mt-2.5 text-slate-900">{songTitle}</h3>
        <p className="text-xs text-teal-700 font-medium mt-0.5">Dedicated to {recipientName}</p>
      </div>

      {/* PROMINENT DIRECT LINKS TO AUDIO & SONG (Included on Gift Card!) */}
      <div className="rounded-xl bg-teal-50/90 border border-teal-300 p-3.5 space-y-2.5 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
            <Link2 size={14} className="text-teal-700" />
            <span>Direct Link to Song &amp; Audio</span>
          </span>
          <button
            type="button"
            onClick={handleCopyGiftCardWithAudioLink}
            className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            {copiedCardWithAudio ? <Check size={11} /> : <Copy size={11} />}
            <span>{copiedCardWithAudio ? "Copied Card + Audio Link!" : "Copy Card + Audio Link"}</span>
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-teal-200">
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase text-teal-800 block">
                🎵 Song Page Link (Opens Your Song):
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
              className="px-2 py-1 rounded bg-stone-100 hover:bg-teal-100 text-teal-900 text-[10px] font-bold shrink-0 cursor-pointer"
            >
              {copiedSongLink ? "✓ Copied" : "Copy"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-teal-200">
            <div className="truncate">
              <span className="text-[10px] font-bold uppercase text-teal-800 block">
                🔊 Direct Audio Link (Listen / Download):
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
              className="px-2 py-1 rounded bg-stone-100 hover:bg-teal-100 text-teal-900 text-[10px] font-bold shrink-0 cursor-pointer"
            >
              {copiedAudioLink ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Scannable QR Code Badge for Physical Card / Phone Camera */}
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-teal-200 shadow-2xs">
          <div className="p-1.5 bg-white rounded-lg border border-stone-200 shrink-0">
            <QRCodeSVG
              value={
                cardQrTarget === "song"
                  ? `${resolvedShareableSongUrl}${resolvedShareableSongUrl.includes("?") ? "&" : "?"}autoplay=1`
                  : resolvedDirectAudioLink
              }
              size={76}
              level="M"
              fgColor="#0f766e"
              bgColor="#ffffff"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1 text-[11px] font-bold text-teal-950">
              <QrCode size={13} className="text-teal-700 shrink-0" />
              <span>Scan with Phone Camera to Play Song</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-snug">
              Included automatically on your Printable Keepsake Gift Card for physical birthday or blessing envelopes.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setCardQrTarget("song")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  cardQrTarget === "song"
                    ? "bg-teal-700 text-white"
                    : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                }`}
              >
                QR: Song + Lyrics
              </button>
              <button
                type="button"
                onClick={() => setCardQrTarget("audio")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  cardQrTarget === "audio"
                    ? "bg-teal-700 text-white"
                    : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                }`}
              >
                QR: Direct Audio
              </button>
              {onOpenPrintableCard && (
                <button
                  type="button"
                  onClick={onOpenPrintableCard}
                  className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Printer size={10} />
                  <span>Printable QR Card</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notice & Edit Lyrics Option After Song Creation */}
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

      {/* 10-Second Personal Greeting & Song Video Card (Real Yosia / Haddi Photo + 10s Spoken/Sung Greeting) */}
      <div className="rounded-2xl border-2 border-teal-500/80 bg-gradient-to-b from-teal-50/70 to-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Film size={15} className="text-teal-700" />
            <span className="text-xs font-bold text-teal-950">
              10-Second Personal Birthday Greeting Video
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleGenerate10sPersonalGreeting(true)}
            disabled={isGenerating10sGreeting}
            className="px-2.5 py-1 rounded-full bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="Generate or Refresh Yosia/Haddi's 10-second personal voice greeting"
          >
            <Volume2 size={11} />
            <span>
              {isGenerating10sGreeting
                ? "Recording 10s Greeting..."
                : `🎤 Record ${characterChoice === "yosia" ? "Yosia" : "Haddi"} 10s Greeting`}
            </span>
          </button>
        </div>

        {/* Character Switcher: Haddi vs. Yosia + Theme + Video Play Trigger */}
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

        {/* Editable 10-Second Personal Greeting Script */}
        <div className="rounded-xl bg-white/95 border border-teal-200 px-3 py-2 text-left space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800">
              💬 {characterChoice === "yosia" ? "Yosia's" : "Haddi's"} 10-Second Spoken &amp; Guitar Greeting:
            </span>
            <button
              type="button"
              onClick={() => setIsEditingGreetingScript(!isEditingGreetingScript)}
              className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
            >
              {isEditingGreetingScript ? "Done" : "Customize Greeting"}
            </button>
          </div>

          {isEditingGreetingScript ? (
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

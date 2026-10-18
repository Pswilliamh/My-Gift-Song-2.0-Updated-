import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Play,
  Pause,
  Download,
  Sparkles,
  Video,
  Upload,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  Share2,
  Camera,
  Maximize2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { LyricSection } from "../types";
import {
  apiFetchJson,
  resolveBackendMediaUrl,
  LIVE_BACKEND_ORIGINS,
} from "../utils/clientSongGenerator";

interface YosiaMusicVideoPlayerProps {
  songId?: string;
  songTitle: string;
  recipientName: string;
  audioUrl: string | null;
  lyrics: string;
  lyricSections?: LyricSection[];
  genre?: string;
  language?: string;
  artistPersona?: "yosia" | "haddi";
}

async function fetchVideoAudioBuffer(src: string): Promise<ArrayBuffer> {
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
    // try fallback origins
  }
  const pathPart = src.startsWith("http") ? new URL(src).pathname : src;
  for (const origin of LIVE_BACKEND_ORIGINS) {
    try {
      const r = await fetch(
        `${origin}${pathPart.startsWith("/") ? pathPart : `/${pathPart}`}`,
        { mode: "cors" }
      );
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

export const YosiaMusicVideoPlayer: React.FC<YosiaMusicVideoPlayerProps> = ({
  songTitle,
  recipientName,
  audioUrl,
  lyrics,
  lyricSections,
  genre = "Children's Joyful Acoustic Sing-Along",
  language = "English",
  artistPersona = "yosia",
}) => {
  const [persona, setPersona] = useState<"yosia" | "haddi">(artistPersona);
  const [aspectMode, setAspectMode] = useState<"16:9" | "9:16">("16:9");
  const [cameraMode, setCameraMode] = useState<
    "director" | "standing" | "fireside" | "celebration"
  >("director");
  const [exportLengthMode, setExportLengthMode] = useState<"full" | "30s">("full");

  const [isPlayingMv, setIsPlayingMv] = useState(false);
  const [isRecordingMv, setIsRecordingMv] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(60);
  const [recordedMvUrl, setRecordedMvUrl] = useState<string | null>(null);
  const [recordingTargetSec, setRecordingTargetSec] = useState(60);

  // Custom uploaded video or photo for the music video
  const [customVideoSrc, setCustomVideoSrc] = useState<string | null>(null);
  const [customPhotoSrc, setCustomPhotoSrc] = useState<string | null>(null);

  // Google Veo 3.1 AI Scene Generator state
  const [showVeoGenerator, setShowVeoGenerator] = useState(false);
  const [veoTheme, setVeoTheme] = useState<
    "fireside" | "birthday" | "worship" | "lullaby"
  >("fireside");
  const [isGeneratingVeo, setIsGeneratingVeo] = useState(false);
  const [veoStatusMessage, setVeoStatusMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackPhotoRef = useRef<HTMLImageElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const decodedBufferRef = useRef<{ src: string; buffer: AudioBuffer } | null>(
    null
  );
  const voiceEnergyRef = useRef<number>(0);
  const playStartTimestampRef = useRef<number>(0);
  const drawFrameRef = useRef<(elapsed: number, total: number) => void>(
    () => {}
  );

  useEffect(() => {
    setPersona(artistPersona);
  }, [artistPersona]);

  // Parse clean lyric lines and section labels for synchronized karaoke subtitles
  const parsedTimelineLines = React.useMemo(() => {
    if (lyricSections && lyricSections.length > 0) {
      const items: Array<{ section: string; line: string; chord: string }> = [];
      for (const sec of lyricSections) {
        if (sec.sectionName === "Intro") continue;
        const chords = sec.chords && sec.chords.length > 0 ? sec.chords : ["G", "C", "D", "G"];
        sec.lines.forEach((line, idx) => {
          const cleaned = line.trim();
          if (cleaned && !cleaned.startsWith("[")) {
            items.push({
              section: sec.sectionName,
              line: cleaned,
              chord: chords[idx % chords.length] || "G",
            });
          }
        });
      }
      if (items.length > 0) return items;
    }

    const rawLines = (lyrics || "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("["));

    if (rawLines.length === 0) {
      return [
        {
          section: "Verse 1",
          line: `Enjoy your celebration song, ${recipientName}!`,
          chord: "G",
        },
        {
          section: "Chorus",
          line: `Strumming joyful acoustic blessings for ${recipientName}`,
          chord: "C",
        },
      ];
    }

    const defaultChords = ["G", "C", "Em", "D", "C", "G", "Am", "D"];
    return rawLines.map((line, i) => ({
      section: i < 4 ? "Verse 1" : i < 8 ? "Chorus" : "Verse 2",
      line,
      chord: defaultChords[i % defaultChords.length],
    }));
  }, [lyrics, lyricSections, recipientName]);

  // Load real Yosia / Haddi source video & fallback photo
  useEffect(() => {
    const vid = document.createElement("video");
    vid.crossOrigin = "anonymous";
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = "auto";
    if (customVideoSrc) {
      vid.src = customVideoSrc;
    } else {
      vid.src =
        persona === "yosia"
          ? "/video/yosia-children.mp4?v=2"
          : "/video/song-gift.mp4";
    }
    vid.load();
    sourceVideoRef.current = vid;

    const img = new Image();
    img.crossOrigin = "anonymous";
    if (customPhotoSrc) {
      img.src = customPhotoSrc;
    } else {
      let savedPhoto: string | null = null;
      try {
        savedPhoto = localStorage.getItem("mygiftsong_yosia_photo_1");
      } catch {
        savedPhoto = null;
      }
      img.src =
        persona === "yosia" && savedPhoto
          ? savedPhoto
          : "/images/guiter-rescaled-9music.png";
    }
    img.onload = () => {
      fallbackPhotoRef.current = img;
    };

    return () => {
      try {
        vid.pause();
      } catch {
        // ignore
      }
    };
  }, [persona, customVideoSrc, customPhotoSrc]);

  // Pre-decode song audio buffer to get exact duration and enable smooth Web Audio visualization
  useEffect(() => {
    if (!audioUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const buf = await fetchVideoAudioBuffer(audioUrl);
        if (cancelled) return;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const tempCtx = new AudioCtx();
        const decoded = await tempCtx.decodeAudioData(buf.slice(0));
        await tempCtx.close().catch(() => {});
        if (!cancelled && decoded.duration > 1) {
          decodedBufferRef.current = { src: audioUrl, buffer: decoded };
          setTotalDurationSec(Math.round(decoded.duration));
        }
      } catch {
        // fallback duration
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  // Draw a single HD frame of the Full-Length Yosia Music Video
  const drawMusicVideoFrame = (elapsedSec: number, durationSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const t = elapsedSec;
    const safeTotal = Math.max(10, durationSec || totalDurationSec || 60);

    // Measure live voice/music energy from AnalyserNode
    let energy = 0;
    if (analyserRef.current && (isPlayingMv || isRecordingMv)) {
      const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(freqData);
      let sum = 0;
      for (let i = 0; i < freqData.length; i++) {
        sum += freqData[i];
      }
      energy = Math.min(1, sum / (freqData.length * 115));
      voiceEnergyRef.current = voiceEnergyRef.current * 0.72 + energy * 0.28;
    } else if (isPlayingMv || isRecordingMv) {
      voiceEnergyRef.current = 0.35 + Math.abs(Math.sin(t * 6.8)) * 0.45;
    } else {
      voiceEnergyRef.current = 0.1 + Math.abs(Math.sin(t * 2.1)) * 0.08;
    }
    const pulse = voiceEnergyRef.current;

    // Determine active lyric line & section based on song progress
    const totalLines = parsedTimelineLines.length;
    const lineIndex = Math.min(
      totalLines - 1,
      Math.floor((t / safeTotal) * totalLines)
    );
    const lineProgress = ((t / safeTotal) * totalLines) % 1;
    const activeItem = parsedTimelineLines[lineIndex] || {
      section: "Chorus",
      line: `Enjoy your celebration song, ${recipientName}!`,
      chord: "G",
    };
    const nextItem = parsedTimelineLines[lineIndex + 1] || null;

    // Determine active camera angle (Multi-Camera Director Cuts)
    const activeShot =
      cameraMode !== "director"
        ? cameraMode
        : t < 5
        ? "standing"
        : activeItem.section.toLowerCase().includes("chorus")
        ? "celebration"
        : Math.floor(t / 8) % 2 === 0
        ? "standing"
        : "fireside";

    // 1. Background Studio Atmosphere
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    if (activeShot === "fireside") {
      bgGrad.addColorStop(0, "#1c1917");
      bgGrad.addColorStop(0.5, "#431407");
      bgGrad.addColorStop(1, "#0f172a");
    } else if (activeShot === "celebration") {
      bgGrad.addColorStop(0, "#042f2e");
      bgGrad.addColorStop(0.5, "#0f766e");
      bgGrad.addColorStop(1, "#1e1b4b");
    } else {
      bgGrad.addColorStop(0, "#042f2e");
      bgGrad.addColorStop(0.5, "#115e59");
      bgGrad.addColorStop(1, "#0f172a");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Main Video Viewport Stage (Full Bleed Cinema with Rounded Frame)
    const pad = aspectMode === "16:9" ? 18 : 14;
    const stageX = pad;
    const stageY = pad;
    const stageW = W - pad * 2;
    const stageH = H - pad * 2;
    const centerX = W / 2;
    const centerY = H / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(stageX, stageY, stageW, stageH, 20);
    ctx.closePath();
    ctx.clip();

    const vidEl = sourceVideoRef.current;
    if (
      !customPhotoSrc &&
      vidEl &&
      vidEl.readyState >= 2 &&
      vidEl.videoWidth > 0
    ) {
      if (isPlayingMv || isRecordingMv) {
        if (vidEl.paused) {
          vidEl.play().catch(() => {});
        }
        try {
          vidEl.playbackRate = Math.max(
            0.82,
            Math.min(1.28, 0.9 + pulse * 0.35)
          );
        } catch {
          // ignore
        }
      } else if (!vidEl.paused) {
        vidEl.pause();
      }

      // Dynamic camera framing based on activeShot (Director multi-cam effect!)
      let cameraZoom = 1.02 + pulse * 0.03;
      let panOffsetX = Math.sin(t * 0.6) * 8;
      let panOffsetY = 0;

      if (activeShot === "fireside") {
        cameraZoom = 1.16 + pulse * 0.035;
        panOffsetX = Math.cos(t * 0.8) * 14;
        panOffsetY = -12;
      } else if (activeShot === "celebration") {
        cameraZoom = 1.1 + Math.sin(t * 1.5) * 0.03 + pulse * 0.04;
        panOffsetY = -6;
      }

      const scale =
        Math.max(stageW / vidEl.videoWidth, stageH / vidEl.videoHeight) *
        cameraZoom;
      const drawW = vidEl.videoWidth * scale;
      const drawH = vidEl.videoHeight * scale;
      ctx.drawImage(
        vidEl,
        centerX - drawW / 2 + panOffsetX,
        centerY - drawH / 2 + panOffsetY,
        drawW,
        drawH
      );
    } else if (fallbackPhotoRef.current) {
      const img = fallbackPhotoRef.current;
      const zoom = 1.05 + Math.sin(t * 1.2) * 0.03 + pulse * 0.04;
      const scale =
        Math.max(stageW / img.width, stageH / img.height) * zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(
        img,
        centerX - drawW / 2 + Math.sin(t * 0.9) * 10,
        centerY - drawH / 2 + Math.cos(t * 1.1) * 6,
        drawW,
        drawH
      );
    }

    // Warm cinematic lighting overlay for fireside / celebration shots
    if (activeShot === "fireside") {
      const fireGlow = ctx.createRadialGradient(
        W * 0.2,
        H * 0.75,
        20,
        W * 0.5,
        H * 0.5,
        W * 0.85
      );
      fireGlow.addColorStop(
        0,
        `rgba(251, 146, 60, ${0.22 + Math.sin(t * 9) * 0.06})`
      );
      fireGlow.addColorStop(1, "rgba(15, 23, 42, 0.35)");
      ctx.fillStyle = fireGlow;
      ctx.fillRect(stageX, stageY, stageW, stageH);
    } else if (activeShot === "celebration") {
      const goldGlow = ctx.createRadialGradient(
        W * 0.5,
        H * 0.25,
        20,
        W * 0.5,
        H * 0.5,
        W * 0.85
      );
      goldGlow.addColorStop(0, `rgba(250, 204, 21, ${0.18 + pulse * 0.12})`);
      goldGlow.addColorStop(1, "rgba(15, 23, 42, 0.3)");
      ctx.fillStyle = goldGlow;
      ctx.fillRect(stageX, stageY, stageW, stageH);
    }

    // Top & Bottom Cinema Gradients for crisp text legibility
    const topGrad = ctx.createLinearGradient(0, stageY, 0, stageY + 110);
    topGrad.addColorStop(0, "rgba(15, 23, 42, 0.86)");
    topGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(stageX, stageY, stageW, 110);

    const botGrad = ctx.createLinearGradient(
      0,
      stageY + stageH - 185,
      0,
      stageY + stageH
    );
    botGrad.addColorStop(0, "rgba(15, 23, 42, 0)");
    botGrad.addColorStop(0.45, "rgba(15, 23, 42, 0.78)");
    botGrad.addColorStop(1, "rgba(15, 23, 42, 0.95)");
    ctx.fillStyle = botGrad;
    ctx.fillRect(stageX, stageY + stageH - 185, stageW, 185);

    // 3. Floating Golden Musical Notes & Celebration Sparkles
    const notes = ["♪", "♫", "♬", "♩", "✨"];
    for (let i = 0; i < 6; i++) {
      const cycle = (t * 0.45 + i * 0.18) % 1;
      const nx =
        stageX +
        55 +
        ((i * (stageW - 110)) / 5) +
        Math.sin(t * 2.2 + i) * 18;
      const ny = stageY + stageH - 130 - cycle * 150;
      ctx.save();
      ctx.font = `bold ${16 + (i % 3) * 4}px sans-serif`;
      ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#5eead4";
      ctx.globalAlpha = Math.sin(cycle * Math.PI) * (0.55 + pulse * 0.4);
      ctx.fillText(notes[i % notes.length], nx, ny);
      ctx.restore();
    }

    // 4. Top Broadcast Header Pill (Song Title, Recipient, & Active Camera Badge)
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.beginPath();
    ctx.roundRect(stageX + 16, stageY + 14, stageW - 32, 58, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 11px monospace";
    const camBadge =
      activeShot === "fireside"
        ? "🔥 CAM 2 • FIRESIDE ACOUSTIC"
        : activeShot === "celebration"
        ? "✨ CAM 3 • CHORUS CLOSE-UP"
        : "🎬 CAM 1 • STUDIO STAGE";
    ctx.fillText(
      `👦🎸 ${persona === "yosia" ? "YOSIA OFFICIAL MUSIC VIDEO" : "HADDI OFFICIAL MUSIC VIDEO"} • ${camBadge}`,
      stageX + 30,
      stageY + 34
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    const headerTitle = `${songTitle} — For ${recipientName}`;
    ctx.fillText(
      headerTitle.length > 52 ? headerTitle.slice(0, 50) + "..." : headerTitle,
      stageX + 30,
      stageY + 56
    );

    // Chord & Section Pill on Top Right
    ctx.textAlign = "right";
    ctx.fillStyle = "#5eead4";
    ctx.font = "bold 11px monospace";
    ctx.fillText(
      `${activeItem.section.toUpperCase()} • CHORD: ${activeItem.chord}`,
      stageX + stageW - 28,
      stageY + 34
    );
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "11px sans-serif";
    ctx.fillText(
      `${genre} (${language})`,
      stageX + stageW - 28,
      stageY + 54
    );
    ctx.restore();

    // 5. Intro Dedication Overlay Banner (First 4.5 seconds of the Music Video)
    if (t < 4.5) {
      const introAlpha = t < 3.5 ? 1 : Math.max(0, 1 - (t - 3.5));
      ctx.save();
      ctx.globalAlpha = introAlpha;
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.roundRect(centerX - 210, stageY + 84, 420, 44, 22);
      ctx.fill();
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(
        `🎤 ${persona === "yosia" ? "Yosia" : "Haddi"}: "Enjoy your celebration song, ${recipientName}!"`,
        centerX,
        stageY + 111
      );
      ctx.restore();
    }

    // 6. Synchronized Sing-Along Karaoke Lyric Box at Bottom of Stage
    const boxX = stageX + 18;
    const boxY = stageY + stageH - 128;
    const boxW = stageW - 36;
    const boxH = 88;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(94, 234, 212, 0.55)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.textAlign = "center";
    // Active Lyric Line
    const currentLineStr =
      activeItem.line.length > 64
        ? activeItem.line.slice(0, 62) + "..."
        : activeItem.line;
    ctx.font = "bold 17px sans-serif";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(currentLineStr, centerX, boxY + 34);

    // Bouncing Sing-Along Golden Note above active word
    const measuredW = Math.min(boxW - 60, ctx.measureText(currentLineStr).width);
    const ballX = centerX - measuredW / 2 + lineProgress * measuredW;
    const ballY = boxY + 14 - Math.abs(Math.sin(t * 11)) * 6;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Next Lyric Line Preview
    if (nextItem) {
      const nextLineStr =
        nextItem.line.length > 68
          ? nextItem.line.slice(0, 66) + "..."
          : nextItem.line;
      ctx.font = "italic 13.5px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
      ctx.fillText(nextLineStr, centerX, boxY + 60);
    } else {
      ctx.font = "italic 13px sans-serif";
      ctx.fillStyle = "rgba(254, 240, 138, 0.85)";
      ctx.fillText(
        `✨ Enjoy your celebration song, ${recipientName}! • www.mygiftsong.org ✨`,
        centerX,
        boxY + 60
      );
    }

    // Song Progress Bar inside Lyric Box
    const progW = boxW - 36;
    const progRatio = Math.min(1, Math.max(0, t / safeTotal));
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.roundRect(boxX + 18, boxY + boxH - 13, progW, 5, 3);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(boxX + 18, boxY + boxH - 13, Math.max(8, progW * progRatio), 5, 3);
    ctx.fill();
    ctx.restore();

    // 7. Bottom Equalizer & Timecode Bar
    const barCount = 20;
    const eqWidth = 200;
    const eqStart = centerX - eqWidth / 2;
    for (let b = 0; b < barCount; b++) {
      const amp = (isPlayingMv || isRecordingMv ? 14 : 4) + pulse * 12;
      const bh = 4 + Math.abs(Math.sin(t * 8.2 + b * 0.55)) * amp;
      ctx.fillStyle = b % 2 === 0 ? "#fbbf24" : "#2dd4bf";
      ctx.fillRect(eqStart + b * 10, stageY + stageH - 20 - bh / 2, 5, bh);
    }

    const formatMmSs = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    ctx.fillStyle = "#ccfbf1";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(
      `▶ ${formatMmSs(t)} / ${formatMmSs(safeTotal)}`,
      stageX + 22,
      stageY + stageH - 14
    );

    ctx.textAlign = "right";
    ctx.fillText("www.mygiftsong.org", stageX + stageW - 22, stageY + stageH - 14);

    ctx.restore();

    // Glowing Gold Border around Stage
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(stageX, stageY, stageW, stageH, 20);
    ctx.strokeStyle =
      isPlayingMv || isRecordingMv ? "#fbbf24" : "rgba(251, 191, 36, 0.65)";
    ctx.lineWidth = 2.5 + pulse * 2.5;
    ctx.stroke();
    ctx.restore();
  };

  drawFrameRef.current = drawMusicVideoFrame;

  // Continuous 30fps animation loop for preview & idle rendering
  useEffect(() => {
    if (isRecordingMv) return;
    let rafId: number;

    const tick = (now: number) => {
      if (isPlayingMv) {
        let elapsed = (now - playStartTimestampRef.current) / 1000;
        if (audioElRef.current && !audioElRef.current.paused) {
          elapsed = audioElRef.current.currentTime;
        }
        setCurrentTimeSec(elapsed);
        if (elapsed >= totalDurationSec) {
          stopMusicVideoPlayback();
          return;
        }
        drawFrameRef.current(elapsed, totalDurationSec);
      } else {
        const idleElapsed = ((now / 1000) % 12);
        drawFrameRef.current(currentTimeSec || idleElapsed * 0.2, totalDurationSec);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingMv, isRecordingMv, totalDurationSec, currentTimeSec, aspectMode, cameraMode]);

  const stopMusicVideoPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    if (sourceVideoRef.current) {
      try {
        sourceVideoRef.current.pause();
      } catch {
        // ignore
      }
    }
    setIsPlayingMv(false);
    setCurrentTimeSec(0);
  };

  const handleTogglePlayMusicVideo = async () => {
    if (isPlayingMv) {
      stopMusicVideoPlayback();
      return;
    }
    if (!audioUrl) return;

    // Pause any other <audio> elements on the page so only the Music Video plays
    if (typeof document !== "undefined") {
      document.querySelectorAll("audio").forEach((a) => {
        try {
          a.pause();
        } catch {
          // ignore
        }
      });
    }

    if (sourceVideoRef.current) {
      sourceVideoRef.current.currentTime = 0;
      sourceVideoRef.current.play().catch(() => {});
    }

    playStartTimestampRef.current = performance.now();
    setCurrentTimeSec(0);
    setIsPlayingMv(true);

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      let cached = decodedBufferRef.current;
      if (!cached || cached.src !== audioUrl) {
        const buf = await fetchVideoAudioBuffer(audioUrl);
        const decoded = await ctx.decodeAudioData(buf.slice(0));
        cached = { src: audioUrl, buffer: decoded };
        decodedBufferRef.current = cached;
        setTotalDurationSec(Math.round(decoded.duration));
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const gainNode = ctx.createGain();
      gainNode.gain.value = isMuted ? 0 : 1;

      const srcNode = ctx.createBufferSource();
      srcNode.buffer = cached.buffer;
      srcNode.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(ctx.destination);
      srcNode.start(0);

      srcNode.onended = () => {
        setIsPlayingMv(false);
        setCurrentTimeSec(0);
      };

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = srcNode;
    } catch {
      const audio = new Audio(audioUrl);
      audio.muted = isMuted;
      audioElRef.current = audio;
      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setTotalDurationSec(Math.round(audio.duration));
        }
      };
      audio.onended = () => {
        setIsPlayingMv(false);
        setCurrentTimeSec(0);
      };
      audio.play().catch(() => {});
    }
  };

  // Record & Export a real downloadable Music Video (.webm) with the full custom song audio + Yosia video + lyrics!
  const handleRecordAndDownloadMusicVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioUrl || isRecordingMv) return;

    stopMusicVideoPlayback();
    if (typeof document !== "undefined") {
      document.querySelectorAll("audio").forEach((a) => {
        try {
          a.pause();
        } catch {
          // ignore
        }
      });
    }

    setIsRecordingMv(true);
    setRecordedMvUrl(null);

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      let cached = decodedBufferRef.current;
      if (!cached || cached.src !== audioUrl) {
        const buf = await fetchVideoAudioBuffer(audioUrl);
        const decoded = await ctx.decodeAudioData(buf.slice(0));
        cached = { src: audioUrl, buffer: decoded };
        decodedBufferRef.current = cached;
      }

      const fullAudioSec = Math.round(cached.buffer.duration || 60);
      const targetRecordSec =
        exportLengthMode === "30s"
          ? Math.min(30, fullAudioSec)
          : fullAudioSec;
      setRecordingTargetSec(targetRecordSec);
      setTotalDurationSec(fullAudioSec);

      if (sourceVideoRef.current) {
        sourceVideoRef.current.currentTime = 0;
        sourceVideoRef.current.play().catch(() => {});
      }

      const canvasStream = canvas.captureStream(30);
      const destNode = ctx.createMediaStreamDestination();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const srcNode = ctx.createBufferSource();
      srcNode.buffer = cached.buffer;
      srcNode.connect(analyser);
      analyser.connect(destNode);
      if (!isMuted) {
        analyser.connect(ctx.destination);
      }
      srcNode.start(0, 0, targetRecordSec);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destNode.stream.getAudioTracks(),
      ]);

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
        setRecordedMvUrl(url);
        setIsRecordingMv(false);
        setCurrentTimeSec(0);

        try {
          srcNode.stop();
        } catch {
          // ignore
        }
        analyserRef.current = null;
        ctx.close().catch(() => {});
        if (sourceVideoRef.current) {
          sourceVideoRef.current.pause();
        }

        const a = document.createElement("a");
        a.href = url;
        a.download = `${recipientName.replace(/\s+/g, "_")}_${
          persona === "yosia" ? "Yosia" : "Haddi"
        }_Music_Video.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      recorder.start(250);
      const recordStart = performance.now();

      const stepRecord = (now: number) => {
        const elapsed = (now - recordStart) / 1000;
        setCurrentTimeSec(Math.min(targetRecordSec, elapsed));
        drawFrameRef.current(elapsed, fullAudioSec);

        if (elapsed < targetRecordSec && recorder.state === "recording") {
          requestAnimationFrame(stepRecord);
        } else if (recorder.state !== "inactive") {
          recorder.stop();
        }
      };

      requestAnimationFrame(stepRecord);
    } catch (err) {
      console.warn("Music video export error:", err);
      setIsRecordingMv(false);
    }
  };

  // Generate a custom AI 3D animated scene of Yosia using Google Veo 3.1
  const handleGenerateVeoScene = async () => {
    if (isGeneratingVeo) return;
    setIsGeneratingVeo(true);
    setVeoStatusMessage(
      "🎬 Step 1/3: Starting Google Veo 3.1 3D Animation for Yosia..."
    );

    try {
      const startRes = await apiFetchJson("/api/generate-yosia-veo-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneTheme: veoTheme,
          aspectRatio: aspectMode,
        }),
      });

      if (!startRes?.operationName) {
        setVeoStatusMessage(
          startRes?.error ||
            "Using built-in HD Yosia Studio Video (Veo 3.1 requires a paid Gemini API key)."
        );
        setIsGeneratingVeo(false);
        return;
      }

      const opName = startRes.operationName;
      setVeoStatusMessage(
        "✨ Step 2/3: Google Veo 3.1 is animating Yosia playing guitar (takes ~1–2 mins)..."
      );

      let isDone = false;
      for (let attempt = 0; attempt < 36; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const statusRes = await apiFetchJson("/api/yosia-veo-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: opName }),
        });
        if (statusRes?.done) {
          isDone = true;
          break;
        }
      }

      if (!isDone) {
        setVeoStatusMessage(
          "Veo 3.1 scene is still rendering in the cloud; using Studio HD Yosia footage for now."
        );
        setIsGeneratingVeo(false);
        return;
      }

      setVeoStatusMessage("🎥 Step 3/3: Downloading new Yosia AI Video Scene...");
      const resp = await fetch(resolveBackendMediaUrl("/api/yosia-veo-download"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName: opName }),
      });

      if (resp.ok) {
        const videoBlob = await resp.blob();
        const videoObjectUrl = URL.createObjectURL(videoBlob);
        setCustomVideoSrc(videoObjectUrl);
        setCustomPhotoSrc(null);
        setVeoStatusMessage(
          "✓ Custom Google Veo 3.1 Yosia scene loaded into the Music Video Player!"
        );
      } else {
        setVeoStatusMessage(
          "Could not fetch Veo stream; using Studio HD Yosia footage."
        );
      }
    } catch {
      setVeoStatusMessage(
        "Using built-in HD Yosia Studio Video for instant Music Video playback."
      );
    } finally {
      setIsGeneratingVeo(false);
    }
  };

  const handleUploadCustomMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setCustomVideoSrc(url);
      setCustomPhotoSrc(null);
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setCustomPhotoSrc(ev.target.result as string);
          setCustomVideoSrc(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const canvasWidth = aspectMode === "16:9" ? 768 : 432;
  const canvasHeight = aspectMode === "16:9" ? 432 : 768;

  return (
    <div className="rounded-2xl border-2 border-teal-600 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-4 sm:p-6 text-white space-y-4 shadow-lg">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800/80 pb-3.5">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-mono font-extrabold uppercase tracking-wider">
            <Film size={12} />
            <span>NEW • FULL-LENGTH REAL MUSIC VIDEO STUDIO</span>
          </div>
          <h3 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
            <span>
              🎬 {persona === "yosia" ? "Yosia's" : "Haddi's"} Real Music Video
              for {recipientName}
            </span>
          </h3>
          <p className="text-xs text-teal-200/90">
            Synchronizes {persona === "yosia" ? "Yosia's" : "Haddi's"} real
            studio guitar &amp; singing performance with your full custom song
            audio &amp; karaoke lyrics!
          </p>
        </div>

        {/* Aspect Ratio & Performer Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-800/90 p-0.5 rounded-xl border border-teal-700/60">
            <button
              type="button"
              onClick={() => setPersona("yosia")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                persona === "yosia"
                  ? "bg-teal-500 text-slate-950 shadow-2xs"
                  : "text-teal-200 hover:text-white"
              }`}
            >
              👦🎸 Yosia
            </button>
            <button
              type="button"
              onClick={() => setPersona("haddi")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                persona === "haddi"
                  ? "bg-teal-500 text-slate-950 shadow-2xs"
                  : "text-teal-200 hover:text-white"
              }`}
            >
              🎸 Haddi
            </button>
          </div>

          <div className="inline-flex bg-slate-800/90 p-0.5 rounded-xl border border-teal-700/60">
            <button
              type="button"
              onClick={() => setAspectMode("16:9")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                aspectMode === "16:9"
                  ? "bg-amber-400 text-slate-950"
                  : "text-teal-200 hover:text-white"
              }`}
              title="16:9 Widescreen Music Video (YouTube / TV / Desktop)"
            >
              <Monitor size={12} />
              <span>16:9 HD</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectMode("9:16")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                aspectMode === "9:16"
                  ? "bg-amber-400 text-slate-950"
                  : "text-teal-200 hover:text-white"
              }`}
              title="9:16 Vertical Music Video (WhatsApp / Reels / TikTok)"
            >
              <Smartphone size={12} />
              <span>9:16 Reel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Director Angle Selector & Custom Video/Veo Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-teal-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mr-1">
            <Camera size={13} />
            <span>Camera Angles:</span>
          </span>
          {[
            { id: "director", label: "🎬 Auto Multi-Cam Cuts" },
            { id: "standing", label: "🎤 Studio Stage" },
            { id: "fireside", label: "🔥 Cozy Fireside" },
            { id: "celebration", label: "✨ Chorus Close-Up" },
          ].map((cam) => (
            <button
              key={cam.id}
              type="button"
              onClick={() =>
                setCameraMode(
                  cam.id as "director" | "standing" | "fireside" | "celebration"
                )
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
                cameraMode === cam.id
                  ? "bg-teal-600 text-white border border-teal-400"
                  : "bg-slate-800 text-teal-100 hover:bg-slate-700"
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-100 border border-teal-700/60 text-[11px] font-semibold flex items-center gap-1 cursor-pointer">
            <Upload size={11} />
            <span>Upload Video/Photo</span>
            <input
              type="file"
              accept="video/*,image/*"
              onChange={handleUploadCustomMedia}
              className="hidden"
            />
          </label>

          {(customVideoSrc || customPhotoSrc) && (
            <button
              type="button"
              onClick={() => {
                setCustomVideoSrc(null);
                setCustomPhotoSrc(null);
              }}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-900/60 text-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Reset to default Yosia HD studio video"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowVeoGenerator(!showVeoGenerator)}
            className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles size={11} />
            <span>AI Scene (Veo 3.1)</span>
          </button>
        </div>
      </div>

      {/* Optional Google Veo 3.1 Custom 3D Scene Generator Drawer */}
      {showVeoGenerator && (
        <div className="rounded-xl bg-slate-950/90 border border-amber-400/40 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>
                Google Veo 3.1 — Generate Custom 3D Animated Yosia Scene
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowVeoGenerator(false)}
              className="text-[11px] text-teal-300 hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Want a fresh AI-generated 3D scene of Yosia strumming his guitar for
            this song? Pick a scene below or use our instant Studio HD Yosia
            footage right away:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "fireside", label: "🔥 Cozy Fireplace Guitar" },
              { id: "birthday", label: "🎂 Birthday Balloons Studio" },
              { id: "worship", label: "🙏 Sunlit Worship Stage" },
              { id: "lullaby", label: "🌙 Starlight Bedtime Window" },
            ].map((tItem) => (
              <button
                key={tItem.id}
                type="button"
                onClick={() =>
                  setVeoTheme(
                    tItem.id as "fireside" | "birthday" | "worship" | "lullaby"
                  )
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  veoTheme === tItem.id
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {tItem.label}
              </button>
            ))}

            <button
              type="button"
              disabled={isGeneratingVeo}
              onClick={handleGenerateVeoScene}
              className="ml-auto px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Video size={13} />
              <span>
                {isGeneratingVeo
                  ? "Animating Scene..."
                  : "Generate Veo 3.1 Scene"}
              </span>
            </button>
          </div>
          {veoStatusMessage && (
            <p className="text-[11px] text-amber-200 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              {veoStatusMessage}
            </p>
          )}
        </div>
      )}

      {/* Main Interactive Music Video Canvas Viewport */}
      <div
        onClick={handleTogglePlayMusicVideo}
        title="Click to Play / Pause Full Yosia Music Video"
        className={`relative mx-auto rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-slate-950 shadow-xl cursor-pointer ${
          aspectMode === "9:16" ? "max-w-[340px]" : "w-full"
        }`}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-auto block"
        />

        {/* Center Play Overlay Button when Paused */}
        {!isPlayingMv && !isRecordingMv && (
          <div className="absolute inset-0 bg-slate-950/25 hover:bg-slate-950/10 flex flex-col items-center justify-center gap-2.5 transition-all">
            <div className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-xl transition-transform hover:scale-105">
              <Play size={30} fill="currentColor" className="ml-1" />
            </div>
            <span className="px-4 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/60 text-amber-200 text-xs font-bold shadow-md">
              ▶ Watch Full {persona === "yosia" ? "Yosia" : "Haddi"} Music Video
              ({totalDurationSec}s)
            </span>
          </div>
        )}
      </div>

      {/* Playback & Real Music Video Export Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
        <button
          type="button"
          onClick={handleTogglePlayMusicVideo}
          disabled={!audioUrl || isRecordingMv}
          className="sm:col-span-4 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
        >
          {isPlayingMv ? (
            <>
              <Pause size={16} fill="currentColor" />
              <span>
                Pause Music Video ({Math.floor(currentTimeSec)}s /{" "}
                {totalDurationSec}s)
              </span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>
                Watch Full {persona === "yosia" ? "Yosia" : "Haddi"} Music Video
              </span>
            </>
          )}
        </button>

        {/* Export Duration Mode Selector */}
        <div className="sm:col-span-3 flex bg-slate-800/90 p-1 rounded-xl border border-teal-700/60">
          <button
            type="button"
            onClick={() => setExportLengthMode("full")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              exportLengthMode === "full"
                ? "bg-teal-600 text-white"
                : "text-teal-200 hover:text-white"
            }`}
          >
            Full Song ({totalDurationSec}s)
          </button>
          <button
            type="button"
            onClick={() => setExportLengthMode("30s")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
              exportLengthMode === "30s"
                ? "bg-teal-600 text-white"
                : "text-teal-200 hover:text-white"
            }`}
          >
            30s Reel Clip
          </button>
        </div>

        {/* Record & Download Real Music Video File Button */}
        <button
          type="button"
          onClick={handleRecordAndDownloadMusicVideo}
          disabled={!audioUrl || isRecordingMv}
          className="sm:col-span-4 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
        >
          {isRecordingMv ? (
            <>
              <Sparkles size={16} className="animate-spin" />
              <span>
                Rendering Video ({Math.floor(currentTimeSec)}s /{" "}
                {recordingTargetSec}s)...
              </span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>
                Download Real Music Video (
                {exportLengthMode === "30s" ? "30s" : "Full"})
              </span>
            </>
          )}
        </button>

        {/* Mute Toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="sm:col-span-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-200 border border-teal-700/60 flex items-center justify-center cursor-pointer"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Downloaded Music Video Preview & Save Box */}
      {recordedMvUrl && (
        <div className="rounded-xl bg-emerald-950/90 border border-emerald-400/60 p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-emerald-200 flex items-center gap-1.5">
              <Check size={15} className="text-emerald-400" />
              <span>
                ✓ {persona === "yosia" ? "Yosia's" : "Haddi's"} Real Music Video
                for {recipientName} is Ready!
              </span>
            </span>
            <div className="flex items-center gap-2">
              <a
                href={recordedMvUrl}
                download={`${recipientName.replace(/\s+/g, "_")}_${
                  persona === "yosia" ? "Yosia" : "Haddi"
                }_Music_Video.webm`}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Save Video File</span>
              </a>
            </div>
          </div>
          <video
            src={recordedMvUrl}
            controls
            playsInline
            className="w-full max-h-72 rounded-lg border border-emerald-500/40 bg-black mx-auto"
          />
        </div>
      )}
    </div>
  );
};

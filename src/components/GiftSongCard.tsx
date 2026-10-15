import React, { useState, useEffect, useRef } from "react";
import { Film, Play, Pause, Download, Mail, Share2, Sparkles, Upload, Check } from "lucide-react";

interface GiftSongCardProps {
  audioUrl: string | null;
  lyrics: string;
  userWords?: string;
  recipientName?: string;
  songTitle?: string;
  lyriaAudioUrl?: string | null;
  narrationAudioUrl?: string | null;
  activeTrackType?: "lyria" | "narration";
  onSelectTrackType?: (type: "lyria" | "narration") => void;
  artistPersona?: "haddi" | "yosia";
}

function extractCleanUserWords(rawContext?: string): string {
  if (!rawContext) return "";
  const trimmed = rawContext.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/Desired Words & Lyrics:\s*(.+)$/is);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed.replace(/^Occasion:\s*[^.]+\.\s*/i, "").trim();
}

export const GiftSongCard: React.FC<GiftSongCardProps> = ({
  audioUrl,
  lyrics,
  userWords = "",
  recipientName = "Someone Special",
  songTitle = "The Sound of Honor & Covenant",
  lyriaAudioUrl,
  narrationAudioUrl,
  activeTrackType = "lyria",
  onSelectTrackType,
  artistPersona = "haddi",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<"lyria" | "narration">(activeTrackType);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // 10-Second Animated Birthday / Gift Video Card state
  const [characterChoice, setCharacterChoice] = useState<"haddi" | "yosia">(artistPersona);
  const [cardTheme, setCardTheme] = useState<"birthday" | "blessing">("birthday");
  const [animationStyle, setAnimationStyle] = useState<"character" | "video">("character");
  const [customCharacterImage, setCustomCharacterImage] = useState<string | null>(null);
  const [isPreviewing10sVideo, setIsPreviewing10sVideo] = useState(false);
  const [isRecording10sVideo, setIsRecording10sVideo] = useState(false);
  const [videoCountdown, setVideoCountdown] = useState<number>(10);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const modeStartRef = useRef<number>(performance.now());
  const drawFrameFnRef = useRef<(elapsedSec: number) => void>(() => {});

  useEffect(() => {
    setSelectedTrack(activeTrackType);
  }, [activeTrackType]);

  useEffect(() => {
    setCharacterChoice(artistPersona);
  }, [artistPersona]);

  // Determine active audio source based on selected track or fallback to audioUrl
  const resolvedAudioSource =
    selectedTrack === "narration" && narrationAudioUrl
      ? narrationAudioUrl
      : selectedTrack === "lyria" && lyriaAudioUrl
      ? lyriaAudioUrl
      : audioUrl || lyriaAudioUrl || narrationAudioUrl || "";

  const handleTrackSwitch = (type: "lyria" | "narration") => {
    setSelectedTrack(type);
    if (onSelectTrackType) {
      onSelectTrackType(type);
    }
  };

  // Ensure the background source video is actively playing so live video frames decode on the canvas
  useEffect(() => {
    const vid = bgVideoRef.current;
    if (!vid) return;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.load();
    vid.play().catch(() => {});
  }, [characterChoice, animationStyle]);

  // Load Haddi or Yosia reference image for custom photo / cameo rendering
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
    } else if (characterChoice === "yosia" && savedYosia) {
      img.src = savedYosia;
    } else {
      img.src = "/images/guiter-rescaled-9music.png";
    }

    img.onload = () => {
      loadedImageRef.current = img;
    };
    img.onerror = () => {
      loadedImageRef.current = null;
    };
  }, [characterChoice, customCharacterImage]);

  // Extract the exact words the user already gave for their birthday/gift song + chorus lines
  const getHighlightLyrics = (): string[] => {
    const cleanGivenWords = extractCleanUserWords(userWords);
    const rawLyricLines = lyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("["));

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
        `Happy Birthday to you, ${recipientName}!`,
        "May every chord bring joy and light,",
        "Strummed with love from Haddi & Yosia,",
        "Blessings today and always!",
      ];
    }
    return rawLyricLines.slice(0, 4);
  };

  // Draw a fully animated Pixar/Studio-style singing & guitar-strumming character (Yosia or Haddi)
  const drawAnimatedMinstrelCharacter = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    t: number,
    persona: "haddi" | "yosia"
  ) => {
    const isYosia = persona === "yosia";
    const beat = Math.sin(t * 7.5);
    const swayX = Math.sin(t * 3.6) * 6;
    const bobY = Math.abs(beat) * -6;
    const headTilt = Math.sin(t * 3.6) * 0.07;
    const isBlinking = (t % 2.7) > 2.52;
    const mouthOpen = 0.25 + 0.75 * Math.abs(Math.sin(t * 9.8) * Math.cos(t * 4.3));

    ctx.save();
    ctx.translate(cx + swayX, cy + bobY);

    // Warm Stage Spotlight Halo behind character
    const halo = ctx.createRadialGradient(0, -10, 12, 0, -10, 118);
    halo.addColorStop(0, "rgba(251, 191, 36, 0.42)");
    halo.addColorStop(0.6, "rgba(45, 212, 191, 0.16)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -10, 118, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing Soundwave Rings
    for (let ring = 0; ring < 2; ring++) {
      const ringProgress = ((t * 0.85 + ring * 0.5) % 1);
      const ringRadius = 55 + ringProgress * 65;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -5, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = ring % 2 === 0 ? "#fbbf24" : "#5eead4";
      ctx.globalAlpha = (1 - ringProgress) * 0.45;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Legs & Boots/Yellow Socks
    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.roundRect(-26, 48, 20, 36, 8);
    ctx.roundRect(6, 48, 20, 36, 8);
    ctx.fill();

    // Footwear (Yosia's signature bright yellow socks vs Haddi's earthy boots)
    ctx.fillStyle = isYosia ? "#facc15" : "#78350f";
    ctx.beginPath();
    ctx.ellipse(-16, 84, 14, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(16, 84, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso / Jacket
    ctx.fillStyle = isYosia ? "#f59e0b" : "#0f766e";
    ctx.beginPath();
    ctx.roundRect(-42, -24, 84, 78, 22);
    ctx.fill();

    // Outer Vest / Denim Jacket
    ctx.fillStyle = isYosia ? "#2563eb" : "#451a03";
    ctx.beginPath();
    ctx.roundRect(-42, -22, 24, 74, 10);
    ctx.roundRect(18, -22, 24, 74, 10);
    ctx.fill();

    // Left Arm (Fretting Hand moving along guitar neck)
    const fretShift = Math.sin(t * 2.4) * 10;
    ctx.strokeStyle = isYosia ? "#2563eb" : "#0f766e";
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(32, -8);
    ctx.quadraticCurveTo(54, 12, 66 + fretShift * 0.6, 2 - fretShift * 0.3);
    ctx.stroke();

    // Animated Head (Tilting & Nodding to the Melody)
    ctx.save();
    ctx.translate(0, -56);
    ctx.rotate(headTilt);

    // Head Circle
    ctx.fillStyle = "#d99b66";
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#c6864e";
    ctx.beginPath();
    ctx.arc(-36, 3, 7.5, 0, Math.PI * 2);
    ctx.arc(36, 3, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Rosy Cheeks
    ctx.fillStyle = "rgba(248, 113, 113, 0.42)";
    ctx.beginPath();
    ctx.ellipse(-21, 9, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(21, 9, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Animated Eyebrows (lifting with song notes)
    const browLift = Math.sin(t * 7.5) * 2.2;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22, -13 - browLift);
    ctx.quadraticCurveTo(-13, -18 - browLift, -5, -13 - browLift);
    ctx.moveTo(5, -13 - browLift);
    ctx.quadraticCurveTo(13, -18 - browLift, 22, -13 - browLift);
    ctx.stroke();

    // Animated Eyes (Blinking & Sparkling)
    if (isBlinking) {
      ctx.strokeStyle = "#1c1917";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, -4);
      ctx.quadraticCurveTo(-13, 0, -6, -4);
      ctx.moveTo(6, -4);
      ctx.quadraticCurveTo(13, 0, 20, -4);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#1c1917";
      ctx.beginPath();
      ctx.arc(-13, -4, 6.2, 0, Math.PI * 2);
      ctx.arc(13, -4, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye Sparkles
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-15, -6, 2.3, 0, Math.PI * 2);
      ctx.arc(11, -6, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.fillStyle = "#b87642";
    ctx.beginPath();
    ctx.ellipse(0, 4, 4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Haddi's Warm Beard/Goatee if Haddi
    if (!isYosia) {
      ctx.strokeStyle = "#292524";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 12, 18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // Animated Singing Mouth (Opens & Closes in Sync with the Music!)
    const mouthHeight = 4 + mouthOpen * 11;
    const mouthWidth = 13 + mouthOpen * 4;
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.ellipse(0, 16, mouthWidth, mouthHeight, 0, 0, Math.PI);
    ctx.fill();

    // Upper Teeth
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.rect(-mouthWidth * 0.7, 15.5, mouthWidth * 1.4, 3);
    ctx.fill();

    // Singing Tongue
    ctx.fillStyle = "#f87171";
    ctx.beginPath();
    ctx.ellipse(0, 16 + mouthHeight * 0.55, mouthWidth * 0.55, mouthHeight * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hat / Cap (Yosia's Colorful Woven Cap vs Haddi's Street Minstrel Cap)
    if (isYosia) {
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.arc(0, -16, 35, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#0f766e";
      ctx.beginPath();
      ctx.roundRect(-36, -24, 72, 10, 4);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      for (let i = -28; i <= 24; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, -15);
        ctx.lineTo(i + 4, -23);
        ctx.lineTo(i + 8, -15);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#292524";
      ctx.beginPath();
      ctx.arc(0, -15, 36, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.roundRect(-37, -22, 74, 8, 3);
      ctx.fill();
    }
    ctx.restore(); // End Head

    // Animated Acoustic Guitar (Rocking & Vibrating Strings)
    ctx.save();
    const guitarRock = -0.22 + Math.sin(t * 7.5) * 0.065;
    ctx.translate(4, 18);
    ctx.rotate(guitarRock);

    // Guitar Body (Warm Aged Wood)
    ctx.fillStyle = isYosia ? "#d97706" : "#b45309";
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-18, 4, 36, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(14, 1, 27, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Soundhole
    ctx.fillStyle = "#1c1008";
    ctx.beginPath();
    ctx.arc(0, 2, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Guitar Neck & Headstock
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(35, -5, 62, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.roundRect(94, -8, 17, 16, 3);
    ctx.fill();

    // 6 Vibrating Silver Guitar Strings
    for (let s = 0; s < 5; s++) {
      const sy = -3 + s * 2.2;
      const vib = Math.sin(t * 48 + s * 1.7) * 2.1;
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-28, sy);
      ctx.quadraticCurveTo(25, sy + vib, 94, sy);
      ctx.stroke();
    }

    // Fretting Hand on Guitar Neck
    ctx.fillStyle = "#d99b66";
    ctx.beginPath();
    ctx.arc(62 + fretShift * 0.5, 1, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // End Guitar

    // Animated Strumming Right Arm & Hand (Moving Up & Down Across Strings!)
    const strumOffset = Math.sin(t * 16) * 14;
    ctx.strokeStyle = isYosia ? "#2563eb" : "#0f766e";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-34, -6);
    ctx.quadraticCurveTo(-24, 14 + strumOffset * 0.5, -6, 14 + strumOffset);
    ctx.stroke();

    // Strumming Hand + Golden Guitar Pick
    ctx.fillStyle = "#d99b66";
    ctx.beginPath();
    ctx.arc(-6, 14 + strumOffset, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(-1, 16 + strumOffset, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw a single frame of the 10-Second Animated Gift Card on the HTML5 Canvas (Runs continuously at 60 FPS!)
  const drawAnimatedFrame = (elapsedSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const t = elapsedSec;

    // 1. Rich Animated Studio Background Gradient with Sweeping Spotlight Beams
    const grad = ctx.createLinearGradient(0, 0, W, H);
    if (cardTheme === "birthday") {
      grad.addColorStop(0, "#042f2e");
      grad.addColorStop(0.5, "#0f766e");
      grad.addColorStop(1, "#1e1b4b");
    } else {
      grad.addColorStop(0, "#042f2e");
      grad.addColorStop(0.5, "#115e59");
      grad.addColorStop(1, "#0f172a");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Sweeping Golden Stage Spotlight
    ctx.save();
    const beamAngle = Math.sin(t * 1.4) * 0.18;
    ctx.translate(W / 2, 0);
    ctx.rotate(beamAngle);
    const beamGrad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    beamGrad.addColorStop(0, "rgba(253, 224, 71, 0.22)");
    beamGrad.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(40, 0);
    ctx.lineTo(170, H * 0.75);
    ctx.lineTo(-170, H * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Animated Rising Birthday Balloons & Confetti (or Golden Blessing Sparkles)
    if (cardTheme === "birthday") {
      const balloonColors = ["#f43f5e", "#fbbf24", "#2dd4bf", "#a855f7", "#38bdf8", "#fb923c"];
      const balloonXPositions = [38, 76, W - 76, W - 38, 54, W - 54];
      for (let b = 0; b < 6; b++) {
        const bx = balloonXPositions[b] + Math.sin(t * 2.2 + b) * 8;
        const cycleY = (t * 48 + b * 75) % (H + 90);
        const by = H + 45 - cycleY;
        ctx.save();
        // Balloon String
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx, by + 18);
        ctx.quadraticCurveTo(bx + Math.sin(t * 4 + b) * 6, by + 32, bx, by + 44);
        ctx.stroke();

        // Balloon Body
        ctx.fillStyle = balloonColors[b % balloonColors.length];
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.ellipse(bx, by, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Balloon Shine
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.ellipse(bx - 4, by - 6, 3.5, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Animated Tumbling Confetti & Sparkles
    for (let i = 0; i < 22; i++) {
      const seed = i * 37.5;
      const px = ((seed * 19) % (W - 30)) + 15 + Math.sin(t * 2.1 + i) * 16;
      const py = (t * 52 + seed * 13) % H;
      const r = 3 + (i % 4);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle =
        cardTheme === "birthday"
          ? i % 3 === 0
            ? "#fbbf24"
            : i % 3 === 1
            ? "#34d399"
            : "#f472b6"
          : i % 2 === 0
          ? "#fde68a"
          : "#5eead4";
      ctx.globalAlpha = 0.8;
      ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
      ctx.restore();
    }

    // 3. Center Stage: Either Animated 3D Singing & Strumming Character OR Live Studio Video + Overlay
    const centerX = W * 0.5;
    const centerY = H * 0.45;
    const vid = bgVideoRef.current;
    const canDrawVideo =
      animationStyle === "video" && vid && vid.readyState >= 2 && !customCharacterImage;

    if (canDrawVideo) {
      // Draw Live Moving Video Frame inside a Glowing Rounded Cinema Stage
      const stageW = 250;
      const stageH = 165;
      const sx = centerX - stageW / 2;
      const sy = centerY - stageH / 2 - 6;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sx, sy, stageW, stageH, 20);
      ctx.closePath();
      ctx.clip();

      const vw = vid.videoWidth || 320;
      const vh = vid.videoHeight || 240;
      const zoom = 1.04 + Math.sin(t * 2.5) * 0.03;
      const scale = Math.max(stageW / vw, stageH / vh) * zoom;
      const drawW = vw * scale;
      const drawH = vh * scale;
      ctx.drawImage(vid, centerX - drawW / 2, centerY - 6 - drawH / 2, drawW, drawH);
      ctx.restore();

      // Glowing Gold Frame around Live Video
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sx, sy, stageW, stageH, 20);
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(251, 191, 36, 0.7)";
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();
    } else {
      // Draw the Fully Animated Singing & Guitar-Strumming Character (Haddi or Yosia)
      drawAnimatedMinstrelCharacter(ctx, centerX, centerY + 6, t, characterChoice);

      // If a custom photo or portrait is loaded, also display it in a bobbing golden cameo frame
      if (customCharacterImage && loadedImageRef.current) {
        const img = loadedImageRef.current;
        const cameoR = 34;
        const cameoX = W - 66;
        const cameoY = centerY - 36 + Math.sin(t * 4) * 4;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cameoX, cameoY, cameoR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const scale = Math.max((cameoR * 2) / img.width, (cameoR * 2) / img.height);
        ctx.drawImage(
          img,
          cameoX - (img.width * scale) / 2,
          cameoY - (img.height * scale) / 2,
          img.width * scale,
          img.height * scale
        );
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cameoX, cameoY, cameoR + 2, 0, Math.PI * 2);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. Animated Musical Notes Bursting Out of the Guitar & Floating Upward
    const noteSymbols = ["♪", "♫", "♬", "♩"];
    for (let n = 0; n < 5; n++) {
      const noteCycle = (t * 0.75 + n * 0.2) % 1;
      const nx = centerX + 18 + Math.sin(t * 3.2 + n * 1.5) * 55 + (n - 2) * 22;
      const ny = centerY + 25 - noteCycle * 125;
      ctx.save();
      ctx.font = `bold ${18 + (n % 3) * 4}px sans-serif`;
      ctx.fillStyle = n % 2 === 0 ? "#fde047" : "#5eead4";
      ctx.globalAlpha = Math.sin(noteCycle * Math.PI);
      ctx.fillText(noteSymbols[n % noteSymbols.length], nx, ny);
      ctx.restore();
    }

    // 5. Animated Birthday Cake with Flickering Candles (when cardTheme === "birthday")
    if (cardTheme === "birthday") {
      const cakeX = 56;
      const cakeY = centerY + 52;
      ctx.save();
      // Cake Base
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.roundRect(cakeX - 24, cakeY, 48, 22, 6);
      ctx.fill();
      // Pink Frosting
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.roundRect(cakeX - 26, cakeY - 4, 52, 9, 5);
      ctx.fill();
      // 3 Candles + Flickering Flames
      for (let c = -1; c <= 1; c++) {
        const cxCandle = cakeX + c * 12;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cxCandle - 2, cakeY - 16, 4, 12);
        // Flickering Flame
        const flameFlicker = Math.sin(t * 24 + c * 2) * 2;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.ellipse(cxCandle + flameFlicker * 0.4, cakeY - 21, 3.5, 6 + flameFlicker * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(cxCandle, cakeY - 19, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Top Banner Header
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
    ctx.beginPath();
    ctx.roundRect(20, 14, W - 40, 66, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fde68a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      cardTheme === "birthday"
        ? `🎂 HAPPY BIRTHDAY ANIMATED SONG CARD • ${characterChoice === "yosia" ? "YOSIA" : "HADDI"}`
        : `🎁 CUSTOM ANIMATED GIFT CARD • ${characterChoice === "yosia" ? "YOSIA" : "HADDI"}`,
      W / 2,
      36
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`For ${recipientName}`, W / 2, 64);
    ctx.restore();

    // 7. Synchronized 10-Second Karaoke Lyric Highlight Box (Using User's Given Words!)
    const highlightLines = getHighlightLyrics();
    const cycleSec = t % 10;
    const activeLineIndex = Math.min(
      highlightLines.length - 1,
      Math.floor((cycleSec / 10) * highlightLines.length)
    );
    const lineProgress = ((cycleSec / 10) * highlightLines.length) % 1;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.84)";
    ctx.beginPath();
    ctx.roundRect(20, H - 144, W - 40, 94, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(94, 234, 212, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = "center";
    highlightLines.slice(0, 2).forEach((_, idx) => {
      const lineIdx = activeLineIndex >= 2 ? idx + 2 : idx;
      const lineText = highlightLines[lineIdx] || "";
      const isCurrent = lineIdx === activeLineIndex;
      ctx.fillStyle = isCurrent ? "#fef08a" : "rgba(255,255,255,0.65)";
      ctx.font = isCurrent ? "bold 15px sans-serif" : "italic 13px sans-serif";
      const truncated = lineText.length > 52 ? lineText.slice(0, 50) + "..." : lineText;
      const lineY = H - 108 + idx * 28;
      ctx.fillText(truncated, W / 2, lineY);

      // Bouncing Golden Karaoke Note over the currently sung line
      if (isCurrent) {
        const textWidth = Math.min(W - 90, ctx.measureText(truncated).width);
        const ballX = W / 2 - textWidth / 2 + lineProgress * textWidth;
        const ballBounce = Math.abs(Math.sin(t * 12)) * 8;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(ballX, lineY - 16 - ballBounce, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Smooth 10-Second Progress Bar inside Lyric Box
    const barW = W - 68;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.roundRect(34, H - 62, barW, 5, 3);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.roundRect(34, H - 62, Math.max(8, barW * (cycleSec / 10)), 5, 3);
    ctx.fill();
    ctx.restore();

    // 8. Animated Equalizer Bars & mygiftsong.org Footer
    const barCount = 18;
    const barAreaWidth = 198;
    const startX = (W - barAreaWidth) / 2;
    for (let b = 0; b < barCount; b++) {
      const barH = 6 + Math.abs(Math.sin(t * 8.5 + b * 0.65)) * 18;
      ctx.fillStyle = b % 2 === 0 ? "#fbbf24" : "#2dd4bf";
      ctx.fillRect(startX + b * 11, H - 28 - barH / 2, 6, barH);
    }

    ctx.fillStyle = "#ccfbf1";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText("mygiftsong.org", W - 24, H - 16);

    ctx.textAlign = "left";
    ctx.fillText(`${Math.max(1, 10 - Math.floor(cycleSec))}s / 10s`, 24, H - 16);
  };

  // Keep latest drawAnimatedFrame in ref so the continuous 60 FPS loop always uses fresh props/state
  drawFrameFnRef.current = drawAnimatedFrame;

  // Run continuous 60 FPS animation automatically whenever not actively recording a download
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
          if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.currentTime = 0;
          }
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

  // Stop audio-synced 10s preview (animation continues smoothly in idle loop)
  const stop10sPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setIsPreviewing10sVideo(false);
    setVideoCountdown(10);
    modeStartRef.current = performance.now();
  };

  // Play the 10-Second Animated Birthday Video Preview with Synchronized Song Audio
  const handleStart10sPreview = () => {
    if (isPreviewing10sVideo) {
      stop10sPreview();
      return;
    }

    modeStartRef.current = performance.now();
    setVideoCountdown(10);
    setIsPreviewing10sVideo(true);

    if (bgVideoRef.current) {
      bgVideoRef.current.currentTime = 0;
      bgVideoRef.current.play().catch(() => {});
    }

    if (resolvedAudioSource) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(resolvedAudioSource);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
    }
  };

  // Record & Export a real 10-Second Animated Video (.webm) that can be sent on WhatsApp or Email
  const handleRecordAndDownload10sVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording10sVideo) return;

    stop10sPreview();
    setIsRecording10sVideo(true);
    setRecordedVideoUrl(null);
    setVideoCountdown(10);

    try {
      const canvasStream = canvas.captureStream(30);
      let combinedStream = canvasStream;
      let audioEl: HTMLAudioElement | null = null;
      let audioCtx: AudioContext | null = null;

      if (resolvedAudioSource) {
        try {
          audioEl = new Audio(resolvedAudioSource);
          audioEl.crossOrigin = "anonymous";
          audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const sourceNode = audioCtx.createMediaElementSource(audioEl);
          const destNode = audioCtx.createMediaStreamDestination();
          sourceNode.connect(destNode);
          sourceNode.connect(audioCtx.destination);

          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...destNode.stream.getAudioTracks(),
          ]);
          await audioEl.play().catch(() => {});
        } catch {
          combinedStream = canvasStream;
        }
      }

      if (bgVideoRef.current) {
        bgVideoRef.current.currentTime = 0;
        bgVideoRef.current.play().catch(() => {});
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

        if (audioEl) audioEl.pause();
        if (audioCtx) audioCtx.close().catch(() => {});

        // Trigger automatic download of the 10-second animated gift video
        const a = document.createElement("a");
        a.href = url;
        a.download = `${recipientName.replace(/\s+/g, "_")}_10s_Birthday_Gift_Video.webm`;
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

  // Construct a direct mailto link to send the gift card via email
  const handleEmailShare = () => {
    const shareableLink =
      resolvedAudioSource.startsWith("data:")
        ? "https://mygiftsong.org"
        : resolvedAudioSource || "https://mygiftsong.org";
    const subject = encodeURIComponent(
      cardTheme === "birthday"
        ? `🎂 Happy Birthday ${recipientName}! Your Custom Song & Gift Card (${songTitle})`
        : `🎁 A Special Custom Song for You: ${songTitle} (mygiftsong.org)`
    );
    const body = encodeURIComponent(
      `Hello ${recipientName},\n\n${
        characterChoice === "yosia" ? "Yosia (Haddi's Little Brother)" : "Haddi the Street Minstrel"
      } created a custom ${
        cardTheme === "birthday" ? "Happy Birthday " : ""
      }gift song & 10-second animated card just for you on mygiftsong.org!\n\n🎵 Listen to your song here: ${shareableLink}\n\n📜 Your Custom Lyrics:\n${lyrics}\n\n(Tip: If you downloaded the 10-second animated birthday video file, attach it to this email!)\n\nSent with love from https://mygiftsong.org`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Construct a direct WhatsApp share link for the Birthday Gift Card
  const handleWhatsAppGiftShare = () => {
    const shareableLink =
      resolvedAudioSource && !resolvedAudioSource.startsWith("data:")
        ? resolvedAudioSource
        : "https://mygiftsong.org";
    const text = encodeURIComponent(
      `🎂🎵 *Happy Birthday ${recipientName}!* 🎁\n\nI created a personalized song for you with ${
        characterChoice === "yosia" ? "Yosia" : "Haddi"
      } on *mygiftsong.org*: *"${songTitle}"*\n\n🎶 *Lyrics Preview:*\n${getHighlightLyrics().join(
        "\n"
      )}\n\n👉 Listen here: ${shareableLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    const linkToCopy =
      resolvedAudioSource && !resolvedAudioSource.startsWith("data:")
        ? resolvedAudioSource
        : "https://mygiftsong.org";
    navigator.clipboard.writeText(linkToCopy);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) setCustomCharacterImage(res);
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

      {/* 10-Second Animated Birthday / Gift Video Card Builder */}
      <div className="rounded-2xl border-2 border-teal-500/80 bg-gradient-to-b from-teal-50/70 to-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Film size={15} className="text-teal-700" />
            <span className="text-xs font-bold text-teal-950">
              10-Second Animated Video Gift Card
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
            Live Animated
          </span>
        </div>

        {/* Character Consistency Switcher: Haddi vs. Yosia + Theme + Animation Mode */}
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

          <div className="flex rounded-xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setAnimationStyle("character")}
              className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                animationStyle === "character"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Animated 3D Singing & Guitar-Strumming Character"
            >
              🎬 3DToon
            </button>
            <button
              type="button"
              onClick={() => setAnimationStyle("video")}
              className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                animationStyle === "video"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Live Studio Video Clip + Animated Effects"
            >
              🎥 Video
            </button>
          </div>
        </div>

        {/* Offscreen decoded source video (not display:none so browsers decode live moving video frames onto canvas) */}
        <video
          ref={bgVideoRef}
          src={characterChoice === "yosia" ? "/video/yosia-children.mp4" : "/video/song-gift.mp4"}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "64px",
            height: "64px",
            opacity: 0.01,
            pointerEvents: "none",
          }}
        />

        {/* Display the exact words the user already gave for their birthday/gift song */}
        <div className="rounded-xl bg-white/90 border border-teal-200 px-3 py-2 text-left space-y-0.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800 block">
            ✓ Using the Words You Gave for {recipientName}&apos;s Song:
          </span>
          <p className="text-xs text-slate-700 font-medium italic line-clamp-2">
            &ldquo;{extractCleanUserWords(userWords) || getHighlightLyrics().slice(0, 2).join(" • ")}&rdquo;
          </p>
        </div>

        {/* Interactive 10-Second Animated Video Canvas (Continuously Animating at 60 FPS!) */}
        <div
          onClick={handleStart10sPreview}
          title="Click to play 10-second animated video with song audio"
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
            <label className="px-2.5 py-1 rounded-lg bg-black/65 hover:bg-black/80 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer backdrop-blur-xs border border-white/20">
              <Upload size={11} />
              <span>{customCharacterImage ? "Change Photo" : "Add Photo"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomPhotoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Play 10s Preview & Download 10s Video Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleStart10sPreview}
            className="py-2.5 px-3 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
          >
            {isPreviewing10sVideo ? (
              <>
                <Pause size={14} className="text-teal-700" />
                <span>Stop Preview ({videoCountdown}s)</span>
              </>
            ) : (
              <>
                <Play size={14} className="text-teal-700" fill="currentColor" />
                <span>Preview 10s Video</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRecordAndDownload10sVideo}
            disabled={isRecording10sVideo}
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
                <span>10s Animated Video Ready! Attach to WhatsApp or Email:</span>
              </span>
              <a
                href={recordedVideoUrl}
                download={`${recipientName.replace(/\s+/g, "_")}_10s_Birthday_Gift_Video.webm`}
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
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              selectedTrack === "lyria"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🎸 Sung Song (Music)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTrackSwitch("narration")}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              selectedTrack === "narration"
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🎙️ {characterChoice === "yosia" ? "Yosia" : "Haddi"} Narration</span>
          </button>
        </div>
      )}

      {/* Embedded HTML5 Audio Player for the Real Generated Song */}
      <div className="bg-[#F8FAF9] rounded-xl p-3.5 border border-stone-200">
        {resolvedAudioSource ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-teal-800">
              <span>
                {selectedTrack === "narration" && narrationAudioUrl
                  ? `🎙️ ${characterChoice === "yosia" ? "Yosia" : "Haddi"} Spoken Blessing Track`
                  : "🎵 Lyria 3 Sung Studio Master (Music)"}
              </span>
              {isPlaying && <span className="text-teal-600 font-semibold animate-pulse">● Playing</span>}
            </div>
            <audio
              controls
              src={resolvedAudioSource}
              className="w-full h-9 accent-teal-600"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 italic">Composing and rendering audio track...</p>
        )}
      </div>

      {/* Preview Lyrics Box */}
      <div className="bg-stone-50 rounded-xl p-3.5 max-h-32 overflow-y-auto text-xs sm:text-sm italic text-slate-700 border border-stone-200/80">
        <p className="whitespace-pre-line">{lyrics}</p>
      </div>

      {/* Action Buttons: WhatsApp Gift Card, Email Gift Card, Copy Link & Save Audio */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleWhatsAppGiftShare}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-2xs transition duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Share2 size={14} />
          <span>Send via WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleEmailShare}
          disabled={!resolvedAudioSource}
          className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-xl shadow-2xs transition duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Mail size={14} />
          <span>Send via Email</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-200 font-semibold py-2 px-2 rounded-xl transition duration-200 text-xs flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>{copiedFeedback ? "✓ Copied!" : "Copy Song Link"}</span>
        </button>

        <a
          href={resolvedAudioSource || "#"}
          download={`${songTitle.replace(/\s+/g, "_")}_${selectedTrack}.${
            resolvedAudioSource.startsWith("data:audio/mpeg") || resolvedAudioSource.endsWith(".mp3") ? "mp3" : "wav"
          }`}
          className={`bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold py-2 px-2 rounded-xl transition duration-200 text-xs flex items-center justify-center gap-1 ${
            !resolvedAudioSource ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span>Download Audio</span>
        </a>
      </div>
    </div>
  );
};

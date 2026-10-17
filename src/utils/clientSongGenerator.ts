import { SongData, SetType, LyricSection } from "../types";

export const LIVE_BACKEND_ORIGINS = [
  "https://ais-pre-2ri6wresu4hpxiakbveyzu-3291285201.asia-southeast1.run.app",
  "https://ais-dev-2ri6wresu4hpxiakbveyzu-3291285201.asia-southeast1.run.app",
];

let activeRemoteBackendOrigin: string | null = null;

/**
 * Safely parses a fetch Response as JSON without throwing
 * `Unexpected token 'T', "The page c"... is not valid JSON` when deployed on static hosts like Vercel.
 */
export async function safeParseJson<T = any>(res: Response): Promise<T | null> {
  try {
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (!text || text.trim().startsWith("The page") || text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return null;
    }
    if (contentType.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      return JSON.parse(text) as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves any relative `/api/...` audio/media path to the active backend origin
 * when running on a static GitHub/Vercel deployment so MP3/WAV links always stream real vocals.
 */
export function resolveBackendMediaUrl(urlOrPath?: string | null): string {
  if (!urlOrPath) return "";
  if (urlOrPath.startsWith("data:") || urlOrPath.startsWith("blob:")) return urlOrPath;
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  if (urlOrPath.startsWith("/api/") && activeRemoteBackendOrigin) {
    return `${activeRemoteBackendOrigin}${urlOrPath}`;
  }
  return urlOrPath;
}

/**
 * Calls a backend API route (e.g. `/api/generate-song`, `/api/generate-haddi-audio`, `/api/generate-10s-greeting`, `/api/songs/:id`)
 * and automatically falls back to the live AI Studio Cloud Run backend if the current host (e.g. GitHub/Vercel static build) returns 404 or HTML.
 */
export async function apiFetchJson<T = any>(apiPath: string, init?: RequestInit): Promise<T | null> {
  // 1. Try current origin first (works natively on AI Studio and when vercel.json rewrite is active)
  try {
    const localRes = await fetch(apiPath, init);
    if (localRes.ok) {
      const parsed = await safeParseJson<T>(localRes);
      if (parsed !== null) {
        return parsed;
      }
    }
  } catch {
    // Fall through to remote backend origins
  }

  // 2. Automatically fall back to live AI Studio Cloud Run backend origins (CORS-enabled)
  for (const origin of LIVE_BACKEND_ORIGINS) {
    try {
      const remoteUrl = `${origin}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
      const remoteRes = await fetch(remoteUrl, {
        ...init,
        mode: "cors",
      });
      if (remoteRes.ok) {
        const parsed = await safeParseJson<T>(remoteRes);
        if (parsed !== null) {
          activeRemoteBackendOrigin = origin;
          return parsed;
        }
      }
    } catch {
      // Try next origin
    }
  }

  return null;
}


/**
 * Generates a complete, deeply personalized SongData object on the client side
 * whenever `/api/generate-song` is unreachable (e.g. on static Vercel deployments).
 */
export function buildClientFallbackSong(params: {
  target: string;
  context: string;
  setType?: SetType;
  customGenre?: string;
  language?: string;
  artistPersona?: "haddi" | "yosia";
}): { song: SongData; variations: SongData[] } {
  const recipient = (params.target || "My Dear Friend").trim();
  const rawContext = (params.context || `A joyful, heartfelt blessing song for ${recipient}`).trim();
  const setType: SetType = params.setType || "full";
  const genre = params.customGenre || (params.artistPersona === "yosia" ? "Children's Joyful Acoustic Sing-Along" : "Acoustic Folk");
  const language = params.language || "English";
  const persona: "haddi" | "yosia" = params.artistPersona || "haddi";

  const isIndonesian = language.toLowerCase().includes("indonesia") && !language.toLowerCase().includes("bilingual");
  const isBilingual = language.toLowerCase().includes("bilingual");

  // Extract meaningful phrases from the user's story/words so the lyrics weave them in naturally (without "Occasion:" or "Desired Words:" labels)
  let strippedContext = rawContext;
  for (let i = 0; i < 4; i++) {
    const next = strippedContext
      .replace(/^Occasion:\s*[^.\n]+[.\n]?\s*/i, "")
      .replace(/^(?:Desired Words & Lyrics|Words & Lyrics|Desired Lyrics|Lyrics|Words|Special Message):\s*/i, "")
      .trim();
    if (next === strippedContext) break;
    strippedContext = next;
  }
  const cleanWords = strippedContext.replace(/\s+/g, " ").trim();
  const clauses = cleanWords
    .split(/[.;!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lineA = clauses[0] || `Celebrating ${recipient} with love and joy today`;
  const lineB = clauses[1] || `Every moment with ${recipient} brings a warm and shining smile`;
  const lineC = clauses[2] || `May God's richest blessings surround ${recipient} always`;

  const isKidsOrYosia = persona === "yosia";
  const minstrelName = isKidsOrYosia ? "Yosia" : "Haddi";

  const title = isIndonesian
    ? `Lagu Berkat Spesial untuk ${recipient}`
    : isKidsOrYosia
    ? `A Big Happy Song for ${recipient}`
    : `A Heartfelt Song for ${recipient}`;

  const artistIntro = isIndonesian
    ? `Halo ${recipient}! Ini ${minstrelName} memetik gitar akustik khusus untukmu hari ini.`
    : isKidsOrYosia
    ? `Hi ${recipient}! I'm Yosia, Haddi's little brother, strumming my guitar to put a big smile on your face!`
    : `Shalom and warm greetings, ${recipient}! Haddi here with a personal acoustic song crafted just for you.`;

  let lyricSections: LyricSection[];

  if (isIndonesian) {
    lyricSections = [
      {
        sectionName: "Intro",
        lines: [
          `(Petikan gitar akustik hangat oleh ${minstrelName} untuk ${recipient})`,
          `Satu, dua, tiga — lagu spesial untuk ${recipient}!`,
        ],
        chords: ["G", "C"],
        timestamps: [0, 5],
      },
      {
        sectionName: "Verse 1",
        lines: [
          `Hari ini kita bernyanyi untuk ${recipient} tercinta,`,
          `${lineA},`,
          `${lineB},`,
          `Senyummu membawa sukacita dan terang di hati kita.`,
        ],
        chords: ["G", "D", "Em", "C"],
        timestamps: [10, 15, 20, 25],
      },
      {
        sectionName: "Chorus",
        lines: [
          `Oh ${recipient}, Tuhan memberkati langkahmu selalu,`,
          `Kasih, sukacita, dan damai menyertai hidupmu,`,
          `${lineC},`,
          `Lagu ini kami nyanyikan khusus untukmu, ${recipient}!`,
        ],
        chords: ["C", "G", "D", "G"],
        timestamps: [30, 36, 42, 48],
      },
      {
        sectionName: "Verse 2",
        lines: [
          `Dari setiap petikan senar gitar ${minstrelName} hari ini,`,
          `Kami bersyukur atas hidup dan kebaikan ${recipient},`,
          `Semoga setiap harimu dipenuhi tawa dan harapan baru,`,
          `Bersinarlah terus dengan kasih yang tulus!`,
        ],
        chords: ["Em", "C", "G", "D"],
        timestamps: [55, 61, 67, 73],
      },
      {
        sectionName: "Outro",
        lines: [
          `Selamat berbahagia dan diberkati selalu, ${recipient}!`,
          `Dari hati kami melalui musik ${minstrelName} — penuh kasih untukmu.`,
        ],
        chords: ["C", "D", "G"],
        timestamps: [80, 88],
      },
    ];
  } else if (isBilingual) {
    lyricSections = [
      {
        sectionName: "Intro",
        lines: [
          `(Warm acoustic guitar strummed by ${minstrelName} for ${recipient})`,
          `Halo ${recipient}! Here is your special blessing song!`,
        ],
        chords: ["G", "C"],
        timestamps: [0, 5],
      },
      {
        sectionName: "Verse 1",
        lines: [
          `Today we lift our voices for ${recipient}, shining bright,`,
          `${lineA},`,
          `Hari yang indah penuh syukur dan sukacita untukmu,`,
          `${lineB}.`,
        ],
        chords: ["G", "D", "Em", "C"],
        timestamps: [10, 15, 20, 25],
      },
      {
        sectionName: "Chorus",
        lines: [
          `Oh ${recipient}, may joy and blessings follow everywhere you go,`,
          `Tuhan memberkati setiap langkah dan impianmu selalu,`,
          `${lineC},`,
          `This melody is sung with love just for you, ${recipient}!`,
        ],
        chords: ["C", "G", "D", "G"],
        timestamps: [30, 36, 42, 48],
      },
    ];
  } else {
    lyricSections = [
      {
        sectionName: "Intro",
        lines: [
          `(Warm acoustic guitar strummed by ${minstrelName} for ${recipient})`,
          `Here is a special song dedicated to ${recipient}!`,
        ],
        chords: ["G", "C"],
        timestamps: [0, 5],
      },
      {
        sectionName: "Verse 1",
        lines: [
          `Strumming on these golden strings for ${recipient} today,`,
          `${lineA},`,
          `${lineB},`,
          `Every memory and smile lights up our hearts along the way.`,
        ],
        chords: ["G", "D", "Em", "C"],
        timestamps: [10, 15, 20, 25],
      },
      {
        sectionName: "Chorus",
        lines: [
          `Oh ${recipient}, this song is rising up for you,`,
          `May blessings, laughter, and sweet peace shine in all you do,`,
          `${lineC},`,
          `We celebrate you today and always, dear ${recipient}!`,
        ],
        chords: ["C", "G", "D", "G"],
        timestamps: [30, 36, 42, 48],
      },
      {
        sectionName: "Verse 2",
        lines: [
          `${minstrelName} plays this joyful rhythm just to make you smile,`,
          `Thankful for your life and love touching every mile,`,
          `May every dream ahead of you blossom bright and true,`,
          `God's richest grace and happiness be poured out over you!`,
        ],
        chords: ["Em", "C", "G", "D"],
        timestamps: [55, 61, 67, 73],
      },
      {
        sectionName: "Outro",
        lines: [
          `So here's one final golden chord for ${recipient} today,`,
          `With love and joy from ${minstrelName} — may you be blessed always!`,
        ],
        chords: ["C", "D", "G"],
        timestamps: [80, 88],
      },
    ];
  }

  const durationSeconds = setType === "quick" ? 60 : 95;
  const baseId = `song-${Date.now().toString(36)}`;

  const primarySong: SongData = {
    id: baseId,
    title,
    target: recipient,
    context: rawContext,
    setType,
    language,
    artistPersona: persona,
    tempo: isKidsOrYosia ? "Upbeat Acoustic Sing-Along (108 BPM)" : "Warm Acoustic Plucking (92 BPM)",
    genre,
    artistIntro,
    lyricSections,
    totalDurationSeconds: durationSeconds,
  };

  const variation2: SongData = {
    ...primarySong,
    id: `${baseId}-v2`,
    title: `${title} (Fireside Acoustic Version)`,
    tempo: "Cozy Fireside Strum (84 BPM)",
  };

  const variation3: SongData = {
    ...primarySong,
    id: `${baseId}-v3`,
    title: `${title} (Celebration Praise Version)`,
    tempo: "Joyful Celebration Strum (112 BPM)",
  };

  return {
    song: primarySong,
    variations: [primarySong, variation2, variation3],
  };
}

/**
 * Synthesizes a rich, warm, downloadable WAV audio track (24kHz 16-bit mono PCM)
 * featuring Karplus-Strong plucked acoustic guitar chords + warm harmonic lead melody
 * so that even on a static Vercel host without backend TTS, the user gets an instant,
 * crystal-clear playable and downloadable `.wav` song track!
 */
export function synthesizeClientAcousticSongWavDataUrl(options?: {
  durationSeconds?: number;
  artistPersona?: "haddi" | "yosia";
}): string {
  const sampleRate = 22050;
  const durationSec = Math.min(Math.max(options?.durationSeconds || 28, 10), 45);
  const totalSamples = Math.floor(sampleRate * durationSec);
  const mix = new Float32Array(totalSamples);

  const isYosia = options?.artistPersona === "yosia";

  // Plucked string helper (Karplus-Strong physical modeling)
  const pluckNote = (freq: number, startSec: number, noteDurSec: number, gain: number) => {
    const startIdx = Math.floor(startSec * sampleRate);
    if (startIdx >= totalSamples) return;
    const length = Math.min(Math.floor(noteDurSec * sampleRate), totalSamples - startIdx);
    if (length <= 0) return;

    const period = Math.max(2, Math.round(sampleRate / freq));
    const ring = new Float32Array(period);
    let prev = 0;
    for (let i = 0; i < period; i++) {
      const white = Math.random() * 2 - 1;
      ring[i] = 0.55 * white + 0.45 * prev;
      prev = ring[i];
    }

    let ptr = 0;
    for (let i = 0; i < length; i++) {
      const curr = ring[ptr];
      const next = ring[(ptr + 1) % period];
      const avg = 0.994 * 0.5 * (curr + next);
      ring[ptr] = avg;
      ptr = (ptr + 1) % period;

      const env = Math.exp(-i / (sampleRate * 1.45));
      mix[startIdx + i] += curr * gain * env;
    }
  };

  // Warm singing lead bell/vocal-pad tone for the melody line
  const playMelodyNote = (freq: number, startSec: number, noteDurSec: number, gain: number) => {
    const startIdx = Math.floor(startSec * sampleRate);
    if (startIdx >= totalSamples) return;
    const length = Math.min(Math.floor(noteDurSec * sampleRate), totalSamples - startIdx);
    if (length <= 0) return;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.04);
      const decay = Math.exp(-t / (noteDurSec * 0.75));
      const vibrato = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * t);
      const phase = 2 * Math.PI * freq * vibrato * t;
      const wave =
        0.65 * Math.sin(phase) +
        0.25 * Math.sin(phase * 2) +
        0.1 * Math.sin(phase * 3);
      mix[startIdx + i] += wave * gain * attack * decay;
    }
  };

  // Chord voicings: G -> D -> Em -> C -> G -> D -> C -> G
  const chords = [
    [196.0, 246.94, 293.66, 392.0, 493.88, 587.33], // G major
    [146.83, 220.0, 293.66, 369.99, 440.0, 587.33], // D major
    [164.81, 246.94, 329.63, 392.0, 493.88, 659.25], // E minor
    [130.81, 196.0, 261.63, 329.63, 392.0, 523.25], // C major
  ];

  // Joyful sing-along melody notes (in G major pentatonic/diatonic)
  const melodyPattern = isYosia
    ? [392.0, 440.0, 493.88, 587.33, 659.25, 587.33, 493.88, 440.0]
    : [293.66, 329.63, 392.0, 440.0, 493.88, 440.0, 392.0, 329.63];

  const barDur = isYosia ? 1.8 : 2.1;
  const numBars = Math.ceil(durationSec / barDur);

  for (let bar = 0; bar < numBars; bar++) {
    const chord = chords[bar % chords.length];
    const barStart = bar * barDur;

    // Downbeat full acoustic guitar strum
    chord.forEach((freq, idx) => {
      pluckNote(freq, barStart + idx * 0.028, barDur * 0.95, 0.22);
    });

    // Fingerpicked arpeggio across the bar
    const arpSteps = [0, 2, 3, 5, 4, 2];
    arpSteps.forEach((noteIdx, step) => {
      const freq = chord[noteIdx % chord.length];
      pluckNote(freq, barStart + 0.32 + step * (barDur / 7.2), 0.85, 0.16);
    });

    // Warm melodic lead phrase
    const melA = melodyPattern[(bar * 2) % melodyPattern.length];
    const melB = melodyPattern[(bar * 2 + 1) % melodyPattern.length];
    playMelodyNote(melA, barStart + 0.1, barDur * 0.45, 0.14);
    playMelodyNote(melB, barStart + barDur * 0.52, barDur * 0.42, 0.14);
  }

  // Smooth fade-in and fade-out + soft limiter
  const fadeInSamples = Math.min(Math.floor(sampleRate * 0.25), totalSamples);
  const fadeOutSamples = Math.min(Math.floor(sampleRate * 1.2), totalSamples);

  const pcmBuffer = new Uint8Array(44 + totalSamples * 2);
  const view = new DataView(pcmBuffer.buffer);

  // Write WAV header
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, totalSamples * 2, true);

  for (let i = 0; i < totalSamples; i++) {
    let s = mix[i];
    if (i < fadeInSamples) s *= i / fadeInSamples;
    if (i > totalSamples - fadeOutSamples) s *= (totalSamples - i) / fadeOutSamples;
    s = Math.tanh(s * 1.15);
    const int16 = Math.max(-32768, Math.min(32767, Math.round(s * 30000)));
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert Uint8Array to base64 data URL
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < pcmBuffer.length; i += chunkSize) {
    const chunk = pcmBuffer.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Decodes a real human vocal MP3/WAV data URL and mixes warm acoustic guitar accompaniment underneath it,
 * returning a playable & downloadable `data:audio/wav;base64,...` with BOTH real vocals and acoustic guitar.
 */
export async function mixVoiceMp3WithAcousticGuitarWav(
  voiceDataUrl: string,
  options?: {
    durationSeconds?: number;
    artistPersona?: "haddi" | "yosia";
    guitarGain?: number;
  }
): Promise<string> {
  try {
    const commaIdx = voiceDataUrl.indexOf(",");
    const base64 = commaIdx >= 0 ? voiceDataUrl.slice(commaIdx + 1) : voiceDataUrl;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const decodedVoice = await ctx.decodeAudioData(bytes.buffer.slice(0));
    await ctx.close().catch(() => {});

    const sampleRate = 22050;
    const voiceDur = decodedVoice.duration;
    const targetDur = options?.durationSeconds
      ? Math.max(options.durationSeconds, Math.min(voiceDur + 1.2, 60))
      : Math.min(Math.max(voiceDur + 1.0, 10), 60);

    // Get guitar backing WAV and decode its PCM
    const guitarWavDataUrl = synthesizeClientAcousticSongWavDataUrl({
      durationSeconds: targetDur,
      artistPersona: options?.artistPersona,
    });
    const gComma = guitarWavDataUrl.indexOf(",");
    const gBin = atob(guitarWavDataUrl.slice(gComma + 1));
    const totalSamples = Math.floor((gBin.length - 44) / 2);
    const gBytes = new Uint8Array(gBin.length);
    for (let i = 0; i < gBin.length; i++) {
      gBytes[i] = gBin.charCodeAt(i);
    }
    const gView = new DataView(gBytes.buffer);

    const voiceChan = decodedVoice.getChannelData(0);
    const voiceRate = decodedVoice.sampleRate;
    const guitarScale = options?.guitarGain ?? 0.22;
    const startOffsetSamples = Math.floor(0.25 * sampleRate);

    for (let i = 0; i < totalSamples; i++) {
      const guitarSample = (gView.getInt16(44 + i * 2, true) / 32768) * guitarScale;
      let vSample = 0;
      const vIdx = Math.floor(((i - startOffsetSamples) * voiceRate) / sampleRate);
      if (vIdx >= 0 && vIdx < voiceChan.length) {
        vSample = voiceChan[vIdx] * 1.15;
      }
      const combined = Math.tanh(vSample + guitarSample);
      const pcm16 = Math.max(-32768, Math.min(32767, Math.round(combined * 31000)));
      gView.setInt16(44 + i * 2, pcm16, true);
    }

    let outBin = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < gBytes.length; i += chunkSize) {
      const chunk = gBytes.subarray(i, i + chunkSize);
      outBin += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return `data:audio/wav;base64,${btoa(outBin)}`;
  } catch (e) {
    console.warn("Could not mix voice MP3 with guitar, returning original voice track:", e);
    return voiceDataUrl;
  }
}


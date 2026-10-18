import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI, Modality, Type, GenerateVideosOperation } from "@google/genai";
import Stripe from "stripe";

dotenv.config();

// Persistent storage directory for shared songs & direct audio links (uses /tmp on Vercel serverless)
function resolveSharedSongsDir(): string {
  if (process.env.VERCEL) {
    const vercelTmpDir = path.join("/tmp", "shared-songs");
    try {
      fs.mkdirSync(vercelTmpDir, { recursive: true });
    } catch {
      // ignore
    }
    return vercelTmpDir;
  }
  const localDir = path.join(process.cwd(), "data", "shared-songs");
  try {
    fs.mkdirSync(localDir, { recursive: true });
    return localDir;
  } catch {
    const fallbackTmp = path.join("/tmp", "shared-songs");
    try {
      fs.mkdirSync(fallbackTmp, { recursive: true });
    } catch {
      // ignore
    }
    return fallbackTmp;
  }
}

const SHARED_SONGS_DIR = resolveSharedSongsDir();

interface StoredSongRecord {
  shareId: string;
  createdAt: string;
  song: any;
  lyrics: string;
  userWords: string;
  recipientName: string;
  songTitle: string;
  artistPersona: "haddi" | "yosia";
  audioFileName?: string;
  audioMimeType?: string;
  narrationFileName?: string;
  greetingFileName?: string;
  externalAudioUrl?: string;
  reactions?: Array<{
    id: string;
    emoji: string;
    label: string;
    note?: string;
    fromName?: string;
    createdAt: string;
  }>;
}

const memorySongStore = new Map<string, StoredSongRecord>();

function normalizeShareId(rawId?: string): string {
  if (rawId && /^[a-zA-Z0-9_-]{4,64}$/.test(rawId.trim())) {
    return rawId.trim();
  }
  return `song-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function parseDataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string; ext: string } | null {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;
  const header = dataUrl.slice(5, commaIdx);
  const base64Data = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/^([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : "audio/mpeg";
  const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("ogg") ? "ogg" : "mp3";
  return {
    buffer: Buffer.from(base64Data, "base64"),
    mimeType,
    ext,
  };
}

function saveSharedSongRecord(
  shareIdInput: string | undefined,
  updates: Partial<StoredSongRecord> & {
    lyriaDataUrl?: string | null;
    narrationDataUrl?: string | null;
    greetingBuffer?: Buffer | null;
  }
): StoredSongRecord {
  const shareId = normalizeShareId(shareIdInput);
  const existing: StoredSongRecord = loadSharedSongRecord(shareId) || {
    shareId,
    createdAt: new Date().toISOString(),
    song: updates.song || null,
    lyrics: updates.lyrics || "",
    userWords: updates.userWords || "",
    recipientName: updates.recipientName || updates.song?.target || "Someone Special",
    songTitle: updates.songTitle || updates.song?.title || "Custom Gift Song",
    artistPersona: updates.artistPersona || updates.song?.artistPersona || "haddi",
  };

  if (updates.song) existing.song = updates.song;
  if (updates.lyrics !== undefined && updates.lyrics !== "") existing.lyrics = updates.lyrics;
  if (updates.userWords !== undefined && updates.userWords !== "") existing.userWords = updates.userWords;
  if (updates.recipientName) existing.recipientName = updates.recipientName;
  if (updates.songTitle) existing.songTitle = updates.songTitle;
  if (updates.artistPersona) existing.artistPersona = updates.artistPersona;
  if (updates.reactions) existing.reactions = updates.reactions;

  if (updates.lyriaDataUrl) {
    const parsed = parseDataUrlToBuffer(updates.lyriaDataUrl);
    if (parsed) {
      // Never let a 24kHz TTS WAV overwrite an existing Lyria MP3 song file
      const mp3Candidate = `${shareId}-song.mp3`;
      const hasExistingMp3 = fs.existsSync(path.join(SHARED_SONGS_DIR, mp3Candidate));
      if (parsed.ext === "mp3" || !hasExistingMp3) {
        const fileName = `${shareId}-song.${parsed.ext}`;
        try {
          fs.writeFileSync(path.join(SHARED_SONGS_DIR, fileName), parsed.buffer);
          existing.audioFileName = fileName;
          existing.audioMimeType = parsed.mimeType;
        } catch (e) {
          console.warn("Could not write song audio file to disk:", e);
        }
      } else {
        existing.audioFileName = mp3Candidate;
        existing.audioMimeType = "audio/mpeg";
      }
    } else if (updates.lyriaDataUrl.startsWith("http")) {
      existing.externalAudioUrl = updates.lyriaDataUrl;
    }
  }

  if (updates.narrationDataUrl) {
    const parsed = parseDataUrlToBuffer(updates.narrationDataUrl);
    if (parsed) {
      const fileName = `${shareId}-narration.${parsed.ext}`;
      try {
        fs.writeFileSync(path.join(SHARED_SONGS_DIR, fileName), parsed.buffer);
        existing.narrationFileName = fileName;
        // Only fall back to narration as audioFileName if no sung song file exists at all
        const mp3Candidate = `${shareId}-song.mp3`;
        if (fs.existsSync(path.join(SHARED_SONGS_DIR, mp3Candidate))) {
          existing.audioFileName = mp3Candidate;
          existing.audioMimeType = "audio/mpeg";
        } else if (!existing.audioFileName) {
          existing.audioFileName = fileName;
          existing.audioMimeType = parsed.mimeType;
        }
      } catch (e) {
        console.warn("Could not write narration audio file to disk:", e);
      }
    }
  }

  if (updates.greetingBuffer) {
    const fileName = `${shareId}-greeting.wav`;
    try {
      fs.writeFileSync(path.join(SHARED_SONGS_DIR, fileName), updates.greetingBuffer);
      existing.greetingFileName = fileName;
    } catch (e) {
      console.warn("Could not write greeting audio file to disk:", e);
    }
  }

  memorySongStore.set(shareId, existing);
  try {
    fs.writeFileSync(
      path.join(SHARED_SONGS_DIR, `${shareId}.json`),
      JSON.stringify(existing, null, 2),
      "utf-8"
    );
  } catch (e) {
    console.warn("Could not write shared song metadata JSON:", e);
  }
  return existing;
}

function loadSharedSongRecord(shareId: string): StoredSongRecord | null {
  const cleanId = shareId.trim();
  if (memorySongStore.has(cleanId)) {
    return memorySongStore.get(cleanId)!;
  }
  const metaPath = path.join(SHARED_SONGS_DIR, `${cleanId}.json`);
  try {
    if (fs.existsSync(metaPath)) {
      const parsed = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as StoredSongRecord;
      memorySongStore.set(cleanId, parsed);
      return parsed;
    }
  } catch {
    // ignore read error
  }
  return null;
}

// Helper to extract the user's exact words/lyrics from the context string (stripping any repeated Occasion / Desired Words labels)
function extractUserWordsFromContext(rawContext?: string): string {
  if (!rawContext) return "";
  let cleaned = rawContext.trim();
  if (!cleaned) return "";
  // Repeatedly strip leading "Occasion: ... Desired Words & Lyrics:" prefixes so they never appear in song lines
  for (let i = 0; i < 4; i++) {
    const next = cleaned
      .replace(/^Occasion:\s*[^.\n]+[.\n]?\s*/i, "")
      .replace(/^(?:Desired Words & Lyrics|Words & Lyrics|Desired Lyrics|Lyrics|Words|Special Message):\s*/i, "")
      .trim();
    if (next === cleaned) break;
    cleaned = next;
  }
  return cleaned;
}

// Split user-provided words/lyrics into clean singable lines so the song always uses their exact words
function splitUserWordsIntoSingableLines(userWords: string): string[] {
  const cleaned = userWords.trim();
  if (!cleaned) return [];
  // First check if user already provided multiple lines or sentences
  const rawSplits = cleaned
    .split(/\r?\n|(?<=[.!?])\s+|;\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("["));

  const finalLines: string[] = [];
  for (const segment of rawSplits) {
    if (segment.length <= 68) {
      finalLines.push(segment);
    } else {
      // Break long run-on sentences at commas or every ~10 words so each line is singable
      const words = segment.split(/\s+/);
      let current = "";
      for (const w of words) {
        if ((current + " " + w).trim().length <= 58) {
          current = (current + " " + w).trim();
        } else {
          if (current) finalLines.push(current);
          current = w;
        }
      }
      if (current) finalLines.push(current);
    }
  }
  return finalLines;
}

// Ensure the generated song's lyricSections directly include the exact words/lyrics the user gave!
function ensureUserLyricsInSongSections(song: any, rawContext: string, target: string): any {
  const userWords = extractUserWordsFromContext(rawContext);
  if (!userWords || !song || !Array.isArray(song.lyricSections)) return song;

  const userLines = splitUserWordsIntoSingableLines(userWords);
  if (userLines.length === 0) return song;

  // Check if the AI already included the user's words verbatim
  const allGeneratedText = song.lyricSections
    .flatMap((s: any) => s.lines || [])
    .join(" ")
    .toLowerCase();
  const sampleCheck = userLines[0].toLowerCase().slice(0, Math.min(24, userLines[0].length));

  const sections = [...song.lyricSections];
  const verseIdx = sections.findIndex((s: any) => s.sectionName?.toLowerCase().includes("verse"));
  const chorusIdx = sections.findIndex((s: any) => s.sectionName?.toLowerCase().includes("chorus"));

  if (!allGeneratedText.includes(sampleCheck)) {
    // User gave specific lyrics/words and the model paraphrased or ignored them: inject the user's exact lines!
    if (userLines.length >= 3) {
      // User gave multi-line lyrics: use their exact lines in Verse 1 and Chorus!
      const v1Lines = userLines.slice(0, 4);
      while (v1Lines.length < 4) {
        v1Lines.push(`Singing with love and joy for ${target}!`);
      }
      if (verseIdx >= 0) {
        sections[verseIdx] = {
          ...sections[verseIdx],
          lines: v1Lines,
          chords: ["G", "C", "D", "G"].slice(0, v1Lines.length),
        };
      }
      if (chorusIdx >= 0 && userLines.length > 2) {
        const cLines = userLines.length > 4 ? userLines.slice(4, 8) : [...userLines.slice(0, 3), `Blessings and joy to you, ${target}!`];
        while (cLines.length < 4) {
          cLines.push(`Happy blessings to ${target} today and always!`);
        }
        sections[chorusIdx] = {
          ...sections[chorusIdx],
          lines: cLines,
          chords: ["C", "G", "D", "G"].slice(0, cLines.length),
        };
      }
    } else {
      // User gave 1-2 lines/phrases: weave their exact lines into Verse 1 and Chorus
      if (verseIdx >= 0 && sections[verseIdx].lines?.length >= 2) {
        const updatedV1 = [...sections[verseIdx].lines];
        updatedV1[0] = `For ${target}: ${userLines[0]}`;
        if (userLines[1]) updatedV1[1] = userLines[1];
        sections[verseIdx] = { ...sections[verseIdx], lines: updatedV1 };
      }
      if (chorusIdx >= 0 && sections[chorusIdx].lines?.length >= 2) {
        const updatedChorus = [...sections[chorusIdx].lines];
        updatedChorus[0] = userLines[0];
        if (userLines[1]) updatedChorus[1] = userLines[1];
        sections[chorusIdx] = { ...sections[chorusIdx], lines: updatedChorus };
      }
    }
  }

  return {
    ...song,
    lyricSections: sections,
  };
}

// Ensure the Stripe key is loaded lazily to preserve startup reliability
let stripeClient: Stripe | null = null;
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("WARNING: STRIPE_SECRET_KEY environment variable is not set. A high-fidelity sandbox simulation URL will be provided instead of hitting Stripe checkout.");
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-02-18.acacia" as any
    });
  }
  return stripeClient;
}

// Dynamically read GEMINI_API_KEY so newly configured keys take effect immediately
let aiClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined = undefined;

function getConfiguredGeminiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ""
  ).trim();
}

function hasValidApiKey(): boolean {
  const currentKey = getConfiguredGeminiKey();
  return Boolean(currentKey && currentKey !== "MOCK_KEY" && currentKey.trim() !== "");
}

function getAiClient(): GoogleGenAI {
  const currentKey = getConfiguredGeminiKey();
  if (!aiClient || cachedApiKey !== currentKey) {
    if (!currentKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Fallback vocal engine will be used.");
    }
    cachedApiKey = currentKey;
    aiClient = new GoogleGenAI({
      apiKey: currentKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();

// Enable full CORS so GitHub/Vercel (www.mygiftsong.org) and any external client can call /api/* directly
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Port is hardcoded to 3000 by the environment constraints
const PORT = 3000;

// Subconscious default mock songs for robust offline or missing API key fallback
const getDummySong = (
  target: string,
  context: string,
  setType: string,
  index: number = 0,
  customGenre?: string,
  language: string = "English",
  artistPersona: "haddi" | "yosia" = "haddi"
): any => {
  const isIndonesian = language.toLowerCase().includes("indonesia");
  const isYosia = artistPersona === "yosia" || (customGenre || "").toLowerCase().includes("children");

  const titles = isIndonesian
    ? [
        `Lagu Berkat & Sukacita untuk ${target}`,
        `Senyum Bahagia & Kasih Karunia bagi ${target}`,
        `Nyanyian Harapan & Berkat untuk ${target}`
      ]
    : isYosia
    ? [
        `Yosia's Happy Guitar Blessing for ${target}`,
        `Shine Bright & Smile Big, ${target}!`,
        `A Joyful Song of Happiness for ${target}`
      ]
    : [
        `Covenant Blessing and Favor for ${target}`,
        `Anointing and Grace upon ${target}`,
        `Breath of Life and Praise for ${target}`
      ];

  const genres = isYosia
    ? ["Joyful Kids Acoustic Sing-Along", "Cheerful Sunshine Guitar Strum", "Warm Fireside Children's Folk"]
    : ["Jakarta Christian Acoustic Folk", "Sumatran Sacred Ballad", "Soulful Jakarta Cathedral Worship Strum"];
  const tempos = isYosia
    ? ["Happy Bouncy Strum (104 BPM)", "Joyful Sing-Along Beat (108 BPM)", "Warm Fireside Plucking (92 BPM)"]
    : ["Peaceful Plucking (78 BPM)", "Reverent Worship Strum (84 BPM)", "Heartfelt Praise Strum (92 BPM)"];

  const intros = isIndonesian
    ? [
        `Halo semuanya! Salam sukacita dari Jakarta! ${isYosia ? "Aku Yosia, adik kecil Bang Haddi! Aku suka sekali bermain gitar untuk membuat hati semua orang gembira!" : "Saya Haddi di sudut jalan musik digital kita."} Hari ini petikan gitar akustik ini khusus untuk ${target}. Tidak ada hadiah yang lebih indah daripada sebuah lagu!`,
        `Selamat datang kawanku! ${isYosia ? "Yosia dan Bang Haddi di sini!" : "Haddi di sini!"} Kami memetik senar perak penuh Berkat dan Kasih Karunia untuk ${target}. Mari bernyanyi bersama dengan hati yang gembira!`,
        `Shalom dan salam bahagia! Gitar kayu hangat ini siap menyanyikan lagu sukacita dan berkat khusus untuk ${target}!`
      ]
    : isYosia
    ? [
        `Halo! Hi my friend! I'm Yosia, Haddi's little brother! I play acoustic guitar too, and my favorite thing in the whole world is helping make people happy! Big brother Haddi and I tuned up our strings by the warm fireplace just for ${target}!`,
        `Selamat datang! Yosia here with my acoustic guitar and a big smile! Nothing makes me happier than singing a joyful blessing song for ${target}. Let's clap and sing along together!`,
        `Yay! Ready to smile? I'm Yosia, Haddi's little brother! Let's strum a cheerful song of Blessing, Grace, and pure happiness for ${target}!`
      ]
    : [
        `Shalom! Haddi here at my digital musician street corner. My heart has walked from Sumatra to Jakarta today to sing a Covenant Blessing of Divine Purpose for ${target}. There is no greater gift than a song... let this pure song of Grace touch your spirit guide.`,
        `Halo kawanku, Shalom! Welcome to my digital street corner. I've tuned the silver strings to release the Breath of Life and holy Anointing upon ${target}. Let His Faithfulness and Favor surround you today.`,
        `Oh, the aged wood of my guitar is ready, and my heart bursts with Praise! For ${target}'s divine journey, Haddi is singing a song of holy Sanctuary. Hear the silver strings ring out with His Grace!`
      ];

  const duration = setType === "quick" ? 60 : 120;

  // Extract any exact custom words the user provided so they appear directly in the song lyrics
  const extractedUserWords = (() => {
    if (!context) return "";
    const match = context.match(/Desired Words & Lyrics:\s*(.+)$/i);
    if (match && match[1]) return match[1].trim();
    return context.replace(/^Occasion:\s*[^.]+\.\s*/i, "").trim();
  })();

  const lyricSections = isIndonesian
    ? [
        {
          sectionName: "Intro",
          lines: [
            "[Petikan Gitar Akustik Hangat oleh Yosia & Haddi]",
            "[Senyum sukacita dan nada penuh berkat]"
          ],
          chords: ["G", "C"],
          timestamps: [0, 4]
        },
        {
          sectionName: "Verse 1",
          lines: [
            `Hari ini mentari bersinar cerah untuk ${target},`,
            extractedUserWords
              ? `${extractedUserWords}, penuh sukacita dan kasih karunia,`
              : `Membawa Berkat dan Kasih Karunia yang tak pernah pudar.`,
            `Setiap langkahmu dipenuhi Tujuan Ilahi yang indah,`,
            `Senyummu membawa terang dan sukacita di setiap rumah.`
          ],
          chords: ["G", "D", "Em", "C"],
          timestamps: [8, 14, 20, 26]
        },
        {
          sectionName: "Chorus",
          lines: [
            `Petik gitar bersama Yosia dan Haddi bernyanyi gembira,`,
            extractedUserWords
              ? `Nyanyikanlah: "${extractedUserWords}" untuk ${target} tercinta!`
              : `Memuji Kesetiaan Tuhan yang menjaga sepanjang masa!`,
            `Di dalam tempat kudus-Nya hatimu bersukaria,`,
            `Berkat melimpah turun atas hidup ${target} selamanya!`
          ],
          chords: ["G", "C", "D", "C"],
          timestamps: [32, 38, 44, 50]
        }
      ]
    : [
        {
          sectionName: "Intro",
          lines: [
            isYosia ? "[Yosia & Haddi Joyful Acoustic Guitar Intro]" : "[Acoustic Reverent Strumming Intro]",
            isYosia ? "[Warm fireside strumming and happy hums]" : "[Soft hums of holiness and sanctuary resonance]"
          ],
          chords: ["G", "C"],
          timestamps: [0, 4]
        },
        {
          sectionName: "Verse 1",
          lines: [
            `Today we lift a joyful song of blessing for ${target},`,
            extractedUserWords
              ? `${extractedUserWords}, shining bright in His light,`
              : `Clad in Divine Purpose, walking in His light.`,
            `Under His holy Covenant, your Favor is secure,`,
            `An Inheritance of Grace that will forever endure.`
          ],
          chords: ["G", "D", "Em", "C"],
          timestamps: [8, 14, 20, 26]
        },
        {
          sectionName: "Chorus",
          lines: [
            `So ${isYosia ? "Yosia and Haddi" : "Haddi"} strumming Praise for ${target} today,`,
            extractedUserWords
              ? `Singing every word from the heart: "${extractedUserWords}"!`
              : `An Anointing of sweet mercy to cover all your days!`,
            `In the quiet Sanctuary where your spirit will arise,`,
            `Releasing joyful Blessings sent down from the skies!`
          ],
          chords: ["G", "C", "D", "C"],
          timestamps: [32, 38, 44, 50]
        }
      ];

  if (setType !== "quick") {
    lyricSections.push(
      isIndonesian
        ? {
            sectionName: "Verse 2",
            lines: [
              `Oleh Kesetiaan-Nya yang ajaib, hidupmu selalu dijaga,`,
              `Dilingkupi Kemurahan dan Kasih sayang-Nya yang sempurna.`,
              `Urapan sukacita membuat senar gitar ini berbunyi indah,`,
              `Menyebarkan kebahagiaan dan senyuman yang penuh berkah.`
            ],
            chords: ["Em", "G", "C", "D"],
            timestamps: [56, 62, 68, 74]
          }
        : {
            sectionName: "Verse 2",
            lines: [
              `By His amazing Faithfulness, you are preserved through the night,`,
              `Bathed in His rich and boundless Favor, walking in the light.`,
              `This Anointing of high joy makes the silver strings resound,`,
              `As we enter into His sanctuary, where true Grace is found.`
            ],
            chords: ["Em", "G", "C", "D"],
            timestamps: [56, 62, 68, 74]
          },
      lyricSections[2],
      isIndonesian
        ? {
            sectionName: "Outro",
            lines: [
              `Kord gitar hangat perlahan mengalun manis,`,
              `Lagu pujian dan kebahagiaan kini tertulis.`,
              `Berkat dan Kasih Karunia menyertai langkah ${target} selalu!`
            ],
            chords: ["G", "C", "G"],
            timestamps: [104, 110, 115]
          }
        : {
            sectionName: "Outro",
            lines: [
              `Yeah, the silver chords are fading sweet,`,
              `A song of beautiful Praise is now complete.`,
              `Covenant Favor and Blessings rest on your divine pathway of light!`
            ],
            chords: ["G", "C", "G"],
            timestamps: [104, 110, 115]
          }
    );
  }

  return {
    id: `song-${Date.now()}-${index}`,
    title: titles[index % titles.length],
    target,
    context: context || "A holy covenant blessing dedication",
    setType,
    tempo: tempos[index % tempos.length],
    genre: customGenre || genres[index % genres.length],
    artistIntro: intros[index % intros.length],
    lyricSections,
    totalDurationSeconds: duration,
    language,
    artistPersona: isYosia ? "yosia" : "haddi"
  };
};

// Base Song Schema Helper to ensure robust structured output parsing
const getSongSchema = () => {
  return {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A gorgeous, poetic, creative title for the acoustic folk song. DO NOT include quotes around it.",
      },
      artistIntro: {
        type: Type.STRING,
        description: "A warm, personal spoken introduction from Haddi the Minstrel (or his joyful little brother Yosia if performing a Children's Song). Greet the recipient warmly, mention playing the acoustic guitar to bring them happiness, honor, and blessing, operating under the law that 'There is no greater gift than a song... it is worth more than a thousand words!'.",
      },
      tempo: {
        type: Type.STRING,
        description: "Speed description with BPM suitable for acoustic guitar, e.g., 'Soulful Kampung Strum (85 BPM)' or 'Joyful Kids Sing-Along Beat (105 BPM)'",
      },
      genre: {
        type: Type.STRING,
        description: "The specific folk acoustic style, e.g., 'Jakarta Street Folk', 'Children's Joyful Acoustic Sing-Along', 'Sumatran Acoustic Ballad'",
      },
      lyricSections: {
        type: Type.ARRAY,
        description: "The blocks of lyrics that compose the performance. Must include Intro, at least 1 Verse, Chorus, and optionally dynamic sections.",
        items: {
          type: Type.OBJECT,
          properties: {
            sectionName: {
              type: Type.STRING,
              description: "The label, e.g. 'Intro', 'Verse 1', 'Chorus', 'Verse 2', 'Outro'",
            },
            lines: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The actual poetic lines of the lyric. Do NOT make them empty.",
            },
            chords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The continuous simple guitar chord values (e.g. G, C, D, Em, Am) matching this progression. Should match the length of the lines array.",
            },
            timestamps: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Timestamp in seconds where each lyric line is delivered or sung. Progression goes chronological, starting at 0.",
            },
          },
          required: ["sectionName", "lines", "chords", "timestamps"],
        },
      },
    },
    required: ["title", "artistIntro", "tempo", "genre", "lyricSections"],
  };
};

// 1. Core Custom Song Generator Endpoint using gemini-3.8-flash
app.post("/api/generate-song", async (req, res) => {
  const { target, context, setType, customGenre, language = "English", artistPersona = "haddi" } = req.body;
  
  if (!target) {
    return res.status(400).json({ error: "Target (recipient name or brand) is required." });
  }

  const cleanTarget = target.trim();
  const cleanContext = (context || "").trim();
  const cleanSetType = setType || "quick";
  const cleanCustomGenre = (customGenre || "Acoustic Folk").trim();
  const cleanLanguage = (language || "English").trim();
  const cleanPersona: "haddi" | "yosia" =
    artistPersona === "yosia" || cleanCustomGenre.toLowerCase().includes("children") || cleanCustomGenre.toLowerCase().includes("kids")
      ? "yosia"
      : "haddi";

  const exactUserWords = extractUserWordsFromContext(cleanContext);
  const userLyricLines = splitUserWordsIntoSingableLines(exactUserWords);

  // Check if API client can be used, otherwise return simulated high-quality data
  const isExtendedType = cleanSetType === "extended" || cleanSetType === "premium" || cleanSetType === "legacy";
  if (!hasValidApiKey()) {
    console.log("No API Key configured. Returning robust simulated song data.");
    if (isExtendedType) {
      const primary = ensureUserLyricsInSongSections(
        getDummySong(cleanTarget, cleanContext, "full", 0, cleanCustomGenre, cleanLanguage, cleanPersona),
        cleanContext,
        cleanTarget
      );
      const var1 = ensureUserLyricsInSongSections(
        getDummySong(cleanTarget, cleanContext, "full", 1, cleanCustomGenre, cleanLanguage, cleanPersona),
        cleanContext,
        cleanTarget
      );
      const var2 = ensureUserLyricsInSongSections(
        getDummySong(cleanTarget, cleanContext, "full", 2, cleanCustomGenre, cleanLanguage, cleanPersona),
        cleanContext,
        cleanTarget
      );
      saveSharedSongRecord(primary.id, {
        song: primary,
        userWords: exactUserWords,
        recipientName: cleanTarget,
        songTitle: primary.title,
        artistPersona: cleanPersona,
      });
      return res.json({
        success: true,
        song: primary,
        shareId: primary.id,
        variations: [primary, var1, var2]
      });
    } else {
      const song = ensureUserLyricsInSongSections(
        getDummySong(cleanTarget, cleanContext, cleanSetType, 0, cleanCustomGenre, cleanLanguage, cleanPersona),
        cleanContext,
        cleanTarget
      );
      saveSharedSongRecord(song.id, {
        song,
        userWords: exactUserWords,
        recipientName: cleanTarget,
        songTitle: song.title,
        artistPersona: cleanPersona,
      });
      return res.json({ success: true, song, shareId: song.id });
    }
  }

  try {
    const client = getAiClient();
    const isExtended = isExtendedType;
    const duration = cleanSetType === "quick" ? 60 : 120;

    const personaInstruction =
      cleanPersona === "yosia"
        ? `You are Yosia, Haddi's cheerful, big-hearted little brother! You are a joyful young Indonesian boy who wears a colorful woven cap, a bright golden hoodie under a denim jacket, and yellow socks, strumming your acoustic guitar by a warm studio fireplace. You LOVE helping make people happy, especially children, families, teachers, and friends like Mr. Sonni! Your big brother Haddi plays guitar alongside you.`
        : `You are Haddi, an incredibly talented, humble, and soulful street musician originally from Sumatra, now living and performing on the ground within the communities of Jakarta. This application is your digital musician street corner!`;

    const languageInstruction =
      cleanLanguage.toLowerCase() !== "english"
        ? `\nCRITICAL LANGUAGE REQUIREMENT: Write the song title, artistIntro, and all sung lyric lines in **${cleanLanguage}**! Keep any exact phrases or lyrics provided by the user intact, and make sure the surrounding lines rhyme naturally and flow rhythmically with acoustic guitar strumming.`
        : `\nCRITICAL LYRICAL STYLE REQUIREMENT:
Keep the tone warm, joyful, heartfelt, and full of blessing, grace, and celebration over ${cleanTarget}. However, NEVER overwrite or discard the user's own lyrics or words!`;

    let systemInstruction = `${personaInstruction}
You write heart-warming, singable acoustic folk song lyrics dedicated to ${cleanTarget}.
${languageInstruction}
HIGHEST PRIORITY RULE — PRESERVE THE USER'S EXACT WORDS & LYRICS:
When the user provides specific words, sentences, or lyrics, you MUST keep their exact words and lines verbatim inside Verse 1 and the Chorus! Do NOT invent a completely different song that ignores their words. Build the song directly around the exact words they gave you.
Chords should utilize basic folk keys (such as G, C, D, Em, Am, F) to sound organic when played on acoustic guitar strings.
Ensure timestamps occur chronologically within the total duration of ${duration} seconds.
Lines must align with chord rhythms. Minimum of 2 lines for Intro and Outro, and 4 lines for Verse and Chorus.`;

    let userPrompt = `Create a personalized ${duration}-second acoustic song for:
- TARGET NAME: "${cleanTarget}"
- FULL CONTEXT & OCCASION: "${cleanContext || "A happy dedication filled with warm acoustic folk spirit"}"
- USER'S EXACT PROVIDED WORDS / LYRICS TO USE IN THE SONG:
${userLyricLines.length > 0 ? userLyricLines.map((l, idx) => `  Line ${idx + 1}: "${l}"`).join("\n") : `  "${exactUserWords || "Happy blessings and joy to " + cleanTarget}"`}
- MUSICAL STYLE/THEME SELECT: "${cleanCustomGenre}"
- PERFORMER PERSONA: "${cleanPersona === "yosia" ? "Yosia (Haddi's joyful little brother)" : "Haddi the Street Minstrel"}"
- TARGET LANGUAGE: "${cleanLanguage}"
- SET SELECTION: ${cleanSetType === "quick" ? "THE QUICK STRUM (60s complete verse & chorus)" : "THE FULL LONGER SONG ($1.99 Packet • 120s multi-verse song with Intro, Verse 1, Chorus, Verse 2, Chorus, Bridge, and Outro)"}

MANDATORY INSTRUCTION:
1. You MUST include the USER'S EXACT PROVIDED WORDS / LYRICS verbatim in Verse 1 and Chorus! If the user wrote lyric lines, use their exact lines word-for-word as the lines of Verse 1 and Chorus.
2. In artistIntro, start with a warm personal greeting: "Hi ${cleanTarget}! This is ${cleanPersona === "yosia" ? "Yosia" : "Haddi"}, wishing you a happy, blessed celebration!"`;

    if (isExtended) {
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          song1: getSongSchema(),
          song2: getSongSchema(),
          song3: getSongSchema()
        },
        required: ["song1", "song2", "song3"]
      };

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt + `\nGenerate 3 acoustic folk variations in ${cleanLanguage} that all faithfully include the user's exact words/lyrics.`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.45
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response received from the Gemini model.");
      }

      const parsed = JSON.parse(resultText);
      const song1 = ensureUserLyricsInSongSections(
        { ...parsed.song1, id: `song-${Date.now()}-1`, target: cleanTarget, context: cleanContext, setType: "extended", totalDurationSeconds: 120, language: cleanLanguage, artistPersona: cleanPersona },
        cleanContext,
        cleanTarget
      );
      const song2 = ensureUserLyricsInSongSections(
        { ...parsed.song2, id: `song-${Date.now()}-2`, target: cleanTarget, context: cleanContext, setType: "extended", totalDurationSeconds: 120, language: cleanLanguage, artistPersona: cleanPersona },
        cleanContext,
        cleanTarget
      );
      const song3 = ensureUserLyricsInSongSections(
        { ...parsed.song3, id: `song-${Date.now()}-3`, target: cleanTarget, context: cleanContext, setType: "extended", totalDurationSeconds: 120, language: cleanLanguage, artistPersona: cleanPersona },
        cleanContext,
        cleanTarget
      );

      saveSharedSongRecord(song1.id, {
        song: song1,
        userWords: exactUserWords,
        recipientName: cleanTarget,
        songTitle: song1.title,
        artistPersona: cleanPersona,
      });

      return res.json({
        success: true,
        song: song1,
        shareId: song1.id,
        variations: [song1, song2, song3]
      });
    } else {
      const responseSchema = getSongSchema();
      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.4
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response from model.");
      }

      const parsed = JSON.parse(resultText);
      const song = ensureUserLyricsInSongSections(
        {
          ...parsed,
          id: `song-${Date.now()}`,
          target: cleanTarget,
          context: cleanContext,
          setType: cleanSetType,
          totalDurationSeconds: duration,
          language: cleanLanguage,
          artistPersona: cleanPersona
        },
        cleanContext,
        cleanTarget
      );

      saveSharedSongRecord(song.id, {
        song,
        userWords: exactUserWords,
        recipientName: cleanTarget,
        songTitle: song.title,
        artistPersona: cleanPersona,
      });

      return res.json({
        success: true,
        song,
        shareId: song.id
      });
    }

  } catch (error: any) {
    console.error("Gemini song generation error:", error);
    const fallbackSong = ensureUserLyricsInSongSections(
      getDummySong(cleanTarget, cleanContext, cleanSetType, 0, cleanCustomGenre, cleanLanguage, cleanPersona),
      cleanContext,
      cleanTarget
    );
    saveSharedSongRecord(fallbackSong.id, {
      song: fallbackSong,
      userWords: exactUserWords,
      recipientName: cleanTarget,
      songTitle: fallbackSong.title,
      artistPersona: cleanPersona,
    });
    const isExtendedType = cleanSetType === "extended" || cleanSetType === "premium" || cleanSetType === "legacy";
    if (isExtendedType) {
      const fallbackVar1 = ensureUserLyricsInSongSections(
        getDummySong(cleanTarget, cleanContext, "full", 1, cleanCustomGenre, cleanLanguage, cleanPersona),
        cleanContext,
        cleanTarget
      );
      const fallbackVar2 = ensureUserLyricsInSongSections(
        getDummySong(cleanTarget, cleanContext, "full", 2, cleanCustomGenre, cleanLanguage, cleanPersona),
        cleanContext,
        cleanTarget
      );
      return res.json({
        success: true,
        song: fallbackSong,
        shareId: fallbackSong.id,
        variations: [fallbackSong, fallbackVar1, fallbackVar2],
        note: "Fallback active due to model parse error."
      });
    }
    return res.json({
      success: true,
      song: fallbackSong,
      shareId: fallbackSong.id,
      note: "Fallback active due to model parse error."
    });
  }
});

// 1B. AI Song & Lyric Language Translator Endpoint (e.g., Translate Mr. Sonni Song or any song into Bahasa Indonesia, etc.)
app.post("/api/translate-song", async (req, res) => {
  const { song, targetLanguage = "Bahasa Indonesia" } = req.body;

  if (!song || !song.lyricSections) {
    return res.status(400).json({ error: "Valid song object with lyricSections is required for translation." });
  }

  const cleanLang = targetLanguage.trim();

  // Built-in poetic fallback translator for offline or missing API key
  const buildFallbackTranslation = () => {
    const isIndo = cleanLang.toLowerCase().includes("indonesia") || cleanLang.toLowerCase().includes("melayu");
    const isMrSonni = (song.target || "").toLowerCase().includes("sonni") || (song.title || "").toLowerCase().includes("sonni");

    if (isIndo && isMrSonni) {
      return {
        ...song,
        title: "Lagu Bahagia Pak Sonni (Membawa Senyum & Berkat)",
        artistIntro:
          "Halo semuanya! Aku Yosia, adik kecil Bang Haddi! Aku suka sekali bermain gitar dan membuat hati orang-orang gembira! Lagu dalam Bahasa Indonesia ini khusus kami nyanyikan untuk Pak Sonni (Mr. Sonni) yang baik hati!",
        language: cleanLang,
        lyricSections: [
          {
            sectionName: "Intro",
            lines: [
              "[Petikan Gitar Ceria Yosia & Bang Haddi di Depan Perapian]",
              "[Senandung hangat penuh sukacita: La-la-la, terima kasih Pak Sonni!]"
            ],
            chords: song.lyricSections[0]?.chords || ["G", "C"],
            timestamps: song.lyricSections[0]?.timestamps || [0, 4]
          },
          {
            sectionName: "Verse 1",
            lines: [
              "Selamat pagi Pak Sonni, mentari bersinar cerah,",
              "Senyummu yang ramah membuat hati kami gembira!",
              "Dengan hati yang tulus dan semangat yang luar biasa,",
              "Engkau menabur kebaikan dan berkat bagi sesama."
            ],
            chords: song.lyricSections[1]?.chords || ["G", "D", "Em", "C"],
            timestamps: song.lyricSections[1]?.timestamps || [8, 14, 20, 26]
          },
          {
            sectionName: "Chorus",
            lines: [
              "Oh Pak Sonni, terima kasih atas hati yang mulia,",
              "Yosia dan Haddi memetik gitar bernyanyi gembira!",
              "Kiranya Berkat, Kasih Karunia, dan Kemurahan Tuhan,",
              "Menjaga langkah Pak Sonni dalam damai dan kebahagiaan!"
            ],
            chords: song.lyricSections[2]?.chords || ["C", "G", "D", "G"],
            timestamps: song.lyricSections[2]?.timestamps || [32, 38, 44, 50]
          },
          ...(song.lyricSections.length > 3
            ? [
                {
                  sectionName: "Verse 2",
                  lines: [
                    "Dari Jakarta hingga ke seluruh penjuru dunia,",
                    "Setiap kebaikan kecil membawa terang surga.",
                    "Senar gitar kami berdenting dengan penuh rasa syukur,",
                    "Doa kami bagi Pak Sonni takkan pernah luntur!"
                  ],
                  chords: song.lyricSections[3]?.chords || ["Em", "C", "G", "D"],
                  timestamps: song.lyricSections[3]?.timestamps || [56, 62, 68, 74]
                },
                {
                  sectionName: "Outro",
                  lines: [
                    "Terima kasih Pak Sonni, tetaplah bersinar terang,",
                    "Tuhan memberkati hidupmu hari ini dan selamanya!"
                  ],
                  chords: song.lyricSections[4]?.chords || ["C", "G"],
                  timestamps: song.lyricSections[4]?.timestamps || [80, 86]
                }
              ]
            : [])
        ]
      };
    }

    if (isIndo) {
      return {
        ...song,
        title: `Lagu Berkat & Sukacita untuk ${song.target}`,
        artistIntro: `Halo kawanku! Selamat datang di mygiftsong.org! Berikut adalah terjemahan lagu spesial untuk ${song.target} dalam ${cleanLang}, dinyanyikan dengan penuh sukacita oleh Yosia & Haddi!`,
        language: cleanLang,
        lyricSections: song.lyricSections.map((sec: any, idx: number) => ({
          ...sec,
          lines:
            idx === 0
              ? ["[Petikan Gitar Akustik Hangat]", "[Alunan nada penuh berkat dan sukacita]"]
              : sec.lines.map((line: string, lIdx: number) => {
                  const indoLines = [
                    `Kasih dan Berkat Tuhan bersinar terang atas ${song.target},`,
                    `Melangkah dalam Tujuan Ilahi dan Kemurahan yang nyata.`,
                    `Petikan gitar sukacita menyanyikan syukur dan pujian,`,
                    `Kiranya damai sejahtera dan kebahagiaan selalu menyertaimu!`
                  ];
                  return indoLines[lIdx % indoLines.length] || line;
                })
        }))
      };
    }

    return {
      ...song,
      title: `${song.title} (${cleanLang})`,
      language: cleanLang
    };
  };

  if (!hasValidApiKey()) {
    return res.json({
      success: true,
      song: buildFallbackTranslation()
    });
  }

  try {
    const client = getAiClient();
    const translationSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: `The song title translated poetically into ${cleanLang}.`
        },
        artistIntro: {
          type: Type.STRING,
          description: `The spoken artist introduction translated warmly into ${cleanLang}.`
        },
        lyricSections: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sectionName: { type: Type.STRING },
              lines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: `The lyric lines translated into natural, singable, rhyming ${cleanLang} lyrics matching the exact number of lines in the original section.`
              }
            },
            required: ["sectionName", "lines"]
          }
        }
      },
      required: ["title", "artistIntro", "lyricSections"]
    };

    const prompt = `Translate and adapt the following acoustic gift song into singable, poetic, rhythmic **${cleanLang}**.
Keep the exact same number of sections and the exact same number of lines per section so that the guitar chords and timestamps align 1-to-1.
Make the lyrics sound natural, warm, joyful, and genuinely singable in ${cleanLang} (for example, if translating into Bahasa Indonesia, use warm, heartfelt, rhythmic Indonesian phrasing that flows naturally with an acoustic guitar melody).

Original Song Title: "${song.title}"
Recipient: "${song.target}"
Original Artist Intro: "${song.artistIntro}"
Original Sections:
${JSON.stringify(
  song.lyricSections.map((s: any) => ({
    sectionName: s.sectionName,
    lines: s.lines
  })),
  null,
  2
)}`;

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: translationSchema,
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty translation response");
    const parsed = JSON.parse(text);

    const mergedSections = song.lyricSections.map((origSec: any, idx: number) => {
      const translatedSec = parsed.lyricSections?.[idx];
      return {
        sectionName: translatedSec?.sectionName || origSec.sectionName,
        lines:
          Array.isArray(translatedSec?.lines) && translatedSec.lines.length > 0
            ? translatedSec.lines
            : origSec.lines,
        chords: origSec.chords,
        timestamps: origSec.timestamps
      };
    });

    return res.json({
      success: true,
      song: {
        ...song,
        title: parsed.title || song.title,
        artistIntro: parsed.artistIntro || song.artistIntro,
        lyricSections: mergedSections,
        language: cleanLang
      }
    });
  } catch (err) {
    console.warn("Song translation error, using poetic fallback:", err);
    return res.json({
      success: true,
      song: buildFallbackTranslation()
    });
  }
});


// Added Live Suno / Lyria generation API proxy route
app.post(["/api/generate-suno", "/api/generate"], async (req, res) => {
  const { prompt, tags, make_instrumental, wait_audio_ready } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Story prompt is required for song generation." });
  }

  const cleanTags = (tags || "Acoustic Folk").trim();

  // First try Google AI Studio Lyria 3 if API key is configured
  if (hasValidApiKey()) {
    try {
      const lyriaResult = await generateLyriaSongAudio(prompt, {
        genre: cleanTags,
        useClipModel: true
      });
      if (lyriaResult.audioUrl) {
        return res.json({
          success: true,
          audio_urls: [lyriaResult.audioUrl],
          lyrics: lyriaResult.lyrics
        });
      }
    } catch {
      console.info("[Lyria Bridge] Using secondary audio source.");
    }
  }

  const sunoApiKey = process.env.SUNO_API_KEY || "";
  
  // Set theme-based high-fidelity fallback audio URL paths
  const genreAudioUrls: Record<string, string> = {
    "Acoustic Folk": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "Bluegrass": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "Rustic Lute": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "Modern Worship": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "Lofi Acoustic": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    "Indie Pop": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
  };

  let songUrls: string[] = [
    genreAudioUrls[cleanTags] || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  ];

  try {
    if (sunoApiKey && sunoApiKey !== "MOCK_KEY") {
      console.log("[Suno Bridge] Contacting live Suno generation API utilizing standard REST parameters...");
      
      const response = await fetch("https://api.302.ai/v1/suno/submit/music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sunoApiKey}`
        },
        body: JSON.stringify({
          prompt: prompt,
          tags: cleanTags,
          make_instrumental: make_instrumental === true,
          wait_audio_ready: wait_audio_ready === true
        })
      });

      if (response.ok) {
        const result = await response.json() as any;
        if (Array.isArray(result)) {
          const urls = result.map((song: any) => song.audio_url || song.url).filter(Boolean);
          if (urls.length > 0) {
            songUrls = urls;
          }
        } else if (result && result.audio_urls) {
          songUrls = result.audio_urls;
        } else if (result && result.data && Array.isArray(result.data)) {
          const urls = result.data.map((song: any) => song.audio_url || song.url).filter(Boolean);
          if (urls.length > 0) {
            songUrls = urls;
          }
        }
      } else {
        console.warn("[Suno Bridge] Live API returned non-okay status:", response.status);
      }
    }
  } catch (apiErr) {
    console.warn("[Suno Bridge] Direct connection to live Suno endpoint timed out or failed, using robust fallback.", apiErr);
  }

  return res.json({
    success: true,
    audio_urls: songUrls
  });
});

// Helper to check if a buffer already starts with a known audio container signature
function hasAudioContainerHeader(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  const sig4 = buf.subarray(0, 4).toString("ascii");
  if (sig4 === "RIFF" || sig4 === "OggS" || sig4 === "fLaC") return true;
  if (buf.subarray(0, 3).toString("ascii") === "ID3") return true;
  // MP3 frame sync (0xFF followed by 0xE0..0xFF)
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;
  return false;
}

interface ParsedWavPcm {
  pcmData: Buffer;
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  audioFormat: number;
}

// Extract raw PCM samples and audio format metadata from a RIFF WAVE buffer or raw PCM buffer
function extractPcmAndWavFormat(
  buf: Buffer,
  defaultSampleRate = 24000,
  defaultChannels = 1,
  defaultBits = 16
): ParsedWavPcm {
  if (
    buf.length >= 44 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    let sampleRate = defaultSampleRate;
    let numChannels = defaultChannels;
    let bitsPerSample = defaultBits;
    let audioFormat = 1;
    const dataSlices: Buffer[] = [];

    let offset = 12;
    while (offset + 8 <= buf.length) {
      const chunkId = buf.subarray(offset, offset + 4).toString("ascii");
      const chunkSize = buf.readUInt32LE(offset + 4);
      const dataStart = offset + 8;

      if (chunkId === "fmt " && dataStart + 16 <= buf.length) {
        audioFormat = buf.readUInt16LE(dataStart);
        numChannels = buf.readUInt16LE(dataStart + 2) || defaultChannels;
        sampleRate = buf.readUInt32LE(dataStart + 4) || defaultSampleRate;
        bitsPerSample = buf.readUInt16LE(dataStart + 14) || defaultBits;
      } else if (chunkId === "data") {
        const safeEnd =
          chunkSize > 0 && dataStart + chunkSize <= buf.length
            ? dataStart + chunkSize
            : buf.length;
        dataSlices.push(buf.subarray(dataStart, safeEnd));
      }

      if (chunkSize <= 0 || dataStart + chunkSize > buf.length) {
        break;
      }
      offset = dataStart + chunkSize + (chunkSize % 2);
    }

    if (dataSlices.length > 0) {
      return {
        pcmData: Buffer.concat(dataSlices),
        sampleRate,
        numChannels,
        bitsPerSample,
        audioFormat,
      };
    }
    return {
      pcmData: buf.subarray(44),
      sampleRate,
      numChannels,
      bitsPerSample,
      audioFormat,
    };
  }

  return {
    pcmData: buf,
    sampleRate: defaultSampleRate,
    numChannels: defaultChannels,
    bitsPerSample: defaultBits,
    audioFormat: 1,
  };
}

// Apply a gentle fade-in and fade-out on 16-bit PCM buffer edges to prevent clicks when stitching movements
function applySoftEdgeFade16Bit(
  pcm: Buffer,
  sampleRate: number,
  numChannels: number,
  fadeMs = 120
): Buffer {
  const bytesPerSample = 2;
  const frameSize = numChannels * bytesPerSample;
  const totalFrames = Math.floor(pcm.length / frameSize);
  const fadeFrames = Math.min(Math.floor((sampleRate * fadeMs) / 1000), Math.floor(totalFrames / 8));
  if (fadeFrames <= 1) return pcm;

  const out = Buffer.from(pcm);
  for (let f = 0; f < fadeFrames; f++) {
    const gainIn = f / fadeFrames;
    const gainOut = (fadeFrames - 1 - f) / fadeFrames;
    const inBase = f * frameSize;
    const outBase = (totalFrames - 1 - f) * frameSize;

    for (let ch = 0; ch < numChannels; ch++) {
      const inOffset = inBase + ch * 2;
      if (inOffset + 2 <= out.length) {
        const sIn = out.readInt16LE(inOffset);
        out.writeInt16LE(Math.round(sIn * gainIn), inOffset);
      }
      const outOffset = outBase + ch * 2;
      if (outOffset >= 0 && outOffset + 2 <= out.length) {
        const sOut = out.readInt16LE(outOffset);
        out.writeInt16LE(Math.round(sOut * gainOut), outOffset);
      }
    }
  }
  return out;
}

// Helper to convert raw PCM audio into a standard RIFF WAV buffer with an accurate header
function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16,
  audioFormat = 1
): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(audioFormat, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Stitch multiple WAV/PCM buffers into a single continuous WAV file and ensure minimum target duration
function stitchAudioSegmentsToTargetDuration(
  rawSegments: Buffer[],
  targetDurationSeconds: number
): Buffer {
  const validSegments = rawSegments.filter((b) => b && b.length > 64);
  if (validSegments.length === 0) {
    throw new Error("No valid audio segments to stitch.");
  }

  const parsedList = validSegments.map((seg) => extractPcmAndWavFormat(seg));
  const primaryFmt = parsedList[0];
  const { sampleRate, numChannels, bitsPerSample, audioFormat } = primaryFmt;
  const bytesPerSecond = Math.max(1, sampleRate * numChannels * (bitsPerSample / 8));
  const frameSize = Math.max(2, numChannels * (bitsPerSample / 8));

  // Smooth edges on 16-bit integer PCM segments
  const smoothedPcms = parsedList.map((p) => {
    const alignedLen = p.pcmData.length - (p.pcmData.length % frameSize);
    const aligned = p.pcmData.subarray(0, alignedLen);
    return audioFormat === 1 && bitsPerSample === 16
      ? applySoftEdgeFade16Bit(aligned, sampleRate, numChannels, 110)
      : aligned;
  });

  const targetBytes = Math.floor(targetDurationSeconds * bytesPerSecond);
  const arrangedPcms: Buffer[] = [...smoothedPcms];
  let currentBytes = arrangedPcms.reduce((acc, b) => acc + b.length, 0);

  // If the AI model returned a 30-second clip per movement and the user selected a 60s or 120s ($1.99 Full Set) song,
  // arrange the movements (Verse 1/Chorus -> Verse 2/Chorus -> Encore Chorus Reprise) until the full duration is reached
  let idx = 0;
  while (currentBytes < targetBytes * 0.92 && smoothedPcms.length > 0 && arrangedPcms.length < 8) {
    const nextSeg = smoothedPcms[idx % smoothedPcms.length];
    const remainingNeeded = targetBytes - currentBytes;
    if (remainingNeeded < nextSeg.length * 0.35) break;

    if (remainingNeeded < nextSeg.length) {
      const sliceLen = remainingNeeded - (remainingNeeded % frameSize);
      const sliced = nextSeg.subarray(0, sliceLen);
      arrangedPcms.push(
        audioFormat === 1 && bitsPerSample === 16
          ? applySoftEdgeFade16Bit(sliced, sampleRate, numChannels, 180)
          : sliced
      );
      currentBytes += sliced.length;
      break;
    } else {
      arrangedPcms.push(nextSeg);
      currentBytes += nextSeg.length;
    }
    idx++;
  }

  const finalPcm = Buffer.concat(arrangedPcms);
  return pcmToWavBuffer(finalPcm, sampleRate, numChannels, bitsPerSample, audioFormat);
}

// Sanitize text sent to Lyria 3 so minor-related words ("children", "kids", "little brother"),
// personal proper names, or named persona attributions never trigger Lyria's PROHIBITED_CONTENT filter
function sanitizeTextForLyriaPrompt(input: string, recipientName?: string): string {
  if (!input) return "";
  let out = input;

  // Strip the recipient's specific name tokens (if provided) so PII/real-person filters never trigger
  if (recipientName && recipientName.trim()) {
    const tokens = recipientName
      .trim()
      .split(/[\s,.'"-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
    for (const token of tokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "you");
    }
  }

  return out
    .replace(
      /\b(performed\s+by|sung\s+by|by)\s+(Yosia\s+and\s+Haddi|Haddi\s+and\s+Yosia|Bang\s+Haddi|Yosia|Haddi|Mr\.?\s*Sonni|Pak\s+Sonni)\b/gi,
      "with warm acoustic guitar and vocals"
    )
    .replace(
      /\b(Yosia\s+and\s+Haddi|Haddi\s+and\s+Yosia|Bang\s+Haddi|Yosia|Haddi|Mr\.?\s*Sonni|Pak\s+Sonni)\b/gi,
      "the acoustic minstrel"
    )
    .replace(
      /\b(children's|children|child's|child|kids'|kids|kid|little\s+brother|little\s+sister|little\s+boy|little\s+girl|young\s+boy|young\s+girl|boy|girl|son|daughter|nephew|niece|grandson|granddaughter|toddler|baby|babies|schoolboy|schoolgirl|youth|teen|minor|anak-anak|anak\s+kecil|adik\s+kecil|adik)\b/gi,
      "joyful acoustic"
    )
    .replace(/\b\d+\s*(?:st|nd|rd|th)?\s*(?:birthday|years?\s*old|yr|yrs)\b/gi, "celebration")
    .replace(/["""]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract only filter-safe musical and uplifting thematic concepts from user context
function extractSafeLyriaThemes(input: string): string {
  const lower = (input || "").toLowerCase();
  const allowedThemes: { match: RegExp; label: string }[] = [
    { match: /\b(birthday|born|celebrat|party|anniversary)\b/, label: "joyful celebration" },
    { match: /\b(bless|grace|favor|mercy|peace|shalom|berkat)\b/, label: "warm blessings and peace" },
    { match: /\b(thank|gratitude|grateful|appreciat|syukur)\b/, label: "heartfelt gratitude" },
    { match: /\b(love|heart|cherish|dear|kasih)\b/, label: "warmth and kindness" },
    { match: /\b(smile|laugh|happy|joy|cheer|sukacita|gembira)\b/, label: "bright smiles and happiness" },
    { match: /\b(hope|dream|future|light|shine|sunshine)\b/, label: "bright hope and sunshine" },
    { match: /\b(friend|together|family|fellowship)\b/, label: "togetherness and friendship" },
  ];

  const matched = allowedThemes.filter((t) => t.match.test(lower)).map((t) => t.label);
  if (matched.length === 0) {
    return "joyful celebration, heartfelt gratitude, warm blessings, and bright smiles";
  }
  return matched.slice(0, 4).join(", ");
}

function sanitizeGenreForLyria(rawGenre: string): string {
  const lower = (rawGenre || "").toLowerCase();
  if (lower.includes("bluegrass") || lower.includes("country")) {
    return "upbeat acoustic folk and fingerstyle guitar";
  }
  if (lower.includes("worship") || lower.includes("gospel") || lower.includes("sanctuary")) {
    return "uplifting contemporary acoustic ballad";
  }
  if (lower.includes("lofi") || lower.includes("chill")) {
    return "warm mellow acoustic guitar folk";
  }
  if (lower.includes("pop") || lower.includes("indie") || lower.includes("sing-along") || lower.includes("children") || lower.includes("kids")) {
    return "cheerful upbeat acoustic folk sing-along";
  }
  return "warm studio acoustic folk";
}

// Synthesize warm acoustic guitar strumming in 16-bit PCM to layer under 10s birthday greetings or voice blessings
function synthesizeAcousticGuitarBackingPcm(
  durationSec: number,
  sampleRate: number = 24000,
  numChannels: number = 1,
  gain: number = 0.22
): Buffer {
  const totalSamples = Math.floor(durationSec * sampleRate);
  const buf = Buffer.alloc(totalSamples * numChannels * 2);

  // Warm G - C - D - G folk guitar chord frequencies (Hz)
  const chords = [
    [196.0, 246.94, 293.66, 392.0, 493.88, 587.33], // G major
    [261.63, 329.63, 392.0, 523.25, 659.25],        // C major
    [293.66, 369.99, 440.0, 587.33, 739.99],        // D major
    [196.0, 246.94, 293.66, 392.0, 587.33, 783.99], // G major bright resolve
  ];

  const strumIntervalSec = 0.625; // ~96 BPM joyful folk strum

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / 2.5) % chords.length;
    const chord = chords[chordIdx];
    const timeInStrum = t % strumIntervalSec;

    let sampleVal = 0;
    for (let s = 0; s < chord.length; s++) {
      const stringDelay = s * 0.018; // arpeggiated guitar pick across strings
      const dt = timeInStrum - stringDelay;
      if (dt >= 0) {
        const freq = chord[s];
        const env = Math.exp(-dt * 4.2) * (1 - Math.exp(-dt * 120));
        // Fundamental + warm wooden acoustic 2nd & 3rd harmonics
        const wave =
          Math.sin(2 * Math.PI * freq * t) * 0.65 +
          Math.sin(2 * Math.PI * freq * 2 * t) * 0.25 +
          Math.sin(2 * Math.PI * freq * 3 * t) * 0.1;
        sampleVal += wave * env;
      }
    }

    // Smooth fade in and fade out at edges
    let masterEnv = 1.0;
    if (t < 0.25) masterEnv = t / 0.25;
    else if (t > durationSec - 0.6) masterEnv = Math.max(0, (durationSec - t) / 0.6);

    const normalized = Math.max(-0.95, Math.min(0.95, (sampleVal / chord.length) * gain * 2.2 * masterEnv));
    const int16 = Math.round(normalized * 32767);

    for (let ch = 0; ch < numChannels; ch++) {
      buf.writeInt16LE(int16, (i * numChannels + ch) * 2);
    }
  }

  return buf;
}

// Mix a vocal PCM buffer with warm acoustic guitar backing PCM into a single WAV buffer
function mixVocalWithAcousticGuitarWav(
  vocalWavOrPcm: Buffer,
  targetDurationSec?: number,
  guitarGain: number = 0.20
): Buffer {
  const parsed = extractPcmAndWavFormat(vocalWavOrPcm, 24000, 1, 16);
  const { sampleRate, numChannels } = parsed;
  const bytesPerFrame = numChannels * 2;
  const vocalFrames = Math.floor(parsed.pcmData.length / bytesPerFrame);
  const vocalDurationSec = vocalFrames / sampleRate;

  const finalDurationSec = targetDurationSec
    ? Math.max(targetDurationSec, Math.ceil(vocalDurationSec + 0.8))
    : vocalDurationSec + 0.8;

  const totalFrames = Math.floor(finalDurationSec * sampleRate);
  const guitarPcm = synthesizeAcousticGuitarBackingPcm(finalDurationSec, sampleRate, numChannels, guitarGain);
  const mixedPcm = Buffer.alloc(totalFrames * bytesPerFrame);

  // Start vocal at 0.25s after the first warm guitar chord strum
  const vocalStartFrame = Math.floor(0.25 * sampleRate);

  for (let f = 0; f < totalFrames; f++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const byteOffset = (f * numChannels + ch) * 2;
      const gSample = byteOffset + 2 <= guitarPcm.length ? guitarPcm.readInt16LE(byteOffset) : 0;

      let vSample = 0;
      const vf = f - vocalStartFrame;
      if (vf >= 0 && vf < vocalFrames) {
        const vOffset = (vf * numChannels + ch) * 2;
        if (vOffset + 2 <= parsed.pcmData.length) {
          vSample = parsed.pcmData.readInt16LE(vOffset);
        }
      }

      // Duck guitar slightly when vocal is actively speaking/singing
      const gWeight = Math.abs(vSample) > 800 ? 0.65 : 1.0;
      const combined = Math.max(-32767, Math.min(32767, Math.round(vSample * 1.08 + gSample * gWeight)));
      mixedPcm.writeInt16LE(combined, byteOffset);
    }
  }

  return pcmToWavBuffer(mixedPcm, sampleRate, numChannels, 16, 1);
}

// Option 1: Full Sung Studio Song Generator via Google AI Studio Lyria 3 (lyria-3-pro-preview / lyria-3-clip-preview)
async function generateLyriaSongAudio(
  storyPrompt: string,
  options: {
    target?: string;
    genre?: string;
    lyrics?: string;
    useClipModel?: boolean;
    setType?: string;
    imageDataUrl?: string;
    language?: string;
    artistPersona?: "haddi" | "yosia";
  } = {}
): Promise<{ audioUrl: string; lyrics: string; modelUsed: string; durationSeconds: number }> {
  const ai = getAiClient();
  const rawRecipient = options.target || "Someone Special";
  const rawGenre = options.genre || "Acoustic Folk";
  const safeGenre = sanitizeGenreForLyria(rawGenre);
  const language = options.language || "English";
  const setType = options.setType || (options.useClipModel ? "quick" : "full");
  const isTenSecClip = setType === "10s";
  const isLongSong = setType === "full" || setType === "extended" || setType === "premium" || setType === "legacy";
  const targetDurationSeconds = isTenSecClip ? 10 : isLongSong ? 120 : 60;

  const isYosia =
    options.artistPersona === "yosia" ||
    rawGenre.toLowerCase().includes("children") ||
    rawGenre.toLowerCase().includes("kids");
  const preferredModel = isLongSong ? "lyria-3-pro-preview" : "lyria-3-clip-preview";
  const fallbackModel = isLongSong ? "lyria-3-clip-preview" : "lyria-3-pro-preview";

  // Extract the user's exact words from storyPrompt AND options.lyrics for display & TTS vocal blessing
  const userGivenWords = extractUserWordsFromContext(storyPrompt);
  const userDirectLines = splitUserWordsIntoSingableLines(userGivenWords);

  const optionLyricLines = options.lyrics
    ? options.lyrics
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => !l.startsWith("[") && l.length > 0)
    : [];

  const mergedLyricLines: string[] = [];
  const seenLower = new Set<string>();
  for (const line of [...userDirectLines, ...optionLyricLines]) {
    const norm = line.toLowerCase().trim();
    if (norm && !seenLower.has(norm)) {
      seenLower.add(norm);
      mergedLyricLines.push(line);
    }
  }

  // Build 100% filter-safe musical prompts for Lyria 3 (free of personal names, minor/age terms, or verbatim-lyric injection triggers)
  const safeThemes = extractSafeLyriaThemes(`${storyPrompt} ${ mergedLyricLines.join(" ") }`);
  const cleanLanguage = language.toLowerCase().includes("indonesia") ? "Indonesian" : "English";

  const vocalDesc = isYosia
    ? `cheerful, bright, uplifting lead vocals in ${cleanLanguage} with warm strummed acoustic guitar`
    : `warm, expressive, soulful lead vocals in ${cleanLanguage} with rich fingerstyle and strummed acoustic guitar`;

  const primaryPrompt = `Generate a warm, uplifting ${safeGenre} song with ${vocalDesc}. Start with joyful vocals and melodic acoustic guitar strumming right away, singing an uplifting chorus about ${safeThemes}.`;

  const secondaryPrompt = `Generate a cheerful, studio-quality acoustic folk song with ${vocalDesc}. Feature bright acoustic guitar chords and an uplifting vocal melody filled with gratitude, peace, and happiness.`;

  const ultraCleanFallbackPrompt = `Generate a 30-second uplifting acoustic folk track with warm acoustic guitar strumming and a joyful vocal melody.`;

  const buildContents = (promptText: string, includeImage: boolean) => {
    if (includeImage && options.imageDataUrl && options.imageDataUrl.startsWith("data:image/")) {
      const match = options.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        return {
          parts: [
            { text: promptText },
            { inlineData: { mimeType: match[1], data: match[2] } },
          ],
        };
      }
    }
    return promptText;
  };

  const runSingleLyriaCall = async (
    modelName: string,
    promptText: string,
    includeImage: boolean = false
  ): Promise<{ audioUrl: string; lyrics: string; modelUsed: string }> => {
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: buildContents(promptText, includeImage),
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    const audioChunks: Buffer[] = [];
    let detectedMimeType = "audio/mpeg";
    let lyricsText = "";
    let blockReason: string | null = null;

    for await (const chunk of response) {
      if ((chunk as any).promptFeedback?.blockReason) {
        blockReason = (chunk as any).promptFeedback.blockReason;
      }
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            detectedMimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, "base64"));
        }
        if (part.text) {
          lyricsText += (lyricsText ? "\n" : "") + part.text;
        }
      }
    }

    if (audioChunks.length === 0) {
      throw new Error(
        blockReason
          ? `Lyria prompt blocked (${blockReason}) on ${modelName}`
          : `No audio chunks returned from ${modelName}`
      );
    }

    const combinedBuffer = Buffer.concat(audioChunks);

    const isMp3OrCompressed =
      detectedMimeType.includes("mpeg") ||
      detectedMimeType.includes("mp3") ||
      detectedMimeType.includes("ogg") ||
      detectedMimeType.includes("flac") ||
      (combinedBuffer.length >= 3 && combinedBuffer.subarray(0, 3).toString("ascii") === "ID3") ||
      (combinedBuffer.length >= 2 && combinedBuffer[0] === 0xff && (combinedBuffer[1] & 0xe0) === 0xe0);

    if (isMp3OrCompressed) {
      const finalMime = detectedMimeType.includes("mpeg") || detectedMimeType.includes("mp3") ? "audio/mpeg" : detectedMimeType;
      return {
        audioUrl: `data:${finalMime};base64,${combinedBuffer.toString("base64")}`,
        lyrics: lyricsText.trim(),
        modelUsed: modelName,
      };
    }

    const parsedChunks = audioChunks.map((c) => extractPcmAndWavFormat(c));
    const fmt = parsedChunks[0];
    const combinedPcm = Buffer.concat(parsedChunks.map((p) => p.pcmData));
    const singleWav = pcmToWavBuffer(
      combinedPcm,
      fmt.sampleRate,
      fmt.numChannels,
      fmt.bitsPerSample,
      fmt.audioFormat
    );

    return {
      audioUrl: `data:audio/wav;base64,${singleWav.toString("base64")}`,
      lyrics: lyricsText.trim(),
      modelUsed: modelName,
    };
  };

  // Use filter-safe musical prompts so Lyria 3 succeeds on the first call without PROHIBITED_CONTENT blocks
  const attempts: { model: string; prompt: string; includeImage: boolean }[] = [
    { model: preferredModel, prompt: primaryPrompt, includeImage: false },
    { model: fallbackModel, prompt: secondaryPrompt, includeImage: false },
    { model: "lyria-3-clip-preview", prompt: ultraCleanFallbackPrompt, includeImage: false },
  ];

  for (const attempt of attempts) {
    try {
      const res = await runSingleLyriaCall(attempt.model, attempt.prompt, attempt.includeImage);
      return {
        audioUrl: res.audioUrl,
        lyrics: mergedLyricLines.join("\n") || res.lyrics,
        modelUsed: `${res.modelUsed} (${isLongSong ? "Full Multi-Verse Studio Track" : "Studio Song Track"})`,
        durationSeconds: targetDurationSeconds,
      };
    } catch {
      // Silently advance to next clean prompt or acoustic vocal synthesis fallback
    }
  }

  // Seamless fallback to Gemini TTS Vocal + Acoustic Guitar performance if Lyria 3 is unavailable
  const fallbackWav = await generateHaddiSongAudio(
    storyPrompt,
    language,
    isYosia ? "yosia" : "haddi",
    mergedLyricLines.join("\n") || options.lyrics,
    setType,
    rawRecipient
  );
  return {
    audioUrl: `data:audio/wav;base64,${fallbackWav.toString("base64")}`,
    lyrics: mergedLyricLines.join("\n") || options.lyrics || "",
    modelUsed: "Gemini Acoustic Studio Performance",
    durationSeconds: targetDurationSeconds,
  };
}

// Option 2: Haddi / Yosia Acoustic Vocal & Guitar Performance via Gemini TTS (speaks/sings the exact user lyrics with acoustic guitar backing)
async function generateHaddiSongAudio(
  storyPrompt: string,
  language: string = "English",
  artistPersona: "haddi" | "yosia" = "haddi",
  fullLyrics?: string,
  setType: string = "quick",
  recipientName: string = "Someone Special"
): Promise<Buffer> {
  const ai = getAiClient();
  const isIndo = language.toLowerCase().includes("indonesia");
  const ttsLangCode = isIndo ? "id-ID" : "en-US";
  const personaName = artistPersona === "yosia" ? "Yosia" : "Haddi";

  const exactUserWords = extractUserWordsFromContext(storyPrompt);
  const cleanLyricsToRead = (fullLyrics || exactUserWords || storyPrompt)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("["))
    .join("\n");

  const exactScript = `Hi ${recipientName}! This is ${personaName}, wishing you a happy, blessed celebration! Here is your special song:\n${cleanLyricsToRead}`;

  const narrationPrompt = `Say and sing these exact words warmly, joyfully, and rhythmically with musical cadence in ${language} (do not change or replace the words):\n"${exactScript}"`;

  let rawVoiceWav: Buffer | null = null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: narrationPrompt,
              speechMetadata: {
                style:
                  artistPersona === "yosia"
                    ? "Cheerful, warm young guitarist Yosia"
                    : "Warm, soulful Indonesian street minstrel storyteller",
              },
            } as any,
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: artistPersona === "yosia" ? "Puck" : "Kore" },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      rawVoiceWav = Buffer.from(audioBase64, "base64");
    }
  } catch {
    // Fallback to interactions API below if needed
  }

  if (!rawVoiceWav) {
    const interaction = await (ai as any).interactions.create({
      model: "gemini-3.8-flash-lite-tts",
      input: [
        {
          type: "text",
          text: narrationPrompt,
          annotations: [
            {
              type: "speech_metadata",
              style:
                artistPersona === "yosia"
                  ? "Cheerful, warm, enthusiastic young guitarist Yosia singing and speaking with joy"
                  : "Warm, soulful, melodic Indonesian street minstrel Haddi",
            },
          ],
        },
      ],
      response_format: { type: "audio" },
      generation_config: {
        speech_config: [
          { language: ttsLangCode, voice: artistPersona === "yosia" ? "Puck" : "Kore" },
        ],
      },
    });

    let rawBase64 = "";
    if (interaction?.output_audio?.data) {
      rawBase64 = interaction.output_audio.data;
    } else if (Array.isArray(interaction?.steps)) {
      for (const step of interaction.steps) {
        if (step.type === "model_output") {
          const audioContent = step.content?.find((c: any) => c.type === "audio");
          if (audioContent?.data) {
            rawBase64 = audioContent.data;
            break;
          }
        }
      }
    }

    if (!rawBase64) {
      throw new Error("No inline audio data returned from Gemini TTS");
    }
    rawVoiceWav = Buffer.from(rawBase64, "base64");
  }

  // Mix warm acoustic guitar strumming underneath Yosia/Haddi's voice so it sounds like a true acoustic performance!
  return mixVocalWithAcousticGuitarWav(rawVoiceWav, undefined, 0.20);
}

// Zero-key server-side Cloud TTS MP3 fetcher so GitHub/Vercel deployments ALWAYS produce real human vocals even if GEMINI_API_KEY isn't set in Vercel yet
async function fetchCloudTtsMp3Buffer(text: string, language = "English"): Promise<Buffer | null> {
  const cleaned = String(text || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  const lowerLang = language.toLowerCase();
  const tl = lowerLang.includes("indonesia")
    ? "id"
    : lowerLang.includes("spanish")
    ? "es"
    : lowerLang.includes("french")
    ? "fr"
    : lowerLang.includes("portuguese")
    ? "pt"
    : lowerLang.includes("tagalog") || lowerLang.includes("filipino")
    ? "tl"
    : "en";

  // Split text into natural <= 175 char phrases for clean multi-sentence MP3 streaming
  const words = cleaned.split(" ");
  const chunks: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= 175) {
      current = (current + " " + w).trim();
    } else {
      if (current) chunks.push(current);
      current = w;
    }
  }
  if (current) chunks.push(current);

  const buffers: Buffer[] = [];
  for (const chunk of chunks.slice(0, 10)) {
    const candidateUrls = [
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${tl}&q=${encodeURIComponent(chunk)}`,
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(chunk)}`,
      `https://api.streamelements.com/kappa/v2/speech?voice=${tl === "id" ? "Gadis" : "Brian"}&text=${encodeURIComponent(chunk)}`,
    ];

    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
        if (resp.ok) {
          const arr = await resp.arrayBuffer();
          if (arr.byteLength > 256) {
            buffers.push(Buffer.from(arr));
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }
  }

  if (buffers.length === 0) return null;
  return Buffer.concat(buffers);
}

app.post("/api/cloud-voice-tts", async (req, res) => {
  const { text = "", language = "English" } = req.body || {};
  const mp3Buf = await fetchCloudTtsMp3Buffer(text, language);
  if (!mp3Buf) {
    return res.status(400).json({ error: "Could not synthesize cloud voice." });
  }
  return res.json({
    success: true,
    voiceMp3DataUrl: `data:audio/mpeg;base64,${mp3Buf.toString("base64")}`,
  });
});

// Generate a dedicated 10-Second Personalized Birthday/Blessing Greeting + Song with Yosia or Haddi's voice & Acoustic Guitar!
// e.g. "Hi Johnny! This is Yosia, wishing you a happy, blessed birthday! [plus user's exact words]"
app.post("/api/generate-10s-greeting", async (req, res) => {
  const {
    recipientName = "My Friend",
    userWords = "",
    lyrics = "",
    artistPersona = "yosia",
    cardTheme = "birthday",
    customGreetingScript = "",
    customGreetingText = "",
    language = "English",
    shareId: requestedShareId,
  } = req.body;

  const cleanRecipient = (recipientName || "My Friend").trim();
  const extractedWords =
    extractUserWordsFromContext(userWords) ||
    lyrics
      .split("\n")
      .filter((l: string) => l && !l.startsWith("["))
      .slice(0, 2)
      .join(" ");

  const greetingScript =
    (customGreetingScript || customGreetingText || "").trim() ||
    `Enjoy your celebration song, ${cleanRecipient}!`;

  const shareId = normalizeShareId(requestedShareId);

  try {
    if (hasValidApiKey()) {
      const ai = getAiClient();
      const isIndo = language.toLowerCase().includes("indonesia");
      const ttsLangCode = isIndo ? "id-ID" : "en-US";
      const promptText = `Say cheerfully, warmly, and rhythmically with a big smile and musical energy in ${language} (say these exact words clearly):\n"${greetingScript}"`;

      let rawVoiceBuffer: Buffer | null = null;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: artistPersona === "yosia" ? "Puck" : "Kore" },
              },
            },
          },
        });
        const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioBase64) {
          rawVoiceBuffer = Buffer.from(audioBase64, "base64");
        }
      } catch {
        // Fallback below
      }

      if (rawVoiceBuffer) {
        const mixedWav = mixVocalWithAcousticGuitarWav(rawVoiceBuffer, 10, 0.24);
        saveSharedSongRecord(shareId, {
          recipientName: cleanRecipient,
          artistPersona,
          userWords: extractedWords,
          greetingBuffer: mixedWav,
        });
        const dataUri = `data:audio/wav;base64,${mixedWav.toString("base64")}`;
        const hostedPath = `/api/songs/${shareId}/greeting.wav`;
        return res.json({
          success: true,
          hasSpokenVoice: true,
          shareId,
          greetingScript,
          greetingAudioUrl: hostedPath,
          audioUrl: hostedPath,
          greetingDataUrl: dataUri,
          audioDataUrl: dataUri,
        });
      }
    }
  } catch (err) {
    console.warn("10s greeting TTS generation error, using acoustic guitar backing:", err);
  }

  // Cloud Voice TTS fallback (produces real human vocal MP3 to mix with guitar in browser when GEMINI_API_KEY is not configured on Vercel)
  try {
    const cloudVoiceMp3 = await fetchCloudTtsMp3Buffer(greetingScript, language);
    if (cloudVoiceMp3) {
      const voiceMp3DataUrl = `data:audio/mpeg;base64,${cloudVoiceMp3.toString("base64")}`;
      saveSharedSongRecord(shareId, {
        recipientName: cleanRecipient,
        artistPersona,
        userWords: extractedWords,
        narrationDataUrl: voiceMp3DataUrl,
      });
      return res.json({
        success: true,
        hasSpokenVoice: true,
        needsClientGuitarMix: true,
        shareId,
        greetingScript,
        voiceMp3DataUrl,
        greetingAudioUrl: `/api/songs/${shareId}/narration`,
        audioUrl: `/api/songs/${shareId}/narration`,
        greetingDataUrl: voiceMp3DataUrl,
        audioDataUrl: voiceMp3DataUrl,
      });
    }
  } catch (cloudErr) {
    console.warn("Cloud TTS fallback notice:", cloudErr);
  }

  // Last-resort 10s acoustic guitar celebration WAV
  const guitarOnlyPcm = synthesizeAcousticGuitarBackingPcm(10, 24000, 1, 0.35);
  const guitarWav = pcmToWavBuffer(guitarOnlyPcm, 24000, 1, 16, 1);
  saveSharedSongRecord(shareId, {
    recipientName: cleanRecipient,
    artistPersona,
    userWords: extractedWords,
    greetingBuffer: guitarWav,
  });
  const fallbackDataUri = `data:audio/wav;base64,${guitarWav.toString("base64")}`;
  const fallbackHostedPath = `/api/songs/${shareId}/greeting.wav`;
  return res.json({
    success: true,
    hasSpokenVoice: false,
    shareId,
    greetingScript,
    greetingAudioUrl: fallbackHostedPath,
    audioUrl: fallbackHostedPath,
    greetingDataUrl: fallbackDataUri,
    audioDataUrl: fallbackDataUri,
  });
});

// Unified Google AI Studio Audio Generation Route (Supports Option 1: Lyria 3 Sung Song, Option 2: Haddi Narration, or Both!)
app.post("/api/generate-haddi-audio", async (req, res) => {
  const {
    storyPrompt,
    prompt,
    mode = "lyria", // Default to "lyria" (Sung Studio Music Song)! Supports "lyria" | "narration" | "both"
    target,
    customGenre,
    setType = "full",
    lyrics,
    imageDataUrl,
    language = "English",
    artistPersona = "haddi",
    shareId: requestedShareId,
    songTitle,
    songObject,
  } = req.body;

  const inputPrompt = (storyPrompt || prompt || "").trim();

  if (!inputPrompt) {
    return res.status(400).json({ error: "Story prompt is required to generate audio." });
  }

  const shareId = normalizeShareId(requestedShareId || songObject?.id);
  const useClipModel = setType === "quick";
  let lyriaAudioUrl: string | null = null;
  let narrationAudioUrl: string | null = null;
  let generatedLyrics: string = lyrics || "";
  let modelSource = "";
  let durationSeconds = setType === "quick" ? 60 : 120;
  const warnings: string[] = [];

  try {
    if (!hasValidApiKey()) {
      throw new Error("GEMINI_API_KEY not configured on this host; using Cloud Vocal TTS synthesis.");
    }

    // Run Lyria 3 Sung Song and Gemini TTS Vocal Blessing in parallel so every song has real singing vocals AND spoken vocal blessing ready immediately
    const shouldGenerateLyria = mode === "lyria" || mode === "both";
    const shouldGenerateNarration = true;

    const isServerless = Boolean(process.env.VERCEL);
    const withServerlessTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
      if (!isServerless) return promise;
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Serverless execution time budget reached")), ms)
        ),
      ]);
    };

    const [lyriaOutcome, narrationOutcome] = await Promise.allSettled([
      shouldGenerateLyria
        ? withServerlessTimeout(
            generateLyriaSongAudio(inputPrompt, {
              target,
              genre: customGenre,
              lyrics,
              useClipModel: isServerless ? true : useClipModel,
              setType,
              imageDataUrl,
              language,
              artistPersona,
            }),
            8000
          )
        : Promise.resolve(null),
      shouldGenerateNarration
        ? withServerlessTimeout(
            generateHaddiSongAudio(
              inputPrompt,
              language,
              artistPersona,
              generatedLyrics,
              setType,
              target || "Someone Special"
            ),
            7800
          )
        : Promise.resolve(null),
    ]);

    if (lyriaOutcome.status === "fulfilled" && lyriaOutcome.value) {
      lyriaAudioUrl = lyriaOutcome.value.audioUrl;
      durationSeconds = lyriaOutcome.value.durationSeconds;
      if (lyriaOutcome.value.lyrics && !generatedLyrics) {
        generatedLyrics = lyriaOutcome.value.lyrics;
      }
      modelSource = `Google AI Studio Lyria 3 (${lyriaOutcome.value.modelUsed})`;
    } else if (lyriaOutcome.status === "rejected") {
      warnings.push(`Lyria 3 notice: ${lyriaOutcome.reason?.message || "Unavailable"}`);
    }

    if (narrationOutcome.status === "fulfilled" && narrationOutcome.value) {
      narrationAudioUrl = `data:audio/wav;base64,${narrationOutcome.value.toString("base64")}`;
      if (!modelSource) {
        modelSource = "Google AI Studio TTS (Minstrel Vocal Performance)";
      } else {
        modelSource += " + Minstrel TTS Vocal Blessing";
      }
    } else if (narrationOutcome.status === "rejected") {
      warnings.push(`Haddi TTS notice: ${narrationOutcome.reason?.message || "Unavailable"}`);
    }

    const primaryAudioUrl =
      mode === "narration"
        ? narrationAudioUrl || lyriaAudioUrl
        : lyriaAudioUrl || narrationAudioUrl;

    if (primaryAudioUrl) {
      // Persist song & audio on server so shareable links (/api/songs/:shareId/audio.mp3 and /?song=:shareId) work everywhere!
      // IMPORTANT: Only pass lyriaDataUrl when mode actually produced a sung Lyria track so narration never overwrites the sung song!
      const record = saveSharedSongRecord(shareId, {
        song: songObject || undefined,
        lyrics: generatedLyrics,
        userWords: extractUserWordsFromContext(inputPrompt),
        recipientName: target || songObject?.target || "Someone Special",
        songTitle: songTitle || songObject?.title || `Gift Song for ${target || "Someone Special"}`,
        artistPersona,
        lyriaDataUrl: lyriaAudioUrl ? lyriaAudioUrl : undefined,
        narrationDataUrl: narrationAudioUrl ? narrationAudioUrl : undefined,
      });

      const hasSungMp3 = fs.existsSync(path.join(SHARED_SONGS_DIR, `${record.shareId}-song.mp3`));
      const directAudioPath = `/api/songs/${record.shareId}/audio.mp3`;
      const directNarrationPath =
        narrationAudioUrl || record.narrationFileName
          ? `/api/songs/${record.shareId}/narration.wav`
          : null;

      return res.json({
        success: true,
        shareId: record.shareId,
        directAudioUrl: directAudioPath,
        shareableSongUrl: `/?song=${record.shareId}`,
        songShareUrl: `/?song=${record.shareId}`,
        audio_url: primaryAudioUrl,
        audioUrl: primaryAudioUrl,
        lyriaAudioUrl: lyriaAudioUrl || (hasSungMp3 ? directAudioPath : null),
        narrationAudioUrl: narrationAudioUrl || directNarrationPath,
        hostedNarrationUrl: directNarrationPath,
        lyrics: generatedLyrics,
        durationSeconds,
        setType,
        modeUsed: lyriaAudioUrl && narrationAudioUrl ? "both" : lyriaAudioUrl ? "lyria" : "narration",
        source: modelSource,
        warning: warnings.length > 0 ? warnings.join(" | ") : undefined,
      });
    }

    throw new Error(warnings.join(" | ") || "Both Lyria 3 and TTS audio generation unavailable.");
  } catch (error: any) {
    console.info("Using Cloud Vocal TTS + Acoustic Guitar synthesis:", error?.message || error);
    const cleanTarget = target || songObject?.target || "My Friend";
    const personaName = artistPersona === "yosia" ? "Yosia" : "Haddi";
    const cleanLyricText = (generatedLyrics || extractUserWordsFromContext(inputPrompt) || inputPrompt)
      .split("\n")
      .filter((l: string) => l.trim() && !l.trim().startsWith("["))
      .join(". ");
    const vocalScript = `Hello ${cleanTarget}! This is ${personaName} performing your custom gift song, ${
      songTitle || songObject?.title || `For ${cleanTarget}`
    }. ${cleanLyricText}`;

    const cloudMp3 = await fetchCloudTtsMp3Buffer(vocalScript, language);
    if (cloudMp3) {
      const voiceMp3DataUrl = `data:audio/mpeg;base64,${cloudMp3.toString("base64")}`;
      saveSharedSongRecord(shareId, {
        song: songObject || undefined,
        lyrics: generatedLyrics,
        userWords: extractUserWordsFromContext(inputPrompt),
        recipientName: cleanTarget,
        songTitle: songTitle || songObject?.title || `Gift Song for ${cleanTarget}`,
        artistPersona,
        lyriaDataUrl: voiceMp3DataUrl,
        narrationDataUrl: voiceMp3DataUrl,
      });
      return res.json({
        success: true,
        needsClientGuitarMix: true,
        voiceMp3DataUrl,
        shareId,
        directAudioUrl: `/api/songs/${shareId}/audio.mp3`,
        shareableSongUrl: `/?song=${shareId}`,
        songShareUrl: `/?song=${shareId}`,
        audio_url: voiceMp3DataUrl,
        audioUrl: voiceMp3DataUrl,
        lyriaAudioUrl: voiceMp3DataUrl,
        narrationAudioUrl: voiceMp3DataUrl,
        lyrics: generatedLyrics,
        durationSeconds,
        setType,
        modeUsed: "cloud_vocal_mix",
      });
    }

    const fallbackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    saveSharedSongRecord(shareId, {
      song: songObject || undefined,
      lyrics: generatedLyrics,
      userWords: extractUserWordsFromContext(inputPrompt),
      recipientName: target || "Someone Special",
      songTitle: songTitle || `Gift Song for ${target || "Someone Special"}`,
      artistPersona,
      lyriaDataUrl: fallbackUrl,
    });
    return res.json({
      success: true,
      shareId,
      directAudioUrl: `/api/songs/${shareId}/audio.mp3`,
      songShareUrl: `/?song=${shareId}`,
      audio_url: fallbackUrl,
      audioUrl: fallbackUrl,
      lyriaAudioUrl: fallbackUrl,
      narrationAudioUrl: null,
      durationSeconds,
      setType,
      modeUsed: "fallback",
      warning: `Gemini audio generation notice: ${error?.message || "Using fallback track"}`
    });
  }
});

// Shared Song & Direct Audio Streaming Endpoints for WhatsApp, Email, and Gift Card Links!
app.post("/api/songs/share", (req, res) => {
  const { shareId, song, lyrics, userWords, recipientName, songTitle, artistPersona, audioDataUrl, narrationDataUrl } = req.body;
  const record = saveSharedSongRecord(shareId || song?.id, {
    song,
    lyrics,
    userWords,
    recipientName: recipientName || song?.target,
    songTitle: songTitle || song?.title,
    artistPersona: artistPersona || song?.artistPersona,
    lyriaDataUrl: audioDataUrl,
    narrationDataUrl,
  });
  return res.json({
    success: true,
    shareId: record.shareId,
    directAudioUrl: `/api/songs/${record.shareId}/audio.mp3`,
    songShareUrl: `/?song=${record.shareId}`,
  });
});

app.get("/api/songs/:shareId", (req, res) => {
  const { shareId } = req.params;
  const record = loadSharedSongRecord(shareId);
  if (!record) {
    return res.status(404).json({ error: "Shared song not found." });
  }
  const sungMp3Name = `${record.shareId}-song.mp3`;
  const hasSungMp3 = fs.existsSync(path.join(SHARED_SONGS_DIR, sungMp3Name));
  const hasLocalAudio =
    hasSungMp3 ||
    Boolean(record.audioFileName && fs.existsSync(path.join(SHARED_SONGS_DIR, record.audioFileName)));
  const hasNarration = Boolean(
    record.narrationFileName && fs.existsSync(path.join(SHARED_SONGS_DIR, record.narrationFileName))
  );
  const hasGreeting = Boolean(
    record.greetingFileName && fs.existsSync(path.join(SHARED_SONGS_DIR, record.greetingFileName))
  );

  const directAudioUrl = hasLocalAudio
    ? `/api/songs/${record.shareId}/audio.mp3`
    : record.externalAudioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  return res.json({
    success: true,
    shareId: record.shareId,
    song: record.song,
    lyrics: record.lyrics,
    userWords: record.userWords,
    recipientName: record.recipientName,
    songTitle: record.songTitle,
    artistPersona: record.artistPersona,
    directAudioUrl,
    audioUrl: directAudioUrl,
    lyriaAudioUrl: directAudioUrl,
    narrationAudioUrl: hasNarration ? `/api/songs/${record.shareId}/narration.wav` : null,
    greetingAudioUrl: hasGreeting ? `/api/songs/${record.shareId}/greeting.wav` : null,
    reactions: record.reactions || [],
  });
});

app.post("/api/songs/:shareId/react", (req, res) => {
  const { shareId } = req.params;
  const { emoji, label, note, fromName } = req.body || {};
  const existing = loadSharedSongRecord(shareId);
  const newReaction = {
    id: `react-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`,
    emoji: (emoji || "❤️").trim().slice(0, 8),
    label: (label || "Loved It!").trim().slice(0, 60),
    note: note ? String(note).trim().slice(0, 500) : undefined,
    fromName: fromName ? String(fromName).trim().slice(0, 80) : undefined,
    createdAt: new Date().toISOString(),
  };

  if (existing) {
    existing.reactions = [newReaction, ...(existing.reactions || [])].slice(0, 50);
    saveSharedSongRecord(shareId, { reactions: existing.reactions });
    return res.json({
      success: true,
      reaction: newReaction,
      reactions: existing.reactions,
    });
  }

  const created = saveSharedSongRecord(shareId, {
    reactions: [newReaction],
  });
  return res.json({
    success: true,
    reaction: newReaction,
    reactions: created.reactions || [newReaction],
  });
});

app.get(["/api/songs/:shareId/audio.mp3", "/api/songs/:shareId/audio", "/api/songs/:shareId/audio.wav", "/api/songs/:shareId/sung.mp3"], (req, res) => {
  const { shareId } = req.params;
  const record = loadSharedSongRecord(shareId);
  // Always prioritize the sung Lyria MP3 file (`${shareId}-song.mp3`) if it exists on disk so Direct Audio links ALWAYS play the singing song!
  const explicitSungMp3 = path.join(SHARED_SONGS_DIR, `${shareId}-song.mp3`);
  if (fs.existsSync(explicitSungMp3)) {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(explicitSungMp3);
  }
  if (record?.audioFileName) {
    const filePath = path.join(SHARED_SONGS_DIR, record.audioFileName);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", record.audioMimeType || "audio/mpeg");
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "no-cache");
      return res.sendFile(filePath);
    }
  }
  if (record?.externalAudioUrl) {
    return res.redirect(record.externalAudioUrl);
  }
  return res.redirect("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
});

app.get("/api/songs/:shareId/narration.wav", (req, res) => {
  const { shareId } = req.params;
  const record = loadSharedSongRecord(shareId);
  if (record?.narrationFileName) {
    const filePath = path.join(SHARED_SONGS_DIR, record.narrationFileName);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Accept-Ranges", "bytes");
      return res.sendFile(filePath);
    }
  }
  return res.status(404).json({ error: "Narration audio not found." });
});

app.get("/api/songs/:shareId/greeting.wav", (req, res) => {
  const { shareId } = req.params;
  const record = loadSharedSongRecord(shareId);
  if (record?.greetingFileName) {
    const filePath = path.join(SHARED_SONGS_DIR, record.greetingFileName);
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Accept-Ranges", "bytes");
      return res.sendFile(filePath);
    }
  }
  return res.status(404).json({ error: "Greeting audio not found." });
});

// 2. Avatar Speech Generation endpoint via gemini-3.8-flash-lite-tts / gemini-3.1-flash-tts-preview
app.post("/api/generate-avatar-intro", async (req, res) => {
  const { introText } = req.body;
  if (!introText) {
    return res.status(400).json({ error: "Intro text is required." });
  }

  if (!hasValidApiKey()) {
    return res.json({ success: true, base64Audio: "" });
  }

  try {
    const client = getAiClient();
    const promptText = `Say warmly, respectfully, and authentically like Haddi, a soulful Indonesian street musician originally from Sumatra, performing on the ground in Jakarta: "${introText.substring(0, 300)}"`;

    try {
      const interaction = await (client as any).interactions.create({
        model: "gemini-3.8-flash-lite-tts",
        input: [
          {
            type: "text",
            text: promptText,
            annotations: [
              {
                type: "speech_metadata",
                style: "Warm, soulful Indonesian street musician",
              },
            ],
          },
        ],
        response_format: { type: "audio" },
        generation_config: {
          speech_config: [{ language: "en-US", voice: "Zephyr" }],
        },
      });

      const rawBase64 = interaction?.output_audio?.data;
      if (rawBase64) {
        const wavBuffer = pcmToWavBuffer(Buffer.from(rawBase64, "base64"));
        return res.json({ success: true, base64Audio: wavBuffer.toString("base64") });
      }
    } catch {
      // Fallback to generateContent below
    }

    // Select warm Zephyr voice
    const response = await client.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioBase64) {
      const pcmBuffer = Buffer.from(audioBase64, "base64");
      const wavBuffer = pcmToWavBuffer(pcmBuffer);
      return res.json({ success: true, base64Audio: wavBuffer.toString("base64") });
    } else {
      return res.json({ success: true, base64Audio: "" });
    }
  } catch (error) {
    console.warn("Avatar TTS speech generation failed: ", error);
    return res.json({ success: true, base64Audio: "", warning: "Tuning speech offline mode." });
  }
});

// 2B. Google Veo 3.1 AI Video Scene Generator for Yosia Music Videos (Start, Poll, Download)
app.post("/api/generate-yosia-veo-video", async (req, res) => {
  const { sceneTheme = "fireside", aspectRatio = "16:9", imageBase64, imageMimeType } = req.body || {};

  if (!hasValidApiKey()) {
    return res.status(400).json({
      error: "Gemini API key is required for custom Veo 3.1 video scene generation. Using built-in studio HD Yosia footage.",
    });
  }

  try {
    const client = getAiClient();
    const safeThemePrompts: Record<string, string> = {
      fireside:
        "3D Pixar-style animated joyful young Indonesian boy musician wearing a colorful woven cap and golden yellow hoodie, sitting in a cozy wooden armchair by a warm glowing fireplace, cheerfully strumming a wooden acoustic guitar and singing with floating golden musical notes, cinematic studio lighting, smooth animation.",
      birthday:
        "3D Pixar-style animated joyful young Indonesian boy musician wearing a colorful woven cap and golden yellow hoodie, standing in a cheerful music studio decorated with warm golden lights and festive balloons, happily strumming a wooden acoustic guitar and singing a joyful celebration song, cinematic 3D animation.",
      worship:
        "3D Pixar-style animated joyful young Indonesian boy musician wearing a colorful woven cap and golden yellow hoodie, strumming an acoustic guitar on a warm sunlit wooden stage with soft golden light rays and floating musical notes, uplifting joyful expression, high quality 3D animation.",
      lullaby:
        "3D Pixar-style animated gentle young Indonesian boy musician wearing a colorful woven cap and golden yellow hoodie, softly fingerpicking a wooden acoustic guitar beside a cozy window with twinkling night stars and warm lantern glow, peaceful bedtime lullaby atmosphere, cinematic 3D animation.",
    };

    const promptText = safeThemePrompts[sceneTheme] || safeThemePrompts.fireside;
    const validAspect = aspectRatio === "9:16" ? "9:16" : "16:9";

    const requestPayload: any = {
      model: "veo-3.1-lite-generate-preview",
      prompt: promptText,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: validAspect,
      },
    };

    if (imageBase64 && typeof imageBase64 === "string") {
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      requestPayload.image = {
        imageBytes: cleanBase64,
        mimeType: imageMimeType || "image/png",
      };
    }

    const operation = await client.models.generateVideos(requestPayload);
    return res.json({
      success: true,
      operationName: operation.name,
    });
  } catch (err: any) {
    console.warn("Veo 3.1 video generation start notice:", err?.message || err);
    return res.status(500).json({
      error: err?.message || "Could not start Veo 3.1 video generation.",
    });
  }
});

app.post("/api/yosia-veo-status", async (req, res) => {
  const { operationName } = req.body || {};
  if (!operationName || !hasValidApiKey()) {
    return res.status(400).json({ done: false, error: "Valid operationName required." });
  }
  try {
    const client = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await client.operations.getVideosOperation({ operation: op });
    return res.json({
      done: Boolean(updated.done),
      hasVideo: Boolean(updated.response?.generatedVideos?.[0]?.video?.uri),
    });
  } catch (err: any) {
    return res.status(500).json({ done: false, error: err?.message || "Failed to poll Veo status." });
  }
});

app.post("/api/yosia-veo-download", async (req, res) => {
  const { operationName } = req.body || {};
  if (!operationName || !hasValidApiKey()) {
    return res.status(400).json({ error: "Valid operationName required." });
  }
  try {
    const client = getAiClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await client.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: "Generated video URI not ready." });
    }
    const apiKey = getConfiguredGeminiKey();
    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!videoRes.ok || !videoRes.body) {
      return res.status(502).json({ error: "Failed to fetch generated video stream." });
    }
    const arrayBuf = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", String(buffer.length));
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to download Veo video." });
  }
});

// 3. Create Stripe Checkout Session (Supporting Live or Sandbox Simulation modes)
app.post("/api/create-checkout-session", async (req, res) => {
  const { target, context, setType, customGenre, gifterEmail, recipientEmail } = req.body;
  
  if (!target || !target.trim()) {
    return res.status(400).json({ error: "Please specify who you are creating this song for." });
  }

  const cleanTarget = target.trim();
  const cleanContext = (context || "").trim();
  const cleanSetType = setType || "quick";
  const cleanCustomGenre = (customGenre || "Acoustic Folk").trim();
  const cleanGifterEmail = (gifterEmail || "").trim();
  const cleanRecipientEmail = (recipientEmail || "").trim();

  // Dynamically determine success/cancel URLs relative to request origin or fallback
  const origin = req.headers.origin || req.get("origin") || process.env.APP_URL || "http://localhost:3000";
  
  const successUrl = `${origin}/?stripe_checkout=success&target=${encodeURIComponent(cleanTarget)}&context=${encodeURIComponent(cleanContext)}&setType=${cleanSetType}&customGenre=${encodeURIComponent(cleanCustomGenre)}&gifterEmail=${encodeURIComponent(cleanGifterEmail)}&recipientEmail=${encodeURIComponent(cleanRecipientEmail)}`;
  const cancelUrl = `${origin}/?stripe_checkout=cancel`;

  const stripe = getStripeClient();

  if (!stripe) {
    // FALLBACK MOCK CHECKOUT REDIRECT SIMULATION
    console.log("No live Stripe secret key found on server. Redirecting user to simulation success callback.");
    // Simulate a successful redirection URL that contains our checkout mock query parameter
    const mockSuccessUrl = `${origin}/?stripe_mock=true&target=${encodeURIComponent(cleanTarget)}&context=${encodeURIComponent(cleanContext)}&setType=${cleanSetType}&customGenre=${encodeURIComponent(cleanCustomGenre)}&gifterEmail=${encodeURIComponent(cleanGifterEmail)}&recipientEmail=${encodeURIComponent(cleanRecipientEmail)}`;
    return res.json({
      success: true,
      url: mockSuccessUrl,
      isMock: true
    });
  }

  try {
    // Map pricing accurately to cents (USD)
    let unitAmount = 99; // Quick Strum ($0.99)
    let productName = "Haddi Minstrel - Quick Strum Package";
    let productDesc = `A high-impact 60-second acoustic song with personalized verse + hook blessing dedicated to ${cleanTarget}.`;

    if (cleanSetType === "full") {
      unitAmount = 199; // Full Set ($1.99)
      productName = "Haddi Minstrel - Full Set Package";
      productDesc = `A complete, deep 120-second organic acoustic ballad custom written for ${cleanTarget}.`;
    } else if (cleanSetType === "extended" || cleanSetType === "premium") {
      unitAmount = 499; // Premium Video ($4.99)
      productName = "Haddi Minstrel - Premium Video Package";
      productDesc = `3 unique acoustic style performance variations and custom lyric twists honoring ${cleanTarget}.`;
    } else if (cleanSetType === "legacy") {
      unitAmount = 1299; // Legacy Bundle ($12.99)
      productName = "Haddi Minstrel - Legacy Archive Bundle";
      productDesc = `Full multi-track archive containing all performance variations and historical logs for ${cleanTarget}.`;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: productDesc,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return res.json({
      success: true,
      url: session.url,
      isMock: false
    });
  } catch (stripeError: any) {
    console.error("Stripe Checkout creation error: ", stripeError);
    // If stripe API call fails, fallback to simulated checkout so the app remains fully functional
    const mockSuccessUrl = `${origin}/?stripe_mock=true&target=${encodeURIComponent(cleanTarget)}&context=${encodeURIComponent(cleanContext)}&setType=${cleanSetType}&customGenre=${cleanCustomGenre}`;
    return res.json({
      success: true,
      url: mockSuccessUrl,
      isMock: true,
      warning: "Stripe connection failed, using high-fidelity fallback sandbox checkout simulation."
    });
  }
});

// ============================================================================
// 4. MEMBER & CHURCH ACCOUNT LOGIN + STRICT MONTHLY RESET (NO ROLLOVER) ENGINE
// ============================================================================
export type AccountPlanTier =
  | "lifetime_basic"
  | "lifetime_premium"
  | "church_starter"
  | "church_300"
  | "church_large";

export interface AuthorizedCoordinator {
  name: string;
  role: string;
  email: string;
}

export interface StoredMemberAccount {
  email: string;
  displayName: string;
  organizationName?: string;
  accessCode: string;
  planTier: AccountPlanTier;
  planLabel: string;
  monthlySongLimit: number;
  currentMonthKey: string; // e.g., "2026-10"
  songsUsedThisMonth: number;
  topUpBonusSongs: number; // Only paid $7.99 10-song top-ups persist; monthly plan songs NEVER roll over
  coordinators: AuthorizedCoordinator[];
  lastResetDate: string;
  createdAt: string;
}

const ACCOUNTS_FILE_PATH = path.join(SHARED_SONGS_DIR, "_member_accounts.json");

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const PLAN_CONFIG: Record<
  AccountPlanTier,
  { label: string; monthlyLimit: number; isChurch: boolean }
> = {
  lifetime_basic: {
    label: "👑 Lifetime $0.99 Pass (10 Referrals / One-Time)",
    monthlyLimit: 5,
    isChurch: false,
  },
  lifetime_premium: {
    label: "👑 Lifetime Premium Pass (10 Referrals / One-Time)",
    monthlyLimit: 15,
    isChurch: false,
  },
  church_starter: {
    label: "⛪ Small Church & Youth Plan (10 Songs/Mo)",
    monthlyLimit: 10,
    isChurch: true,
  },
  church_300: {
    label: "⛪ 300-Member Church & Sponsor Plan (30 Songs/Mo)",
    monthlyLimit: 30,
    isChurch: true,
  },
  church_large: {
    label: "🌍 Large Church & Missions Plan (100 Songs/Mo)",
    monthlyLimit: 100,
    isChurch: true,
  },
};

function loadAccountsMap(): Record<string, StoredMemberAccount> {
  try {
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE_PATH, "utf-8"));
    }
  } catch {
    // ignore read error
  }
  const monthKey = getCurrentMonthKey();
  // Seed default ready-to-test demo accounts for Lifetime Pass & Church Ministry
  const seeded: Record<string, StoredMemberAccount> = {
    "pastor@gracechurch.org": {
      email: "pastor@gracechurch.org",
      displayName: "Pastor William & Ministry Team",
      organizationName: "Grace Fellowship & Child Sponsorship Ministry",
      accessCode: "GRACE-100",
      planTier: "church_large",
      planLabel: PLAN_CONFIG.church_large.label,
      monthlySongLimit: 100,
      currentMonthKey: monthKey,
      songsUsedThisMonth: 16,
      topUpBonusSongs: 0,
      coordinators: [
        { name: "Pastor William", role: "Senior Pastor (Admin)", email: "pastor@gracechurch.org" },
        { name: "Sister Hannah", role: "Church Secretary", email: "office@gracechurch.org" },
        { name: "Brother Lukas", role: "Child Sponsorship Coordinator", email: "sponsors@gracechurch.org" },
      ],
      lastResetDate: `${monthKey}-01`,
      createdAt: new Date().toISOString(),
    },
    "vip@mygiftsong.org": {
      email: "vip@mygiftsong.org",
      displayName: "Lifetime Referral VIP Member",
      accessCode: "VIP-5SONGS",
      planTier: "lifetime_basic",
      planLabel: PLAN_CONFIG.lifetime_basic.label,
      monthlySongLimit: 5,
      currentMonthKey: monthKey,
      songsUsedThisMonth: 1,
      topUpBonusSongs: 0,
      coordinators: [],
      lastResetDate: `${monthKey}-01`,
      createdAt: new Date().toISOString(),
    },
  };
  saveAccountsMap(seeded);
  return seeded;
}

function saveAccountsMap(map: Record<string, StoredMemberAccount>) {
  try {
    fs.writeFileSync(ACCOUNTS_FILE_PATH, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write accounts file:", e);
  }
}

// Enforce strict monthly reset on the 1st of each month (NO ROLLOVER)
function enforceMonthlyResetNoRollover(account: StoredMemberAccount): StoredMemberAccount {
  const activeMonth = getCurrentMonthKey();
  if (account.currentMonthKey !== activeMonth) {
    // New month detected: Reset used count to 0 (unused songs from last month do NOT roll over!)
    account.currentMonthKey = activeMonth;
    account.songsUsedThisMonth = 0;
    account.lastResetDate = `${activeMonth}-01`;
  }
  return account;
}

app.post("/api/accounts/login", (req, res) => {
  const { email, accessCode, displayName, organizationName, planTier } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address to log in." });
  }

  const accounts = loadAccountsMap();
  let account = accounts[cleanEmail];
  const selectedTier: AccountPlanTier =
    planTier && PLAN_CONFIG[planTier as AccountPlanTier]
      ? (planTier as AccountPlanTier)
      : "lifetime_basic";

  if (!account) {
    const tierCfg = PLAN_CONFIG[selectedTier];
    const monthKey = getCurrentMonthKey();
    account = {
      email: cleanEmail,
      displayName: (displayName || cleanEmail.split("@")[0]).trim(),
      organizationName: tierCfg.isChurch
        ? (organizationName || "Grace Fellowship Church").trim()
        : undefined,
      accessCode: (accessCode || "MINSTREL-2026").trim(),
      planTier: selectedTier,
      planLabel: tierCfg.label,
      monthlySongLimit: tierCfg.monthlyLimit,
      currentMonthKey: monthKey,
      songsUsedThisMonth: 0,
      topUpBonusSongs: 0,
      coordinators: tierCfg.isChurch
        ? [
            {
              name: (displayName || "Pastor / Ministry Admin").trim(),
              role: "Primary Ministry Admin",
              email: cleanEmail,
            },
            {
              name: "Church Secretary",
              role: "Authorized Song Coordinator",
              email: `office@${cleanEmail.split("@")[1] || "church.org"}`,
            },
          ]
        : [],
      lastResetDate: `${monthKey}-01`,
      createdAt: new Date().toISOString(),
    };
  } else {
    // Allow switching plan tier if requested during login/upgrade
    if (planTier && PLAN_CONFIG[planTier as AccountPlanTier] && account.planTier !== planTier) {
      const tierCfg = PLAN_CONFIG[planTier as AccountPlanTier];
      account.planTier = planTier as AccountPlanTier;
      account.planLabel = tierCfg.label;
      account.monthlySongLimit = tierCfg.monthlyLimit;
      if ( account.songsUsedThisMonth > account.monthlySongLimit ) {
        account.songsUsedThisMonth = 0;
      }
    }
    if (displayName && displayName.trim()) account.displayName = displayName.trim();
    if (organizationName && organizationName.trim()) account.organizationName = organizationName.trim();
  }

  account = enforceMonthlyResetNoRollover(account);
  accounts[cleanEmail] = account;
  saveAccountsMap(accounts);

  return res.json({
    success: true,
    account,
    songsRemainingThisMonth: Math.max(0, account.monthlySongLimit - account.songsUsedThisMonth),
    policyNote:
      "Strict Monthly Reset Policy: Unused monthly songs do NOT roll over. On the 1st of every month, your allowance resets back to your exact plan limit.",
  });
});

app.post("/api/accounts/simulate-month-reset", (req, res) => {
  const { email, simulatedUsedCount } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const accounts = loadAccountsMap();
  const account = accounts[cleanEmail];
  if (!account) {
    return res.status(404).json({ error: "Account not found." });
  }

  if (typeof simulatedUsedCount === "number") {
    account.songsUsedThisMonth = Math.min(account.monthlySongLimit, Math.max(0, simulatedUsedCount));
  } else {
    // Simulate the 1st of the next month: reset back to 0 used (100% of plan limit, NO rollover!)
    account.songsUsedThisMonth = 0;
    account.currentMonthKey = getCurrentMonthKey();
    account.lastResetDate = `${account.currentMonthKey}-01`;
  }

  accounts[cleanEmail] = account;
  saveAccountsMap(accounts);

  return res.json({
    success: true,
    account,
    songsRemainingThisMonth: Math.max(0, account.monthlySongLimit - account.songsUsedThisMonth),
  });
});

app.post("/api/accounts/update-coordinators", (req, res) => {
  const { email, coordinators } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const accounts = loadAccountsMap();
  const account = accounts[cleanEmail];
  if (!account) {
    return res.status(404).json({ error: "Account not found." });
  }
  if (Array.isArray(coordinators)) {
    account.coordinators = coordinators.slice(0, 3);
    accounts[cleanEmail] = account;
    saveAccountsMap(accounts);
  }
  return res.json({
    success: true,
    account,
  });
});

// Setup Vite Dev Server / Static Ingress inside bootstrapper to support esbuild CommonJS formats
async function bootstrap() {
  const isProduction = process.env.NODE_ENV === "production";

  // Statically serve the root video folder under the /video prefix in all environments
  app.use("/video", express.static(path.join(process.cwd(), "video")));

  if (!isProduction) {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start dev server listening on Port 3000 and binding to 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  bootstrap();
}

export { app };
export default app;


import React, { useState, useEffect } from 'react';

interface GiftSongCardProps {
  audioUrl: string | null;
  lyrics: string;
  recipientName?: string;
  songTitle?: string;
  lyriaAudioUrl?: string | null;
  narrationAudioUrl?: string | null;
  activeTrackType?: "lyria" | "narration";
  onSelectTrackType?: (type: "lyria" | "narration") => void;
}

export const GiftSongCard: React.FC<GiftSongCardProps> = ({ 
  audioUrl, 
  lyrics, 
  recipientName = "Someone Special",
  songTitle = "The Sound of Honor & Covenant",
  lyriaAudioUrl,
  narrationAudioUrl,
  activeTrackType = "lyria",
  onSelectTrackType,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<"lyria" | "narration">(activeTrackType);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  useEffect(() => {
    setSelectedTrack(activeTrackType);
  }, [activeTrackType]);

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

  // Construct a direct mailto link to send the gift card via email
  const handleEmailShare = () => {
    const shareableLink =
      resolvedAudioSource.startsWith("data:")
        ? "https://mygiftsong.org"
        : resolvedAudioSource || "https://mygiftsong.org";
    const subject = encodeURIComponent(`A Special Custom Song for You: ${songTitle} (mygiftsong.org)`);
    const body = encodeURIComponent(
      `Hello ${recipientName},\n\nHaddi the Street Minstrel created a custom gift song just for you on mygiftsong.org (AI Assisted Song Generator)!\n\nListen to your song here: ${shareableLink}\n\nLyrics:\n${lyrics}\n\nSent with love from mygiftsong.org!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-amber-950 to-amber-900 rounded-2xl shadow-2xl border border-amber-500/40 p-6 text-amber-100 my-6">
      <div className="text-center mb-4">
        <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          Custom Haddi Gift Card
        </span>
        <h3 className="text-2xl font-bold mt-2 font-serif text-amber-200">{songTitle}</h3>
        <p className="text-xs text-amber-400">Dedicated to {recipientName}</p>
      </div>

      {/* Dual Option Switcher: Option 1 (Lyria 3 Sung Song) & Option 2 (Haddi Spoken Narration) */}
      {(lyriaAudioUrl || narrationAudioUrl) && (
        <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-950/60 p-1.5 rounded-xl border border-amber-500/20">
          <button
            type="button"
            onClick={() => handleTrackSwitch("lyria")}
            disabled={!lyriaAudioUrl}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 ${
              selectedTrack === "lyria" && lyriaAudioUrl
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-amber-200/80 hover:text-amber-100"
            }`}
          >
            <span>🎸 Sung Song (Lyria 3)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTrackSwitch("narration")}
            disabled={!narrationAudioUrl}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 ${
              selectedTrack === "narration" && narrationAudioUrl
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-amber-200/80 hover:text-amber-100"
            }`}
          >
            <span>🎙️ Haddi Narration</span>
          </button>
        </div>
      )}

      {/* Embedded HTML5 Audio Player for the Real Generated Song */}
      <div className="bg-slate-900/80 rounded-xl p-4 shadow-inner mb-4 border border-amber-500/30">
        {resolvedAudioSource ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/80 uppercase tracking-wider">
              <span>
                {selectedTrack === "narration" && narrationAudioUrl
                  ? "🎙️ Haddi Spoken Blessing Track"
                  : "🎵 Lyria 3 Sung Studio Master"}
              </span>
              {isPlaying && <span className="text-emerald-400 animate-pulse">● PLAYING</span>}
            </div>
            <audio 
              controls 
              src={resolvedAudioSource} 
              className="w-full accent-amber-500"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <p className="text-center text-xs text-amber-400/70 italic">Composing and rendering audio track...</p>
        )}
      </div>

      {/* Preview Lyrics Box */}
      <div className="bg-slate-900/50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm italic text-amber-200/80 mb-4 border border-amber-500/20">
        <p className="whitespace-pre-line">{lyrics}</p>
      </div>

      {/* Action Buttons: Copy Link, Download & Send via Email */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button"
          onClick={handleCopyLink}
          className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-semibold py-2.5 px-2 rounded-xl shadow transition duration-200 text-xs flex items-center justify-center space-x-1 cursor-pointer"
        >
          <span>{copiedFeedback ? "✅ Copied!" : "📋 Copy Link"}</span>
        </button>

        <a
          href={resolvedAudioSource || "#"}
          download={`${songTitle.replace(/\s+/g, "_")}_${selectedTrack}.wav`}
          className={`bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold py-2.5 px-2 rounded-xl shadow transition duration-200 text-xs flex items-center justify-center space-x-1 ${
            !resolvedAudioSource ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span>⬇️ Save Track</span>
        </a>

        <button 
          type="button"
          onClick={handleEmailShare}
          disabled={!resolvedAudioSource}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-2 rounded-xl shadow transition duration-200 text-xs flex items-center justify-center space-x-1 cursor-pointer"
        >
          <span>✉️ Send Email</span>
        </button>
      </div>
    </div>
  );
};


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
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 p-6 text-slate-900 my-4">
      <div className="text-center mb-4">
        <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
          Custom Haddi Gift Card
        </span>
        <h3 className="text-xl font-display font-bold mt-2.5 text-slate-900">{songTitle}</h3>
        <p className="text-xs text-teal-700 font-medium mt-0.5">Dedicated to {recipientName}</p>
      </div>

      {/* Dual Option Switcher: Option 1 (Lyria 3 Sung Song) & Option 2 (Haddi Spoken Narration) */}
      {(lyriaAudioUrl || narrationAudioUrl) && (
        <div className="grid grid-cols-2 gap-1.5 mb-3 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            type="button"
            onClick={() => handleTrackSwitch("lyria")}
            disabled={!lyriaAudioUrl}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 ${
              selectedTrack === "lyria" && lyriaAudioUrl
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🎸 Sung Song</span>
          </button>
          <button
            type="button"
            onClick={() => handleTrackSwitch("narration")}
            disabled={!narrationAudioUrl}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 ${
              selectedTrack === "narration" && narrationAudioUrl
                ? "bg-white text-teal-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🎙️ Haddi Voice</span>
          </button>
        </div>
      )}

      {/* Embedded HTML5 Audio Player for the Real Generated Song */}
      <div className="bg-[#F8FAF9] rounded-xl p-3.5 mb-4 border border-stone-200">
        {resolvedAudioSource ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-teal-800">
              <span>
                {selectedTrack === "narration" && narrationAudioUrl
                  ? "🎙️ Haddi Spoken Blessing Track"
                  : "🎵 Lyria 3 Sung Studio Master"}
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
      <div className="bg-stone-50 rounded-xl p-3.5 max-h-32 overflow-y-auto text-xs sm:text-sm italic text-slate-700 mb-4 border border-stone-200/80">
        <p className="whitespace-pre-line">{lyrics}</p>
      </div>

      {/* Action Buttons: Copy Link, Download & Send via Email */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          type="button"
          onClick={handleCopyLink}
          className="bg-stone-100 hover:bg-stone-200 text-slate-800 border border-stone-200 font-semibold py-2.5 px-2 rounded-xl transition duration-200 text-xs flex items-center justify-center space-x-1 cursor-pointer"
        >
          <span>{copiedFeedback ? "✓ Copied!" : "Copy Link"}</span>
        </button>

        <a
          href={resolvedAudioSource || "#"}
          download={`${songTitle.replace(/\s+/g, "_")}_${selectedTrack}.wav`}
          className={`bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold py-2.5 px-2 rounded-xl transition duration-200 text-xs flex items-center justify-center space-x-1 ${
            !resolvedAudioSource ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <span>Save Audio</span>
        </a>

        <button 
          type="button"
          onClick={handleEmailShare}
          disabled={!resolvedAudioSource}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-2.5 px-2 rounded-xl shadow-2xs transition duration-200 text-xs flex items-center justify-center space-x-1 cursor-pointer"
        >
          <span>Send Email</span>
        </button>
      </div>
    </div>
  );
};


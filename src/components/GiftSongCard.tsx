import React, { useState } from 'react';

interface GiftSongCardProps {
  audioUrl: string | null;
  lyrics: string;
  recipientName?: string;
  songTitle?: string;
}

export const GiftSongCard: React.FC<GiftSongCardProps> = ({ 
  audioUrl, 
  lyrics, 
  recipientName = "Someone Special",
  songTitle = "The Sound of Honor & Covenant"
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Fallback if no URL is present yet, but let's make sure it handles the real url cleanly
  const activeAudioSource = audioUrl || "";

  // Construct a direct mailto link to send the gift card via email
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`A Special Custom Song for You: ${songTitle}`);
    const body = encodeURIComponent(
      `Hello ${recipientName},\n\nHaddi the Street Minstrel created a custom gift song just for you!\n\nListen to your song here: ${audioUrl}\n\nLyrics:\n${lyrics}\n\nSent with love!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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

      {/* Embedded HTML5 Audio Player for the Real Generated Song */}
      <div className="bg-slate-900/80 rounded-xl p-4 shadow-inner mb-4 border border-amber-500/30">
        {activeAudioSource ? (
          <audio 
            controls 
            src={activeAudioSource} 
            className="w-full accent-amber-500"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <p className="text-center text-xs text-amber-400/70 italic">Composing and rendering audio track...</p>
        )}
      </div>

      {/* Preview Lyrics Box */}
      <div className="bg-slate-900/50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm italic text-amber-200/80 mb-4 border border-amber-500/20">
        <p className="whitespace-pre-line">{lyrics}</p>
      </div>

      {/* Action Buttons: Copy Link & Send via Email */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => {
            navigator.clipboard.writeText(audioUrl || "");
            alert("Song link copied to clipboard!");
          }}
          className="bg-amber-800 hover:bg-amber-700 text-amber-100 font-semibold py-2.5 px-3 rounded-xl shadow transition duration-200 text-sm flex items-center justify-center space-x-1"
        >
          <span>📋 Copy Link</span>
        </button>

        <button 
          onClick={handleEmailShare}
          disabled={!audioUrl}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-3 rounded-xl shadow transition duration-200 text-sm flex items-center justify-center space-x-1"
        >
          <span>✉️ Send Email</span>
        </button>
      </div>
    </div>
  );
};

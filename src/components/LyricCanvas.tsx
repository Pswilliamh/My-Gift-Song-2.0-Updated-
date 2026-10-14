import React, { useEffect, useRef, useState } from "react";
import { Globe, Sparkles, Volume2 } from "lucide-react";
import { LyricSection } from "../types";
import { SUPPORTED_SONG_LANGUAGES } from "./YosiaChildrenSection";

interface LyricCanvasProps {
  lyricSections: LyricSection[];
  originalLyricSections?: LyricSection[];
  currentTimeSeconds: number;
  currentLanguage?: string;
  isTranslating?: boolean;
  onTranslateLanguage?: (targetLanguage: string) => void;
  onResingInLanguage?: (targetLanguage: string) => void;
  onLineClick?: (timestamp: number) => void;
}

export const LyricCanvas: React.FC<LyricCanvasProps> = ({
  lyricSections,
  originalLyricSections,
  currentTimeSeconds,
  currentLanguage = "English",
  isTranslating = false,
  onTranslateLanguage,
  onResingInLanguage,
  onLineClick,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showBilingualCompare, setShowBilingualCompare] = useState(true);

  // Automatically scroll to active lyrics as song progresses (karaoke-style visual focus)
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const activeElement = activeLineRef.current;
      const container = containerRef.current;
      
      const elementOffset = activeElement.offsetTop;
      const elementHeight = activeElement.offsetHeight;
      const containerHeight = container.offsetHeight;
      
      container.scrollTo({
        top: elementOffset - containerHeight / 2 + elementHeight / 2,
        behavior: "smooth",
      });
    }
  }, [currentTimeSeconds]);

  // Check if a specific timestamp matches the active line being played
  const isLineActive = (
    sectionIdx: number,
    lineIdx: number,
    globalTimestamps: number[]
  ) => {
    const elapsed = currentTimeSeconds;
    const lineStart = globalTimestamps[lineIdx];
    
    let nextStart = 9999;
    
    if (lineIdx < globalTimestamps.length - 1) {
      nextStart = globalTimestamps[lineIdx + 1];
    } else {
      let foundNext = false;
      for (let s = sectionIdx + 1; s < lyricSections.length; s++) {
        if (lyricSections[s].timestamps && lyricSections[s].timestamps.length > 0) {
          nextStart = lyricSections[s].timestamps[0];
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
        nextStart = lineStart + 8;
      }
    }
    
    return elapsed >= lineStart && elapsed < nextStart;
  };

  const hasOriginalForCompare =
    Boolean(originalLyricSections && originalLyricSections.length > 0) &&
    currentLanguage !== "English";

  return (
    <div
      id="bronze_frame_container"
      className="relative rounded-2xl border-4 border-[#C5A880] bg-[#1a1512] shadow-2xl overflow-hidden max-w-2xl mx-auto"
      style={{ boxShadow: "0 10px 40px -10px rgba(197, 168, 128, 0.3)" }}
    >
      {/* Decorative filigree and design accents inside the bronze frame */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#C5A880]/40 rounded-tl pointer-events-none"></div>
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#C5A880]/40 rounded-tr pointer-events-none"></div>
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#C5A880]/40 rounded-bl pointer-events-none"></div>
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#C5A880]/40 rounded-br pointer-events-none"></div>

      {/* Header of lyric container */}
      <div className="border-b border-[#C5A880]/20 bg-[#251e19] px-6 py-3.5 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#C5A880] text-sm font-mono tracking-widest uppercase">
            📜 Lyric Canvas ({currentLanguage})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasOriginalForCompare && (
            <button
              type="button"
              onClick={() => setShowBilingualCompare(!showBilingualCompare)}
              className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-black/50 text-[#FFD700] border border-[#FFD700]/40 hover:bg-black cursor-pointer"
            >
              {showBilingualCompare ? "✓ Side-by-Side Lyrics" : "Show Original Below"}
            </button>
          )}
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880]/40"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880]/10"></span>
          </div>
        </div>
      </div>

      {/* Integrated Language Translator Bar */}
      {onTranslateLanguage && (
        <div className="bg-[#14100d] border-b border-[#C5A880]/20 px-5 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={13} />
              <span>Song Language Translator:</span>
            </span>

            {onResingInLanguage && (
              <button
                type="button"
                onClick={() => onResingInLanguage(currentLanguage)}
                disabled={isTranslating}
                className="px-3 py-1 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-mono text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Volume2 size={12} />
                <span>Sing &amp; Narrate Audio in {currentLanguage}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORTED_SONG_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                disabled={isTranslating}
                onClick={() => onTranslateLanguage(lang.code)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  currentLanguage === lang.code
                    ? "bg-[#FFD700] text-black shadow-xs"
                    : "bg-[#251e19] text-[#FAF9F6]/80 hover:text-[#FFD700] border border-[#C5A880]/25"
                }`}
              >
                {lang.short}
              </button>
            ))}
          </div>

          {isTranslating && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#FFD700] animate-pulse">
              <Sparkles size={12} />
              <span>Translating lyrics &amp; rhythm into {currentLanguage}...</span>
            </div>
          )}
        </div>
      )}

      {/* Main scrollable body */}
      <div
        ref={containerRef}
        className="h-[360px] overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin scrollbar-thumb-[#C5A880]/15 scrollbar-track-transparent scroll-smooth"
      >
        {lyricSections && lyricSections.length > 0 ? (
          lyricSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-widest text-[#C5A880] uppercase bg-[#2e241e] px-2.5 py-0.5 rounded border border-[#C5A880]/20">
                  {section.sectionName}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#C5A880]/30 to-transparent"></div>
              </div>

              {/* Verse lines */}
              <div className="space-y-4 pl-2">
                {section.lines.map((line, lIdx) => {
                  const stamp = section.timestamps[lIdx] ?? 0;
                  const active = isLineActive(sIdx, lIdx, section.timestamps);
                  const chord = section.chords[lIdx] || "";
                  const origLine = originalLyricSections?.[sIdx]?.lines?.[lIdx];

                  return (
                    <div
                      key={lIdx}
                      ref={active ? activeLineRef : null}
                      id={`lyric-line-${sIdx}-${lIdx}`}
                      onClick={() => onLineClick && onLineClick(stamp)}
                      className={`group relative py-1.5 px-3 rounded-lg cursor-pointer transition-all duration-300 ${
                        active
                          ? "bg-[#2d2218] border border-[#D4AF37]/60 shadow-lg scale-[1.01]"
                          : "hover:bg-[#1f1915]/50 border border-transparent"
                      }`}
                    >
                      {/* Guitar Chord Indicator sits elegant above the current line lyrics */}
                      {chord && (
                        <div className="h-6 flex items-end">
                          <span
                            className={`font-mono text-xs font-semibold tracking-wider px-1.5 py-0.5 rounded transition-all duration-300 ${
                              active
                                ? "text-[#D4AF37] bg-[#433122] scale-110"
                                : "text-[#C5A880]/50 group-hover:text-[#C5A880]/80"
                            }`}
                          >
                            {chord}
                          </span>
                        </div>
                      )}

                      {/* Actual Lyric Text */}
                      <p
                        className={`font-sans leading-relaxed tracking-wide transition-all duration-300 text-sm md:text-base ${
                          active
                            ? "text-white font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                            : "text-[#ffffff]/80 group-hover:text-white"
                        }`}
                      >
                        {line}
                      </p>

                      {/* Subtitle Original English Reference Line when Translated */}
                      {hasOriginalForCompare && showBilingualCompare && origLine && origLine !== line && (
                        <p className="text-xs text-[#C5A880]/70 italic mt-0.5 font-sans">
                          {origLine}
                        </p>
                      )}

                      {/* Small hover hint for timeline jump */}
                      <span className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-mono text-[#C5A880]/40">
                        Jump to {Math.floor(stamp / 60)}:{(stamp % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 font-mono text-sm">
            Strumming up the lyrics... Stand by
          </div>
        )}
      </div>

      {/* Footer statistics context decoration */}
      <div className="bg-[#15110e] px-6 py-2 border-t border-[#C5A880]/10 flex justify-between items-center text-[10px] font-mono text-[#C5A880]/40">
        <span>TUNING: STANDARD EADGBE</span>
        <span>LANGUAGE: {currentLanguage.toUpperCase()}</span>
      </div>
    </div>
  );
};


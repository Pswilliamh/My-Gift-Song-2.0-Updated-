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
      className="relative rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden max-w-2xl mx-auto"
    >
      {/* Header of lyric container */}
      <div className="border-b border-stone-200 bg-[#F8FAF9] px-6 py-4 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-teal-800 text-xs sm:text-sm font-display font-bold tracking-wide">
            📜 Song Lyrics &amp; Chords ({currentLanguage})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasOriginalForCompare && (
            <button
              type="button"
              onClick={() => setShowBilingualCompare(!showBilingualCompare)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 cursor-pointer"
            >
              {showBilingualCompare ? "✓ Side-by-Side Lyrics" : "Show Original Below"}
            </button>
          )}
        </div>
      </div>

      {/* Integrated Language Translator Bar */}
      {onTranslateLanguage && (
        <div className="bg-stone-50/80 border-b border-stone-200 px-6 py-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
              <Globe size={14} className="text-teal-600" />
              <span>Translate Lyrics:</span>
            </span>

            {onResingInLanguage && (
              <button
                type="button"
                onClick={() => onResingInLanguage(currentLanguage)}
                disabled={isTranslating}
                className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Volume2 size={13} />
                <span>Sing &amp; Narrate in {currentLanguage}</span>
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
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50 ${
                  currentLanguage === lang.code
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-teal-50 hover:text-teal-800 border border-stone-200"
                }`}
              >
                {lang.short}
              </button>
            ))}
          </div>

          {isTranslating && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700 animate-pulse">
              <Sparkles size={13} />
              <span>Translating lyrics &amp; rhythm into {currentLanguage}...</span>
            </div>
          )}
        </div>
      )}

      {/* Main scrollable body */}
      <div
        ref={containerRef}
        className="h-[420px] overflow-y-auto px-6 py-6 space-y-7 scrollbar-thin scroll-smooth"
      >
        {lyricSections && lyricSections.length > 0 ? (
          lyricSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono font-bold tracking-wider text-teal-800 uppercase bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/80">
                  {section.sectionName}
                </span>
                <div className="flex-1 h-px bg-stone-200"></div>
              </div>

              {/* Verse lines */}
              <div className="space-y-3 pl-1">
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
                      className={`group relative py-2 px-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                        active
                          ? "bg-teal-50/90 border border-teal-400/80 shadow-xs"
                          : "hover:bg-stone-50 border border-transparent"
                      }`}
                    >
                      {/* Guitar Chord Indicator */}
                      {chord && (
                        <div className="h-5 flex items-end mb-0.5">
                          <span
                            className={`font-mono text-[11px] font-bold tracking-wider px-1.5 py-0.5 rounded transition-all ${
                              active
                                ? "text-white bg-teal-600"
                                : "text-teal-700 bg-teal-50/80 group-hover:bg-teal-100"
                            }`}
                          >
                            {chord}
                          </span>
                        </div>
                      )}

                      {/* Actual Lyric Text */}
                      <p
                        className={`font-sans leading-relaxed transition-all text-sm md:text-base ${
                          active
                            ? "text-teal-950 font-semibold"
                            : "text-slate-700 group-hover:text-slate-950"
                        }`}
                      >
                        {line}
                      </p>

                      {/* Subtitle Original English Reference Line when Translated */}
                      {hasOriginalForCompare && showBilingualCompare && origLine && origLine !== line && (
                        <p className="text-xs text-slate-500 italic mt-0.5 font-sans">
                          {origLine}
                        </p>
                      )}

                      {/* Small hover hint for timeline jump */}
                      <span className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[10px] font-mono text-teal-600">
                        {Math.floor(stamp / 60)}:{(stamp % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm">
            Strumming up the lyrics... Stand by
          </div>
        )}
      </div>

      {/* Clean Footer */}
      <div className="bg-[#F8FAF9] px-6 py-2.5 border-t border-stone-200 flex justify-between items-center text-[11px] font-mono text-slate-500">
        <span>TUNING: STANDARD EADGBE</span>
        <span>LANGUAGE: {currentLanguage.toUpperCase()}</span>
      </div>
    </div>
  );
};


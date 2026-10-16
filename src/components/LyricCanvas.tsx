import React, { useEffect, useRef, useState } from "react";
import { Globe, Sparkles, Volume2, Edit3, Check, AlertCircle } from "lucide-react";
import { LyricSection } from "../types";
import { SUPPORTED_SONG_LANGUAGES } from "./YosiaChildrenSection";

interface LyricCanvasProps {
  lyricSections: LyricSection[];
  originalLyricSections?: LyricSection[];
  currentTimeSeconds: number;
  currentLanguage?: string;
  isTranslating?: boolean;
  onTranslateLanguage?: (targetLanguage: string) => void;
  onSelectLanguage?: (targetLanguage: string) => void;
  onResingInLanguage?: (targetLanguage: string) => void;
  onReSingInLanguage?: (targetLanguage: string) => void;
  onLineClick?: (timestamp: number) => void;
  onUpdateLyrics?: (newLyrics: string, resingAudio?: boolean) => void;
}

export const LyricCanvas: React.FC<LyricCanvasProps> = ({
  lyricSections,
  originalLyricSections,
  currentTimeSeconds,
  currentLanguage = "English",
  isTranslating = false,
  onTranslateLanguage,
  onSelectLanguage,
  onResingInLanguage,
  onReSingInLanguage,
  onLineClick,
  onUpdateLyrics,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showBilingualCompare, setShowBilingualCompare] = useState(true);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  const [editedLyricsDraft, setEditedLyricsDraft] = useState("");
  const [savedBanner, setSavedBanner] = useState(false);

  const translateHandler = onTranslateLanguage || onSelectLanguage;
  const resingHandler = onResingInLanguage || onReSingInLanguage;

  // Format lyricSections into editable plain text when opening editor
  const buildDraftFromSections = (sections: LyricSection[]) => {
    return sections
      .filter((s) => s.sectionName !== "Intro")
      .map((s) => `[${s.sectionName}]\n${s.lines.join("\n")}`)
      .join("\n\n");
  };

  useEffect(() => {
    if (!isEditingLyrics) {
      setEditedLyricsDraft(buildDraftFromSections(lyricSections));
    }
  }, [lyricSections, isEditingLyrics]);

  // Automatically scroll to active lyrics as song progresses (karaoke-style visual focus)
  useEffect(() => {
    if (isEditingLyrics) return;
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
  }, [currentTimeSeconds, isEditingLyrics]);

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

  const handleSaveEditedLyrics = (shouldResing: boolean) => {
    if (!editedLyricsDraft.trim()) return;
    if (onUpdateLyrics) {
      onUpdateLyrics(editedLyricsDraft.trim(), shouldResing);
    }
    setIsEditingLyrics(false);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3500);
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isEditingLyrics) {
                setEditedLyricsDraft(buildDraftFromSections(lyricSections));
              }
              setIsEditingLyrics(!isEditingLyrics);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
          >
            <Edit3 size={13} className="text-amber-700" />
            <span>{isEditingLyrics ? "Cancel Editing" : "✏️ Edit Lyrics"}</span>
          </button>

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

      {/* Notice Banner: Please Check Lyrics / Edit Lyrics Anytime */}
      <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-700 shrink-0" />
          <span>
            <strong>PLEASE CHECK LYRICS:</strong> You can edit any words or lines right here after your song is created!
          </span>
        </div>
        {savedBanner && (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
            <Check size={12} /> Lyrics Saved!
          </span>
        )}
      </div>

      {/* Integrated Language Translator Bar */}
      {translateHandler && (
        <div className="bg-stone-50/80 border-b border-stone-200 px-6 py-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
              <Globe size={14} className="text-teal-600" />
              <span>Translate Lyrics:</span>
            </span>

            {resingHandler && (
              <button
                type="button"
                onClick={() => resingHandler(currentLanguage)}
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
                onClick={() => translateHandler(lang.code)}
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

      {/* Main scrollable body OR Post-Creation Lyrics Editor */}
      {isEditingLyrics ? (
        <div className="p-6 space-y-4 bg-stone-50/60">
          <div className="space-y-1">
            <label className="text-xs font-bold text-teal-900 uppercase tracking-wider block">
              ✏️ Edit Your Song Lyrics Below:
            </label>
            <p className="text-xs text-slate-600">
              Modify any names, verses, or chorus lines. Click <strong>Save Lyrics</strong> to update your song sheet and gift card, or click <strong>Save &amp; Re-Sing Song</strong> to re-record the vocals with your edited lyrics!
            </p>
          </div>

          <textarea
            rows={12}
            value={editedLyricsDraft}
            onChange={(e) => setEditedLyricsDraft(e.target.value)}
            className="w-full rounded-xl bg-white border border-teal-500 p-4 text-sm text-slate-900 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-inner"
            placeholder="Enter your custom song lyrics..."
          />

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditingLyrics(false)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-slate-700 border border-stone-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveEditedLyrics(false)}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              💾 Save Edited Lyrics
            </button>
            <button
              type="button"
              onClick={() => handleSaveEditedLyrics(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer shadow-xs"
            >
              🎸 Save &amp; Re-Sing Song Audio
            </button>
          </div>
        </div>
      ) : (
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
      )}

      {/* Clean Footer */}
      <div className="bg-[#F8FAF9] px-6 py-2.5 border-t border-stone-200 flex justify-between items-center text-[11px] font-mono text-slate-500">
        <span>TUNING: STANDARD EADGBE</span>
        <span>WWW.MYGIFTSONG.ORG • {currentLanguage.toUpperCase()}</span>
      </div>
    </div>
  );
};

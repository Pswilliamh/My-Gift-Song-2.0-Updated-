import React, { useState, useEffect } from "react";
import {
  Heart,
  Sparkles,
  Send,
  Gift,
  Check,
  MessageCircleHeart,
  ArrowRight,
  Mail,
  Music,
} from "lucide-react";
import { apiFetchJson } from "../utils/clientSongGenerator";

export interface SongReactionItem {
  id: string;
  emoji: string;
  label: string;
  note?: string;
  fromName?: string;
  createdAt: string;
}

interface RecipientReactionAndThankYouCardProps {
  songId: string;
  songTitle: string;
  recipientName: string;
  songShareUrl: string;
  gifterEmail?: string;
  initialReactions?: SongReactionItem[];
  isSharedRecipientView?: boolean;
  onCreateNewSongForSomeoneElse: () => void;
}

const QUICK_REACTIONS = [
  { emoji: "❤️", label: "Loved My Song!" },
  { emoji: "🙏", label: "So Blessed!" },
  { emoji: "🥹", label: "Tears of Joy!" },
  { emoji: "🎸", label: "Amazing Song!" },
];

export const RecipientReactionAndThankYouCard: React.FC<
  RecipientReactionAndThankYouCardProps
> = ({
  songId,
  songTitle,
  recipientName,
  songShareUrl,
  gifterEmail,
  initialReactions = [],
  isSharedRecipientView = false,
  onCreateNewSongForSomeoneElse,
}) => {
  const [reactions, setReactions] = useState<SongReactionItem[]>(initialReactions);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("❤️");
  const [selectedLabel, setSelectedLabel] = useState<string>("Loved My Song!");
  const [thankYouNote, setThankYouNote] = useState<string>(
    `Thank you so much for my custom song "${songTitle}"! Listening to it truly blessed my heart!`
  );
  const [senderFromName, setSenderFromName] = useState<string>(recipientName || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reactionSavedNotice, setReactionSavedNotice] = useState<string | null>(null);
  const [showNoteComposer, setShowNoteComposer] = useState<boolean>(false);

  useEffect(() => {
    setThankYouNote(
      `Thank you so much for my custom song "${songTitle}"! Listening to it truly blessed my heart!`
    );
    setSenderFromName(recipientName || "");
  }, [songTitle, recipientName]);

  useEffect(() => {
    if (initialReactions && initialReactions.length > 0) {
      setReactions(initialReactions);
    }
  }, [initialReactions]);

  // Also fetch latest reactions for this songId on mount
  useEffect(() => {
    if (!songId) return;
    apiFetchJson(`/api/songs/${encodeURIComponent(songId)}`)
      .then((data) => {
        if (data?.reactions && Array.isArray(data.reactions)) {
          setReactions(data.reactions);
        }
      })
      .catch(() => {
        // ignore fetch error
      });
  }, [songId]);

  const handleOneClickReaction = async (emoji: string, label: string, customNote?: string) => {
    setSelectedEmoji(emoji);
    setSelectedLabel(label);
    setIsSubmitting(true);
    try {
      const data = await apiFetchJson(`/api/songs/${encodeURIComponent(songId)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji,
          label,
          note: customNote,
          fromName: senderFromName || recipientName || "Song Recipient",
        }),
      });
      if (data?.reactions) {
        setReactions(data.reactions);
      }
      setReactionSavedNotice(
        customNote
          ? `💝 Your Thank-You Note & ${emoji} Reaction have been saved on this song card!`
          : `${emoji} "${label}" reaction sent! Click WhatsApp below to send a quick Thank-You note back to the sender.`
      );
      setTimeout(() => setReactionSavedNotice(null), 5000);
    } catch {
      const fallbackItem: SongReactionItem = {
        id: `local-${Date.now()}`,
        emoji,
        label,
        note: customNote,
        fromName: senderFromName || recipientName,
        createdAt: new Date().toISOString(),
      };
      setReactions((prev) => [fallbackItem, ...prev]);
      setReactionSavedNotice(`${emoji} Reaction saved!`);
      setTimeout(() => setReactionSavedNotice(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppThankYou = () => {
    const cleanNote =
      thankYouNote.trim() ||
      `Thank you so much for my custom song "${songTitle}"! It truly blessed my heart!`;
    const message = encodeURIComponent(
      `${selectedEmoji} *Thank You for My Custom Gift Song!*\n\n` +
        `"${cleanNote}"\n` +
        `— *${senderFromName || recipientName}*\n\n` +
        `🎵 Listen to my song "${songTitle}":\n${songShareUrl}\n\n` +
        `✨ Want to bless someone else with a custom song? Create yours in 60 seconds at:\nhttps://www.mygiftsong.org`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleSendEmailThankYou = () => {
    const cleanNote =
      thankYouNote.trim() ||
      `Thank you so much for my custom song "${songTitle}"! It truly blessed my heart!`;
    const subject = encodeURIComponent(
      `${selectedEmoji} Thank you for my custom gift song "${songTitle}"!`
    );
    const body = encodeURIComponent(
      `${cleanNote}\n\nWith gratitude,\n${senderFromName || recipientName}\n\n🎵 Listen to the song here: ${songShareUrl}\n✨ Created on https://www.mygiftsong.org`
    );
    window.location.href = `mailto:${gifterEmail || ""}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="rounded-2xl border-2 border-teal-500/40 bg-gradient-to-br from-white via-teal-50/40 to-amber-50/40 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* LEFT 7 COLS: RECIPIENT 1-CLICK REACTION & THANK-YOU BACK TO SENDER */}
        <div className="lg:col-span-7 space-y-3.5 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-700 text-white text-[11px] font-mono uppercase tracking-wider font-bold">
              <Heart size={12} fill="currentColor" />
              <span>
                {isSharedRecipientView
                  ? `For ${recipientName}: Send a Thank-You Reaction`
                  : "Recipient Reaction & Thank-You Button"}
              </span>
            </div>

            {reactions.length > 0 && (
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                {reactions[0].emoji} {reactions.length}{" "}
                {reactions.length === 1 ? "Reaction" : "Reactions"} Received
              </span>
            )}
          </div>

          <div>
            <h4 className="text-base sm:text-lg font-display font-bold text-slate-900">
              Did this song bless your heart, {recipientName}? Send a 1-Click Thank-You!
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Tap a reaction below or send a one-click thank-you note back to the person who gifted you this song:
            </p>
          </div>

          {/* 1-Click Reaction Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_REACTIONS.map((item) => {
              const isSelected = selectedEmoji === item.emoji && selectedLabel === item.label;
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleOneClickReaction(item.emoji, item.label)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-teal-700 text-white border-teal-700 shadow-2xs scale-[1.02]"
                      : "bg-white hover:bg-teal-50 text-slate-800 border-stone-200 hover:border-teal-300"
                  }`}
                >
                  <span className="text-sm">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {reactionSavedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2">
              <Check size={14} className="text-emerald-700 shrink-0" />
              <span>{reactionSavedNotice}</span>
            </div>
          )}

          {/* One-Click Send Thank-You Note Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSendWhatsAppThankYou}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Send size={13} />
              <span>Send Thank-You Note via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNoteComposer(!showNoteComposer)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageCircleHeart size={14} className="text-teal-700" />
              <span>{showNoteComposer ? "Hide Note Box" : "Write Custom Thank-You Note"}</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmailThankYou}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-slate-700 border border-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail size={13} />
              <span>Email Thank-You</span>
            </button>
          </div>

          {/* Expandable Custom Thank-You Note Composer */}
          {showNoteComposer && (
            <div className="p-3.5 rounded-xl bg-white border border-teal-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={senderFromName}
                  onChange={(e) => setSenderFromName(e.target.value)}
                  placeholder="Your Name"
                  className="sm:w-44 rounded-lg px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
                />
                <input
                  type="text"
                  value={thankYouNote}
                  onChange={(e) => setThankYouNote(e.target.value)}
                  placeholder="Write your thank-you message to the sender..."
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    handleOneClickReaction(selectedEmoji, selectedLabel, thankYouNote);
                    setShowNoteComposer(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer"
                >
                  💝 Save Note on Song Page
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsAppThankYou}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  💬 Send via WhatsApp Now
                </button>
              </div>
            </div>
          )}

          {/* Display Saved Recipient Thank-You Notes if any exist */}
          {reactions.some((r) => r.note) && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-teal-800 block">
                💌 Saved Thank-You Notes on This Song:
              </span>
              {reactions
                .filter((r) => r.note)
                .slice(0, 2)
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-xl bg-white/90 border border-teal-200/80 text-xs text-slate-700 flex items-start gap-2"
                  >
                    <span className="text-base leading-none">{r.emoji}</span>
                    <div>
                      <p className="italic">&ldquo;{r.note}&rdquo;</p>
                      {r.fromName && (
                        <p className="text-[10px] font-bold text-teal-800 mt-0.5">
                          — {r.fromName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: VIRAL PROMPT — "WANT TO BLESS SOMEONE ELSE WITH A CUSTOM SONG? CREATE YOURS IN 60 SECONDS" */}
        <div className="lg:col-span-5 bg-white border-2 border-teal-600/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs text-left">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-mono uppercase tracking-wider font-extrabold">
              <Sparkles size={12} className="text-amber-700" />
              <span>Pay the Blessing Forward • First 5 Songs Free</span>
            </div>
            <h4 className="text-base sm:text-lg font-display font-bold text-slate-900 leading-snug">
              Want to bless someone else with a custom song?{" "}
              <span className="text-teal-700">Create yours in 60 seconds.</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Just enter who it&apos;s for, the occasion, and a few special words. Haddi or Yosia will sing a personalized gift song you can share on WhatsApp or print with a QR code!
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNewSongForSomeoneElse}
            className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-display font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
          >
            <Gift size={16} />
            <span>Bless Someone Else Now (60 Seconds)</span>
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

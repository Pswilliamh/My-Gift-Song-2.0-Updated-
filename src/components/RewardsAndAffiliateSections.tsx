import React, { useState } from "react";
import {
  Gift,
  Crown,
  Users,
  Check,
  Copy,
  Sparkles,
  Mail,
  TrendingUp,
  Award,
  Share2,
  ArrowRight,
  Plus,
  DollarSign,
  ShieldCheck,
  ExternalLink
} from "lucide-react";

export interface ReferralEntry {
  id: string;
  name: string;
  email: string;
  date: string;
  status: "Verified" | "Invited";
  tier?: "basic_099" | "premium";
}

interface RewardsAndAffiliateProps {
  activeSubPage: "free-songs" | "lifetime" | "affiliate";
  freeSongsRemaining: number;
  freeSongsUsedHistory: { title: string; recipient: string; date: string }[];
  referrals: ReferralEntry[];
  onAddReferral: (name: string, email: string, tier: "basic_099" | "premium") => void;
  onStartSongInStudio: (preset?: { target?: string; context?: string; genre?: string }) => void;
}

export const RewardsAndAffiliateSections: React.FC<RewardsAndAffiliateProps> = ({
  activeSubPage,
  freeSongsRemaining,
  freeSongsUsedHistory,
  referrals,
  onAddReferral,
  onStartSongInStudio,
}) => {
  // Referral state
  const [friendName, setFriendName] = useState("");
  const [friendEmail, setFriendEmail] = useState("");
  const [selectedSignupTier, setSelectedSignupTier] = useState<"basic_099" | "premium">("basic_099");
  const [referralCode] = useState("HADDI-VIP-2026");
  const [copiedRefLink, setCopiedRefLink] = useState(false);
  const [referralBanner, setReferralBanner] = useState<string | null>(null);

  // Affiliate state
  const [affiliateHandle, setAffiliateHandle] = useState("minstrel-partner");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [affiliateJoined, setAffiliateJoined] = useState(false);
  const [copiedAffLink, setCopiedAffLink] = useState(false);
  const [copiedPromoText, setCopiedPromoText] = useState(false);

  // Separate $0.99 cent user referrals vs Premium account referrals
  const basic099Referrals = referrals.filter((r) => (r.tier || "basic_099") === "basic_099");
  const premiumReferrals = referrals.filter((r) => r.tier === "premium");

  const isBasic099LifetimeUnlocked = basic099Referrals.length >= 10;
  const isPremiumLifetimeUnlocked = premiumReferrals.length >= 10;
  const isAnyLifetimeUnlocked = isBasic099LifetimeUnlocked || isPremiumLifetimeUnlocked;

  const usedCount = 5 - freeSongsRemaining;

  const referralUrl = `${window.location.origin}/?invite=${encodeURIComponent(referralCode)}`;
  const affiliateUrl = `${window.location.origin}/?partner=${encodeURIComponent(affiliateHandle)}`;

  const handleCopyText = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim() || !friendEmail.trim()) return;
    onAddReferral(friendName.trim(), friendEmail.trim(), selectedSignupTier);
    const tierLabel =
      selectedSignupTier === "premium" ? "Premium Account" : "$0.99 Cent Account";
    setReferralBanner(
      `${tierLabel} signup recorded for ${friendName.trim()}!`
    );
    setFriendName("");
    setFriendEmail("");
    setTimeout(() => setReferralBanner(null), 3500);
  };

  const handleEmailInvite = () => {
    const subject = encodeURIComponent("Get Your First 5 Custom AI Gift Songs Free from Haddi!");
    const body = encodeURIComponent(
      `Hey friend!\n\nI've been creating custom sung gift songs and acoustic blessings with Haddi the Street Minstrel on mygiftsong.ai.\n\nUse my invite link to get your first 5 custom gift songs completely FREE:\n${referralUrl}\n\nEnjoy making music!`
    );
    window.location.href = `mailto:${friendEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 py-4">
      {/* =====================================================================
          SECTION 1: FIRST 5 SONGS ARE FREE
      ===================================================================== */}
      {activeSubPage === "free-songs" && (
        <div className="space-y-8">
          {/* Hero Header */}
          <div className="bg-gradient-to-br from-[#1f1712] via-[#140f0c] to-[#0c0907] border-2 border-[#FFD700]/60 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFD700] text-black font-mono text-xs font-extrabold uppercase tracking-wider">
                  <Gift size={14} /> First 5 Songs Are 100% Free
                </div>
                <h2 className="text-2xl sm:text-4xl font-display font-bold text-[#FAF9F6]">
                  Your Complimentary 5-Song Minstrel Pass
                </h2>
                <p className="text-sm text-[#C5A880] leading-relaxed">
                  Every creator receives their first <strong>5 custom gift songs completely free</strong>.
                  Includes both <strong>Lyria 3 Full Sung Studio Songs</strong> and{" "}
                  <strong>Haddi's Acoustic Spoken Blessings</strong>, plus downloadable WAV audio and
                  shareable digital gift cards.
                </p>
              </div>

              {/* Counter Card */}
              <div className="bg-black/80 border border-[#FFD700]/40 rounded-2xl p-6 text-center min-w-[210px] shrink-0">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#C5A880]">
                  Free Songs Remaining
                </p>
                <div className="text-5xl font-display font-extrabold text-[#FFD700] my-2">
                  {isAnyLifetimeUnlocked ? "∞" : `${freeSongsRemaining} / 5`}
                </div>
                <p className="text-xs text-emerald-400 font-mono">
                  {isPremiumLifetimeUnlocked
                    ? "👑 Lifetime Premium Account Active"
                    : isBasic099LifetimeUnlocked
                    ? "👑 Lifetime $0.99 Account Active"
                    : freeSongsRemaining > 0
                    ? `$0.00 • Ready to Redeem`
                    : "All 5 Free Songs Used"}
                </p>
              </div>
            </div>

            {/* 5 Interactive Stamp Slots */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const isUsed = slotIdx < usedCount && !isAnyLifetimeUnlocked;
                const historyItem = freeSongsUsedHistory[slotIdx];
                const defaultIdeas = [
                  { label: "Song #1: Family Blessing", target: "Mom & Dad", genre: "Acoustic Folk" },
                  { label: "Song #2: Birthday Gift", target: "Best Friend", genre: "Indie Pop" },
                  { label: "Song #3: Anniversary Song", target: "My Partner", genre: "Modern Worship" },
                  { label: "Song #4: Thank You Track", target: "Mentor", genre: "Lofi Acoustic" },
                  { label: "Song #5: Celebration Encore", target: "Someone Special", genre: "Bluegrass" },
                ];
                const idea = defaultIdeas[slotIdx];

                return (
                  <div
                    key={slotIdx}
                    className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                      isUsed
                        ? "bg-black/40 border-[#C5A880]/20 opacity-75"
                        : "bg-[#251e19]/70 border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880]">
                          Gift Pass #{slotIdx + 1}
                        </span>
                        {isUsed ? (
                          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                            Claimed
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono bg-[#FFD700] text-black font-bold px-2 py-0.5 rounded">
                            FREE
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-white">
                        {historyItem ? historyItem.title : idea.label}
                      </p>
                      <p className="text-[11px] text-[#C5A880]">
                        {historyItem
                          ? `For ${historyItem.recipient}`
                          : `Includes Lyria 3 + Haddi Voice`}
                      </p>
                    </div>

                    {!isUsed && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartSongInStudio({
                            target: idea.target,
                            context: `A heartfelt ${idea.genre} gift song created for ${idea.target}.`,
                            genre: idea.genre,
                          })
                        }
                        className="mt-4 w-full py-2 px-3 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>Use Free Slot</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Call to Action */}
            <div className="mt-6 pt-6 border-t border-[#C5A880]/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-[#FAF9F6]/80">
                <ShieldCheck size={18} className="text-[#FFD700] shrink-0" />
                <span>
                  Sign up 10 <strong className="text-[#FFD700]">$0.99 cent users</strong> to get a{" "}
                  <strong className="text-[#FFD700]">Lifetime $0.99 Account</strong>, or sign up 10{" "}
                  <strong className="text-[#FFD700]">Premium Accounts</strong> to get a{" "}
                  <strong className="text-[#FFD700]">Lifetime Premium Account for Free</strong>!
                </span>
              </div>
              <button
                type="button"
                onClick={() => onStartSongInStudio()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-black font-display font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer"
              >
                🎵 Create Next Free Song in Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2: SIGN UP 10 PEOPLE = GET A ONE-TIME LIFETIME LICENSE
      ===================================================================== */}
      {activeSubPage === "lifetime" && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-[#1f1712] via-[#140f0c] to-[#0c0907] border-2 border-[#FFD700]/70 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFD700] text-black font-mono text-xs font-extrabold uppercase tracking-wider">
                <Crown size={14} /> One-Time Lifetime License Rewards
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-[#FAF9F6]">
                Sign Up 10 Users • Unlock Your Lifetime Account Free
              </h2>
              <p className="text-sm text-[#C5A880] leading-relaxed">
                We offer two clear 10-signup one-time Lifetime License milestones:
                <br />• <strong>Sign up 10 $0.99 cent users</strong> and get a{" "}
                <strong className="text-[#FFD700]">Lifetime $0.99 Cent Account</strong>.
                <br />• <strong>Sign up 10 Premium accounts</strong> and get a{" "}
                <strong className="text-[#FFD700]">Lifetime Premium Account for FREE</strong> (plus a
                one-time commission on each Premium sign-up).
              </p>
            </div>

            {/* TWO SIDE-BY-SIDE 10-SIGNUP LIFETIME TRACKERS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TRACK 1: 10 x $0.99 CENT USERS -> LIFETIME $0.99 ACCOUNT */}
              <div className="bg-black/70 border-2 border-[#C5A880]/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A880] block">
                      Tier 1 • $0.99 Cent Plan Track
                    </span>
                    <h3 className="text-lg font-display font-bold text-[#FAF9F6]">
                      Sign Up 10 $0.99 Cent Users
                    </h3>
                    <p className="text-xs text-[#FFD700]">
                      Reward: Get a Lifetime $0.99 Cent Account
                    </p>
                  </div>
                  <div className="bg-[#1c1612] border border-[#FFD700]/40 rounded-xl px-4 py-2 text-center shrink-0">
                    <span className="text-2xl font-display font-extrabold text-[#FFD700]">
                      {Math.min(10, basic099Referrals.length)} / 10
                    </span>
                    <span className="block text-[9px] font-mono uppercase text-[#C5A880]">
                      $0.99 Signups
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FFD700] to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (basic099Referrals.length / 10) * 100)}%` }}
                  />
                </div>

                {isBasic099LifetimeUnlocked && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs font-mono text-center">
                    👑 UNLOCKED: Your Lifetime $0.99 Cent Account is Active!
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const refPerson = basic099Referrals[idx];
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          refPerson
                            ? "bg-emerald-950/30 border-emerald-500/40 text-white"
                            : "bg-black/50 border-[#C5A880]/20 text-white/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono uppercase text-[#C5A880]">
                            $0.99 #{idx + 1}
                          </span>
                          {refPerson ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Users size={11} className="text-white/30" />
                          )}
                        </div>
                        {refPerson ? (
                          <p className="text-[11px] font-bold text-[#FAF9F6] truncate">
                            {refPerson.name}
                          </p>
                        ) : (
                          <p className="text-[10px] text-white/35">Open Slot</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TRACK 2: 10 x PREMIUM ACCOUNTS -> LIFETIME PREMIUM ACCOUNT FOR FREE */}
              <div className="bg-black/70 border-2 border-[#FFD700]/60 rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(255,215,0,0.12)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFD700] block">
                      Tier 2 • Premium Account Track
                    </span>
                    <h3 className="text-lg font-display font-bold text-[#FAF9F6]">
                      Sign Up 10 Premium Accounts
                    </h3>
                    <p className="text-xs text-[#FFD700]">
                      Reward: Get a Lifetime Premium Account for FREE
                    </p>
                  </div>
                  <div className="bg-[#1c1612] border border-[#FFD700] rounded-xl px-4 py-2 text-center shrink-0">
                    <span className="text-2xl font-display font-extrabold text-[#FFD700]">
                      {Math.min(10, premiumReferrals.length)} / 10
                    </span>
                    <span className="block text-[9px] font-mono uppercase text-[#FFD700]">
                      Premium Signups
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FFD700] via-amber-300 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, (premiumReferrals.length / 10) * 100)}%` }}
                  />
                </div>

                {isPremiumLifetimeUnlocked && (
                  <div className="p-3 rounded-xl bg-amber-950/90 border border-[#FFD700] text-[#FFD700] text-xs font-mono text-center">
                    👑 UNLOCKED: Your Free Lifetime Premium Account is Active!
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const refPerson = premiumReferrals[idx];
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          refPerson
                            ? "bg-amber-950/40 border-[#FFD700]/60 text-white"
                            : "bg-black/50 border-[#C5A880]/20 text-white/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono uppercase text-[#FFD700]">
                            Prem #{idx + 1}
                          </span>
                          {refPerson ? (
                            <Check size={11} className="text-[#FFD700]" />
                          ) : (
                            <Crown size={11} className="text-white/30" />
                          )}
                        </div>
                        {refPerson ? (
                          <p className="text-[11px] font-bold text-[#FAF9F6] truncate">
                            {refPerson.name}
                          </p>
                        ) : (
                          <p className="text-[10px] text-white/35">Open Slot</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Share Your Referral Link + Direct Friend Signup Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#C5A880]/20">
              {/* Left: Personal Referral Link */}
              <div className="bg-black/60 border border-[#C5A880]/25 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-display font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                  <Share2 size={15} /> Step 1: Share Your Personal Invite Link
                </h3>
                <p className="text-xs text-[#C5A880]">
                  Share your link with friends. Sign up 10 $0.99 cent users for a{" "}
                  <strong className="text-white">Lifetime $0.99 Account</strong>, or sign up 10
                  Premium accounts for a{" "}
                  <strong className="text-[#FFD700]">Free Lifetime Premium Account</strong>!
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralUrl}
                    className="flex-1 bg-neutral-950 border border-[#C5A880]/30 rounded-lg px-3 py-2.5 text-xs font-mono text-[#FFD700]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(referralUrl, setCopiedRefLink)}
                    className="px-4 py-2.5 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedRefLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedRefLink ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleEmailInvite}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-[#251e19] hover:bg-[#332922] text-[#FAF9F6] border border-[#C5A880]/30 font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail size={13} /> Send Email Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = encodeURIComponent(
                        `🎵 Create your first 5 custom gift songs FREE with Haddi the Street Minstrel! Join with my invite link: ${referralUrl}`
                      );
                      window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
                    }}
                    className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={13} /> Share on WhatsApp
                  </button>
                </div>
              </div>

              {/* Right: Register / Sign Up a Friend Directly */}
              <form
                onSubmit={handleInviteSubmit}
                className="bg-black/60 border border-[#C5A880]/25 rounded-xl p-5 space-y-4"
              >
                <h3 className="text-sm font-display font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                  <Plus size={15} /> Step 2: Record a $0.99 or Premium Sign-Up
                </h3>

                {referralBanner && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                    ✓ {referralBanner}
                  </div>
                )}

                {/* Account Tier Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSignupTier("basic_099")}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedSignupTier === "basic_099"
                        ? "bg-[#FFD700] text-black border-[#FFD700]"
                        : "bg-neutral-950 text-white/70 border-[#C5A880]/30"
                    }`}
                  >
                    $0.99 Cent User ({basic099Referrals.length}/10)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSignupTier("premium")}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedSignupTier === "premium"
                        ? "bg-[#FFD700] text-black border-[#FFD700]"
                        : "bg-neutral-950 text-white/70 border-[#C5A880]/30"
                    }`}
                  >
                    👑 Premium Account ({premiumReferrals.length}/10)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Friend's Name
                    </label>
                    <input
                      type="text"
                      required
                      value={friendName}
                      onChange={(e) => setFriendName(e.target.value)}
                      placeholder="e.g. Pastor John"
                      className="w-full bg-neutral-950 border border-[#C5A880]/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Friend's Email
                    </label>
                    <input
                      type="email"
                      required
                      value={friendEmail}
                      onChange={(e) => setFriendEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="w-full bg-neutral-950 border border-[#C5A880]/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-display font-extrabold text-xs uppercase tracking-wider shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users size={15} />
                  <span>
                    {selectedSignupTier === "premium"
                      ? "Credit Toward 10/10 Free Lifetime Premium Account"
                      : "Credit Toward 10/10 Lifetime $0.99 Cent Account"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: AFFILIATE PARTNER PROGRAM (ONE-TIME LIFETIME LICENSE & PREMIUM SIGN-UP COMMISSION)
      ===================================================================== */}
      {activeSubPage === "affiliate" && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-[#1f1712] via-[#140f0c] to-[#0c0907] border-2 border-[#FFD700]/70 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFD700] text-black font-mono text-xs font-extrabold uppercase tracking-wider">
                  <TrendingUp size={14} /> Official Affiliate & Lifetime License Program
                </div>
                <h2 className="text-2xl sm:text-4xl font-display font-bold text-[#FAF9F6]">
                  One-Time Lifetime License & Commission on Premium Sign-Ups
                </h2>
                <p className="text-sm text-[#C5A880] leading-relaxed">
                  We offer a straightforward, transparent partner structure with{" "}
                  <strong>no recurring subscriptions or recurring commissions</strong>. Earn a{" "}
                  <strong className="text-[#FFD700]">one-time commission on every Premium sign-up</strong>,
                  and unlock your own{" "}
                  <strong className="text-[#FFD700]">One-Time Lifetime License</strong> by signing up 10 users!
                </p>
              </div>

              {/* One-Time Program Highlights */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="bg-black/80 border border-[#FFD700]/40 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-mono uppercase text-[#C5A880]">Premium Sign-Up</p>
                  <p className="text-xl font-display font-extrabold text-[#FFD700] my-1">One-Time</p>
                  <p className="text-[10px] text-emerald-400 font-mono">Commission Payout</p>
                </div>
                <div className="bg-black/80 border border-[#FFD700]/40 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-mono uppercase text-[#C5A880]">10 Referrals</p>
                  <p className="text-xl font-display font-extrabold text-[#FFD700] my-1">Lifetime</p>
                  <p className="text-[10px] text-emerald-400 font-mono">One-Time License</p>
                </div>
              </div>
            </div>

            {/* Affiliate Link Generator & One-Time License / Commission Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Partner Link & Registration */}
              <div className="lg:col-span-7 bg-black/60 border border-[#C5A880]/25 rounded-2xl p-6 space-y-5">
                <h3 className="text-base font-display font-bold text-[#FFD700] flex items-center gap-2">
                  <Award size={18} /> Your Custom Affiliate Tracking Link
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Your Partner Handle / ID
                    </label>
                    <input
                      type="text"
                      value={affiliateHandle}
                      onChange={(e) =>
                        setAffiliateHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))
                      }
                      placeholder="your-name"
                      className="w-full bg-neutral-950 border border-[#C5A880]/30 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      PayPal / Stripe Payout Email (For Premium Sign-Up Commissions)
                    </label>
                    <input
                      type="email"
                      value={affiliateEmail}
                      onChange={(e) => setAffiliateEmail(e.target.value)}
                      placeholder="payouts@yourdomain.com"
                      className="w-full bg-neutral-950 border border-[#C5A880]/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-[#C5A880]">
                    Your Live Affiliate Referral Link:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={affiliateUrl}
                      className="flex-1 bg-neutral-950 border border-[#FFD700]/40 rounded-lg px-3 py-2.5 text-xs font-mono text-[#FFD700]"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(affiliateUrl, setCopiedAffLink)}
                      className="px-4 py-2.5 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedAffLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedAffLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>
                </div>

                {/* Ready-to-Post Promo Copy */}
                <div className="space-y-2 pt-2 border-t border-[#C5A880]/15">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-[#C5A880]">
                      Ready-to-Share Social & Email Blurb:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `🎁 Give someone a custom sung song today! Haddi the Street Minstrel turns your personal memories into a studio-quality acoustic song. Get your first 5 songs FREE here: ${affiliateUrl}`,
                          setCopiedPromoText
                        )
                      }
                      className="text-[11px] font-mono text-[#FFD700] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPromoText ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedPromoText ? "Copied Blurb!" : "Copy Blurb"}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-neutral-950/90 border border-[#C5A880]/20 text-xs text-white/80 italic">
                    "🎁 Give someone a custom sung song today! Haddi the Street Minstrel turns your
                    personal memories into a studio-quality acoustic song. Get your first 5 songs FREE
                    here: {affiliateUrl}"
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAffiliateJoined(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#e6c200] text-black font-display font-extrabold text-xs uppercase tracking-wider shadow hover:brightness-110 transition-all cursor-pointer"
                >
                  {affiliateJoined
                    ? "✓ Affiliate Partner Account Active & Tracking"
                    : "Activate Affiliate Partner Dashboard"}
                </button>
              </div>

              {/* Right 5 Cols: Official One-Time Reward & Commission Rules (No Recurring Estimator) */}
              <div className="lg:col-span-5 bg-black/60 border border-[#C5A880]/25 rounded-2xl p-6 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <h3 className="text-base font-display font-bold text-[#FFD700] flex items-center gap-2">
                    <Crown size={18} /> One-Time License & Commission Tiers
                  </h3>

                  {/* Rule 1: 10 x $0.99 Users */}
                  <div className="p-4 rounded-xl bg-neutral-950/90 border border-[#C5A880]/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                        1. $0.99 Cent User Track
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {Math.min(10, basic099Referrals.length)} / 10 Signed Up
                      </span>
                    </div>
                    <p className="text-xs text-[#FAF9F6] leading-relaxed">
                      <strong>Sign up 10 $0.99 cent users</strong> and get a{" "}
                      <strong className="text-[#FFD700]">Lifetime $0.99 Cent Account</strong> (one-time
                      lifetime license).
                    </p>
                  </div>

                  {/* Rule 2: 10 x Premium Accounts */}
                  <div className="p-4 rounded-xl bg-neutral-950/90 border border-[#FFD700]/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                        2. Premium Account Track
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {Math.min(10, premiumReferrals.length)} / 10 Signed Up
                      </span>
                    </div>
                    <p className="text-xs text-[#FAF9F6] leading-relaxed">
                      <strong>Sign up 10 Premium accounts</strong> and get a{" "}
                      <strong className="text-[#FFD700]">Lifetime Premium Account for FREE</strong>{" "}
                      (one-time lifetime license).
                    </p>
                  </div>

                  {/* Rule 3: One-Time Commission on Premium Sign-Ups */}
                  <div className="p-4 rounded-xl bg-neutral-950/90 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                        <DollarSign size={13} /> 3. One-Time Premium Commission
                      </span>
                      <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                        One-Time Payout
                      </span>
                    </div>
                    <p className="text-xs text-[#C5A880] leading-relaxed">
                      Earn a <strong>one-time commission</strong> exclusively on verified{" "}
                      <strong className="text-white">Premium Account sign-ups</strong>. No recurring
                      fees or recurring commissions.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#251e19] to-black border border-[#FFD700]/40 rounded-xl p-4 text-center space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#C5A880]">
                    Your Current Lifetime License Status
                  </p>
                  <p className="text-sm font-display font-extrabold text-[#FFD700]">
                    {isPremiumLifetimeUnlocked
                      ? "👑 Lifetime Premium Account Unlocked (FREE)"
                      : isBasic099LifetimeUnlocked
                      ? "👑 Lifetime $0.99 Cent Account Unlocked"
                      : `${10 - Math.min(10, basic099Referrals.length)} more $0.99 signups OR ${
                          10 - Math.min(10, premiumReferrals.length)
                        } more Premium signups`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

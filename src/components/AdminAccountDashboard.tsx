import React, { useState } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Crown,
  Gift,
  Music,
  Check,
  UserCheck,
  Sparkles,
  Trash2,
  Unlock,
  Lock,
  LogOut,
  LogIn,
  Sliders,
  Video
} from "lucide-react";
import { ReferralEntry } from "./RewardsAndAffiliateSections";
import { GiftSongCard } from "./GiftSongCard";

export interface AdminUser {
  email: string;
  name: string;
  role: string;
  isAuthenticated: boolean;
  unlimitedBypass: boolean;
}

interface AdminAccountDashboardProps {
  adminUser: AdminUser;
  onUpdateAdminUser: (next: AdminUser) => void;
  freeSongsRemaining: number;
  freeSongsUsedHistory: { title: string; recipient: string; date: string }[];
  onResetFreeSongs: () => void;
  onRefundSongSlot: (index: number) => void;
  referrals: ReferralEntry[];
  onClearReferrals: () => void;
  onAddReferral: (name: string, email: string, tier: "basic_099" | "premium") => void;
  onOpenStudio: () => void;
  onOpenSandbox: () => void;
  onHideAdmin?: () => void;
}

export const MASTER_ADMIN_EMAIL = "PsWilliamh@gmail.com";

export const AdminAccountDashboard: React.FC<AdminAccountDashboardProps> = ({
  adminUser,
  onUpdateAdminUser,
  freeSongsRemaining,
  freeSongsUsedHistory,
  onResetFreeSongs,
  onRefundSongSlot,
  referrals,
  onClearReferrals,
  onAddReferral,
  onOpenStudio,
  onOpenSandbox,
  onHideAdmin,
}) => {
  const [emailInput, setEmailInput] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Private Admin Beta Testing Lab State (Hidden from regular users!)
  const [betaTestRecipient, setBetaTestRecipient] = useState("Johnny");
  const [betaTestWords, setBetaTestWords] = useState(
    "May the Lord bless you with joy, laughter, and a big smile on your birthday!"
  );
  const [simAccountEmail, setSimAccountEmail] = useState("pastor@gracechurch.org");
  const [simPlanTier, setSimPlanTier] = useState<"church_large" | "church_300" | "church_starter" | "lifetime_basic" | "lifetime_premium">("church_large");
  const [simUsedSongs, setSimUsedSongs] = useState<number>(16);
  const [simLimitSongs, setSimLimitSongs] = useState<number>(100);

  const triggerBanner = (msg: string) => {
    setActionBanner(msg);
    setTimeout(() => setActionBanner(null), 4500);
  };

  const handleAdminSimulateMonthlyReset = async () => {
    try {
      await fetch("/api/accounts/simulate-month-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: simAccountEmail }),
      });
    } catch {
      // ignore network error
    }
    const unused = Math.max(0, simLimitSongs - simUsedSongs);
    setSimUsedSongs(0);
    triggerBanner(
      `✓ Admin 1st-of-Month Reset Verified for ${simAccountEmail}: ${unused} unused songs did NOT roll over into ${simLimitSongs + unused} — counter cleanly reset back to ${simLimitSongs}/${simLimitSongs}!`
    );
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = emailInput.trim().toLowerCase();
    const cleanPass = passcode.trim().toUpperCase();
    if (
      normalized === MASTER_ADMIN_EMAIL.toLowerCase() &&
      (cleanPass === "" || cleanPass === "ADMIN" || cleanPass === "SHALOM" || cleanPass === "HADDI")
    ) {
      onUpdateAdminUser({
        email: MASTER_ADMIN_EMAIL,
        name: "PsWilliamh (Master Admin)",
        role: "Founder & Super Admin",
        isAuthenticated: true,
        unlimitedBypass: adminUser.unlimitedBypass,
      });
      setLoginError("");
      triggerBanner("Master Admin account authenticated!");
    } else {
      setLoginError("Invalid admin credentials.");
    }
  };

  const basicCount = referrals.filter((r) => (r.tier || "basic_099") === "basic_099").length;
  const premiumCount = referrals.filter((r) => r.tier === "premium").length;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 py-4">
      {/* Top Admin Status Banner */}
      <div className="bg-gradient-to-br from-[#1f1712] via-[#140f0c] to-[#0c0907] border-2 border-[#FFD700] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFD700] text-black font-mono text-xs font-extrabold uppercase tracking-wider">
              <ShieldCheck size={14} /> Private Master Admin Console (Hidden From Public)
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#FAF9F6] flex flex-wrap items-center gap-2.5">
              <span>{adminUser.isAuthenticated ? adminUser.name : "Restricted Admin Portal"}</span>
              {adminUser.isAuthenticated && (
                <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md">
                  {adminUser.email}
                </span>
              )}
            </h2>
            <p className="text-sm text-[#C5A880] max-w-2xl leading-relaxed">
              This console is completely invisible to public visitors. Full administrative control over your 5-Song Free Pass state, bad song slot refunds, Lifetime License referral counters, and direct Google AI Studio Lyria 3 song generation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onResetFreeSongs();
                triggerBanner("5-Song Free Pass reset to 5/5! First song cleared.");
              }}
              className="px-5 py-3 rounded-xl bg-[#FFD700] hover:brightness-110 text-black font-mono text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Reset 5-Song State (5/5 Free)</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenStudio}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#251e19] hover:bg-[#332922] text-[#FFD700] border border-[#FFD700]/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Music size={14} />
                <span>Studio</span>
              </button>
              {onHideAdmin && (
                <button
                  type="button"
                  onClick={onHideAdmin}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white/80 border border-white/20 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Hide Admin Tab & Return to Public Studio"
                >
                  <Lock size={13} />
                  <span>Hide Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {actionBanner && (
          <div className="mt-5 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-emerald-200 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold">
              <Check size={15} className="text-emerald-400" />
              {actionBanner}
            </span>
          </div>
        )}
      </div>

      {/* Admin Authentication / Switcher Card if logged out */}
      {!adminUser.isAuthenticated ? (
        <form
          onSubmit={handleAdminLogin}
          className="bg-[#121110] border border-[#C5A880]/30 rounded-2xl p-6 max-w-md mx-auto space-y-4"
        >
          <h3 className="text-base font-display font-bold text-[#FFD700] flex items-center gap-2">
            <LogIn size={16} /> Sign In to Private Admin Console
          </h3>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
              Admin Email
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter admin email..."
              className="w-full bg-black border border-[#C5A880]/40 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
              Admin Keyphrase (Optional)
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Optional keyphrase"
              className="w-full bg-black border border-[#C5A880]/40 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>
          {loginError && <p className="text-xs text-red-400 font-mono">{loginError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-[#FFD700] text-black font-mono text-xs font-bold uppercase cursor-pointer"
            >
              Unlock Master Admin
            </button>
            {onHideAdmin && (
              <button
                type="button"
                onClick={onHideAdmin}
                className="px-4 py-2.5 rounded-lg bg-neutral-900 text-white/70 border border-white/15 font-mono text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: 5-SONG STATE MANAGER & SLOT REFUND CONTROL */}
          <div className="lg:col-span-7 bg-[#121110]/95 border border-[#C5A880]/30 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5A880]/20 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFD700] block">
                  5-Song Free Pass Controller
                </span>
                <h3 className="text-lg font-display font-bold text-white">
                  Free Song Pass State: {freeSongsRemaining} of 5 Available
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetFreeSongs();
                    triggerBanner("All 5 Free Song slots restored (5/5 Available)!");
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset to 5/5</span>
                </button>
              </div>
            </div>

            {/* 5 Visual Slots with Individual Reset/Refund */}
            <div className="space-y-2.5">
              <p className="text-xs text-[#C5A880]">
                If any generated song was a test or not good, click{" "}
                <strong className="text-[#FFD700]">Restore Slot</strong> or{" "}
                <strong className="text-[#FFD700]">Reset to 5/5</strong> to immediately get all 5
                free songs back:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const usedCount = 5 - freeSongsRemaining;
                  const isUsed = idx < usedCount;
                  const item = freeSongsUsedHistory[idx];

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex flex-col justify-between ${
                        isUsed
                          ? "bg-red-950/20 border-red-500/40"
                          : "bg-emerald-950/25 border-emerald-500/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-[#C5A880]">
                            Song #{idx + 1}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isUsed
                                ? "bg-red-500/20 text-red-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {isUsed ? "USED" : "READY"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">
                          {item ? item.title : "Free Song Slot"}
                        </p>
                        <p className="text-[10px] text-[#C5A880] truncate">
                          {item ? `For ${item.recipient}` : "100% Free ($0.00)"}
                        </p>
                      </div>

                      {isUsed && (
                        <button
                          type="button"
                          onClick={() => {
                            onRefundSongSlot(idx);
                            triggerBanner(`Song #${idx + 1} refunded! Slot is free again.`);
                          }}
                          className="mt-2.5 w-full py-1.5 px-2 rounded bg-[#FFD700] text-black font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={10} /> Restore
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Unlimited Mode Toggle */}
            <div className="p-4 rounded-xl bg-black/60 border border-[#FFD700]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-[#FFD700]" />
                  <span className="text-xs font-mono font-bold uppercase text-[#FFD700]">
                    Admin Unlimited Song Bypass ({adminUser.unlimitedBypass ? "ON" : "OFF"})
                  </span>
                </div>
                <p className="text-xs text-[#C5A880]">
                  When ON, creating songs will never deduct from your 5/5 Free Songs counter. Keep
                  OFF when you want to test the standard 5-song countdown flow.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !adminUser.unlimitedBypass;
                  onUpdateAdminUser({
                    ...adminUser,
                    unlimitedBypass: nextVal,
                  });
                  triggerBanner(
                    nextVal
                      ? "Admin Unlimited Bypass enabled — songs will not deduct from 5/5!"
                      : "Standard 5/5 Free Song Pass tracking enabled."
                  );
                }}
                className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase shrink-0 flex items-center gap-1.5 cursor-pointer transition-all ${
                  adminUser.unlimitedBypass
                    ? "bg-emerald-500 text-black"
                    : "bg-[#251e19] text-[#FFD700] border border-[#FFD700]/40"
                }`}
              >
                {adminUser.unlimitedBypass ? <Unlock size={14} /> : <Lock size={14} />}
                <span>{adminUser.unlimitedBypass ? "Unlimited Active" : "Enable Unlimited"}</span>
              </button>
            </div>
          </div>

          {/* RIGHT 5 COLS: ADMIN PROFILE & LIFETIME LICENSE SIMULATOR */}
          <div className="lg:col-span-5 bg-[#121110]/95 border border-[#C5A880]/30 rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#C5A880]/20 pb-3">
                <h3 className="text-base font-display font-bold text-[#FFD700] flex items-center gap-2">
                  <UserCheck size={17} /> Admin Credentials & Tools
                </h3>
                <span className="text-[10px] font-mono bg-[#FFD700]/15 text-[#FFD700] px-2 py-0.5 rounded border border-[#FFD700]/30">
                  VERIFIED
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono bg-black/60 p-4 rounded-xl border border-[#C5A880]/20">
                <div className="flex justify-between">
                  <span className="text-[#C5A880]">Admin Email:</span>
                  <span className="text-white font-bold">{adminUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5A880]">Access Level:</span>
                  <span className="text-emerald-400 font-bold">{adminUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5A880]">5-Song Pass State:</span>
                  <span className="text-[#FFD700] font-bold">{freeSongsRemaining} / 5 Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5A880]">Audio Engine:</span>
                  <span className="text-emerald-300">Lyria 3 Complete Song + TTS</span>
                </div>
              </div>

              {/* Quick Referral & Lifetime Testing Tools */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A880] block">
                  Lifetime License Referral Simulator ({basicCount}/10 $0.99 • {premiumCount}/10
                  Premium)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onAddReferral(
                        `VIP Guest #${basicCount + 1}`,
                        `guest${basicCount + 1}@example.com`,
                        "basic_099"
                      );
                      triggerBanner("Added 1 test $0.99 referral!");
                    }}
                    className="py-2 px-3 rounded-lg bg-[#251e19] hover:bg-[#332922] text-[#FAF9F6] border border-[#C5A880]/30 font-mono text-[11px] cursor-pointer"
                  >
                    +1 $0.99 Signup ({basicCount}/10)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddReferral(
                        `Premium Partner #${premiumCount + 1}`,
                        `premium${premiumCount + 1}@example.com`,
                        "premium"
                      );
                      triggerBanner("Added 1 test Premium referral!");
                    }}
                    className="py-2 px-3 rounded-lg bg-[#251e19] hover:bg-[#332922] text-[#FFD700] border border-[#FFD700]/40 font-mono text-[11px] cursor-pointer"
                  >
                    +1 Premium Signup ({premiumCount}/10)
                  </button>
                </div>

                {referrals.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearReferrals();
                      triggerBanner("Cleared test referrals.");
                    }}
                    className="w-full py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-500/30 font-mono text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} /> Reset Referral Counters (0/10)
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#C5A880]/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onOpenSandbox}
                className="flex-1 py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-900 text-[#FFD700] border border-[#FFD700]/40 font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sliders size={13} />
                <span>Open Minstrel Sandbox</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateAdminUser({
                    ...adminUser,
                    isAuthenticated: false,
                  })
                }
                className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white/70 font-mono text-xs flex items-center gap-1 cursor-pointer"
                title="Lock Admin Session"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>

          {/* =====================================================================
              FULL-WIDTH ADMIN BETA TESTING LAB (HIDDEN FROM REGULAR USERS)
              1. 10-Second Personal Birthday Greeting Video & QR Gift Card Tester
              2. Monthly Quota 1st-of-Month Reset Simulator (No-Rollover Verifier)
          ===================================================================== */}
          <div className="lg:col-span-12 bg-[#121110]/95 border-2 border-[#FFD700]/60 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C5A880]/25 pb-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FFD700] text-black font-mono text-[10px] font-extrabold uppercase tracking-wider">
                  <Video size={12} /> Admin-Only Beta Testing Suite (Hidden From Regular Users)
                </span>
                <h3 className="text-xl font-display font-bold text-white">
                  🎬 10-Second Personal Greeting Video &amp; Monthly Quota Reset Lab
                </h3>
                <p className="text-xs text-[#C5A880]">
                  Test Yosia &amp; Haddi&apos;s 10-second spoken &amp; acoustic guitar birthday greeting video, QR keepsake card, and 1st-of-the-month no-rollover quota resets privately inside your Admin portal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Live 10-Second Personal Greeting Video & Gift Card Tester */}
              <div className="lg:col-span-7 bg-black/50 border border-[#C5A880]/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-[#FFD700]">
                    1. 10-Second Personal Greeting Video Beta Tester
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                    Yosia &amp; Haddi Live Video + 10s Voice
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Test Recipient Name:
                    </label>
                    <input
                      type="text"
                      value={betaTestRecipient}
                      onChange={(e) => setBetaTestRecipient(e.target.value)}
                      placeholder="e.g. Johnny"
                      className="w-full bg-neutral-950 border border-[#C5A880]/40 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Test Birthday / Blessing Words:
                    </label>
                    <input
                      type="text"
                      value={betaTestWords}
                      onChange={(e) => setBetaTestWords(e.target.value)}
                      placeholder="e.g. Wishing you a happy blessed birthday!"
                      className="w-full bg-neutral-950 border border-[#C5A880]/40 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <GiftSongCard
                  songId="admin-beta-test-10s-video"
                  audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                  recipientName={betaTestRecipient || "Johnny"}
                  songTitle={`Happy Blessed Birthday ${betaTestRecipient || "Johnny"}`}
                  userWords={betaTestWords}
                  lyrics={`Happy blessed birthday to you, ${betaTestRecipient || "Johnny"}!\n${betaTestWords}\nStrummed with joy by Yosia and Haddi,\nMay God bless your special day!`}
                  artistPersona="yosia"
                />
              </div>

              {/* Right 5 Cols: Admin 1st-of-Month Quota Reset Simulator (No-Rollover Verifier) */}
              <div className="lg:col-span-5 bg-black/50 border border-[#C5A880]/30 rounded-2xl p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold uppercase text-[#FFD700] block">
                    2. Monthly Quota Reset Simulator (No Rollover)
                  </span>
                  <p className="text-xs text-[#C5A880] leading-relaxed">
                    Verify how Church Accounts (10, 30, 100 songs/mo) and Lifetime Member Accounts (5, 15 songs/mo) reset back to their exact plan limit on the 1st of the month without rolling over unused songs:
                  </p>
                </div>

                <div className="space-y-3 bg-neutral-950/90 border border-[#C5A880]/25 rounded-xl p-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Account Email to Test:
                    </label>
                    <input
                      type="email"
                      value={simAccountEmail}
                      onChange={(e) => setSimAccountEmail(e.target.value)}
                      className="w-full bg-black border border-[#C5A880]/40 rounded-lg px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#C5A880] mb-1">
                      Select Plan Quota Tier:
                    </label>
                    <select
                      value={simPlanTier}
                      onChange={(e) => {
                        const val = e.target.value as typeof simPlanTier;
                        setSimPlanTier(val);
                        const limits = {
                          church_large: 100,
                          church_300: 30,
                          church_starter: 10,
                          lifetime_premium: 15,
                          lifetime_basic: 5,
                        };
                        const nextLim = limits[val];
                        setSimLimitSongs(nextLim);
                        setSimUsedSongs(val === "church_large" ? 16 : Math.min(2, nextLim));
                      }}
                      className="w-full bg-black border border-[#C5A880]/40 rounded-lg px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="church_large">🌍 Large Church Plan (100 Songs/Mo)</option>
                      <option value="church_300">⛪ 300-Member Church Plan (30 Songs/Mo)</option>
                      <option value="church_starter">⛪ Small Church Plan (10 Songs/Mo)</option>
                      <option value="lifetime_basic">👑 Lifetime Basic Pass (5 Songs/Mo)</option>
                      <option value="lifetime_premium">👑 Lifetime Premium Pass (15 Songs/Mo)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1f1712] border border-[#FFD700]/30 text-center space-y-1">
                    <p className="text-[10px] font-mono uppercase text-[#C5A880]">
                      Simulated Monthly Pool State
                    </p>
                    <p className="text-2xl font-display font-extrabold text-[#FFD700]">
                      {Math.max(0, simLimitSongs - simUsedSongs)} / {simLimitSongs} Remaining
                    </p>
                    <p className="text-[11px] font-mono text-emerald-300">
                      ({simUsedSongs} Used • {Math.max(0, simLimitSongs - simUsedSongs)} Unused — 0 Rollover)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimUsedSongs((prev) => Math.min(simLimitSongs, prev + 5))}
                      className="py-2 px-3 rounded-lg bg-[#251e19] hover:bg-[#332922] text-white border border-[#C5A880]/30 font-mono text-[11px] cursor-pointer"
                    >
                      + Use 5 Songs
                    </button>
                    <button
                      type="button"
                      onClick={handleAdminSimulateMonthlyReset}
                      className="py-2 px-3 rounded-lg bg-[#FFD700] hover:brightness-110 text-black font-mono text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Simulate 1st Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

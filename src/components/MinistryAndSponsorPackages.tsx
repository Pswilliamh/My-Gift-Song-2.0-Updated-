import React, { useState, useEffect } from "react";
import {
  Heart,
  Users,
  Sparkles,
  Calendar,
  Music,
  Gift,
  Globe,
  Check,
  Plus,
  Trash2,
  Send,
  ArrowRight,
  Smile,
  ShieldCheck,
  QrCode,
  Upload,
  Lock,
  RotateCcw,
  KeyRound,
} from "lucide-react";
import { SUPPORTED_SONG_LANGUAGES } from "./YosiaChildrenSection";
import { SetType } from "../types";

export interface MinistryRosterMember {
  id: string;
  name: string;
  role: "Congregation Member" | "Sponsored Child" | "Ministry Sponsor" | "Youth / Kids Ministry";
  occasionDate: string;
  occasionType: string;
  language: string;
  persona: "haddi" | "yosia";
  blessingNote: string;
  contactInfo?: string;
  status: "Scheduled" | "Song Ready";
}

interface MinistryAndSponsorPackagesProps {
  freeSongsRemaining: number;
  onGenerateMinistrySong: (params: {
    target: string;
    context: string;
    genre: string;
    language: string;
    setType: SetType;
    artistPersona: "haddi" | "yosia";
    autoGenerate: boolean;
  }) => void;
}

const DEFAULT_MINISTRY_ROSTER: MinistryRosterMember[] = [
  {
    id: "min-1",
    name: "Sponsor Sarah Jenkins (from Little Timo & Yosia)",
    role: "Ministry Sponsor",
    occasionDate: "Oct 24",
    occasionType: "Sponsor Birthday & Child-Sponsorship Thank You",
    language: "Bilingual (English & Bahasa Indonesia)",
    persona: "yosia",
    blessingNote:
      "Thank you Sponsor Sarah for your prayers, love, and support! Happy blessed birthday from Little Timo and Yosia in Jakarta — Tuhan memberkati selalu!",
    contactInfo: "sarah.sponsor@example.org",
    status: "Scheduled",
  },
  {
    id: "min-2",
    name: "Brother Daniel & Family",
    role: "Congregation Member",
    occasionDate: "Oct 28",
    occasionType: "Church Member Birthday Blessing",
    language: "English",
    persona: "haddi",
    blessingNote:
      "Numbers 6:24-26 — The Lord bless you and keep you, Brother Daniel! Thank you for serving faithfully on our church hospitality team.",
    contactInfo: "+1 (555) 234-5678",
    status: "Scheduled",
  },
  {
    id: "min-3",
    name: "Adik Putri (Sponsored Child Turning 8)",
    role: "Sponsored Child",
    occasionDate: "Nov 02",
    occasionType: "8th Birthday Children's Blessing Song",
    language: "Bahasa Indonesia",
    persona: "yosia",
    blessingNote:
      "Selamat ulang tahun ke-8 Adik Putri! Yesus mengasihimu, rajin belajar, selalu tersenyum dan penuh sukacita!",
    contactInfo: "Children's Home Jakarta",
    status: "Scheduled",
  },
];

export const MinistryAndSponsorPackages: React.FC<MinistryAndSponsorPackagesProps> = ({
  freeSongsRemaining,
  onGenerateMinistrySong,
}) => {
  const [ministryName, setMinistryName] = useState<string>(() => {
    try {
      return localStorage.getItem("mygiftsong_ministry_name") || "Grace Fellowship & Child Sponsorship Ministry";
    } catch {
      return "Grace Fellowship & Child Sponsorship Ministry";
    }
  });

  const [pastorOrDirectorName, setPastorOrDirectorName] = useState<string>(() => {
    try {
      return localStorage.getItem("mygiftsong_ministry_leader") || "Pastor William & Ministry Team";
    } catch {
      return "Pastor William & Ministry Team";
    }
  });

  const [activePackageMode, setActivePackageMode] = useState<"church" | "sponsorship" | "donors">("sponsorship");
  const [autoBirthdayEnabled, setAutoBirthdayEnabled] = useState<boolean>(true);
  const [selectedSetType, setSelectedSetType] = useState<SetType>("full");

  const [roster, setRoster] = useState<MinistryRosterMember[]>(() => {
    try {
      const saved = localStorage.getItem("mygiftsong_ministry_roster_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_MINISTRY_ROSTER;
  });

  // Add new member/sponsor form state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<MinistryRosterMember["role"]>("Ministry Sponsor");
  const [newDate, setNewDate] = useState("");
  const [newOccasion, setNewOccasion] = useState("Birthday & Ministry Blessing");
  const [newLanguage, setNewLanguage] = useState("English");
  const [newPersona, setNewPersona] = useState<"haddi" | "yosia">("yosia");
  const [newBlessingNote, setNewBlessingNote] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Church Account Login & Monthly Quota Reset (No Rollover) state
  const [churchEmail, setChurchEmail] = useState("pastor@gracechurch.org");
  const [churchAccessCode, setChurchAccessCode] = useState("GRACE-100");
  const [churchPlanTier, setChurchPlanTier] = useState<"church_starter" | "church_300" | "church_large">("church_large");
  const [monthlySongLimit, setMonthlySongLimit] = useState<number>(100);
  const [songsUsedThisMonth, setSongsUsedThisMonth] = useState<number>(16);
  const [isChurchLoggedIn, setIsChurchLoggedIn] = useState<boolean>(true);
  const [coordinators, setCoordinators] = useState<
    Array<{ name: string; role: string; email: string }>
  >([
    { name: "Pastor William", role: "Senior Pastor (Admin)", email: "pastor@gracechurch.org" },
    { name: "Sister Hannah", role: "Church Secretary", email: "office@gracechurch.org" },
    { name: "Brother Lukas", role: "Child Sponsorship Coordinator", email: "sponsors@gracechurch.org" },
  ]);
  const [newCoordName, setNewCoordName] = useState("");
  const [newCoordRole, setNewCoordRole] = useState("Ministry Coordinator");
  const [newCoordEmail, setNewCoordEmail] = useState("");

  const handleChurchAccountLogin = async (e?: React.FormEvent, overrideTier?: "church_starter" | "church_300" | "church_large") => {
    if (e) e.preventDefault();
    const tierToUse = overrideTier || churchPlanTier;
    try {
      const res = await fetch("/api/accounts/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: churchEmail,
          accessCode: churchAccessCode,
          displayName: pastorOrDirectorName,
          organizationName: ministryName,
          planTier: tierToUse,
        }),
      });
      const data = await res.json();
      if (data.success && data.account) {
        setIsChurchLoggedIn(true);
        setMonthlySongLimit(data.account.monthlySongLimit);
        setSongsUsedThisMonth(data.account.songsUsedThisMonth);
        if (Array.isArray(data.account.coordinators) && data.account.coordinators.length > 0) {
          setCoordinators(data.account.coordinators);
        }
        setStatusBanner(
          `✓ Logged into ${ministryName} Account (${data.account.monthlySongLimit - data.account.songsUsedThisMonth} / ${data.account.monthlySongLimit} songs available this month • Resets 1st of month, No Rollover)`
        );
        setTimeout(() => setStatusBanner(null), 5000);
      }
    } catch {
      const limit = tierToUse === "church_large" ? 100 : tierToUse === "church_300" ? 30 : 10;
      setMonthlySongLimit(limit);
      setIsChurchLoggedIn(true);
    }
  };

  const handleSimulateFirstOfMonthReset = async () => {
    try {
      await fetch("/api/accounts/simulate-month-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: churchEmail }),
      });
    } catch {
      // ignore network error
    }
    const previousUnused = Math.max(0, monthlySongLimit - songsUsedThisMonth);
    setSongsUsedThisMonth(0);
    setStatusBanner(
      `✓ 1st-of-Month Reset Complete! (${previousUnused} unused songs did NOT roll over into ${monthlySongLimit + previousUnused} — counter cleanly reset back to ${monthlySongLimit} / ${monthlySongLimit} songs for the new month!)`
    );
    setTimeout(() => setStatusBanner(null), 6000);
  };

  const handleAddCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoordName.trim() || !newCoordEmail.trim()) return;
    if (coordinators.length >= 3) {
      setStatusBanner("Maximum 3 Authorized Ministry Coordinators per Church Account.");
      setTimeout(() => setStatusBanner(null), 4000);
      return;
    }
    const updated = [
      ...coordinators,
      { name: newCoordName.trim(), role: newCoordRole.trim() || "Coordinator", email: newCoordEmail.trim().toLowerCase() },
    ];
    setCoordinators(updated);
    setNewCoordName("");
    setNewCoordEmail("");
    try {
      await fetch("/api/accounts/update-coordinators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: churchEmail, coordinators: updated }),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem("mygiftsong_ministry_roster_v1", JSON.stringify(roster));
    } catch {
      // ignore storage errors
    }
  }, [roster]);

  useEffect(() => {
    try {
      localStorage.setItem("mygiftsong_ministry_name", ministryName);
      localStorage.setItem("mygiftsong_ministry_leader", pastorOrDirectorName);
    } catch {
      // ignore
    }
  }, [ministryName, pastorOrDirectorName]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const defaultNote =
      newBlessingNote.trim() ||
      `Sent with love and gratitude from ${ministryName} (${pastorOrDirectorName}). May the Lord bless you abundantly on your special day!`;

    const added: MinistryRosterMember = {
      id: `min-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      occasionDate: newDate.trim() || "Upcoming Birthday",
      occasionType: newOccasion.trim() || "Birthday Blessing",
      language: newLanguage,
      persona: newPersona,
      blessingNote: defaultNote,
      status: "Scheduled",
    };

    setRoster((prev) => [added, ...prev]);
    setNewName("");
    setNewDate("");
    setNewBlessingNote("");
    setStatusBanner(`✓ Added ${added.name} to your Automated Ministry Birthday & Sponsor Roster!`);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkPasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const imported: MinistryRosterMember[] = lines.map((line, idx) => {
      const parts = line.split(",").map((p) => p.trim());
      const memberName = parts[0] || `Ministry Member ${idx + 1}`;
      const memberDate = parts[1] || "Upcoming Birthday";
      const memberNote =
        parts.slice(2).join(", ") ||
        `Blessed birthday greetings from ${ministryName} and ${pastorOrDirectorName}!`;
      return {
        id: `bulk-${Date.now()}-${idx}`,
        name: memberName,
        role: activePackageMode === "sponsorship" ? "Ministry Sponsor" : "Congregation Member",
        occasionDate: memberDate,
        occasionType: "Automated Birthday Blessing",
        language: newLanguage,
        persona: activePackageMode === "sponsorship" ? "yosia" : "haddi",
        blessingNote: memberNote,
        status: "Scheduled",
      };
    });

    setRoster((prev) => [...imported, ...prev]);
    setBulkPasteText("");
    setShowBulkPaste(false);
    setStatusBanner(`✓ Imported ${imported.length} members/sponsors into your Ministry Schedule!`);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleLaunchMemberSong = (member: MinistryRosterMember, autoGenerate: boolean) => {
    setRoster((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, status: "Song Ready" } : m))
    );
    setSongsUsedThisMonth((prev) => Math.min(monthlySongLimit, prev + 1));

    const combinedContext = `Occasion: ${member.occasionType} (${member.occasionDate}) from ${ministryName} (${pastorOrDirectorName}). Desired Words & Lyrics: ${member.blessingNote}`;
    const genre =
      member.persona === "yosia"
        ? "Children's Joyful Acoustic Sing-Along"
        : "Modern Worship";

    onGenerateMinistrySong({
      target: member.name,
      context: combinedContext,
      genre,
      language: member.language,
      setType: selectedSetType,
      artistPersona: member.persona,
      autoGenerate,
    });
  };

  const handleShareMemberWhatsApp = (member: MinistryRosterMember) => {
    const text = encodeURIComponent(
      `🎁✨ *Special Ministry Blessing Song for ${member.name}*\n` +
        `From: *${ministryName}* (${pastorOrDirectorName})\n\n` +
        `🎵 "${member.blessingNote}"\n\n` +
        `👉 Listen & Create Custom Ministry Blessing Songs at:\nhttps://www.mygiftsong.org`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 py-4 text-slate-900">
      {/* HERO BANNER */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold uppercase tracking-wider">
              <Heart size={14} className="text-teal-600" />
              <span>Church, Ministry &amp; Child-Sponsorship Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
              Automated Birthday &amp; Blessing Songs for{" "}
              <span className="text-teal-700">Churches &amp; Child-Sponsorship Ministries</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Bless every congregation member, sponsored child, or monthly ministry sponsor with a personalized acoustic song from{" "}
              <strong className="text-slate-900">Haddi</strong> or{" "}
              <strong className="text-slate-900">Yosia (Children&apos;s Guitar Brother)</strong> — complete with a WhatsApp link and Printable QR Keepsake Card.
            </p>
          </div>

          {/* Automation Status Badge */}
          <div className="bg-[#F8FAF9] border border-teal-200 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[230px] text-center space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  autoBirthdayEnabled ? "bg-teal-600 animate-ping" : "bg-stone-400"
                }`}
              />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-900">
                {autoBirthdayEnabled ? "Auto-Blessing Active" : "Manual Mode"}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {roster.length} Members &amp; Sponsors in Roster
            </p>
            <button
              type="button"
              onClick={() => setAutoBirthdayEnabled(!autoBirthdayEnabled)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                autoBirthdayEnabled
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "bg-stone-200 text-slate-700"
              }`}
            >
              {autoBirthdayEnabled ? "✓ Auto-Birthday Queue ON" : "Turn Auto-Queue ON"}
            </button>
          </div>
        </div>

        {/* 3 Ministry Mode Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          <button
            type="button"
            onClick={() => {
              setActivePackageMode("sponsorship");
              setNewRole("Ministry Sponsor");
              setNewPersona("yosia");
            }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activePackageMode === "sponsorship"
                ? "bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/15"
                : "bg-stone-50/70 border-stone-200 hover:border-teal-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold uppercase text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                👦🎸 Child Sponsorship
              </span>
              {activePackageMode === "sponsorship" && (
                <Check size={15} className="text-teal-700" />
              )}
            </div>
            <h3 className="text-sm font-display font-bold text-slate-900">
              Sponsored Kids &amp; Sponsor Thank-Yous
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Yosia sings birthday blessings for sponsored children OR musical thank-you songs from children back to their sponsors!
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePackageMode("church");
              setNewRole("Congregation Member");
              setNewPersona("haddi");
            }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activePackageMode === "church"
                ? "bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/15"
                : "bg-stone-50/70 border-stone-200 hover:border-teal-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold uppercase text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                ⛪ Church Congregation
              </span>
              {activePackageMode === "church" && (
                <Check size={15} className="text-teal-700" />
              )}
            </div>
            <h3 className="text-sm font-display font-bold text-slate-900">
              Church Member Birthday &amp; Care
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Send every church member a personalized birthday, anniversary, or healing prayer song from your Pastor &amp; Church.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePackageMode("donors");
              setNewRole("Ministry Sponsor");
              setNewPersona("haddi");
            }}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
              activePackageMode === "donors"
                ? "bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/15"
                : "bg-stone-50/70 border-stone-200 hover:border-teal-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-bold uppercase text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                🤝 Donor Appreciation
              </span>
              {activePackageMode === "donors" && (
                <Check size={15} className="text-teal-700" />
              )}
            </div>
            <h3 className="text-sm font-display font-bold text-slate-900">
              Ministry Partners &amp; QR Keepsakes
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Print scannable QR code keepsake cards for donor appreciation banquets, missions trips, and Christmas mailings.
            </p>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="bg-teal-50 border border-teal-300 text-teal-950 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-teal-700 hover:text-teal-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* MINISTRY BRANDING & ADD ROSTER FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 cols: Ministry Branding + Add Member/Sponsor Form */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="space-y-1 border-b border-stone-200 pb-3">
            <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
              <Plus size={17} className="text-teal-600" />
              <span>Add Member, Child, or Sponsor</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure your church/ministry signature and add recipients to the birthday &amp; blessing schedule
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-teal-900 block">
                Church / Ministry Name
              </label>
              <input
                type="text"
                value={ministryName}
                onChange={(e) => setMinistryName(e.target.value)}
                className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-white border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-teal-900 block">
                From Pastor / Ministry Leader
              </label>
              <input
                type="text"
                value={pastorOrDirectorName}
                onChange={(e) => setPastorOrDirectorName(e.target.value)}
                className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-white border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <form onSubmit={handleAddMember} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Recipient Name (Member, Sponsored Child, or Sponsor)
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Sponsor David Miller, Sister Grace, Little Samuel..."
                className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Recipient Group
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as MinistryRosterMember["role"])}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
                >
                  <option value="Ministry Sponsor">Ministry Sponsor</option>
                  <option value="Sponsored Child">Sponsored Child</option>
                  <option value="Congregation Member">Congregation Member</option>
                  <option value="Youth / Kids Ministry">Youth / Kids Ministry</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Birthday / Date
                </label>
                <input
                  type="text"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder="e.g., Nov 12 or Today"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Singer Voice
                </label>
                <select
                  value={newPersona}
                  onChange={(e) => setNewPersona(e.target.value as "haddi" | "yosia")}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
                >
                  <option value="yosia">👦🎸 Yosia (Kids &amp; Sponsor Joy)</option>
                  <option value="haddi">🎸 Haddi (Acoustic Worship)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Song Language
                </label>
                <select
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:outline-none focus:border-teal-600"
                >
                  {SUPPORTED_SONG_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Personal Blessing, Scripture, or Thank-You Lyrics
              </label>
              <textarea
                rows={3}
                value={newBlessingNote}
                onChange={(e) => setNewBlessingNote(e.target.value)}
                placeholder="e.g., Thank you for sponsoring Little Timo in Jakarta! May God bless your birthday with peace, joy, and overflowing grace..."
                className="w-full rounded-xl px-3.5 py-2 text-xs bg-stone-50 border border-stone-300 text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-display font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Add to Ministry Roster</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload size={13} />
                <span>Bulk Paste List</span>
              </button>
            </div>
          </form>

          {showBulkPaste && (
            <form onSubmit={handleBulkImport} className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2.5">
              <p className="text-[11px] font-semibold text-teal-900">
                Paste one member or sponsor per line: <code className="bg-white px-1 py-0.5 rounded">Name, Birthday, Blessing Note</code>
              </p>
              <textarea
                rows={3}
                value={bulkPasteText}
                onChange={(e) => setBulkPasteText(e.target.value)}
                placeholder={`Sponsor John Smith, Nov 15, Thank you for sponsoring Little Adi in Jakarta!\nSister Ruth Tan, Nov 18, Happy birthday from Grace Church!`}
                className="w-full rounded-lg p-2.5 text-xs bg-white border border-teal-300 text-slate-900 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer"
              >
                Import List into Roster
              </button>
            </form>
          )}
        </div>

        {/* Right 7 cols: Active Ministry & Sponsor Roster with 1-Click Song Generation */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-teal-600" />
                <span>Automated Birthday &amp; Sponsor Song Roster</span>
              </h2>
              <p className="text-xs text-slate-500">
                Click <strong>Create &amp; Sing Now</strong> on any member or sponsor to produce their custom song &amp; QR card immediately
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setSelectedSetType("quick")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  selectedSetType === "quick"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600"
                }`}
              >
                60s Song
              </button>
              <button
                type="button"
                onClick={() => setSelectedSetType("full")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  selectedSetType === "full"
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "text-slate-600"
                }`}
              >
                2-Min Full Song ($1.99)
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {roster.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl border border-stone-200 bg-[#F8FAF9] hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-sm text-slate-900">
                        {member.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {member.role}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        🎂 {member.occasionDate}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Singer:{" "}
                      <strong className="text-teal-800">
                        {member.persona === "yosia" ? "👦🎸 Yosia (Children's Brother)" : "🎸 Haddi (Acoustic Minstrel)"}
                      </strong>{" "}
                      • Language: <strong className="text-slate-700">{member.language}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        member.status === "Song Ready"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-white text-slate-600 border border-stone-200"
                      }`}
                    >
                      {member.status === "Song Ready" ? "✓ Song Created" : "⏰ Auto-Queued"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRoster((prev) => prev.filter((r) => r.id !== member.id))}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove from roster"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-stone-200/80 italic">
                  &ldquo;{member.blessingNote}&rdquo;
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchMemberSong(member, true)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-display font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>Create &amp; Sing Blessing Song Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLaunchMemberSong(member, false)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Music size={13} />
                      <span>Customize in Studio</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShareMemberWhatsApp(member)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send size={12} />
                    <span>WhatsApp Blessing</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          CHURCH ACCOUNT LOGIN, 3-COORDINATOR TEAM ACCESS & STRICT NO-ROLLOVER POLICY
      ===================================================================== */}
      <div className="bg-white border-2 border-teal-600/30 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold uppercase tracking-wider">
              <KeyRound size={14} className="text-teal-600" />
              <span>How Church Logins &amp; Monthly Song Resets Work</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
              1 Shared Church Account (Up to 3 Admin Logins) • Resets on the 1st (No Rollover)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              <strong>Congregation members do NOT need their own login!</strong> Only your church office team (up to{" "}
              <strong>3 Authorized Coordinators</strong>: e.g. Pastor, Church Secretary, &amp; Sponsorship Director) logs in to create or schedule songs. Recipients simply tap their WhatsApp link or scan their QR card to listen!
            </p>
          </div>

          {/* Live Monthly Reset Counter Badge */}
          <div className="bg-[#F8FAF9] border border-teal-300 rounded-2xl p-4 text-center min-w-[255px] shrink-0 space-y-1.5">
            <p className="text-[11px] font-mono uppercase font-bold text-teal-800">
              {isChurchLoggedIn ? "Active Church Monthly Pool" : "Church Monthly Pool"}
            </p>
            <div className="text-3xl font-display font-extrabold text-teal-700">
              {Math.max(0, monthlySongLimit - songsUsedThisMonth)} / {monthlySongLimit}
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Songs Remaining This Month ({songsUsedThisMonth} Used)
            </p>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={handleSimulateFirstOfMonthReset}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Test what happens on the 1st of the next month (resets back to plan limit with 0 rollover)"
              >
                <RotateCcw size={11} />
                <span>Simulate 1st-of-Month Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Strict No-Rollover Explanation Box (100 Songs Example) */}
        <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-teal-700 shrink-0" />
            <h3 className="text-xs sm:text-sm font-display font-bold text-slate-900">
              Why Monthly Songs Reset on the 1st (No Rollover Policy)
            </h3>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            To keep our monthly church pricing ultra-affordable (as low as <strong>$0.60/song</strong>),{" "}
            <strong className="text-teal-950">monthly plan songs do NOT roll over from month to month</strong>.
            For example, if a church on the <strong>100 Songs/Month Plan</strong> uses <strong>16 songs</strong> (or <strong>60 songs</strong>) this month, the unused songs do <strong>not</strong> stack into 140 or 184 songs next month. Instead, on the <strong>1st of every month</strong>, the church&apos;s balance cleanly resets back to <strong>100 songs</strong>.{" "}
            <span className="text-teal-900 font-semibold">
              (Note: Optional $7.99 10-Song Top-Up Packs purchased for extra-busy months never expire until used!)
            </span>
          </p>
        </div>

        {/* 2-Column Church Login & 3 Authorized Coordinators Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 6 Cols: Church Account Login Credentials & Plan Selector */}
          <form
            onSubmit={(e) => handleChurchAccountLogin(e)}
            className="lg:col-span-6 bg-[#F8FAF9] border border-stone-200 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                <Lock size={15} className="text-teal-600" />
                <span>Church / Ministry Account Login</span>
              </h3>
              <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {isChurchLoggedIn ? "✓ Logged In" : "Ready"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Church / Coordinator Email
                </label>
                <input
                  type="email"
                  value={churchEmail}
                  onChange={(e) => setChurchEmail(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ministry Access Code / Password
                </label>
                <input
                  type="text"
                  value={churchAccessCode}
                  onChange={(e) => setChurchAccessCode(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Active Monthly Church Plan Quota (Resets on the 1st — No Rollover)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "church_starter" as const, label: "10 Songs/Mo", sub: "$9.99/mo", limit: 10 },
                  { id: "church_300" as const, label: "30 Songs/Mo", sub: "$24.99/mo", limit: 30 },
                  { id: "church_large" as const, label: "100 Songs/Mo", sub: "$59.99/mo", limit: 100 },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setChurchPlanTier(tier.id);
                      setMonthlySongLimit(tier.limit);
                      if (songsUsedThisMonth > tier.limit) setSongsUsedThisMonth(2);
                      handleChurchAccountLogin(undefined, tier.id);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      churchPlanTier === tier.id
                        ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                        : "bg-white text-slate-700 border-stone-300 hover:border-teal-400"
                    }`}
                  >
                    <p className="text-xs font-bold">{tier.label}</p>
                    <p className={`text-[10px] ${churchPlanTier === tier.id ? "text-teal-100" : "text-slate-500"}`}>
                      {tier.sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-display font-bold transition-all cursor-pointer"
            >
              Sync Church Account &amp; Monthly Allowance
            </button>
          </form>

          {/* Right 6 Cols: Up to 3 Authorized Ministry Coordinators */}
          <div className="lg:col-span-6 bg-[#F8FAF9] border border-stone-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-slate-900 flex items-center gap-2">
                  <Users size={15} className="text-teal-600" />
                  <span>Authorized Church Team Logins ({coordinators.length} / 3 Seats)</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  Shares {monthlySongLimit} Songs/Mo Pool
                </span>
              </div>

              <div className="space-y-2">
                {coordinators.map((coord, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-stone-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{coord.name}</span>{" "}
                      <span className="text-[10px] font-mono uppercase bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 ml-1">
                        {coord.role}
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono">{coord.email}</p>
                    </div>
                    {coordinators.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCoordinators((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Remove coordinator"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {coordinators.length < 3 && (
              <form onSubmit={handleAddCoordinator} className="pt-2 border-t border-stone-200 flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Coordinator Name"
                  value={newCoordName}
                  onChange={(e) => setNewCoordName(e.target.value)}
                  className="flex-1 min-w-[120px] bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
                <input
                  type="email"
                  placeholder="coordinator@church.org"
                  value={newCoordEmail}
                  onChange={(e) => setNewCoordEmail(e.target.value)}
                  className="flex-1 min-w-[140px] bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                >
                  + Add Seat
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* CHURCH & SPONSORSHIP MONTHLY SUBSCRIPTION TIERS + BIRTHDAY MATH CALCULATOR */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-teal-700 font-bold">
            ⛪ Recommended Monthly Church &amp; Ministry Plans (No Special Hardware Needed)
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
            Simple Monthly Song Allowances Based on Congregation or Sponsorship Size
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            No special hardware required — up to <strong>3 authorized church coordinators</strong> log in from any phone or computer! Monthly song allowances <strong>reset back to your plan limit on the 1st of every month (no rollover)</strong>, and if you have an extra-busy birthday month, add a <strong>10-Song Top-Up Pack ($7.99)</strong> anytime.
          </p>
        </div>

        {/* Quick Church Birthday Math Reference Banner */}
        <div className="rounded-2xl bg-teal-50/70 border border-teal-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-xl p-3 border border-teal-100">
            <p className="text-[11px] font-mono uppercase text-teal-800 font-bold">
              ~100–120 Member Church
            </p>
            <p className="text-sm font-display font-bold text-slate-900 mt-0.5">
              ≈ 8 to 10 Birthdays / Month
            </p>
            <p className="text-[11px] text-slate-500">
              Fits the <strong>10 Songs/Mo Plan ($9.99/mo • Resets 1st of Mo)</strong>
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border-2 border-teal-500 shadow-2xs">
            <p className="text-[11px] font-mono uppercase text-teal-800 font-bold">
              ~300 Member Church (300 ÷ 12)
            </p>
            <p className="text-sm font-display font-bold text-teal-900 mt-0.5">
              ≈ 25 Birthdays / Month
            </p>
            <p className="text-[11px] text-teal-700 font-semibold">
              Fits the <strong>30 Songs/Mo Plan ($24.99/mo • Resets 1st of Mo)</strong>
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-teal-100">
            <p className="text-[11px] font-mono uppercase text-teal-800 font-bold">
              ~600 to 1,000+ Member Ministry
            </p>
            <p className="text-sm font-display font-bold text-slate-900 mt-0.5">
              ≈ 50 to 85 Birthdays / Month
            </p>
            <p className="text-[11px] text-slate-500">
              Fits the <strong>100 Songs/Mo Plan ($59.99/mo • Resets 1st of Mo)</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tier 1: 10 Songs / Month */}
          <div className="rounded-2xl border border-stone-200 bg-[#F8FAF9] p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                Small Church / Youth Group (~120 Members)
              </span>
              <h3 className="text-lg font-display font-bold text-slate-900">
                10 Blessing Songs / Month
              </h3>
              <p className="text-2xl font-display font-bold text-teal-700">
                $9.99 <span className="text-xs font-normal text-slate-500">/ month (~$0.99/song)</span>
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Resets to <strong>10 Songs on the 1st of Every Month</strong> (No Rollover)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Includes <strong>1 Church Account (Up to 3 Coordinator Logins)</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>More than 10 birthdays? Add a <strong>10-Song Top-Up ($7.99)</strong> anytime!</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (roster[0]) handleLaunchMemberSong(roster[0], false);
              }}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-display font-semibold text-xs cursor-pointer transition-colors"
            >
              Try First {freeSongsRemaining} Songs Free →
            </button>
          </div>

          {/* Tier 2 — Highlighted 300-Member Church & Child Sponsorship Plan */}
          <div className="rounded-2xl border-2 border-teal-600 bg-white p-5 flex flex-col justify-between space-y-4 shadow-md relative">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-white bg-teal-700 px-2.5 py-0.5 rounded-full">
                  ⭐ Best for 300-Member Churches &amp; Sponsors
                </span>
                <QrCode size={16} className="text-teal-700" />
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900">
                30 Blessing Songs / Month
              </h3>
              <p className="text-2xl font-display font-bold text-teal-700">
                $24.99 <span className="text-xs font-normal text-slate-500">/ month (~$0.83/song)</span>
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Covers all ~25 monthly birthdays in a 300-member church + 5 extra care songs!</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Resets cleanly to <strong>30 Songs on the 1st of Every Month</strong> (No Rollover)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Shared Church Login (Pastor, Secretary &amp; Coordinator) + $7.99 Top-Ups</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (roster[0]) handleLaunchMemberSong(roster[0], true);
              }}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-display font-bold text-xs cursor-pointer transition-colors shadow-xs"
            >
              Test 300-Member Ministry Song Now →
            </button>
          </div>

          {/* Tier 3: Large Church & Global Sponsorship Network */}
          <div className="rounded-2xl border border-stone-200 bg-[#F8FAF9] p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                Large Church &amp; Missions (1,000+ Members)
              </span>
              <h3 className="text-lg font-display font-bold text-slate-900">
                100 Blessing Songs / Month
              </h3>
              <p className="text-2xl font-display font-bold text-teal-700">
                $59.99 <span className="text-xs font-normal text-slate-500">/ month (~$0.60/song)</span>
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Resets cleanly to <strong>100 Songs on the 1st of Every Month</strong> (No Rollover)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Up to 3 Authorized Ministry Coordinator Logins Sharing 1 Pool</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-teal-600 shrink-0" />
                  <span>Priority Studio Rendering &amp; Bulk CSV Birthday Import</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                if (roster[0]) handleLaunchMemberSong(roster[0], false);
              }}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-display font-semibold text-xs cursor-pointer transition-colors"
            >
              Configure Ministry Studio →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

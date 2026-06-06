"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import {
  User,
  GraduationCap,
  Building,
  Target,
  Code,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Trophy,
  Star,
  Hand,
  Link,
  Lightbulb,
  Brain,
  Bot,
  PartyPopper,
  Smile,
  Dumbbell,
  Laugh,
  Gift,
} from "lucide-react";

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "What is the worst-case time complexity of inserting an element into a Binary Search Tree (BST)?",
    options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
    correct: 2,
  },
  {
    id: 2,
    text: "Which data structure is typically used to implement Breadth-First Search (BFS) on a graph?",
    options: ["Stack", "Queue", "Heap", "Hash Map"],
    correct: 1,
  },
  {
    id: 3,
    text: "Which algorithm design paradigm does the Coin Change problem commonly use for optimal solutions?",
    options: ["Greedy", "Divide and Conquer", "Dynamic Programming", "Backtracking"],
    correct: 2,
  },
  {
    id: 4,
    text: "What is the space complexity of a recursive Depth-First Search (DFS) on a tree of height H?",
    options: ["O(1)", "O(H)", "O(N)", "O(H^2)"],
    correct: 1,
  },
  {
    id: 5,
    text: "If a sorting algorithm maintains the relative order of equal elements, it is said to be:",
    options: ["Stable", "Unstable", "In-place", "Optimal"],
    correct: 0,
  },
];

const inputCls =
  "w-full bg-background border border-border focus:border-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-colors font-sans text-sm";

const labelCls = "block text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-2";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 2);
  const [referralCode, setReferralCode] = useState("");
  // True when the code was auto-applied from an invite link (read-only display).
  const [referralFromLink, setReferralFromLink] = useState(false);

  // Step 2: Goals
  const [targetCompany, setTargetCompany] = useState("");
  const [timeline, setTimeline] = useState("6 months");
  const [favoriteSeries, setFavoriteSeries] = useState("NARUTO");

  // Step 3: LeetCode (required - username OR profile URL)
  const [lcUsername, setLcUsername] = useState("");
  const [lcProfileUrl, setLcProfileUrl] = useState("");
  const [lcValidating, setLcValidating] = useState(false);
  const [lcVerified, setLcVerified] = useState(false);

  // Step 4: Mentor
  const [mentorName, setMentorName] = useState("Sensei");
  const [mentorVibe, setMentorVibe] = useState("Friendly");

  // Step 5: Quiz (optional)
  const [testStarted, setTestStarted] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState(120);

  // Step 6: Results
  const [results, setResults] = useState<any>(null);
  const [quizScore, setQuizScore] = useState(0);

  // Prefill the referral code if the user arrived via an invite link (the code
  // is stashed in a cookie on the signup page).
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)leetrun_ref=([^;]+)/);
    if (match?.[1]) {
      setReferralCode(decodeURIComponent(match[1]).toUpperCase());
      setReferralFromLink(true);
    }
  }, []);

  // Quiz Timer (only runs once the optional test has been started)
  useEffect(() => {
    if (step !== 5 || !testStarted) return;
    if (quizTimeLeft <= 0) {
      void handleSubmit(false);
      return;
    }
    const timer = setTimeout(() => setQuizTimeLeft(quizTimeLeft - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizTimeLeft, step, testStarted]);

  // Resolve the LeetCode username from either the username field or a pasted
  // profile URL (e.g. https://leetcode.com/u/name/ or leetcode.com/name).
  const resolveUsername = (): string => {
    if (lcUsername.trim()) return lcUsername.trim();
    const raw = lcProfileUrl.trim();
    if (!raw) return "";
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "u" && parts[1]) return parts[1];
      if (parts[0] && parts[0] !== "u") return parts[0];
      return "";
    } catch {
      return "";
    }
  };

  const handleNext = async () => {
    setError("");
    if (step === 1) {
      if (!fullName.trim() || !collegeName.trim()) {
        setError("Please fill in all fields.");
        return;
      }
    }
    if (step === 2) {
      if (!targetCompany.trim()) {
        setError("Please enter a target company.");
        return;
      }
    }
    if (step === 3 && !lcVerified) {
      // If the user typed a username/URL but hasn't tapped Connect, link it now
      // and advance automatically on success - smoother than blocking them.
      if (lcUsername.trim() || lcProfileUrl.trim()) {
        const ok = await verifyLeetcode();
        if (ok) setStep(4);
        return;
      }
      setError(
        "Your LeetCode account is required. Enter your username or profile URL to continue."
      );
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    // From the quiz, go back to the test choice rather than the previous step.
    if (step === 5 && testStarted) {
      setTestStarted(false);
      return;
    }
    setStep(step - 1);
  };

  const verifyLeetcode = async (): Promise<boolean> => {
    const uname = resolveUsername();
    if (!uname) {
      setError("Enter your LeetCode username or paste your profile URL.");
      return false;
    }
    setLcValidating(true);
    setError("");
    try {
      const res = await fetch("/api/leetcode/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname }),
      });
      const data = await res.json();
      if (data.success) {
        setLcUsername(uname);
        setLcVerified(true);
        return true;
      }
      setError(data.error || "LeetCode user not found. Please verify the spelling.");
      return false;
    } catch {
      setError("Failed to verify LeetCode account.");
      return false;
    } finally {
      setLcValidating(false);
    }
  };

  const handleSubmit = async (skipTest = false) => {
    setLoading(true);
    setError("");

    let correctCount = 0;
    if (!skipTest) {
      ASSESSMENT_QUESTIONS.forEach((q) => {
        if (quizAnswers[q.id] === q.correct) correctCount++;
      });
    }
    setQuizScore(correctCount);

    try {
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          collegeName,
          graduationYear: Number(graduationYear),
          targetCompany,
          timeline,
          lcUsername: lcVerified ? lcUsername.trim() : null,
          quizScore: correctCount,
          totalQuestions: ASSESSMENT_QUESTIONS.length,
          quizTaken: !skipTest,
          mentorName,
          mentorVibe,
          favoriteSeries,
          referralCode: referralCode.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (skipTest) {
          // Straight to the dashboard - hard nav so middleware sees fresh state.
          window.location.href = "/dashboard";
          return;
        }
        setResults(data);
        setStep(6);
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  const TOTAL_STEPS = 5;
  const progressPct = Math.round(((step - 1) / TOTAL_STEPS) * 100);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500/5 via-background to-cyan-500/5 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Progress bar strip */}
          {step < 6 && (
            <div className="h-1 bg-muted w-full">
              <div
                className="h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            {/* Header */}
            {step < 6 && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Logo width={32} height={32} />
                  <span className="font-black text-base tracking-wider text-foreground">LeetRun</span>
                </div>
                <span className="text-muted-foreground text-xs font-semibold bg-muted px-3 py-1 rounded-full">
                  Step {step} / {TOTAL_STEPS}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm rounded-xl">
                {error}
              </div>
            )}

            {/* ───────── STEP 1: Basic Info ───────── */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-1">Welcome aboard! <Hand className="w-6 h-6 text-indigo-500" /></h1>
                  <p className="text-muted-foreground text-sm">Let's start with a few basics to personalise your journey.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputCls}
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>College / University</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        list="colleges-list"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className={inputCls}
                        placeholder="Search or type your college"
                      />
                      <datalist id="colleges-list">
                        <option value="Bennett University" />
                        <option value="IIT Bombay" />
                        <option value="IIT Delhi" />
                        <option value="BITS Pilani" />
                        <option value="VIT Vellore" />
                        <option value="NIT Trichy" />
                        <option value="Delhi Technological University" />
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Graduation Year</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(Number(e.target.value))}
                        className={inputCls}
                        placeholder="2027"
                        min={2024}
                        max={2035}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Referral code (optional)</label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) =>
                          setReferralCode(e.target.value.toUpperCase().trim())
                        }
                        className={`${inputCls} uppercase tracking-wider`}
                        placeholder="Got an invite code? Enter it here"
                        maxLength={12}
                      />
                    </div>
                    {referralFromLink ? (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Invite applied - you and your friend both earn coins!
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        You&apos;ll both get 50 coins when you finish onboarding.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ───────── STEP 2: Goals ───────── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-1">Where are you headed? <Target className="w-6 h-6 text-red-500" /></h1>
                  <p className="text-muted-foreground text-sm">Define your placement target and timeline so we can focus your prep.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Dream Company</label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Google, Amazon, Flipkart"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Placement Timeline</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["3 months", "6 months", "12 months", "No deadline"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setTimeline(t)}
                          type="button"
                          className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                            timeline === t
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                              : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Favorite Series (Badge Theme)</label>
                    <select
                      value={favoriteSeries}
                      onChange={(e) => setFavoriteSeries(e.target.value)}
                      className="w-full bg-background border border-border focus:border-indigo-500 rounded-lg p-2.5 text-sm text-foreground outline-none transition-colors font-sans"
                    >
                      <option value="FROM">FROM</option>
                      <option value="STRANGER_THINGS">Stranger Things</option>
                      <option value="DARK">DARK</option>
                      <option value="NARUTO">Naruto</option>
                      <option value="LUFFY">Luffy / One Piece</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ───────── STEP 3: LeetCode (required) ───────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-1">Connect LeetCode <Link className="w-6 h-6 text-blue-500" /></h1>
                  <p className="text-muted-foreground text-sm">
                    Required - we sync your coding stats to calibrate your level.
                    Fill <strong className="text-foreground">either</strong> your
                    username or your profile URL.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>LeetCode Username</label>
                    <div className="relative">
                      <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={lcUsername}
                        disabled={lcVerified}
                        onChange={(e) => setLcUsername(e.target.value)}
                        className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="your-leetcode-username"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      or
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div>
                    <label className={labelCls}>LeetCode Profile URL</label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={lcProfileUrl}
                        disabled={lcVerified}
                        onChange={(e) => setLcProfileUrl(e.target.value)}
                        className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="https://leetcode.com/u/your-username/"
                      />
                    </div>
                  </div>

                  <button
                    onClick={verifyLeetcode}
                    disabled={
                      lcValidating ||
                      lcVerified ||
                      (!lcUsername.trim() && !lcProfileUrl.trim())
                    }
                    type="button"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {lcValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : lcVerified ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Connected
                      </>
                    ) : (
                      "Connect LeetCode"
                    )}
                  </button>

                  {lcVerified ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-2 text-sm font-medium">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" />
                      LeetCode <strong>@{lcUsername}</strong> verified and linked!
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 border border-border rounded-xl text-muted-foreground text-xs leading-relaxed">
                      <Lightbulb className="w-4 h-4 inline mr-1 text-yellow-500" /> Make sure your LeetCode profile is public. A LeetCode account is required to continue.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ───────── STEP 4: Mentor ───────── */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-1">Meet your AI Mentor <Bot className="w-6 h-6 text-indigo-500" /></h1>
                  <p className="text-muted-foreground text-sm">Customize the companion who will keep you accountable every day.</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Mentor Name</label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={mentorName}
                        onChange={(e) => setMentorName(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Buddy, Sensei, Placement Bro"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Mentor Personality</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "Friendly", icon: <Smile className="w-5 h-5 text-green-500" /> },
                        { v: "Strict", icon: <Dumbbell className="w-5 h-5 text-orange-500" /> },
                        { v: "Funny", icon: <Laugh className="w-5 h-5 text-yellow-500" /> },
                        { v: "Professional", icon: <Target className="w-5 h-5 text-blue-500" /> },
                      ].map(({ v, icon }) => (
                        <button
                          key={v}
                          onClick={() => setMentorVibe(v)}
                          type="button"
                          className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                            mentorVibe === v
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                              : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                          }`}
                        >
                          {icon} {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ───────── STEP 5: Optional revision test ───────── */}
            {step === 5 && !testStarted && (
              <div className="space-y-6 text-center">
                <div>
                  <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-pink-500" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    Quick revision test?
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                    Take an optional 5-question, 2-minute DSA check to calibrate
                    your level - or head straight to your dashboard. You can
                    always take it later.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTestStarted(true);
                      setQuizTimeLeft(120);
                    }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Brain className="w-4 h-4" /> Take the quick test
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="w-full py-3 border border-border hover:bg-muted text-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Setting up...
                      </>
                    ) : (
                      <>
                        Skip - go to dashboard <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ───────── STEP 5: Quiz (after choosing to take it) ───────── */}
            {step === 5 && testStarted && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-1">Quick Assessment <Brain className="w-6 h-6 text-pink-500" /></h1>
                    <p className="text-muted-foreground text-sm">5 DSA questions · 2 minutes</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border font-bold font-mono text-sm ${
                    quizTimeLeft <= 30
                      ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                      : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  }`}>
                    {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, "0")}
                  </div>
                </div>
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 -mr-1">
                  {ASSESSMENT_QUESTIONS.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                      <p className="font-semibold text-sm text-foreground leading-snug">
                        <span className="text-indigo-500 dark:text-indigo-400 font-bold mr-1">Q{idx + 1}.</span>
                        {q.text}
                      </p>
                      <div className="grid gap-2">
                        {q.options.map((opt, optIdx) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIdx })}
                            className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                              quizAnswers[q.id] === optIdx
                                ? "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                : "bg-background border-border text-muted-foreground hover:border-indigo-400 hover:text-foreground"
                            }`}
                          >
                            <span className="font-bold mr-2 text-muted-foreground">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ───────── STEP 6: Results ───────── */}
            {step === 6 && results && (
              <div className="space-y-6">
                {/* Celebration header */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="flex items-center gap-2 text-2xl font-black text-foreground mb-1">You're all set! <PartyPopper className="w-6 h-6 text-yellow-500" /></h1>
                  <p className="text-muted-foreground text-sm">
                    Your profile is built. Here's how you scored.
                  </p>
                </div>

                {/* XP Score */}
                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-2">
                    Starting XP Score
                  </p>
                  <div className="text-5xl font-black text-indigo-600 dark:text-indigo-300 mb-3">
                    {results.points || 0}
                    <span className="text-xl ml-1 font-bold">XP</span>
                  </div>
                  <div className="h-2 bg-indigo-200 dark:bg-indigo-950/50 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(((results.points || 0) / 1000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{results.points || 0} / 1000 XP to next milestone</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quiz Score</p>
                    </div>
                    <p className="text-2xl font-black text-foreground">
                      {quizScore}
                      <span className="text-base font-semibold text-muted-foreground"> / {ASSESSMENT_QUESTIONS.length}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">correct answers</p>
                  </div>
                  <div className="bg-muted/40 border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-4 h-4 text-indigo-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</p>
                    </div>
                    <p className="text-lg font-black text-foreground leading-tight">{targetCompany}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeline}</p>
                  </div>
                </div>

                {/* LeetCode badge */}
                {lcVerified && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-700/40 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                      LeetCode <strong>@{lcUsername}</strong> linked!
                    </p>
                  </div>
                )}

                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ───────── Footer Navigation ───────── */}
            {step < 6 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                {step > 1 ? (
                  <button
                    onClick={handleBack}
                    type="button"
                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {step <= 4 ? (
                  <button
                    onClick={handleNext}
                    type="button"
                    disabled={lcValidating}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    {lcValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Linking...
                      </>
                    ) : (
                      <>
                        Next <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : testStarted ? (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        Submit test <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  GraduationCap,
  Building,
  Target,
  Clock,
  Code,
  Brain,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
    correct: 2, // O(N) for skewed tree
  },
  {
    id: 2,
    text: "Which data structure is typically used to implement Breadth-First Search (BFS) on a graph?",
    options: ["Stack", "Queue", "Heap", "Hash Map"],
    correct: 1, // Queue
  },
  {
    id: 3,
    text: "Which algorithm design paradigm does the Coin Change problem commonly use for optimal solutions?",
    options: ["Greedy", "Divide and Conquer", "Dynamic Programming", "Backtracking"],
    correct: 2, // DP
  },
  {
    id: 4,
    text: "What is the space complexity of a recursive Depth-First Search (DFS) on a tree of height H?",
    options: ["O(1)", "O(H)", "O(N)", "O(H^2)"],
    correct: 1, // O(H) call stack
  },
  {
    id: 5,
    text: "If a sorting algorithm maintains the relative order of equal elements, it is said to be:",
    options: ["Stable", "Unstable", "In-place", "Optimal"],
    correct: 0, // Stable
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 2);

  const [targetCompany, setTargetCompany] = useState("");
  const [timeline, setTimeline] = useState("6 months");
  const [favoriteSeries, setFavoriteSeries] = useState("NARUTO");

  // Step 3: LeetCode Connect
  const [lcUsername, setLcUsername] = useState("");
  const [lcValidating, setLcValidating] = useState(false);
  const [lcVerified, setLcVerified] = useState(false);

  // Step 4: Assessment Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState(120); // 2 minutes

  // Step 5: AI Mentor Setup
  const [mentorName, setMentorName] = useState("Sensei");
  const [mentorVibe, setMentorVibe] = useState("Friendly");

  // Step 6: Results
  const [results, setResults] = useState<any>(null);

  // Quiz Timer Effect
  useEffect(() => {
    if (step !== 4) return;
    if (quizTimeLeft <= 0) {
      setStep(5);
      return;
    }
    const timer = setTimeout(() => setQuizTimeLeft(quizTimeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [quizTimeLeft, step]);

  const handleNext = () => {
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
    if (step === 3 && !lcVerified && lcUsername.trim()) {
      setError("Please connect and verify your LeetCode username first.");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const verifyLeetcode = async () => {
    if (!lcUsername.trim()) return;
    setLcValidating(true);
    setError("");
    try {
      const res = await fetch("/api/leetcode/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: lcUsername.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setLcVerified(true);
      } else {
        setError(data.error || "LeetCode user not found. Please verify spelling.");
      }
    } catch (err) {
      setError("Failed to verify LeetCode account.");
    } finally {
      setLcValidating(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    // Calculate score
    let correctCount = 0;
    ASSESSMENT_QUESTIONS.forEach((q) => {
      if (quizAnswers[q.id] === q.correct) {
        correctCount++;
      }
    });

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
          mentorName,
          mentorVibe,
          favoriteSeries,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setStep(6);
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during submission.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 transition-colors duration-150">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-lg bg-card/90 border border-border rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md relative z-10">
        {/* Progress header */}
        {step < 6 && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="font-bold text-lg tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                CODERUN
              </span>
            </div>
            <div className="text-muted-foreground text-xs font-semibold">
              Step {step} of 5
            </div>
          </div>
        )}

        {/* Errors */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800/50 text-red-200 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Welcome aboard! Let's start with the basics.</h1>
              <p className="text-muted-foreground text-sm">We'll customize your coding journey based on your details.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background border-border text-foreground placeholder-muted-foreground outline-none transition"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">College Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    list="colleges-list"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="w-full bg-background border-border text-foreground placeholder-muted-foreground outline-none transition"
                    placeholder="Search or enter college name"
                  />
                  <datalist id="colleges-list">
                    <option value="Bennett University" />
                    <option value="IIT Bombay" />
                    <option value="IIT Delhi" />
                    <option value="BITS Pilani" />
                    <option value="VIT Vellore" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Graduation Year</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(Number(e.target.value))}
                    className="w-full bg-background border-border text-foreground placeholder-muted-foreground outline-none transition"
                    placeholder="2028"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Goal Settings */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Where are we heading?</h1>
              <p className="text-muted-foreground text-sm">Define your placement target and timeline.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Target Company</label>
                <div className="relative">
                  <Target className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full bg-background border-border text-foreground placeholder-muted-foreground outline-none transition"
                    placeholder="e.g. Google, Microsoft, Meta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Placement Timeline</label>
                <div className="grid grid-cols-2 gap-3">
                  {["3 months", "6 months", "12 months", "No deadline"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeline(t)}
                      type="button"
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold transition ${
                        timeline === t
                          ? "bg-primary/20 border-primary text-foreground"
                          : "bg-slate-950/40 border-slate-800 text-muted-foreground hover:border-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Favorite Series (Character Badges Theme)</label>
                <select
                  value={favoriteSeries}
                  onChange={(e) => setFavoriteSeries(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 text-sm text-white outline-none transition"
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

        {/* STEP 3: LeetCode Connect */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Connect LeetCode Profile</h1>
              <p className="text-muted-foreground text-sm">
                We'll sync your coding statistics to customize your difficulty calibration.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">LeetCode Username</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Code className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={lcUsername}
                      disabled={lcVerified}
                      onChange={(e) => setLcUsername(e.target.value)}
                      className="w-full bg-background border-border text-foreground placeholder-muted-foreground outline-none transition disabled:opacity-50"
                      placeholder="username"
                    />
                  </div>
                  <button
                    onClick={verifyLeetcode}
                    disabled={lcValidating || lcVerified || !lcUsername.trim()}
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white px-4 rounded-lg font-semibold text-sm transition flex items-center gap-1.5"
                  >
                    {lcValidating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : lcVerified ? (
                      "Connected"
                    ) : (
                      "Connect"
                    )}
                  </button>
                </div>
              </div>

              {lcVerified ? (
                <div className="p-4 bg-emerald-950/40 border border-emerald-950 text-emerald-300 rounded-xl flex items-center gap-2 text-sm">
                  <CheckCircle className="w-5 h-5" /> Verified and linked Leetcode account successfully!
                </div>
              ) : (
                <div className="p-4 bg-slate-950/30 border border-slate-800/80 rounded-xl text-muted-foreground text-xs leading-relaxed">
                  Tip: Make sure your Leetcode profile is set to public. If you don't have one, you can proceed by clicking Next below.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Skill Assessment Quiz */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Quick Assessment</h1>
                <p className="text-muted-foreground text-sm">Let's check your DSA fundamentals.</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-amber-500 font-bold font-mono text-sm">
                {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, "0")}
              </div>
            </div>

            <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
              {ASSESSMENT_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="space-y-3 p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                  <p className="font-medium text-sm text-slate-200">
                    Q{idx + 1}. {q.text}
                  </p>
                  <div className="grid gap-2">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setQuizAnswers({
                            ...quizAnswers,
                            [q.id]: optIdx,
                          })
                        }
                        className={`text-left p-3 rounded-lg text-sm transition border ${
                          quizAnswers[q.id] === optIdx
                            ? "bg-primary/20 border-primary text-foreground"
                            : "bg-slate-900 border-slate-850 text-muted-foreground hover:border-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: AI Mentor Setup */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Assemble your AI Mentor</h1>
              <p className="text-muted-foreground text-sm">Choose the companion who will keep you accountable.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Mentor Name</label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    className="w-full bg-background border-border text-foreground placeholder-muted-foreground outline-none transition"
                    placeholder="Buddy / Sensei / Placement Bro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-medium mb-2">Mentor Personality & Vibe</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Friendly", "Strict", "Funny", "Professional"].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMentorVibe(v)}
                      type="button"
                      className={`py-3 px-4 rounded-xl border text-sm font-semibold transition ${
                        mentorVibe === v
                          ? "bg-primary/20 border-primary text-foreground"
                          : "bg-slate-950/40 border-slate-800 text-muted-foreground hover:border-slate-700"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Results View */}
        {step === 6 && results && (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
              <CardTitle className="text-3xl font-black text-white">Onboarding Complete!</CardTitle>
              <CardDescription className="text-muted-foreground">
                We've analyzed your profile and LeetCode stats to determine your starting position.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="p-6 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl">
                <div className="text-center">
                  <p className="text-sm text-indigo-300 font-bold uppercase tracking-wider mb-2">Universal Competency Score</p>
                  <div className="text-5xl font-black text-white mb-2">{results.points || 0} XP</div>
                  <Progress value={Math.min(((results.points || 0) / 1000) * 100, 100)} className="h-2 bg-indigo-950/50" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Assessment Score</p>
                  <p className="text-xl font-bold text-white">{quizAnswers ? Object.keys(quizAnswers).length : 0} / {ASSESSMENT_QUESTIONS.length}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Target Company</p>
                  <p className="text-xl font-bold text-white">{targetCompany}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-0 pt-4">
              <Button onClick={() => router.push("/dashboard")} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* FOOTER ACTIONS */}
        {step < 6 && (
          <div className="flex items-center justify-between mt-8 border-t border-slate-800/80 pt-6">
            {step > 1 ? (
              <button
                onClick={handleBack}
                type="button"
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                onClick={handleNext}
                type="button"
                className="bg-white text-slate-900 hover:bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-1.5"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                type="button"
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    Finish Onboarding <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

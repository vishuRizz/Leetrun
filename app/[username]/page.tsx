import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ensureUsername, findUserBySlug } from "@/lib/services/username";
import {
  Trophy,
  Flame,
  Award,
  CircleDollarSign,
  Target,
  GraduationCap,
  Bookmark,
  Languages,
  CheckCircle2,
  Sparkles,
  Crown,
  Medal,
  Activity,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import Logo from "@/components/Logo";

interface PublicProfile {
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  collegeName: string | null;
  targetCompany: string | null;
  plan: string;
  memberSince: string | Date;
  progression: {
    level: number;
    totalXp: number;
    xpIntoLevel: number;
    currentStreak: number;
    longestStreak: number;
  };
  stats: {
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    strongestTopic: string | null;
    weakestTopic: string | null;
    consistencyScore: number;
  } | null;
  leetcode: {
    username: string;
    ranking: number | null;
    contestRating: number | null;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    acceptanceRate: number | null;
    syncedAt: string | Date | null;
    languageStats: { id: string; language: string; solved: number }[];
    submissions: {
      id: string;
      title: string;
      slug: string;
      difficulty: string;
      topic: string | null;
      submittedAt: string | Date;
    }[];
  } | null;
  badges: {
    id: string;
    unlockedAt: string | Date;
    badge: { title: string; description: string; icon: string; type: string };
  }[];
}

async function loadProfile(rawSlug: string): Promise<PublicProfile | null> {
  const slug = decodeURIComponent(rawSlug).toLowerCase();
  if (!slug) return null;

  const user = await findUserBySlug(slug);
  if (!user) return null;

  const username = await ensureUsername({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
  });

  const [stats, leetcode, badges] = await Promise.all([
    db.userStats.findUnique({ where: { userId: user.id } }),
    db.leetcodeProfile.findUnique({
      where: { userId: user.id },
      include: {
        languageStats: { orderBy: { solved: "desc" } },
        submissions: { orderBy: { submittedAt: "desc" }, take: 10 },
      },
    }),
    db.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { unlockedAt: "desc" },
    }),
  ]);

  const totalSolved =
    stats?.totalSolved ??
    leetcode?.totalSolved ??
    (leetcode
      ? (leetcode.easySolved ?? 0) +
        (leetcode.mediumSolved ?? 0) +
        (leetcode.hardSolved ?? 0)
      : 0);

  return {
    username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    collegeName: user.collegeName,
    targetCompany: user.targetCompany,
    plan: user.plan,
    memberSince: user.createdAt,
    progression: {
      level: Math.floor((user.totalXp || 0) / 100) + 1,
      totalXp: user.totalXp || 0,
      xpIntoLevel: (user.totalXp || 0) % 100,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
    },
    stats: stats
      ? {
          totalSolved,
          easySolved: stats.easySolved ?? leetcode?.easySolved ?? 0,
          mediumSolved: stats.mediumSolved ?? leetcode?.mediumSolved ?? 0,
          hardSolved: stats.hardSolved ?? leetcode?.hardSolved ?? 0,
          strongestTopic: stats.strongestTopic,
          weakestTopic: stats.weakestTopic,
          consistencyScore: stats.consistencyScore ?? 0,
        }
      : null,
    leetcode: leetcode
      ? {
          username: leetcode.username,
          ranking: leetcode.ranking,
          contestRating: leetcode.contestRating,
          totalSolved: leetcode.totalSolved,
          easySolved: leetcode.easySolved,
          mediumSolved: leetcode.mediumSolved,
          hardSolved: leetcode.hardSolved,
          acceptanceRate: leetcode.acceptanceRate,
          syncedAt: leetcode.syncedAt,
          languageStats: leetcode.languageStats.map((l) => ({
            id: l.id,
            language: l.language,
            solved: l.solved,
          })),
          submissions: leetcode.submissions.map((s) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            difficulty: s.difficulty,
            topic: s.topic,
            submittedAt: s.submittedAt,
          })),
        }
      : null,
    badges: badges.map((b) => ({
      id: b.id,
      unlockedAt: b.unlockedAt,
      badge: {
        title: b.badge.title,
        description: b.badge.description,
        icon: b.badge.icon,
        type: b.badge.type,
      },
    })),
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) {
    return { title: "Profile not found · LeetRun" };
  }
  const name = profile.fullName || profile.username;
  return {
    title: `${name} (@${profile.username}) · LeetRun`,
    description: `${name}'s public LeetRun profile — ${profile.progression.totalXp} XP, ${profile.progression.currentStreak}-day streak, ${profile.stats?.totalSolved ?? 0} problems solved.`,
    openGraph: {
      title: `${name} on LeetRun`,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl }] : undefined,
    },
  };
}

export default async function PublicProfilePage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const easyPct =
    profile.stats && profile.stats.totalSolved > 0
      ? (profile.stats.easySolved / profile.stats.totalSolved) * 100
      : 0;
  const mediumPct =
    profile.stats && profile.stats.totalSolved > 0
      ? (profile.stats.mediumSolved / profile.stats.totalSolved) * 100
      : 0;
  const hardPct =
    profile.stats && profile.stats.totalSolved > 0
      ? (profile.stats.hardSolved / profile.stats.totalSolved) * 100
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <Logo width={24} height={24} />
          <span className="font-extrabold text-base text-foreground">LeetRun</span>
        </Link>
        <Link
          href="/leaderboard"
          className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Leaderboard
        </Link>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <section className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
            <UserAvatar
              url={profile.avatarUrl}
              name={profile.fullName}
              email={profile.username}
              size={88}
              rounded="lg"
              className="shadow-lg shadow-indigo-600/5"
            />

            <div className="text-center md:text-left space-y-1.5">
              <h2 className="text-2xl font-black text-foreground">
                {profile.fullName || profile.username}
              </h2>
              <p className="text-muted-foreground text-xs flex items-center justify-center md:justify-start gap-1">
                <Bookmark className="w-3.5 h-3.5" />@{profile.username}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-2">
                {profile.collegeName && (
                  <span className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-[10px] font-bold text-foreground border border-border">
                    <GraduationCap className="w-3 h-3 text-indigo-500" /> {profile.collegeName}
                  </span>
                )}
                {profile.targetCompany && (
                  <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                    <Target className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Target: {profile.targetCompany}
                  </span>
                )}
                {profile.plan === "PREMIUM" && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase border bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20">
                    <span className="flex items-center gap-1.5"><Crown className="w-4 h-4" /> PREMIUM</span>
                  </span>
                )}
                <span className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-[10px] font-bold text-muted-foreground border border-border">
                  <Calendar className="w-3 h-3" /> Member since{" "}
                  {new Date(profile.memberSince).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <Flame className="w-5 h-5 text-orange-500 fill-current mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">{profile.progression.currentStreak}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Streak</div>
            </div>
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <Award className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">Lv. {profile.progression.level}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{profile.progression.totalXp} XP</div>
            </div>
            <div className="bg-muted border border-border px-4 py-3 rounded-2xl text-center min-w-24">
              <CircleDollarSign className="w-5 h-5 text-yellow-500 mx-auto mb-1.5" />
              <div className="text-lg font-black text-foreground">{profile.progression.longestStreak}</div>
              <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Best</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Solved breakdown */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Trophy className="w-4 h-4 text-indigo-500" /> Solved Breakdown
            </h3>

            <div className="flex items-center justify-around">
              {profile.leetcode ? (
                <div className="text-center space-y-1.5">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">LeetCode</div>
                  <a
                    href={`https://leetcode.com/u/${profile.leetcode.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-foreground hover:underline"
                  >
                    @{profile.leetcode.username}
                  </a>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Ranking:{" "}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      #{profile.leetcode.ranking ?? "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs py-4 text-center">
                  LeetCode profile not connected.
                </div>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <Bar label="Easy" colorClass="bg-emerald-500" labelClass="text-emerald-600 dark:text-emerald-400" value={profile.stats?.easySolved ?? 0} pct={easyPct} />
              <Bar label="Medium" colorClass="bg-yellow-500" labelClass="text-yellow-600 dark:text-yellow-500" value={profile.stats?.mediumSolved ?? 0} pct={mediumPct} />
              <Bar label="Hard" colorClass="bg-rose-500" labelClass="text-rose-600 dark:text-rose-500" value={profile.stats?.hardSolved ?? 0} pct={hardPct} />
            </div>

            {profile.leetcode?.acceptanceRate != null && (
              <div className="bg-muted p-4 border border-border rounded-xl flex items-center justify-between text-xs">
                <span className="text-muted-foreground">LeetCode Acceptance Rate</span>
                <span className="font-bold text-foreground">
                  {profile.leetcode.acceptanceRate.toFixed(1)}%
                </span>
              </div>
            )}
          </section>

          {/* Languages */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Languages className="w-4 h-4 text-indigo-500" /> Language Distribution
            </h3>
            {!profile.leetcode?.languageStats?.length ? (
              <p className="text-muted-foreground text-xs py-8 text-center">No language stats available.</p>
            ) : (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {profile.leetcode.languageStats.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{item.language}</span>
                    <span className="font-semibold bg-muted px-2.5 py-1 border border-border rounded text-foreground">
                      {item.solved} solved
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Badges */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Earned Badges
            </h3>
            {profile.badges.length === 0 ? (
              <p className="text-muted-foreground text-xs py-10 text-center">
                No badges unlocked yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 max-h-64 overflow-y-auto pr-1">
                {profile.badges.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-muted border border-border rounded-xl text-center space-y-1.5 flex flex-col items-center justify-center"
                  >
                    <span className="text-indigo-500">
                      {b.badge.icon ? (
                        <span className="text-2xl">{b.badge.icon}</span>
                      ) : (
                        <Medal className="w-8 h-8" />
                      )}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-[11px] text-foreground leading-tight">{b.badge.title}</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{b.badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Topic insight + Activity glance */}
        {(profile.stats?.strongestTopic || profile.stats?.weakestTopic) && (
          <section className="bg-card border border-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Insight
              icon={<Sparkles className="w-4 h-4 text-emerald-500" />}
              title="Strongest topic"
              value={profile.stats?.strongestTopic || "—"}
            />
            <Insight
              icon={<Activity className="w-4 h-4 text-rose-500" />}
              title="Focus area"
              value={profile.stats?.weakestTopic || "—"}
            />
          </section>
        )}

        {/* Recent LeetCode submissions */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Recent LeetCode Submissions
          </h3>
          {!profile.leetcode?.submissions?.length ? (
            <p className="text-muted-foreground text-xs py-8 text-center">
              No recent submissions synced yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 font-bold uppercase tracking-wider">Problem</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Topic</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider">Difficulty</th>
                    <th className="py-2.5 font-bold uppercase tracking-wider text-right">Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profile.leetcode.submissions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="py-3 font-bold text-foreground">
                        <a
                          href={`https://leetcode.com/problems/${sub.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {sub.title}
                        </a>
                      </td>
                      <td className="py-3">
                        <span className="bg-muted px-2 py-0.5 border border-border rounded text-muted-foreground font-semibold">
                          {sub.topic || "General"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-semibold ${
                            sub.difficulty === "HARD"
                              ? "text-rose-600 dark:text-rose-400"
                              : sub.difficulty === "MEDIUM"
                              ? "text-yellow-600 dark:text-yellow-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {sub.difficulty}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Bar({
  label,
  value,
  pct,
  colorClass,
  labelClass,
}: {
  label: string;
  value: number;
  pct: number;
  colorClass: string;
  labelClass: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className={labelClass}>{label} Solved</span>
        <span className="text-foreground">{value}</span>
      </div>
      <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border">
        <div className={`${colorClass} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Insight({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
        {icon} {title}
      </div>
      <div className="mt-1.5 text-base font-black text-foreground">{value}</div>
    </div>
  );
}

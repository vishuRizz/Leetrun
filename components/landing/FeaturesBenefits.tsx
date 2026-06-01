import React from 'react';
import { Flame, Trophy, Users, Zap, Target, Brain, Shield, Clock } from 'lucide-react';

export default function FeaturesBenefits() {
  return (
    <div id="features" className="bg-gray-50 dark:bg-[#0a0a0a] min-h-screen text-[#1a1b23] dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Mobile Header Section */}
        <div className="block lg:hidden mb-8">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Why LeetRun?</p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight text-[#1a1b23] dark:text-white">
            Placement Excellence<br />
            Starts Here.
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
            LeetRun is not just another DSA tracker. It is your gamified placement partner. From daily challenges to AI roasts,
            LeetRun adapts to your weak spots and keeps you accountable every single day.
          </p>

          {/* Mobile Hero Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white dark:bg-[#141414] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800 text-center">
              <Flame className="w-12 h-12 mx-auto mb-3 text-orange-500" />
              <h3 className="text-sm font-bold mb-2 dark:text-white">Streak Tracking</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Never break your daily streak</p>
            </div>
            <div className="bg-white dark:bg-[#141414] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800 text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 text-indigo-500" />
              <h3 className="text-sm font-bold mb-2 dark:text-white">AI Mentor</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Gets savage when you slack off</p>
            </div>
          </div>
        </div>

        {/* Desktop Header Section */}
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left — headline */}
          <div className="lg:col-span-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Why LeetRun?</p>
            <h1 className="text-4xl font-bold mb-6 leading-tight text-[#1a1b23] dark:text-white">
              Placement Excellence<br />
              Starts Here.
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              LeetRun is not just another DSA tracker. It is your gamified placement partner. From daily challenges to AI roasts,
              LeetRun adapts to your weak spots and keeps you accountable every single day.
            </p>
          </div>

          {/* Middle Card */}
          <div className="bg-white dark:bg-[#141414] rounded-xl p-8 shadow-sm border-2 border-gray-300 dark:border-gray-800">
            <h3 className="text-2xl font-bold mb-4 text-[#1a1b23] dark:text-white">
              Savage AI Mentor
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              Your AI mentor doesn't coddle you. Low solve count? Broken streak? It will roast you into getting back on track — Gigachad energy included.
            </p>
            <div className="flex justify-center">
              <Brain className="w-24 h-24 text-indigo-500" />
            </div>
          </div>

          {/* Right Card */}
          <div className="bg-white dark:bg-[#141414] rounded-xl p-8 shadow-sm border-2 border-gray-300 dark:border-gray-800">
            <div className="flex justify-center pb-8">
              <Flame className="w-24 h-24 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#1a1b23] dark:text-white">
              Daily + Weekly Quests
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Custom-generated daily, weekly and revision challenges auto-synced with your LeetCode profile and weak areas.
            </p>
          </div>
        </div>

        {/* Desktop Benefits Grid */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {[
            {
              icon: <Shield className="w-10 h-10 text-[#1a1b23] dark:text-gray-200" />,
              title: 'LeetCode Sync',
              desc: 'Auto-sync your LeetCode profile stats, recent submissions, and solve counts — always up to date.'
            },
            {
              icon: <Trophy className="w-10 h-10 text-[#1a1b23] dark:text-gray-200" />,
              title: 'Live Leaderboard',
              desc: 'Compete with friends in real-time XP rankings. Climb the global and private leaderboards.'
            },
            {
              icon: <Zap className="w-10 h-10 text-[#1a1b23] dark:text-gray-200" />,
              title: 'XP & Coin Rewards',
              desc: 'Earn XP and coins for solving problems, maintaining streaks, and completing daily quests.'
            },
          ].map((f) => (
            <div key={f.title} className="bg-white dark:bg-[#141414] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-md dark:hover:border-gray-700 transition-shadow">
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold mb-3 text-[#1a1b23] dark:text-white">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Mobile Key Features Horizontal Scroll */}
        <div className="block sm:hidden mb-8">
          <h2 className="text-xl font-bold mb-4 text-[#1a1b23] dark:text-white">Key Features</h2>
          <div className="flex overflow-x-auto space-x-4 pb-4">
            {[
              { icon: <Shield className="w-8 h-8 text-[#1a1b23] dark:text-gray-200" />, title: 'LeetCode Sync', desc: 'Auto-sync your stats' },
              { icon: <Trophy className="w-8 h-8 text-[#1a1b23] dark:text-gray-200" />, title: 'Leaderboard', desc: 'Compete with friends' },
              { icon: <Zap className="w-8 h-8 text-[#1a1b23] dark:text-gray-200" />, title: 'XP Rewards', desc: 'Earn for solving problems' },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-[#141414] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800 flex-shrink-0 w-64">
                <div className="mb-3">{f.icon}</div>
                <h3 className="text-base font-bold mb-2 dark:text-white">{f.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Large Feature Cards */}
        <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="rounded-xl p-6 shadow-sm border border-gray-800 bg-[#1a1b23] dark:bg-[#141414] text-white hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold mb-3">
              Multiplayer Coding Rooms,<br />
              Made Fun.
            </h3>
            <p className="text-gray-300 leading-relaxed mb-4 text-sm">
              Create private rooms, invite friends, and race through DSA problems in real-time. First to solve wins bragging rights.
            </p>
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-indigo-400" />
              <div className="text-xs text-gray-400">Real-time multiplayer challenges</div>
            </div>
          </div>

          <div className="rounded-xl p-6 shadow-sm border border-gray-800 bg-[#1a1b23] dark:bg-[#141414] text-white hover:shadow-md transition-shadow">
            <h3 className="text-xl font-bold mb-3">
              Personalized Placement<br />
              Intelligence.
            </h3>
            <p className="text-gray-300 leading-relaxed mb-4 text-sm">
              LeetRun tracks your weakest topics, strongest algorithms, and target company patterns to generate hyper-personalized quests.
            </p>
            <div className="flex items-center space-x-3">
              <Target className="w-6 h-6 text-indigo-400" />
              <Clock className="w-6 h-6 text-indigo-400" />
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Desktop Bottom Grid */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#141414] rounded-xl p-6 border border-transparent dark:border-gray-800">
            <h3 className="text-lg font-bold mb-3 text-[#1a1b23] dark:text-white">
              Series-Themed<br />Mentorship.
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Choose your vibe — Naruto, One Piece, or Stranger Things. Your AI mentor channels their wisdom to keep you coding.
            </p>
            <div className="p-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Mentor Themes</div>
              <div className="space-y-1">
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded w-3/4"></div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141414] rounded-xl p-6 text-center border border-transparent dark:border-gray-800">
            <div className="mb-4">
              <Trophy className="w-10 h-10 mx-auto text-[#1a1b23] dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-[#1a1b23] dark:text-white">
              Badges &<br />Achievements.
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Unlock badges for streaks, milestones, and rare problem completions. Show off your grind.
            </p>
          </div>

          <div className="bg-white dark:bg-[#141414] rounded-xl p-6 border border-transparent dark:border-gray-800">
            <h3 className="text-lg font-bold mb-3 text-[#1a1b23] dark:text-white">
              Friend Invites &<br />Social Prep.
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Invite friends, challenge them to rooms, or send placement battle invites. DSA is better together.
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-8 bg-indigo-100 dark:bg-indigo-900 rounded border-l-4 border-indigo-600"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Friends & Leaderboards</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

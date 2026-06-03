"use client";
import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What exactly is LeetRun, and how does it work?",
    answer: "LeetRun is a gamified DSA placement platform built around curated sheets (Blind 75, NeetCode 150, Striver's SDE & A2Z, company sets), interview patterns ranked by weightage, and adaptive quests. It syncs with your LeetCode profile and an AI mentor keeps you accountable - harshly if needed."
  },
  {
    question: "Which DSA sheets and question banks are included?",
    answer: "Blind 75, NeetCode 150, Striver's SDE Sheet, Striver's A2Z, Love Babbar 450, and company-specific sets like Google and Amazon Top 100. You can pin focus sheets, track every problem, and your progress is saved automatically."
  },
  {
    question: "What is Deep LeetCode Sync?",
    answer: "Deep Sync imports your entire LeetCode solve history - every accepted problem, not just recent ones - and automatically checks them off across all of your sheets. It also powers accurate quest verification so you never have to manually mark what you've already done."
  },
  {
    question: "How do interview patterns and configurable revision work?",
    answer: "The Patterns page ranks the patterns interviewers ask most (DP, Graphs, Two Pointers, Sliding Window, and more) by weightage, then lets you drill into pattern-wise questions. Revision lets you generate a random practice set filtered by topic, difficulty, and whether you've already solved it."
  },
  {
    question: "Does LeetRun require a LeetCode Premium account?",
    answer: "No. LeetRun works with any public LeetCode account - connect your username during onboarding and we sync your stats, submissions, and solve counts. Deep Sync is an optional one-time step that imports your full solve history."
  },
  {
    question: "How is XP and the leaderboard calculated?",
    answer: "XP comes from your LeetCode solve counts (Easy = 15, Medium = 40, Hard = 120), streaks, contest ratings, and completed quests. Leaderboards update in real time and can be ranked by XP, LeetRun level, current streak, solved counts, or contest rating."
  },
];

const leftColumnFAQs = faqData.slice(0, 3);
const rightColumnFAQs = faqData.slice(3, 6);

export default function FAQSection() {
  const [openItem, setOpenItem] = useState<number>(-1);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenItem(openItem === index ? -1 : index);
  };

  const renderFAQColumn = (faqs: FAQItem[], startIndex: number) => (
    <div className="space-y-6">
      {faqs.map((item: FAQItem, relativeIndex: number) => {
        const actualIndex: number = startIndex + relativeIndex;
        const isOpen = openItem === actualIndex;
        const isHovered = hoveredItem === actualIndex;
        return (
          <div
            key={actualIndex}
            className={`relative transition-all duration-500 ease-out ${
              isOpen ? "scale-[1.02] z-10" : "scale-100 z-[1]"
            }`}
            onMouseEnter={() => setHoveredItem(actualIndex)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => toggleItem(actualIndex)}
          >
            <div
              className={`
                rounded-2xl border-2 overflow-hidden cursor-pointer
                transition-all duration-500 ease-out
                min-h-[90px] flex flex-col
                ${isOpen
                  ? "bg-[#1a1b23] border-[#1a1b23] shadow-2xl shadow-black/40"
                  : isHovered
                    ? "bg-white dark:bg-[#141414] border-gray-300 dark:border-gray-600 shadow-lg shadow-black/10"
                    : "bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md dark:hover:border-gray-700"
                }
              `}
            >
              {/* Question Header */}
              <div className="px-6 py-5 flex items-center justify-between flex-shrink-0">
                <h3
                  className={`
                    text-lg font-semibold pr-4 leading-tight
                    transition-colors duration-300
                    ${isOpen ? "text-white" : "text-gray-900 dark:text-gray-100"}
                  `}
                >
                  {item.question}
                </h3>
                <div
                  className={`flex-shrink-0 transition-all duration-500 ease-out ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  <div
                    className={`relative w-6 h-6 transition-all duration-500 ease-out ${
                      isOpen ? "scale-110" : "scale-100"
                    }`}
                  >
                    <Plus
                      className={`
                        absolute inset-0 w-6 h-6 transition-all duration-500 ease-out
                        ${isOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0"}
                        ${isOpen
                          ? "text-white"
                          : isHovered
                            ? "text-[#1a1b23] dark:text-gray-200"
                            : "text-gray-500 dark:text-gray-400"
                        }
                      `}
                    />
                    <Minus
                      className={`
                        absolute inset-0 w-6 h-6 transition-all duration-500 ease-out
                        ${isOpen ? "opacity-100 rotate-0 text-white" : "opacity-0 rotate-90 text-gray-500"}
                      `}
                    />
                  </div>
                </div>
              </div>

              {/* Answer Content */}
              <div
                className="overflow-hidden transition-all duration-500 ease-out"
                style={{
                  maxHeight: isOpen ? "300px" : "0px",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div
                  className={`px-6 pb-6 leading-relaxed text-sm transition-all duration-400 ease-out ${
                    isOpen
                      ? "text-gray-300 translate-y-0"
                      : "text-gray-600 dark:text-gray-400 -translate-y-5"
                  }`}
                >
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div id="FAQs" className="bg-gray-50 dark:bg-[#0a0a0a] min-h-screen py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Frequently Asked Questions</p>
          <h2 className="text-4xl font-bold mb-4 leading-tight text-[#1a1b23] dark:text-white">
            Still Curious?<br />
            We Got Answers.
          </h2>
        </div>

        {/* FAQ Grid - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>{renderFAQColumn(leftColumnFAQs, 0)}</div>
          <div>{renderFAQColumn(rightColumnFAQs, 3)}</div>
        </div>
      </div>
    </div>
  );
}

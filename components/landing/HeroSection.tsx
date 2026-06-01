'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/components/Logo';

export default function HeroSection() {
  const router = useRouter();
  return (
    <div className="relative flex flex-col items-center justify-center bg-[#fafbfa] dark:bg-black text-black dark:text-white overflow-hidden min-h-[70vh] max-sm:min-h-[60vh]">
      {/* Wavy background pattern — identical to ai-paper */}
      <div className="absolute inset-0 w-full h-full z-0">
        <svg
          className="w-full h-full opacity-8"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="leetrunPatternId"
              patternUnits="userSpaceOnUse"
              width="80"
              height="40"
              patternTransform="scale(6.444444444444445) rotate(135)"
            >
              <rect x="0" y="0" width="100%" height="100%" fill="transparent" />
              <path
                d="M-20.133 4.568C-13.178 4.932-6.452 7.376 0 10c6.452 2.624 13.036 5.072 20 5 6.967-.072 13.56-2.341 20-5 6.44-2.659 13.033-4.928 20-5 6.964-.072 13.548 2.376 20 5s13.178 5.068 20.133 5.432"
                strokeWidth="1"
                className="stroke-[#e3e3e3] dark:stroke-gray-800"
                fill="none"
              />
              <path
                d="M-20.133 24.568C-13.178 24.932-6.452 27.376 0 30c6.452 2.624 13.036 5.072 20 5 6.967-.072 13.56-2.341 20-5 6.44-2.659 13.033-4.928 20-5 6.964-.072 13.548 2.376 20 5s13.178 5.068 20.133 5.432"
                strokeWidth="1"
                className="stroke-[#666666] dark:stroke-gray-600"
                fill="none"
              />
            </pattern>

            <mask id="leetrunFadeMask">
              <linearGradient id="leetrunFadeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="70%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <rect width="100%" height="100%" fill="url(#leetrunFadeGradient)" />
            </mask>
          </defs>

          <rect
            width="800%"
            height="800%"
            transform="translate(0,0)"
            fill="url(#leetrunPatternId)"
            mask="url(#leetrunFadeMask)"
          />
        </svg>
      </div>

      <main className="z-10 px-4 mt-24 text-center max-w-4xl mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10 max-sm:mb-4"
        >
          {/* Logo badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white border border-gray-200 dark:bg-[#141414] dark:border-gray-800 shadow-sm"
          >
            <Logo width={20} height={20} />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">LeetRun — DSA Placement Prep</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-6xl max-sm:text-4xl font-medium mb-8 tracking-tight"
          >
            Meet the new home<br />for your Placement Prep
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10"
          >
            Compete with friends, get roasted by your AI mentor,<br />
            and crack your dream company with LeetRun.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => router.push('/signup')}
              className="px-6 py-3 bg-[#1a1b23] dark:bg-white text-white dark:text-black cursor-pointer font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-transparent cursor-pointer text-black dark:text-white font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-[#141414] transition-colors"
            >
              Sign In
            </button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

"use client";
import React, { useState } from 'react';
import { Check, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();

  const plans = [
    {
      name: 'Free',
      price: isAnnual ? '₹0' : '₹0',
      billing: 'Forever free - no credit card needed',
      description: 'Perfect to get started',
      features: [
        'LeetCode profile sync',
        'Daily quest generation',
        'Basic leaderboard',
        'AI mentor (standard)',
        '1 multiplayer room',
      ],
      buttonText: 'Get started for free',
      buttonVariant: 'outline',
      isPopular: false,
      isDark: false,
    },
    {
      name: 'Pro',
      price: isAnnual ? '₹199' : '₹299',
      billing: isAnnual ? 'Per month, billed annually' : 'Per month, billed monthly',
      description: 'For serious placement prep',
      features: [
        'Everything in Free',
        'Weekly + revision quests',
        'Savage AI mentor mode',
        'Unlimited multiplayer rooms',
        'XP & badge rewards',
        'Friend invite system',
      ],
      buttonText: 'Start Pro',
      buttonVariant: 'default',
      isPopular: true,
      isDark: false,
    },
    {
      name: 'Team',
      price: 'Custom',
      billing: 'For college groups & cohorts',
      description: 'For study groups',
      features: [
        'Everything in Pro',
        'Up to 20 members',
        'Shared leaderboard',
        'Custom company prep tracks',
        'Priority support',
        'Admin analytics',
      ],
      buttonText: 'Contact us',
      buttonVariant: 'secondary',
      isPopular: false,
      isDark: true,
    },
  ];

  return (
    <div id="pricing" className="min-h-screen bg-white dark:bg-[#0a0a0a] py-16 px-4 relative overflow-hidden">
      {/* Background dot pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle,#000_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(circle,#fff_0.5px,transparent_0.5px)] bg-[length:24px_24px]"
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Plans and Pricing
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8">
            Choose your plan and start your placement journey today.<br />
            Upgrade anytime as your ambition grows.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 mb-12">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isAnnual
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isAnnual
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Annual
              <span className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold">
                Save 33%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative transition-all duration-300 hover:scale-[1.02] border-0 shadow-lg ${
                plan.isDark
                  ? "text-white shadow-2xl bg-[#1a1b23] dark:bg-[#141414] dark:border dark:border-gray-800"
                  : "bg-white dark:bg-[#141414] dark:border dark:border-gray-800 shadow-md"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 text-sm font-medium rounded-full flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Popular
                  </span>
                </div>
              )}

              <CardContent className="p-8">
                <h3 className={`text-2xl font-bold mb-2 ${plan.isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {plan.name}
                </h3>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold ${plan.isDark ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {plan.price}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${plan.isDark ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                    {plan.billing}
                  </p>
                </div>

                <p className={`text-lg mb-8 ${plan.isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {plan.description}
                </p>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.isDark ? 'bg-gray-600' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Check className={`w-3 h-3 ${plan.isDark ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                      </div>
                      <span className={`text-sm ${plan.isDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => router.push(plan.name === 'Team' ? '/contact' : '/signup')}
                  className={`w-full py-3 text-sm font-medium transition-all ${
                    plan.isDark
                      ? 'bg-white text-gray-900 hover:bg-gray-100'
                      : plan.isPopular
                      ? 'bg-gray-900 dark:bg-indigo-600 text-white hover:bg-gray-800 dark:hover:bg-indigo-500 shadow-md'
                      : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm dark:bg-gray-800 dark:text-white dark:border-gray-700'
                  }`}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-16">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            All plans include LeetCode sync, AI mentor, and daily quest generation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;

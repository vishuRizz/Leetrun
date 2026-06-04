"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';

const LandingFooter = () => {
  return (
    <footer className="bg-[#1a1b23] text-white py-12 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Logo and Tagline */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Logo width={28} height={28} variant="dark" />
              <span className="text-2xl font-bold">LeetRun</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your gamified DSA preparation platform. Crack placements faster with AI-powered mentoring, quests, and competitive coding rooms.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a>
              </li>
              <li>
                <a href="#FAQs" className="text-gray-400 hover:text-white transition-colors text-sm">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Sign In</Link>
              </li>
              <li>
                <Link href="/signup" className="text-gray-400 hover:text-white transition-colors text-sm">Sign Up</Link>
              </li>
              <li>
                <Link href="/forgot-password" className="text-gray-400 hover:text-white transition-colors text-sm">Reset Password</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Stay in the loop</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get placement tips, DSA strategies, and LeetRun updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="you@example.com"
                className="bg-[#2a2b36] border-0 text-white placeholder:text-gray-500"
              />
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Large Brand Name */}
        <div className="my-12">
          <h1 className="text-white text-6xl md:text-8xl font-bold tracking-tight opacity-10 select-none">
            LeetRun 2025
          </h1>
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 pt-8">
          <div className="text-gray-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} LeetRun. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:vishurizz0@gmail.com" className="hover:text-white transition-colors">vishurizz0@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;

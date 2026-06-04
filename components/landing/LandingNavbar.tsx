'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

export default function LandingNavbar() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reflect auth state so logged-in visitors see "Dashboard" instead of "Sign In".
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (active) setIsAuthed(!!user);
      })
      .catch(() => {
        if (active) setIsAuthed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Sheets', href: '/sheets' },
    { label: 'Patterns', href: '/patterns' },
    { label: 'Analytics', href: '/analytics' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const renderNavLink = (
    link: { label: string; href: string },
    className: string,
    onClick?: () => void
  ) =>
    link.href.startsWith('#') ? (
      <a key={link.label} href={link.href} onClick={onClick} className={className}>
        {link.label}
      </a>
    ) : (
      <Link key={link.label} href={link.href} onClick={onClick} className={className}>
        {link.label}
      </Link>
    );

  return (
    <>
      <div className="fixed top-0 left-0 right-0 flex justify-center w-full py-4 z-50">
        <nav
          className={`flex items-center justify-between bg-[#1a1b23] shadow-lg rounded-full px-6 py-3 transition-all duration-400 ${
            isScrolled ? 'shadow-2xl' : ''
          }`}
          style={{
            minWidth: 'min(820px, 92vw)',
            transform: isScrolled ? 'scale(0.97)' : 'scale(1)',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer mr-6 lg:mr-10"
            onClick={() => router.push('/')}
          >
            <Logo width={24} height={24} variant="dark" />
            <span className="text-white font-bold text-lg tracking-wide">LeetRun</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) =>
              renderNavLink(
                link,
                'text-white hover:text-gray-300 transition-colors font-medium text-sm py-2'
              )
            )}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthed ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white cursor-pointer text-black font-medium hover:bg-gray-100 transition-all px-5 py-2 rounded-full text-sm"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="text-white hover:text-gray-300 transition-colors font-medium text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/signup')}
                  className="bg-white cursor-pointer text-black font-medium hover:bg-gray-100 transition-all px-5 py-2 rounded-full text-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </div>

      {/* Mobile menu dropdown */}
      {isMobileMenuOpen && (
        <div className="fixed top-20 left-4 right-4 z-50 md:hidden">
          <div className="bg-[#1a1b23] rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-4 space-y-1">
              {navLinks.map((link) =>
                renderNavLink(
                  link,
                  'block px-4 py-3 text-white hover:bg-white/10 rounded-xl font-medium text-sm transition-colors',
                  () => setIsMobileMenuOpen(false)
                )
              )}
              <div className="pt-3 pb-1 border-t border-gray-700 mt-3 flex flex-col gap-2">
                {isAuthed ? (
                  <button
                    onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-2.5 bg-white text-black rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }}
                      className="w-full px-4 py-2.5 text-white hover:bg-white/10 rounded-xl font-medium text-sm transition-colors text-left"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { router.push('/signup'); setIsMobileMenuOpen(false); }}
                      className="w-full px-4 py-2.5 bg-white text-black rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors"
                    >
                      Get Started Free
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

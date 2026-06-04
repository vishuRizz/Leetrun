import type { Metadata } from "next";
import FAQSection from "@/components/landing/FAQSection";
import FeaturesBenefits from "@/components/landing/FeaturesBenefits";
import FeatureShowcase from "@/components/landing/FeatureShowcase";
import HeroSection from "@/components/landing/HeroSection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingNavbar from "@/components/landing/LandingNavbar";
import PricingSection from "@/components/landing/PricingSection";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: siteConfig.title,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fafbfa] text-[#1a1b23] dark:bg-black dark:text-white scroll-smooth">
      <LandingNavbar />
      <HeroSection />
      <FeaturesBenefits />
      <PricingSection />
      <FeatureShowcase />
      <FAQSection />
      <LandingFooter />
    </main>
  );
}

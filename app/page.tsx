import FAQSection from "@/components/landing/FAQSection";
import FeaturesBenefits from "@/components/landing/FeaturesBenefits";
import HeroSection from "@/components/landing/HeroSection";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingNavbar from "@/components/landing/LandingNavbar";
import PricingSection from "@/components/landing/PricingSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fafbfa] text-[#1a1b23] dark:bg-black dark:text-white scroll-smooth">
      <LandingNavbar />
      <HeroSection />
      <FeaturesBenefits />
      <PricingSection />
      <FAQSection />
      <LandingFooter />
    </main>
  );
}

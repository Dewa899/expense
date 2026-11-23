"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl glass-card glass-card-hover w-[82vw] max-w-[310px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#6EE7B7]/30 to-[#34D399]/20 dark:from-[#6EE7B7]/15 dark:to-[#34D399]/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export function LandingView({
  onGetStarted,
  onTryDemo,
}: {
  onGetStarted: () => void;
  onTryDemo: () => void;
}) {
  const { language, t } = useLanguage();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = React.useState(0);

  const features = React.useMemo(
    () => [
      {
        icon: (
          <ReceiptText
            size={20}
            className="text-[#059669] dark:text-[#6EE7B7]"
          />
        ),
        title: t("ocrTitle"),
        description: t("ocrDesc"),
      },
      {
        icon: (
          <Wallet size={20} className="text-[#059669] dark:text-[#6EE7B7]" />
        ),
        title: t("dynamicTitle"),
        description: t("dynamicDesc"),
      },
      {
        icon: (
          <BarChart3 size={20} className="text-[#059669] dark:text-[#6EE7B7]" />
        ),
        title: t("sheetsTitle"),
        description: t("sheetsDesc"),
      },
    ],
    [t]
  );

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (!children.length) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closestIdx = 0;
    let minDist = Infinity;
    children.forEach((child, idx) => {
      const childCenter = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    setActiveCard(closestIdx);
  }, []);

  const scrollToCard = React.useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, el.children.length - 1));
    const target = el.children[clamped] as HTMLElement | undefined;
    if (!target) return;
    const targetLeft =
      target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    el.scrollTo({ left: targetLeft, behavior: "smooth" });
    setActiveCard(clamped);
  }, []);

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col w-full"
    >
      {/* Hero Section */}
      <section className="px-4 sm:px-6 pt-8 pb-10 sm:py-16 md:py-20 flex flex-col items-center text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6EE7B7]/25 dark:bg-[#34D399]/15 border border-[#34D399]/35 text-[#065F46] dark:text-[#6EE7B7] text-[11px] sm:text-xs font-semibold mb-4 sm:mb-6"
        >
          <Zap size={13} className="shrink-0" />
          <span>Schema-agnostic Expense Tracking</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="text-[28px] sm:text-5xl md:text-6xl font-black tracking-tight mb-4 sm:mb-6 leading-[1.15]"
        >
          Track Less{" "}
          <span className="bg-gradient-to-r from-[#10B981] to-[#34D399] dark:from-[#6EE7B7] dark:to-[#34D399] bg-clip-text text-transparent italic">
            Expenses.
          </span>
          <br />
          Live More{" "}
          <span className="bg-gradient-to-r from-[#10B981] to-[#34D399] dark:from-[#6EE7B7] dark:to-[#34D399] bg-clip-text text-transparent italic">
            Experiences.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-6 sm:mb-10 max-w-xl leading-relaxed"
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="flex flex-row gap-2.5 sm:gap-4 items-center justify-center w-full max-w-sm sm:max-w-none"
        >
          <Button
            onClick={onGetStarted}
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#6EE7B7] to-[#34D399] hover:opacity-95 text-[#063626] font-black h-11 sm:h-13 px-4 sm:px-8 rounded-2xl text-sm sm:text-base shadow-[0_4px_12px_rgba(52,211,153,0.28)] active:scale-[0.98] transition-all cursor-pointer border-none"
          >
            {language === "en" ? "Get Started ➔" : "Mulai Sekarang ➔"}
          </Button>
          <Button
            variant="outline"
            onClick={onTryDemo}
            className="flex-1 sm:flex-none h-11 sm:h-13 px-4 sm:px-8 rounded-2xl text-sm sm:text-base font-bold border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {language === "en" ? "Try Demo" : "Coba Demo"}
          </Button>
        </motion.div>
      </section>

      {/* Feature Cards — Horizontal Swipe Carousel on Mobile, 3-Col Grid on Desktop */}
      <section className="py-7 sm:py-14 md:py-16 bg-zinc-50/50 dark:bg-zinc-900/30 border-y border-zinc-200/70 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3.5 px-4 pb-2 md:grid md:grid-cols-3 md:gap-6 md:px-6 md:pb-0 md:overflow-visible"
          >
            {features.map((feat, idx) => (
              <FeatureCard
                key={idx}
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
              />
            ))}
          </div>

          {/* Mobile Carousel Controls (Arrows + Dots) */}
          <div className="flex md:hidden items-center justify-center gap-4 mt-3 px-4">
            <button
              type="button"
              onClick={() => scrollToCard(activeCard - 1)}
              disabled={activeCard === 0}
              aria-label={language === "en" ? "Previous card" : "Kartu sebelumnya"}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-[#222428] shadow-sm text-zinc-700 dark:text-zinc-200 disabled:opacity-30 transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5">
              {features.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToCard(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeCard === idx
                      ? "w-6 bg-gradient-to-r from-[#6EE7B7] to-[#34D399]"
                      : "w-2 bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollToCard(activeCard + 1)}
              disabled={activeCard === features.length - 1}
              aria-label={language === "en" ? "Next card" : "Kartu berikutnya"}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-[#222428] shadow-sm text-zinc-700 dark:text-zinc-200 disabled:opacity-30 transition-all active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ChevronRight, 
  ReceiptText, 
  Zap,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col gap-4 p-8 rounded-3xl glass-card glass-card-hover">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

export function LandingView({ onGetStarted, onTryDemo }: { onGetStarted: () => void; onTryDemo: () => void }) {
  const { language, t } = useLanguage();

  return (
    <motion.div 
      key="landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col w-full"
    >
      {/* Landing Page Content */}
      <section className="px-6 py-20 flex flex-col items-center text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-xs font-semibold mb-8"
        >
          <Zap size={14} />
          <span>Schema-agnostic Expense Tracking</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-7xl font-bold tracking-tight mb-8"
        >
          {language === 'en' ? (
            <>Your <span className="text-emerald-500 italic">Expenses</span>, Your <span className="text-zinc-400 dark:text-zinc-400">Rules.</span></>
          ) : (
            <><span className="text-emerald-500 italic">Pengeluaran</span> Anda, <span className="text-zinc-400 dark:text-zinc-400">Aturan</span> Anda.</>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl leading-relaxed"
        >
          {t("heroSubtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Button 
            onClick={onGetStarted}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black h-14 px-8 rounded-2xl text-lg group shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer border-none"
          >
            {t("getStarted")}
            <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <button
            onClick={onTryDemo}
            className="text-sm font-bold text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors underline underline-offset-4 cursor-pointer"
          >
            {t("tryDemo")}
          </button>
        </motion.div>
      </section>

      <section className="px-6 py-20 bg-zinc-50/50 dark:bg-zinc-900/30 border-y border-zinc-200 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<ReceiptText className="text-emerald-600 dark:text-emerald-500" />}
            title={t("ocrTitle")}
            description={t("ocrDesc")}
          />
          <FeatureCard 
            icon={<Wallet className="text-emerald-600 dark:text-emerald-500" />}
            title={t("dynamicTitle")}
            description={t("dynamicDesc")}
          />
          <FeatureCard 
            icon={<BarChart3 className="text-emerald-600 dark:text-emerald-500" />}
            title={t("sheetsTitle")}
            description={t("sheetsDesc")}
          />
        </div>
      </section>
    </motion.div>
  );
}

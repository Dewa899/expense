"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Sun, Languages, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/language-provider";
import { SupportModal } from "@/components/dashboard/bug-report-modal";
import { Logo } from "@/app/page";

import { useRouter } from "next/navigation";

export default function PrivacyPolicy() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
  const [statusModal, setStatusModal] = React.useState<{ isOpen: boolean; title: string; desc: string }>({
    isOpen: false, title: "", desc: ""
  });

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleLanguage = () => setLanguage(language === "en" ? "id" : "en");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      {/* Consistent Navbar */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/50 backdrop-blur-sm sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80">
        <Logo onClick={() => router.push("/")} />
        
        <div className="flex items-center gap-1">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2 text-xs font-bold text-emerald-500">
              <ArrowLeft size={14} className="mr-1" />
              {t("back")}
            </Button>
          </Link>

          <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-full h-8 w-8 text-zinc-600 dark:text-zinc-400">
            <Languages size={16} />
            <span className="sr-only">Toggle Language</span>
            <span className="ml-0.5 text-[8px] font-bold uppercase">{language}</span>
          </Button>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-8 w-8 text-zinc-600 dark:text-zinc-400">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle Theme</span>
          </Button>
        </div>
      </header>

      <main className="flex-grow p-8 md:p-24">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-emerald-500">
              {t("privacyTitle")}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {t("lastUpdated")}: April 6, 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {t("introTitle")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {t("introDesc")}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {t("infoTitle")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {t("infoDesc")}
            </p>
            <ul className="space-y-3">
              {[t("scopeSheets"), t("scopeDrive")].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-300 font-bold">{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {t("usageTitle")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {t("usageDesc1")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[t("usagePoint1"), t("usagePoint2"), t("usagePoint3")].map((text, i) => (
                <div key={i} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 text-center">
                  {text}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              Disclosure for Google API Services
            </h2>
            <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20">
              <p className="text-zinc-600 dark:text-zinc-300 font-bold leading-relaxed text-sm">
                Expense by Genlord&#39;s use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline underline-offset-4">Google API Services User Data Policy</a>, including the Limited Use requirements.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 text-xs font-medium">
                We explicitly declare that data accessed through your Google Account is used strictly for providing the Expense by Genlord service directly within your browser. No sensitive data is transferred to, stored on, or shared with any third-party servers.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {t("securityTitle")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {t("securityDesc")}
            </p>
          </section>

          <section className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <div className="bg-zinc-900 dark:bg-white text-white dark:text-black p-8 rounded-[32px] space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">{t("contactTitle")}</h2>
                <p className="opacity-70 text-sm font-medium">{t("contactDesc")}</p>
              </div>
              <Button 
                onClick={() => setIsSupportModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl px-8 h-12 gap-2"
              >
                <HelpCircle size={18} />
                {t("openSupport")}
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="p-12 text-center mt-auto border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col items-center gap-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          EXPense by GENLORD &copy; 2026
        </p>
        <div className="flex gap-4">
          <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-4">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-4">
            Terms of Service
          </Link>
        </div>
      </footer>

      <SupportModal 
        isOpen={isSupportModalOpen}
        onOpenChange={setIsSupportModalOpen}
        onSuccess={(title, desc) => setStatusModal({ isOpen: true, title, desc })}
      />
    </div>
  );
}

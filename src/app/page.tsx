"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Moon, 
  Sun, 
  Languages, 
  ArrowLeft,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/language-provider";
import { DashboardView } from "@/components/dashboard-view";
import { LandingView } from "@/components/landing-view";
import { SupportModal } from "@/components/dashboard/bug-report-modal";

export function Logo({ 
  className = "", 
  onClick 
}: { 
  className?: string;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1 leading-none text-left hover:opacity-80 transition-opacity cursor-pointer ${className}`}
    >
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className="text-xl font-black tracking-tighter text-emerald-500 italic">EXP</span>
          <span className="text-xs font-bold tracking-tight text-emerald-600/70 dark:text-emerald-400/50 -ml-0.5">ense</span>
        </div>
        <span className="text-[8px] font-light tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-500 ml-0.5">by GENLORD</span>
      </div>
    </button>
  );
}

export default function Home() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<"dashboard" | "landing">("dashboard");
  const [isTutorialOpen, setIsTutorialOpen] = React.useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
  const [supportInitialData, setSupportInitialData] = React.useState({ category: "bug", email: "" });
  const [statusModal, setStatusModal] = React.useState<{ isOpen: boolean; title: string; desc: string }>({
    isOpen: false, title: "", desc: ""
  });

  React.useEffect(() => {
    setMounted(true);
    // Auto open tutorial for first time
    const tutorialDone = localStorage.getItem("onboarding_complete");
    if (!tutorialDone) {
      setIsTutorialOpen(true);
    }
  }, []);

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "id" : "en");
  };

  const handleCloseTutorial = () => {
    setIsTutorialOpen(false);
    localStorage.setItem("onboarding_complete", "true");
  };

  const handleSupportSuccess = (title: string, desc: string) => {
    setStatusModal({ isOpen: true, title, desc });
  };

  const openSupportModal = (category = "bug", email = "") => {
    setSupportInitialData({ category, email });
    setIsSupportModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative">
      {/* Navbar / Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/50 backdrop-blur-sm sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80">
        <Logo onClick={() => setView(view === "dashboard" ? "landing" : "dashboard")} />
        
        <div className="flex items-center gap-1">
          {view === "landing" && (
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="mr-2 text-xs font-bold text-emerald-500">
              <ArrowLeft size={14} className="mr-1" />
              App
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsTutorialOpen(true)}
            className="rounded-full h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500"
          >
            <HelpCircle size={16} />
          </Button>

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

      <main className="flex-grow flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "dashboard" ? (
            <DashboardView 
              key="dashboard" 
              isTutorialOpen={isTutorialOpen} 
              onTutorialClose={handleCloseTutorial}
              externalStatusModal={statusModal}
              onExternalStatusClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
              onRequestAccess={(email) => openSupportModal("access", email)}
            />
          ) : (
            <LandingView key="landing" onGetStarted={() => setView("dashboard")} />
          )}
        </AnimatePresence>
      </main>

      {/* Floating Support Button */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-[60]"
      >
        <Button 
          onClick={() => openSupportModal("bug")}
          className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl hover:scale-110 active:scale-95 transition-all p-0 flex items-center justify-center group"
        >
          <MessageSquare size={20} className="group-hover:text-emerald-500 transition-colors" />
        </Button>
      </motion.div>

      <SupportModal 
        isOpen={isSupportModalOpen}
        onOpenChange={setIsSupportModalOpen}
        onSuccess={handleSupportSuccess}
        initialCategory={supportInitialData.category}
        initialEmail={supportInitialData.email}
      />

      {/* Footer / Credits */}
      <footer className="p-8 text-center mt-auto border-t border-zinc-200 dark:border-zinc-800/50">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          EXPense by GENLORD
        </p>
      </footer>
    </div>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Moon, 
  Sun, 
  Languages, 
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/language-provider";
import { DashboardView } from "@/components/dashboard-view";
import { LandingView } from "@/components/landing-view";
import { LoginView } from "@/components/login-view";
import { SupportModal } from "@/components/dashboard/bug-report-modal";
import { OnboardingTutorial } from "@/components/dashboard/onboarding-tutorial";
import { PatchNotesModal } from "@/components/dashboard/patch-notes-modal";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { DemoProvider, useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";

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

// ─── Inner app separated so useDemo hook works inside DemoProvider ─────────────

function AppInner() {
  const logic = useDashboardLogic();
  const { enterDemo } = useDemo();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<"dashboard" | "landing" | "login">("landing");
  const [isTutorialOpen, setIsTutorialOpen] = React.useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
  const [isPatchNotesOpen, setIsPatchNotesOpen] = React.useState(false);
  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = React.useState(false);
  const [supportInitialData, setSupportInitialData] = React.useState({ category: "bug", email: "" });
  const [statusModal, setStatusModal] = React.useState<{ isOpen: boolean; title: string; desc: string }>({
    isOpen: false, title: "", desc: ""
  });

  React.useEffect(() => {
    setMounted(true);
    
    // Check active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setView("dashboard");
      } else {
        // If not logged in, check if in direct Google Sheets mode or returning from OAuth
        const savedSheetId = localStorage.getItem("sheetId");
        const savedUser = localStorage.getItem("googleUser");
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const savedToken = typeof window !== "undefined" ? sessionStorage.getItem("google_oauth_token") : "";
        if (savedSheetId || savedUser || (hash && hash.includes("access_token")) || savedToken) {
          setView("dashboard");
        } else {
          setView("landing");
        }
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setView("dashboard");
      } else if (event === "SIGNED_OUT") {
        setView("landing");
      }
    });

    const tutorialDone = localStorage.getItem("onboarding_complete");
    if (!tutorialDone) {
      setIsTutorialOpen(true);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to dashboard if logged in but tries to access login page
  React.useEffect(() => {
    if (view === "login") {
      const isLogged = !!logic.supabaseUser || !!logic.user;
      if (isLogged) {
        setView("dashboard");
      }
    }
  }, [view, logic.supabaseUser, logic.user]);

  if (!mounted) return null;

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleLanguage = () => setLanguage(language === "en" ? "id" : "en");

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

  // Feature 4: Demo mode entry from landing page with warning if logged in
  const handleTryDemo = () => {
    const isLogged = !!logic.supabaseUser || !!logic.user;
    if (isLogged) {
      setIsDemoConfirmOpen(true);
    } else {
      enterDemo();
      setView("dashboard");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 bg-grid-pattern text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative overflow-x-hidden">
      {/* Background Ambient Glow Orbs */}
      <div className="fixed top-0 right-0 w-[350px] h-[350px] md:w-[700px] md:h-[700px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] pointer-events-none select-none z-0" />
      <div className="fixed bottom-0 left-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-teal-500/20 dark:bg-teal-500/8 blur-[120px] pointer-events-none select-none z-0" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[280px] h-[280px] md:w-[500px] md:h-[500px] rounded-full bg-emerald-500/10 dark:bg-emerald-950/15 blur-[120px] pointer-events-none select-none z-0" />
      {/* Navbar / Header */}
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 glass-header">
        <Logo onClick={() => setView(view === "landing" ? "dashboard" : "landing")} />
        
        <div className="flex items-center gap-1">
          {view === "landing" && (
            <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="mr-2 text-xs font-bold text-emerald-500">
              <ArrowLeft size={14} className="mr-1" />
              App
            </Button>
          )}

          {/* Feature 5: Patch Notes ℹ️ button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsPatchNotesOpen(true)}
            className="rounded-full h-8 w-8 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500"
            title="Patch Notes"
          >
            <Info size={16} />
          </Button>

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
              onLoginClick={() => setView("login")}
            />
          ) : view === "login" ? (
            <LoginView
              key="login"
              onLoginSuccess={() => setView("dashboard")}
              onBypassSheets={() => {
                logic.handleGoogleLogin(false);
              }}
              onBack={() => setView("landing")}
            />
          ) : (
            <LandingView
              key="landing"
              onGetStarted={() => {
                const isLogged = !!logic.supabaseUser || !!logic.user;
                if (isLogged) {
                  setView("dashboard");
                } else {
                  setView("login");
                }
              }}
              onTryDemo={handleTryDemo}
            />
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

      <OnboardingTutorial 
        isOpen={isTutorialOpen} 
        onClose={handleCloseTutorial} 
        isSynced={!!logic.user}
        onGoogleLogin={logic.handleGoogleLogin}
        onLoginClick={() => {
          handleCloseTutorial();
          setView("login");
        }}
      />

      {/* Feature 5: Patch Notes Modal */}
      <PatchNotesModal
        isOpen={isPatchNotesOpen}
        onOpenChange={setIsPatchNotesOpen}
      />

      {/* Demo Mode Confirmation Warning Modal */}
      <Dialog open={isDemoConfirmOpen} onOpenChange={setIsDemoConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-amber-500 flex items-center gap-2">
              {language === "en" ? "⚠️ Enter Demo Mode?" : "⚠️ Masuk Mode Demo?"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-zinc-650 dark:text-zinc-350 text-sm leading-relaxed text-left">
              {language === "en" ? (
                <>
                  Entering demo mode will <strong>log out your current active account</strong>.
                  <br /><br />
                  Are you sure you want to continue and enter demo mode?
                </>
              ) : (
                <>
                  Masuk ke mode demo akan <strong>mengeluarkan (log out) akun aktif Anda</strong> saat ini.
                  <br /><br />
                  Apakah Anda yakin ingin melanjutkan dan masuk ke mode demo?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDemoConfirmOpen(false)}
              className="flex-1 h-12 rounded-xl font-bold cursor-pointer"
            >
              {language === "en" ? "Cancel" : "Batal"}
            </Button>
            <Button
              onClick={async () => {
                if (logic.supabaseUser) {
                  await supabase.auth.signOut();
                }
                localStorage.removeItem("googleUser");
                localStorage.removeItem("sheetId");
                setIsDemoConfirmOpen(false);
                enterDemo();
                setView("dashboard");
              }}
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black cursor-pointer"
            >
              {language === "en" ? "Yes, Enter Demo" : "Ya, Masuk Demo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer / Credits */}
      <footer className="p-8 text-center mt-auto border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          EXPense by GENLORD
        </p>
        <div className="flex gap-4">
          <a href="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-4">
            Privacy Policy
          </a>
          <a href="/terms" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-4">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}

// ─── Root export wrapped with DemoProvider ────────────────────────────────────

export default function Home() {
  return (
    <DemoProvider>
      <AppInner />
    </DemoProvider>
  );
}

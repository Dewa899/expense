"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/language-provider";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { useDemo } from "@/components/demo-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, Info, Languages, MessageSquare, Moon, Sun } from "lucide-react";
import { Logo } from "@/app/page";
import { SupportModal } from "@/components/dashboard/bug-report-modal";
import { OnboardingTutorial } from "@/components/dashboard/onboarding-tutorial";
import { PatchNotesModal } from "@/components/dashboard/patch-notes-modal";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const logic = useDashboardLogic();
	const { isDemoMode } = useDemo();
	const { theme, setTheme } = useTheme();
	const { language, setLanguage } = useLanguage();
	const [mounted, setMounted] = React.useState(false);
	
	const [isTutorialOpen, setIsTutorialOpen] = React.useState(false);
	const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
	const [isPatchNotesOpen, setIsPatchNotesOpen] = React.useState(false);
	const [supportInitialData, setSupportInitialData] = React.useState({ category: "bug", email: "", title: "", message: "" });
	const [statusModal, setStatusModal] = React.useState<{ isOpen: boolean; title: string; desc: string }>({
		isOpen: false, title: "", desc: ""
	});

	React.useEffect(() => {
		setMounted(true);
		
		const tutorialDone = localStorage.getItem("onboarding_complete");
		if (!tutorialDone) {
			setIsTutorialOpen(true);
		}
	}, []);

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

	const openSupportModal = (category = "bug", email = "", title = "", message = "") => {
		setSupportInitialData({ category, email, title, message });
		setIsSupportModalOpen(true);
	};

	return (
		<div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 bg-grid-pattern text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative overflow-x-hidden">
			{/* Ambient Glow Orbs */}
			<div className="fixed top-0 right-0 w-[350px] h-[350px] md:w-[700px] md:h-[700px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] pointer-events-none select-none z-0" />
			<div className="fixed bottom-0 left-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-teal-500/20 dark:bg-teal-500/8 blur-[120px] pointer-events-none select-none z-0" />
			
			<header className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 glass-header">
				<Logo onClick={() => router.push("/dashboard")} />
				
				<div className="flex items-center gap-1">
					{pathname === "/dashboard" && (
						<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-2 text-xs font-bold text-emerald-500">
							<ArrowLeft size={14} className="mr-1" />
							App
						</Button>
					)}
					{pathname === "/login" && (
						<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-2 text-xs font-bold text-emerald-500">
							<ArrowLeft size={14} className="mr-1" />
							{language === "en" ? "Back" : "Kembali"}
						</Button>
					)}

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
				{children}
			</main>

			<div className="fixed bottom-6 right-6 z-[60]">
				<Button 
					onClick={() => openSupportModal("bug")}
					className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black shadow-xl hover:scale-110 active:scale-95 transition-all p-0 flex items-center justify-center group"
				>
					<MessageSquare size={20} className="group-hover:text-emerald-500 transition-colors" />
				</Button>
			</div>

			<SupportModal 
				isOpen={isSupportModalOpen}
				onOpenChange={setIsSupportModalOpen}
				onSuccess={handleSupportSuccess}
				initialCategory={supportInitialData.category}
				initialEmail={supportInitialData.email}
				initialTitle={supportInitialData.title}
				initialMessage={supportInitialData.message}
			/>

			<OnboardingTutorial 
				isOpen={isTutorialOpen} 
				onClose={handleCloseTutorial} 
				isSynced={!!logic.user}
				onGoogleLogin={logic.handleGoogleLogin}
				onLoginClick={() => {
					handleCloseTutorial();
					router.push("/login");
				}}
				isInstallable={logic.isInstallable}
				triggerInstall={logic.triggerInstall}
				isStandaloneMode={logic.isStandaloneMode}
			/>

			<PatchNotesModal
				isOpen={isPatchNotesOpen}
				onOpenChange={setIsPatchNotesOpen}
			/>

			<footer className="p-8 text-center mt-auto border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col items-center gap-2">
				<p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-650">
					EXPENSE BY GENLORD
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

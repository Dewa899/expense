"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { useDashboard } from "@/components/dashboard-context";
import { useDemo } from "@/components/demo-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, HelpCircle, Info, Languages, MessageSquare, Moon, Settings, Sun } from "lucide-react";
import { Logo } from "@/app/page";
import { SupportModal } from "@/components/dashboard/modals/bug-report-modal";
import { OnboardingTutorial } from "@/components/dashboard/onboarding-tutorial";
import { PatchNotesModal } from "@/components/dashboard/modals/patch-notes-modal";

interface AppLayoutContextType {
	isDashboardSettingsOpen: boolean;
	setIsDashboardSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	openSupportModal: (category?: string, email?: string, title?: string, message?: string, fromSettings?: boolean) => void;
	openPatchNotes: (fromSettings?: boolean) => void;
	openTutorial: (fromSettings?: boolean) => void;
}

const AppLayoutContext = React.createContext<AppLayoutContextType | null>(null);

export function useAppLayout() {
	return React.useContext(AppLayoutContext);
}

export function SettingsPreferencesAndSupport({
	themeColors,
	onCloseSettings,
}: {
	themeColors?: {
		text: string;
		textDark: string;
		bgLight: string;
		border: string;
		hoverBg: string;
		gradient: string;
	};
	onCloseSettings?: () => void;
}) {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { language, setLanguage } = useLanguage();
	const appLayout = useAppLayout();

	const currentTheme = (theme === "system" ? resolvedTheme : theme) || "light";
	const isDark = currentTheme === "dark";

	const accentText = themeColors?.text || "text-emerald-500";
	const accentTextDark = themeColors?.textDark || "text-emerald-600 dark:text-emerald-400";
	const accentBgLight = themeColors?.bgLight || "bg-emerald-500/5 dark:bg-emerald-500/10";
	const accentBorder = themeColors?.border || "border-emerald-500/35 dark:border-emerald-500/25";

	return (
		<div className="space-y-2.5">
			{/* Smooth Animated Theme & Language Toggles */}
			<div className="p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5">
				{/* Dark / Light Mode Smooth Switch */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className={`w-8 h-8 rounded-xl ${accentBgLight} border ${accentBorder} flex items-center justify-center shrink-0 relative overflow-hidden`}>
							<motion.div
								initial={false}
								animate={{
									rotate: isDark ? -90 : 0,
									scale: isDark ? 0 : 1,
									opacity: isDark ? 0 : 1,
								}}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
								className="absolute"
							>
								<Sun size={16} className={accentText} />
							</motion.div>
							<motion.div
								initial={false}
								animate={{
									rotate: isDark ? 0 : 90,
									scale: isDark ? 1 : 0,
									opacity: isDark ? 1 : 0,
								}}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
								className="absolute"
							>
								<Moon size={16} className={accentText} />
							</motion.div>
						</div>
						<div className="leading-tight min-w-0">
							<p className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">
								{language === "en" ? "Appearance" : "Mode Tampilan"}
							</p>
							<p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 truncate">
								{isDark
									? (language === "en" ? "Dark Mode" : "Mode Gelap")
									: (language === "en" ? "Light Mode" : "Mode Terang")}
							</p>
						</div>
					</div>

					<div
						role="switch"
						aria-checked={isDark}
						aria-label={language === "en" ? "Toggle Theme" : "Ubah Mode Tampilan"}
						onClick={() => setTheme(isDark ? "light" : "dark")}
						className="relative w-36 h-9 p-1 rounded-xl bg-zinc-200/90 dark:bg-zinc-950 border border-zinc-300/60 dark:border-zinc-800 flex items-center cursor-pointer select-none shrink-0"
					>
						<motion.div
							initial={false}
							animate={{ x: isDark ? "100%" : "0%" }}
							transition={{ type: "spring", stiffness: 450, damping: 32 }}
							className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/80 dark:border-zinc-700"
						/>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setTheme("light");
							}}
							className={`relative z-10 flex-1 flex items-center justify-center gap-1 text-[10px] font-black transition-colors duration-200 cursor-pointer bg-transparent border-none ${
								!isDark ? accentTextDark : "text-zinc-500 dark:text-zinc-400"
							}`}
						>
							<Sun size={12} />
							<span>Light</span>
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setTheme("dark");
							}}
							className={`relative z-10 flex-1 flex items-center justify-center gap-1 text-[10px] font-black transition-colors duration-200 cursor-pointer bg-transparent border-none ${
								isDark ? accentTextDark : "text-zinc-500 dark:text-zinc-400"
							}`}
						>
							<Moon size={12} />
							<span>Dark</span>
						</button>
					</div>
				</div>

				<div className="h-px bg-zinc-200/70 dark:bg-zinc-800/70" />

				{/* Language (ID / EN) Smooth Switch */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className={`w-8 h-8 rounded-xl ${accentBgLight} border ${accentBorder} flex items-center justify-center shrink-0`}>
							<Languages size={16} className={accentText} />
						</div>
						<div className="leading-tight min-w-0">
							<p className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">
								{language === "en" ? "Language" : "Bahasa"}
							</p>
							<p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 truncate">
								{language === "en" ? "English (EN)" : "Indonesia (ID)"}
							</p>
						</div>
					</div>

					<div
						role="switch"
						aria-checked={language === "en"}
						aria-label="Toggle Language"
						onClick={() => setLanguage(language === "en" ? "id" : "en")}
						className="relative w-36 h-9 p-1 rounded-xl bg-zinc-200/90 dark:bg-zinc-950 border border-zinc-300/60 dark:border-zinc-800 flex items-center cursor-pointer select-none shrink-0"
					>
						<motion.div
							initial={false}
							animate={{ x: language === "en" ? "100%" : "0%" }}
							transition={{ type: "spring", stiffness: 450, damping: 32 }}
							className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/80 dark:border-zinc-700"
						/>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setLanguage("id");
							}}
							className={`relative z-10 flex-1 flex items-center justify-center gap-1 text-[10px] font-black transition-colors duration-200 cursor-pointer bg-transparent border-none ${
								language === "id" ? accentTextDark : "text-zinc-500 dark:text-zinc-400"
							}`}
						>
							<span>ID</span>
							<span className="text-[9px] opacity-75">Indo</span>
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setLanguage("en");
							}}
							className={`relative z-10 flex-1 flex items-center justify-center gap-1 text-[10px] font-black transition-colors duration-200 cursor-pointer bg-transparent border-none ${
								language === "en" ? accentTextDark : "text-zinc-500 dark:text-zinc-400"
							}`}
						>
							<span>EN</span>
							<span className="text-[9px] opacity-75">Eng</span>
						</button>
					</div>
				</div>
			</div>

			{/* Tutorial (?), Patch Notes, and Contact Support */}
			<div className="grid grid-cols-3 gap-2">
				<button
					type="button"
					onClick={() => {
						onCloseSettings?.();
						appLayout?.openTutorial(true);
					}}
					className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
				>
					<div className={`w-8 h-8 rounded-xl ${accentBgLight} border ${accentBorder} flex items-center justify-center`}>
						<HelpCircle size={16} className={accentText} />
					</div>
					<span className="text-[11px] font-black leading-tight text-center">
						{language === "en" ? "Tutorial" : "Panduan"}
					</span>
				</button>

				<button
					type="button"
					onClick={() => {
						onCloseSettings?.();
						appLayout?.openPatchNotes(true);
					}}
					className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
				>
					<div className={`w-8 h-8 rounded-xl ${accentBgLight} border ${accentBorder} flex items-center justify-center`}>
						<Info size={16} className={accentText} />
					</div>
					<span className="text-[11px] font-black leading-tight text-center">
						{language === "en" ? "Patch Notes" : "Catatan Rilis"}
					</span>
				</button>

				<button
					type="button"
					onClick={() => {
						onCloseSettings?.();
						appLayout?.openSupportModal("bug", "", "", "", true);
					}}
					className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
				>
					<div className={`w-8 h-8 rounded-xl ${accentBgLight} border ${accentBorder} flex items-center justify-center`}>
						<MessageSquare size={16} className={accentText} />
					</div>
					<span className="text-[11px] font-black leading-tight text-center">
						{language === "en" ? "Contact Support" : "Hubungi Support"}
					</span>
				</button>
			</div>
		</div>
	);
}

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const logic = useDashboard();
	const { language } = useLanguage();
	const [mounted, setMounted] = React.useState(false);
	
	const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = React.useState(false);
	const [isTutorialOpen, setIsTutorialOpen] = React.useState(false);
	const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);
	const [isPatchNotesOpen, setIsPatchNotesOpen] = React.useState(false);
	const returnToSettingsRef = React.useRef(false);
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

	const handleCloseTutorial = React.useCallback(() => {
		setIsTutorialOpen(false);
		localStorage.setItem("onboarding_complete", "true");
		if (returnToSettingsRef.current) {
			returnToSettingsRef.current = false;
			setIsDashboardSettingsOpen(true);
		}
	}, []);

	const handleSupportSuccess = React.useCallback((title: string, desc: string) => {
		setStatusModal({ isOpen: true, title, desc });
	}, []);

	const openSupportModal = React.useCallback((category = "bug", email = "", title = "", message = "", fromSettings = false) => {
		returnToSettingsRef.current = fromSettings;
		setSupportInitialData({ category, email, title, message });
		setIsSupportModalOpen(true);
	}, []);

	const openPatchNotes = React.useCallback((fromSettings = false) => {
		returnToSettingsRef.current = fromSettings;
		setIsPatchNotesOpen(true);
	}, []);

	const openTutorial = React.useCallback((fromSettings = false) => {
		returnToSettingsRef.current = fromSettings;
		setIsTutorialOpen(true);
	}, []);

	const contextValue = React.useMemo<AppLayoutContextType>(() => ({
		isDashboardSettingsOpen,
		setIsDashboardSettingsOpen,
		openSupportModal,
		openPatchNotes,
		openTutorial,
	}), [isDashboardSettingsOpen, openSupportModal, openPatchNotes, openTutorial]);

	if (!mounted) return null;

	return (
		<AppLayoutContext.Provider value={contextValue}>
			<div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 bg-grid-pattern text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative overflow-x-hidden">
				{/* Ambient Glow Orbs */}
				<div className="fixed top-0 right-0 w-[350px] h-[350px] md:w-[700px] md:h-[700px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] pointer-events-none select-none z-0" />
				<div className="fixed bottom-0 left-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-teal-500/20 dark:bg-teal-500/8 blur-[120px] pointer-events-none select-none z-0" />
				
				<header className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 glass-header">
					<Logo onClick={() => router.push("/dashboard")} />
					
					<div className="flex items-center gap-1.5">
						{pathname === "/dashboard" && (
							<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-1 text-xs font-bold text-emerald-500 cursor-pointer">
								<ArrowLeft size={14} className="mr-1" />
								App
							</Button>
						)}
						{pathname === "/login" && (
							<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-1 text-xs font-bold text-emerald-500 cursor-pointer">
								<ArrowLeft size={14} className="mr-1" />
								{language === "en" ? "Back" : "Kembali"}
							</Button>
						)}

						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsDashboardSettingsOpen(true)}
							className="rounded-full h-9 w-9 text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer transition-colors"
							aria-label="Pengaturan Dasbor"
							title={language === "en" ? "Dashboard Controls & Settings" : "Kontrol Dasbor & Pengaturan"}
						>
							<Settings size={18} />
						</Button>
					</div>
				</header>

				<main className="flex-grow flex flex-col relative overflow-hidden">
					{children}
				</main>

				{/* Fallback Settings Modal for routes that don't mount FormView */}
				{pathname !== "/" && (
					<Dialog open={isDashboardSettingsOpen} onOpenChange={setIsDashboardSettingsOpen}>
						<DialogContent className="sm:max-w-[420px] rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle className="flex items-center gap-2">
									<Settings className="text-emerald-500" size={20} />
									{language === "en" ? "Dashboard Controls" : "Kontrol Dasbor"}
								</DialogTitle>
							</DialogHeader>
							<div className="pt-3">
								<SettingsPreferencesAndSupport
									onCloseSettings={() => setIsDashboardSettingsOpen(false)}
								/>
							</div>
						</DialogContent>
					</Dialog>
				)}

				<SupportModal 
					isOpen={isSupportModalOpen}
					onOpenChange={(open) => {
						setIsSupportModalOpen(open);
						if (!open && returnToSettingsRef.current) {
							returnToSettingsRef.current = false;
							setIsDashboardSettingsOpen(true);
						}
					}}
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
						returnToSettingsRef.current = false;
						setIsTutorialOpen(false);
						localStorage.setItem("onboarding_complete", "true");
						router.push("/login");
					}}
					isInstallable={logic.isInstallable}
					triggerInstall={logic.triggerInstall}
					isStandaloneMode={logic.isStandaloneMode}
				/>

				<PatchNotesModal
					isOpen={isPatchNotesOpen}
					onOpenChange={(open) => {
						setIsPatchNotesOpen(open);
						if (!open && returnToSettingsRef.current) {
							returnToSettingsRef.current = false;
							setIsDashboardSettingsOpen(true);
						}
					}}
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
		</AppLayoutContext.Provider>
	);
}

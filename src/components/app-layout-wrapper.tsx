"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";
import { useDashboard } from "@/components/dashboard-context";
import { useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	ArrowLeft,
	ChevronRight,
	Download,
	HelpCircle,
	Info,
	Languages,
	MessageSquare,
	Moon,
	RefreshCw,
	Settings,
	Sun,
	User,
} from "lucide-react";
import { Logo } from "@/app/page";
import { SupportModal } from "@/components/dashboard/modals/bug-report-modal";
import { OnboardingTutorial } from "@/components/dashboard/onboarding-tutorial";
import { PatchNotesModal } from "@/components/dashboard/modals/patch-notes-modal";
import { ProfileConnectionModal, getAccountDisplayInfo } from "@/components/dashboard/modals/profile-connection-modal";
import { DisconnectModal } from "@/components/dashboard/modals/disconnect-modal";

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

const NEUTRAL_SETTINGS_THEME = {
	gradient: "from-[#6EE7B7] to-[#34D399]",
	buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
	text: "text-emerald-500",
	textDark: "text-emerald-600 dark:text-emerald-400",
	bgLight: "bg-emerald-500/10 dark:bg-emerald-500/15",
	border: "border-emerald-500/20 dark:border-emerald-500/20",
	hoverBg: "hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20",
};

export function SettingsPreferencesAndSupport({
	onCloseSettings,
}: {
	themeColors?: any;
	onCloseSettings?: () => void;
}) {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { language, setLanguage } = useLanguage();
	const appLayout = useAppLayout();

	const currentTheme = (theme === "system" ? resolvedTheme : theme) || "light";
	const isDark = currentTheme === "dark";

	// Always use neutral settings accent (never changes with pocket color)
	const accentText = NEUTRAL_SETTINGS_THEME.text;
	const accentTextDark = NEUTRAL_SETTINGS_THEME.textDark;
	const accentBgLight = NEUTRAL_SETTINGS_THEME.bgLight;

	return (
		<div className="space-y-2.5">
			{/* Smooth Animated Theme & Language Toggles */}
			<div className="p-3 rounded-2xl bg-[#F1F3F5] dark:bg-[#2B2E33] border-none space-y-2.5">
				{/* Dark / Light Mode Smooth Switch */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className={`w-8 h-8 rounded-xl ${accentBgLight} flex items-center justify-center shrink-0 relative overflow-hidden`}>
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
							<p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 truncate">
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
						className="relative w-36 h-9 p-1 rounded-xl bg-zinc-200/80 dark:bg-[#1E2024] border-none flex items-center cursor-pointer select-none shrink-0"
					>
						<motion.div
							initial={false}
							animate={{ x: isDark ? "100%" : "0%" }}
							transition={{ type: "spring", stiffness: 450, damping: 32 }}
							className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-[#2E3238] shadow-xs"
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

				<div className="h-px bg-zinc-200/70 dark:bg-white/5" />

				{/* Language (ID / EN) Smooth Switch */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className={`w-8 h-8 rounded-xl ${accentBgLight} flex items-center justify-center shrink-0`}>
							<Languages size={16} className={accentText} />
						</div>
						<div className="leading-tight min-w-0">
							<p className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">
								{language === "en" ? "Language" : "Bahasa"}
							</p>
							<p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-400 truncate">
								{language === "en" ? "English (EN)" : "Indonesia (ID)"}
							</p>
						</div>
					</div>

					<div
						role="switch"
						aria-checked={language === "en"}
						aria-label="Toggle Language"
						onClick={() => setLanguage(language === "en" ? "id" : "en")}
						className="relative w-36 h-9 p-1 rounded-xl bg-zinc-200/80 dark:bg-[#1E2024] border-none flex items-center cursor-pointer select-none shrink-0"
					>
						<motion.div
							initial={false}
							animate={{ x: language === "en" ? "100%" : "0%" }}
							transition={{ type: "spring", stiffness: 450, damping: 32 }}
							className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-[#2E3238] shadow-xs"
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
					className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
				>
					<div className={`w-8 h-8 rounded-xl ${accentBgLight} flex items-center justify-center`}>
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
					className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
				>
					<div className={`w-8 h-8 rounded-xl ${accentBgLight} flex items-center justify-center`}>
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
					className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
				>
					<div className={`w-8 h-8 rounded-xl ${accentBgLight} flex items-center justify-center`}>
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
	const { isDemoMode, demoTransactions } = useDemo();
	const { language } = useLanguage();
	const [mounted, setMounted] = React.useState(false);
	
	const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = React.useState(false);
	const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
	const [isDisconnectModalOpen, setIsDisconnectModalOpen] = React.useState(false);
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

	const activeTransactions = isDemoMode ? demoTransactions : logic.transactions;
	const isSyncing = logic.loading || logic.isIntegrating;

	if (!mounted) return null;

	return (
		<AppLayoutContext.Provider value={contextValue}>
			<div className="flex flex-col min-h-screen bg-[#F4F5F7] dark:bg-[#18191C] text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative overflow-x-hidden">
				<header className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 glass-header">
					<Logo onClick={() => router.push("/dashboard")} />
					
					<div className="flex items-center gap-1.5">
						{pathname === "/dashboard" && (
							<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-1 text-xs font-bold text-emerald-500 cursor-pointer rounded-2xl">
								<ArrowLeft size={14} className="mr-1" />
								App
							</Button>
						)}
						{pathname === "/login" && (
							<Button variant="ghost" size="sm" onClick={() => router.push("/")} className="mr-1 text-xs font-bold text-emerald-500 cursor-pointer rounded-2xl">
								<ArrowLeft size={14} className="mr-1" />
								{language === "en" ? "Back" : "Kembali"}
							</Button>
						)}

						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsDashboardSettingsOpen(true)}
							className="rounded-2xl h-9 w-9 bg-[#EAECEF] dark:bg-[#222428] text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-200/80 dark:hover:bg-[#2B2E33] border-none cursor-pointer transition-colors"
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

				{/* Unified Dashboard Controls Settings Modal (Identical across Dashboard & Detailed Dashboard, Fixed Neutral/Emerald Theme) */}
				<Dialog open={isDashboardSettingsOpen} onOpenChange={setIsDashboardSettingsOpen}>
					<DialogContent className="sm:max-w-[420px] rounded-3xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Settings className="text-emerald-500" size={20} />
								{language === "en" ? "Dashboard Controls" : "Kontrol Dasbor"}
							</DialogTitle>
						</DialogHeader>

						<div className="grid grid-cols-1 gap-2.5 pt-3">
							{/* Top Item: Profile & Sync (Displays Username & Login Method directly; click for Email & Sync details) */}
							{(() => {
								const { displayName, avatarUrl, loginMethod } = getAccountDisplayInfo(
									logic.supabaseUser,
									logic.user,
									!!isDemoMode,
									language
								);
								const isSignedIn = Boolean(logic.supabaseUser || logic.user);

								return (
									<button
										type="button"
										onClick={() => {
											setIsDashboardSettingsOpen(false);
											if (!isSignedIn) {
												router.push("/login");
											} else {
												setIsProfileModalOpen(true);
											}
										}}
										className="w-full p-3.5 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
									>
										<div className="flex items-center gap-3 min-w-0 flex-1">
											{avatarUrl ? (
												<img
													src={avatarUrl}
													alt="Profile"
													className="w-10 h-10 rounded-xl object-cover shrink-0"
												/>
											) : (
												<div className={`w-10 h-10 rounded-xl ${NEUTRAL_SETTINGS_THEME.bgLight} flex items-center justify-center shrink-0`}>
													{isSignedIn ? (
														<span className={`${NEUTRAL_SETTINGS_THEME.textDark} font-black text-sm uppercase`}>
															{displayName?.[0] || "U"}
														</span>
													) : (
														<User size={18} className={NEUTRAL_SETTINGS_THEME.text} />
													)}
												</div>
											)}
											<div className="min-w-0 flex-1 leading-tight">
												<p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">
													{isSignedIn
														? displayName
														: (language === "en" ? "Sign In / Account" : "Masuk / Akun")}
												</p>
												<div className="flex items-center gap-1.5 mt-1">
													<span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${NEUTRAL_SETTINGS_THEME.bgLight} ${NEUTRAL_SETTINGS_THEME.textDark}`}>
														{loginMethod}
													</span>
													{isSignedIn && (
														<span className="text-[10px] text-zinc-400 dark:text-zinc-400 font-semibold truncate">
															• {language === "en" ? "View details" : "Lihat detail"}
														</span>
													)}
												</div>
											</div>
										</div>
										<ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
									</button>
								);
							})()}

							{/* Smooth Animated Theme & Language Toggles + Tutorial (?), Patch Notes, and Contact Support */}
							<SettingsPreferencesAndSupport
								onCloseSettings={() => setIsDashboardSettingsOpen(false)}
							/>

							{/* Data Exports with Icons (Visible whenever transactions exist) */}
							{activeTransactions.length > 0 && (
								<div className={`grid ${logic.isGoogleConnected ? "grid-cols-2" : "grid-cols-1"} gap-2 pt-1`}>
									<Button
										variant="outline"
										onClick={() => {
											setIsDashboardSettingsOpen(false);
											logic.exportToCSV?.();
										}}
										className="h-11 rounded-2xl font-bold text-xs cursor-pointer bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] border-none flex items-center justify-center gap-1.5"
									>
										<Download size={14} className="text-emerald-500" />
										<span>{language === "en" ? "Export CSV" : "Ekspor CSV"}</span>
									</Button>
									{logic.isGoogleConnected && (
										<Button
											variant="outline"
											onClick={() => {
												setIsDashboardSettingsOpen(false);
												logic.exportToGoogleSheets?.();
											}}
											className="h-11 rounded-2xl font-bold text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border-none flex items-center justify-center gap-1.5"
										>
											<RefreshCw size={14} className="text-emerald-500" />
											<span>{language === "en" ? "Sync Sheets" : "Sinkron Sheets"}</span>
										</Button>
									)}
								</div>
							)}
						</div>
					</DialogContent>
				</Dialog>

				{/* Profile & Sync Submenu Modal (Returns to Dashboard Controls when closed) */}
				<ProfileConnectionModal
					isOpen={isProfileModalOpen}
					onOpenChange={(open) => {
						setIsProfileModalOpen(open);
						if (!open) {
							setIsDashboardSettingsOpen(true);
						}
					}}
					onBackToSettings={() => {
						setIsProfileModalOpen(false);
						setIsDashboardSettingsOpen(true);
					}}
					user={logic.user}
					supabaseUser={logic.supabaseUser}
					isGoogleConnected={!!logic.isGoogleConnected}
					googleEmail={logic.googleEmail || ""}
					onGoogleLogin={logic.handleGoogleLogin}
					onDisconnect={() => {
						setIsProfileModalOpen(false);
						setIsDisconnectModalOpen(true);
					}}
					isSyncing={!!isSyncing}
					themeColors={NEUTRAL_SETTINGS_THEME}
				/>

				{/* Disconnect Confirmation Modal */}
				<DisconnectModal
					isOpen={isDisconnectModalOpen}
					onOpenChange={setIsDisconnectModalOpen}
					onConfirm={async () => {
						try {
							const { data: { session } } = await supabase.auth.getSession();
							if (session) {
								await supabase.from("google_connections").delete().eq("user_id", session.user.id);
							}
						} catch (e) {
							console.error("Error deleting connection from Supabase:", e);
						}
						localStorage.removeItem("googleUser");
						localStorage.removeItem("sheetId");
						localStorage.removeItem("customFieldDefs");
						localStorage.removeItem("customChartConfigs");
						localStorage.removeItem("customPockets");
						localStorage.removeItem("customCategories");
						localStorage.removeItem("recurringTemplates");
						window.location.reload();
					}}
				/>

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

				{pathname !== "/" && (
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
				)}
			</div>
		</AppLayoutContext.Provider>
	);
}

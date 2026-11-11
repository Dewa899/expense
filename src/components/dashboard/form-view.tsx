"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { 
	Plus, 
	Link as LinkIcon, 
	History, 
	Wallet, 
	Settings, 
	Trash2, 
	ListTree, 
	Pencil, 
	ChevronLeft, 
	TrendingUp, 
	TrendingDown, 
	Eye, 
	EyeOff, 
	Download,
	Home,
	User,
	Camera,
	Loader2,
	ChevronRight,
	CalendarDays,
	ChevronUp,
	ChevronDown,
	AlertTriangle,
	Menu,
	X,
	RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";
import { CustomFieldDef, PocketDef, isInternalTransfer } from "@/hooks/use-dashboard-logic";
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { PocketSelectModal } from "@/components/dashboard/modals/pocket-select-modal";
import { PocketSettingsModal } from "@/components/dashboard/modals/pocket-settings-modal";
import { RecurringTemplatesModal } from "@/components/dashboard/modals/recurring-templates-modal";
import { ManageFieldsModal } from "@/components/dashboard/modals/manage-fields-modal";
import { PocketCarouselCard } from "@/components/dashboard/cards/pocket-carousel-card";
import { MoveFundsModal } from "@/components/dashboard/modals/move-funds-modal";
import { SeparatedProgressBarCard } from "@/components/dashboard/cards/separated-progress-bar-card";
import { ProfileConnectionModal, getAccountDisplayInfo } from "@/components/dashboard/modals/profile-connection-modal";
import { PwaDownloaderModal } from "@/components/dashboard/modals/pwa-downloader-modal";
import { useAppLayout, SettingsPreferencesAndSupport } from "@/components/app-layout-wrapper";
import { cleanNumber } from "@/lib/sheets-api";

interface FormViewProps {
	totalAmount: number;
	formatCurrency: (val: number) => string;
	onViewDetail: () => void;
	headers: string[];
	formData: Record<string, string>;
	loading: boolean;
	user: any;
	categories: string[];
	transactions: any[];
	customFields: CustomFieldDef[];
	newCategoryInput: string;
	newFieldName: string;
	newFieldType: "text" | "dropdown";
	newFieldRequired: boolean;
	newOptionInput: string;
	isManageFieldsOpen: boolean;
	setIsManageFieldsOpen: (open: boolean) => void;
	onInputChange: (header: string, value: string) => void;
	onSubmit: (overrideFormData?: Record<string, string>) => void;
	onAddCategory: () => void;
	onDeleteCategory: (cat: string) => void;
	onAddField: () => void;
	onDeleteField: (idx: number, name: string) => void;
	onRenameField: (idx: number, name: string, type: "text" | "dropdown", req: boolean) => void;
	onAddOption: (idx: number, opt: string) => void;
	onDeleteOption: (idx: number, opt: string) => void;
	setNewCategoryInput: (val: string) => void;
	setNewFieldName: (val: string) => void;
	setNewFieldType: (val: "text" | "dropdown") => void;
	setNewFieldRequired: (val: boolean) => void;
	setNewOptionInput: (val: string) => void;
	translateHeader: (header: string) => string;
	onGoogleLogin: (forceAccountSelection?: boolean) => void;
	onDisconnect: () => void;
	currentMonth: string;
	isIntegrating?: boolean;
	isDemoMode?: boolean;
	supabaseUser?: any;
	isGoogleConnected?: boolean;
	googleEmail?: string;
	exportToCSV?: () => void;
	exportToGoogleSheets?: () => void;
	onLoginClick?: () => void;
	
	ocrLoading: boolean;
	ocrMessage: string;
	onOcrClick: () => void;
	isOcrReady?: boolean;

	// Pocket Props
	pockets: PocketDef[];
	activePocketIdx: number;
	setActivePocketIdx: (idx: number) => void;
	getPocketBalance: (pocket: PocketDef) => number;
	handleUpdatePockets: (list: PocketDef[]) => void;
	setStatusModal: (state: any) => void;

	// Recurring Props
	recurringTemplates: any[];
	handleAddRecurringTemplate: (template: any) => void;
	handleDeleteRecurringTemplate: (id: string) => void;

	// PWA Props
	isAddToHomeOpen: boolean;
	setIsAddToHomeOpen: (open: boolean) => void;
	isInstallable: boolean;
	triggerInstall: () => void;
	isStandaloneMode: boolean;
	onMoveFunds: (source: string, target: string, amount: number) => void;
}

export function FormView(props: FormViewProps) {
	const { t, language } = useLanguage();
	const isMobile = useIsMobile();
	const { enterDemo } = useDemo();

	const [showManualInstruction, setShowManualInstruction] = React.useState(false);

	const os = React.useMemo(() => {
		if (typeof window === "undefined") return "desktop";
		const ua = window.navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(ua)) return "ios";
		if (/android/.test(ua)) return "android";
		return "desktop";
	}, []);
	
	// Privacy State
	const [isPrivate, setIsPrivate] = React.useState(false);
	
	// Clean Display & Pocket direct selector state (Clean Display defaults to ON)
	const [isCleanDisplay, setIsCleanDisplay] = React.useState(true);
	const [isNoteExpanded, setIsNoteExpanded] = React.useState(false);
	const [isPocketSelectOpen, setIsPocketSelectOpen] = React.useState(false);
	const [isMoveFundsOpen, setIsMoveFundsOpen] = React.useState(false);
	React.useEffect(() => {
		const saved = localStorage.getItem("clean_display");
		setIsCleanDisplay(saved === null ? true : saved === "true");
	}, []);

	// Local form data state for performance optimization (stops full parent re-renders on keystroke)
	const [localFormData, setLocalFormData] = React.useState<Record<string, string>>(props.formData);

	// Sync local state when parent props.formData changes (e.g. from OCR scanner or reset)
	React.useEffect(() => {
		setLocalFormData(props.formData);
	}, [props.formData]);

	// Mobile keyboard focus state
	const [mobileKbHeader, setMobileKbHeader] = React.useState<string | null>(null);

	// Ref to amount field container for scroll-into-view
	const amountFieldRef = React.useRef<HTMLDivElement>(null);

	// Auto-scroll focused amount field into view
	React.useEffect(() => {
		if (isMobile && mobileKbHeader && amountFieldRef.current) {
			const timer = setTimeout(() => {
				amountFieldRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [mobileKbHeader, isMobile]);

	const isInteractionDisabled = props.isIntegrating;
	const isSyncing = props.loading || props.isIntegrating;

	React.useEffect(() => {
		setIsPrivate(localStorage.getItem("privacy_mode") === "true");
	}, []);

	// Shortcut Enter Key
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Enter") return;
			const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
			if (tag === "textarea" || isInteractionDisabled) return;
			if (document.querySelector("[data-state='open'][role='dialog']")) return;
			e.preventDefault();
			props.onSubmit(localFormData);
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isInteractionDisabled, props.onSubmit, localFormData]);

	const togglePrivacy = () => {
		const newVal = !isPrivate;
		setIsPrivate(newVal);
		localStorage.setItem("privacy_mode", String(newVal));
	};

	const maskValue = (val: string) => isPrivate ? "******" : val;

	const appLayout = useAppLayout();
	const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
	const [localIsDashboardSettingsOpen, setLocalIsDashboardSettingsOpen] = React.useState(false);
	const isDashboardSettingsOpen = appLayout ? appLayout.isDashboardSettingsOpen : localIsDashboardSettingsOpen;
	const setIsDashboardSettingsOpen = appLayout ? appLayout.setIsDashboardSettingsOpen : setLocalIsDashboardSettingsOpen;
	const [isQuickMenuOpen, setIsQuickMenuOpen] = React.useState(false);

	const handleManageFieldsClick = (e?: React.MouseEvent) => {
		if (!props.user && !props.supabaseUser && !props.isDemoMode) {
			props.onLoginClick?.();
		} else {
			props.setIsManageFieldsOpen(true);
		}
	};

	// Amount change and evaluation
	const handleAmountChange = (header: string, raw: string) => {
		const digits = stripRupiah(raw);
		const formatted = digits ? formatRupiah(digits) : "";
		handleLocalInputChange(header, formatted);
	};

	const handleLocalInputChange = (header: string, value: string) => {
		setLocalFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleLocalSubmit = () => {
		props.onSubmit(localFormData);
		setIsNoteExpanded(false);
	};

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo", type: "default", color: "emerald", target: undefined } as PocketDef,
		...props.pockets
	], [props.pockets, language]);

	const activePocket = carouselPockets[props.activePocketIdx] || carouselPockets[0];
	const activePocketId = activePocket?.id || "net_worth";

	const displayHeaders = React.useMemo(() => {
		const baseHeaders = props.headers.length > 0 ? props.headers : ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];
		const allCustomNames = new Set(props.customFields.map(f => f.name.toLowerCase()));
		const coreOnly = baseHeaders.filter(h => !allCustomNames.has(h.toLowerCase()));
		const activePocketCustomHeaders = props.customFields
			.filter(f => (f.pocketId || "net_worth") === activePocketId)
			.map(f => f.name);
		return [...coreOnly, ...activePocketCustomHeaders];
	}, [props.headers, props.customFields, activePocketId]);

	const themeColors = {
		emerald: {
			gradient: "from-[#6EE7B7] to-[#34D399]",
			cardText: "text-[#063626]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-emerald-500",
			textDark: "text-emerald-600 dark:text-emerald-400",
			border: "border-emerald-500/20 dark:border-emerald-500/20",
			bgLight: "bg-emerald-500/10 dark:bg-emerald-500/15",
			hoverBg: "hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20",
			focusRing: "focus-visible:outline-emerald-500",
			focusRingInput: "focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-emerald-400/30",
			accentText: "text-emerald-700 dark:text-emerald-300",
			navText: "text-[#063626]/65 hover:text-[#063626]",
		},
		indigo: {
			gradient: "from-[#A5B4FC] to-[#818CF8]",
			cardText: "text-[#1E1B4B]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-indigo-500",
			textDark: "text-indigo-600 dark:text-indigo-400",
			border: "border-indigo-500/20 dark:border-indigo-500/20",
			bgLight: "bg-indigo-500/10 dark:bg-indigo-500/15",
			hoverBg: "hover:bg-indigo-500/15 dark:hover:bg-indigo-500/20",
			focusRing: "focus-visible:outline-indigo-500",
			focusRingInput: "focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-400/30",
			accentText: "text-indigo-700 dark:text-indigo-300",
			navText: "text-[#1E1B4B]/65 hover:text-[#1E1B4B]",
		},
		amber: {
			gradient: "from-[#FCD34D] to-[#FBBF24]",
			cardText: "text-[#451A03]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-amber-500",
			textDark: "text-amber-600 dark:text-amber-400",
			border: "border-amber-500/20 dark:border-amber-500/20",
			bgLight: "bg-amber-500/10 dark:bg-amber-500/15",
			hoverBg: "hover:bg-amber-500/15 dark:hover:bg-amber-500/20",
			focusRing: "focus-visible:outline-amber-500",
			focusRingInput: "focus:ring-2 focus:ring-amber-500/30 dark:focus:ring-amber-400/30",
			accentText: "text-amber-700 dark:text-amber-300",
			navText: "text-[#451A03]/65 hover:text-[#451A03]",
		},
		rose: {
			gradient: "from-[#FDA4AF] to-[#FB7185]",
			cardText: "text-[#4C0519]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-rose-500",
			textDark: "text-rose-600 dark:text-rose-400",
			border: "border-rose-500/20 dark:border-rose-500/20",
			bgLight: "bg-rose-500/10 dark:bg-rose-500/15",
			hoverBg: "hover:bg-rose-500/15 dark:hover:bg-rose-500/20",
			focusRing: "focus-visible:outline-rose-500",
			focusRingInput: "focus:ring-2 focus:ring-rose-500/30 dark:focus:ring-rose-400/30",
			accentText: "text-rose-700 dark:text-rose-300",
			navText: "text-[#4C0519]/65 hover:text-[#4C0519]",
		},
		cyan: {
			gradient: "from-[#67E8F9] to-[#22D3EE]",
			cardText: "text-[#083344]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-cyan-500",
			textDark: "text-cyan-600 dark:text-cyan-400",
			border: "border-cyan-500/20 dark:border-cyan-500/20",
			bgLight: "bg-cyan-500/10 dark:bg-cyan-500/15",
			hoverBg: "hover:bg-cyan-500/15 dark:hover:bg-cyan-500/20",
			focusRing: "focus-visible:outline-cyan-500",
			focusRingInput: "focus:ring-2 focus:ring-cyan-500/30 dark:focus:ring-cyan-400/30",
			accentText: "text-cyan-700 dark:text-cyan-300",
			navText: "text-[#083344]/65 hover:text-[#083344]",
		},
		violet: {
			gradient: "from-[#C4B5FD] to-[#A78BFA]",
			cardText: "text-[#2E1065]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-violet-500",
			textDark: "text-violet-600 dark:text-violet-400",
			border: "border-violet-500/20 dark:border-violet-500/20",
			bgLight: "bg-violet-500/10 dark:bg-violet-500/15",
			hoverBg: "hover:bg-violet-500/15 dark:hover:bg-violet-500/20",
			focusRing: "focus-visible:outline-violet-500",
			focusRingInput: "focus:ring-2 focus:ring-violet-500/30 dark:focus:ring-violet-400/30",
			accentText: "text-violet-700 dark:text-violet-300",
			navText: "text-[#2E1065]/65 hover:text-[#2E1065]",
		},
		orange: {
			gradient: "from-[#FDBA74] to-[#FB923C]",
			cardText: "text-[#431407]",
			shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			buttonShadow: "shadow-[0_4px_10px_rgba(0,0,0,0.10)]",
			text: "text-orange-500",
			textDark: "text-orange-600 dark:text-orange-400",
			border: "border-orange-500/20 dark:border-orange-500/20",
			bgLight: "bg-orange-500/10 dark:bg-orange-500/15",
			hoverBg: "hover:bg-orange-500/15 dark:hover:bg-orange-500/20",
			focusRing: "focus-visible:outline-orange-500",
			focusRingInput: "focus:ring-2 focus:ring-orange-500/30 dark:focus:ring-orange-400/30",
			accentText: "text-orange-700 dark:text-orange-300",
			navText: "text-[#431407]/65 hover:text-[#431407]",
		}
	}[activePocket.color || "emerald"];

	const [isPocketSettingsOpen, setIsPocketSettingsOpen] = React.useState(false);

	// ─── Manage Recurring Templates Modal ──────────────────────────────────────
	const [isRecurringModalOpen, setIsRecurringModalOpen] = React.useState(false);

	// Calculate target progress percentage
	const progressBarPercent = React.useMemo(() => {
		if (activePocket.type === "default" || !activePocket.target) return 0;
		if (activePocket.type === "budget") {
			const expense = props.transactions
				.filter(t => (t.pocket === activePocket.name || t.pocket === activePocket.id || (t as any).pocket_id === activePocket.id) && !isInternalTransfer(t) && t.amount < 0)
				.reduce((sum, t) => sum + t.amount, 0);
			return (Math.abs(expense) / activePocket.target) * 100;
		} else {
			const balance = props.getPocketBalance(activePocket);
			return Math.max(0, (balance / activePocket.target) * 100);
		}
	}, [activePocket, props.transactions, props.getPocketBalance]);


	return (
		<motion.div 
			initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
			className="space-y-3"
		>
			<PocketCarouselCard
				pockets={props.pockets}
				activePocket={activePocket}
				activePocketIdx={props.activePocketIdx}
				setActivePocketIdx={props.setActivePocketIdx}
				themeColors={themeColors}
				isPrivate={isPrivate}
				togglePrivacy={togglePrivacy}
				isSyncing={isSyncing}
				formatCurrency={props.formatCurrency}
				totalAmount={
					activePocket.id === "net_worth" 
						? props.totalAmount 
						: props.getPocketBalance(activePocket)
				}
				transactions={props.transactions}
				variant="form"
				onSettingsClick={() => setIsDashboardSettingsOpen(true)}
				onPocketSelectClick={() => setIsPocketSelectOpen(true)}
				onCardClick={() => props.onViewDetail()}
				onMoveFundsClick={() => setIsMoveFundsOpen(true)}
			/>

			{/* Direct Pocket Selector Dialog */}
			<PocketSelectModal
				isOpen={isPocketSelectOpen}
				onOpenChange={setIsPocketSelectOpen}
				pockets={props.pockets}
				activePocketIdx={props.activePocketIdx}
				setActivePocketIdx={props.setActivePocketIdx}
				getPocketBalance={props.getPocketBalance}
				transactions={props.transactions}
				formatCurrency={props.formatCurrency}
				isPrivate={isPrivate}
				togglePrivacy={togglePrivacy}
				onManagePockets={() => {
					setIsPocketSelectOpen(false);
					setIsPocketSettingsOpen(true);
				}}
			/>

			{/* Separated Progress Bar Card */}
			<SeparatedProgressBarCard
				activePocket={activePocket}
				progressBarPercent={progressBarPercent}
				formatCurrency={props.formatCurrency}
				language={language}
				themeColors={themeColors}
			/>

			{/* Bottom Action Shortcut Buttons (Visible only under Worth overview & if Clean Display is off) */}
			{props.activePocketIdx === 0 && !isCleanDisplay && (
				<div className="grid grid-cols-2 gap-3 mt-4">
					<Button
						variant="outline"
						onClick={() => setIsRecurringModalOpen(true)}
						disabled={isSyncing}
						className="h-12 rounded-2xl font-bold flex items-center justify-center gap-2 border-none bg-white dark:bg-[#1E1E1E] hover:bg-zinc-100 dark:hover:bg-[#252525] cursor-pointer text-zinc-800 dark:text-zinc-200 text-xs shadow-[0_4px_10px_rgba(0,0,0,0.08)] transition-all"
					>
						<CalendarDays size={16} className={themeColors.text} />
						<span>{language === "en" ? "Auto Transactions" : "Transaksi Otomatis"}</span>
					</Button>
					<Button
						variant="outline"
						onClick={() => setIsPocketSettingsOpen(true)}
						disabled={isSyncing}
						className="h-12 rounded-2xl font-bold flex items-center justify-center gap-2 border-none bg-white dark:bg-[#1E1E1E] hover:bg-zinc-100 dark:hover:bg-[#252525] cursor-pointer text-zinc-800 dark:text-zinc-200 text-xs shadow-[0_4px_10px_rgba(0,0,0,0.08)] transition-all"
					>
						<Plus size={16} className={themeColors.text} />
						<span>{language === "en" ? "Manage Pockets" : "Kelola Kantong"}</span>
					</Button>
				</div>
			)}

			{/* PWA Downloader modal */}
			<PwaDownloaderModal
				isOpen={props.isAddToHomeOpen}
				onOpenChange={props.setIsAddToHomeOpen}
				isInstallable={!!props.isInstallable}
				triggerInstall={props.triggerInstall}
				themeColors={themeColors}
			/>

			{/* Profile Connection Modal */}
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
				user={props.user}
				supabaseUser={props.supabaseUser}
				isGoogleConnected={!!props.isGoogleConnected}
				googleEmail={props.googleEmail || ""}
				onGoogleLogin={props.onGoogleLogin}
				onDisconnect={props.onDisconnect}
				isSyncing={!!isSyncing}
				themeColors={themeColors}
			/>

			{/* Dashboard Settings Modal (Central Control Center) */}
			<Dialog open={isDashboardSettingsOpen} onOpenChange={setIsDashboardSettingsOpen}>
				<DialogContent className="sm:max-w-[420px] rounded-3xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Settings className={themeColors.text} size={20} />
							{language === "en" ? "Dashboard Controls" : "Kontrol Dasbor"}
						</DialogTitle>
					</DialogHeader>
					
					<div className="grid grid-cols-1 gap-2.5 pt-3">
						{/* Top Item: Profile & Sync (Displays Username & Login Method directly; click for Email & Sync details) */}
						{(() => {
							const { displayName, avatarUrl, loginMethod } = getAccountDisplayInfo(
								props.supabaseUser,
								props.user,
								!!props.isDemoMode,
								language
							);
							const isSignedIn = Boolean(props.supabaseUser || props.user);

							return (
								<button
									type="button"
									onClick={() => {
										setIsDashboardSettingsOpen(false);
										if (!isSignedIn) {
											props.onLoginClick?.();
										} else {
											setIsProfileModalOpen(true);
										}
									}}
									className="w-full p-3.5 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2C2C2C] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
								>
									<div className="flex items-center gap-3 min-w-0 flex-1">
										{avatarUrl ? (
											<img
												src={avatarUrl}
												alt="Profile"
												className="w-10 h-10 rounded-xl object-cover shrink-0"
											/>
										) : (
											<div className={`w-10 h-10 rounded-xl ${themeColors.bgLight} flex items-center justify-center shrink-0`}>
												{isSignedIn ? (
													<span className={`${themeColors.textDark} font-black text-sm uppercase`}>
														{displayName?.[0] || "U"}
													</span>
												) : (
													<User size={18} className={themeColors.text} />
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
												<span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${themeColors.bgLight} ${themeColors.textDark}`}>
													{loginMethod}
												</span>
												{isSignedIn && (
													<span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold truncate">
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
							themeColors={themeColors}
							onCloseSettings={() => setIsDashboardSettingsOpen(false)}
						/>

						{/* Data Exports with Icons (Only if transactions exist) */}
						{props.transactions.length > 0 && (
							<div className={`grid ${props.isGoogleConnected ? "grid-cols-2" : "grid-cols-1"} gap-2 pt-2`}>
								<Button
									variant="outline"
									onClick={() => {
										setIsDashboardSettingsOpen(false);
										props.exportToCSV?.();
									}}
									className="h-11 rounded-2xl font-bold text-xs cursor-pointer bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2C2C2C] border-none flex items-center justify-center gap-1.5"
								>
									<Download size={14} className={themeColors.text} />
									<span>{language === "en" ? "Export CSV" : "Ekspor CSV"}</span>
								</Button>
								{props.isGoogleConnected && (
									<Button
										variant="outline"
										onClick={() => {
											setIsDashboardSettingsOpen(false);
											props.exportToGoogleSheets?.();
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

			<RecurringTemplatesModal
				isOpen={isRecurringModalOpen}
				onOpenChange={setIsRecurringModalOpen}
				categories={props.categories}
				pockets={props.pockets}
				recurringTemplates={props.recurringTemplates}
				handleAddRecurringTemplate={props.handleAddRecurringTemplate}
				handleDeleteRecurringTemplate={props.handleDeleteRecurringTemplate}
				themeColors={themeColors}
			/>

			<PocketSettingsModal
				isOpen={isPocketSettingsOpen}
				onOpenChange={setIsPocketSettingsOpen}
				pockets={props.pockets}
				handleUpdatePockets={props.handleUpdatePockets}
				setStatusModal={props.setStatusModal}
			/>

			<MoveFundsModal
				isOpen={isMoveFundsOpen}
				onOpenChange={setIsMoveFundsOpen}
				pockets={props.pockets}
				activePocket={activePocket}
				onMoveFunds={props.onMoveFunds}
				transactions={props.transactions}
				formatCurrency={props.formatCurrency}
				themeColors={themeColors}
			/>

			<section className="rounded-3xl p-4 sm:p-5 glass-card">
				<div className="flex items-center justify-between gap-2 mb-3.5">
					<div className="flex items-center gap-1.5 min-w-0 flex-1">
						<h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
							{t("transactionEntry")}
						</h3>
						{props.pockets.length > 0 && activePocket && (
							<>
								<span className="text-zinc-300 dark:text-zinc-700 text-xs shrink-0">•</span>
								<span className={`text-xs font-bold ${themeColors.textDark} truncate`}>
									{activePocket.id === "net_worth"
										? (language === "en" ? "Main Pocket" : "Dompet Utama")
										: activePocket.name}
								</span>
							</>
						)}
					</div>
					
					{!isCleanDisplay && (
						<Button 
							size="sm" 
							variant="outline" 
							disabled={isSyncing} 
							className={`h-7 text-[10px] font-black ${themeColors.textDark} ${themeColors.bgLight} border-none ${themeColors.hoverBg} px-2.5 rounded-xl cursor-pointer flex items-center gap-1 transition-all shadow-none shrink-0`}
							onClick={handleManageFieldsClick}
						>
							<Settings size={12} /> {t("manageFields")}
						</Button>
					)}

					<ManageFieldsModal
						isOpen={props.isManageFieldsOpen}
						onOpenChange={props.setIsManageFieldsOpen}
						customFields={props.customFields}
						newFieldName={props.newFieldName}
						setNewFieldName={props.setNewFieldName}
						newFieldType={props.newFieldType}
						setNewFieldType={props.setNewFieldType}
						newFieldRequired={props.newFieldRequired}
						setNewFieldRequired={props.setNewFieldRequired}
						newOptionInput={props.newOptionInput}
						setNewOptionInput={props.setNewOptionInput}
						onAddField={props.onAddField}
						onDeleteField={props.onDeleteField}
						onRenameField={props.onRenameField}
						onAddOption={props.onAddOption}
						onDeleteOption={props.onDeleteOption}
						user={props.user}
						supabaseUser={props.supabaseUser}
						isDemoMode={!!props.isDemoMode}
						isSyncing={!!isSyncing}
						isCleanDisplay={!!isCleanDisplay}
						themeColors={themeColors}
						pockets={props.pockets}
						activePocketIdx={props.activePocketIdx}
						setActivePocketIdx={props.setActivePocketIdx}
					/>
				</div>
				<div className="space-y-3">
					{props.loading && props.headers.length === 0 ? (
						<div className="py-6 text-center text-zinc-500 font-medium text-sm">Connecting...</div>
					) : (
						displayHeaders.map((header) => {
							const hL = header.toLowerCase();
							if (hL.includes("tanggal") || hL.includes("date") || hL.includes("pocket") || hL.includes("kantong")) return null;
							const isCoreCat = hL.includes("kategori") || hL.includes("category");
							const isType = hL.includes("tipe") || hL.includes("type");
							const isAmount = hL.includes("jumlah") || hL.includes("amount");
							const isName = hL.includes("nama") || hL.includes("name");
							const customFieldIdx = props.customFields.findIndex(f => f.name.toLowerCase() === hL && (f.pocketId || "net_worth") === activePocketId);
							const customField = customFieldIdx !== -1 ? props.customFields[customFieldIdx] : null;
							const isNote = hL.includes("catatan") || hL.includes("note");

							// Collapsible optional Note field behind "+ Note" button (Filled surface, no outline, rounded-2xl)
							if (isNote) {
								const showNoteInput = isNoteExpanded || Boolean(localFormData[header]);
								if (!showNoteInput) {
									return (
										<div key={header} className="pt-0.5">
											<button
												type="button"
												disabled={isInteractionDisabled}
												onClick={() => setIsNoteExpanded(true)}
												className={`inline-flex items-center gap-1 text-xs font-bold ${themeColors.textDark} bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2E2E2E] border-none px-3.5 py-2 rounded-2xl transition-all cursor-pointer disabled:opacity-50`}
											>
												<Plus size={13} />
												<span>{props.translateHeader(header)}</span>
											</button>
										</div>
									);
								}
								return (
									<div key={header} className="relative flex items-center">
										<Input
											type="text"
											autoFocus={isNoteExpanded && !localFormData[header]}
											disabled={isInteractionDisabled}
											placeholder={`${props.translateHeader(header)}...`}
											className={`h-12 pr-9 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] focus:bg-[#EAECEF] dark:focus:bg-[#2E2E2E] shadow-none font-medium text-sm transition-colors ${themeColors.focusRingInput}`}
											value={localFormData[header] || ""}
											onChange={(e) => handleLocalInputChange(header, e.target.value)}
										/>
										{!localFormData[header] && (
											<button
												type="button"
												onClick={() => setIsNoteExpanded(false)}
												className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-xl cursor-pointer bg-transparent border-none"
												aria-label="Hide Note"
											>
												<ChevronUp size={15} />
											</button>
										)}
									</div>
								);
							}

							// Only render compact label header row for Category, Dropdowns, or custom fields (Name, Amount, Type labels omitted for compactness)
							const showFieldHeader = isCoreCat || Boolean(customField) || (!isName && !isAmount && !isType);

							return (
								<div key={header} ref={isAmount ? amountFieldRef : undefined} className="space-y-1.5">
									{showFieldHeader && (
										<div className="flex items-center justify-between ml-1">
											<Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 leading-none">
												{props.translateHeader(header)}
												{customField?.required && <span className="text-red-500 ml-1">*</span>}
											</Label>
											{(isCoreCat || customField?.type === "dropdown") && (
												<Dialog>
													<DialogTrigger render={<Button variant="ghost" size="sm" disabled={isInteractionDisabled} className={`h-5 text-[10px] font-bold ${themeColors.textDark} ${themeColors.hoverBg} px-1.5 rounded-lg cursor-pointer bg-transparent`} />}>
														{t("manageOptions")}
													</DialogTrigger>
													<DialogContent className="sm:max-w-[400px] rounded-3xl">
														<DialogHeader><DialogTitle>{isCoreCat ? t("manageCategories") : `${t("manageOptions")}: ${header}`}</DialogTitle></DialogHeader>
														<div className="space-y-4 py-4">
															<div className="flex gap-2"><Input placeholder={isCoreCat ? t("newCategory") : t("newOption")} value={isCoreCat ? props.newCategoryInput : props.newOptionInput} onChange={(e) => isCoreCat ? props.setNewCategoryInput(e.target.value) : props.setNewOptionInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525]" /><Button onClick={() => isCoreCat ? props.onAddCategory() : props.onAddOption(customFieldIdx, props.newOptionInput)} disabled={isInteractionDisabled} className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 ${themeColors.cardText} font-bold rounded-2xl cursor-pointer border-none shadow-[0_4px_10px_rgba(0,0,0,0.10)]`}>{t("add")}</Button></div>
															<div className="max-h-[200px] overflow-y-auto space-y-2">{(isCoreCat ? props.categories : customField?.options || []).map((opt: string) => (<div key={opt} className="flex items-center justify-between p-3 bg-[#F1F3F5] dark:bg-[#252525] rounded-2xl border-none">
																<span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => isCoreCat ? props.onDeleteCategory(opt) : props.onDeleteOption(customFieldIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
														</div>
													</DialogContent>
												</Dialog>
											)}
										</div>
									)}
									{(isCoreCat || (customField?.type === "dropdown")) ? (
										<Select value={localFormData[header] || ""} disabled={isInteractionDisabled} onValueChange={(val) => handleLocalInputChange(header, val || "")}>
											<SelectTrigger className={`h-12 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2C2C2C] focus:bg-[#EAECEF] dark:focus:bg-[#2E2E2E] shadow-none cursor-pointer transition-colors text-sm ${themeColors.focusRingInput}`}><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
											<SelectContent className="rounded-2xl w-auto min-w-[240px] border-none shadow-[0_8px_24px_rgba(0,0,0,0.18)]">{(isCoreCat ? props.categories : customField?.options || []).map((opt: string) => (<SelectItem key={opt} value={opt} className="cursor-pointer rounded-xl">{opt}</SelectItem>))}</SelectContent>
										</Select>
									) : isType ? (
										<div className="flex bg-[#F1F3F5] dark:bg-[#252525] p-1 rounded-2xl gap-1 border-none">
											<button
												type="button"
												className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${localFormData[header] === "Pemasukan / Income" ? `bg-white dark:bg-[#323232] ${themeColors.textDark} shadow-[0_2px_6px_rgba(0,0,0,0.08)]` : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent"}`}
												onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocalInputChange(header, "Pemasukan / Income"); }}
												disabled={isInteractionDisabled}
											>
												<TrendingUp size={16} />
												{t("income")}
											</button>
											<button
												type="button"
												className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border-none ${localFormData[header] === "Pengeluaran / Expense" ? "bg-white dark:bg-[#323232] text-red-500 shadow-[0_2px_6px_rgba(0,0,0,0.08)]" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent"}`}
												onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocalInputChange(header, "Pengeluaran / Expense"); }}
												disabled={isInteractionDisabled}
											>
												<TrendingDown size={16} />
												{t("expense")}
											</button>
										</div>
									) : isAmount ? (
										<>
											<div className="relative flex items-center w-full">
												<span className="absolute left-4 text-[11px] font-black text-zinc-400 dark:text-zinc-500 select-none pointer-events-none">
													Rp
												</span>
												<Input
													type="text"
													inputMode={isMobile ? "none" : "numeric"}
													readOnly={isMobile}
													disabled={isInteractionDisabled}
													placeholder={t("amountPlaceholder")}
													className={`h-12 w-full pl-10 pr-4 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] focus:bg-[#EAECEF] dark:focus:bg-[#2E2E2E] shadow-none font-semibold text-base transition-colors ${themeColors.focusRingInput}`}
													value={localFormData[header] || ""}
													onChange={(e) => handleAmountChange(header, e.target.value)}
													onFocus={() => isMobile && setMobileKbHeader(header)}
													onClick={() => isMobile && setMobileKbHeader(header)}
												/>
											</div>
											{isMobile && mobileKbHeader === header && (
												<NumericKeyboard
													value={localFormData[header] || ""}
													onChange={(val) => handleLocalInputChange(header, val)}
													onSubmit={() => {
														setMobileKbHeader(null);
													}}
													disabled={isInteractionDisabled}
												/>
											)}
										</>
									) : (
										<Input type="text" disabled={isInteractionDisabled} placeholder={`${props.translateHeader(header)}...`} className={`h-12 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] focus:bg-[#EAECEF] dark:focus:bg-[#2E2E2E] shadow-none font-medium text-sm transition-colors ${themeColors.focusRingInput}`} value={localFormData[header] || ""} onChange={(e) => handleLocalInputChange(header, e.target.value)} />
									)}
								</div>
							);
						})
					)}

					{props.ocrMessage && (
						<p className={`text-xs text-center font-medium mt-2 ${props.ocrMessage === t("ocrSuccess") ? "text-emerald-600" : "text-red-500"}`}>
							{props.ocrMessage}
						</p>
					)}

					{props.isInstallable && (
						<div className="flex justify-center pt-1">
							<button
								type="button"
								onClick={props.triggerInstall}
								className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline underline-offset-2 cursor-pointer bg-transparent border-none"
							>
								{language === "en" ? "Install Application" : "Instal Aplikasi"}
							</button>
						</div>
					)}
				</div>
			</section>

			{/* Backdrop for Quick Hamburger Menu */}
			<AnimatePresence>
				{isQuickMenuOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setIsQuickMenuOpen(false)}
						className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
					/>
				)}
			</AnimatePresence>

			{/* Sticky Bottom Action Navbar (Borderless layered surface, unified rounded-2xl buttons, subtle shadow) */}
			<nav
				aria-label={language === "en" ? "Quick Actions" : "Aksi Cepat"}
				className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-xl border-none px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
			>
				<div className="max-w-md mx-auto flex items-center gap-2.5 relative">
					{/* Floating Hamburger Menu Popover */}
					<AnimatePresence>
						{isQuickMenuOpen && (
							<motion.div
								initial={{ opacity: 0, y: 10, scale: 0.96 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: 10, scale: 0.96 }}
								transition={{ duration: 0.15 }}
								className="absolute bottom-[calc(100%+0.75rem)] left-0 w-64 rounded-3xl bg-white dark:bg-[#1E1E1E] border-none p-2 shadow-[0_8px_24px_rgba(0,0,0,0.18)] z-50 space-y-1"
							>
								<button
									type="button"
									disabled={isSyncing}
									onClick={() => {
										setIsQuickMenuOpen(false);
										setIsPocketSettingsOpen(true);
									}}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors cursor-pointer hover:bg-[#F1F3F5] dark:hover:bg-[#252525] text-zinc-800 dark:text-zinc-100 disabled:opacity-50`}
								>
									<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center shrink-0`}>
										<Wallet size={15} className={themeColors.textDark} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-bold leading-tight truncate">
											{language === "en" ? "Manage Pockets" : "Kelola Kantong"}
										</p>
										<p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
											{language === "en" ? "Add, edit, or delete pockets" : "Tambah, ubah, atau hapus kantong"}
										</p>
									</div>
								</button>

								<button
									type="button"
									disabled={isSyncing}
									onClick={() => {
										setIsQuickMenuOpen(false);
										setIsRecurringModalOpen(true);
									}}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors cursor-pointer hover:bg-[#F1F3F5] dark:hover:bg-[#252525] text-zinc-800 dark:text-zinc-100 disabled:opacity-50`}
								>
									<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center shrink-0`}>
										<CalendarDays size={15} className={themeColors.textDark} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-xs font-bold leading-tight truncate">
											{language === "en" ? "Auto Transactions" : "Transaksi Otomatis"}
										</p>
										<p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
											{language === "en" ? "Scheduled & recurring entries" : "Jadwal transaksi rutin"}
										</p>
									</div>
								</button>

								<button
									type="button"
									disabled={isSyncing}
									onClick={(e) => {
										setIsQuickMenuOpen(false);
										handleManageFieldsClick(e);
									}}
									className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors cursor-pointer hover:bg-[#F1F3F5] dark:hover:bg-[#252525] text-zinc-800 dark:text-zinc-100 disabled:opacity-50`}
								>
									<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center shrink-0`}>
										<Settings size={15} className={themeColors.textDark} />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<p className="text-xs font-bold leading-tight truncate">
												{t("manageFields")}
											</p>
										</div>
										<p className={`text-[10px] font-semibold ${themeColors.textDark} truncate`}>
											{activePocket?.id === "net_worth"
												? (language === "en" ? "Main Pocket" : "Dompet Utama")
												: activePocket?.name}
										</p>
									</div>
								</button>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Left Symmetrical Hamburger Button (Menu Garis Tiga) */}
					<Button
						type="button"
						variant="outline"
						onClick={() => setIsQuickMenuOpen(prev => !prev)}
						disabled={isSyncing}
						aria-label={language === "en" ? "Quick Menu" : "Menu Cepat"}
						aria-expanded={isQuickMenuOpen}
						title={language === "en" ? "Menu (Pockets, Auto, Fields)" : "Menu (Kantong, Otomatis, Field)"}
						className={`h-12 w-12 rounded-2xl border-none ${isQuickMenuOpen ? themeColors.bgLight : "bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2E2E2E]"} flex flex-col items-center justify-center gap-0.5 p-0 cursor-pointer shrink-0 text-zinc-700 dark:text-zinc-300 transition-colors shadow-none`}
					>
						{isQuickMenuOpen ? (
							<X size={17} className={themeColors.text} />
						) : (
							<Menu size={17} className={themeColors.text} />
						)}
						<span className={`text-[8px] font-black uppercase tracking-tight leading-none ${isQuickMenuOpen ? themeColors.textDark : ""}`}>
							Menu
						</span>
					</Button>

					{(() => {
						const isOcrDisabled = props.ocrLoading || props.isOcrReady === false || isInteractionDisabled || (!props.supabaseUser && !props.user && !props.isDemoMode);

						return (props.supabaseUser || props.user || props.isDemoMode) ? (
							<>
								<Button 
									disabled={isInteractionDisabled} 
									onClick={handleLocalSubmit} 
									className={`flex-1 h-12 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 ${themeColors.cardText} font-black text-sm sm:text-base rounded-2xl ${themeColors.buttonShadow} cursor-pointer border-none transition-all active:scale-[0.98] px-4 truncate`}
								>
									{(activePocket && activePocket.id !== "net_worth")
										? (language === "en" ? `Add to ${activePocket.name}` : `Catat ke ${activePocket.name}`)
										: t("addExpense")}
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={isOcrDisabled}
									onClick={props.onOcrClick}
									className={`h-12 w-12 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2E2E2E] flex flex-col items-center justify-center gap-0.5 p-0 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-none`}
									aria-label="Scan Struk / OCR Receipt Scan"
									title={language === "en" ? "Scan Receipt" : "Scan Struk"}
								>
									{props.ocrLoading ? (
										<Loader2 size={18} className={`${themeColors.text} animate-spin`} />
									) : (
										<>
											<Camera size={17} className={themeColors.text} />
											<span className={`text-[8px] font-black uppercase tracking-tight leading-none ${themeColors.textDark}`}>
												Scan
											</span>
										</>
									)}
								</Button>
							</>
						) : (
							<>
								<Button
									onClick={props.onLoginClick}
									disabled={isSyncing}
									className={`flex-1 h-12 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 ${themeColors.cardText} font-black text-sm sm:text-base rounded-2xl ${themeColors.buttonShadow} cursor-pointer border-none transition-all active:scale-[0.98]`}
								>
									{t("signIn")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={enterDemo}
									disabled={isSyncing}
									className="h-12 px-3 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] hover:bg-[#EAECEF] dark:hover:bg-[#2E2E2E] text-xs font-bold text-zinc-700 dark:text-zinc-200 cursor-pointer shrink-0 shadow-none"
								>
									{t("tryDemo")}
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={true}
									className="h-12 w-12 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#252525] flex items-center justify-center opacity-40 cursor-not-allowed shrink-0 p-0 shadow-none"
									aria-label="Scan Struk / OCR Receipt Scan"
								>
									<Camera size={18} className="text-zinc-400" />
								</Button>
							</>
						);
					})()}
				</div>
			</nav>

			{/* Close mobile keyboard when tapping outside */}
			{isMobile && mobileKbHeader && (
				<div
					className="fixed inset-0 z-[68] bg-transparent"
					onClick={() => {
						const val = localFormData[mobileKbHeader] || "";
						const cleaned = val.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
						if (cleaned) {
							const result = evaluateExpression(cleaned);
							handleLocalInputChange(mobileKbHeader, formatRupiah(result.toString()));
						}
						setMobileKbHeader(null);
					}}
				/>
			)}

			{/* Extra bottom spacing when mobile keyboard is open */}
			{isMobile && mobileKbHeader && (
				<div className="h-[310px] w-full pointer-events-none" />
			)}
		</motion.div>
	);
}

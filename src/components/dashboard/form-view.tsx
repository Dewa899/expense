"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
	Plus, 
	Link as LinkIcon, 
	History, 
	Wallet, 
	Settings2, 
	Trash2, 
	ListTree, 
	Pencil, 
	ChevronLeft, 
	TrendingUp, 
	TrendingDown, 
	Eye, 
	EyeOff, 
	ChevronDown, 
	ChevronUp,
	Download,
	Home,
	User,
	Camera,
	Loader2,
	ChevronRight
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
import { CustomFieldDef, PocketDef } from "@/hooks/use-dashboard-logic";
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/numeric-keyboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";

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

	// Pocket Props
	pockets: PocketDef[];
	activePocketIdx: number;
	setActivePocketIdx: (idx: number) => void;
	getPocketBalance: (pocket: PocketDef) => number;
	handleUpdatePockets: (list: PocketDef[]) => void;

	// PWA Props
	isAddToHomeOpen: boolean;
	setIsAddToHomeOpen: (open: boolean) => void;
	isInstallable: boolean;
	triggerInstall: () => void;
	isStandaloneMode: boolean;
}

export function FormView(props: FormViewProps) {
	const { t, language } = useLanguage();
	const isMobile = useIsMobile();
	const { enterDemo } = useDemo();

	const [editingOptionsIdx, setEditingOptionsIdx] = React.useState<number>(-1);
	const [showManualInstruction, setShowManualInstruction] = React.useState(false);
	const [renamingIdx, setRenamingIdx] = React.useState<number>(-1);
	const [renamingInput, setRenamingInput] = React.useState("");
	const [renamingType, setRenamingType] = React.useState<"text" | "dropdown">("text");
	const [renamingRequired, setRenamingRequired] = React.useState(true);

	const os = React.useMemo(() => {
		if (typeof window === "undefined") return "desktop";
		const ua = window.navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(ua)) return "ios";
		if (/android/.test(ua)) return "android";
		return "desktop";
	}, []);
	
	// Clean Coder: Privacy & Compact States
	const [isPrivate, setIsPrivate] = React.useState(false);
	const [isCompact, setIsCompact] = React.useState(false);

	// Local form data state for performance optimization (stops full parent re-renders on keystroke)
	const [localFormData, setLocalFormData] = React.useState<Record<string, string>>(props.formData);

	// Sync local state when parent props.formData changes (e.g. from OCR scanner or reset)
	React.useEffect(() => {
		setLocalFormData(props.formData);
	}, [props.formData]);

	// Mobile keyboard focus state – which amount header is focused
	const [mobileKbHeader, setMobileKbHeader] = React.useState<string | null>(null);

	// Ref to amount field container for scroll-into-view
	const amountFieldRef = React.useRef<HTMLDivElement>(null);

	// Auto-scroll focused amount field into view when the mobile keyboard slides up
	React.useEffect(() => {
		if (isMobile && mobileKbHeader && amountFieldRef.current) {
			const timer = setTimeout(() => {
				amountFieldRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 300); // 300ms is standard for keyboard animation transition
			return () => clearTimeout(timer);
		}
	}, [mobileKbHeader, isMobile]);

	const isInteractionDisabled = props.loading || props.isIntegrating || (!props.supabaseUser && !props.user && !props.isDemoMode);
	const isSyncing = props.loading || props.isIntegrating;

	React.useEffect(() => {
		setIsPrivate(localStorage.getItem("privacy_mode") === "true");
		setIsCompact(localStorage.getItem("compact_mode") === "true");
	}, []);

	// ─── Feature 6: Enter Key shortcut ──────────────────────────────────────────
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

	const toggleCompact = () => {
		const newVal = !isCompact;
		setIsCompact(newVal);
		localStorage.setItem("compact_mode", String(newVal));
	};

	const maskValue = (val: string) => isPrivate ? "******" : val;

	const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

	const handleManageFieldsClick = (e: React.MouseEvent) => {
		if (!props.user && !props.supabaseUser && !props.isDemoMode) {
			e.preventDefault();
			props.onLoginClick?.();
		}
	};

	// ─── Local state amount formatting helpers ────────────────────────────────────
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
	};

	const displayHeaders = props.headers.length > 0 ? props.headers : ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];

	// ─── Pocket / Theme Settings ────────────────────────────────────────────────
	const activePocket = props.pockets[props.activePocketIdx] || { id: "pocket_1", name: "Utama", type: "default", color: "emerald" };

	const themeColors = {
		emerald: {
			gradient: "from-emerald-500 to-teal-500",
			shadow: "shadow-emerald-500/25",
			buttonShadow: "shadow-emerald-500/20",
			text: "text-emerald-500",
			textDark: "text-emerald-600 dark:text-emerald-400",
			border: "border-emerald-500/35 dark:border-emerald-500/25",
			bgLight: "bg-emerald-500/5 dark:bg-emerald-500/10",
			hoverBg: "hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20",
			focusRing: "focus-visible:outline-emerald-500",
			focusRingInput: "focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400",
			accentText: "text-emerald-700 dark:text-emerald-300",
		},
		indigo: {
			gradient: "from-indigo-500 to-purple-500",
			shadow: "shadow-indigo-500/25",
			buttonShadow: "shadow-indigo-500/20",
			text: "text-indigo-500",
			textDark: "text-indigo-600 dark:text-indigo-400",
			border: "border-indigo-500/35 dark:border-indigo-500/25",
			bgLight: "bg-indigo-500/5 dark:bg-indigo-500/10",
			hoverBg: "hover:bg-indigo-500/15 dark:hover:bg-indigo-500/20",
			focusRing: "focus-visible:outline-indigo-500",
			focusRingInput: "focus:border-indigo-500 focus:ring-indigo-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400",
			accentText: "text-indigo-700 dark:text-indigo-300",
		},
		amber: {
			gradient: "from-amber-500 to-rose-500",
			shadow: "shadow-amber-500/25",
			buttonShadow: "shadow-amber-500/20",
			text: "text-amber-500",
			textDark: "text-amber-600 dark:text-amber-400",
			border: "border-amber-500/35 dark:border-amber-500/25",
			bgLight: "bg-amber-500/5 dark:bg-amber-500/10",
			hoverBg: "hover:bg-amber-500/15 dark:hover:bg-amber-500/20",
			focusRing: "focus-visible:outline-amber-500",
			focusRingInput: "focus:border-amber-500 focus:ring-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400",
			accentText: "text-amber-700 dark:text-amber-300",
		}
	}[activePocket.color || "emerald"];

	const [isPocketSettingsOpen, setIsPocketSettingsOpen] = React.useState(false);
	const [localPockets, setLocalPockets] = React.useState<PocketDef[]>(props.pockets);

	React.useEffect(() => {
		if (props.pockets.length > 0) {
			setLocalPockets(props.pockets);
		}
	}, [props.pockets]);

	const handleLocalPocketFieldChange = (idx: number, field: string, value: any) => {
		setLocalPockets((prev) => {
			const updated = [...prev];
			updated[idx] = { ...updated[idx], [field]: value };
			return updated;
		});
	};

	const savePocketSettings = () => {
		props.handleUpdatePockets(localPockets);
		setIsPocketSettingsOpen(false);
	};

	// Calculate target progress percentage
	const progressBarPercent = React.useMemo(() => {
		if (activePocket.type === "default" || !activePocket.target) return 0;
		if (activePocket.type === "budget") {
			// Monthly expenses
			const expense = props.transactions
				.filter(t => (t.pocket === activePocket.name || t.pocket === activePocket.id) && t.amount < 0)
				.reduce((sum, t) => sum + t.amount, 0);
			return (Math.abs(expense) / activePocket.target) * 100;
		} else {
			// Accumulated balance
			const balance = props.getPocketBalance(activePocket);
			return Math.max(0, (balance / activePocket.target) * 100);
		}
	}, [activePocket, props.transactions, props.getPocketBalance]);

	return (
		<motion.div 
			initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
			className="space-y-6"
		>
			{/* Pocket Total Amount Card with 80/20 Layout & Swipe controls */}
			<section className="mt-2 flex gap-3 items-stretch h-[170px]">
				<motion.div 
					drag="x"
					dragConstraints={{ left: 0, right: 0 }}
					onDragEnd={(e, info) => {
						const swipeThreshold = 50;
						if (info.offset.x < -swipeThreshold) {
							props.setActivePocketIdx((props.activePocketIdx + 1) % props.pockets.length);
						} else if (info.offset.x > swipeThreshold) {
							props.setActivePocketIdx((props.activePocketIdx - 1 + props.pockets.length) % props.pockets.length);
						}
					}}
					className="flex-grow flex-1 cursor-grab active:cursor-grabbing select-none h-full"
				>
					<div className={`h-full bg-gradient-to-br ${themeColors.gradient} rounded-3xl p-6 text-black shadow-lg ${themeColors.shadow} relative overflow-hidden group flex flex-col justify-between transition-colors duration-300`}>
						<div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full blur-2xl pointer-events-none" />
						
						<AnimatePresence mode="wait">
							<motion.div
								key={activePocket.id}
								initial={{ x: 20, opacity: 0 }}
								animate={{ x: 0, opacity: 1 }}
								exit={{ x: -20, opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="w-full flex-grow flex flex-col justify-between"
							>
								<div>
									<div className="flex justify-between items-start">
										<div className="flex flex-col">
											<span className="text-[9px] font-black uppercase tracking-wider opacity-60">Pocket</span>
											<h4 className="text-sm font-black uppercase tracking-wide flex items-center gap-1.5 mt-0.5">
												<Wallet size={14} className="opacity-70" />
												{activePocket.name}
											</h4>
										</div>
										<div className="flex gap-1">
											<Button 
												size="icon" 
												variant="ghost" 
												onClick={(e) => { e.stopPropagation(); togglePrivacy(); }}
												disabled={isSyncing}
												className="h-8 w-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full cursor-pointer"
											>
												{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
											</Button>
											<Button 
												size="sm" 
												onClick={(e) => { e.stopPropagation(); props.onViewDetail(); }} 
												disabled={isSyncing} 
												className="h-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full font-bold text-[10px] px-3 cursor-pointer"
											>
												<History size={12} className="mr-1" /> {t("viewDetail")}
											</Button>
										</div>
									</div>

									<div className="flex items-center justify-between mt-2">
										<h2 className="text-3xl font-black tracking-tight">{maskValue(props.formatCurrency(props.totalAmount))}</h2>
										<Button 
											size="icon" 
											variant="ghost" 
											onClick={(e) => { e.stopPropagation(); toggleCompact(); }}
											disabled={isSyncing}
											className="h-8 w-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full cursor-pointer transition-transform"
										>
											{isCompact ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
										</Button>
									</div>
								</div>

								{/* Progress target bar for Budget or Saving pocket */}
								{!isCompact && activePocket.type !== "default" && activePocket.target && (
									<div className="mt-4 space-y-1">
										<div className="flex justify-between text-[9px] font-black opacity-85">
											<span>
												{activePocket.type === "budget" 
													? `${language === "en" ? "Monthly Limit" : "Batas Bulanan"}: ${props.formatCurrency(activePocket.target)}`
													: `${language === "en" ? "Savings Goal" : "Target Tabungan"}: ${props.formatCurrency(activePocket.target)}`}
											</span>
											<span>{Math.round(progressBarPercent)}%</span>
										</div>
										<div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
											<motion.div 
												initial={{ width: 0 }}
												animate={{ width: `${Math.min(progressBarPercent, 100)}%` }}
												className={`h-full rounded-full ${
													activePocket.type === "budget"
														? progressBarPercent > 90
															? "bg-red-600"
															: progressBarPercent > 70
																? "bg-amber-600"
																: "bg-emerald-700"
														: "bg-teal-700"
												}`}
											/>
										</div>
									</div>
								)}
							</motion.div>
						</AnimatePresence>
					</div>
				</motion.div>

				{/* Right Side: Double Stacked Buttons (20%) */}
				<div className="w-[60px] flex flex-col gap-2 flex-shrink-0">
					{/* Button 1 (Top): Pocket Manager Modal */}
					<Button
						onClick={() => setIsPocketSettingsOpen(true)}
						className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm p-0 gap-1"
						aria-label="Kelola Kantong"
					>
						<Settings2 size={18} />
						<span className="text-[8px] font-black uppercase">Edit</span>
					</Button>
					
					{/* Button 2 (Bottom): Shift active pocket */}
					<Button
						onClick={() => props.setActivePocketIdx((props.activePocketIdx + 1) % props.pockets.length)}
						className="flex-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm p-0 gap-1"
						aria-label="Kantong Berikutnya"
					>
						<ChevronRight size={18} />
						<span className="text-[8px] font-black uppercase">Next</span>
					</Button>
				</div>
			</section>

			{/* Detailed Profile and Install Modal */}
			<AnimatePresence>
				{!isCompact && (
					<motion.div 
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden mt-0"
					>
						<div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-4 rounded-3xl text-[10px] font-black flex-wrap gap-y-2">
							<div className="flex items-center gap-1.5">
								<div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
									<Wallet size={12} className="opacity-50" />
								</div>
								<span>{maskValue(props.formatCurrency(props.transactions.find(t => t.category === "Initial Balance" && (t.pocket === activePocket.name || t.pocket === activePocket.id))?.amount || 0))}</span>
							</div>
							
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1.5 text-emerald-650 dark:text-emerald-450">
									<TrendingUp size={12} />
									<span>{maskValue(props.formatCurrency(props.transactions.filter(t => t.category !== "Initial Balance" && (t.pocket === activePocket.name || t.pocket === activePocket.id) && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)))}</span>
								</div>
								<div className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
								<div className="flex items-center gap-1.5 text-red-650 dark:text-red-450">
									<TrendingDown size={12} />
									<span>{maskValue(props.formatCurrency(Math.abs(props.transactions.filter(t => t.category !== "Initial Balance" && (t.pocket === activePocket.name || t.pocket === activePocket.id) && t.amount < 0).reduce((sum, t) => sum + t.amount, 0))))}</span>
								</div>
							</div>

							<div className="flex gap-1.5">
								{!props.isStandaloneMode && (
									<Button 
										size="sm" 
										variant="secondary" 
										disabled={isSyncing} 
										onClick={() => props.setIsAddToHomeOpen(true)}
										className="h-7 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-none rounded-full font-bold px-2.5 cursor-pointer flex items-center gap-1 text-[9px]"
									>
										<Download size={10} />
										Install
									</Button>
								)}

								{!props.isDemoMode && (
									<Button 
										size="sm" 
										variant="secondary" 
										onClick={() => setIsProfileModalOpen(true)} 
										disabled={isSyncing} 
										className="h-7 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-none rounded-full font-bold px-2.5 cursor-pointer text-[9px] flex items-center gap-1"
									>
										<User size={10} />
										Profile
									</Button>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* PWA Downloader instructions modal */}
			<Dialog open={props.isAddToHomeOpen} onOpenChange={props.setIsAddToHomeOpen}>
				<DialogContent className="sm:max-w-[420px] rounded-3xl overflow-hidden p-6">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Home size={20} className="text-emerald-500" />
							{t("addToHomeTitle")}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						<p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed font-semibold">
							{t("addToHomeDesc")}
						</p>
						
						<Button 
							onClick={() => {
								if (props.isInstallable) {
									props.triggerInstall();
								} else {
									setShowManualInstruction(true);
								}
							}}
							className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black h-12 rounded-xl shadow-lg ${themeColors.buttonShadow} flex items-center justify-center gap-2 transition-all cursor-pointer border-none`}
						>
							<Download size={18} />
							{props.isInstallable ? t("installApp") : t("addToHomepage")}
						</Button>

						{showManualInstruction && (
							<motion.div 
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed space-y-1.5"
							>
								{(os === "ios" ? t("iosShortInstruction") : os === "android" ? t("chromeInstructions") : t("desktopInstructions")).split("\n").map((line, idx) => (
									<p key={idx}>{line}</p>
								))}
							</motion.div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Profile Modal */}
			<Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
				<DialogContent className="sm:max-w-[425px] rounded-3xl">
					<DialogHeader>
						<DialogTitle>{t("profileAndAccount")}</DialogTitle>
					</DialogHeader>
					<div className="py-6 flex flex-col items-center text-center gap-4">
						{props.supabaseUser && (props.supabaseUser.user_metadata?.avatar_url || props.supabaseUser.user_metadata?.picture) ? (
							<img 
								src={props.supabaseUser.user_metadata.avatar_url || props.supabaseUser.user_metadata.picture} 
								className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md mb-2" 
								alt="Profile Photo" 
							/>
						) : props.user && props.user.photo ? (
							<img 
								src={props.user.photo} 
								className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md mb-2" 
								referrerPolicy="no-referrer"
								alt="Profile Photo" 
							/>
						) : (
							<div className={`w-16 h-16 rounded-full ${themeColors.bgLight} flex items-center justify-center mb-2`}>
								<User className={themeColors.text} size={32} />
							</div>
						)}
						
						{props.supabaseUser ? (
							<div className="space-y-4 w-full px-4">
								<div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left space-y-1">
									<p className="text-[10px] uppercase font-bold text-zinc-400">Account Profile</p>
									<p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{props.supabaseUser.email}</p>
								</div>
								
								<div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-4 w-full flex flex-col items-center">
									<button
										onClick={async () => {
											await supabase.auth.signOut();
											localStorage.removeItem("googleUser");
											localStorage.removeItem("sheetId");
											localStorage.removeItem("customPockets");
											window.location.reload();
										}}
										className="text-xs font-bold text-destructive hover:underline cursor-pointer"
									>
										Log Out Account
									</button>
								</div>
							</div>
						) : props.user ? (
							<div className="space-y-4 w-full px-4">
								<div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left space-y-1">
									<p className="text-[10px] uppercase font-bold text-zinc-400">Sync Status</p>
									<p className="text-sm font-bold text-emerald-650 dark:text-emerald-450">{t("googleSyncActive")}</p>
									<p className="text-[10px] text-zinc-500 truncate mt-0.5">Account: {props.user.name}</p>
								</div>
								
								<div className="flex flex-col gap-2 w-full">
									{props.headers.length > 0 && (
										<Button 
											variant="outline" 
											className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-zinc-200 dark:border-zinc-800 cursor-pointer bg-transparent"
											onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${localStorage.getItem("sheetId")}/edit`, "_blank")}
										>
											<LinkIcon size={14} />
											Open Spreadsheet
										</Button>
									)}
									<Button 
										variant="ghost" 
										className="w-full h-11 text-destructive hover:bg-destructive/10 font-bold text-xs rounded-xl cursor-pointer" 
										onClick={props.onDisconnect}
									>
										{t("googleSyncDisconnect")}
									</Button>
								</div>
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			{/* Pocket Customization Settings Dialog */}
			<Dialog open={isPocketSettingsOpen} onOpenChange={setIsPocketSettingsOpen}>
				<DialogContent className="sm:max-w-[420px] rounded-3xl overflow-hidden p-6">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Settings2 className={themeColors.text} size={20} />
							{language === "en" ? "Manage Pockets" : "Kelola Kantong"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2 max-h-[350px] overflow-y-auto pr-1">
						{localPockets.map((pocket, idx) => (
							<div key={pocket.id} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
								<div className="flex items-center justify-between">
									<span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
										pocket.color === "emerald" 
											? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
											: pocket.color === "indigo"
												? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
												: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
									}`}>
										Kantong {idx + 1}
									</span>
									{pocket.id === "pocket_1" && (
										<span className="text-[9px] text-zinc-400 uppercase font-black">Default Wallet</span>
									)}
								</div>
								
								<div className="space-y-2">
									<Label className="text-xs text-zinc-500 font-bold">{language === "en" ? "Pocket Name" : "Nama Kantong"}</Label>
									<Input
										value={pocket.name}
										disabled={pocket.id === "pocket_1"} // Utama is read-only for system integrity
										onChange={(e) => handleLocalPocketFieldChange(idx, "name", e.target.value)}
										className={`h-10 rounded-xl focus:border-${pocket.color}-500 focus:ring-1 focus:ring-${pocket.color}-500`}
										placeholder="e.g. Jajan / Tabungan"
									/>
								</div>

								{pocket.id !== "pocket_1" && (
									<>
										<div className="space-y-2">
											<Label className="text-xs text-zinc-500 font-bold">{language === "en" ? "Pocket Type" : "Tipe Kantong"}</Label>
											<Select
												value={pocket.type}
												onValueChange={(val: any) => handleLocalPocketFieldChange(idx, "type", val)}
											>
												<SelectTrigger className="h-10 rounded-xl cursor-pointer">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="rounded-xl">
													<SelectItem value="default" className="cursor-pointer">{language === "en" ? "Regular (No Target)" : "Biasa (Tanpa Target)"}</SelectItem>
													<SelectItem value="budget" className="cursor-pointer">{language === "en" ? "Monthly Budget Limit" : "Limit Anggaran Bulanan"}</SelectItem>
													<SelectItem value="saving" className="cursor-pointer">{language === "en" ? "Savings Goal" : "Target Tabungan"}</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{pocket.type !== "default" && (
											<div className="space-y-2">
												<Label className="text-xs text-zinc-500 font-bold">
													{pocket.type === "budget" 
														? (language === "en" ? "Monthly Limit (Rp)" : "Batas Bulanan (Rp)")
														: (language === "en" ? "Target Amount (Rp)" : "Target Saldo (Rp)")}
												</Label>
												<Input
													type="text"
													value={pocket.target ? formatRupiah(pocket.target.toString()) : ""}
													onChange={(e) => {
														const raw = stripRupiah(e.target.value);
														handleLocalPocketFieldChange(idx, "target", raw ? parseInt(raw, 10) : 0);
													}}
													placeholder="e.g. 1.000.000"
													className={`h-10 rounded-xl focus:border-${pocket.color}-500 focus:ring-1 focus:ring-${pocket.color}-500`}
												/>
											</div>
										)}
									</>
								)}
							</div>
						))}
					</div>
					<div className="flex gap-2 mt-4">
						<Button
							onClick={savePocketSettings}
							className={`flex-1 h-12 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black rounded-xl cursor-pointer border-none shadow-lg ${themeColors.buttonShadow}`}
						>
							{language === "en" ? "Save Changes" : "Simpan Perubahan"}
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								setLocalPockets(props.pockets);
								setIsPocketSettingsOpen(false);
							}}
							className="h-12 px-5 rounded-xl font-bold cursor-pointer bg-transparent"
						>
							{language === "en" ? "Cancel" : "Batal"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<section className="rounded-3xl p-6 glass-card">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-bold flex items-center gap-2">{t("transactionEntry")}</h3>
					
					{/* Manage Fields Dialog */}
					<Dialog open={props.isManageFieldsOpen} onOpenChange={(open) => {
						if (open && !props.user && !props.supabaseUser && !props.isDemoMode) {
							props.onLoginClick?.();
							return;
						}
						props.setIsManageFieldsOpen(open);
					}}>
						<DialogTrigger render={
							<Button 
								size="sm" 
								variant="outline" 
								disabled={isSyncing} 
								className={`h-8 text-[10px] font-black ${themeColors.textDark} ${themeColors.bgLight} border ${themeColors.border} ${themeColors.hoverBg} px-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm`}
								onClick={handleManageFieldsClick}
							>
								<Settings2 size={14} /> {t("manageFields")}
							</Button>
						} />
						<DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden">
							<DialogHeader className="px-6 pt-6">
								<DialogTitle className="flex items-center gap-2">
									{(editingOptionsIdx !== -1 || renamingIdx !== -1) && <Button variant="ghost" size="sm" onClick={() => { setEditingOptionsIdx(-1); setRenamingIdx(-1); }} className="h-8 w-8 p-0 rounded-full"><ChevronLeft size={20} /></Button>}
									{editingOptionsIdx === -1 && renamingIdx === -1 ? t("manageFields") : editingOptionsIdx !== -1 ? `${t("manageOptions")}: ${props.customFields[editingOptionsIdx].name}` : t("editField")}
								</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 p-6 pt-2">
								{editingOptionsIdx === -1 && renamingIdx === -1 ? (
									<>
										<div className="flex flex-col gap-3">
											<Input placeholder="Field Name" value={props.newFieldName} onChange={(e) => props.setNewFieldName(e.target.value)} disabled={props.customFields.length >= 2 || isInteractionDisabled} />
											<div className="flex flex-col gap-2">
												<div className="flex gap-2">
													<Select value={props.newFieldType} onValueChange={(v: any) => props.setNewFieldType(v || "text")} disabled={props.customFields.length >= 2 || isInteractionDisabled}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">{t("text")}</SelectItem><SelectItem value="dropdown">{t("dropdown")}</SelectItem></SelectContent></Select>
													<Button onClick={props.onAddField} disabled={props.customFields.length >= 2 || isInteractionDisabled || !props.newFieldName.trim()} className="bg-emerald-500 text-black font-bold px-6 cursor-pointer">{t("add")}</Button>
												</div>
												<div className="flex items-center gap-2 px-1"><input type="checkbox" id="newFieldReq" checked={props.newFieldRequired} onChange={(e) => props.setNewFieldRequired(e.target.checked)} disabled={isInteractionDisabled} className="w-4 h-4 rounded cursor-pointer" /><Label htmlFor="newFieldReq" className="text-xs font-medium cursor-pointer">{t("isRequired")}</Label></div>
											</div>
										</div>
										<div className="space-y-2 mt-4">
											{props.customFields.map((field, idx) => (
												<div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
													<div className="flex-1">
														<div className="flex items-center gap-2">
															<p className="text-sm font-bold">{field.name}</p>
															<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${field.required ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{field.required ? t("requiredLabel") : t("optionalLabel")}</span>
														</div>
														<p className="text-[10px] opacity-60 uppercase">{field.type}</p>
													</div>
													<div className="flex gap-1">
														<Button variant="ghost" size="sm" className="cursor-pointer" disabled={isInteractionDisabled} onClick={() => { setRenamingIdx(idx); setRenamingInput(field.name); setRenamingType(field.type); setRenamingRequired(field.required); }}><Pencil size={16} /></Button>
														{field.type === "dropdown" && (<Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => setEditingOptionsIdx(idx)} className="text-emerald-600 cursor-pointer"><ListTree size={16} /></Button>)}
														<Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => props.onDeleteField(idx, field.name)} className="text-destructive cursor-pointer"><Trash2 size={16} /></Button>
													</div>
												</div>
											))}
										</div>
									</>
								) : renamingIdx !== -1 ? (
									<div className="space-y-4">
										<div className="space-y-2"><Label className="text-xs">{t("name")}</Label><Input value={renamingInput} onChange={(e) => setRenamingInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-xl" /></div>
										<div className="space-y-2"><Label className="text-xs">{t("fieldType")}</Label><Select value={renamingType} onValueChange={(v: any) => setRenamingType(v || "text")} disabled={isInteractionDisabled}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text" className="cursor-pointer">{t("text")}</SelectItem><SelectItem value="dropdown" className="cursor-pointer">{t("dropdown")}</SelectItem></SelectContent></Select></div>
										<div className="flex items-center gap-2 px-1 py-1"><input type="checkbox" id="renameFieldReq" checked={renamingRequired} onChange={(e) => setRenamingRequired(e.target.checked)} disabled={isInteractionDisabled} className="cursor-pointer" /><Label htmlFor="renameFieldReq" className="text-xs font-medium cursor-pointer">{t("isRequired")}</Label></div>
										<Button onClick={() => { props.onRenameField(renamingIdx, renamingInput, renamingType, renamingRequired); setRenamingIdx(-1); }} disabled={isInteractionDisabled} className="w-full bg-emerald-500 text-black font-bold h-12 rounded-xl mt-2 cursor-pointer">{t("editField")}</Button>
									</div>
								) : (
									<div className="space-y-4">
										<div className="flex gap-2"><Input placeholder={t("newOption")} value={props.newOptionInput} onChange={(e) => props.setNewOptionInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-xl" /><Button onClick={() => props.onAddOption(editingOptionsIdx, props.newOptionInput)} disabled={isInteractionDisabled} className="bg-emerald-500 text-black font-bold rounded-xl cursor-pointer">{t("add")}</Button></div>
										<div className="max-h-[200px] overflow-y-auto space-y-2">{(props.customFields[editingOptionsIdx].options || []).map((opt: string) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"><span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => props.onDeleteOption(editingOptionsIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
									</div>
								)}
							</div>
						</DialogContent>
					</Dialog>
				</div>
				<div className="space-y-5">
					{props.loading && props.headers.length === 0 ? (
						<div className="py-10 text-center text-zinc-500 font-medium">Connecting...</div>
					) : (
						displayHeaders.map((header) => {
							const hL = header.toLowerCase();
							if (hL.includes("tanggal") || hL.includes("date") || hL.includes("pocket") || hL.includes("kantong")) return null;
							const isCoreCat = hL.includes("kategori") || hL.includes("category");
							const isType = hL.includes("tipe") || hL.includes("type");
							const isAmount = hL.includes("jumlah") || hL.includes("amount");
							const customFieldIdx = props.customFields.findIndex(f => f.name.toLowerCase() === hL);
							const customField = customFieldIdx !== -1 ? props.customFields[customFieldIdx] : null;
							const isNote = hL.includes("catatan") || hL.includes("note");

							return (
								<div key={header} ref={isAmount ? amountFieldRef : undefined} className="space-y-2">
									<div className="flex items-center justify-between ml-1">
										<Label className="text-xs text-zinc-550 dark:text-zinc-400">
											{isAmount ? t("amountLabel") : props.translateHeader(header)} 
											{customField?.required && <span className="text-red-500 ml-1">*</span>}
											{isNote && <span className="text-[10px] opacity-60 font-normal ml-1">({t("optionalLabel")})</span>}
										</Label>
										{(isCoreCat || customField?.type === "dropdown") && (
											<Dialog>
												<DialogTrigger render={<Button variant="ghost" size="sm" disabled={isInteractionDisabled} className={`h-6 text-[10px] font-bold ${themeColors.textDark} ${themeColors.hoverBg} px-2 rounded-lg cursor-pointer bg-transparent`} />}>
													{t("manageOptions")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[400px] rounded-3xl">
													<DialogHeader><DialogTitle>{isCoreCat ? t("manageCategories") : `${t("manageOptions")}: ${header}`}</DialogTitle></DialogHeader>
													<div className="space-y-4 py-4">
														<div className="flex gap-2"><Input placeholder={isCoreCat ? t("newCategory") : t("newOption")} value={isCoreCat ? props.newCategoryInput : props.newOptionInput} onChange={(e) => isCoreCat ? props.setNewCategoryInput(e.target.value) : props.setNewOptionInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-xl" /><Button onClick={() => isCoreCat ? props.onAddCategory() : props.onAddOption(customFieldIdx, props.newOptionInput)} disabled={isInteractionDisabled} className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-bold rounded-xl cursor-pointer border-none shadow-md`}>{t("add")}</Button></div>
														<div className="max-h-[200px] overflow-y-auto space-y-2">{(isCoreCat ? props.categories : customField?.options || []).map((opt: string) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
															<span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => isCoreCat ? props.onDeleteCategory(opt) : props.onDeleteOption(customFieldIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
													</div>
												</DialogContent>
											</Dialog>
										)}
									</div>
									{(isCoreCat || (customField?.type === "dropdown")) ? (
										<Select value={localFormData[header] || ""} disabled={isInteractionDisabled} onValueChange={(val) => handleLocalInputChange(header, val || "")}>
											<SelectTrigger className={`h-12 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 cursor-pointer transition-colors ${themeColors.focusRingInput}`}><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
											<SelectContent className="rounded-xl">{(isCoreCat ? props.categories : customField?.options || []).map((opt: string) => (<SelectItem key={opt} value={opt} className="cursor-pointer">{opt}</SelectItem>))}</SelectContent>
										</Select>
									) : isType ? (
										<div className="flex bg-white/30 dark:bg-zinc-950/20 p-1.5 rounded-xl gap-1 border border-zinc-250 dark:border-zinc-850">
											<button
												type="button"
												className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${localFormData[header] === "Pemasukan / Income" ? `bg-white/80 dark:bg-zinc-900/60 ${themeColors.textDark} shadow-sm border border-white/40 dark:border-white/5` : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent border border-transparent"}`}
												onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocalInputChange(header, "Pemasukan / Income"); }}
												disabled={isInteractionDisabled}
											>
												<TrendingUp size={18} />
												{t("income")}
											</button>
											<button
												type="button"
												className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${localFormData[header] === "Pengeluaran / Expense" ? "bg-white/80 dark:bg-zinc-900/60 text-red-600 shadow-sm border border-white/40 dark:border-white/5" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent border border-transparent"}`}
												onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocalInputChange(header, "Pengeluaran / Expense"); }}
												disabled={isInteractionDisabled}
											>
												<TrendingDown size={18} />
												{t("expense")}
											</button>
										</div>
									) : isAmount ? (
										<>
											<div className="relative flex items-center w-full">
												<span className="absolute left-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 select-none pointer-events-none">
													Rp
												</span>
												<Input
													type="text"
													inputMode={isMobile ? "none" : "numeric"}
													readOnly={isMobile}
													disabled={isInteractionDisabled}
													placeholder={t("amountPlaceholder")}
													className={`h-12 w-full pl-9 pr-4 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-base transition-colors ${themeColors.focusRingInput}`}
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
										<Input type="text" disabled={isInteractionDisabled} placeholder={`${props.translateHeader(header)}...`} className={`h-12 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium transition-colors ${themeColors.focusRingInput}`} value={localFormData[header] || ""} onChange={(e) => handleLocalInputChange(header, e.target.value)} />
									)}
								</div>
							);
						})
					)}
					
					{(() => {
						const isOcrDisabled = props.ocrLoading || isInteractionDisabled || (!props.supabaseUser && !props.user && !props.isDemoMode);
						
						return (props.supabaseUser || props.user || props.isDemoMode) ? (
							<div className="flex items-center gap-3 mt-4 w-full">
								<Button 
									disabled={isInteractionDisabled} 
									onClick={handleLocalSubmit} 
									className={`flex-grow h-14 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black text-lg rounded-2xl shadow-lg ${themeColors.buttonShadow} cursor-pointer border-none transition-all active:scale-[0.98]`}
								>
									{props.loading ? "..." : t("addExpense")}
								</Button>
								<Button
									type="button"
									variant="outline"
									disabled={isOcrDisabled}
									onClick={props.onOcrClick}
									className={`h-14 w-14 rounded-2xl border ${themeColors.border} ${themeColors.bgLight} ${themeColors.hoverBg} flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 bg-transparent`}
									aria-label="Scan Struk / OCR Receipt Scan"
								>
									{props.ocrLoading ? (
										<Loader2 size={24} className={`${themeColors.text} animate-spin`} />
									) : (
										<Camera size={24} className={themeColors.text} />
									)}
								</Button>
							</div>
						) : (
							<div className="flex flex-col items-center gap-2 w-full">
								<div className="flex items-center gap-3 mt-4 w-full">
									<Button onClick={props.onLoginClick} disabled={isSyncing} className={`flex-grow h-14 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black text-lg rounded-2xl shadow-lg ${themeColors.buttonShadow} cursor-pointer border-none transition-all active:scale-[0.98]`}>
										{t("signIn")}
									</Button>
									<Button
										type="button"
										variant="outline"
										disabled={true}
										className="h-14 w-14 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex items-center justify-center opacity-40 cursor-not-allowed flex-shrink-0 bg-transparent"
										aria-label="Scan Struk / OCR Receipt Scan"
									>
										<Camera size={24} className="text-zinc-400" />
									</Button>
								</div>
								<button
									type="button"
									onClick={enterDemo}
									disabled={isSyncing}
									className="text-xs font-semibold text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-2 cursor-pointer mt-2 disabled:opacity-50 bg-transparent border-none"
								>
									{t("tryDemo")}
								</button>
							</div>
						);
					})()}

					{props.ocrMessage && (
						<p className={`text-xs text-center font-medium mt-3 ${props.ocrMessage === t("ocrSuccess") ? "text-emerald-600" : "text-red-500"}`}>
							{props.ocrMessage}
						</p>
					)}
				</div>
			</section>

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

			{/* Extra bottom spacing when mobile keyboard is open so the user can scroll the input field above the keyboard */}
			{isMobile && mobileKbHeader && (
				<div className="h-[310px] w-full pointer-events-none" />
			)}
		</motion.div>
	);
}

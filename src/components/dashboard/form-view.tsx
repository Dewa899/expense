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
	AlertTriangle
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
import { CustomFieldDef, PocketDef } from "@/hooks/use-dashboard-logic";
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { PocketSelectModal } from "@/components/dashboard/modals/pocket-select-modal";
import { PocketSettingsModal } from "@/components/dashboard/modals/pocket-settings-modal";
import { RecurringTemplatesModal } from "@/components/dashboard/modals/recurring-templates-modal";
import { ManageFieldsModal } from "@/components/dashboard/modals/manage-fields-modal";
import { PocketCarouselCard } from "@/components/dashboard/cards/pocket-carousel-card";
import { MoveFundsModal } from "@/components/dashboard/modals/move-funds-modal";
import { SeparatedProgressBarCard } from "@/components/dashboard/cards/separated-progress-bar-card";
import { ProfileConnectionModal } from "@/components/dashboard/modals/profile-connection-modal";
import { PwaDownloaderModal } from "@/components/dashboard/modals/pwa-downloader-modal";
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
	
	// Clean Display & Pocket direct selector state
	const [isCleanDisplay, setIsCleanDisplay] = React.useState(false);
	const [isPocketSelectOpen, setIsPocketSelectOpen] = React.useState(false);
	const [isMoveFundsOpen, setIsMoveFundsOpen] = React.useState(false);
	React.useEffect(() => {
		setIsCleanDisplay(localStorage.getItem("clean_display") === "true");
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

	const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
	const [isDashboardSettingsOpen, setIsDashboardSettingsOpen] = React.useState(false);

	const handleManageFieldsClick = (e: React.MouseEvent) => {
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
	};

	const displayHeaders = props.headers.length > 0 ? props.headers : ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo", type: "default", color: "emerald", target: undefined } as PocketDef,
		...props.pockets
	], [props.pockets, language]);

	const activePocket = carouselPockets[props.activePocketIdx] || carouselPockets[0];

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
			navText: "text-emerald-950/50 hover:text-emerald-950/85",
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
			navText: "text-indigo-950/50 hover:text-indigo-950/85",
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
			navText: "text-amber-950/50 hover:text-amber-950/85",
		}
	}[(activePocket.color === "indigo" || activePocket.color === "amber") ? activePocket.color : "emerald"];

	const [isPocketSettingsOpen, setIsPocketSettingsOpen] = React.useState(false);

	// ─── Manage Recurring Templates Modal ──────────────────────────────────────
	const [isRecurringModalOpen, setIsRecurringModalOpen] = React.useState(false);

	// Calculate target progress percentage
	const progressBarPercent = React.useMemo(() => {
		if (activePocket.type === "default" || !activePocket.target) return 0;
		if (activePocket.type === "budget") {
			const expense = props.transactions
				.filter(t => (t.pocket === activePocket.name || t.pocket === activePocket.id) && t.amount < 0)
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
			className="space-y-6"
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
				totalAmount={props.totalAmount}
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
						className="h-12 rounded-2xl font-bold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/25 hover:bg-zinc-50 dark:hover:bg-zinc-950 cursor-pointer text-zinc-800 dark:text-zinc-200 text-xs shadow-sm transition-all"
					>
						<CalendarDays size={16} className={themeColors.text} />
						<span>{language === "en" ? "Auto Transactions" : "Transaksi Otomatis"}</span>
					</Button>
					<Button
						variant="outline"
						onClick={() => setIsPocketSettingsOpen(true)}
						disabled={isSyncing}
						className="h-12 rounded-2xl font-bold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/25 hover:bg-zinc-50 dark:hover:bg-zinc-950 cursor-pointer text-zinc-800 dark:text-zinc-200 text-xs shadow-sm transition-all"
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
				onOpenChange={setIsProfileModalOpen}
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
				<DialogContent className="sm:max-w-[420px] rounded-3xl p-6">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Settings className={themeColors.text} size={20} />
							{language === "en" ? "Dashboard Controls" : "Kontrol Dasbor"}
						</DialogTitle>
					</DialogHeader>
					
					<div className="grid grid-cols-1 gap-3 pt-4">
						{/* Item 1: Profile & Connections */}
						<Button
							variant="outline"
							onClick={() => {
								setIsDashboardSettingsOpen(false);
								if (!props.supabaseUser && !props.user) {
									props.onLoginClick?.();
								} else {
									setIsProfileModalOpen(true);
								}
							}}
							className="h-14 rounded-2xl justify-start px-5 font-bold flex items-center gap-3 border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 cursor-pointer"
						>
							<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center`}>
								<User size={18} className={themeColors.text} />
							</div>
							<div className="text-left leading-none">
								<p className="text-sm font-black">{language === "en" ? "Profile & Sync" : "Profil & Sinkronisasi"}</p>
								<p className="text-[10px] text-zinc-400 font-bold mt-0.5">{language === "en" ? "Manage account connections" : "Kelola koneksi akun"}</p>
							</div>
						</Button>

						{/* Item 2: Manage Pockets (Always Available) */}
						<Button
							variant="outline"
							onClick={() => {
								setIsDashboardSettingsOpen(false);
								setIsPocketSettingsOpen(true);
							}}
							className="h-14 rounded-2xl justify-start px-5 font-bold flex items-center gap-3 border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 cursor-pointer"
						>
							<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center`}>
								<Wallet size={18} className={themeColors.text} />
							</div>
							<div className="text-left leading-none">
								<p className="text-sm font-black">{language === "en" ? "Manage Pockets" : "Kelola Kantong"}</p>
								<p className="text-[10px] text-zinc-400 font-bold mt-0.5">{language === "en" ? "Rename and configure budgets" : "Sesuaikan nama dan limit saku"}</p>
							</div>
						</Button>

						{/* Item 3: Recurring Scheduler (Always Available) */}
						<Button
							variant="outline"
							onClick={() => {
								setIsDashboardSettingsOpen(false);
								setIsRecurringModalOpen(true);
							}}
							className="h-14 rounded-2xl justify-start px-5 font-bold flex items-center gap-3 border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 cursor-pointer"
						>
							<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center`}>
								<CalendarDays size={18} className={themeColors.text} />
							</div>
							<div className="text-left leading-none">
								<p className="text-sm font-black">{language === "en" ? "Recurring Transactions" : "Transaksi Otomatis"}</p>
								<p className="text-[10px] text-zinc-400 font-bold mt-0.5">{language === "en" ? "Automate weekly/monthly inputs" : "Atur pencatatan teratur otomatis"}</p>
							</div>
						</Button>

						{/* Item 4: Manage custom fields */}
						<Button
							variant="outline"
							onClick={(e) => {
								setIsDashboardSettingsOpen(false);
								if (!props.user && !props.supabaseUser && !props.isDemoMode) {
									props.onLoginClick?.();
								} else {
									props.setIsManageFieldsOpen(true);
								}
							}}
							className="h-14 rounded-2xl justify-start px-5 font-bold flex items-center gap-3 border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-800 dark:text-zinc-200 cursor-pointer"
						>
							<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} flex items-center justify-center`}>
								<ListTree size={18} className={themeColors.text} />
							</div>
							<div className="text-left leading-none">
								<p className="text-sm font-black">{t("manageFields")}</p>
								<p className="text-[10px] text-zinc-400 font-bold mt-0.5">{language === "en" ? "Add fields and categories" : "Tambah kolom dan kategori baru"}</p>
							</div>
						</Button>

						{/* Item 5 & 6: Data Exports (Only if transactions exist) */}
						{props.transactions.length > 0 && (
							<div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-850">
								<Button
									variant="outline"
									onClick={() => {
										setIsDashboardSettingsOpen(false);
										props.exportToCSV?.();
									}}
									className="h-10 rounded-xl font-bold text-xs cursor-pointer bg-transparent border-zinc-200 dark:border-zinc-800"
								>
									{language === "en" ? "Export CSV" : "Ekspor CSV"}
								</Button>
								{props.isGoogleConnected && (
									<Button
										variant="outline"
										onClick={() => {
											setIsDashboardSettingsOpen(false);
											props.exportToGoogleSheets?.();
										}}
										className={`h-10 rounded-xl font-bold text-xs cursor-pointer text-emerald-600 bg-emerald-500/5 border-emerald-500/35 hover:bg-emerald-500/10`}
									>
										{language === "en" ? "Sync Sheets" : "Sinkron Sheets"}
									</Button>
								)}
							</div>
						)}
						{/* Item 7: Clean Display Mode preference */}
						<div className="flex flex-col gap-2 p-4 bg-zinc-550/5 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-850 mt-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="cleanDisplay" className="text-xs font-bold cursor-pointer text-zinc-800 dark:text-zinc-200">
									{language === "en" ? "Clean Display Mode" : "Mode Tampilan Bersih"}
								</Label>
								<input 
									type="checkbox" 
									id="cleanDisplay" 
									checked={isCleanDisplay}
									onChange={(e) => {
										const checked = e.target.checked;
										setIsCleanDisplay(checked);
										localStorage.setItem("clean_display", String(checked));
									}}
									className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
								/>
							</div>
							<p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold leading-normal">
								{language === "en" 
									? "Hide 'Auto Transactions' and 'Manage Pockets' shortcut buttons from the main screen. They remain accessible here anytime." 
									: "Sembunyikan tombol pintasan 'Transaksi Otomatis' dan 'Kelola Kantong' dari layar utama. Fitur ini tetap dapat diakses dari menu ini."}
							</p>
						</div>
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
				themeColors={themeColors}
			/>

			<section className="rounded-3xl p-6 glass-card">
				<div className="flex items-center justify-between mb-6">
					<div className="flex flex-col">
						<h3 className="text-lg font-bold flex items-center gap-2">{t("transactionEntry")}</h3>
						{activePocket && activePocket.id !== "net_worth" && (
							<span className={`text-xs font-bold ${themeColors.textDark} mt-0.5`}>
								{language === "en" ? `On Pocket: ${activePocket.name}` : `Di Kantong: ${activePocket.name}`}
							</span>
						)}
					</div>
					
					{!isCleanDisplay && (
						<Button 
							size="sm" 
							variant="outline" 
							disabled={isSyncing} 
							className={`h-8 text-[10px] font-black ${themeColors.textDark} ${themeColors.bgLight} border ${themeColors.border} ${themeColors.hoverBg} px-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm`}
							onClick={handleManageFieldsClick}
						>
							<Settings size={14} /> {t("manageFields")}
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
					/>
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
											<SelectContent className="rounded-xl w-auto min-w-[240px]">{(isCoreCat ? props.categories : customField?.options || []).map((opt: string) => (<SelectItem key={opt} value={opt} className="cursor-pointer">{opt}</SelectItem>))}</SelectContent>
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
												className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${localFormData[header] === "Pengeluaran / Expense" ? "bg-white/80 dark:bg-zinc-900/60 text-red-650 shadow-sm border border-white/40 dark:border-white/5" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent border border-transparent"}`}
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
							<div className="flex flex-col items-center w-full gap-2">
								<div className="flex items-center gap-3 mt-4 w-full">
									<Button 
										disabled={isInteractionDisabled} 
										onClick={handleLocalSubmit} 
										className={`flex-grow h-14 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black text-lg rounded-2xl shadow-lg ${themeColors.buttonShadow} cursor-pointer border-none transition-all active:scale-[0.98]`}
									>
										{props.loading 
											? "..." 
											: (activePocket && activePocket.id !== "net_worth")
												? (language === "en" ? `Add to ${activePocket.name}` : `Catat ke ${activePocket.name}`)
												: t("addExpense")}
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

								{/* PWA Install Button position moved to bottom of quickAdd card */}
								{props.isInstallable && (
									<button
										type="button"
										onClick={props.triggerInstall}
										className="text-xs font-semibold text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline underline-offset-2 cursor-pointer mt-2 bg-transparent border-none"
									>
										{language === "en" ? "Install Application" : "Instal Aplikasi"}
									</button>
								)}
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

			{/* Extra bottom spacing when mobile keyboard is open */}
			{isMobile && mobileKbHeader && (
				<div className="h-[310px] w-full pointer-events-none" />
			)}
		</motion.div>
	);
}

"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowLeft, CalendarDays, TrendingUp, TrendingDown, PieChart as PieChartIcon, Wallet, Plus, Trash2, Loader2, ArrowRight, Settings, ChevronLeft, ChevronRight, Eye, EyeOff, AlertTriangle } from "lucide-react";
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
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { Transaction, CustomFieldDef, CustomChartConfig, PocketDef } from "@/hooks/use-dashboard-logic";
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { PocketSelectModal } from "@/components/dashboard/modals/pocket-select-modal";
import { PocketSettingsModal } from "@/components/dashboard/modals/pocket-settings-modal";
import { TransactionHistoryTable } from "@/components/dashboard/cards/transaction-history-table";
import { PocketCarouselCard } from "@/components/dashboard/cards/pocket-carousel-card";
import { MoveFundsModal } from "@/components/dashboard/modals/move-funds-modal";
import { DetailedBalanceSummary } from "@/components/dashboard/cards/detailed-balance-summary";
import { AnalyticsCharts } from "@/components/dashboard/charts/analytics-charts";

interface AnalyticsViewProps {
	headers: string[];
	transactions: Transaction[];
	availableMonths: string[];
	selectedMonth: string;
	loading: boolean;
	user: any;
	supabaseUser?: any;
	customFields: CustomFieldDef[];
	customChartConfigs: CustomChartConfig[];
	onBack: () => void;
	onMonthChange: (month: string | null) => void;
	onAddCustomChart: (config: CustomChartConfig) => void;
	onDeleteCustomChart: (idx: number) => void;
	onSetInitialBalance: (amount: number) => void;
	onSyncPreviousBalance: () => void;
	onGoogleLogin: (forceAccountSelection?: boolean) => void;
	formatCurrency: (val: number) => string;
	exportToCSV: () => void;
	exportToGoogleSheets: () => void;

	// Pocket props
	pockets: PocketDef[];
	activePocketIdx: number;
	setActivePocketIdx: (idx: number) => void;
	getPocketBalance: (pocket: PocketDef) => number;
	handleUpdatePockets: (list: PocketDef[]) => void;
	setStatusModal: (state: any) => void;
	onMoveFunds: (source: string, target: string, amount: number) => void;
}

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="glass-card p-4 rounded-2xl">
				<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
				{payload.map((item: any, index: number) => {
					const color = item.color || item.payload?.fill || item.fill || (item.stroke && item.stroke !== "#fff" && item.stroke !== "#ffffff" ? item.stroke : "#10b981");
					return (
						<p key={index} className="text-sm font-black flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
							<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
							<span className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{item.name}:</span> 
							<span className="font-extrabold">{formatCurrency(Math.abs(item.value))}</span>
						</p>
					);
				})}
			</div>
		);
	}
	return null;
};

const CATEGORICAL_COLORS = [
	"#10b981", // Emerald
	"#6366f1", // Indigo
	"#f59e0b", // Amber
	"#ec4899", // Pink
	"#06b6d4", // Cyan
	"#8b5cf6", // Purple/Violet
	"#f97316", // Orange
	"#ef4444", // Red
	"#3b82f6", // Blue
	"#14b8a6", // Teal
	"#fb7185", // Rose
	"#34d399", // Mint
	"#fbbf24", // Yellow
	"#818cf8"  // Lavender
];

export function AnalyticsView({
	headers,
	transactions,
	availableMonths,
	selectedMonth,
	loading,
	user,
	supabaseUser,
	customFields,
	customChartConfigs,
	onBack,
	onMonthChange,
	onAddCustomChart,
	onDeleteCustomChart,
	onSetInitialBalance,
	onSyncPreviousBalance,
	onGoogleLogin,
	formatCurrency,
	exportToCSV,
	exportToGoogleSheets,
	
	pockets,
	activePocketIdx,
	setActivePocketIdx,
	getPocketBalance,
	handleUpdatePockets,
	setStatusModal,
	onMoveFunds
}: AnalyticsViewProps) {
	const { t, language } = useLanguage();
	const isMobile = useIsMobile();
	const [isPocketSettingsOpen, setIsPocketSettingsOpen] = React.useState(false);
	const [isAddChartOpen, setIsAddCustomChartOpen] = React.useState(false);
	const [manualBalanceInput, setManualBalanceInput] = React.useState("");
	const [isPocketSelectOpen, setIsPocketSelectOpen] = React.useState(false);
	const [isMoveFundsOpen, setIsMoveFundsOpen] = React.useState(false);
	const [newChartField, setNewChartField] = React.useState("");
	const [newChartType, setNewChartType] = React.useState<"income" | "expense">("expense");

	// Privacy State
	const [isPrivate, setIsPrivate] = React.useState(false);
	React.useEffect(() => {
		setIsPrivate(localStorage.getItem("privacy_mode") === "true");
	}, []);
	const togglePrivacy = () => {
		const newVal = !isPrivate;
		setIsPrivate(newVal);
		localStorage.setItem("privacy_mode", String(newVal));
	};
	const maskValue = (val: string) => isPrivate ? "******" : val;

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo", type: "default" as const, color: "emerald", target: undefined },
		...pockets
	], [pockets, language]);

	const activePocket = carouselPockets[activePocketIdx] || carouselPockets[0];
	const isNetWorth = activePocket.id === "net_worth";

	const themeColors = {
		emerald: {
			gradient: "from-emerald-500 to-teal-500",
			shadow: "shadow-emerald-500/25",
			text: "text-emerald-500",
			textDark: "text-emerald-600 dark:text-emerald-400",
			bgLight: "bg-emerald-500/5 dark:bg-emerald-500/10",
			border: "border-emerald-500/35 dark:border-emerald-500/25",
			accentText: "text-emerald-700 dark:text-emerald-300",
			accentBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
			accentHex: "#10b981",
			chartPalette: ["#10b981", "#059669", "#047857", "#065f46", "#064e3b", "#022c22"],
			navText: "text-emerald-950/50 hover:text-emerald-950/85",
		},
		indigo: {
			gradient: "from-indigo-500 to-purple-500",
			shadow: "shadow-indigo-500/25",
			text: "text-indigo-500",
			textDark: "text-indigo-600 dark:text-indigo-400",
			bgLight: "bg-indigo-500/5 dark:bg-indigo-500/10",
			border: "border-indigo-500/35 dark:border-indigo-500/25",
			accentText: "text-indigo-700 dark:text-indigo-300",
			accentBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
			accentHex: "#6366f1",
			chartPalette: ["#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81", "#1e1b4b"],
			navText: "text-indigo-950/50 hover:text-indigo-950/85",
		},
		amber: {
			gradient: "from-amber-500 to-rose-500",
			shadow: "shadow-amber-500/25",
			text: "text-amber-500",
			textDark: "text-amber-600 dark:text-amber-400",
			bgLight: "bg-amber-500/5 dark:bg-amber-500/10",
			border: "border-amber-500/35 dark:border-amber-500/25",
			accentText: "text-amber-700 dark:text-amber-300",
			accentBg: "bg-amber-500/10 dark:bg-amber-500/20",
			accentHex: "#f59e0b",
			chartPalette: ["#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f", "#451a03"],
			navText: "text-amber-950/50 hover:text-amber-950/85",
		},
		rose: {
			gradient: "from-rose-500 to-pink-500",
			shadow: "shadow-rose-500/25",
			text: "text-rose-500",
			textDark: "text-rose-600 dark:text-rose-400",
			bgLight: "bg-rose-500/5 dark:bg-rose-500/10",
			border: "border-rose-500/35 dark:border-rose-500/25",
			accentText: "text-rose-700 dark:text-rose-300",
			accentBg: "bg-rose-500/10 dark:bg-rose-500/20",
			accentHex: "#f43f5e",
			chartPalette: ["#f43f5e", "#e11d48", "#be123c", "#9f1239", "#881337", "#4c0519"],
			navText: "text-rose-950/50 hover:text-rose-950/85",
		},
		cyan: {
			gradient: "from-cyan-500 to-blue-500",
			shadow: "shadow-cyan-500/25",
			text: "text-cyan-500",
			textDark: "text-cyan-600 dark:text-cyan-400",
			bgLight: "bg-cyan-500/5 dark:bg-cyan-500/10",
			border: "border-cyan-500/35 dark:border-cyan-500/25",
			accentText: "text-cyan-700 dark:text-cyan-300",
			accentBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
			accentHex: "#06b6d4",
			chartPalette: ["#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63", "#083344"],
			navText: "text-cyan-950/50 hover:text-cyan-950/85",
		},
		violet: {
			gradient: "from-violet-500 to-fuchsia-500",
			shadow: "shadow-violet-500/25",
			text: "text-violet-500",
			textDark: "text-violet-600 dark:text-violet-400",
			bgLight: "bg-violet-500/5 dark:bg-violet-500/10",
			border: "border-violet-500/35 dark:border-violet-500/25",
			accentText: "text-violet-700 dark:text-violet-300",
			accentBg: "bg-violet-500/10 dark:bg-violet-500/20",
			accentHex: "#8b5cf6",
			chartPalette: ["#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95", "#2e1065"],
			navText: "text-violet-950/50 hover:text-violet-950/85",
		},
		orange: {
			gradient: "from-orange-500 to-yellow-500",
			shadow: "shadow-orange-500/25",
			text: "text-orange-500",
			textDark: "text-orange-600 dark:text-orange-400",
			bgLight: "bg-orange-500/5 dark:bg-orange-500/10",
			border: "border-orange-500/35 dark:border-orange-500/25",
			accentText: "text-orange-700 dark:text-orange-300",
			accentBg: "bg-orange-500/10 dark:bg-orange-500/20",
			accentHex: "#f97316",
			chartPalette: ["#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12", "#431407"],
			navText: "text-orange-950/50 hover:text-orange-950/85",
		}
	}[activePocket.color || "emerald"];

	const pocketTransactions = React.useMemo(() => {
		if (activePocket.id === "net_worth") return transactions;
		return transactions.filter(t => t.pocket === activePocket.name || t.pocket === activePocket.id);
	}, [transactions, activePocket]);

	const initialBalanceEntry = React.useMemo(() => {
		return pocketTransactions.find(t => t.category === "Initial Balance");
	}, [pocketTransactions]);

	const startingBalance = initialBalanceEntry ? initialBalanceEntry.amount : 0;

	// Pocket progression calculation
	const currentProgress = React.useMemo(() => {
		if (activePocket.id === "net_worth") return 0;
		if (activePocket.type === "budget") {
			return Math.abs(
				pocketTransactions
					.filter(t => t.category !== "Initial Balance" && t.amount < 0)
					.reduce((sum, t) => sum + t.amount, 0)
			);
		}
		if (activePocket.type === "saving") {
			return Math.max(0, getPocketBalance(activePocket));
		}
		return 0;
	}, [activePocket, pocketTransactions, getPocketBalance]);

	const percentage = React.useMemo(() => {
		if (activePocket.id === "net_worth" || !activePocket.target) return 0;
		return Math.round((currentProgress / activePocket.target) * 100);
	}, [activePocket, currentProgress]);
	
	const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

	const currentMonthName = new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });
	const isPastMonth = selectedMonth !== currentMonthName;

	const hasPastMonthInAvailable = () => {
		if (availableMonths.length <= 1) return false;
		const parseMonthYear = (myStr: string) => {
			const [mName, yStr] = myStr.split(' ');
			const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
			return {
				month: months.indexOf(mName),
				year: parseInt(yStr) || new Date().getFullYear()
			};
		};
		const sel = parseMonthYear(selectedMonth);
		return availableMonths.some(m => {
			if (m === selectedMonth) return false;
			const p = parseMonthYear(m);
			if (p.year < sel.year) return true;
			if (p.year === sel.year && p.month < sel.month) return true;
			return false;
		});
	};
	const hasPastTransactions = hasPastMonthInAvailable();

	const isManualOverride = !initialBalanceEntry || (
		initialBalanceEntry.note === "Manual Setup" || 
		initialBalanceEntry.name.includes("Manual Setup")
	);
	const balanceStatus = initialBalanceEntry 
		? (isManualOverride ? "Kustom (Manual Setup)" : "Otomatis (Carry-Over)")
		: "Belum Ditentukan";
	


	const monthlyTransactions = pocketTransactions.filter(t => t.category !== "Initial Balance");
	const incomeTotal = monthlyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
	const expenseTotal = Math.abs(monthlyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
	
	const netBalance = startingBalance + incomeTotal - expenseTotal;

	const getDailyData = () => {
		const dailyMap: Record<string, { income: number, expense: number }> = {};
		monthlyTransactions.forEach(t => {
			const day = t.date.split(',')[0];
			if (!dailyMap[day]) dailyMap[day] = { income: 0, expense: 0 };
			if (t.amount > 0) {
				dailyMap[day].income += Math.abs(t.amount);
			} else {
				dailyMap[day].expense += Math.abs(t.amount);
			}
		});
		return Object.entries(dailyMap).map(([name, data]) => ({ name, income: data.income, expense: data.expense })).slice(-7);
	};

	const getGroupedCategoryData = (isExpense: boolean) => {
		const catMap: Record<string, number> = {};
		monthlyTransactions.filter(t => isExpense ? t.amount < 0 : t.amount > 0).forEach(t => {
			const cat = t.category || "Uncategorized";
			catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
		});
		return Object.entries(catMap).map(([name, value]) => ({ name, value }));
	};

	const getCustomChartData = (fieldName: string, type: "income" | "expense") => {
		const dataMap: Record<string, number> = {};
		const fieldNameLower = fieldName.toLowerCase();
		const fieldIdx = headers.findIndex(h => h.toLowerCase() === fieldNameLower);
		if (fieldIdx === -1) return [];

		monthlyTransactions.filter(t => type === "expense" ? t.amount < 0 : t.amount > 0).forEach(t => {
			let val = "N/A";
			if (t.raw) {
				if (Array.isArray(t.raw)) {
					val = t.raw[fieldIdx] || "N/A";
				} else if (typeof t.raw === "object") {
					const key = Object.keys(t.raw).find(k => k.toLowerCase() === fieldNameLower);
					val = key ? t.raw[key] || "N/A" : "N/A";
				}
			}
			const valStr = val.toString().trim() || "N/A";
			dataMap[valStr] = (dataMap[valStr] || 0) + Math.abs(t.amount);
		});
		return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
	};

	const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

	return (
		<motion.div 
			initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
			className="space-y-6 pb-20"
		>
			<header className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-4">
					<Button variant="ghost" size="sm" onClick={onBack} className="rounded-full h-10 w-10 p-0 cursor-pointer">
						<ArrowLeft size={20} />
					</Button>
					<h3 className="text-xl font-black flex-1">{t("detailedDashboard")}</h3>
				</div>
				
				<div className="flex items-center gap-2 glass-card p-2 rounded-2xl">
					<CalendarDays className="text-emerald-500 ml-2" size={18} />
					<Select value={selectedMonth} onValueChange={onMonthChange} disabled={loading}>
						<SelectTrigger className="border-none bg-transparent shadow-none focus:ring-0 font-bold text-sm h-10 cursor-pointer">
							<SelectValue placeholder={t("selectMonth")} />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							{availableMonths.map(m => (
								<SelectItem key={m} value={m} className="cursor-pointer">{m}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</header>

			<DetailedBalanceSummary
				carouselCard={
					<PocketCarouselCard
						pockets={pockets}
						activePocket={activePocket}
						activePocketIdx={activePocketIdx}
						setActivePocketIdx={setActivePocketIdx}
						themeColors={themeColors}
						isPrivate={isPrivate}
						togglePrivacy={togglePrivacy}
						isSyncing={loading}
						formatCurrency={formatCurrency}
						totalAmount={netBalance}
						transactions={transactions}
						variant="analytics"
						onPocketSelectClick={() => setIsPocketSelectOpen(true)}
						onMoveFundsClick={() => setIsMoveFundsOpen(true)}
					/>
				}
				isNetWorth={isNetWorth}
				activePocket={activePocket}
				startingBalance={startingBalance}
				incomeTotal={incomeTotal}
				expenseTotal={expenseTotal}
				formatCurrency={formatCurrency}
				selectedMonth={selectedMonth}
				isPastMonth={isPastMonth}
				user={user}
				supabaseUser={supabaseUser}
				balanceStatus={balanceStatus}
				isManualOverride={isManualOverride}
				initialBalanceEntry={initialBalanceEntry}
				onSyncPreviousBalance={onSyncPreviousBalance}
				manualBalanceInput={manualBalanceInput}
				setManualBalanceInput={setManualBalanceInput}
				onUpdateInitialBalance={() => onSetInitialBalance(parseFloat(stripRupiah(manualBalanceInput)) || 0)}
				themeColors={themeColors}
				percentage={percentage}
				currentProgress={currentProgress}
				onManagePockets={() => setIsPocketSettingsOpen(true)}
			/>

			{loading ? (
				<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-4">
					<Loader2 className="animate-spin" size={48} />
					<p className="font-bold uppercase tracking-widest text-[10px]">Processing Data...</p>
				</div>
			) : transactions.length > 0 ? (
				<div className="space-y-6">
					<AnalyticsCharts
						loading={loading}
						transactions={transactions}
						getDailyData={getDailyData}
						themeColors={themeColors}
						formatCurrency={formatCurrency}
						getGroupedCategoryData={getGroupedCategoryData}
						customChartConfigs={customChartConfigs}
						getCustomChartData={getCustomChartData}
						onDeleteCustomChart={onDeleteCustomChart}
						customFields={customFields}
						newChartField={newChartField}
						setNewChartField={setNewChartField}
						newChartType={newChartType}
						setNewChartType={setNewChartType}
						onAddCustomChart={onAddCustomChart}
					/>

					{/* Custom Compact Table for Current Month Transactions */}
					<TransactionHistoryTable
						monthlyTransactions={monthlyTransactions}
						pockets={pockets}
						formatCurrency={formatCurrency}
						exportToCSV={exportToCSV}
						exportToGoogleSheets={exportToGoogleSheets}
						supabaseUser={supabaseUser}
						loading={loading}
						themeColors={themeColors}
					/>
				</div>
			) : (
				<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-4">
					<Image 
						src="/illustrations/file-not-found.webp" 
						alt="No data found" 
						width={200} 
						height={200} 
					/>
					<p className="font-bold text-[10px] uppercase tracking-widest text-zinc-400">{t("noDataFound")}</p>
				</div>
			)}
			{/* Direct Pocket Selector Dialog */}
			<PocketSelectModal
				isOpen={isPocketSelectOpen}
				onOpenChange={setIsPocketSelectOpen}
				pockets={pockets}
				activePocketIdx={activePocketIdx}
				setActivePocketIdx={setActivePocketIdx}
				getPocketBalance={getPocketBalance}
				transactions={transactions}
				formatCurrency={formatCurrency}
				isPrivate={isPrivate}
				togglePrivacy={togglePrivacy}
			/>

			<PocketSettingsModal
				isOpen={isPocketSettingsOpen}
				onOpenChange={setIsPocketSettingsOpen}
				pockets={pockets}
				handleUpdatePockets={handleUpdatePockets}
				setStatusModal={setStatusModal}
			/>

			<MoveFundsModal
				isOpen={isMoveFundsOpen}
				onOpenChange={setIsMoveFundsOpen}
				pockets={pockets}
				activePocket={activePocket}
				onMoveFunds={onMoveFunds}
				themeColors={themeColors}
			/>
		</motion.div>
	);
}

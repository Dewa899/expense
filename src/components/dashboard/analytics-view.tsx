"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowLeft, CalendarDays, TrendingUp, TrendingDown, PieChart as PieChartIcon, Wallet, Plus, Trash2, Loader2, ArrowRight, Settings, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
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
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/numeric-keyboard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	AreaChart,
	Area
} from "recharts";
import { Transaction, CustomFieldDef, CustomChartConfig, PocketDef } from "@/hooks/use-dashboard-logic";

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
	getPocketBalance
}: AnalyticsViewProps) {
	const { t, language } = useLanguage();
	const isMobile = useIsMobile();
	const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = React.useState(false);
	const [isAddChartOpen, setIsAddCustomChartOpen] = React.useState(false);
	const [isSetupBalanceOpen, setIsSetupBalanceOpen] = React.useState(false);
	const [isSyncModalOpen, setIsSyncModalOpen] = React.useState(false);
	const [manualBalanceInput, setManualBalanceInput] = React.useState("");
	const [isPocketSelectOpen, setIsPocketSelectOpen] = React.useState(false);

	const handleManualBalanceChange = (raw: string) => {
		const digits = stripRupiah(raw);
		const formatted = digits ? formatRupiah(digits) : "";
		setManualBalanceInput(formatted);
	};
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
		{ id: "net_worth", name: language === "en" ? "Total Worth" : "Total Kekayaan", type: "default" as const, color: "emerald", target: undefined },
		...pockets
	], [pockets, language]);

	const activePocket = carouselPockets[activePocketIdx] || carouselPockets[0];

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
		}
	}[(activePocket.color === "indigo" || activePocket.color === "amber") ? activePocket.color : "emerald"];

	const pocketTransactions = React.useMemo(() => {
		if (activePocket.id === "net_worth") return transactions;
		return transactions.filter(t => t.pocket === activePocket.name || t.pocket === activePocket.id);
	}, [transactions, activePocket]);

	const initialBalanceEntry = React.useMemo(() => {
		return pocketTransactions.find(t => t.category === "Initial Balance");
	}, [pocketTransactions]);

	const startingBalance = initialBalanceEntry ? initialBalanceEntry.amount : 0;
	
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
	
	// Motion values for drag tracker
	const dragX = useMotionValue(0);
	const dragY = useMotionValue(0);

	// Custom transforms for background cards stack peek effect
	const leftPeekX = useTransform(dragX, (x) => x > 0 ? x * -0.15 : 0);
	const leftPeekOpacity = useTransform(dragX, (x) => x > 0 ? Math.min(x / 30, 0.95) : 0);
	
	const rightPeekX = useTransform(dragX, (x) => x < 0 ? x * -0.15 : 0);
	const rightPeekOpacity = useTransform(dragX, (x) => x < 0 ? Math.min(Math.abs(x) / 30, 0.95) : 0);

	const horizontalPeekScale = useTransform(dragX, (x) => {
		const absX = Math.abs(x);
		return Math.min(0.90 + (absX / 600), 0.96);
	});

	const verticalStack1Y = useTransform(dragY, (y) => Math.max(0, y * 0.45));
	const verticalStack1Scale = useTransform(dragY, (y) => Math.min(0.95, 0.90 + (y / 1000)));
	const verticalStack1Opacity = useTransform(dragY, (y) => y > 0 ? Math.min(y / 40, 0.9) : 0);

	const verticalStack2Y = useTransform(dragY, (y) => Math.max(0, y * 0.22));
	const verticalStack2Scale = useTransform(dragY, (y) => Math.min(0.90, 0.84 + (y / 1500)));
	const verticalStack2Opacity = useTransform(dragY, (y) => y > 0 ? Math.min(y / 60, 0.75) : 0);

	// Pre-calculated target pocket colors
	const prevPocket = carouselPockets[(activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length];
	const prevColorKey = (prevPocket.color === "indigo" || prevPocket.color === "amber") ? prevPocket.color : "emerald";
	const prevGradient = {
		emerald: "from-emerald-500/80 to-teal-500/80",
		indigo: "from-indigo-500/80 to-purple-500/80",
		amber: "from-amber-500/80 to-rose-500/80"
	}[prevColorKey];

	const nextPocket = carouselPockets[(activePocketIdx + 1) % carouselPockets.length];
	const nextColorKey = (nextPocket.color === "indigo" || nextPocket.color === "amber") ? nextPocket.color : "emerald";
	const nextGradient = {
		emerald: "from-emerald-500/80 to-teal-500/80",
		indigo: "from-indigo-500/80 to-purple-500/80",
		amber: "from-amber-500/80 to-rose-500/80"
	}[nextColorKey];

	const stack2Pocket = carouselPockets[(activePocketIdx + 2) % carouselPockets.length];
	const stack2ColorKey = (stack2Pocket.color === "indigo" || stack2Pocket.color === "amber") ? stack2Pocket.color : "emerald";
	const stack2Gradient = {
		emerald: "from-emerald-500/60 to-teal-500/60",
		indigo: "from-indigo-500/60 to-purple-500/60",
		amber: "from-amber-500/60 to-rose-500/60"
	}[stack2ColorKey];

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

			{/* Detailed Balance Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="glass-card p-6 rounded-[32px] flex flex-col justify-between min-h-[140px]">
					<div>
						<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t("startingBalance")}</p>
						<h4 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(startingBalance)}</h4>
					</div>
					
					{/* Smart Setup/Manage Button: Always visible */}
					<div className="flex flex-col gap-2 mt-4">
						<Dialog open={isSetupBalanceOpen} onOpenChange={(open) => {
							if (open && !user && !supabaseUser) {
								setIsSyncModalOpen(true);
								return;
							}
							setIsSetupBalanceOpen(open);
						}}>
							<DialogTrigger render={
								<Button 
									variant="ghost" 
									className="h-auto p-0 flex items-center gap-2 text-zinc-500 hover:text-zinc-700 hover:bg-transparent justify-start cursor-pointer group"
								>
									<div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
										<Settings size={14} />
									</div>
									<span className="text-[10px] font-black uppercase tracking-tight">
										{isPastMonth 
											? (language === "en" ? "View Initial Balance" : "Lihat Saldo Awal") 
											: (language === "en" ? "Manage Initial Balance" : "Kelola Saldo Awal")}
									</span>
								</Button>
							} />
							<DialogContent className="sm:max-w-[420px] rounded-3xl max-h-[90vh] overflow-y-auto">
								<DialogHeader>
									<DialogTitle>{language === "en" ? "Manage Initial Balance" : "Kelola Saldo Awal"}</DialogTitle>
									<DialogDescription>
										{language === "en" 
											? `Determine how the starting balance for the month of ${selectedMonth} is calculated.`
											: `Tentukan bagaimana saldo awal untuk bulan ${selectedMonth} dihitung.`}
									</DialogDescription>
								</DialogHeader>
								<div className="py-4 space-y-4">
									{isPastMonth && (
										<div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-xs font-medium space-y-1">
											<p className="font-bold flex items-center gap-1.5">
												{language === "en" ? "🔒 Locked Data (Previous Month)" : "🔒 Data Terkunci (Bulan Lalu)"}
											</p>
											<p>
												{language === "en" 
													? "The starting balance for previous months cannot be modified to ensure the integrity of your financial data."
													: "Saldo awal bulan sebelumnya tidak dapat diubah demi menjaga integritas data keuangan Anda."}
											</p>
										</div>
									)}

									<div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
										<p className="text-[10px] uppercase font-bold text-zinc-400">
											{language === "en" ? "Current Initial Balance" : "Saldo Awal Saat Ini"}
										</p>
										<p className="text-xl font-black mt-0.5 text-zinc-900 dark:text-zinc-100">{formatCurrency(startingBalance)}</p>
										{initialBalanceEntry && (
											<p className="text-[10px] text-zinc-500 mt-1 font-medium">
												Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">
													{language === "en" 
														? (isManualOverride ? "Custom (Manual Setup)" : "Automatic (Carry-Over)")
														: balanceStatus}
												</span>
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label className="text-xs font-bold text-zinc-500 uppercase">
											{language === "en" ? "Method 1: Previous Month's Balance" : "Metode 1: Saldo Bulan Sebelumnya"}
										</Label>
										<Button
											variant="outline"
											disabled={isPastMonth || !hasPastTransactions || !isManualOverride}
											onClick={() => {
												onSyncPreviousBalance();
												setIsSetupBalanceOpen(false);
											}}
											className="w-full h-auto rounded-2xl border border-zinc-200 dark:border-zinc-850 flex flex-col items-center justify-center text-center px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer disabled:opacity-50"
										>
											<span className="font-bold text-xs">
												{language === "en" ? "Use Previous Month's Balance" : "Gunakan Saldo Bulan Sebelumnya"}
											</span>
											<span className="text-[9px] text-zinc-400 font-normal mt-1 leading-relaxed">
												{!hasPastTransactions 
													? (language === "en" ? "No previous month transactions (First Month)" : "Tidak ada transaksi bulan sebelumnya (Bulan Pertama)")
													: (!isManualOverride && initialBalanceEntry 
														? (language === "en" ? "Already using previous month balance (Default)" : "Sudah menggunakan saldo bulan sebelumnya (Default)")
														: (language === "en" ? "Revert to automatic carry-over from last month" : "Kembalikan ke saldo carry-over otomatis dari bulan lalu"))}
											</span>
										</Button>
									</div>

									<div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
										<Label className="text-xs font-bold text-zinc-500 uppercase">
											{language === "en" ? "Method 2: Custom Starting Balance (Manual)" : "Metode 2: Saldo Awal Kustom (Manual)"}
										</Label>
										<div className="flex gap-2">
											<div className="relative flex items-center flex-1">
												<span className="absolute left-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 select-none pointer-events-none">
													Rp
												</span>
												<Input 
													type="text" 
													inputMode={isMobile ? "none" : "numeric"}
													readOnly={isMobile}
													placeholder="0"
													disabled={isPastMonth}
													value={manualBalanceInput} 
													onChange={(e) => handleManualBalanceChange(e.target.value)}
													onFocus={() => isMobile && setIsMobileKeyboardOpen(true)}
													onClick={() => isMobile && setIsMobileKeyboardOpen(true)}
													className="h-12 w-full pl-9 pr-4 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-base animate-none"
												/>
											</div>
											<Button 
												disabled={isPastMonth || !manualBalanceInput}
												onClick={() => {
													setIsConfirmOpen(true);
												}}
												className="bg-emerald-500 hover:bg-emerald-600 text-black font-black h-12 px-6 rounded-xl cursor-pointer"
											>
												{language === "en" ? "Set Balance" : "Set Saldo"}
											</Button>
										</div>
										{isMobile && isMobileKeyboardOpen && (
											<>
												<div
													className="fixed inset-0 z-[68] bg-transparent"
													onClick={() => {
														const val = manualBalanceInput || "";
														const cleaned = val.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
														if (cleaned) {
															const result = evaluateExpression(cleaned);
															setManualBalanceInput(formatRupiah(result.toString()));
														}
														setIsMobileKeyboardOpen(false);
													}}
												/>
												<div className="mt-2">
													<NumericKeyboard
														value={manualBalanceInput}
														onChange={handleManualBalanceChange}
														onSubmit={() => {
															setIsMobileKeyboardOpen(false);
														}}
														disabled={isPastMonth}
														showPreview={true}
														previewPlaceholder={language === "en" ? "Starting Balance Amount" : "Nominal Saldo Awal"}
														onActionClick={() => {
															setIsConfirmOpen(true);
														}}
														actionLabel={language === "en" ? "Set Balance" : "Set Saldo"}
													/>
												</div>
											</>
										)}
									</div>

									<div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal pt-2 border-t border-zinc-150/30 dark:border-zinc-850/30">
										💡 <em>
											{language === "en" 
												? "Warning: When you move to a new month, the starting balance of previous months cannot be changed to preserve financial data integrity."
												: "Peringatan: Ketika Anda berpindah ke bulan baru berikutnya, saldo awal pada bulan-bulan sebelumnya tidak dapat diubah kembali demi menjaga integritas data keuangan Anda."}
										</em>
									</div>
								</div>
							</DialogContent>
						</Dialog>

						{/* Confirmation Dialog */}
						<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
							<DialogContent className="sm:max-w-[400px] rounded-3xl">
								<DialogHeader>
									<DialogTitle className="text-amber-500 flex items-center gap-2">
										{language === "en" ? "⚠️ Confirm Initial Balance Change" : "⚠️ Konfirmasi Perubahan Saldo Awal"}
									</DialogTitle>
									<DialogDescription className="mt-2 text-zinc-650 dark:text-zinc-350 text-sm leading-relaxed text-left">
										{language === "en" ? (
											<>
												Manually changing the starting balance will override the automatic carry-over balance and <strong>affect your net balance</strong> for this month ({selectedMonth}).
												<br /><br />
												Are you sure you want to save the starting balance of <strong>{formatCurrency(parseFloat(stripRupiah(manualBalanceInput)) || 0)}</strong>?
											</>
										) : (
											<>
												Mengubah saldo awal secara manual akan menggantikan saldo carry-over otomatis dan <strong>memengaruhi total saldo bersih</strong> Anda pada bulan ini ({selectedMonth}).
												<br /><br />
												Apakah Anda yakin ingin menyimpan saldo awal sebesar <strong>{formatCurrency(parseFloat(stripRupiah(manualBalanceInput)) || 0)}</strong>?
											</>
										)}
									</DialogDescription>
								</DialogHeader>
								<div className="flex gap-3 mt-4">
									<Button
										variant="outline"
										onClick={() => setIsConfirmOpen(false)}
										className="flex-1 h-12 rounded-xl font-bold cursor-pointer"
									>
										{language === "en" ? "Cancel" : "Batal"}
									</Button>
									<Button
										onClick={() => {
											onSetInitialBalance(parseFloat(stripRupiah(manualBalanceInput)) || 0);
											setIsConfirmOpen(false);
											setIsSetupBalanceOpen(false);
											setManualBalanceInput("");
										}}
										className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black cursor-pointer"
									>
										{language === "en" ? "Yes, Change Balance" : "Ya, Ubah Saldo"}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
				<div className="relative md:col-span-2 z-0 isolate">
					{/* Background Peek Card (Previous Pocket, peeks left) */}
					{pockets.length > 0 && (
						<motion.div
							style={{
								x: leftPeekX,
								opacity: leftPeekOpacity,
								scale: horizontalPeekScale,
							}}
							className={`absolute inset-0 bg-gradient-to-br ${prevGradient} rounded-3xl -z-10 pointer-events-none`}
						/>
					)}

					{/* Background Peek Card (Next Pocket, peeks right) */}
					{pockets.length > 0 && (
						<motion.div
							style={{
								x: rightPeekX,
								opacity: rightPeekOpacity,
								scale: horizontalPeekScale,
							}}
							className={`absolute inset-0 bg-gradient-to-br ${nextGradient} rounded-3xl -z-10 pointer-events-none`}
						/>
					)}

					{/* Vertical Stack Hint Cards (Swipe Down) */}
					{pockets.length > 0 && (
						<>
							{/* Stack Card 1 (directly behind main card) */}
							<motion.div
								style={{
									y: verticalStack1Y,
									opacity: verticalStack1Opacity,
									scale: verticalStack1Scale,
									rotate: 1.5,
								}}
								className={`absolute inset-0 bg-gradient-to-br ${nextGradient} rounded-3xl -z-10 pointer-events-none`}
							/>
							{/* Stack Card 2 (further behind, slightly opposite rotate) */}
							<motion.div
								style={{
									y: verticalStack2Y,
									opacity: verticalStack2Opacity,
									scale: verticalStack2Scale,
									rotate: -1.5,
								}}
								className={`absolute inset-0 bg-gradient-to-br ${stack2Gradient} rounded-3xl -z-20 pointer-events-none`}
							/>
						</>
					)}

					<motion.div 
						style={{ x: dragX, y: dragY }}
						drag={pockets.length > 0 ? true : false}
						dragConstraints={{ left: -120, right: 120, top: 0, bottom: 100 }}
						dragElastic={0.15}
						onDragEnd={(e, info) => {
							if (pockets.length === 0) return;
							const swipeThreshold = 50;
							if (info.offset.y > swipeThreshold) {
								setIsPocketSelectOpen(true);
							} else if (info.offset.x < -swipeThreshold) {
								setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
							} else if (info.offset.x > swipeThreshold) {
								setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
							}
							// Snaps back to exactly 0,0 with smooth spring simulation
							animate(dragX, 0, { type: "spring", stiffness: 350, damping: 25 });
							animate(dragY, 0, { type: "spring", stiffness: 350, damping: 25 });
						}}
						className="w-full cursor-grab active:cursor-grabbing select-none"
					>
						<div className={`bg-gradient-to-br ${themeColors.gradient} p-6 rounded-3xl text-black shadow-lg ${themeColors.shadow} flex flex-col justify-between min-h-[140px] relative overflow-hidden transition-all duration-300`}>
							<div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full blur-2xl pointer-events-none" />
							<div className="flex justify-between items-start">
								<div className="flex flex-col max-w-[70%]">
									<span className="text-[9px] font-black uppercase tracking-wider opacity-60">
										{activePocket.id === "net_worth" ? (language === "en" ? "Total Worth" : "Total Kekayaan") : "Pocket"}
									</span>
									<h4 className="text-sm font-black uppercase tracking-wide flex items-center gap-1.5 mt-0.5 truncate text-ellipsis overflow-hidden whitespace-nowrap">
										<Wallet size={14} className="opacity-70 shrink-0" />
										<span className="truncate">{activePocket.name}</span>
									</h4>
								</div>
								<div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
									<Button 
										size="icon" 
										variant="ghost" 
										onClick={(e) => { e.stopPropagation(); togglePrivacy(); }}
										className="h-8 w-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full cursor-pointer flex items-center justify-center bg-transparent"
									>
										{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
									</Button>
								</div>
							</div>

							<div className="flex items-baseline justify-between mt-3 w-full">
								<h2 className="text-3xl font-black tracking-tight text-left">
									{maskValue(formatCurrency(netBalance))}
								</h2>
							</div>

						{/* Navigation controls < ... > at the bottom of the card content */}
						{pockets.length > 0 && (
							<div className="pt-2 border-t border-black/5 flex items-center justify-between mt-4" onClick={(e) => e.stopPropagation()}>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
									}}
									className={`w-8 h-8 bg-transparent hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-none ${themeColors.navText}`}
									aria-label="Previous Pocket"
								>
									<ChevronLeft size={16} />
								</button>
								
								{/* Titik 3 Button to open direct selection dialog */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setIsPocketSelectOpen(true);
									}}
									className={`px-4 py-1.5 bg-transparent hover:scale-105 active:scale-95 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1 border-none ${themeColors.navText}`}
								>
									<span className="w-1.5 h-1.5 rounded-full bg-current" />
									<span className="w-1.5 h-1.5 rounded-full bg-current" />
									<span className="w-1.5 h-1.5 rounded-full bg-current" />
								</button>
								
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
									}}
									className={`w-8 h-8 bg-transparent hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-none ${themeColors.navText}`}
									aria-label="Next Pocket"
								>
									<ChevronRight size={16} />
								</button>
							</div>
						)}
					</div>
				</motion.div>
			</div>
		</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="glass-card p-4 rounded-3xl">
					<div className={`w-8 h-8 rounded-full ${themeColors.bgLight} ${themeColors.text} flex items-center justify-center mb-2`}><TrendingUp size={16} /></div>
					<p className="text-[10px] uppercase font-bold text-zinc-400">{t("incomeTotal")}</p>
					<p className={`text-sm font-black ${themeColors.text}`}>{formatCurrency(incomeTotal)}</p>
				</div>
				<div className="glass-card p-4 rounded-3xl">
					<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mb-2"><TrendingDown size={16} /></div>
					<p className="text-[10px] uppercase font-bold text-zinc-400">{t("expenseTotal")}</p>
					<p className="text-sm font-black text-red-600">{formatCurrency(expenseTotal)}</p>
				</div>
			</div>

			{/* Sync Modal Bridge */}
			<Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
				<DialogContent className="sm:max-w-[425px] rounded-3xl">
					<DialogHeader><DialogTitle>{t("integrationTitle")}</DialogTitle></DialogHeader>
					<div className="py-6 flex flex-col items-center text-center gap-4">
						<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2"><Wallet className="text-emerald-600 dark:text-emerald-400" size={32} /></div>
						<p className="text-sm font-medium text-zinc-500 px-4">You need to sync your Google account to set a custom starting balance.</p>
						<div className="flex flex-col items-center gap-2 w-full">
							<Button className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-200 font-bold h-12 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer" onClick={() => onGoogleLogin(false)}>
								<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
								Continue with Google
							</Button>
							<Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer w-full h-8" onClick={() => onGoogleLogin(true)}>
								Use a different account
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Charts Section */}
			{loading ? (
				<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-4">
					<Loader2 className="animate-spin" size={48} />
					<p className="font-bold uppercase tracking-widest text-[10px]">Processing Data...</p>
				</div>
			) : transactions.length > 0 ? (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
					<section className="glass-card rounded-3xl p-6 space-y-4 lg:col-span-2">
						<div className="flex items-center gap-2">
							<div className={`w-1.5 h-5 bg-gradient-to-b ${themeColors.gradient} rounded-full`} />
							<h4 className="font-bold text-sm uppercase tracking-tight">{t("transactionTrend")}</h4>
						</div>
						<div className="h-[250px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={getDailyData()}>
									<defs>
										<linearGradient id="colorIncome" x1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={themeColors.accentHex} stopOpacity={0.3}/>
											<stop offset="95%" stopColor={themeColors.accentHex} stopOpacity={0}/>
										</linearGradient>
										<linearGradient id="colorExpense" x1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
											<stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
									<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
									<Area type="monotone" name="Income" dataKey="income" stroke={themeColors.accentHex} strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
									<Area type="monotone" name="Expense" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</section>

					<section className="glass-card rounded-3xl p-6 space-y-4 h-full">
						<div className="flex items-center gap-2">
							<div className="w-1.5 h-5 bg-red-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">{t("expenseByCat")}</h4>
						</div>
						<div className="h-[200px] w-full flex items-center justify-center relative">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={getGroupedCategoryData(true)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
										{getGroupedCategoryData(true).map((entry, index) => (<Cell key={`cell-${index}`} fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]} />))}
									</Pie>
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
								</PieChart>
							</ResponsiveContainer>
							<div className="absolute"><TrendingDown className="text-red-500/20" size={32} /></div>
						</div>
						<div className="grid grid-cols-2 gap-2">{getGroupedCategoryData(true).map((entry, index) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] }} /><span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span></div>))}</div>
					</section>

					<section className="glass-card rounded-3xl p-6 space-y-4 h-full">
						<div className="flex items-center gap-2">
							<div className={`w-1.5 h-5 bg-gradient-to-b ${themeColors.gradient} rounded-full`} />
							<h4 className="font-bold text-sm uppercase tracking-tight">Income by Category</h4>
						</div>
						<div className="h-[200px] w-full flex items-center justify-center relative">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={getGroupedCategoryData(false)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
										{getGroupedCategoryData(false).map((entry, index) => (
											<Cell key={`cell-${index}`} fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]} />
										))}
									</Pie>
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
								</PieChart>
							</ResponsiveContainer>
							<div className="absolute"><TrendingUp className={`${themeColors.text} opacity-20`} size={32} /></div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							{getGroupedCategoryData(false).map((entry, index) => (
								<div key={entry.name} className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] }} />
									<span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span>
								</div>
							))}
						</div>
					</section>

					{customChartConfigs.map((config, idx) => {
						const chartData = getCustomChartData(config.fieldName, config.type);
						return (
							<section key={idx} className="glass-card rounded-3xl p-6 space-y-4 relative group/chart h-full">
								<Button variant="ghost" size="sm" onClick={() => onDeleteCustomChart(idx)} className="absolute top-4 right-4 opacity-0 group-hover/chart:opacity-100 transition-opacity text-destructive h-8 w-8 p-0 cursor-pointer"><Trash2 size={14} /></Button>
								<div className="flex items-center gap-2">
									<div className={`w-1.5 h-5 rounded-full ${config.type === 'expense' ? 'bg-red-500' : 'bg-gradient-to-b ' + themeColors.gradient}`} />
									<h4 className="font-bold text-sm uppercase tracking-tight">{config.fieldName} ({config.type === 'expense' ? t("expense") : t("income")})</h4>
								</div>
								<div className="h-[200px] w-full">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={chartData}>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
											<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
											<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
											<Bar dataKey="value" radius={[10, 10, 0, 0]}>
												{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]} />))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</section>
						);
					})}

					{customFields.length > 0 && customChartConfigs.length < 2 && (
						<div className="lg:col-span-2">
							<Dialog open={isAddChartOpen} onOpenChange={setIsAddCustomChartOpen}>
								<DialogTrigger render={
									<Button className={`w-full h-16 rounded-2xl border-dashed border-2 ${themeColors.border} ${themeColors.bgLight} hover:opacity-90 ${themeColors.text} font-bold flex items-center justify-center gap-2 cursor-pointer`}>
										<Plus size={20} /> {t("addCustomChart")}
									</Button>
								} />
								<DialogContent className="sm:max-w-[400px] rounded-3xl">
									<DialogHeader><DialogTitle>{t("addCustomChart")}</DialogTitle><DialogDescription>{t("customChartLimit")}</DialogDescription></DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2"><Label className="text-xs">{t("selectField")}</Label><Select value={newChartField} onValueChange={(v) => setNewChartField(v || "")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue placeholder="Choose a custom field" /></SelectTrigger><SelectContent className="rounded-xl">{customFields.map(f => (<SelectItem key={f.name} value={f.name} className="cursor-pointer">{f.name}</SelectItem>))}</SelectContent></Select></div>
										<div className="space-y-2"><Label className="text-xs">{t("chartType")}</Label><Select value={newChartType} onValueChange={(v: any) => setNewChartType(v || "expense")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="expense" className="cursor-pointer">{t("expense")}</SelectItem><SelectItem value="income" className="cursor-pointer">{t("income")}</SelectItem></SelectContent></Select></div>
										<Button disabled={!newChartField} onClick={() => { onAddCustomChart({ fieldName: newChartField, type: newChartType }); setIsAddCustomChartOpen(false); setNewChartField(""); }} className={`w-full bg-gradient-to-r ${themeColors.gradient} text-black font-black h-12 rounded-xl mt-4 cursor-pointer`}>{t("add")}</Button>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					)}

					{/* Custom Compact Table for Current Month Transactions */}
					<div className="lg:col-span-2 mt-2">
						<section className="glass-card rounded-3xl p-6 space-y-4">
							<div className="flex items-center justify-between gap-4 flex-wrap mb-4">
								<div className="flex items-center gap-2">
									<div className={`w-1.5 h-5 bg-gradient-to-b ${themeColors.gradient} rounded-full`} />
									<h4 className="font-bold text-sm uppercase tracking-tight">
										{language === "en" ? "Transaction History" : "Riwayat Transaksi"}
									</h4>
								</div>
								<div className="flex items-center gap-2">
									<Button 
										size="sm" 
										variant="outline" 
										onClick={exportToCSV}
										className="h-8 text-[10px] font-bold uppercase rounded-full border-zinc-200 dark:border-zinc-800 cursor-pointer"
									>
										Export CSV
									</Button>
									{supabaseUser && (
										<Button 
											size="sm" 
											variant="outline" 
											onClick={exportToGoogleSheets}
											disabled={loading}
											className="h-8 text-[10px] font-bold uppercase rounded-full border-zinc-200 dark:border-zinc-800 cursor-pointer"
										>
											Sync Sheets
										</Button>
									)}
								</div>
							</div>
							<div className="overflow-x-auto max-h-[400px] overflow-y-auto">
								<table className="w-full text-left text-sm whitespace-nowrap">
									<thead className="z-10">
										<tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-medium">
											<th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">{language === "en" ? "Date" : "Tanggal"}</th>
											<th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">{language === "en" ? "Name" : "Nama"}</th>
											<th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">{language === "en" ? "Category" : "Kategori"}</th>
											<th className="pb-3 px-2 text-right font-bold uppercase tracking-wider text-[10px]">{language === "en" ? "Amount" : "Jumlah"}</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
										{[...monthlyTransactions].reverse().map((t, i) => (
											<tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
												<td className="py-3 px-2 text-zinc-500 text-xs">{t.date.split(',')[0] || t.date}</td>
												<td className="py-3 px-2 font-medium">{t.name}</td>
												<td className="py-3 px-2">
													<span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] px-2 py-1 rounded-md font-medium text-zinc-600 dark:text-zinc-300">
														{t.category}
													</span>
												</td>
												<td className={`py-3 px-2 text-right font-bold ${t.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
													{t.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
												</td>
											</tr>
										))}
										{monthlyTransactions.length === 0 && (
											<tr>
												<td colSpan={4} className="py-8 text-center text-zinc-400 text-xs font-medium">
													{language === "en" ? "No transactions this month" : "Belum ada transaksi bulan ini"}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</section>
					</div>
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
			<Dialog open={isPocketSelectOpen} onOpenChange={setIsPocketSelectOpen}>
				<DialogContent className="sm:max-w-[400px] rounded-3xl p-6 duration-200 data-open:slide-in-from-top-12 data-open:zoom-in-100 data-closed:slide-out-to-top-12 data-closed:zoom-out-100">
					<DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 gap-4">
						<DialogTitle className="font-black text-left">
							{language === "en" ? "Select Pocket" : "Pilih Kantong"}
						</DialogTitle>
						<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
							{/* Eye Toggle button */}
							<Button 
								size="icon" 
								variant="ghost" 
								onClick={() => togglePrivacy()}
								className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-150 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent"
							>
								{isPrivate ? <EyeOff size={15} /> : <Eye size={15} />}
							</Button>
						</div>
					</DialogHeader>
					
					<div className="grid grid-cols-1 gap-3 pt-3 max-h-[380px] overflow-y-auto pr-1">
						{carouselPockets.map((p, idx) => {
							const pColors = {
								emerald: {
									gradient: "from-emerald-500 to-teal-500",
									shadow: "shadow-emerald-500/10",
									text: "text-emerald-950/80"
								},
								indigo: {
									gradient: "from-indigo-500 to-purple-500",
									shadow: "shadow-indigo-500/10",
									text: "text-indigo-950/80"
								},
								amber: {
									gradient: "from-amber-500 to-rose-500",
									shadow: "shadow-amber-500/10",
									text: "text-amber-950/80"
								}
							}[(p.color === "indigo" || p.color === "amber") ? p.color : "emerald"];

							const pBalance = getPocketBalance(p);
							const pInitial = transactions.find(t => t.category === "Initial Balance" && (p.id === "net_worth" || t.pocket === p.name || t.pocket === p.id))?.amount || 0;
							const pIncome = transactions.filter(t => t.category !== "Initial Balance" && (p.id === "net_worth" || t.pocket === p.name || t.pocket === p.id) && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
							const pExpense = Math.abs(transactions.filter(t => t.category !== "Initial Balance" && (p.id === "net_worth" || t.pocket === p.name || t.pocket === p.id) && t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

							return (
								<button
									key={p.id}
									onClick={() => {
										setIsPocketSelectOpen(false);
										setTimeout(() => {
											setActivePocketIdx(idx);
										}, 150);
									}}
									className={`w-full text-left rounded-3xl p-5 bg-gradient-to-br ${pColors.gradient} text-black shadow-md ${pColors.shadow} relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98] border-none flex flex-col justify-between min-h-[110px]`}
								>
									<div className="flex justify-between items-start w-full">
										<div className="flex flex-col max-w-[75%]">
											<span className="text-[8px] font-black uppercase tracking-wider opacity-60">
												{p.id === "net_worth" ? (language === "en" ? "Total Worth" : "Total Kekayaan") : "Pocket"}
											</span>
											<h4 className="text-xs font-black uppercase tracking-wide flex items-center gap-1 mt-0.5 truncate text-ellipsis overflow-hidden whitespace-nowrap">
												<Wallet size={12} className="opacity-70 shrink-0" />
												<span className="truncate">{p.name}</span>
											</h4>
										</div>
										<span className="opacity-70 text-[8px] uppercase font-black tracking-widest shrink-0">
											{p.id === "net_worth" ? (language === "en" ? "Overview" : "Semua") : p.type}
										</span>
									</div>

									<div className="mt-2 w-full">
										<h2 className="text-xl font-black tracking-tight">{maskValue(formatCurrency(pBalance))}</h2>
									</div>

									<div className="mt-1 pt-2 border-t border-black/5 flex items-center justify-between text-[9px] font-black opacity-80 w-full">
										<div className="flex items-center gap-1">
											<Wallet size={10} className="opacity-50" />
											<span>{maskValue(formatCurrency(pInitial))}</span>
										</div>
										<div className="flex items-center gap-2">
											<div className={`flex items-center gap-0.5 ${pColors.text}`}>
												<TrendingUp size={10} />
												<span>{maskValue(formatCurrency(pIncome))}</span>
											</div>
											<div className="w-0.5 h-0.5 rounded-full bg-black/10" />
											<div className="flex items-center gap-0.5 text-red-950/80">
												<TrendingDown size={10} />
												<span>{maskValue(formatCurrency(pExpense))}</span>
											</div>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</DialogContent>
			</Dialog>
		</motion.div>
	);
}

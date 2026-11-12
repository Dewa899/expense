"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, MotionValue } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PocketDef } from "@/hooks/use-dashboard-logic";

/**
 * Returns adaptive Tailwind font size classes based on nominal string length
 * so currency values never truncate with '...' on mobile or desktop.
 */
function getAdaptiveNominalSize(
	text: string,
	variant: "lg" | "md" | "sm" | "primary" | "secondary" | "compact" = "lg"
): string {
	const len = text.length;
	if (variant === "sm" || variant === "compact") {
		if (len > 18) return "text-[9px] sm:text-xs";
		if (len > 14) return "text-[10px] sm:text-xs";
		return "text-xs sm:text-sm";
	}
	if (variant === "md" || variant === "secondary") {
		if (len > 18) return "text-[10px] sm:text-sm";
		if (len > 15) return "text-[11px] sm:text-base";
		if (len > 12) return "text-xs sm:text-lg";
		return "text-sm sm:text-lg";
	}
	// lg / primary
	if (len > 19) return "text-[10px] sm:text-sm";
	if (len > 16) return "text-[11px] sm:text-base";
	if (len > 13) return "text-xs sm:text-lg";
	return "text-sm sm:text-xl";
}

interface DetailedBalanceSummaryProps {
	carouselCard: React.ReactNode;
	isNetWorth: boolean;
	activePocket: PocketDef;
	startingBalance: number;
	incomeTotal: number;
	expenseTotal: number;
	overallIncomeTotal?: number;
	overallExpenseTotal?: number;
	formatCurrency: (val: number) => string;
	selectedMonth: string;
	isPastMonth: boolean;
	user: any;
	supabaseUser: any;
	balanceStatus: string;
	isManualOverride: boolean;
	initialBalanceEntry: any;
	onSyncPreviousBalance: () => void;
	manualBalanceInput: string;
	setManualBalanceInput: (val: string) => void;
	onUpdateInitialBalance: () => void;
	themeColors: {
		bgLight: string;
		text: string;
		gradient: string;
		border: string;
	};
	percentage: number;
	currentProgress: number;
	onManagePockets: () => void;
	pocketsCount?: number;
	overallTotalBalance?: number;
	unallocatedBalance?: number;
	allocatedPocketsBalance?: number;
	isPrivate?: boolean;
	pullDownOffset?: MotionValue<number>;
}

export function DetailedBalanceSummary({
	carouselCard,
	isNetWorth,
	activePocket,
	startingBalance,
	incomeTotal,
	expenseTotal,
	overallIncomeTotal,
	overallExpenseTotal,
	formatCurrency,
	selectedMonth,
	isPastMonth,
	user,
	supabaseUser,
	balanceStatus,
	isManualOverride,
	initialBalanceEntry,
	onSyncPreviousBalance,
	manualBalanceInput,
	setManualBalanceInput,
	onUpdateInitialBalance,
	themeColors,
	percentage,
	currentProgress,
	onManagePockets,
	pocketsCount = 0,
	overallTotalBalance = 0,
	unallocatedBalance = 0,
	allocatedPocketsBalance = 0,
	isPrivate = false,
	pullDownOffset,
}: DetailedBalanceSummaryProps) {
	const { t, language } = useLanguage();
	const router = useRouter();
	const [isSetupBalanceOpen, setIsSetupBalanceOpen] = React.useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
	const maskValue = (val: string) => isPrivate ? "******" : val;

	const displayedOverallIncome = overallIncomeTotal ?? incomeTotal;
	const displayedOverallExpense = overallExpenseTotal ?? expenseTotal;
	const activePocketLabel = activePocket.id === "main"
		? (language === "en" ? "Main Pocket" : "Kantong Utama")
		: activePocket.name;

	const handleOpenManageBalance = (open: boolean) => {
		if (open && !user && !supabaseUser) {
			router.push("/login");
			return;
		}
		setIsSetupBalanceOpen(open);
	};

	const renderSecondaryStatusCard = () => {
		if (isNetWorth) {
			const startBalStr = maskValue(formatCurrency(startingBalance));
			return (
				<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between h-full">
					<div>
						<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 mb-0.5 truncate">
							{t("startingBalance")}
						</p>
						<h4 className={`${getAdaptiveNominalSize(startBalStr, "primary")} font-black text-zinc-900 dark:text-zinc-100 break-words leading-tight`}>
							{startBalStr}
						</h4>
					</div>

					{/* Smart Setup/Manage Button */}
					<div className="flex flex-col gap-1.5 mt-2.5">
						<Dialog open={isSetupBalanceOpen} onOpenChange={handleOpenManageBalance}>
							<DialogTrigger
								render={
									<Button
										variant="ghost"
										className="h-auto p-0 flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-transparent justify-start cursor-pointer group border-none bg-transparent"
									>
										<div className="w-6 h-6 rounded-lg bg-[#F1F3F5] dark:bg-[#2B2E33] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
											<Settings size={12} />
										</div>
										<span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate">
											{isPastMonth
												? (language === "en" ? "View Initial" : "Lihat Saldo Awal")
												: (language === "en" ? "Manage Initial" : "Kelola Saldo Awal")}
										</span>
									</Button>
								}
							/>
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
										<div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-xs font-medium space-y-1">
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

									<div className="bg-[#F1F3F5] dark:bg-[#2B2E33] p-4 rounded-2xl border-none">
										<p className="text-[10px] uppercase font-bold text-zinc-400">
											{language === "en" ? "Current Initial Balance" : "Saldo Awal Saat Ini"}
										</p>
										<p className="text-xl font-black mt-0.5 text-zinc-900 dark:text-zinc-100">{formatCurrency(startingBalance)}</p>
										{initialBalanceEntry && (
											<p className="text-[10px] text-zinc-500 mt-1 font-medium">
												Status:{" "}
												<span className="font-bold text-emerald-600 dark:text-emerald-400">
													{language === "en"
														? (isManualOverride ? "Custom (Manual Setup)" : "Automatic (Carry-Over)")
														: balanceStatus}
												</span>
											</p>
										)}
									</div>

									{!isPastMonth && (
										<>
											<div className="flex flex-col gap-2">
												<p className="text-xs font-bold text-zinc-850 dark:text-zinc-250">
													{language === "en" ? "Method 1: Previous Month's Balance" : "Metode 1: Saldo Bulan Sebelumnya"}
												</p>
												<Button
													variant="outline"
													onClick={() => {
														onSyncPreviousBalance();
														setIsSetupBalanceOpen(false);
													}}
													className="w-full justify-start text-left text-xs font-bold h-11 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] cursor-pointer"
												>
													{language === "en" ? "Use Previous Month's Balance" : "Gunakan Saldo Bulan Sebelumnya"}
												</Button>
												<p className="text-[10px] text-zinc-400 dark:text-zinc-500">
													{!isManualOverride && initialBalanceEntry
														? (language === "en" ? "Already using previous month balance (Default)" : "Sudah menggunakan saldo bulan sebelumnya (Default)")
														: (language === "en" ? "Revert to automatic carry-over from last month" : "Kembalikan ke carry-over otomatis dari bulan lalu")}
												</p>
											</div>

											<div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-850/50">
												<p className="text-xs font-bold text-zinc-850 dark:text-zinc-250">
													{language === "en" ? "Method 2: Custom Starting Balance (Manual)" : "Metode 2: Saldo Awal Kustom (Manual)"}
												</p>
												<Input
													placeholder={language === "en" ? "e.g. 5.000.000" : "misal 5.000.000"}
													value={manualBalanceInput}
													onChange={(e) => setManualBalanceInput(e.target.value)}
													className="h-11 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] focus:bg-[#E9ECEF] dark:focus:bg-[#32363C]"
												/>
												<Button
													onClick={() => setIsConfirmOpen(true)}
													disabled={!manualBalanceInput}
													className={`w-full bg-gradient-to-r ${themeColors.gradient} text-[#063626] font-black h-11 rounded-2xl cursor-pointer border-none shadow-[0_4px_10px_rgba(0,0,0,0.10)]`}
												>
													{language === "en" ? "Set Balance" : "Set Saldo"}
												</Button>
											</div>
										</>
									)}
								</div>
							</DialogContent>
						</Dialog>

						{/* Confirmation Dialog */}
						<Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
							<DialogContent className="sm:max-w-[400px] rounded-3xl">
								<DialogHeader>
									<DialogTitle className="text-amber-500 flex items-center gap-2">
										<AlertTriangle size={20} />
										{language === "en" ? "Change Starting Balance" : "Ubah Saldo Awal"}
									</DialogTitle>
									<DialogDescription className="mt-2 text-zinc-650 dark:text-zinc-350 text-sm leading-relaxed text-left">
										{language === "en"
											? "Are you sure you want to change the starting balance? This will alter your total balance calculation for this month."
											: "Apakah Anda yakin ingin mengubah saldo awal? Tindakan ini akan mengubah perhitungan total saldo Anda untuk bulan ini."}
									</DialogDescription>
								</DialogHeader>
								<div className="flex gap-3 mt-4">
									<Button
										variant="outline"
										onClick={() => setIsConfirmOpen(false)}
										className="flex-1 h-12 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] font-bold cursor-pointer"
									>
										{language === "en" ? "Cancel" : "Batal"}
									</Button>
									<Button
										onClick={() => {
											onUpdateInitialBalance();
											setIsConfirmOpen(false);
											setIsSetupBalanceOpen(false);
											setManualBalanceInput("");
										}}
										className="flex-1 h-12 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#451A03] font-black cursor-pointer border-none shadow-[0_4px_10px_rgba(0,0,0,0.10)]"
									>
										{language === "en" ? "Yes, Change Balance" : "Ya, Ubah Saldo"}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			);
		}

		if (activePocket.type !== "default" && activePocket.target) {
			const progressStr = maskValue(formatCurrency(currentProgress));
			const targetStr = `/ ${maskValue(formatCurrency(activePocket.target))}`;
			return (
				<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between h-full">
					<div className="flex items-center justify-between gap-1.5">
						<div className="min-w-0 flex-1">
							<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 truncate">
								{activePocket.type === "budget"
									? (language === "en" ? "Monthly Limit" : "Batas Bulanan")
									: (language === "en" ? "Saving Progress" : "Progres Tabungan")}
							</p>
							<p className={`${getAdaptiveNominalSize(progressStr, "md")} font-black text-zinc-900 dark:text-zinc-100 mt-0.5 leading-tight tracking-tight break-words`}>
								{progressStr}
							</p>
							<p className={`${getAdaptiveNominalSize(targetStr, "sm")} font-semibold text-zinc-400 leading-tight break-words mt-0.5`}>
								{targetStr}
							</p>
						</div>

						{/* Compact Circular Progress SVG */}
						<div className="relative w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
							<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
								<circle
									cx="50"
									cy="50"
									r="40"
									stroke="currentColor"
									strokeWidth="10"
									fill="transparent"
									className="text-zinc-100 dark:text-zinc-800"
								/>
								<circle
									cx="50"
									cy="50"
									r="40"
									stroke="currentColor"
									strokeWidth="10"
									fill="transparent"
									strokeDasharray={2 * Math.PI * 40}
									strokeDashoffset={
										2 * Math.PI * 40 - (Math.min(100, Math.max(0, percentage)) / 100) * (2 * Math.PI * 40)
									}
									strokeLinecap="round"
									className={`${
										percentage > 100
											? "text-red-500"
											: activePocket.type === "budget"
												? "text-emerald-500 dark:text-emerald-400"
												: "text-indigo-500 dark:text-indigo-400"
									} transition-all duration-500`}
								/>
							</svg>
							<div className="absolute inset-0 flex items-center justify-center">
								<span className="text-[9.5px] sm:text-xs font-black text-zinc-950 dark:text-zinc-50">
									{percentage}%
								</span>
							</div>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between h-full">
				<div>
					<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 mb-0.5 truncate">
						{language === "en" ? "Pocket Type" : "Tipe Kantong"}
					</p>
					<h4 className="text-xs sm:text-sm font-black text-zinc-800 dark:text-zinc-200 truncate">
						{language === "en" ? "Regular Pocket" : "Kantong Biasa"}
					</h4>
				</div>
				<div className="mt-2.5">
					<Button
						size="sm"
						onClick={onManagePockets}
						className={`h-7 px-2.5 text-[9px] font-black uppercase rounded-xl bg-gradient-to-r ${themeColors.gradient} text-[#063626] border-none shadow-xs cursor-pointer hover:opacity-95`}
					>
						{language === "en" ? "+ Set Target" : "+ Set Target"}
					</Button>
				</div>
			</div>
		);
	};

	const overallBalStr = maskValue(formatCurrency(overallTotalBalance));
	const unallocBalStr = maskValue(formatCurrency(unallocatedBalance));
	const allocBalStr = maskValue(formatCurrency(allocatedPocketsBalance));
	const overallIncStr = maskValue(formatCurrency(displayedOverallIncome));
	const overallExpStr = maskValue(formatCurrency(displayedOverallExpense));
	const pocketIncStr = maskValue(formatCurrency(incomeTotal));
	const pocketExpStr = maskValue(formatCurrency(expenseTotal));

	return (
		<div className="space-y-2.5 sm:space-y-4 w-full">
			{/* Top Section: Main Carousel Card (Desktop: 2/3 width + status card on right; Mobile: Carousel on top) */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4 items-stretch w-full">
				<div className="lg:col-span-2 flex flex-col justify-between">
					{carouselCard}
				</div>

				{/* Desktop-only Secondary Status Card (On mobile, paired side-by-side below for compactness) */}
				<div className="hidden lg:flex lg:col-span-1 flex-col h-full">
					{renderSecondaryStatusCard()}
				</div>
			</div>

			{/* Animated Wrapper that glides downward when the PocketCarouselCard is pulled down */}
			<motion.div style={{ y: pullDownOffset }} className="space-y-2.5 sm:space-y-4 w-full">
				{pocketsCount > 0 ? (
					<>
						{/* Mobile Row: Secondary Status Card (Starting Balance / Progress) + Total Balance (All Funds) */}
						<div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 w-full">
							<div className="lg:hidden h-full">
								{renderSecondaryStatusCard()}
							</div>

							<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between">
								<div>
									<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 mb-0.5 truncate">
										{language === "en" ? "Total Balance" : "Total Keseluruhan"}
									</p>
									<h4 className={`${getAdaptiveNominalSize(overallBalStr, "lg")} font-black text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight break-words`}>
										{overallBalStr}
									</h4>
								</div>
								<p className="text-[9px] sm:text-[10px] font-semibold text-zinc-400 mt-1.5 truncate">
									{language === "en" ? "Main + All Pockets" : "Utama + Semua Kantong"}
								</p>
							</div>

							<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between">
								<div>
									<p className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 truncate">
										{language === "en" ? "Main (Unallocated)" : "Saldo Utama"}
									</p>
									<h4 className={`${getAdaptiveNominalSize(unallocBalStr, "lg")} font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight break-words`}>
										{unallocBalStr}
									</h4>
								</div>
								<p className="text-[9px] sm:text-[10px] font-semibold text-zinc-400 mt-1.5 truncate">
									{language === "en" ? "Available for daily use" : "Dana bebas belum dialokasi"}
								</p>
							</div>

							<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between">
								<div>
									<p className="text-[9px] sm:text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400 mb-0.5 truncate">
										{language === "en" ? "Pockets Allocation" : "Alokasi Kantong"}
									</p>
									<h4 className={`${getAdaptiveNominalSize(allocBalStr, "lg")} font-black text-indigo-600 dark:text-indigo-400 leading-tight tracking-tight break-words`}>
										{allocBalStr}
									</h4>
								</div>
								<p className="text-[9px] sm:text-[10px] font-semibold text-zinc-400 mt-1.5 truncate">
									{language === "en"
										? `In ${pocketsCount} active pocket(s)`
										: `Di ${pocketsCount} kantong aktif`}
								</p>
							</div>
						</div>

						{/* Side-by-Side Income & Expense Row (Headline = Constant Overall Total across all pockets in Emerald/Red; Sub-row = Active Pocket in Pocket Color) */}
						<div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
							<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between gap-2">
								<div className="flex items-start gap-2.5">
									<div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
										<TrendingUp size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 truncate">
											{language === "en" ? "Total Income (All)" : "Total Pemasukan"}
										</p>
										<h4 className={`${getAdaptiveNominalSize(overallIncStr, "lg")} font-black text-emerald-600 dark:text-emerald-400 leading-tight tracking-tight break-words mt-0.5`}>
											{overallIncStr}
										</h4>
									</div>
								</div>
								<div className="pt-1.5 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
									<span className={`font-bold ${themeColors.text} truncate max-w-[48%]`}>{activePocketLabel}:</span>
									<span className={`${getAdaptiveNominalSize(pocketIncStr, "sm")} font-extrabold ${themeColors.text} leading-none shrink-0`}>
										{pocketIncStr}
									</span>
								</div>
							</div>

							<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex flex-col justify-between gap-2">
								<div className="flex items-start gap-2.5">
									<div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
										<TrendingDown size={14} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 truncate">
											{language === "en" ? "Total Expense (All)" : "Total Pengeluaran"}
										</p>
										<h4 className={`${getAdaptiveNominalSize(overallExpStr, "lg")} font-black text-red-500 leading-tight tracking-tight break-words mt-0.5`}>
											{overallExpStr}
										</h4>
									</div>
								</div>
								<div className="pt-1.5 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
									<span className={`font-bold ${themeColors.text} truncate max-w-[48%]`}>{activePocketLabel}:</span>
									<span className={`${getAdaptiveNominalSize(pocketExpStr, "sm")} font-extrabold text-zinc-700 dark:text-zinc-200 leading-none shrink-0`}>
										{pocketExpStr}
									</span>
								</div>
							</div>
						</div>
					</>
				) : (
					/* When no custom pockets exist: pair Starting Balance + Income/Expense compactly */
					<div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
						<div className="col-span-2 lg:hidden">
							{renderSecondaryStatusCard()}
						</div>

						<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex items-center gap-2.5">
							<div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${themeColors.bgLight} ${themeColors.text} flex items-center justify-center shrink-0`}>
								<TrendingUp size={15} />
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 truncate">{t("incomeTotal")}</p>
								<h4 className={`${getAdaptiveNominalSize(pocketIncStr, "lg")} font-black ${themeColors.text} leading-tight tracking-tight break-words mt-0.5`}>
									{pocketIncStr}
								</h4>
							</div>
						</div>

						<div className="glass-card p-3.5 sm:p-5 rounded-3xl flex items-center gap-2.5">
							<div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
								<TrendingDown size={15} />
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-400 truncate">{t("expenseTotal")}</p>
								<h4 className={`${getAdaptiveNominalSize(pocketExpStr, "lg")} font-black text-red-500 leading-tight tracking-tight break-words mt-0.5`}>
									{pocketExpStr}
								</h4>
							</div>
						</div>
					</div>
				)}
			</motion.div>
		</div>
	);
}

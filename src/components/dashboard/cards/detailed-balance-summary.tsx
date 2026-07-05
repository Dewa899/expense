"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PocketDef } from "@/hooks/use-dashboard-logic";

interface DetailedBalanceSummaryProps {
	carouselCard: React.ReactNode;
	isNetWorth: boolean;
	activePocket: PocketDef;
	startingBalance: number;
	incomeTotal: number;
	expenseTotal: number;
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
}

export function DetailedBalanceSummary({
	carouselCard,
	isNetWorth,
	activePocket,
	startingBalance,
	incomeTotal,
	expenseTotal,
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
}: DetailedBalanceSummaryProps) {
	const { t, language } = useLanguage();
	const router = useRouter();
	const [isSetupBalanceOpen, setIsSetupBalanceOpen] = React.useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

	const handleOpenManageBalance = (open: boolean) => {
		if (open && !user && !supabaseUser) {
			router.push("/login");
			return;
		}
		setIsSetupBalanceOpen(open);
	};

	return (
		<div className="space-y-4 w-full">
			{/* Top grid (Desktop: side-by-side, Mobile: stacked) */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch w-full">
				<div className="lg:col-span-2 flex flex-col justify-between">
					{carouselCard}
				</div>
				
				<div className="lg:col-span-1 flex flex-col h-full">
					{isNetWorth ? (
						<div className="glass-card p-6 rounded-[32px] flex flex-col justify-between h-full min-h-[140px]">
							<div>
								<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t("startingBalance")}</p>
								<h4 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(startingBalance)}</h4>
							</div>
							
							{/* Smart Setup/Manage Button */}
							<div className="flex flex-col gap-2 mt-4">
								<Dialog open={isSetupBalanceOpen} onOpenChange={handleOpenManageBalance}>
									<DialogTrigger render={
										<Button 
											variant="ghost" 
											className="h-auto p-0 flex items-center gap-2 text-zinc-500 hover:text-zinc-700 hover:bg-transparent justify-start cursor-pointer group border-none bg-transparent"
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
															className="w-full justify-start text-left text-xs font-bold h-11 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
														>
															{language === "en" ? "Use Previous Month's Balance" : "Gunakan Saldo Bulan Sebelumnya"}
														</Button>
														<p className="text-[10px] text-zinc-400 dark:text-zinc-500">
															{!isManualOverride && initialBalanceEntry 
																? (language === "en" ? "Already using previous month balance (Default)" : "Sudah menggunakan saldo bulan sebelumnya (Default)")
																: (language === "en" ? "Revert to automatic carry-over from last month" : "Kembalikan to automatic carry-over dari bulan lalu")}
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
															className="h-10 rounded-xl"
														/>
														<Button 
															onClick={() => setIsConfirmOpen(true)}
															disabled={!manualBalanceInput}
															className={`w-full bg-gradient-to-r ${themeColors.gradient} text-black font-black h-11 rounded-xl cursor-pointer border-none shadow-sm`}
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
												className="flex-1 h-12 rounded-xl font-bold cursor-pointer"
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
												className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black cursor-pointer border-none"
											>
												{language === "en" ? "Yes, Change Balance" : "Ya, Ubah Saldo"}
											</Button>
										</div>
									</DialogContent>
								</Dialog>
							</div>
						</div>
					) : activePocket.type !== "default" && activePocket.target ? (
						<div className="glass-card p-6 rounded-[32px] flex flex-col justify-between items-center text-center h-full min-h-[140px]">
							<div className="w-full flex flex-col items-center justify-center flex-1">
								<p className="text-[10px] uppercase font-bold text-zinc-400 mb-2">
									{activePocket.type === "budget" 
										? (language === "en" ? "Monthly Limit" : "Batas Bulanan")
										: (language === "en" ? "Saving Progress" : "Progres Tabungan")}
								</p>
								
								{/* Circular Progress SVG */}
								<div className="relative w-20 h-20 flex items-center justify-center">
									<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
										<circle
											cx="50"
											cy="50"
											r="40"
											stroke="currentColor"
											strokeWidth="8"
											fill="transparent"
											className="text-zinc-100 dark:text-zinc-800"
										/>
										<circle
											cx="50"
											cy="50"
											r="40"
											stroke="currentColor"
											strokeWidth="8"
											fill="transparent"
											strokeDasharray={2 * Math.PI * 40}
											strokeDashoffset={2 * Math.PI * 40 - (Math.min(100, Math.max(0, percentage)) / 100) * (2 * Math.PI * 40)}
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
										<span className="text-sm font-black text-zinc-950 dark:text-zinc-50">{percentage}%</span>
									</div>
								</div>

								<p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-3">
									{formatCurrency(currentProgress)} <span className="text-zinc-400 dark:text-zinc-650">/</span> {formatCurrency(activePocket.target)}
								</p>
							</div>
						</div>
					) : (
						<div className="glass-card p-6 rounded-[32px] flex flex-col justify-between items-center text-center h-full min-h-[140px]">
							<div className="w-full flex flex-col items-center justify-center flex-1">
								<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
									{language === "en" ? "Pocket Type" : "Tipe Kantong"}
								</p>
								<h4 className="text-sm font-black text-zinc-700 dark:text-zinc-300 mb-2">
									{language === "en" ? "Default Pocket" : "Kantong Biasa"}
								</h4>
								<p className="text-[10px] text-zinc-550 dark:text-zinc-450 max-w-[200px] leading-relaxed mb-3 font-semibold">
									{language === "en" 
										? "This pocket doesn't have a limit or saving goal progression." 
										: "Kantong ini tidak memiliki batas anggaran atau target tabungan."}
								</p>
								<Button 
									size="sm"
									onClick={onManagePockets}
									className={`h-8 text-[10px] font-black uppercase rounded-xl bg-gradient-to-r ${themeColors.gradient} text-black border-none shadow-md cursor-pointer hover:opacity-95`}
								>
									{language === "en" ? "Add Progression" : "Tambah Target"}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Second grid: Income & Expense (Desktop: side-by-side, Mobile: stacked) */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
				<div className="glass-card p-6 rounded-[32px] flex flex-col justify-between min-h-[120px]">
					<div className="flex flex-col">
						<div className={`w-8 h-8 rounded-full ${themeColors.bgLight} ${themeColors.text} flex items-center justify-center mb-4`}>
							<TrendingUp size={16} />
						</div>
						<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t("incomeTotal")}</p>
						<h4 className={`text-xl font-black ${themeColors.text}`}>{formatCurrency(incomeTotal)}</h4>
					</div>
				</div>

				<div className="glass-card p-6 rounded-[32px] flex flex-col justify-between min-h-[120px]">
					<div className="flex flex-col">
						<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mb-4">
							<TrendingDown size={16} />
						</div>
						<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t("expenseTotal")}</p>
						<h4 className="text-xl font-black text-red-650 dark:text-red-500">{formatCurrency(expenseTotal)}</h4>
					</div>
				</div>
			</div>
		</div>
	);
}

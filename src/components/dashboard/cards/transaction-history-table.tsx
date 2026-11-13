"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PocketDef, isInternalTransfer } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";

interface TransactionHistoryTableProps {
	monthlyTransactions: any[];
	pockets: PocketDef[];
	formatCurrency: (val: number) => string;
	exportToCSV: () => void;
	exportToGoogleSheets: () => void;
	supabaseUser: any;
	loading: boolean;
	themeColors: {
		gradient: string;
	};
}

const POCKET_BADGE_STYLES: Record<string, string> = {
	emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold",
	blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold",
	purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400 font-bold",
	amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold",
	rose: "bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold",
	cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold",
	indigo: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold",
	pink: "bg-pink-500/10 text-pink-700 dark:text-pink-400 font-bold",
	orange: "bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold",
};

function formatShortDate(rawDate: string): string {
	const datePart = (rawDate || "").split(",")[0].trim();
	// Strip 4-digit year suffix so "12/11/2026" -> "12/11" and "12 Nov 2026" -> "12 Nov"
	return datePart.replace(/([/-])\d{4}$/, "").replace(/\s+\d{4}$/, "");
}

function getCompactAmountClass(formatted: string): string {
	const len = formatted.length;
	if (len > 14) return "text-[8.5px] sm:text-xs";
	if (len > 11) return "text-[9.5px] sm:text-sm";
	return "text-[10.5px] sm:text-sm";
}

export function TransactionHistoryTable({
	monthlyTransactions,
	pockets,
	formatCurrency,
	exportToCSV,
	exportToGoogleSheets,
	supabaseUser,
	loading,
	themeColors,
}: TransactionHistoryTableProps) {
	const { language } = useLanguage();
	const hasPockets = pockets && pockets.length > 0;

	const getPocketBadgeClass = (pocketNameOrId?: string) => {
		if (!pocketNameOrId) return POCKET_BADGE_STYLES.emerald;
		const matched = pockets.find(p => p.name === pocketNameOrId || p.id === pocketNameOrId);
		return POCKET_BADGE_STYLES[matched?.color || "emerald"] || POCKET_BADGE_STYLES.emerald;
	};

	return (
		<section className="glass-card rounded-3xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
			<div className="flex items-center justify-between gap-2.5 flex-wrap">
				<div className="flex items-center gap-2">
					<div className={`w-1.5 h-5 bg-gradient-to-b ${themeColors.gradient} rounded-full`} />
					<h4 className="font-bold text-xs sm:text-sm uppercase tracking-tight">
						{language === "en" ? "Transaction History" : "Riwayat Transaksi"}
					</h4>
				</div>
				<div className="flex items-center gap-1.5 sm:gap-2">
					<Button 
						size="sm" 
						variant="ghost" 
						onClick={exportToCSV}
						className="h-8 px-3 text-[10px] font-black uppercase tracking-wide rounded-full bg-sky-500/12 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-none cursor-pointer flex items-center gap-1.5 transition-colors"
					>
						<Download size={12} className="shrink-0" />
						<span>Export CSV</span>
					</Button>
					{supabaseUser && (
						<Button 
							size="sm" 
							variant="ghost" 
							onClick={exportToGoogleSheets}
							disabled={loading}
							className="h-8 px-3 text-[10px] font-black uppercase tracking-wide rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-none cursor-pointer flex items-center gap-1.5 transition-colors"
						>
							{loading ? (
								<RefreshCw size={12} className="shrink-0 animate-spin" />
							) : (
								<FileSpreadsheet size={12} className="shrink-0" />
							)}
							<span>Sync Sheets</span>
						</Button>
					)}
				</div>
			</div>
			<div className="max-h-[420px] overflow-y-auto overflow-x-hidden sm:overflow-x-auto">
				<table className="w-full table-fixed sm:table-auto text-left text-xs sm:text-sm">
					<thead className="sticky top-0 z-10 bg-white/95 dark:bg-[#222428]/95 backdrop-blur-sm">
						<tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 font-medium">
							<th className={`pb-2.5 px-1 sm:px-2 font-bold uppercase tracking-wider text-[9px] sm:text-[10px] ${hasPockets ? "w-[13%] sm:w-auto" : "w-[14%] sm:w-auto"}`}>
								<span className="sm:hidden">{language === "en" ? "Date" : "Tgl"}</span>
								<span className="hidden sm:inline">{language === "en" ? "Date" : "Tanggal"}</span>
							</th>
							<th className={`pb-2.5 px-1 sm:px-2 font-bold uppercase tracking-wider text-[9px] sm:text-[10px] ${hasPockets ? "w-[27%] sm:w-auto" : "w-[38%] sm:w-auto"}`}>
								{language === "en" ? "Name" : "Nama"}
							</th>
							<th className={`pb-2.5 px-1 sm:px-2 font-bold uppercase tracking-wider text-[9px] sm:text-[10px] ${hasPockets ? "w-[19%] sm:w-auto" : "w-[22%] sm:w-auto"}`}>
								<span className="sm:hidden">{language === "en" ? "Cat." : "Kat."}</span>
								<span className="hidden sm:inline">{language === "en" ? "Category" : "Kategori"}</span>
							</th>
							{hasPockets && (
								<th className="pb-2.5 px-1 sm:px-2 font-bold uppercase tracking-wider text-[9px] sm:text-[10px] w-[18%] sm:w-auto">
									{language === "en" ? "Pocket" : "Kantong"}
								</th>
							)}
							<th className={`pb-2.5 px-1 sm:px-2 text-right font-bold uppercase tracking-wider text-[9px] sm:text-[10px] ${hasPockets ? "w-[23%] sm:w-auto" : "w-[26%] sm:w-auto"}`}>
								<span className="sm:hidden">{language === "en" ? "Amt" : "Jml"}</span>
								<span className="hidden sm:inline">{language === "en" ? "Amount" : "Jumlah"}</span>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
						{[...monthlyTransactions].reverse().map((tx, i) => {
							const isTransfer = isInternalTransfer(tx);
							const amountText = `${tx.amount >= 0 ? "+" : "-"}${formatCurrency(Math.abs(tx.amount))}`;
							const shortDate = formatShortDate(tx.date);
							const fullDate = tx.date.split(",")[0] || tx.date;
							const pocketLabel = tx.pocket || (language === "en" ? "Main" : "Utama");
							const pocketLabelFull = tx.pocket || (language === "en" ? "Main Pocket" : "Dompet Utama");
							const categoryLabel = isTransfer ? (language === "en" ? "Transfer" : "Mutasi") : tx.category;
							const categoryLabelFull = isTransfer ? (language === "en" ? "Transfer" : "Mutasi / Transfer") : tx.category;

							return (
								<tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
									<td className="py-2 px-1 sm:py-3 sm:px-2 text-zinc-500 text-[9.5px] sm:text-xs tabular-nums align-middle">
										<span className="sm:hidden">{shortDate}</span>
										<span className="hidden sm:inline">{fullDate}</span>
									</td>
									<td className="py-2 px-1 sm:py-3 sm:px-2 font-semibold text-[10px] sm:text-sm leading-tight align-middle">
										<span className="line-clamp-2 sm:line-clamp-1 break-words">{tx.name}</span>
									</td>
									<td className="py-2 px-1 sm:py-3 sm:px-2 align-middle">
										<span className={`inline-block max-w-full truncate text-[8.5px] sm:text-[10px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md font-medium align-middle ${
											isTransfer
												? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold"
												: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
										}`}>
											<span className="sm:hidden">{categoryLabel}</span>
											<span className="hidden sm:inline">{categoryLabelFull}</span>
										</span>
									</td>
									{hasPockets && (
										<td className="py-2 px-1 sm:py-3 sm:px-2 align-middle">
											<span className={`${getPocketBadgeClass(tx.pocket)} inline-block max-w-full truncate text-[8.5px] sm:text-[10px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md align-middle`}>
												<span className="sm:hidden">{pocketLabel}</span>
												<span className="hidden sm:inline">{pocketLabelFull}</span>
											</span>
										</td>
									)}
									<td className={`py-2 px-1 sm:py-3 sm:px-2 text-right font-bold tabular-nums whitespace-nowrap align-middle ${getCompactAmountClass(amountText)} ${
										isTransfer
											? "text-cyan-600 dark:text-cyan-400"
											: tx.amount >= 0 ? "text-emerald-600" : "text-red-500"
									}`}>
										{amountText}
									</td>
								</tr>
							);
						})}
						{monthlyTransactions.length === 0 && (
							<tr>
								<td colSpan={hasPockets ? 5 : 4} className="py-8 text-center text-zinc-400 text-xs font-medium">
									{language === "en" ? "No transactions this month" : "Belum ada transaksi bulan ini"}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PocketDef, isInternalTransfer } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";

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
	const { t, language } = useLanguage();

	const getPocketBadgeClass = (pocketNameOrId?: string) => {
		if (!pocketNameOrId) return POCKET_BADGE_STYLES.emerald;
		const matched = pockets.find(p => p.name === pocketNameOrId || p.id === pocketNameOrId);
		return POCKET_BADGE_STYLES[matched?.color || "emerald"] || POCKET_BADGE_STYLES.emerald;
	};

	return (
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
							{pockets && pockets.length > 0 && (
								<th className="pb-3 px-2 font-bold uppercase tracking-wider text-[10px]">{language === "en" ? "Pocket" : "Kantong"}</th>
							)}
							<th className="pb-3 px-2 text-right font-bold uppercase tracking-wider text-[10px]">{language === "en" ? "Amount" : "Jumlah"}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
						{[...monthlyTransactions].reverse().map((t, i) => {
							const isTransfer = isInternalTransfer(t);
							return (
							<tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
								<td className="py-3 px-2 text-zinc-500 text-xs">{t.date.split(',')[0] || t.date}</td>
								<td className="py-3 px-2 font-medium">{t.name}</td>
								<td className="py-3 px-2">
									<span className={`text-[10px] px-2 py-1 rounded-md font-medium ${
										isTransfer
											? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold"
											: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
									}`}>
										{isTransfer ? (language === "en" ? "Transfer" : "Mutasi / Transfer") : t.category}
									</span>
								</td>
								{pockets && pockets.length > 0 && (
									<td className="py-3 px-2">
										<span className={`${getPocketBadgeClass(t.pocket)} text-[10px] px-2 py-1 rounded-md`}>
											{t.pocket || (language === "en" ? "Main Pocket" : "Dompet Utama")}
										</span>
									</td>
								)}
								<td className={`py-3 px-2 text-right font-bold ${
									isTransfer
										? "text-cyan-600 dark:text-cyan-400"
										: t.amount >= 0 ? "text-emerald-600" : "text-red-500"
								}`}>
									{t.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
								</td>
							</tr>
						);})}
						{monthlyTransactions.length === 0 && (
							<tr>
								<td colSpan={pockets && pockets.length > 0 ? 5 : 4} className="py-8 text-center text-zinc-400 text-xs font-medium">
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

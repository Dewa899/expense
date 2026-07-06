"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Wallet, Plus } from "lucide-react";
import { PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";

interface PocketSelectModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	pockets: PocketDef[];
	activePocketIdx: number;
	setActivePocketIdx: (idx: number) => void;
	getPocketBalance: (pocket: PocketDef) => number;
	transactions: any[];
	formatCurrency: (val: number) => string;
	isPrivate: boolean;
	togglePrivacy: () => void;
	onManagePockets?: () => void;
}

export function PocketSelectModal({
	isOpen,
	onOpenChange,
	pockets,
	activePocketIdx,
	setActivePocketIdx,
	getPocketBalance,
	transactions,
	formatCurrency,
	isPrivate,
	togglePrivacy,
	onManagePockets,
}: PocketSelectModalProps) {
	const { t, language } = useLanguage();

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo", type: "default", color: "emerald", target: undefined } as PocketDef,
		...pockets
	], [pockets, language]);

	const maskValue = (val: string) => isPrivate ? "******" : val;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-3xl p-6 duration-200 data-open:slide-in-from-top-12 data-open:zoom-in-100 data-closed:slide-out-to-top-12 data-closed:zoom-out-100">
				<DialogHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 gap-4">
					<DialogTitle className="font-black text-left">
						{language === "en" ? "Select Pocket" : "Pilih Kantong"}
					</DialogTitle>
					<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
						<Button 
							size="icon" 
							variant="ghost" 
							onClick={() => togglePrivacy()}
							className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-150 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent"
						>
							{isPrivate ? <EyeOff size={15} /> : <Eye size={15} />}
						</Button>
						{onManagePockets && (
							<Button 
								size="icon" 
								variant="ghost" 
								onClick={onManagePockets}
								className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-150 rounded-full cursor-pointer flex items-center justify-center border-none bg-transparent"
								aria-label="Manage Pockets"
							>
								<Plus size={15} />
							</Button>
						)}
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
							},
							rose: {
								gradient: "from-rose-500 to-pink-500",
								shadow: "shadow-rose-500/10",
								text: "text-rose-950/80"
							},
							cyan: {
								gradient: "from-cyan-500 to-blue-500",
								shadow: "shadow-cyan-500/10",
								text: "text-cyan-950/80"
							},
							violet: {
								gradient: "from-violet-500 to-fuchsia-500",
								shadow: "shadow-violet-500/10",
								text: "text-violet-950/80"
							},
							orange: {
								gradient: "from-orange-500 to-yellow-500",
								shadow: "shadow-orange-500/10",
								text: "text-orange-950/80"
							}
						}[p.color || "emerald"];

						const pBalance = getPocketBalance(p);
						const pInitial = transactions.find(t => t.category === "Initial Balance" && (p.id === "net_worth" || t.pocket === p.name || t.pocket === p.id))?.amount || 0;
						const pIncome = transactions.filter(t => t.category !== "Initial Balance" && (p.id === "net_worth" || t.pocket === p.name || t.pocket === p.id) && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
						const pExpense = Math.abs(transactions.filter(t => t.category !== "Initial Balance" && (p.id === "net_worth" || t.pocket === p.name || t.pocket === p.id) && t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

						return (
							<button
								key={p.id}
								onClick={() => {
									onOpenChange(false);
									setTimeout(() => {
										setActivePocketIdx(idx);
									}, 150);
								}}
								className={`w-full text-left rounded-3xl p-5 bg-gradient-to-br ${pColors.gradient} text-black shadow-md ${pColors.shadow} relative overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98] border-none flex flex-col justify-between min-h-[110px]`}
							>
								<div className="flex justify-between items-start w-full">
									<div className="flex flex-col max-w-[75%]">
										<span className="text-[8px] font-black uppercase tracking-wider opacity-60">
											{p.id === "net_worth" ? (language === "en" ? "Total Balance" : "Total Saldo") : "Pocket"}
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
										<span className="text-emerald-950/80">+{maskValue(formatCurrency(pIncome))}</span>
										<span className="text-red-950/80">-{maskValue(formatCurrency(pExpense))}</span>
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}

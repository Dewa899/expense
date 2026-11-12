"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Wallet, Plus, ArrowLeftRight } from "lucide-react";
import { PocketDef, isInternalTransfer } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";
import { ModalScrollArea } from "@/components/ui/modal-scroll-area";

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
	onMoveFunds?: () => void;
}

const SOFT_POCKET_STYLES: Record<string, { gradient: string; text: string; badgeBg: string }> = {
	emerald: {
		gradient: "from-[#6EE7B7] to-[#34D399]",
		text: "text-[#063626]",
		badgeBg: "bg-[#063626]/10 text-[#063626]",
	},
	indigo: {
		gradient: "from-[#A5B4FC] to-[#818CF8]",
		text: "text-[#1E1B4B]",
		badgeBg: "bg-[#1E1B4B]/10 text-[#1E1B4B]",
	},
	amber: {
		gradient: "from-[#FCD34D] to-[#FBBF24]",
		text: "text-[#451A03]",
		badgeBg: "bg-[#451A03]/10 text-[#451A03]",
	},
	rose: {
		gradient: "from-[#FDA4AF] to-[#FB7185]",
		text: "text-[#4C0519]",
		badgeBg: "bg-[#4C0519]/10 text-[#4C0519]",
	},
	cyan: {
		gradient: "from-[#67E8F9] to-[#22D3EE]",
		text: "text-[#083344]",
		badgeBg: "bg-[#083344]/10 text-[#083344]",
	},
	violet: {
		gradient: "from-[#C4B5FD] to-[#A78BFA]",
		text: "text-[#2E1065]",
		badgeBg: "bg-[#2E1065]/10 text-[#2E1065]",
	},
	orange: {
		gradient: "from-[#FDBA74] to-[#FB923C]",
		text: "text-[#431407]",
		badgeBg: "bg-[#431407]/10 text-[#431407]",
	},
};

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
	onMoveFunds,
}: PocketSelectModalProps) {
	const { language } = useLanguage();

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{
			id: "net_worth",
			name: pockets.length > 0
				? (language === "en" ? "Unallocated Balance" : "Saldo Utama")
				: (language === "en" ? "Total Balance" : "Total Saldo"),
			type: "default",
			color: "emerald",
			target: undefined,
		} as PocketDef,
		...pockets,
	], [pockets, language]);

	const maskValue = (val: string) => (isPrivate ? "******" : val);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px] rounded-3xl p-5 duration-200 data-open:slide-in-from-top-12 data-open:zoom-in-100 data-closed:slide-out-to-top-12 data-closed:zoom-out-100 gap-3">
				{/* Distinct Header */}
				<DialogHeader className="flex flex-row items-center justify-between pb-1 gap-3 pr-9">
					<DialogTitle className="font-black text-left text-base">
						{language === "en" ? "Select Pocket" : "Pilih Kantong"}
					</DialogTitle>
					<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
						<Button
							size="icon"
							variant="ghost"
							onClick={() => togglePrivacy()}
							className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl cursor-pointer flex items-center justify-center border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C]"
							title={language === "en" ? "Toggle Privacy" : "Sembunyikan Saldo"}
						>
							{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
						</Button>
					</div>
				</DialogHeader>

				{/* Recessed Shaded Scrollable Body with Circular Interactive Scrollbar */}
				<ModalScrollArea maxHeightClass="max-h-[360px]" contentClassName="space-y-3">
					<div className="space-y-2.5">
						{carouselPockets.map((p, idx) => {
							const style = SOFT_POCKET_STYLES[p.color || "emerald"] || SOFT_POCKET_STYLES.emerald;
							const isSelected = idx === activePocketIdx;

							const matchesPocket = (t: any) => {
								if (p.id === "net_worth") {
									return !pockets.some(
										(pk) => t.pocket === pk.name || t.pocket === pk.id || (t as any).pocket_id === pk.id
									);
								}
								return t.pocket === p.name || t.pocket === p.id || (t as any).pocket_id === p.id;
							};

							const pBalance = getPocketBalance(p);
							const pInitial = transactions
								.filter((t) => t.category === "Initial Balance" && matchesPocket(t))
								.reduce((sum, t) => sum + t.amount, 0);
							const pIncome = transactions
								.filter(
									(t) =>
										t.category !== "Initial Balance" &&
										!isInternalTransfer(t) &&
										matchesPocket(t) &&
										t.amount > 0
								)
								.reduce((sum, t) => sum + t.amount, 0);
							const pExpense = Math.abs(
								transactions
									.filter(
										(t) =>
											t.category !== "Initial Balance" &&
											!isInternalTransfer(t) &&
											matchesPocket(t) &&
											t.amount < 0
									)
									.reduce((sum, t) => sum + t.amount, 0)
							);

							return (
								<button
									key={p.id}
									type="button"
									onClick={() => {
										onOpenChange(false);
										setTimeout(() => {
											setActivePocketIdx(idx);
										}, 150);
									}}
									className={`w-full text-left rounded-3xl px-6 py-4 bg-gradient-to-br ${style.gradient} ${style.text} shadow-[0_4px_10px_rgba(0,0,0,0.08)] relative overflow-hidden transition-all duration-200 cursor-pointer hover:brightness-[0.98] active:scale-[0.98] border-none flex flex-col justify-between gap-2.5 ${
										isSelected ? "ring-2 ring-zinc-900/30 dark:ring-white/40" : ""
									}`}
								>
									{/* Top Row with comfortable breathing room from rounded-3xl corners */}
									<div className="flex justify-between items-center gap-2 w-full">
										<div className="flex flex-col min-w-0 max-w-[70%]">
											<span className="text-[9px] font-extrabold uppercase tracking-wider opacity-65 leading-none">
												{p.id === "net_worth"
													? pockets.length > 0
														? (language === "en" ? "Main Pocket" : "Dompet Utama")
														: (language === "en" ? "Total Balance" : "Total Saldo")
													: "Pocket"}
											</span>
											<h4 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5 mt-1 truncate">
												<Wallet size={13} className="opacity-75 shrink-0" />
												<span className="truncate">{p.name}</span>
											</h4>
										</div>
										<span className={`text-[9px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${style.badgeBg}`}>
											{p.id === "net_worth"
												? pockets.length > 0
													? (language === "en" ? "Unallocated" : "Saldo Bebas")
													: (language === "en" ? "Overview" : "Semua")
												: p.type}
										</span>
									</div>

									{/* Middle Balance Row */}
									<div className="w-full py-0.5">
										<h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
											{maskValue(formatCurrency(pBalance))}
										</h2>
									</div>

									{/* Bottom Breakdown Row */}
									<div className="pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-black opacity-80 w-full gap-2">
										<div className="flex items-center gap-1 truncate">
											<Wallet size={11} className="opacity-65 shrink-0" />
											<span className="truncate">{maskValue(formatCurrency(pInitial))}</span>
										</div>
										<div className="flex items-center gap-2.5 shrink-0">
											<span className="opacity-90">+{maskValue(formatCurrency(pIncome))}</span>
											<span className="text-red-950/85">-{maskValue(formatCurrency(pExpense))}</span>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</ModalScrollArea>

				{/* Distinct Footer with Move Funds & Manage Pockets Actions */}
				{(onMoveFunds || onManagePockets) && (
					<div className={`grid ${onMoveFunds && onManagePockets && pockets.length > 0 ? "grid-cols-2" : "grid-cols-1"} gap-2 pt-1`}>
						{pockets.length > 0 && onMoveFunds && (
							<Button
								type="button"
								variant="outline"
								onClick={onMoveFunds}
								className="h-11 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] text-zinc-800 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
							>
								<ArrowLeftRight size={14} className="text-emerald-500" />
								<span>{language === "en" ? "Move Funds" : "Pindah Dana"}</span>
							</Button>
						)}
						{onManagePockets && (
							<Button
								type="button"
								variant="outline"
								onClick={onManagePockets}
								className="h-11 rounded-2xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C] text-zinc-800 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
							>
								<Plus size={14} className="text-emerald-500" />
								<span>{language === "en" ? "Manage Pockets" : "Kelola Kantong"}</span>
							</Button>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

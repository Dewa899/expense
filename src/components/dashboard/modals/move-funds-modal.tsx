"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { ArrowLeftRight, AlertCircle } from "lucide-react";
import { PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { cleanNumber, formatCurrency as defaultFormatCurrency } from "@/lib/sheets-api";
import { WarningConfirmModal } from "./warning-confirm-modal";

interface MoveFundsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	pockets: PocketDef[];
	activePocket: PocketDef;
	onMoveFunds: (source: string, target: string, amount: number) => void;
	transactions?: any[];
	formatCurrency?: (val: number) => string;
	themeColors: {
		text: string;
		gradient: string;
	};
}

export function MoveFundsModal({
	isOpen,
	onOpenChange,
	pockets,
	activePocket,
	onMoveFunds,
	transactions = [],
	formatCurrency = defaultFormatCurrency,
	themeColors,
}: MoveFundsModalProps) {
	const { language } = useLanguage();
	const isMobile = useIsMobile();

	// Fields
	const [sourcePocket, setSourcePocket] = React.useState<string>("net_worth");
	const [targetPocket, setTargetPocket] = React.useState<string>("");
	const [amountStr, setAmountStr] = React.useState<string>("");
	const [mobileKbHeader, setMobileKbHeader] = React.useState<string | null>(null);

	// Confirm & Warning states
	const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
	const [isUnsavedWarningOpen, setIsUnsavedWarningOpen] = React.useState(false);

	// Calculate balances for Main Pocket (Unallocated) and each Custom Pocket
	const mainPocketBalance = React.useMemo(() => {
		return transactions
			.filter(t => !pockets.some(p => t.pocket === p.name || t.pocket === p.id || (t as any).pocket_id === p.id))
			.reduce((sum, t) => sum + t.amount, 0);
	}, [transactions, pockets]);

	const getCustomPocketBalance = React.useCallback(
		(pocket: PocketDef) => {
			return transactions
				.filter(t => t.pocket === pocket.name || t.pocket === pocket.id || (t as any).pocket_id === pocket.id)
				.reduce((sum, t) => sum + t.amount, 0);
		},
		[transactions]
	);

	const mainPocketLabel = language === "en" ? "Main Pocket (Unallocated)" : "Dompet Utama (Saldo Bebas)";

	// Sync initial source pocket when modal opens
	React.useEffect(() => {
		if (isOpen) {
			setSourcePocket(activePocket.id);
			setTargetPocket("");
			setAmountStr("");
			setMobileKbHeader(null);
		}
	}, [isOpen, activePocket]);

	const availableTargets = React.useMemo(() => {
		const list = pockets.filter(p => p.id !== sourcePocket);
		if (sourcePocket !== "net_worth") {
			return [
				{
					id: "net_worth",
					name: mainPocketLabel,
					balance: mainPocketBalance
				},
				...list.map(p => ({
					id: p.id,
					name: p.name,
					balance: getCustomPocketBalance(p)
				}))
			];
		}
		return list.map(p => ({
			id: p.id,
			name: p.name,
			balance: getCustomPocketBalance(p)
		}));
	}, [sourcePocket, pockets, mainPocketLabel, mainPocketBalance, getCustomPocketBalance]);

	// Auto-select first available target pocket when source changes
	React.useEffect(() => {
		if (availableTargets.length > 0 && (!targetPocket || targetPocket === sourcePocket || !availableTargets.some(t => t.id === targetPocket))) {
			setTargetPocket(availableTargets[0].id);
		}
	}, [sourcePocket, availableTargets, targetPocket]);

	const sourceName = React.useMemo(() => {
		if (sourcePocket === "net_worth") {
			return mainPocketLabel;
		}
		return pockets.find(p => p.id === sourcePocket)?.name || "";
	}, [sourcePocket, pockets, mainPocketLabel]);

	const targetName = React.useMemo(() => {
		if (targetPocket === "net_worth") {
			return mainPocketLabel;
		}
		return pockets.find(p => p.id === targetPocket || p.name === targetPocket)?.name || targetPocket;
	}, [targetPocket, pockets, mainPocketLabel]);

	const sourceAvailableBalance = React.useMemo(() => {
		if (sourcePocket === "net_worth") {
			return mainPocketBalance;
		}
		const found = pockets.find(p => p.id === sourcePocket);
		return found ? getCustomPocketBalance(found) : 0;
	}, [sourcePocket, mainPocketBalance, pockets, getCustomPocketBalance]);

	const enteredAmount = React.useMemo(() => {
		return cleanNumber(stripRupiah(amountStr));
	}, [amountStr]);

	const isInsufficientBalance = React.useMemo(() => {
		if (enteredAmount <= 0) return false;
		return enteredAmount > sourceAvailableBalance;
	}, [enteredAmount, sourceAvailableBalance]);

	const hasChanges = React.useMemo(() => {
		return amountStr !== "" && enteredAmount > 0;
	}, [amountStr, enteredAmount]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			if (hasChanges) {
				setIsUnsavedWarningOpen(true);
			} else {
				resetFields();
				onOpenChange(false);
			}
		} else {
			onOpenChange(true);
		}
	};

	const resetFields = () => {
		setAmountStr("");
		setTargetPocket("");
		setSourcePocket(activePocket.id);
		setMobileKbHeader(null);
	};

	const handleConfirmMove = () => {
		if (enteredAmount <= 0 || !targetPocket || isInsufficientBalance) return;
		onMoveFunds(sourcePocket, targetPocket, enteredAmount);
		resetFields();
		onOpenChange(false);
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[420px] rounded-3xl p-6">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<ArrowLeftRight className={themeColors.text} size={20} />
							{language === "en" ? "Move Funds" : "Pindah Dana"}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-5 pt-4">
						{/* Source Pocket */}
						<div className="space-y-2">
							<Label className="text-xs text-zinc-500 font-bold">
								{language === "en" ? "From (Source)" : "Dari (Sumber)"}
							</Label>
							<Select value={sourcePocket} onValueChange={(val) => setSourcePocket(val || "net_worth")}>
								<SelectTrigger className="w-full h-12 rounded-xl cursor-pointer text-sm">
									<SelectValue>
										{sourcePocket === "net_worth"
											? `${mainPocketLabel} — ${formatCurrency(mainPocketBalance)}`
											: (() => {
													const p = pockets.find(pk => pk.id === sourcePocket);
													return p ? `${p.name} — ${formatCurrency(getCustomPocketBalance(p))}` : sourceName;
											  })()}
									</SelectValue>
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									<SelectItem value="net_worth" className="cursor-pointer py-3 px-4">
										{mainPocketLabel} — {formatCurrency(mainPocketBalance)}
									</SelectItem>
									{pockets.map(p => (
										<SelectItem key={p.id} value={p.id} className="cursor-pointer py-3 px-4">
											{p.name} — {formatCurrency(getCustomPocketBalance(p))}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Target Pocket */}
						<div className="space-y-2">
							<Label className="text-xs text-zinc-500 font-bold">
								{language === "en" ? "To (Destination)" : "Ke (Tujuan)"}
							</Label>
							<Select value={targetPocket} onValueChange={(val) => setTargetPocket(val || "")}>
								<SelectTrigger className="w-full h-12 rounded-xl cursor-pointer text-sm">
									<SelectValue placeholder={language === "en" ? "Select target pocket" : "Pilih kantong tujuan"}>
										{(() => {
											const tgt = availableTargets.find(t => t.id === targetPocket);
											return tgt ? `${tgt.name} — ${formatCurrency(tgt.balance)}` : targetName;
										})()}
									</SelectValue>
								</SelectTrigger>
								<SelectContent className="rounded-xl">
									{availableTargets.map(p => (
										<SelectItem key={p.id} value={p.id} className="cursor-pointer py-3 px-4">
											{p.name} — {formatCurrency(p.balance)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Amount Input */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-xs text-zinc-500 font-bold">
									{language === "en" ? "Amount to Move (Rp)" : "Jumlah Dana (Rp)"}
								</Label>
								<div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
									<span>
										{language === "en" ? "Available:" : "Tersedia:"}{" "}
										<strong className={sourceAvailableBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
											{formatCurrency(Math.max(0, sourceAvailableBalance))}
										</strong>
									</span>
									{sourceAvailableBalance > 0 && (
										<button
											type="button"
											onClick={() => setAmountStr(formatRupiah(Math.floor(sourceAvailableBalance).toString()))}
											className={`px-1.5 py-0.5 rounded-md ${themeColors.text} bg-emerald-500/10 hover:bg-emerald-500/20 font-black uppercase text-[9px] cursor-pointer transition-colors`}
										>
											{language === "en" ? "Max" : "Maks"}
										</button>
									)}
								</div>
							</div>
							<div className="relative flex items-center">
								<span className="absolute left-3.5 text-xs font-black text-zinc-400 select-none">Rp</span>
								<Input
									placeholder="e.g. 50.000"
									value={amountStr}
									onChange={(e) => setAmountStr(formatRupiah(stripRupiah(e.target.value)))}
									inputMode={isMobile ? "none" : "numeric"}
									readOnly={isMobile}
									onFocus={() => isMobile && setMobileKbHeader("move_funds_amount")}
									onClick={() => isMobile && setMobileKbHeader("move_funds_amount")}
									className={`h-12 pl-9 rounded-xl w-full text-sm font-black focus-visible:ring-1 ${
										isInsufficientBalance ? "border-red-500 focus-visible:ring-red-500" : ""
									}`}
								/>
							</div>

							{isInsufficientBalance && (
								<div className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 pt-0.5">
									<AlertCircle size={13} className="shrink-0" />
									<span>
										{language === "en"
											? `Insufficient balance! Available in ${sourceName}: ${formatCurrency(Math.max(0, sourceAvailableBalance))}`
											: `Saldo tidak mencukupi! Saldo tersedia di ${sourceName}: ${formatCurrency(Math.max(0, sourceAvailableBalance))}`}
									</span>
								</div>
							)}

							{isMobile && mobileKbHeader === "move_funds_amount" && (
								<NumericKeyboard
									value={amountStr}
									onChange={(val) => setAmountStr(val)}
									onSubmit={() => setMobileKbHeader(null)}
								/>
							)}
						</div>

						<Button
							onClick={() => setIsConfirmOpen(true)}
							disabled={!targetPocket || !amountStr || enteredAmount <= 0 || isInsufficientBalance}
							className={`w-full h-12 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black rounded-xl border-none shadow-lg cursor-pointer mt-2`}
						>
							{language === "en" ? "Move Funds" : "Pindah Dana"}
						</Button>
					</div>

					{isMobile && mobileKbHeader !== null && (
						<div
							className="fixed inset-0 z-[110] bg-transparent"
							onClick={() => {
								const cleaned = (amountStr || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
								if (cleaned) {
									const result = evaluateExpression(cleaned);
									setAmountStr(formatRupiah(result.toString()));
								}
								setMobileKbHeader(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Defer Confirm Modal */}
			<WarningConfirmModal
				isOpen={isConfirmOpen}
				onOpenChange={setIsConfirmOpen}
				title={language === "en" ? "Confirm Move Funds" : "Konfirmasi Pindah Dana"}
				description={
					language === "en"
						? `Are you sure you want to move Rp ${amountStr} from "${sourceName}" to "${targetName}"?`
						: `Apakah Anda yakin ingin memindahkan dana sebesar Rp ${amountStr} dari "${sourceName}" ke "${targetName}"?`
				}
				confirmText={language === "en" ? "Yes, Move" : "Ya, Pindahkan"}
				cancelText={language === "en" ? "Cancel" : "Batal"}
				variant="warning"
				onConfirm={handleConfirmMove}
			/>

			{/* Unsaved exit Warning */}
			<WarningConfirmModal
				isOpen={isUnsavedWarningOpen}
				onOpenChange={setIsUnsavedWarningOpen}
				title={language === "en" ? "Discard Transfer" : "Batalkan Perpindahan"}
				description={
					language === "en"
						? "You have entered a transfer amount. Closing will discard this transfer. Are you sure?"
						: "Anda telah mengisi jumlah dana. Menutup modal ini akan membatalkan perpindahan dana. Apakah Anda yakin?"
				}
				confirmText={language === "en" ? "Yes, Discard" : "Ya, Batal"}
				cancelText={language === "en" ? "Keep Transferring" : "Kembali"}
				variant="warning"
				onConfirm={() => {
					resetFields();
					setIsUnsavedWarningOpen(false);
					onOpenChange(false);
				}}
			/>
		</>
	);
}

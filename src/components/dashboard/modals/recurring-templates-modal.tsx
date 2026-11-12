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
import { CalendarDays, Trash2 } from "lucide-react";
import { PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { cleanNumber } from "@/lib/sheets-api";
import { WarningConfirmModal } from "./warning-confirm-modal";
import { ModalScrollArea } from "@/components/ui/modal-scroll-area";

interface RecurringTemplatesModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	categories: string[];
	pockets: PocketDef[];
	recurringTemplates: any[];
	handleAddRecurringTemplate: (template: any) => void;
	handleDeleteRecurringTemplate: (id: string) => void;
	themeColors: {
		text: string;
		gradient: string;
	};
}

export function RecurringTemplatesModal({
	isOpen,
	onOpenChange,
	categories,
	pockets,
	recurringTemplates,
	handleAddRecurringTemplate,
	handleDeleteRecurringTemplate,
	themeColors,
}: RecurringTemplatesModalProps) {
	const { t, language } = useLanguage();
	const isMobile = useIsMobile();

	// Temporary fields state for creation form
	const [recName, setRecName] = React.useState("");
	const [recAmount, setRecAmount] = React.useState("");
	const [recType, setRecType] = React.useState<"expense" | "income">("expense");
	const [recCategory, setRecCategory] = React.useState("");
	const [recInterval, setRecInterval] = React.useState<"daily" | "weekly" | "monthly">("monthly");
	const [recPocket, setRecPocket] = React.useState("unassigned");
	const [mobileKbHeader, setMobileKbHeader] = React.useState<string | null>(null);

	const today = new Date();
	const [recWeeklyDay, setRecWeeklyDay] = React.useState<string>(String(today.getDay()));
	const [recMonthlyDate, setRecMonthlyDate] = React.useState<string>(today.toISOString().split("T")[0]);
	
	const [templateToDeleteId, setTemplateToDeleteId] = React.useState<string | null>(null);
	const [isUnsavedWarningOpen, setIsUnsavedWarningOpen] = React.useState(false);

	const daysOfWeek = [
		{ value: "0", labelEn: "Sunday", labelId: "Minggu" },
		{ value: "1", labelEn: "Monday", labelId: "Senin" },
		{ value: "2", labelEn: "Tuesday", labelId: "Selasa" },
		{ value: "3", labelEn: "Wednesday", labelId: "Rabu" },
		{ value: "4", labelEn: "Thursday", labelId: "Kamis" },
		{ value: "5", labelEn: "Friday", labelId: "Jumat" },
		{ value: "6", labelEn: "Saturday", labelId: "Sabtu" }
	];

	const selectedDayLabel = React.useMemo(() => {
		const d = daysOfWeek.find((day) => day.value === recWeeklyDay);
		return d ? (language === "en" ? d.labelEn : d.labelId) : "";
	}, [recWeeklyDay, language]);

	// Pre-fill first category when available
	React.useEffect(() => {
		if (categories.length > 0 && !recCategory) {
			setRecCategory(categories[0]);
		}
	}, [categories, recCategory]);

	const hasChanges = React.useMemo(() => {
		return recName !== "" || recAmount !== "" || recPocket !== "unassigned";
	}, [recName, recAmount, recPocket]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			if (hasChanges) {
				setIsUnsavedWarningOpen(true);
			} else {
				resetForm();
				onOpenChange(false);
			}
		} else {
			onOpenChange(true);
		}
	};

	const resetForm = () => {
		setRecName("");
		setRecAmount("");
		setRecPocket("unassigned");
		setRecWeeklyDay(String(new Date().getDay()));
		setRecMonthlyDate(new Date().toISOString().split("T")[0]);
	};

	const handleCreateRecurring = () => {
		if (!recName.trim() || !recAmount) return;
		const rawAmt = cleanNumber(stripRupiah(recAmount));
		if (rawAmt <= 0) return;

		const targetRun = new Date();
		if (recInterval === "daily") {
			targetRun.setDate(targetRun.getDate() + 1);
		} else if (recInterval === "weekly") {
			const currentDay = targetRun.getDay();
			const targetDay = parseInt(recWeeklyDay, 10);
			let daysUntil = targetDay - currentDay;
			if (daysUntil <= 0) daysUntil += 7;
			targetRun.setDate(targetRun.getDate() + daysUntil);
		} else if (recInterval === "monthly") {
			const selectedDate = new Date(recMonthlyDate);
			const targetDayOfMonth = selectedDate.getDate();
			targetRun.setDate(targetDayOfMonth);
			if (targetRun < new Date()) {
				targetRun.setMonth(targetRun.getMonth() + 1);
			}
		}

		const template = {
			id: Math.random().toString(36).substring(2, 9),
			name: recName.trim(),
			amount: rawAmt,
			type: recType,
			category: recCategory || categories[0] || "Lainnya",
			pocket: recPocket === "unassigned" ? "" : recPocket,
			interval_unit: recInterval,
			interval_value: 1,
			next_execution_at: targetRun.toISOString(),
			last_executed_at: null,
		};

		handleAddRecurringTemplate(template);
		resetForm();
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[450px] rounded-3xl p-5 gap-3">
					<DialogHeader className="pb-0.5">
						<DialogTitle className="flex items-center gap-2 text-base font-black">
							<CalendarDays className="text-emerald-500" size={19} />
							{language === "en" ? "Recurring Transaction Templates" : "Template Transaksi Otomatis"}
						</DialogTitle>
					</DialogHeader>

					<ModalScrollArea maxHeightClass="max-h-[440px]">
						<div className="space-y-4">
							{/* Section 1: Create new template */}
							<div className="p-4 bg-white dark:bg-[#222428] border-none shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-2xl space-y-2.5">
								<p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
									{language === "en" ? "Create Auto-Transaction" : "Buat Transaksi Otomatis"}
								</p>
								
								<div className="space-y-2">
									<Input
										placeholder={language === "en" ? "Transaction Name (e.g. Salary)" : "Nama Transaksi (misal: Uang Jajan)"}
										value={recName}
										onChange={(e) => setRecName(e.target.value)}
										className="h-10 rounded-xl border-none bg-[#F1F3F5] dark:bg-[#2B2E33]"
									/>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="relative flex items-center">
										<span className="absolute left-3 text-[10px] font-black text-zinc-400 select-none">Rp</span>
										<Input
											placeholder="e.g. 500.000"
											value={recAmount}
											onChange={(e) => setRecAmount(formatRupiah(stripRupiah(e.target.value)))}
											inputMode={isMobile ? "none" : "numeric"}
											readOnly={isMobile}
											onFocus={() => isMobile && setMobileKbHeader("auto_transaction_amount")}
											onClick={() => isMobile && setMobileKbHeader("auto_transaction_amount")}
											className="h-10 pl-7 rounded-xl w-full border-none bg-[#F1F3F5] dark:bg-[#2B2E33]"
										/>
									</div>
									
									<Select value={recType} onValueChange={(val: any) => setRecType(val)}>
										<SelectTrigger className="h-10 rounded-xl cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="rounded-xl">
											<SelectItem value="expense" className="cursor-pointer">{t("expense")}</SelectItem>
											<SelectItem value="income" className="cursor-pointer">{t("income")}</SelectItem>
										</SelectContent>
									</Select>

									{isMobile && mobileKbHeader === "auto_transaction_amount" && (
										<div className="col-span-2 mt-1">
											<NumericKeyboard
												value={recAmount}
												onChange={(val) => setRecAmount(val)}
												onSubmit={() => {
													setMobileKbHeader(null);
												}}
											/>
										</div>
									)}
								</div>

								<div className="grid grid-cols-2 gap-2">
									<Select value={recCategory} onValueChange={(val) => setRecCategory(val || "")}>
										<SelectTrigger className="h-10 rounded-xl cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33]">
											<SelectValue placeholder={t("category")} />
										</SelectTrigger>
										<SelectContent className="rounded-xl w-auto min-w-[240px]">
											{categories.map((c) => (
												<SelectItem key={c} value={c} className="cursor-pointer">{c}</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select value={recInterval} onValueChange={(val: any) => setRecInterval(val || "monthly")}>
										<SelectTrigger className="h-10 rounded-xl cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="rounded-xl">
											<SelectItem value="daily" className="cursor-pointer">{language === "en" ? "Daily" : "Harian"}</SelectItem>
											<SelectItem value="weekly" className="cursor-pointer">{language === "en" ? "Weekly" : "Mingguan"}</SelectItem>
											<SelectItem value="monthly" className="cursor-pointer">{language === "en" ? "Monthly" : "Bulanan"}</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Weekly Day of Week Selector */}
								{recInterval === "weekly" && (
									<div className="space-y-1">
										<Label className="text-[10px] text-zinc-400 font-bold">
											{language === "en" ? "Select Day of Week" : "Pilih Hari"}
										</Label>
										<Select value={recWeeklyDay} onValueChange={(val) => setRecWeeklyDay(val || "")}>
											<SelectTrigger className="h-10 rounded-xl cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33]">
												{selectedDayLabel}
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												{daysOfWeek.map((d) => (
													<SelectItem key={d.value} value={d.value} className="cursor-pointer">
														{language === "en" ? d.labelEn : d.labelId}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{/* Monthly Date Picker */}
								{recInterval === "monthly" && (
									<div className="space-y-1">
										<Label className="text-[10px] text-zinc-400 font-bold">
											{language === "en" ? "Select Monthly Date" : "Pilih Tanggal"}
										</Label>
										<Input
											type="date"
											value={recMonthlyDate}
											onChange={(e) => setRecMonthlyDate(e.target.value)}
											className="h-10 rounded-xl w-full border-none bg-[#F1F3F5] dark:bg-[#2B2E33]"
										/>
									</div>
								)}

								{pockets.length > 0 && (
									<div className="space-y-1">
										<Label className="text-[10px] text-zinc-400 font-bold">{language === "en" ? "Select Pocket" : "Pilih Kantong"}</Label>
										<Select value={recPocket} onValueChange={(val) => setRecPocket(val || "unassigned")}>
											<SelectTrigger className="h-10 rounded-xl cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value="unassigned" className="cursor-pointer">{language === "en" ? "No Pocket" : "Tanpa Kantong"}</SelectItem>
												{pockets.map((p) => (
													<SelectItem key={p.id} value={p.name} className="cursor-pointer">{p.name}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								<Button
									onClick={handleCreateRecurring}
									disabled={!recName.trim() || !recAmount}
									className="w-full h-10 bg-gradient-to-r from-[#6EE7B7] to-[#34D399] hover:opacity-95 text-[#063626] font-black rounded-xl border-none shadow-sm cursor-pointer"
								>
									{language === "en" ? "Schedule Transaction" : "Jadwalkan Transaksi"}
								</Button>
							</div>

							{/* Section 2: Active list */}
							<div className="space-y-2">
								<p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider px-1">
									{language === "en" ? "Active Automations" : "Daftar Transaksi Otomatis"}
								</p>
								{recurringTemplates.length === 0 ? (
									<div className="py-5 text-center text-zinc-500 dark:text-zinc-400 text-xs font-semibold bg-white/60 dark:bg-[#222428]/60 rounded-2xl">
										{language === "en" ? "No scheduled transactions" : "Belum ada transaksi otomatis yang dijadwalkan"}
									</div>
								) : (
									<div className="space-y-2">
										{recurringTemplates.map((t) => (
											<div key={t.id} className="p-3 bg-white dark:bg-[#222428] border-none shadow-xs rounded-2xl flex items-center justify-between">
												<div className="space-y-0.5">
													<div className="flex items-center gap-1.5">
														<p className="text-sm font-bold">{t.name}</p>
														<span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
															t.type === "expense" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
														}`}>
															{t.type}
														</span>
													</div>
													<p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
														Rp {formatRupiah(t.amount.toString())} • {t.category} {pockets.length > 0 && `• Saku: ${t.pocket}`}
													</p>
													<p className="text-[8px] uppercase tracking-wider text-zinc-400 font-bold">
														Interval: {t.interval_unit} (Next: {new Date(t.next_execution_at).toLocaleDateString()})
													</p>
												</div>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setTemplateToDeleteId(t.id)}
													className="text-destructive cursor-pointer hover:bg-destructive/15 h-8 w-8 p-0 rounded-full"
												>
													<Trash2 size={14} />
												</Button>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</ModalScrollArea>

					{isMobile && mobileKbHeader !== null && (
						<div
							className="fixed inset-0 z-[110] bg-transparent"
							onClick={() => {
								const cleaned = (recAmount || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
								if (cleaned) {
									const result = evaluateExpression(cleaned);
									setRecAmount(formatRupiah(result.toString()));
								}
								setMobileKbHeader(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Template Deletion Warning */}
			<WarningConfirmModal
				isOpen={templateToDeleteId !== null}
				onOpenChange={(open) => { if (!open) setTemplateToDeleteId(null); }}
				title={language === "en" ? "Delete Recurring Template" : "Hapus Transaksi Otomatis"}
				description={
					language === "en"
						? "Are you sure you want to delete this scheduled transaction template? This will stop future executions of this transaction."
						: "Apakah Anda yakin ingin menghapus template transaksi otomatis ini? Tindakan ini akan menghentikan transaksi otomatis di masa mendatang."
				}
				confirmText={language === "en" ? "Delete" : "Hapus"}
				cancelText={language === "en" ? "Cancel" : "Batal"}
				onConfirm={() => {
					if (templateToDeleteId) {
						handleDeleteRecurringTemplate(templateToDeleteId);
						setTemplateToDeleteId(null);
					}
				}}
			/>

			{/* Unsaved Changes Warning Dialog */}
			<WarningConfirmModal
				isOpen={isUnsavedWarningOpen}
				onOpenChange={setIsUnsavedWarningOpen}
				title={language === "en" ? "Unsaved Changes" : "Perubahan Belum Disimpan"}
				description={
					language === "en"
						? "Any changes will not be saved if closed. Are you sure you want to discard your changes?"
						: "Segala perubahan tidak akan disimpan jika ditutup. Apakah Anda yakin ingin membuang perubahan Anda?"
				}
				confirmText={language === "en" ? "Yes, Discard" : "Ya, Buang"}
				cancelText={language === "en" ? "Keep Editing" : "Kembali"}
				variant="warning"
				onConfirm={() => {
					resetForm();
					setIsUnsavedWarningOpen(false);
					onOpenChange(false);
				}}
			/>
		</>
	);
}

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
import { Settings, Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle, Check } from "lucide-react";
import { PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";
import { formatRupiah, stripRupiah, NumericKeyboard, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { WarningConfirmModal } from "./warning-confirm-modal";
import { useIsMobile } from "@/hooks/use-mobile";

const SELECTABLE_POCKET_COLORS: ("indigo" | "amber" | "rose" | "cyan" | "violet" | "orange")[] = [
	"indigo",
	"amber",
	"rose",
	"cyan",
	"violet",
	"orange"
];

const getFirstUnusedColor = (currentPockets: PocketDef[]): "indigo" | "amber" | "rose" | "cyan" | "violet" | "orange" => {
	const used = currentPockets.map(p => p.color);
	for (const color of SELECTABLE_POCKET_COLORS) {
		if (!used.includes(color)) {
			return color;
		}
	}
	return "indigo";
};

interface PocketSettingsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	pockets: PocketDef[];
	handleUpdatePockets: (list: PocketDef[]) => void;
	setStatusModal: (state: any) => void;
}

export function PocketSettingsModal({
	isOpen,
	onOpenChange,
	pockets,
	handleUpdatePockets,
	setStatusModal,
}: PocketSettingsModalProps) {
	const { language } = useLanguage();
	const isMobile = useIsMobile();
	const [localPockets, setLocalPockets] = React.useState<PocketDef[]>(pockets);
	const [pocketToDeleteIdx, setPocketToDeleteIdx] = React.useState<number | null>(null);
	const [isUnsavedWarningOpen, setIsUnsavedWarningOpen] = React.useState(false);
	const [focusedPocketTargetIdx, setFocusedPocketTargetIdx] = React.useState<number | null>(null);

	React.useEffect(() => {
		if (isOpen) {
			setLocalPockets(pockets);
			setFocusedPocketTargetIdx(null);
		}
	}, [isOpen, pockets]);

	const hasChanges = React.useMemo(() => {
		return JSON.stringify(localPockets) !== JSON.stringify(pockets);
	}, [localPockets, pockets]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			if (hasChanges) {
				setIsUnsavedWarningOpen(true);
			} else {
				setLocalPockets(pockets);
				onOpenChange(false);
			}
		} else {
			onOpenChange(true);
		}
	};

	const handleLocalPocketFieldChange = (idx: number, field: keyof PocketDef, value: any) => {
		const nextList = [...localPockets];
		nextList[idx] = {
			...nextList[idx],
			[field]: value
		};
		setLocalPockets(nextList);
	};

	const savePocketSettings = () => {
		const names = localPockets.map(p => p.name.trim().toLowerCase());
		const hasDuplicates = names.some((val, i) => names.indexOf(val) !== i);
		if (hasDuplicates) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Duplicate Pocket Names" : "Nama Kantong Duplikat",
				description: language === "en" 
					? "Each pocket must have a unique name. Please rename your pockets so they do not overlap."
					: "Setiap kantong harus memiliki nama yang unik. Harap ubah nama kantong agar tidak sama."
			});
			return;
		}

		handleUpdatePockets(localPockets);
		onOpenChange(false);
	};

	return (
		<>
			{/* Pocket Settings Dialog */}
			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[420px] rounded-3xl overflow-hidden p-6">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Settings className="text-zinc-600 dark:text-zinc-300" size={20} />
							{language === "en" ? "Manage Pockets" : "Kelola Kantong"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2 max-h-[350px] overflow-y-auto pr-1">
						{localPockets.length === 0 ? (
							<div className="text-center py-6 text-zinc-500 text-xs font-semibold space-y-3">
								<p>{language === "en" ? "You haven't added any custom pockets." : "Anda belum menambahkan kantong kustom."}</p>
								<Button
									onClick={() => {
										const newId = `pocket_${localPockets.length + 2}`;
										const nextColor = getFirstUnusedColor(localPockets);
										const newPocket: PocketDef = {
											id: newId,
											name: `Kantong ${localPockets.length + 1}`,
											type: "default",
											color: nextColor
										};
										setLocalPockets([...localPockets, newPocket]);
									}}
									className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black rounded-xl border-none cursor-pointer"
								>
									{language === "en" ? "Add First Pocket" : "Tambah Kantong Pertama"}
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								{localPockets.map((pocket, idx) => {
									const badgeColorClass = {
										emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
										indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
										amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
										rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
										cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
										violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
										orange: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
									}[pocket.color] || "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300";

									return (
										<div key={pocket.id} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3 relative">
											<div className="flex items-center justify-between">
												<span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeColorClass}`}>
													{language === "en" ? `Pocket ${idx + 1}` : `Kantong ${idx + 1}`}
												</span>
											<div className="flex items-center gap-1">
												{/* Up arrow */}
												<Button
													variant="ghost"
													size="icon"
													disabled={idx === 0}
													onClick={() => {
														if (idx === 0) return;
														const nextList = [...localPockets];
														const temp = nextList[idx];
														nextList[idx] = nextList[idx - 1];
														nextList[idx - 1] = temp;
														setLocalPockets(nextList);
													}}
													className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer rounded-full flex items-center justify-center transition-colors border-none bg-transparent"
													aria-label="Move Up"
												>
													<ChevronUp size={14} />
												</Button>
												{/* Down arrow */}
												<Button
													variant="ghost"
													size="icon"
													disabled={idx === localPockets.length - 1}
													onClick={() => {
														if (idx === localPockets.length - 1) return;
														const nextList = [...localPockets];
														const temp = nextList[idx];
														nextList[idx] = nextList[idx + 1];
														nextList[idx + 1] = temp;
														setLocalPockets(nextList);
													}}
													className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer rounded-full flex items-center justify-center transition-colors border-none bg-transparent"
													aria-label="Move Down"
												>
													<ChevronDown size={14} />
												</Button>
												
												{/* Trash delete button */}
												<Button
													variant="ghost"
													size="icon"
													onClick={() => {
														setPocketToDeleteIdx(idx);
													}}
													className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer rounded-full flex items-center justify-center transition-colors border-none bg-transparent"
													aria-label="Delete Pocket"
												>
													<Trash2 size={14} />
												</Button>
											</div>
										</div>
										
										<div className="space-y-2">
											<Label className="text-xs text-zinc-500 font-bold">{language === "en" ? "Pocket Name" : "Nama Kantong"}</Label>
											<Input
												value={pocket.name}
												onChange={(e) => handleLocalPocketFieldChange(idx, "name", e.target.value)}
												className={`h-10 rounded-xl focus:border-${pocket.color}-500 focus:ring-1 focus:ring-${pocket.color}-500`}
												placeholder="e.g. Jajan / Tabungan"
											/>
										</div>

										<div className="space-y-2">
											<Label className="text-xs text-zinc-500 font-bold">{language === "en" ? "Pocket Color" : "Warna Kantong"}</Label>
											<div className="flex gap-2 items-center">
												{SELECTABLE_POCKET_COLORS.map((color) => {
													const isSelected = pocket.color === color;
													const isOccupied = localPockets.some(p => p.id !== pocket.id && p.color === color);
													
													const bgGradientClass = {
														indigo: "from-indigo-500 to-purple-500",
														amber: "from-amber-500 to-rose-500",
														rose: "from-rose-500 to-pink-500",
														cyan: "from-cyan-500 to-blue-500",
														violet: "from-violet-500 to-fuchsia-500",
														orange: "from-orange-500 to-yellow-500",
													}[color];

													return (
														<button
															key={color}
															type="button"
															disabled={isOccupied}
															onClick={() => handleLocalPocketFieldChange(idx, "color", color)}
															className={`w-8 h-8 rounded-full bg-gradient-to-br ${bgGradientClass} flex items-center justify-center relative transition-all duration-200 ${
																isOccupied 
																	? "opacity-20 cursor-not-allowed scale-90" 
																	: "hover:scale-105 active:scale-95 cursor-pointer"
															} ${
																isSelected 
																	? "ring-2 ring-zinc-800 dark:ring-zinc-200 ring-offset-2 dark:ring-offset-black scale-105" 
																	: "border border-black/5 dark:border-white/5"
															}`}
															title={isOccupied ? (language === "en" ? "Color used by another pocket" : "Warna sudah digunakan kantong lain") : color}
														>
															{isSelected && (
																<Check className="text-black w-3.5 h-3.5 stroke-[3px]" />
															)}
														</button>
													);
												})}
											</div>
										</div>

										<div className="space-y-2">
											<Label className="text-xs text-zinc-500 font-bold">{language === "en" ? "Pocket Type" : "Tipe Kantong"}</Label>
											<Select
												value={pocket.type}
												onValueChange={(val: any) => handleLocalPocketFieldChange(idx, "type", val)}
											>
												<SelectTrigger className="h-10 rounded-xl cursor-pointer">
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="rounded-xl">
													<SelectItem value="default" className="cursor-pointer">{language === "en" ? "Regular (No Target)" : "Biasa (Tanpa Target)"}</SelectItem>
													<SelectItem value="budget" className="cursor-pointer">{language === "en" ? "Monthly Budget Limit" : "Limit Anggaran Bulanan"}</SelectItem>
													<SelectItem value="saving" className="cursor-pointer">{language === "en" ? "Savings Goal" : "Target Tabungan"}</SelectItem>
												</SelectContent>
											</Select>
										</div>

										{pocket.type !== "default" && (
											<div className="space-y-2">
												<Label className="text-xs text-zinc-500 font-bold">
													{pocket.type === "budget" 
														? (language === "en" ? "Monthly Limit (Rp)" : "Batas Bulanan (Rp)")
														: (language === "en" ? "Target Amount (Rp)" : "Target Saldo (Rp)")}
												</Label>
												<Input
													type="text"
													value={pocket.target ? formatRupiah(pocket.target.toString()) : ""}
													onChange={(e) => {
														const raw = stripRupiah(e.target.value);
														handleLocalPocketFieldChange(idx, "target", raw ? parseInt(raw, 10) : 0);
													}}
													inputMode={isMobile ? "none" : "numeric"}
													readOnly={isMobile}
													onFocus={() => isMobile && setFocusedPocketTargetIdx(idx)}
													onClick={() => isMobile && setFocusedPocketTargetIdx(idx)}
													placeholder="e.g. 1.000.000"
													className={`h-10 rounded-xl focus:border-${pocket.color}-500 focus:ring-1 focus:ring-${pocket.color}-500`}
												/>
												{isMobile && focusedPocketTargetIdx === idx && (
													<NumericKeyboard
														value={pocket.target ? formatRupiah(pocket.target.toString()) : ""}
														onChange={(val) => {
															const raw = stripRupiah(val);
															handleLocalPocketFieldChange(idx, "target", raw ? parseInt(raw, 10) : 0);
														}}
														onSubmit={() => setFocusedPocketTargetIdx(null)}
													/>
												)}
											</div>
										)}
									</div>
								)})}

								{localPockets.length < 3 && (
									<Button
										onClick={() => {
											const newId = `pocket_${localPockets.length + 2}`;
											const nextColor = getFirstUnusedColor(localPockets);
											const newPocket: PocketDef = {
												id: newId,
												name: `Kantong ${localPockets.length + 1}`,
												type: "default",
												color: nextColor
											};
											setLocalPockets([...localPockets, newPocket]);
										}}
										variant="outline"
										className="w-full h-11 border-dashed rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer border-zinc-300 dark:border-zinc-800"
									>
										<Plus size={16} />
										{language === "en" ? "Add Pocket" : "Tambah Kantong"}
									</Button>
								)}
							</div>
						)}
					</div>
					<div className="flex gap-2 mt-4">
						<Button
							onClick={savePocketSettings}
							className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black rounded-xl cursor-pointer border-none shadow-lg"
						>
							{language === "en" ? "Save Changes" : "Simpan Perubahan"}
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								handleOpenChange(false);
							}}
							className="h-12 px-5 rounded-xl font-bold cursor-pointer bg-transparent"
						>
							{language === "en" ? "Cancel" : "Batal"}
						</Button>
					</div>

					{isMobile && focusedPocketTargetIdx !== null && (
						<div
							className="fixed inset-0 z-[110] bg-transparent"
							onClick={() => {
								const idx = focusedPocketTargetIdx;
								const p = localPockets[idx];
								if (p) {
									const cleaned = (p.target ? p.target.toString() : "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
									if (cleaned) {
										const result = evaluateExpression(cleaned);
										handleLocalPocketFieldChange(idx, "target", result);
									}
								}
								setFocusedPocketTargetIdx(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Pocket Delete Confirmation Dialog */}
			<WarningConfirmModal
				isOpen={pocketToDeleteIdx !== null}
				onOpenChange={(open) => { if (!open) setPocketToDeleteIdx(null); }}
				title={language === "en" ? "Delete Pocket" : "Hapus Kantong"}
				description={
					language === "en"
						? "Are you sure you want to delete this pocket? All transactions associated with this pocket will be automatically unlinked and return to Total Balance (no pocket)."
						: "Apakah Anda yakin ingin menghapus kantong ini? Semua transaksi yang terikat dengan kantong ini akan dilepas otomatis dan kembali ke Total Saldo (tanpa kantong)."
				}
				confirmText={language === "en" ? "Delete" : "Hapus"}
				cancelText={language === "en" ? "Cancel" : "Batal"}
				onConfirm={() => {
					if (pocketToDeleteIdx !== null) {
						setLocalPockets(localPockets.filter((_, i) => i !== pocketToDeleteIdx));
						setPocketToDeleteIdx(null);
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
					setLocalPockets(pockets);
					setIsUnsavedWarningOpen(false);
					onOpenChange(false);
				}}
			/>
		</>
	);
}

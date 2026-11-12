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
import { Settings, Plus, Trash2, ChevronUp, ChevronDown, Check, Wallet } from "lucide-react";
import { PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";
import { formatRupiah, stripRupiah, NumericKeyboard, evaluateExpression } from "@/components/dashboard/cards/numeric-keyboard";
import { WarningConfirmModal } from "./warning-confirm-modal";
import { useIsMobile } from "@/hooks/use-mobile";
import { ModalScrollArea } from "@/components/ui/modal-scroll-area";

const SELECTABLE_POCKET_COLORS: ("indigo" | "amber" | "rose" | "cyan" | "violet" | "orange")[] = [
	"indigo",
	"amber",
	"rose",
	"cyan",
	"violet",
	"orange",
];

const PASTEL_POCKET_THEMES: Record<
	string,
	{
		swatchGradient: string;
		cardGradient: string;
		cardText: string;
		badgeBg: string;
		inputSurface: string;
	}
> = {
	emerald: {
		swatchGradient: "from-[#6EE7B7] to-[#34D399]",
		cardGradient: "from-[#6EE7B7] to-[#34D399]",
		cardText: "text-[#063626]",
		badgeBg: "bg-[#063626]/12 text-[#063626]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#063626] dark:text-white placeholder:text-[#063626]/45 dark:placeholder:text-white/50",
	},
	indigo: {
		swatchGradient: "from-[#A5B4FC] to-[#818CF8]",
		cardGradient: "from-[#A5B4FC] to-[#818CF8]",
		cardText: "text-[#1E1B4B]",
		badgeBg: "bg-[#1E1B4B]/12 text-[#1E1B4B]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#1E1B4B] dark:text-white placeholder:text-[#1E1B4B]/45 dark:placeholder:text-white/50",
	},
	amber: {
		swatchGradient: "from-[#FCD34D] to-[#FBBF24]",
		cardGradient: "from-[#FCD34D] to-[#FBBF24]",
		cardText: "text-[#451A03]",
		badgeBg: "bg-[#451A03]/12 text-[#451A03]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#451A03] dark:text-white placeholder:text-[#451A03]/45 dark:placeholder:text-white/50",
	},
	rose: {
		swatchGradient: "from-[#FDA4AF] to-[#FB7185]",
		cardGradient: "from-[#FDA4AF] to-[#FB7185]",
		cardText: "text-[#4C0519]",
		badgeBg: "bg-[#4C0519]/12 text-[#4C0519]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#4C0519] dark:text-white placeholder:text-[#4C0519]/45 dark:placeholder:text-white/50",
	},
	cyan: {
		swatchGradient: "from-[#67E8F9] to-[#22D3EE]",
		cardGradient: "from-[#67E8F9] to-[#22D3EE]",
		cardText: "text-[#083344]",
		badgeBg: "bg-[#083344]/12 text-[#083344]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#083344] dark:text-white placeholder:text-[#083344]/45 dark:placeholder:text-white/50",
	},
	violet: {
		swatchGradient: "from-[#C4B5FD] to-[#A78BFA]",
		cardGradient: "from-[#C4B5FD] to-[#A78BFA]",
		cardText: "text-[#2E1065]",
		badgeBg: "bg-[#2E1065]/12 text-[#2E1065]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#2E1065] dark:text-white placeholder:text-[#2E1065]/45 dark:placeholder:text-white/50",
	},
	orange: {
		swatchGradient: "from-[#FDBA74] to-[#FB923C]",
		cardGradient: "from-[#FDBA74] to-[#FB923C]",
		cardText: "text-[#431407]",
		badgeBg: "bg-[#431407]/12 text-[#431407]",
		inputSurface: "bg-white/80 dark:bg-black/25 text-[#431407] dark:text-white placeholder:text-[#431407]/45 dark:placeholder:text-white/50",
	},
};

const getFirstUnusedColor = (currentPockets: PocketDef[]): "indigo" | "amber" | "rose" | "cyan" | "violet" | "orange" => {
	const used = currentPockets.map(p => p.color);
	for (const color of SELECTABLE_POCKET_COLORS) {
		if (!used.includes(color)) {
			return color;
		}
	}
	return "indigo";
};

const getNextUniquePocketId = (currentPockets: PocketDef[]): string => {
	let n = currentPockets.length + 2;
	while (currentPockets.some(p => p.id === `pocket_${n}`)) {
		n++;
	}
	return `pocket_${n}`;
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
			[field]: value,
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
				description:
					language === "en"
						? "Each pocket must have a unique name. Please rename your pockets so they do not overlap."
						: "Setiap kantong harus memiliki nama yang unik. Harap ubah nama kantong agar tidak sama.",
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
				<DialogContent className="sm:max-w-[440px] rounded-3xl overflow-hidden p-5 gap-3">
					{/* Distinct Header */}
					<DialogHeader className="pb-0.5">
						<DialogTitle className="flex items-center gap-2 text-base font-black">
							<Settings className="text-emerald-500" size={19} />
							{language === "en" ? "Manage Pockets" : "Kelola Kantong"}
						</DialogTitle>
					</DialogHeader>

					{/* Recessed Shaded Scrollable Body with Circular Interactive Scrollbar */}
					<ModalScrollArea maxHeightClass="max-h-[390px]">
						{localPockets.length === 0 ? (
							<div className="text-center py-6 text-zinc-500 dark:text-zinc-400 text-xs font-semibold space-y-3">
								<p>
									{language === "en"
										? "You haven't added any custom pockets."
										: "Anda belum menambahkan kantong kustom."}
								</p>
								<Button
									onClick={() => {
										const newId = getNextUniquePocketId(localPockets);
										const nextColor = getFirstUnusedColor(localPockets);
										const newPocket: PocketDef = {
											id: newId,
											name: `Kantong ${localPockets.length + 1}`,
											type: "default",
											color: nextColor,
										};
										setLocalPockets([...localPockets, newPocket]);
									}}
									className="bg-gradient-to-r from-[#6EE7B7] to-[#34D399] hover:opacity-95 text-[#063626] font-black rounded-2xl border-none cursor-pointer shadow-sm"
								>
									{language === "en" ? "Add First Pocket" : "Tambah Kantong Pertama"}
								</Button>
							</div>
						) : (
							<div className="space-y-3">
								{localPockets.map((pocket, idx) => {
									const pTheme = PASTEL_POCKET_THEMES[pocket.color] || PASTEL_POCKET_THEMES.indigo;

									return (
										<div
											key={pocket.id}
											className={`p-3.5 rounded-2xl bg-gradient-to-br ${pTheme.cardGradient} ${pTheme.cardText} shadow-[0_4px_10px_rgba(0,0,0,0.08)] space-y-2.5 relative transition-all duration-300`}
										>
											{/* Top Row: Pocket Badge + Color Swatches + Reorder/Delete Actions */}
											<div className="flex items-center justify-between gap-2">
												<span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${pTheme.badgeBg}`}>
													<Wallet size={10} />
													{language === "en" ? `Pocket ${idx + 1}` : `Kantong ${idx + 1}`}
												</span>

												{/* Compact Pastel Color Swatches right in the header row */}
												<div className="flex items-center gap-1.5">
													{SELECTABLE_POCKET_COLORS.map((color) => {
														const isSelected = pocket.color === color;
														const isOccupied = localPockets.some(
															p => p.id !== pocket.id && p.color === color
														);
														const swatchTheme = PASTEL_POCKET_THEMES[color];

														return (
															<button
																key={color}
																type="button"
																disabled={isOccupied}
																onClick={() => handleLocalPocketFieldChange(idx, "color", color)}
																className={`w-5 h-5 rounded-full bg-gradient-to-br ${swatchTheme.swatchGradient} flex items-center justify-center relative transition-all duration-200 ${
																	isOccupied
																		? "opacity-25 cursor-not-allowed scale-90"
																		: "hover:scale-110 active:scale-95 cursor-pointer"
																} ${
																	isSelected
																		? "ring-2 ring-black/70 scale-110 shadow-xs"
																		: "ring-1 ring-black/15"
																}`}
																title={
																	isOccupied
																		? (language === "en"
																				? "Color used by another pocket"
																				: "Warna sudah digunakan kantong lain")
																		: color
																}
															>
																{isSelected && (
																	<Check className={`${swatchTheme.cardText} w-3 h-3 stroke-[3px]`} />
																)}
															</button>
														);
													})}
												</div>

												<div className="flex items-center gap-0.5 shrink-0">
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
														className={`h-6 w-6 ${pTheme.cardText} opacity-70 hover:opacity-100 hover:bg-black/10 disabled:opacity-25 cursor-pointer rounded-lg flex items-center justify-center transition-colors border-none bg-transparent`}
														aria-label="Move Up"
													>
														<ChevronUp size={13} />
													</Button>
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
														className={`h-6 w-6 ${pTheme.cardText} opacity-70 hover:opacity-100 hover:bg-black/10 disabled:opacity-25 cursor-pointer rounded-lg flex items-center justify-center transition-colors border-none bg-transparent`}
														aria-label="Move Down"
													>
														<ChevronDown size={13} />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setPocketToDeleteIdx(idx)}
														className="h-6 w-6 text-red-900/80 hover:text-red-950 hover:bg-red-500/20 cursor-pointer rounded-lg flex items-center justify-center transition-colors border-none bg-transparent"
														aria-label="Delete Pocket"
													>
														<Trash2 size={13} />
													</Button>
												</div>
											</div>

											{/* Compact Side-by-Side Row: Pocket Name + Pocket Type */}
											<div className="grid grid-cols-12 gap-2">
												<div className="col-span-7 space-y-1">
													<Label className={`text-[10px] font-extrabold uppercase tracking-wider opacity-75 ${pTheme.cardText}`}>
														{language === "en" ? "Name" : "Nama"}
													</Label>
													<Input
														value={pocket.name}
														onChange={(e) => handleLocalPocketFieldChange(idx, "name", e.target.value)}
														className="h-9 rounded-xl border-none bg-white/85 dark:bg-white/90 text-zinc-900 font-bold text-xs shadow-none focus-visible:ring-2 focus-visible:ring-black/20"
														placeholder="e.g. Tabungan"
													/>
												</div>

												<div className="col-span-5 space-y-1">
													<Label className={`text-[10px] font-extrabold uppercase tracking-wider opacity-75 ${pTheme.cardText}`}>
														{language === "en" ? "Type" : "Tipe"}
													</Label>
													<Select
														value={pocket.type}
														onValueChange={(val: any) => handleLocalPocketFieldChange(idx, "type", val)}
													>
														<SelectTrigger className="h-9 rounded-xl border-none bg-white/85 dark:bg-white/90 text-zinc-900 font-bold text-xs cursor-pointer shadow-none px-2.5">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="rounded-2xl border-none shadow-lg">
															<SelectItem value="default" className="cursor-pointer text-xs font-bold">
																{language === "en" ? "Regular" : "Biasa"}
															</SelectItem>
															<SelectItem value="budget" className="cursor-pointer text-xs font-bold">
																{language === "en" ? "Budget Limit" : "Limit Anggaran"}
															</SelectItem>
															<SelectItem value="saving" className="cursor-pointer text-xs font-bold">
																{language === "en" ? "Savings Goal" : "Tabungan"}
															</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>

											{/* Conditional Target Amount Row (Compact) */}
											{pocket.type !== "default" && (
												<div className="space-y-1 pt-0.5">
													<Label className={`text-[10px] font-extrabold uppercase tracking-wider opacity-75 ${pTheme.cardText}`}>
														{pocket.type === "budget"
															? (language === "en" ? "Monthly Limit (Rp)" : "Batas Bulanan (Rp)")
															: (language === "en" ? "Target Amount (Rp)" : "Target Saldo (Rp)")}
													</Label>
													<div className="relative flex items-center">
														<span className="absolute left-3 text-[10px] font-black text-zinc-500 select-none">Rp</span>
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
															placeholder="1.000.000"
															className="h-9 pl-8 rounded-xl border-none bg-white/85 dark:bg-white/90 text-zinc-900 font-bold text-xs shadow-none"
														/>
													</div>
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
									);
								})}

								{localPockets.length < 3 && (
									<Button
										onClick={() => {
											const newId = getNextUniquePocketId(localPockets);
											const nextColor = getFirstUnusedColor(localPockets);
											const newPocket: PocketDef = {
												id: newId,
												name: `Kantong ${localPockets.length + 1}`,
												type: "default",
												color: nextColor,
											};
											setLocalPockets([...localPockets, newPocket]);
										}}
										variant="outline"
										className="w-full h-10 border-dashed rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-[#222428]/70 hover:bg-white dark:hover:bg-[#222428]"
									>
										<Plus size={15} />
										{language === "en" ? "Add Pocket" : "Tambah Kantong"} ({localPockets.length}/3)
									</Button>
								)}
							</div>
						)}
					</ModalScrollArea>

					{/* Distinct Footer */}
					<div className="flex gap-2 pt-1">
						<Button
							onClick={savePocketSettings}
							className="flex-1 h-11 bg-gradient-to-r from-[#6EE7B7] to-[#34D399] hover:opacity-95 text-[#063626] font-black rounded-2xl cursor-pointer border-none shadow-[0_4px_10px_rgba(0,0,0,0.10)]"
						>
							{language === "en" ? "Save Changes" : "Simpan Perubahan"}
						</Button>
						<Button
							variant="outline"
							onClick={() => handleOpenChange(false)}
							className="h-11 px-5 rounded-2xl font-bold cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33] hover:bg-[#EAECEF] dark:hover:bg-[#32363C]"
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
									const cleaned = (p.target ? p.target.toString() : "")
										.replace(/\./g, "")
										.replace(/,/g, "")
										.replace(/\s/g, "");
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
				onOpenChange={(open) => {
					if (!open) setPocketToDeleteIdx(null);
				}}
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

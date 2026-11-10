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
import { ChevronLeft, ChevronRight, ListTree, Trash2, Pencil, Wallet } from "lucide-react";
import { CustomFieldDef, PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";

const POCKET_DOT_COLORS: Record<string, string> = {
	emerald: "bg-emerald-500",
	indigo: "bg-indigo-500",
	amber: "bg-amber-500",
	rose: "bg-rose-500",
	cyan: "bg-cyan-500",
	violet: "bg-violet-500",
	orange: "bg-orange-500",
};

interface ManageFieldsModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	customFields: CustomFieldDef[];
	newFieldName: string;
	setNewFieldName: (val: string) => void;
	newFieldType: "text" | "dropdown";
	setNewFieldType: (val: "text" | "dropdown") => void;
	newFieldRequired: boolean;
	setNewFieldRequired: (val: boolean) => void;
	newOptionInput: string;
	setNewOptionInput: (val: string) => void;
	onAddField: () => void;
	onDeleteField: (idx: number, name: string) => void;
	onRenameField: (idx: number, newName: string, newType: "text" | "dropdown", required: boolean) => void;
	onAddOption: (fieldIdx: number, value: string) => void;
	onDeleteOption: (fieldIdx: number, value: string) => void;
	user: any;
	supabaseUser: any;
	isDemoMode: boolean;
	isSyncing: boolean;
	isCleanDisplay?: boolean;
	pockets?: PocketDef[];
	activePocketIdx?: number;
	setActivePocketIdx?: (idx: number) => void;
	themeColors: {
		gradient: string;
		text: string;
		textDark: string;
		bgLight: string;
		border: string;
		hoverBg: string;
		buttonShadow?: string;
		focusRingInput?: string;
	};
}

export function ManageFieldsModal({
	isOpen,
	onOpenChange,
	customFields,
	newFieldName,
	setNewFieldName,
	newFieldType,
	setNewFieldType,
	newFieldRequired,
	setNewFieldRequired,
	newOptionInput,
	setNewOptionInput,
	onAddField,
	onDeleteField,
	onRenameField,
	onAddOption,
	onDeleteOption,
	isSyncing,
	pockets = [],
	activePocketIdx = 0,
	setActivePocketIdx,
	themeColors,
}: ManageFieldsModalProps) {
	const { t, language } = useLanguage();

	const [editingOptionsIdx, setEditingOptionsIdx] = React.useState(-1);
	const [renamingIdx, setRenamingIdx] = React.useState(-1);
	const [renamingInput, setRenamingInput] = React.useState("");
	const [renamingType, setRenamingType] = React.useState<"text" | "dropdown">("text");
	const [renamingRequired, setRenamingRequired] = React.useState(false);

	const isInteractionDisabled = isSyncing;

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{
			id: "net_worth",
			name: language === "en" ? "Main Pocket" : "Dompet Utama",
			type: "default",
			color: "emerald",
			target: undefined,
		},
		...pockets,
	], [pockets, language]);

	const activePocket = carouselPockets[activePocketIdx] || carouselPockets[0];
	const activePocketId = activePocket.id || "net_worth";

	// Filter fields belonging to the currently selected pocket while keeping their original index in customFields
	const pocketFieldsWithIdx = React.useMemo(() => {
		return customFields
			.map((field, originalIdx) => ({ field, originalIdx }))
			.filter(({ field }) => (field.pocketId || "net_worth") === activePocketId);
	}, [customFields, activePocketId]);

	// Reset intermediate states when modal closes or when switching pocket
	React.useEffect(() => {
		if (!isOpen) {
			setEditingOptionsIdx(-1);
			setRenamingIdx(-1);
		}
	}, [isOpen]);

	React.useEffect(() => {
		setEditingOptionsIdx(-1);
		setRenamingIdx(-1);
	}, [activePocketIdx]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px] rounded-3xl overflow-hidden p-0">
				{/* Themed Top Accent Bar matching the active pocket */}
				<div className={`h-1.5 w-full bg-gradient-to-r ${themeColors.gradient}`} />

				<DialogHeader className="px-6 pt-5 pb-1">
					<DialogTitle className="flex items-center gap-2">
						{(editingOptionsIdx !== -1 || renamingIdx !== -1) ? (
							<Button 
								variant="ghost" 
								size="sm" 
								onClick={() => { setEditingOptionsIdx(-1); setRenamingIdx(-1); }} 
								className="h-8 w-8 p-0 rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent"
							>
								<ChevronLeft size={20} />
							</Button>
						) : (
							<div className={`w-8 h-8 rounded-xl ${themeColors.bgLight} border ${themeColors.border} flex items-center justify-center shrink-0`}>
								<ListTree size={16} className={themeColors.text} />
							</div>
						)}
						<span>
							{editingOptionsIdx === -1 && renamingIdx === -1 
								? t("manageFields") 
								: editingOptionsIdx !== -1 
									? `${t("manageOptions")}: ${customFields[editingOptionsIdx]?.name}` 
									: t("editField")}
						</span>
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 px-6 pb-6 pt-2">
					{/* Pocket Info & Switcher Banner */}
					<div className={`rounded-2xl p-3 border ${themeColors.border} ${themeColors.bgLight} transition-colors duration-300 space-y-2.5`}>
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2 min-w-0">
								<div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${themeColors.gradient} text-black flex items-center justify-center shrink-0 shadow-xs`}>
									<Wallet size={13} />
								</div>
								<div className="min-w-0">
									<p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 leading-none">
										{language === "en" ? "Editing Fields for Pocket" : "Mengedit Field Kantong"}
									</p>
									<p className={`text-xs font-black ${themeColors.textDark} truncate mt-0.5`}>
										{activePocket.name}
									</p>
								</div>
							</div>

							{carouselPockets.length > 1 && setActivePocketIdx && (
								<div className="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onClick={() => setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length)}
										className={`w-6 h-6 rounded-lg border ${themeColors.border} ${themeColors.hoverBg} flex items-center justify-center cursor-pointer bg-transparent ${themeColors.textDark} transition-colors`}
										aria-label="Previous Pocket"
									>
										<ChevronLeft size={14} />
									</button>
									<button
										type="button"
										onClick={() => setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length)}
										className={`w-6 h-6 rounded-lg border ${themeColors.border} ${themeColors.hoverBg} flex items-center justify-center cursor-pointer bg-transparent ${themeColors.textDark} transition-colors`}
										aria-label="Next Pocket"
									>
										<ChevronRight size={14} />
									</button>
								</div>
							)}
						</div>

						{/* Direct Pocket Switcher Pills */}
						{carouselPockets.length > 1 && setActivePocketIdx && (
							<div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
								{carouselPockets.map((p, idx) => {
									const isSelected = idx === activePocketIdx;
									const dotColor = POCKET_DOT_COLORS[p.color || "emerald"] || "bg-emerald-500";
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => setActivePocketIdx(idx)}
											className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0 border ${
												isSelected
													? `bg-gradient-to-r ${themeColors.gradient} text-black border-transparent shadow-xs`
													: "bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900"
											}`}
										>
											<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-black" : dotColor}`} />
											<span className="truncate max-w-[110px]">{p.name}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{editingOptionsIdx === -1 && renamingIdx === -1 ? (
						<>
							<div className="flex flex-col gap-3">
								<Input 
									placeholder="Field Name" 
									value={newFieldName} 
									onChange={(e) => setNewFieldName(e.target.value)} 
									disabled={pocketFieldsWithIdx.length >= 2 || isInteractionDisabled}
									className={`rounded-xl ${themeColors.focusRingInput || ""}`}
								/>
								<div className="flex flex-col gap-2">
									<div className="flex gap-2">
										<Select 
											value={newFieldType} 
											onValueChange={(v: any) => setNewFieldType(v || "text")} 
											disabled={pocketFieldsWithIdx.length >= 2 || isInteractionDisabled}
										>
											<SelectTrigger className={`flex-1 rounded-xl ${themeColors.focusRingInput || ""}`}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value="text">{t("text")}</SelectItem>
												<SelectItem value="dropdown">{t("dropdown")}</SelectItem>
											</SelectContent>
										</Select>
										<Button 
											onClick={onAddField} 
											disabled={pocketFieldsWithIdx.length >= 2 || isInteractionDisabled || !newFieldName.trim()} 
											className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black px-6 cursor-pointer rounded-xl h-10 border-none shadow-sm ${themeColors.buttonShadow || ""}`}
										>
											{t("add")}
										</Button>
									</div>
									<div className="flex items-center justify-between px-1">
										<div className="flex items-center gap-2">
											<input 
												type="checkbox" 
												id="newFieldReq" 
												checked={newFieldRequired} 
												onChange={(e) => setNewFieldRequired(e.target.checked)} 
												disabled={isInteractionDisabled} 
												className="w-4 h-4 rounded cursor-pointer accent-current" 
											/>
											<Label htmlFor="newFieldReq" className="text-xs font-medium cursor-pointer">
												{t("isRequired")}
											</Label>
										</div>
										<span className="text-[10px] font-bold text-zinc-400">
											{pocketFieldsWithIdx.length}/2 {language === "en" ? "fields" : "kolom"}
										</span>
									</div>
								</div>
							</div>
							<div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
								{pocketFieldsWithIdx.length === 0 ? (
									<div className="py-5 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-xs font-semibold">
										{language === "en"
											? `No custom fields for ${activePocket.name}`
											: `Belum ada field kustom di ${activePocket.name}`}
									</div>
								) : (
									pocketFieldsWithIdx.map(({ field, originalIdx }) => (
										<div key={originalIdx} className={`flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border ${themeColors.border}`}>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<p className="text-sm font-bold truncate">{field.name}</p>
													<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
														field.required
															? `${themeColors.bgLight} ${themeColors.textDark} border ${themeColors.border}`
															: "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
													}`}>
														{field.required ? t("requiredLabel") : t("optionalLabel")}
													</span>
												</div>
												<p className="text-[10px] opacity-60 uppercase">{field.type}</p>
											</div>
											<div className="flex gap-1 shrink-0">
												<Button 
													variant="ghost" 
													size="sm" 
													className="cursor-pointer border-none bg-transparent" 
													disabled={isInteractionDisabled} 
													onClick={() => { 
														setRenamingIdx(originalIdx); 
														setRenamingInput(field.name); 
														setRenamingType(field.type); 
														setRenamingRequired(field.required); 
													}}
												>
													<Pencil size={16} />
												</Button>
												{field.type === "dropdown" && (
													<Button 
														variant="ghost" 
														size="sm" 
														disabled={isInteractionDisabled} 
														onClick={() => setEditingOptionsIdx(originalIdx)} 
														className={`${themeColors.textDark} ${themeColors.hoverBg} cursor-pointer border-none bg-transparent`}
													>
														<ListTree size={16} />
													</Button>
												)}
												<Button 
													variant="ghost" 
													size="sm" 
													disabled={isInteractionDisabled} 
													onClick={() => onDeleteField(originalIdx, field.name)} 
													className="text-destructive cursor-pointer border-none bg-transparent"
												>
													<Trash2 size={16} />
												</Button>
											</div>
										</div>
									))
								)}
							</div>
						</>
					) : renamingIdx !== -1 ? (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label className="text-xs">{t("name")}</Label>
								<Input 
									value={renamingInput} 
									onChange={(e) => setRenamingInput(e.target.value)} 
									disabled={isInteractionDisabled} 
									className={`rounded-xl ${themeColors.focusRingInput || ""}`} 
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-xs">{t("fieldType")}</Label>
								<Select 
									value={renamingType} 
									onValueChange={(v: any) => setRenamingType(v || "text")} 
									disabled={isInteractionDisabled}
								>
									<SelectTrigger className="rounded-xl cursor-pointer">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="text" className="cursor-pointer">{t("text")}</SelectItem>
										<SelectItem value="dropdown" className="cursor-pointer">{t("dropdown")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2 px-1 py-1">
								<input 
									type="checkbox" 
									id="renameFieldReq" 
									checked={renamingRequired} 
									onChange={(e) => setRenamingRequired(e.target.checked)} 
									disabled={isInteractionDisabled} 
									className="cursor-pointer w-4 h-4 accent-current" 
								/>
								<Label htmlFor="renameFieldReq" className="text-xs font-medium cursor-pointer">
									{t("isRequired")}
								</Label>
							</div>
							<Button 
								onClick={() => { onRenameField(renamingIdx, renamingInput, renamingType, renamingRequired); setRenamingIdx(-1); }} 
								disabled={isInteractionDisabled || !renamingInput.trim()} 
								className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black h-12 rounded-xl mt-2 cursor-pointer border-none shadow-md ${themeColors.buttonShadow || ""}`}
							>
								{t("editField")}
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex gap-2">
								<Input 
									placeholder={t("newOption")} 
									value={newOptionInput} 
									onChange={(e) => setNewOptionInput(e.target.value)} 
									disabled={isInteractionDisabled} 
									className={`rounded-xl ${themeColors.focusRingInput || ""}`} 
								/>
								<Button 
									onClick={() => onAddOption(editingOptionsIdx, newOptionInput)} 
									disabled={isInteractionDisabled || !newOptionInput.trim()} 
									className={`bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black rounded-xl cursor-pointer border-none h-10 px-4 shadow-sm`}
								>
									{t("add")}
								</Button>
							</div>
							<div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
								{(customFields[editingOptionsIdx]?.options || []).map((opt: string) => (
									<div key={opt} className={`flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border ${themeColors.border}`}>
										<span className="text-sm font-medium">{opt}</span>
										<Button 
											variant="ghost" 
											size="sm" 
											disabled={isInteractionDisabled} 
											onClick={() => onDeleteOption(editingOptionsIdx, opt)} 
											className="cursor-pointer border-none bg-transparent"
										>
											<Trash2 size={14} />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

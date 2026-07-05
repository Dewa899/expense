"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Settings, ChevronLeft, ListTree, Trash2, Pencil } from "lucide-react";
import { CustomFieldDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";

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
	themeColors: {
		textDark: string;
		bgLight: string;
		border: string;
		hoverBg: string;
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
	user,
	supabaseUser,
	isDemoMode,
	isSyncing,
	isCleanDisplay = false,
	themeColors,
}: ManageFieldsModalProps) {
	const { t, language } = useLanguage();

	const [editingOptionsIdx, setEditingOptionsIdx] = React.useState(-1);
	const [renamingIdx, setRenamingIdx] = React.useState(-1);
	const [renamingInput, setRenamingInput] = React.useState("");
	const [renamingType, setRenamingType] = React.useState<"text" | "dropdown">("text");
	const [renamingRequired, setRenamingRequired] = React.useState(false);

	const isInteractionDisabled = isSyncing;

	// Reset intermediate states when modal closes
	React.useEffect(() => {
		if (!isOpen) {
			setEditingOptionsIdx(-1);
			setRenamingIdx(-1);
		}
	}, [isOpen]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden">
				<DialogHeader className="px-6 pt-6">
					<DialogTitle className="flex items-center gap-2">
						{(editingOptionsIdx !== -1 || renamingIdx !== -1) && (
							<Button 
								variant="ghost" 
								size="sm" 
								onClick={() => { setEditingOptionsIdx(-1); setRenamingIdx(-1); }} 
								className="h-8 w-8 p-0 rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent"
							>
								<ChevronLeft size={20} />
							</Button>
						)}
						{editingOptionsIdx === -1 && renamingIdx === -1 
							? t("manageFields") 
							: editingOptionsIdx !== -1 
								? `${t("manageOptions")}: ${customFields[editingOptionsIdx]?.name}` 
								: t("editField")}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 p-6 pt-2">
					{editingOptionsIdx === -1 && renamingIdx === -1 ? (
						<>
							<div className="flex flex-col gap-3">
								<Input 
									placeholder="Field Name" 
									value={newFieldName} 
									onChange={(e) => setNewFieldName(e.target.value)} 
									disabled={customFields.length >= 2 || isInteractionDisabled} 
								/>
								<div className="flex flex-col gap-2">
									<div className="flex gap-2">
										<Select 
											value={newFieldType} 
											onValueChange={(v: any) => setNewFieldType(v || "text")} 
											disabled={customFields.length >= 2 || isInteractionDisabled}
										>
											<SelectTrigger className="flex-1 rounded-xl">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value="text">{t("text")}</SelectItem>
												<SelectItem value="dropdown">{t("dropdown")}</SelectItem>
											</SelectContent>
										</Select>
										<Button 
											onClick={onAddField} 
											disabled={customFields.length >= 2 || isInteractionDisabled || !newFieldName.trim()} 
											className="bg-emerald-500 text-black font-bold px-6 cursor-pointer rounded-xl h-10 border-none"
										>
											{t("add")}
										</Button>
									</div>
									<div className="flex items-center gap-2 px-1">
										<input 
											type="checkbox" 
											id="newFieldReq" 
											checked={newFieldRequired} 
											onChange={(e) => setNewFieldRequired(e.target.checked)} 
											disabled={isInteractionDisabled} 
											className="w-4 h-4 rounded cursor-pointer accent-emerald-500" 
										/>
										<Label htmlFor="newFieldReq" className="text-xs font-medium cursor-pointer">
											{t("isRequired")}
										</Label>
									</div>
								</div>
							</div>
							<div className="space-y-2 mt-4 max-h-[220px] overflow-y-auto pr-1">
								{customFields.map((field, idx) => (
									<div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<p className="text-sm font-bold">{field.name}</p>
												<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
													field.required ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
												}`}>
													{field.required ? t("requiredLabel") : t("optionalLabel")}
												</span>
											</div>
											<p className="text-[10px] opacity-60 uppercase">{field.type}</p>
										</div>
										<div className="flex gap-1">
											<Button 
												variant="ghost" 
												size="sm" 
												className="cursor-pointer border-none bg-transparent" 
												disabled={isInteractionDisabled} 
												onClick={() => { 
													setRenamingIdx(idx); 
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
													onClick={() => setEditingOptionsIdx(idx)} 
													className="text-emerald-600 cursor-pointer border-none bg-transparent"
												>
													<ListTree size={16} />
												</Button>
											)}
											<Button 
												variant="ghost" 
												size="sm" 
												disabled={isInteractionDisabled} 
												onClick={() => onDeleteField(idx, field.name)} 
												className="text-destructive cursor-pointer border-none bg-transparent"
											>
												<Trash2 size={16} />
											</Button>
										</div>
									</div>
								))}
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
									className="rounded-xl" 
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
									className="cursor-pointer w-4 h-4 accent-emerald-500" 
								/>
								<Label htmlFor="renameFieldReq" className="text-xs font-medium cursor-pointer">
									{t("isRequired")}
								</Label>
							</div>
							<Button 
								onClick={() => { onRenameField(renamingIdx, renamingInput, renamingType, renamingRequired); setRenamingIdx(-1); }} 
								disabled={isInteractionDisabled || !renamingInput.trim()} 
								className="w-full bg-emerald-500 text-black font-bold h-12 rounded-xl mt-2 cursor-pointer border-none"
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
									className="rounded-xl" 
								/>
								<Button 
									onClick={() => onAddOption(editingOptionsIdx, newOptionInput)} 
									disabled={isInteractionDisabled || !newOptionInput.trim()} 
									className="bg-emerald-500 text-black font-bold rounded-xl cursor-pointer border-none h-10 px-4"
								>
									{t("add")}
								</Button>
							</div>
							<div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
								{(customFields[editingOptionsIdx]?.options || []).map((opt: string) => (
									<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
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

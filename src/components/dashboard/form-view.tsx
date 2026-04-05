"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
	Plus, 
	Link as LinkIcon, 
	History, 
	Wallet, 
	Settings2, 
	Trash2, 
	ListTree, 
	Pencil, 
	ChevronLeft, 
	TrendingUp, 
	TrendingDown, 
	Eye, 
	EyeOff, 
	ChevronDown, 
	ChevronUp 
} from "lucide-react";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { CustomFieldDef } from "@/hooks/use-dashboard-logic";

interface FormViewProps {
	totalAmount: number;
	formatCurrency: (val: number) => string;
	onViewDetail: () => void;
	headers: string[];
	formData: Record<string, string>;
	loading: boolean;
	user: any;
	categories: string[];
	transactions: any[];
	customFields: CustomFieldDef[];
	newCategoryInput: string;
	newFieldName: string;
	newFieldType: "text" | "dropdown";
	newFieldRequired: boolean;
	newOptionInput: string;
	isManageFieldsOpen: boolean;
	setIsManageFieldsOpen: (open: boolean) => void;
	onInputChange: (header: string, value: string) => void;
	onSubmit: () => void;
	onAddCategory: () => void;
	onDeleteCategory: (cat: string) => void;
	onAddField: () => void;
	onDeleteField: (idx: number, name: string) => void;
	onRenameField: (idx: number, name: string, type: "text" | "dropdown", req: boolean) => void;
	onAddOption: (idx: number, opt: string) => void;
	onDeleteOption: (idx: number, opt: string) => void;
	setNewCategoryInput: (val: string) => void;
	setNewFieldName: (val: string) => void;
	setNewFieldType: (val: "text" | "dropdown") => void;
	setNewFieldRequired: (val: boolean) => void;
	setNewOptionInput: (val: string) => void;
	translateHeader: (header: string) => string;
	onGoogleLogin: () => void;
	onDisconnect: () => void;
	currentMonth: string;
	onRequestAccess?: (email: string) => void;
}

export function FormView(props: FormViewProps) {
	const { t } = useLanguage();
	const [editingOptionsIdx, setEditingOptionsIdx] = React.useState<number>(-1);
	const [renamingIdx, setRenamingIdx] = React.useState<number>(-1);
	const [renamingInput, setRenamingInput] = React.useState("");
	const [renamingType, setRenamingType] = React.useState<"text" | "dropdown">("text");
	const [renamingRequired, setRenamingRequired] = React.useState(true);
	
	// Clean Coder: Privacy & Compact States
	const [isPrivate, setIsPrivate] = React.useState(false);
	const [isCompact, setIsCompact] = React.useState(false);

	React.useEffect(() => {
		setIsPrivate(localStorage.getItem("privacy_mode") === "true");
		setIsCompact(localStorage.getItem("compact_mode") === "true");
	}, []);

	const togglePrivacy = () => {
		const newVal = !isPrivate;
		setIsPrivate(newVal);
		localStorage.setItem("privacy_mode", String(newVal));
	};

	const toggleCompact = () => {
		const newVal = !isCompact;
		setIsCompact(newVal);
		localStorage.setItem("compact_mode", String(newVal));
	};

	const maskValue = (val: string) => isPrivate ? "******" : val;

	const [isSyncModalOpen, setIsSyncModalOpen] = React.useState(false);
	const [syncTriggerSource, setSyncTriggerSource] = React.useState<"general" | "fields">("general");

	const handleManageFieldsClick = (e: React.MouseEvent) => {
		if (!props.user) {
			e.preventDefault();
			setSyncTriggerSource("fields");
			setIsSyncModalOpen(true);
		}
	};

	const handleGeneralSyncClick = () => {
		setSyncTriggerSource("general");
		setIsSyncModalOpen(true);
	};

	const displayHeaders = props.headers.length > 0 ? props.headers : ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];

	return (
		<motion.div 
			initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
			className="space-y-6"
		>
			<section className="mt-2">
				<div className="bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-6 text-black shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
					<div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full blur-2xl" />
					<div className="relative z-10">
						<div className="flex justify-between items-start">
							<p className="text-xs font-bold uppercase opacity-70 tracking-wider">Total {t("amount")} ({props.currentMonth.split(' ')[0]})</p>
							<div className="flex gap-2">
								<Button 
									size="icon" 
									variant="ghost" 
									onClick={togglePrivacy}
									className="h-8 w-8 bg-black/10 hover:bg-black/20 text-black border-none rounded-full cursor-pointer"
								>
									{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
								</Button>
								<Button size="sm" onClick={props.onViewDetail} className="h-8 bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold text-[10px] px-3 cursor-pointer">
									<History size={12} className="mr-1" /> {t("viewDetail")}
								</Button>
							</div>
						</div>
						
						<div className="flex items-center justify-between mt-1">
							<h2 className="text-3xl font-black tracking-tight">{maskValue(props.formatCurrency(props.totalAmount))}</h2>
							<Button 
								size="icon" 
								variant="ghost" 
								onClick={toggleCompact}
								className="h-8 w-8 bg-black/10 hover:bg-black/20 text-black border-none rounded-full cursor-pointer transition-transform"
							>
								{isCompact ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
							</Button>
						</div>
						
						<AnimatePresence>
							{!isCompact && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									className="overflow-hidden"
								>
									{/* Balance Summary Row */}
									<div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between text-[10px] font-black opacity-80 flex-wrap gap-y-2">
										<div className="flex items-center gap-1.5">
											<div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center">
												<Wallet size={12} className="opacity-50" />
											</div>
											<span>{maskValue(props.formatCurrency(props.transactions.find(t => t.category === "Initial Balance")?.amount || 0))}</span>
										</div>
										
										<div className="flex items-center gap-3">
											<div className="flex items-center gap-1.5 text-emerald-900">
												<TrendingUp size={12} />
												<span>{maskValue(props.formatCurrency(props.transactions.filter(t => t.category !== "Initial Balance" && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)))}</span>
											</div>
											<div className="w-1 h-1 rounded-full bg-black/10" />
											<div className="flex items-center gap-1.5 text-red-900">
												<TrendingDown size={12} />
												<span>{maskValue(props.formatCurrency(Math.abs(props.transactions.filter(t => t.category !== "Initial Balance" && t.amount < 0).reduce((sum, t) => sum + t.amount, 0))))}</span>
											</div>
										</div>
									</div>

									{/* Actions Row */}
									<div className="flex justify-end items-center mt-4">
										<div className="flex gap-2">
											<Dialog open={props.isManageFieldsOpen} onOpenChange={(open) => {
												if (open && !props.user) {
													setSyncTriggerSource("fields");
													setIsSyncModalOpen(true);
													return;
												}
												props.setIsManageFieldsOpen(open);
											}}>
												<DialogTrigger render={<Button size="sm" variant="secondary" onClick={handleManageFieldsClick} className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-3 cursor-pointer" />}>
													<Settings2 size={14} className="mr-1" /> {t("manageFields")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden">
													<DialogHeader className="px-6 pt-6">
														<DialogTitle className="flex items-center gap-2">
															{(editingOptionsIdx !== -1 || renamingIdx !== -1) && <Button variant="ghost" size="sm" onClick={() => { setEditingOptionsIdx(-1); setRenamingIdx(-1); }} className="h-8 w-8 p-0 rounded-full"><ChevronLeft size={20} /></Button>}
															{editingOptionsIdx === -1 && renamingIdx === -1 ? t("manageFields") : editingOptionsIdx !== -1 ? `${t("manageOptions")}: ${props.customFields[editingOptionsIdx].name}` : t("editField")}
														</DialogTitle>
													</DialogHeader>
													<div className="space-y-4 p-6 pt-2">
														{editingOptionsIdx === -1 && renamingIdx === -1 ? (
															<>
																<div className="flex flex-col gap-3">
																	<Input placeholder="Field Name" value={props.newFieldName} onChange={(e) => props.setNewFieldName(e.target.value)} disabled={props.customFields.length >= 2} />
																	<div className="flex flex-col gap-2">
																		<div className="flex gap-2">
																			<Select value={props.newFieldType} onValueChange={(v: any) => props.setNewFieldType(v || "text")} disabled={props.customFields.length >= 2}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">{t("text")}</SelectItem><SelectItem value="dropdown">{t("dropdown")}</SelectItem></SelectContent></Select>
																			<Button onClick={props.onAddField} disabled={props.customFields.length >= 2 || props.loading || !props.newFieldName.trim()} className="bg-emerald-500 text-black font-bold px-6 cursor-pointer">{t("add")}</Button>
																		</div>
																		<div className="flex items-center gap-2 px-1"><input type="checkbox" id="newFieldReq" checked={props.newFieldRequired} onChange={(e) => props.setNewFieldRequired(e.target.checked)} className="w-4 h-4 rounded cursor-pointer" /><Label htmlFor="newFieldReq" className="text-xs font-medium cursor-pointer">{t("isRequired")}</Label></div>
																	</div>
																</div>
																<div className="space-y-2 mt-4">
																	{props.customFields.map((field, idx) => (
																		<div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
																			<div className="flex-1">
																				<div className="flex items-center gap-2">
																					<p className="text-sm font-bold">{field.name}</p>
																					<span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${field.required ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{field.required ? t("requiredLabel") : t("optionalLabel")}</span>
																				</div>
																				<p className="text-[10px] opacity-60 uppercase">{field.type}</p>
																			</div>
																			<div className="flex gap-1">
																				<Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => { setRenamingIdx(idx); setRenamingInput(field.name); setRenamingType(field.type); setRenamingRequired(field.required); }}><Pencil size={16} /></Button>
																				{field.type === "dropdown" && (<Button variant="ghost" size="sm" onClick={() => setEditingOptionsIdx(idx)} className="text-emerald-600 cursor-pointer"><ListTree size={16} /></Button>)}
																				<Button variant="ghost" size="sm" onClick={() => props.onDeleteField(idx, field.name)} className="text-destructive cursor-pointer"><Trash2 size={16} /></Button>
																			</div>
																		</div>
																	))}
																</div>
															</>
														) : renamingIdx !== -1 ? (
															<div className="space-y-4">
																<div className="space-y-2"><Label className="text-xs">{t("name")}</Label><Input value={renamingInput} onChange={(e) => setRenamingInput(e.target.value)} className="rounded-xl" /></div>
																<div className="space-y-2"><Label className="text-xs">{t("fieldType")}</Label><Select value={renamingType} onValueChange={(v: any) => setRenamingType(v || "text")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text" className="cursor-pointer">{t("text")}</SelectItem><SelectItem value="dropdown" className="cursor-pointer">{t("dropdown")}</SelectItem></SelectContent></Select></div>
																<div className="flex items-center gap-2 px-1 py-1"><input type="checkbox" id="renameFieldReq" checked={renamingRequired} onChange={(e) => setRenamingRequired(e.target.checked)} className="cursor-pointer" /><Label htmlFor="renameFieldReq" className="text-xs font-medium cursor-pointer">{t("isRequired")}</Label></div>
																<Button onClick={() => { props.onRenameField(renamingIdx, renamingInput, renamingType, renamingRequired); setRenamingIdx(-1); }} disabled={props.loading} className="w-full bg-emerald-500 text-black font-bold h-12 rounded-xl mt-2 cursor-pointer">{t("editField")}</Button>
															</div>
														) : (
															<div className="space-y-4">
																<div className="flex gap-2"><Input placeholder={t("newOption")} value={props.newOptionInput} onChange={(e) => props.setNewOptionInput(e.target.value)} className="rounded-xl" /><Button onClick={() => props.onAddOption(editingOptionsIdx, props.newOptionInput)} className="bg-emerald-500 text-black font-bold rounded-xl cursor-pointer">{t("add")}</Button></div>
																<div className="max-h-[200px] overflow-y-auto space-y-2">{(props.customFields[editingOptionsIdx].options || []).map((opt) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"><span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" onClick={() => props.onDeleteOption(editingOptionsIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
															</div>
														)}
													</div>
												</DialogContent>
											</Dialog>

											<Button size="sm" variant="secondary" onClick={handleGeneralSyncClick} className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-3 cursor-pointer">
												<LinkIcon size={14} className="mr-1" /> {props.user ? "Sync" : t("integration")}
											</Button>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</section>

			{/* Integration/Sync Modal - Always in DOM but controlled by state */}
			<Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
				<DialogContent className="sm:max-w-[425px] rounded-3xl">
					<DialogHeader><DialogTitle>{t("integrationTitle")}</DialogTitle></DialogHeader>
					<div className="py-6 flex flex-col items-center text-center gap-4">
						<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2"><Wallet className="text-emerald-600 dark:text-emerald-400" size={32} /></div>
						{props.user ? (
							<div className="space-y-3 w-full">
								<p className="font-bold text-sm text-emerald-600">{t("googleSyncActive")}</p>
								<div className="flex flex-col gap-2">
									<p className="text-[10px] text-zinc-500 italic">Current: {props.currentMonth}</p>
									{props.headers.length > 0 && (
										<Button 
											variant="outline" 
											className="w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-zinc-200 dark:border-zinc-800 cursor-pointer"
											onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${localStorage.getItem("sheetId")}/edit`, "_blank")}
										>
											<LinkIcon size={14} />
											Open Spreadsheet
										</Button>
									)}
								</div>
								<Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 font-bold text-[10px] mt-2 cursor-pointer" onClick={props.onDisconnect}>{t("googleSyncDisconnect")}</Button>
							</div>
						) : (
							<div className="space-y-4 w-full px-4">
								<p className="text-sm font-medium text-zinc-500 leading-relaxed">
									{syncTriggerSource === "fields" ? t("syncFieldsPrompt") : t("syncGeneralPrompt")}
								</p>
								<div className="flex flex-col items-center gap-2">
									<Button 
										className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-200 font-bold h-12 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer" 
										onClick={props.onGoogleLogin} 
										disabled={props.loading}
									>
										<svg className="w-5 h-5" viewBox="0 0 24 24">
											<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
											<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
											<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
											<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
										</svg>
										{t("googleSyncBtn")}
									</Button>
									<button 
										onClick={() => { setIsSyncModalOpen(false); props.onRequestAccess?.(""); }}
										className="text-[10px] font-bold text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-2 cursor-pointer"
									>
										{t("requestAccess")}
									</button>
								</div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
				<h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Plus className="text-emerald-500" size={20} />{t("quickAdd")}</h3>
				<div className="space-y-5">
					{props.loading && props.headers.length === 0 ? (
						<div className="py-10 text-center text-zinc-500 font-medium">Connecting...</div>
					) : (
						displayHeaders.map((header) => {
							const hL = header.toLowerCase();
							if (hL.includes("tanggal") || hL.includes("date")) return null;
							const isCoreCat = hL.includes("kategori") || hL.includes("category");
							const isType = hL.includes("tipe") || hL.includes("type");
							const isAmount = hL.includes("jumlah") || hL.includes("amount");
							const customFieldIdx = props.customFields.findIndex(f => f.name.toLowerCase() === hL);
							const customField = customFieldIdx !== -1 ? props.customFields[customFieldIdx] : null;

							const isNote = hL.includes("catatan") || hL.includes("note");

							return (
								<div key={header} className="space-y-2">
									<div className="flex items-center justify-between ml-1">
										<Label className="text-xs text-zinc-500 dark:text-zinc-400">
											{props.translateHeader(header)} 
											{customField?.required && <span className="text-red-500 ml-1">*</span>}
											{isNote && <span className="text-[10px] opacity-60 font-normal ml-1">({t("optionalLabel")})</span>}
										</Label>
										{(isCoreCat || customField?.type === "dropdown") && (
											<Dialog>
												<DialogTrigger render={<Button variant="ghost" size="sm" disabled={props.loading || !props.user} className="h-6 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-2 rounded-lg cursor-pointer" />}>
													{t("manageOptions")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[400px] rounded-3xl">
													<DialogHeader><DialogTitle>{isCoreCat ? t("manageCategories") : `${t("manageOptions")}: ${header}`}</DialogTitle></DialogHeader>
													<div className="space-y-4 py-4">
														<div className="flex gap-2"><Input placeholder={isCoreCat ? t("newCategory") : t("newOption")} value={isCoreCat ? props.newCategoryInput : props.newOptionInput} onChange={(e) => isCoreCat ? props.setNewCategoryInput(e.target.value) : props.setNewOptionInput(e.target.value)} className="rounded-xl" /><Button onClick={() => isCoreCat ? props.onAddCategory() : props.onAddOption(customFieldIdx, props.newOptionInput)} className="bg-emerald-500 text-black font-bold rounded-xl cursor-pointer">{t("add")}</Button></div>
														<div className="max-h-[200px] overflow-y-auto space-y-2">{(isCoreCat ? props.categories : customField?.options || []).map((opt) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
															<span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" onClick={() => isCoreCat ? props.onDeleteCategory(opt) : props.onDeleteOption(customFieldIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
													</div>
												</DialogContent>
											</Dialog>
										)}
									</div>
									{(isCoreCat || (customField?.type === "dropdown")) ? (
										<Select value={props.formData[header] || ""} disabled={props.loading || !props.user} onValueChange={(val) => props.onInputChange(header, val || "")}>
											<SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer"><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
											<SelectContent className="rounded-xl">{(isCoreCat ? props.categories : customField?.options || []).map((opt) => (<SelectItem key={opt} value={opt} className="cursor-pointer">{opt}</SelectItem>))}</SelectContent>
										</Select>
									) : isType ? (
										<Select value={props.formData[header] || ""} disabled={props.loading || !props.user} onValueChange={(val) => props.onInputChange(header, val || "")}>
											<SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 cursor-pointer"><SelectValue placeholder={t("transactionType")} /></SelectTrigger>
											<SelectContent className="rounded-xl"><SelectItem value={t("income")} className="cursor-pointer">{t("income")}</SelectItem><SelectItem value={t("expense")} className="cursor-pointer">{t("expense")}</SelectItem></SelectContent>
										</Select>
									) : (
										<Input type={isAmount ? "number" : "text"} disabled={props.loading || !props.user} placeholder={`Enter ${props.translateHeader(header)}`} className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950" value={props.formData[header] || ""} onChange={(e) => props.onInputChange(header, e.target.value)} />
									)}
								</div>
							);
						})
					)}
					
					{props.user ? (
						<Button disabled={props.loading} onClick={props.onSubmit} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg rounded-2xl mt-4 shadow-lg cursor-pointer">
							{props.loading ? "..." : t("addExpense")}
						</Button>
					) : (
						<div className="flex flex-col items-center gap-2">
							<Button onClick={handleGeneralSyncClick} className="w-full h-14 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-lg rounded-2xl mt-4 shadow-sm cursor-pointer">
								{t("signIn")}
							</Button>
							<button 
								onClick={() => props.onRequestAccess?.("")}
								className="text-[10px] font-bold text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-2 cursor-pointer"
							>
								{t("requestAccess")}
							</button>
						</div>
					)}
				</div>
			</section>
		</motion.div>
	);
}

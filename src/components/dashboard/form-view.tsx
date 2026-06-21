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
	ChevronUp,
	Download,
	Home,
	Smartphone,
	Monitor,
	User
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
import { NumericKeyboard, formatRupiah, stripRupiah, evaluateExpression } from "@/components/dashboard/numeric-keyboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";

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
	onGoogleLogin: (forceAccountSelection?: boolean) => void;
	onDisconnect: () => void;
	currentMonth: string;
	isIntegrating?: boolean;
	isDemoMode?: boolean;
	supabaseUser?: any;
	isGoogleConnected?: boolean;
	googleEmail?: string;
	exportToCSV?: () => void;
	exportToGoogleSheets?: () => void;
	onLoginClick?: () => void;
	
	// PWA Props
	isAddToHomeOpen: boolean;
	setIsAddToHomeOpen: (open: boolean) => void;
	isInstallable: boolean;
	triggerInstall: () => void;
	isStandaloneMode: boolean;
}

export function FormView(props: FormViewProps) {
	const { t, language } = useLanguage();
	const isMobile = useIsMobile();
	const { enterDemo } = useDemo();

	const [editingOptionsIdx, setEditingOptionsIdx] = React.useState<number>(-1);
	const [showManualInstruction, setShowManualInstruction] = React.useState(false);
	const [renamingIdx, setRenamingIdx] = React.useState<number>(-1);
	const [renamingInput, setRenamingInput] = React.useState("");
	const [renamingType, setRenamingType] = React.useState<"text" | "dropdown">("text");
	const [renamingRequired, setRenamingRequired] = React.useState(true);

	const os = React.useMemo(() => {
		if (typeof window === "undefined") return "desktop";
		const ua = window.navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(ua)) return "ios";
		if (/android/.test(ua)) return "android";
		return "desktop";
	}, []);
	
	// Clean Coder: Privacy & Compact States
	const [isPrivate, setIsPrivate] = React.useState(false);
	const [isCompact, setIsCompact] = React.useState(false);

	// Mobile keyboard focus state – which amount header is focused
	const [mobileKbHeader, setMobileKbHeader] = React.useState<string | null>(null);

	// Ref to amount field container for scroll-into-view
	const amountFieldRef = React.useRef<HTMLDivElement>(null);

	// Auto-scroll focused amount field into view when the mobile keyboard slides up
	React.useEffect(() => {
		if (isMobile && mobileKbHeader && amountFieldRef.current) {
			const timer = setTimeout(() => {
				amountFieldRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 300); // 300ms is standard for keyboard animation transition
			return () => clearTimeout(timer);
		}
	}, [mobileKbHeader, isMobile]);

	const isInteractionDisabled = props.loading || props.isIntegrating || (!props.supabaseUser && !props.user && !props.isDemoMode);
	const isSyncing = props.loading || props.isIntegrating;

	React.useEffect(() => {
		setIsPrivate(localStorage.getItem("privacy_mode") === "true");
		setIsCompact(localStorage.getItem("compact_mode") === "true");
	}, []);

	// ─── Feature 6: Enter Key shortcut ──────────────────────────────────────────
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Enter") return;
			const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
			// Don't intercept if in textarea, select, or when disabled
			if (tag === "textarea" || isInteractionDisabled) return;
			// Don't intercept if a dialog/modal is open
			if (document.querySelector("[data-state='open'][role='dialog']")) return;
			e.preventDefault();
			props.onSubmit();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isInteractionDisabled, props.onSubmit]);

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

	const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);

	const handleManageFieldsClick = (e: React.MouseEvent) => {
		if (!props.user && !props.supabaseUser && !props.isDemoMode) {
			e.preventDefault();
			props.onLoginClick?.();
		}
	};

	// ─── Feature 3: Amount formatting helpers ────────────────────────────────────
	const handleAmountChange = (header: string, raw: string) => {
		// Strip any existing formatting then re-format
		const digits = stripRupiah(raw);
		const formatted = digits ? formatRupiah(digits) : "";
		props.onInputChange(header, formatted);
	};

	const displayHeaders = props.headers.length > 0 ? props.headers : ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];

	// Determine if previously logged in (for silent re-auth hint)
	const hasPreviousLogin = typeof window !== "undefined" && !!localStorage.getItem("googleUser");

	return (
		<motion.div 
			initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
			className="space-y-6"
		>
			<section className="mt-2">
				<div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-6 text-black shadow-lg shadow-emerald-500/25 relative overflow-hidden group">
					<div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full blur-2xl" />
					<div className="relative z-10">
						<div className="flex justify-between items-start">
							<p className="text-xs font-bold uppercase opacity-70 tracking-wider">Total {t("amount")} ({props.currentMonth.split(' ')[0]})</p>
							<div className="flex gap-2">
								<Button 
									size="icon" 
									variant="ghost" 
									onClick={togglePrivacy}
									disabled={isSyncing}
									className="h-8 w-8 bg-black/10 hover:bg-black/20 text-black border-none rounded-full cursor-pointer"
								>
									{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
								</Button>
								<Button size="sm" onClick={props.onViewDetail} disabled={isSyncing} className="h-8 bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold text-[10px] px-3 cursor-pointer">
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
								disabled={isSyncing}
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
											{!props.isStandaloneMode && (
												<Dialog open={props.isAddToHomeOpen} onOpenChange={(open) => {
													props.setIsAddToHomeOpen(open);
													if (!open) setShowManualInstruction(false);
												}}>
													<DialogTrigger render={
														<Button 
															size="sm" 
															variant="secondary" 
															disabled={isSyncing} 
															className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-3 cursor-pointer flex items-center gap-1.5"
														>
															<Download size={12} />
															{t("addToHomepage")}
														</Button>
													} />
													<DialogContent className="sm:max-w-[420px] rounded-3xl overflow-hidden p-6">
														<DialogHeader>
															<DialogTitle className="flex items-center gap-2">
																<Home size={20} className="text-emerald-500" />
																{t("addToHomeTitle")}
															</DialogTitle>
														</DialogHeader>
														<div className="space-y-4 pt-2">
															<p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed font-semibold">
																{t("addToHomeDesc")}
															</p>
															
															<Button 
																onClick={() => {
																	if (props.isInstallable) {
																		props.triggerInstall();
																	} else {
																		setShowManualInstruction(true);
																	}
																}}
																className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-12 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
															>
																<Download size={18} />
																{props.isInstallable ? t("installApp") : t("addToHomepage")}
															</Button>

															{showManualInstruction && (
																<motion.div 
																	initial={{ opacity: 0, height: 0 }}
																	animate={{ opacity: 1, height: "auto" }}
																	className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed space-y-1.5"
																>
																	{(os === "ios" ? t("iosShortInstruction") : os === "android" ? t("chromeInstructions") : t("desktopInstructions")).split("\n").map((line, idx) => (
																		<p key={idx}>{line}</p>
																	))}
																</motion.div>
															)}
														</div>
													</DialogContent>
												</Dialog>
											)}

											{!props.isDemoMode && (
												props.supabaseUser || props.user ? (
													<Button 
														size="sm" 
														variant="secondary" 
														onClick={() => setIsProfileModalOpen(true)} 
														disabled={isSyncing} 
														className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-4 h-8 cursor-pointer text-xs flex items-center gap-1.5"
													>
														<User size={12} />
														Profile
													</Button>
												) : (
													<Button 
														size="sm" 
														variant="secondary" 
														onClick={props.onLoginClick} 
														disabled={isSyncing} 
														className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-4 h-8 cursor-pointer text-xs flex items-center gap-1.5"
													>
														<User size={12} />
														Login
													</Button>
												)
											)}
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</section>

			{/* Profile Modal */}
			<Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
				<DialogContent className="sm:max-w-[425px] rounded-3xl">
					<DialogHeader>
						<DialogTitle>{t("profileAndAccount")}</DialogTitle>
					</DialogHeader>
					<div className="py-6 flex flex-col items-center text-center gap-4">
						{props.supabaseUser && (props.supabaseUser.user_metadata?.avatar_url || props.supabaseUser.user_metadata?.picture) ? (
							<img 
								src={props.supabaseUser.user_metadata.avatar_url || props.supabaseUser.user_metadata.picture} 
								className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md mb-2" 
								alt="Profile Photo" 
							/>
						) : props.user && props.user.photo ? (
							<img 
								src={props.user.photo} 
								className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md mb-2" 
								referrerPolicy="no-referrer"
								alt="Profile Photo" 
							/>
						) : (
							<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
								<User className="text-emerald-600 dark:text-emerald-400" size={32} />
							</div>
						)}
						
						{props.supabaseUser ? (
							<div className="space-y-4 w-full px-4">
								<div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left space-y-1">
									<p className="text-[10px] uppercase font-bold text-zinc-400">Account Profile</p>
									<p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{props.supabaseUser.email}</p>
								</div>
								
								<div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-4 w-full flex flex-col items-center">
									<button
										onClick={async () => {
											await supabase.auth.signOut();
											localStorage.removeItem("googleUser");
											localStorage.removeItem("sheetId");
											window.location.reload();
										}}
										className="text-xs font-bold text-destructive hover:underline cursor-pointer"
									>
										Log Out Account
									</button>
								</div>
							</div>
						) : props.user ? (
							<div className="space-y-4 w-full px-4">
								<div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-left space-y-1">
									<p className="text-[10px] uppercase font-bold text-zinc-400">Sync Status</p>
									<p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t("googleSyncActive")}</p>
									<p className="text-[10px] text-zinc-500 truncate mt-0.5">Account: {props.user.name}</p>
								</div>
								
								<div className="flex flex-col gap-2 w-full">
									{props.headers.length > 0 && (
										<Button 
											variant="outline" 
											className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border-zinc-200 dark:border-zinc-800 cursor-pointer"
											onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${localStorage.getItem("sheetId")}/edit`, "_blank")}
										>
											<LinkIcon size={14} />
											Open Spreadsheet
										</Button>
									)}
									<Button 
										variant="ghost" 
										className="w-full h-11 text-destructive hover:bg-destructive/10 font-bold text-xs rounded-xl cursor-pointer" 
										onClick={props.onDisconnect}
									>
										{t("googleSyncDisconnect")}
									</Button>
								</div>
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>

			<section className="rounded-3xl p-6 glass-card">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-lg font-bold flex items-center gap-2"><Plus className="text-emerald-500" size={20} />{t("quickAdd")}</h3>
					
					{/* Manage Fields Dialog */}
					<Dialog open={props.isManageFieldsOpen} onOpenChange={(open) => {
						if (open && !props.user && !props.supabaseUser && !props.isDemoMode) {
							props.onLoginClick?.();
							return;
						}
						props.setIsManageFieldsOpen(open);
					}}>
						<DialogTrigger render={
							<Button 
								size="sm" 
								variant="outline" 
								disabled={isSyncing} 
								className="h-8 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/35 hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 dark:border-emerald-500/25 px-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
								onClick={handleManageFieldsClick}
							>
								<Settings2 size={14} /> {t("manageFields")}
							</Button>
						} />
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
											<Input placeholder="Field Name" value={props.newFieldName} onChange={(e) => props.setNewFieldName(e.target.value)} disabled={props.customFields.length >= 2 || isInteractionDisabled} />
											<div className="flex flex-col gap-2">
												<div className="flex gap-2">
													<Select value={props.newFieldType} onValueChange={(v: any) => props.setNewFieldType(v || "text")} disabled={props.customFields.length >= 2 || isInteractionDisabled}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">{t("text")}</SelectItem><SelectItem value="dropdown">{t("dropdown")}</SelectItem></SelectContent></Select>
													<Button onClick={props.onAddField} disabled={props.customFields.length >= 2 || isInteractionDisabled || !props.newFieldName.trim()} className="bg-emerald-500 text-black font-bold px-6 cursor-pointer">{t("add")}</Button>
												</div>
												<div className="flex items-center gap-2 px-1"><input type="checkbox" id="newFieldReq" checked={props.newFieldRequired} onChange={(e) => props.setNewFieldRequired(e.target.checked)} disabled={isInteractionDisabled} className="w-4 h-4 rounded cursor-pointer" /><Label htmlFor="newFieldReq" className="text-xs font-medium cursor-pointer">{t("isRequired")}</Label></div>
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
														<Button variant="ghost" size="sm" className="cursor-pointer" disabled={isInteractionDisabled} onClick={() => { setRenamingIdx(idx); setRenamingInput(field.name); setRenamingType(field.type); setRenamingRequired(field.required); }}><Pencil size={16} /></Button>
														{field.type === "dropdown" && (<Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => setEditingOptionsIdx(idx)} className="text-emerald-600 cursor-pointer"><ListTree size={16} /></Button>)}
														<Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => props.onDeleteField(idx, field.name)} className="text-destructive cursor-pointer"><Trash2 size={16} /></Button>
													</div>
												</div>
											))}
										</div>
									</>
								) : renamingIdx !== -1 ? (
									<div className="space-y-4">
										<div className="space-y-2"><Label className="text-xs">{t("name")}</Label><Input value={renamingInput} onChange={(e) => setRenamingInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-xl" /></div>
										<div className="space-y-2"><Label className="text-xs">{t("fieldType")}</Label><Select value={renamingType} onValueChange={(v: any) => setRenamingType(v || "text")} disabled={isInteractionDisabled}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text" className="cursor-pointer">{t("text")}</SelectItem><SelectItem value="dropdown" className="cursor-pointer">{t("dropdown")}</SelectItem></SelectContent></Select></div>
										<div className="flex items-center gap-2 px-1 py-1"><input type="checkbox" id="renameFieldReq" checked={renamingRequired} onChange={(e) => setRenamingRequired(e.target.checked)} disabled={isInteractionDisabled} className="cursor-pointer" /><Label htmlFor="renameFieldReq" className="text-xs font-medium cursor-pointer">{t("isRequired")}</Label></div>
										<Button onClick={() => { props.onRenameField(renamingIdx, renamingInput, renamingType, renamingRequired); setRenamingIdx(-1); }} disabled={isInteractionDisabled} className="w-full bg-emerald-500 text-black font-bold h-12 rounded-xl mt-2 cursor-pointer">{t("editField")}</Button>
									</div>
								) : (
									<div className="space-y-4">
										<div className="flex gap-2"><Input placeholder={t("newOption")} value={props.newOptionInput} onChange={(e) => props.setNewOptionInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-xl" /><Button onClick={() => props.onAddOption(editingOptionsIdx, props.newOptionInput)} disabled={isInteractionDisabled} className="bg-emerald-500 text-black font-bold rounded-xl cursor-pointer">{t("add")}</Button></div>
										<div className="max-h-[200px] overflow-y-auto space-y-2">{(props.customFields[editingOptionsIdx].options || []).map((opt) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"><span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => props.onDeleteOption(editingOptionsIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
									</div>
								)}
							</div>
						</DialogContent>
					</Dialog>
				</div>
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
								<div key={header} ref={isAmount ? amountFieldRef : undefined} className="space-y-2">
									<div className="flex items-center justify-between ml-1">
										<Label className="text-xs text-zinc-500 dark:text-zinc-400">
											{/* Feature 3: Amount label shows "Nominal (Rp)" */}
											{isAmount ? t("amountLabel") : props.translateHeader(header)} 
											{customField?.required && <span className="text-red-500 ml-1">*</span>}
											{isNote && <span className="text-[10px] opacity-60 font-normal ml-1">({t("optionalLabel")})</span>}
										</Label>
										{(isCoreCat || customField?.type === "dropdown") && (
											<Dialog>
												<DialogTrigger render={<Button variant="ghost" size="sm" disabled={isInteractionDisabled} className="h-6 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-2 rounded-lg cursor-pointer" />}>
													{t("manageOptions")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[400px] rounded-3xl">
													<DialogHeader><DialogTitle>{isCoreCat ? t("manageCategories") : `${t("manageOptions")}: ${header}`}</DialogTitle></DialogHeader>
													<div className="space-y-4 py-4">
														<div className="flex gap-2"><Input placeholder={isCoreCat ? t("newCategory") : t("newOption")} value={isCoreCat ? props.newCategoryInput : props.newOptionInput} onChange={(e) => isCoreCat ? props.setNewCategoryInput(e.target.value) : props.setNewOptionInput(e.target.value)} disabled={isInteractionDisabled} className="rounded-xl" /><Button onClick={() => isCoreCat ? props.onAddCategory() : props.onAddOption(customFieldIdx, props.newOptionInput)} disabled={isInteractionDisabled} className="bg-emerald-500 text-black font-bold rounded-xl cursor-pointer">{t("add")}</Button></div>
														<div className="max-h-[200px] overflow-y-auto space-y-2">{(isCoreCat ? props.categories : customField?.options || []).map((opt) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
															<span className="text-sm font-medium">{opt}</span><Button variant="ghost" size="sm" disabled={isInteractionDisabled} onClick={() => isCoreCat ? props.onDeleteCategory(opt) : props.onDeleteOption(customFieldIdx, opt)} className="cursor-pointer"><Trash2 size={14} /></Button></div>))}</div>
													</div>
												</DialogContent>
											</Dialog>
										)}
									</div>
									{(isCoreCat || (customField?.type === "dropdown")) ? (
										<Select value={props.formData[header] || ""} disabled={isInteractionDisabled} onValueChange={(val) => props.onInputChange(header, val || "")}>
											<SelectTrigger className="h-12 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 cursor-pointer transition-colors"><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
											<SelectContent className="rounded-xl">{(isCoreCat ? props.categories : customField?.options || []).map((opt) => (<SelectItem key={opt} value={opt} className="cursor-pointer">{opt}</SelectItem>))}</SelectContent>
										</Select>
									) : isType ? (
										<div className="flex bg-white/30 dark:bg-zinc-950/20 p-1.5 rounded-xl gap-1 border border-zinc-250 dark:border-zinc-850">
											<button
												type="button"
												className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${props.formData[header] === "Pemasukan / Income" ? "bg-white/80 dark:bg-zinc-900/60 text-emerald-600 shadow-sm border border-white/40 dark:border-white/5" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent border border-transparent"}`}
												onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.onInputChange(header, "Pemasukan / Income"); }}
												disabled={isInteractionDisabled}
											>
												<TrendingUp size={18} />
												{t("income")}
											</button>
											<button
												type="button"
												className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${props.formData[header] === "Pengeluaran / Expense" ? "bg-white/80 dark:bg-zinc-900/60 text-red-600 shadow-sm border border-white/40 dark:border-white/5" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent border border-transparent"}`}
												onClick={(e) => { e.preventDefault(); e.stopPropagation(); props.onInputChange(header, "Pengeluaran / Expense"); }}
												disabled={isInteractionDisabled}
											>
												<TrendingDown size={18} />
												{t("expense")}
											</button>
										</div>
									) : isAmount ? (
										// ─── Feature 2 & 3: Amount field with Rupiah formatting ──────────
										<>
											<div className="relative flex items-center w-full">
												<span className="absolute left-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 select-none pointer-events-none">
													Rp
												</span>
												<Input
													type="text"
													inputMode={isMobile ? "none" : "numeric"}
													disabled={isInteractionDisabled}
													placeholder={t("amountPlaceholder")}
													className="h-12 w-full pl-9 pr-4 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-base transition-colors"
													value={props.formData[header] || ""}
													onChange={(e) => handleAmountChange(header, e.target.value)}
													onFocus={() => isMobile && setMobileKbHeader(header)}
												/>
											</div>
											{/* Feature 2: Mobile keyboard – shows when this field is focused on mobile */}
											{isMobile && mobileKbHeader === header && (
												<NumericKeyboard
													value={props.formData[header] || ""}
													onChange={(val) => props.onInputChange(header, val)}
													onSubmit={() => {
														setMobileKbHeader(null);
													}}
													disabled={isInteractionDisabled}
												/>
											)}
										</>
									) : (
										<Input type="text" disabled={isInteractionDisabled} placeholder={`${props.translateHeader(header)}...`} className="h-12 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium transition-colors" value={props.formData[header] || ""} onChange={(e) => props.onInputChange(header, e.target.value)} />
									)}
								</div>
							);
						})
					)}
					
					{(props.supabaseUser || props.user || props.isDemoMode) ? (
						<Button disabled={isInteractionDisabled} onClick={props.onSubmit} className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black text-lg rounded-2xl mt-4 shadow-lg shadow-emerald-500/20 cursor-pointer border-none transition-all active:scale-[0.98]">
							{props.loading ? "..." : t("addExpense")}
						</Button>
					) : (
						<div className="flex flex-col items-center gap-2">
							<Button onClick={props.onLoginClick} disabled={isSyncing} className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black text-lg rounded-2xl mt-4 shadow-lg shadow-emerald-500/20 cursor-pointer border-none transition-all active:scale-[0.98]">
								{t("signIn")}
							</Button>
							<button
								type="button"
								onClick={enterDemo}
								disabled={isSyncing}
								className="text-xs font-semibold text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-2 cursor-pointer mt-2 disabled:opacity-50"
							>
								{t("tryDemo")}
							</button>
						</div>
					)}
				</div>
			</section>

			{/* Close mobile keyboard when tapping outside */}
			{isMobile && mobileKbHeader && (
				<div
					className="fixed inset-0 z-[68] bg-transparent"
					onClick={() => {
						const val = props.formData[mobileKbHeader] || "";
						const cleaned = val.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
						if (cleaned) {
							const result = evaluateExpression(cleaned);
							props.onInputChange(mobileKbHeader, formatRupiah(result.toString()));
						}
						setMobileKbHeader(null);
					}}
				/>
			)}

			{/* Extra bottom spacing when mobile keyboard is open so the user can scroll the input field above the keyboard */}
			{isMobile && mobileKbHeader && (
				<div className="h-[310px] w-full pointer-events-none" />
			)}
		</motion.div>
	);
}

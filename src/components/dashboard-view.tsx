"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { FormView } from "./dashboard/form-view";
import dynamic from "next/dynamic";

const AnalyticsView = dynamic(
	() => import("./dashboard/analytics-view").then((mod) => mod.AnalyticsView),
	{
		ssr: false,
		loading: () => (
			<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-4">
				<Loader2 className="animate-spin text-emerald-500" size={32} />
				<p className="font-bold uppercase tracking-widest text-[10px]">Processing Data...</p>
			</div>
		)
	}
);
import { StatusModal } from "./dashboard/status-modal";
import { DisconnectModal } from "./dashboard/disconnect-modal";
import { DeleteFieldModal } from "./dashboard/delete-field-modal";
import { OnboardingTutorial } from "./dashboard/onboarding-tutorial";
import { IntegrationLoading } from "./dashboard/integration-loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, FlaskConical, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";

interface DashboardViewProps {
	isTutorialOpen?: boolean;
	onTutorialClose?: () => void;
	externalStatusModal?: { isOpen: boolean; title: string; desc: string };
	onExternalStatusClose?: () => void;
	onLoginClick?: () => void;
	onReportBug?: (title: string, description: string) => void;
}

export function DashboardView({ 
	isTutorialOpen = false, 
	onTutorialClose = () => {},
	externalStatusModal = { isOpen: false, title: "", desc: "" },
	onExternalStatusClose = () => {},
	onLoginClick = () => {},
	onReportBug,
}: DashboardViewProps) {
	const { t, language } = useLanguage();
	const { isDemoMode, demoTransactions, demoCategories, exitDemo, addDemoTransaction } = useDemo();
	
	const logic = useDashboardLogic(
		isDemoMode
			? { isDemoMode: true, demoTransactions, addDemoTransaction }
			: {}
	);
	
	const isLoggedIn = !!logic.supabaseUser || !!logic.user;
	
	// In demo mode, overlay the in-memory data on top of the hook's state
	const transactions = isDemoMode ? demoTransactions : logic.transactions;
	const categories = isDemoMode ? [...demoCategories, ...logic.categories.filter(c => !demoCategories.includes(c))] : logic.categories;
	const totalAmount = logic.totalAmount;
	
	// OCR States
	const ocrInputRef = React.useRef<HTMLInputElement>(null);
	const ocrGalleryInputRef = React.useRef<HTMLInputElement>(null);
	const [ocrLoading, setOcrLoading] = React.useState(false);
	const [ocrMessage, setOcrMessage] = React.useState("");
	const [isOcrPrivacyOpen, setIsOcrPrivacyOpen] = React.useState(false);

	const handleOcrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setOcrLoading(true);
		setOcrMessage("");
		try {
			const formBody = new FormData();
			formBody.append("file", file);
			formBody.append("categories", JSON.stringify(categories));

			const apiUrl = process.env.NEXT_PUBLIC_OCR_API_URL;
			const res = await fetch(`${apiUrl}/scan`, { method: "POST", body: formBody });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();

			if (data.amount) logic.handleInputChange("Amount / Jumlah", String(Math.round(data.amount)));
			if (data.name) logic.handleInputChange("Name / Nama", data.name);
			if (data.date) logic.handleInputChange("Date / Tanggal", data.date);
			if (data.category) logic.handleInputChange("Category / Kategori", data.category);
			logic.handleInputChange("Type / Tipe", "Pengeluaran / Expense");

			setOcrMessage(t("ocrSuccess"));
		} catch (err) {
			console.error("OCR Error:", err);
			setOcrMessage(t("ocrFailed"));
		} finally {
			setOcrLoading(false);
			if (ocrInputRef.current) ocrInputRef.current.value = "";
			if (ocrGalleryInputRef.current) ocrGalleryInputRef.current.value = "";
		}
	};

	// UI States for Modals
	const [isDisconnectModalOpen, setIsDisconnectModalOpen] = React.useState(false);
	const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; fieldName: string; index: number }>({ 
		isOpen: false, fieldName: "", index: -1 
	});

	const handleDeleteFieldTrigger = (idx: number, name: string) => {
		setDeleteConfirm({ isOpen: true, fieldName: name, index: idx });
	};

	return (
		<div className="flex flex-col p-4 gap-6 w-full min-h-screen relative mx-auto transition-all duration-500 bg-gradient-to-br from-zinc-50/10 via-emerald-500/5 to-teal-500/5 dark:from-zinc-950/10 dark:via-emerald-950/10 dark:to-zinc-950/10">
			{/* Demo Mode Banner */}
			<AnimatePresence>
				{isDemoMode && (
					<motion.div
						initial={{ opacity: 0, y: -40 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -40 }}
						className="sticky top-0 z-40 -mx-4 -mt-4 px-4 py-2.5 bg-amber-400 dark:bg-amber-500 text-black flex items-center justify-between gap-3 shadow-md"
					>
						<div className="flex items-center gap-2 text-xs font-bold">
							<FlaskConical size={14} />
							<span>{t("demoModeBanner")}</span>
						</div>
						<button
							onClick={exitDemo}
							className="text-[10px] font-black uppercase tracking-wider bg-black/15 hover:bg-black/25 px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
						>
							<X size={10} />
							{t("exitDemo")}
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{logic.isIntegrating && (
					<IntegrationLoading 
						isOpen={logic.isIntegrating} 
						description={logic.statusModal.description} 
					/>
				)}
			</AnimatePresence>

			<AnimatePresence mode="wait">
				{logic.view === "form" ? (
					<div key="form-container" className="max-w-md mx-auto w-full space-y-6">
						<FormView 
							{...logic}
							transactions={transactions}
							categories={categories}
							totalAmount={totalAmount}
							isIntegrating={logic.isIntegrating}
							isManageFieldsOpen={logic.isManageFieldsOpen}
							setIsManageFieldsOpen={logic.setIsManageFieldsOpen}
							onViewDetail={() => logic.setView("analytics")}
							onInputChange={logic.handleInputChange}
							onSubmit={logic.handleSubmit}
							onAddCategory={logic.handleAddCategory}
							onDeleteCategory={logic.handleDeleteCategory}
							onAddField={logic.handleAddField}
							onDeleteField={handleDeleteFieldTrigger}
							onRenameField={logic.handleUpdateField}
							onAddOption={logic.handleAddOptionToField}
							onDeleteOption={logic.handleDeleteOptionFromField}
							onGoogleLogin={logic.handleGoogleLogin}
							currentMonth={logic.selectedMonth || "..."}
							onDisconnect={() => setIsDisconnectModalOpen(true)}
							isDemoMode={isDemoMode}
							onLoginClick={onLoginClick}
							ocrLoading={ocrLoading}
							ocrMessage={ocrMessage}
							onOcrClick={() => setIsOcrPrivacyOpen(true)}
						/>
					</div>
				) : (
					<div key="analytics-container" className="max-w-5xl mx-auto w-full">
						<AnalyticsView 
							headers={logic.headers}
							transactions={transactions}
							availableMonths={logic.availableMonths}
							selectedMonth={logic.selectedMonth}
							loading={logic.loading}
							user={logic.user}
							supabaseUser={logic.supabaseUser}
							customFields={logic.customFields}
							customChartConfigs={logic.customChartConfigs}
							onBack={() => { logic.resetToCurrentMonth(); logic.setView("form"); }}
							onMonthChange={logic.handleMonthChange}
							onAddCustomChart={logic.handleAddCustomChart}
							onDeleteCustomChart={logic.handleDeleteCustomChart}
							onSetInitialBalance={logic.handleSetInitialBalance}
							onSyncPreviousBalance={logic.handleSyncPreviousBalance}
							onGoogleLogin={logic.handleGoogleLogin}
							formatCurrency={logic.formatCurrency}
							exportToCSV={logic.exportToCSV}
							exportToGoogleSheets={logic.exportToGoogleSheets}
						/>
					</div>
				)}
			</AnimatePresence>

			{/* Common Modals */}
			<StatusModal 
				state={logic.statusModal} 
				onClose={() => logic.setStatusModal(prev => ({ ...prev, isOpen: false }))} 
				onGoogleLogin={logic.handleGoogleLogin}
				onReportBug={onReportBug}
			/>

			{/* External Status Modal (for Bug Report Success) */}
			<StatusModal 
				state={{
					isOpen: externalStatusModal.isOpen,
					type: "success",
					title: externalStatusModal.title,
					description: externalStatusModal.desc
				}} 
				onClose={onExternalStatusClose} 
				onReportBug={onReportBug}
			/>

			<DisconnectModal 
				isOpen={isDisconnectModalOpen}
				onOpenChange={setIsDisconnectModalOpen}
				onConfirm={async () => {
					try {
						const { data: { session } } = await supabase.auth.getSession();
						if (session) {
							await supabase.from("google_connections").delete().eq("user_id", session.user.id);
						}
					} catch (e) {
						console.error("Error deleting connection from Supabase:", e);
					}
					// Clean Coder: Selective clear to keep onboarding & lang settings
					localStorage.removeItem("googleUser");
					localStorage.removeItem("sheetId");
					localStorage.removeItem("customFieldDefs");
					localStorage.removeItem("customChartConfigs");
					window.location.reload();
				}}
			/>

			<DeleteFieldModal 
				isOpen={deleteConfirm.isOpen}
				fieldName={deleteConfirm.fieldName}
				onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}
				onConfirm={async () => {
					logic.setDeleteConfirmIndex(deleteConfirm.index);
					await logic.handleDeleteField();
					setDeleteConfirm({ isOpen: false, fieldName: "", index: -1 });
				}}
			/>

			{/* Hidden OCR Inputs */}
			<input ref={ocrInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrScan} />
			<input ref={ocrGalleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrScan} />

			{/* OCR Privacy Choice Dialog */}
			<Dialog open={isOcrPrivacyOpen} onOpenChange={setIsOcrPrivacyOpen}>
				<DialogContent className="sm:max-w-[420px] rounded-3xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Camera size={20} className="text-emerald-500" />
							{language === "en" ? "Receipt Scan Privacy Policy" : "Kebijakan Privasi Pemindaian Struk"}
						</DialogTitle>
					</DialogHeader>
					<div className="py-4 space-y-4 text-sm text-zinc-550 dark:text-zinc-400 leading-relaxed text-left">
						<p>
							{language === "en" 
								? "To scan your receipt, the image will be sent to our AI-powered OCR service. The photo is processed instantly and is NOT stored on any server."
								: "Untuk memindai struk Anda, foto struk akan dikirim ke layanan OCR bertenaga AI kami. Foto diproses secara instan dan TIDAK disimpan di server mana pun."}
						</p>
						<p className="text-xs text-zinc-450 dark:text-zinc-500 font-medium">
							{language === "en"
								? "By continuing, you agree to this privacy policy."
								: "Dengan melanjutkan, Anda menyetujui kebijakan privasi ini."}
						</p>
					</div>
					<div className="flex flex-col gap-2 mt-2">
						<Button
							onClick={() => {
								setIsOcrPrivacyOpen(false);
								ocrInputRef.current?.click();
							}}
							disabled={ocrLoading}
							className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer border-none"
						>
							<Camera size={16} />
							{language === "en" ? "Take Photo (Camera)" : "Ambil Foto (Kamera)"}
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								setIsOcrPrivacyOpen(false);
								ocrGalleryInputRef.current?.click();
							}}
							disabled={ocrLoading}
							className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 cursor-pointer bg-transparent"
						>
							<svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
							{language === "en" ? "Choose from Gallery" : "Pilih dari Galeri"}
						</Button>
						<Button
							variant="ghost"
							onClick={() => setIsOcrPrivacyOpen(false)}
							className="w-full h-10 text-xs font-semibold text-zinc-400 hover:text-zinc-650 cursor-pointer"
						>
							{language === "en" ? "Cancel" : "Batal"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

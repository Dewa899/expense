"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { FormView } from "./dashboard/form-view";
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
	const router = useRouter();
	
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
	const ocrGalleryInputRef = React.useRef<HTMLInputElement>(null);
	const [ocrLoading, setOcrLoading] = React.useState(false);
	const [ocrMessage, setOcrMessage] = React.useState("");

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
			</AnimatePresence>			<div className="max-w-md mx-auto w-full space-y-6">
				<FormView 
					{...logic}
					transactions={transactions}
					categories={categories}
					totalAmount={totalAmount}
					isIntegrating={logic.isIntegrating}
					isManageFieldsOpen={logic.isManageFieldsOpen}
					setIsManageFieldsOpen={logic.setIsManageFieldsOpen}
					onViewDetail={() => {
						const carouselPockets = [
							{ id: "net_worth", name: "Total Worth" },
							...logic.pockets
						];
						const activePocket = carouselPockets[logic.activePocketIdx] || carouselPockets[0];
						router.push(`/detail?pocket=${encodeURIComponent(activePocket.name)}`);
					}}
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
					onOcrClick={() => ocrGalleryInputRef.current?.click()}
				/>
			</div>
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
			<input ref={ocrGalleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrScan} />
		</div>
	);
}

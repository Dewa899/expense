"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard-context";
import { FormView } from "./dashboard/form-view";
import { StatusModal } from "./dashboard/modals/status-modal";
import { DisconnectModal } from "./dashboard/modals/disconnect-modal";
import { DeleteFieldModal } from "./dashboard/modals/delete-field-modal";
import { OnboardingTutorial } from "./dashboard/onboarding-tutorial";
import { IntegrationLoading } from "./dashboard/integration-loading";
import { ToastNotification } from "./ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, FlaskConical, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { useDemo } from "@/components/demo-context";
import { supabase } from "@/lib/supabase-client";

/**
 * Extract a transaction amount from shared text (e.g. "Rp 125.000", "IDR 1,250,000.00", "Rp50.000,-").
 * Prefers numbers prefixed with Rp/IDR; falls back to the largest number with thousand separators.
 */
function parseSharedAmount(text: string): number | null {
	const toNumber = (raw: string) => {
		let v = raw.replace(/[\s,-]+$/g, "").trim();
		// Drop decimal part (",00" / ".00") when it is the last 1-2 digits after a separator
		v = v.replace(/[.,]\d{1,2}$/, "");
		const n = parseInt(v.replace(/[^\d]/g, ""), 10);
		return Number.isFinite(n) && n > 0 ? n : null;
	};
	const currencyMatches = [...text.matchAll(/(?:rp\.?|idr)\s*([\d.,]+)/gi)].map(m => toNumber(m[1])).filter((n): n is number => !!n);
	if (currencyMatches.length) return Math.max(...currencyMatches);
	const grouped = [...text.matchAll(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b/g)].map(m => toNumber(m[0])).filter((n): n is number => !!n);
	if (grouped.length) return Math.max(...grouped);
	return null;
}

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
	
	const logic = useDashboard();
	
	React.useEffect(() => {
		logic.resetToCurrentMonth();
	}, [logic.resetToCurrentMonth]);

	const isLoggedIn = !!logic.supabaseUser || !!logic.user;
	
	// In demo mode, overlay the in-memory data on top of the hook's state
	const transactions = isDemoMode ? demoTransactions : logic.transactions;
	const categories = isDemoMode ? [...demoCategories, ...logic.categories.filter(c => !demoCategories.includes(c))] : logic.categories;
	const totalAmount = isDemoMode
		? transactions.reduce((sum, t) => sum + t.amount, 0)
		: logic.totalAmount;
	
	// OCR States
	const ocrInputRef = React.useRef<HTMLInputElement>(null);
	const ocrGalleryInputRef = React.useRef<HTMLInputElement>(null);
	const [ocrLoading, setOcrLoading] = React.useState(false);
	const [ocrMessage, setOcrMessage] = React.useState("");
	const [isOcrPrivacyOpen, setIsOcrPrivacyOpen] = React.useState(false);

	const processOcrFile = React.useCallback(async (file: File | Blob, fileName = "receipt") => {
		setOcrLoading(true);
		setOcrMessage("");
		try {
			const formBody = new FormData();
			formBody.append("file", file, fileName);
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
			return true;
		} catch (err) {
			console.error("OCR Error:", err);
			setOcrMessage(t("ocrFailed"));
			return false;
		} finally {
			setOcrLoading(false);
		}
	}, [categories, logic.handleInputChange, t]);

	const handleOcrScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await processOcrFile(file, file.name);
		if (ocrInputRef.current) ocrInputRef.current.value = "";
		if (ocrGalleryInputRef.current) ocrGalleryInputRef.current.value = "";
	};

	// Web Share Target: receipt shared from bank / e-wallet apps (see public/sw.js)
	const shareHandledRef = React.useRef(false);
	React.useEffect(() => {
		if (shareHandledRef.current || typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		if (params.get("from") !== "share") return;
		shareHandledRef.current = true;

		const cleanUrl = () => window.history.replaceState(null, "", "/");

		(async () => {
			try {
				if (!("caches" in window)) {
					setOcrMessage(t("shareNoData"));
					return;
				}
				const cache = await caches.open("shared-receipts");
				const fileRes = await cache.match("/__shared/receipt");
				const textRes = await cache.match("/__shared/text");
				await cache.delete("/__shared/receipt");
				await cache.delete("/__shared/text");

				let sharedText: { title?: string; text?: string; url?: string } | null = null;
				if (textRes) {
					try { sharedText = await textRes.json(); } catch { sharedText = null; }
				}

				// Scroll the form into view so the user sees the pre-filled values
				window.scrollTo({ top: 0, behavior: "smooth" });

				if (fileRes) {
					const blob = await fileRes.blob();
					const rawName = fileRes.headers.get("x-file-name");
					const fileName = rawName ? decodeURIComponent(rawName) : "receipt";
					const ok = await processOcrFile(blob, fileName);
					if (ok) return;
				}

				if (sharedText && applySharedText(sharedText)) {
					setOcrMessage(t("ocrSuccess"));
					return;
				}

				if (!fileRes) setOcrMessage(t("shareNoData"));
			} catch (err) {
				console.error("Share target error:", err);
				setOcrMessage(t("ocrFailed"));
			} finally {
				cleanUrl();
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/** Parse amount / name from shared text. Returns true if something was filled. */
	const applySharedText = (shared: { title?: string; text?: string; url?: string }) => {
		const combined = [shared.title, shared.text].filter(Boolean).join("\n").trim();
		if (!combined) return false;
		let filled = false;

		const amount = parseSharedAmount(combined);
		if (amount) {
			logic.handleInputChange("Amount / Jumlah", String(amount));
			filled = true;
		}
		const firstLine = (shared.title || combined.split("\n")[0] || "").replace(/https?:\/\/\S+/g, "").trim();
		if (firstLine && firstLine.length <= 80) {
			logic.handleInputChange("Name / Nama", firstLine);
			filled = true;
		}
		if (filled) {
			logic.handleInputChange("Type / Tipe", "Pengeluaran / Expense");
		}
		return filled;
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
		<div className="flex flex-col px-4 pt-2 pb-[76px] gap-2.5 w-full flex-1 relative mx-auto transition-all duration-300 bg-transparent">
			<AnimatePresence>
				{logic.isIntegrating && (
					<IntegrationLoading 
						isOpen={logic.isIntegrating} 
						description={logic.statusModal.description}
						supabaseUser={logic.supabaseUser}
					/>
				)}
			</AnimatePresence>
			<div className="max-w-md mx-auto w-full space-y-3">
				<FormView 
					{...logic}
					transactions={transactions}
					categories={categories}
					totalAmount={totalAmount}
					isIntegrating={logic.isIntegrating}
					isManageFieldsOpen={logic.isManageFieldsOpen}
					setIsManageFieldsOpen={logic.setIsManageFieldsOpen}
					onMoveFunds={logic.handleMoveFunds}
					onViewDetail={() => {
						const carouselPockets = [
							{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo" },
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
					onOcrClick={() => setIsOcrPrivacyOpen(true)}
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
					localStorage.removeItem("customPockets");
					localStorage.removeItem("customCategories");
					localStorage.removeItem("recurringTemplates");
					window.location.reload();
				}}
			/>

			<DeleteFieldModal 
				isOpen={deleteConfirm.isOpen}
				fieldName={deleteConfirm.fieldName}
				onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}
				onConfirm={async () => {
					logic.setDeleteConfirmIndex(deleteConfirm.index);
					await logic.handleDeleteField(deleteConfirm.index);
					setDeleteConfirm({ isOpen: false, fieldName: "", index: -1 });
				}}
			/>

			{/* Hidden OCR Inputs */}
			<input ref={ocrInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrScan} />
			<input ref={ocrGalleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrScan} />

			{/* Simplified OCR Choice Dialog */}
			<Dialog open={isOcrPrivacyOpen} onOpenChange={setIsOcrPrivacyOpen}>
				<DialogContent className="sm:max-w-[400px] rounded-3xl p-6 duration-200 data-open:slide-in-from-top-12 data-open:zoom-in-100 data-closed:slide-out-to-top-12 data-closed:zoom-out-100">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-black text-left">
							<Camera size={20} className="text-emerald-500" />
							{language === "en" ? "Scan Receipt" : "Scan Struk Belanja"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-2 gap-3 mt-4">
						<button
							onClick={() => {
								setIsOcrPrivacyOpen(false);
								ocrInputRef.current?.click();
							}}
							disabled={ocrLoading}
							className="flex flex-col items-center justify-center gap-2 h-28 w-full p-4 bg-gradient-to-br from-emerald-500 to-teal-500 hover:opacity-95 text-black rounded-2xl border-none shadow-md cursor-pointer transition-all active:scale-[0.97]"
						>
							<Camera size={28} className="shrink-0" />
							<span className="text-[10px] font-black uppercase tracking-wider text-center">
								{language === "en" ? "Camera" : "Kamera"}
							</span>
						</button>
						<button
							onClick={() => {
								setIsOcrPrivacyOpen(false);
								ocrGalleryInputRef.current?.click();
							}}
							disabled={ocrLoading}
							className="flex flex-col items-center justify-center gap-2 h-28 w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/30 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer active:scale-[0.97] text-zinc-800 dark:text-zinc-200"
						>
							<svg className="w-7 h-7 text-emerald-650 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
							<span className="text-[10px] font-black uppercase tracking-wider text-center">
								{language === "en" ? "Gallery" : "Galeri"}
							</span>
						</button>
					</div>
					<Button
						variant="ghost"
						onClick={() => setIsOcrPrivacyOpen(false)}
						className="w-full h-10 text-xs font-semibold text-zinc-400 hover:text-zinc-650 cursor-pointer mt-3"
					>
						{language === "en" ? "Cancel" : "Batal"}
					</Button>
				</DialogContent>
			</Dialog>
			<ToastNotification toast={logic.toastState} onClose={logic.hideToast} />
		</div>
	);
}

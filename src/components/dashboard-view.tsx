"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { FormView } from "./dashboard/form-view";
import { AnalyticsView } from "./dashboard/analytics-view";
import { StatusModal } from "./dashboard/status-modal";
import { DisconnectModal } from "./dashboard/disconnect-modal";
import { DeleteFieldModal } from "./dashboard/delete-field-modal";
import { OnboardingTutorial } from "./dashboard/onboarding-tutorial";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";

interface DashboardViewProps {
	isTutorialOpen?: boolean;
	onTutorialClose?: () => void;
	externalStatusModal?: { isOpen: boolean; title: string; desc: string };
	onExternalStatusClose?: () => void;
}

export function DashboardView({ 
	isTutorialOpen = false, 
	onTutorialClose = () => {},
	externalStatusModal = { isOpen: false, title: "", desc: "" },
	onExternalStatusClose = () => {}
}: DashboardViewProps) {
	const { t } = useLanguage();
	const logic = useDashboardLogic();
	
	// UI States for Modals
	const [isDisconnectModalOpen, setIsDisconnectModalOpen] = React.useState(false);
	const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; fieldName: string; index: number }>({ 
		isOpen: false, fieldName: "", index: -1 
	});

	const handleDeleteFieldTrigger = (idx: number, name: string) => {
		setDeleteConfirm({ isOpen: true, fieldName: name, index: idx });
	};

	return (
		<div className="flex flex-col p-4 gap-6 w-full min-h-screen relative mx-auto transition-all duration-500">
			<AnimatePresence mode="wait">
				{logic.view === "form" ? (
					<div key="form-container" className="max-w-md mx-auto w-full space-y-6">
						<FormView 
							{...logic}
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
						/>

						{/* OCR Placeholder Section moved inside the same width container */}
						<section className="pb-10">
							<Button variant="outline" disabled className="w-full h-16 rounded-2xl border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center justify-center gap-3 opacity-60">
								<div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
									<Camera size={20} className="text-zinc-500" />
								</div>
								<div className="text-left">
									<p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Scan Receipt</p>
									<p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">{t("ocrComingSoon")}</p>
								</div>
							</Button>
						</section>
					</div>
				) : (
					<div key="analytics-container" className="max-w-5xl mx-auto w-full">
						<AnalyticsView 
							headers={logic.headers}
							transactions={logic.transactions}
							availableMonths={logic.availableMonths}
							selectedMonth={logic.selectedMonth}
							loading={logic.loading}
							customFields={logic.customFields}
							customChartConfigs={logic.customChartConfigs}
							onBack={() => logic.setView("form")}
							onMonthChange={logic.handleMonthChange}
							onAddCustomChart={logic.handleAddCustomChart}
							onDeleteCustomChart={logic.handleDeleteCustomChart}
							onSetInitialBalance={logic.handleSetInitialBalance}
							formatCurrency={logic.formatCurrency}
							/>					</div>
				)}
			</AnimatePresence>

			{/* Common Modals */}
			<StatusModal 
				state={logic.statusModal} 
				onClose={() => logic.setStatusModal(prev => ({ ...prev, isOpen: false }))} 
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
			/>

			<DisconnectModal 
				isOpen={isDisconnectModalOpen}
				onOpenChange={setIsDisconnectModalOpen}
				onConfirm={() => {
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

			<OnboardingTutorial 
				isOpen={isTutorialOpen} 
				onClose={onTutorialClose} 
				isSynced={!!logic.user}
				onGoogleLogin={logic.handleGoogleLogin}
			/>
		</div>
	);
}

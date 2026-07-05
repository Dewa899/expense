"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { AppLayoutWrapper } from "@/components/app-layout-wrapper";
import { useDemo } from "@/components/demo-context";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

function DetailPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { language } = useLanguage();
	const initialPocketParam = searchParams.get("pocket") || "";

	const { isDemoMode, demoTransactions, demoCategories, addDemoTransaction } = useDemo();

	const logic = useDashboardLogic(
		isDemoMode
			? { isDemoMode: true, demoTransactions, addDemoTransaction }
			: {}
	);

	const transactions = isDemoMode ? demoTransactions : logic.transactions;

	const hasInitializedRef = React.useRef(false);

	// 1. Sync dari URL query parameter ke state saku saat mount
	React.useEffect(() => {
		if (!hasInitializedRef.current && logic.pockets.length > 0) {
			if (!initialPocketParam) {
				hasInitializedRef.current = true;
				return;
			}
			const matchedIdx = logic.pockets.findIndex(
				p => p.name.toLowerCase() === initialPocketParam.toLowerCase()
			);
			const isNetWorthParam = [
				"total worth", "total kekayaan", "total net worth", "total balance", "total saldo"
			].includes(initialPocketParam.toLowerCase());

			if (isNetWorthParam) {
				if (logic.activePocketIdx !== 0) {
					logic.setActivePocketIdx(0);
				}
				hasInitializedRef.current = true;
			} else if (matchedIdx !== -1) {
				const finalIdx = matchedIdx + 1;
				if (logic.activePocketIdx !== finalIdx) {
					logic.setActivePocketIdx(finalIdx);
				}
				hasInitializedRef.current = true;
			} else {
				hasInitializedRef.current = true;
			}
		}
	}, [initialPocketParam, logic.pockets, logic.activePocketIdx, logic.setActivePocketIdx]);

	// 2. Sync state saku balik ke URL query parameter saat berganti saku secara manual
	React.useEffect(() => {
		if (hasInitializedRef.current && logic.pockets.length > 0) {
			const carouselPockets = [
				{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo" },
				...logic.pockets
			];
			const activePocket = carouselPockets[logic.activePocketIdx] || carouselPockets[0];
			const currentParam = searchParams.get("pocket") || "";
			if (activePocket.name.toLowerCase() !== currentParam.toLowerCase()) {
				const newParams = new URLSearchParams(searchParams.toString());
				newParams.set("pocket", activePocket.name);
				router.replace(`/detail?${newParams.toString()}`);
			}
		}
	}, [logic.activePocketIdx, logic.pockets, router, searchParams]);

	return (
		<div className="max-w-5xl mx-auto w-full p-4">
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
				onBack={() => router.push("/")}
				onMonthChange={logic.handleMonthChange}
				onAddCustomChart={logic.handleAddCustomChart}
				onDeleteCustomChart={logic.handleDeleteCustomChart}
				onSetInitialBalance={logic.handleSetInitialBalance}
				onSyncPreviousBalance={logic.handleSyncPreviousBalance}
				onGoogleLogin={logic.handleGoogleLogin}
				formatCurrency={logic.formatCurrency}
				exportToCSV={logic.exportToCSV}
				exportToGoogleSheets={logic.exportToGoogleSheets}
				
				pockets={logic.pockets}
				activePocketIdx={logic.activePocketIdx}
				setActivePocketIdx={logic.setActivePocketIdx}
				getPocketBalance={logic.getPocketBalance}
				handleUpdatePockets={logic.handleUpdatePockets}
				setStatusModal={logic.setStatusModal}
				onMoveFunds={logic.handleMoveFunds}
			/>
		</div>
	);
}

export default function DetailPage() {
	return (
		<AppLayoutWrapper>
			<React.Suspense fallback={
				<div className="h-screen flex flex-col items-center justify-center text-zinc-400 gap-4 bg-zinc-550/5">
					<Loader2 className="animate-spin text-emerald-500" size={32} />
					<p className="font-bold uppercase tracking-widest text-[10px]">Loading detail dashboard...</p>
				</div>
			}>
				<DetailPageContent />
			</React.Suspense>
		</AppLayoutWrapper>
	);
}

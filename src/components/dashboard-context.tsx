"use client";

import * as React from "react";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { useDemo } from "@/components/demo-context";

type DashboardContextType = ReturnType<typeof useDashboardLogic>;

const DashboardContext = React.createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
	const { isDemoMode, demoTransactions, addDemoTransaction } = useDemo();
	
	const logic = useDashboardLogic(
		isDemoMode
			? { isDemoMode: true, demoTransactions, addDemoTransaction }
			: {}
	);

	return (
		<DashboardContext.Provider value={logic}>
			{children}
		</DashboardContext.Provider>
	);
}

export function useDashboard() {
	const context = React.useContext(DashboardContext);
	if (!context) {
		throw new Error("useDashboard must be used within a DashboardProvider");
	}
	return context;
}

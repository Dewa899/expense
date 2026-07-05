"use client";

import * as React from "react";
import { Transaction } from "@/hooks/use-dashboard-logic";

// ─── Demo Seed Data ────────────────────────────────────────────────────────────

const DEMO_CATEGORIES = [
	"Makanan & Minuman",
	"Transportasi",
	"Hiburan",
	"Belanja",
	"Kesehatan",
	"Lainnya",
];

const DEMO_TRANSACTIONS: Transaction[] = [
	{
		date: new Date(Date.now() - 1 * 864e5).toLocaleString(),
		name: "Kopi & Sarapan",
		amount: -35000,
		type: "Pengeluaran / Expense",
		category: "Makanan & Minuman",
		note: "Warung Bu Sari",
		pocket: "Jajan",
		raw: [],
	},
	{
		date: new Date(Date.now() - 2 * 864e5).toLocaleString(),
		name: "Gaji Bulan Ini",
		amount: 8500000,
		type: "Pemasukan / Income",
		category: "Lainnya",
		note: "Transfer dari kantor",
		pocket: "",
		raw: [],
	},
	{
		date: new Date(Date.now() - 3 * 864e5).toLocaleString(),
		name: "Ojek Online",
		amount: -22000,
		type: "Pengeluaran / Expense",
		category: "Transportasi",
		note: "",
		pocket: "",
		raw: [],
	},
	{
		date: new Date(Date.now() - 4 * 864e5).toLocaleString(),
		name: "Beli Baju",
		amount: -185000,
		type: "Pengeluaran / Expense",
		category: "Belanja",
		note: "Diskon 20%",
		pocket: "",
		raw: [],
	},
	{
		date: new Date(Date.now() - 5 * 864e5).toLocaleString(),
		name: "Bioskop",
		amount: -60000,
		type: "Pengeluaran / Expense",
		category: "Hiburan",
		note: "Nonton bareng teman",
		pocket: "Jajan",
		raw: [],
	},
];

// ─── Context ──────────────────────────────────────────────────────────────────

type DemoContextType = {
	isDemoMode: boolean;
	demoTransactions: Transaction[];
	demoCategories: string[];
	enterDemo: () => void;
	exitDemo: () => void;
	addDemoTransaction: (tx: Transaction) => void;
};

const DemoContext = React.createContext<DemoContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoProvider({ children }: { children: React.ReactNode }) {
	const [isDemoMode, setIsDemoMode] = React.useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("is_demo_mode") === "true";
		}
		return false;
	});
	const [demoTransactions, setDemoTransactions] = React.useState<Transaction[]>(() => {
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("demo_transactions");
			if (stored) {
				try {
					return JSON.parse(stored);
				} catch (e) {
					console.error("Failed to parse demo transactions", e);
				}
			}
		}
		return [];
	});

	React.useEffect(() => {
		const isDemo = localStorage.getItem("is_demo_mode") === "true";
		if (isDemo && demoTransactions.length === 0) {
			const storedTxs = localStorage.getItem("demo_transactions");
			if (storedTxs) {
				try {
					setDemoTransactions(JSON.parse(storedTxs));
				} catch (e) {
					setDemoTransactions([...DEMO_TRANSACTIONS]);
				}
			} else {
				setDemoTransactions([...DEMO_TRANSACTIONS]);
				localStorage.setItem("demo_transactions", JSON.stringify(DEMO_TRANSACTIONS));
			}
		}
	}, [demoTransactions.length]);

	const enterDemo = React.useCallback(() => {
		setDemoTransactions([...DEMO_TRANSACTIONS]);
		setIsDemoMode(true);
		localStorage.setItem("is_demo_mode", "true");
		localStorage.setItem("demo_transactions", JSON.stringify(DEMO_TRANSACTIONS));
	}, []);

	const exitDemo = React.useCallback(() => {
		setIsDemoMode(false);
		setDemoTransactions([]);
		localStorage.removeItem("is_demo_mode");
		localStorage.removeItem("demo_transactions");
		localStorage.removeItem("demo_pockets");
		localStorage.removeItem("demo_customChartConfigs");
		window.location.href = "/";
	}, []);

	const addDemoTransaction = React.useCallback((tx: Transaction) => {
		setDemoTransactions((prev) => {
			const next = [tx, ...prev];
			localStorage.setItem("demo_transactions", JSON.stringify(next));
			return next;
		});
	}, []);

	return (
		<DemoContext.Provider
			value={{
				isDemoMode,
				demoTransactions,
				demoCategories: DEMO_CATEGORIES,
				enterDemo,
				exitDemo,
				addDemoTransaction,
			}}
		>
			{children}
		</DemoContext.Provider>
	);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDemo(): DemoContextType {
	const ctx = React.useContext(DemoContext);
	if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
	return ctx;
}

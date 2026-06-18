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
		raw: [],
	},
	{
		date: new Date(Date.now() - 2 * 864e5).toLocaleString(),
		name: "Gaji Bulan Ini",
		amount: 8500000,
		type: "Pemasukan / Income",
		category: "Lainnya",
		note: "Transfer dari kantor",
		raw: [],
	},
	{
		date: new Date(Date.now() - 3 * 864e5).toLocaleString(),
		name: "Ojek Online",
		amount: -22000,
		type: "Pengeluaran / Expense",
		category: "Transportasi",
		note: "",
		raw: [],
	},
	{
		date: new Date(Date.now() - 4 * 864e5).toLocaleString(),
		name: "Beli Baju",
		amount: -185000,
		type: "Pengeluaran / Expense",
		category: "Belanja",
		note: "Diskon 20%",
		raw: [],
	},
	{
		date: new Date(Date.now() - 5 * 864e5).toLocaleString(),
		name: "Bioskop",
		amount: -60000,
		type: "Pengeluaran / Expense",
		category: "Hiburan",
		note: "Nonton bareng teman",
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
	const [isDemoMode, setIsDemoMode] = React.useState(false);
	const [demoTransactions, setDemoTransactions] = React.useState<Transaction[]>([]);

	const enterDemo = React.useCallback(() => {
		setDemoTransactions([...DEMO_TRANSACTIONS]);
		setIsDemoMode(true);
	}, []);

	const exitDemo = React.useCallback(() => {
		setIsDemoMode(false);
		setDemoTransactions([]);
	}, []);

	const addDemoTransaction = React.useCallback((tx: Transaction) => {
		setDemoTransactions((prev) => [tx, ...prev]);
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

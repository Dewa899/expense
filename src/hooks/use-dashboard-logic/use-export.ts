import * as React from "react";
import { CORE_HEADERS_DUAL } from "@/lib/sheets-api";
import { supabase } from "@/lib/supabase-client";
import { Transaction, CustomFieldDef, StatusModalState } from "./types";

interface UseExportOptions {
	transactions: Transaction[];
	customFields: CustomFieldDef[];
	headers: string[];
	isGoogleConnected: boolean;
	handleGoogleLogin: () => void;
	setLoading: React.Dispatch<React.SetStateAction<boolean>>;
	setStatusModal: React.Dispatch<React.SetStateAction<StatusModalState>>;
	t: (key: string) => string;
}

export function useExport({
	transactions,
	customFields,
	headers,
	isGoogleConnected,
	handleGoogleLogin,
	setLoading,
	setStatusModal,
	t
}: UseExportOptions) {
	const exportToCSV = () => {
		if (transactions.length === 0) {
			alert(t("noTransactions") || "No transactions to export");
			return;
		}

		const customFieldNames = customFields.map(f => f.name);
		const headersRow = [...CORE_HEADERS_DUAL, ...customFieldNames];
		const csvRows = [headersRow.join(",")];

		transactions.forEach(t => {
			const isExpense = t.type === "expense" || t.type.toLowerCase().includes("expense") || t.type.toLowerCase().includes("pengeluaran");
			const amountVal = isExpense ? -Math.abs(t.amount) : Math.abs(t.amount);
			const row = [
				`"${t.date}"`,
				`"${t.name.replace(/"/g, '""')}"`,
				amountVal,
				`"${t.type}"`,
				`"${t.category}"`,
				`"${(t.note || "").replace(/"/g, '""')}"`,
				...customFieldNames.map(name => {
					let val = "";
					if (t.raw) {
						if (Array.isArray(t.raw)) {
							const fieldIdx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
							val = fieldIdx !== -1 ? t.raw[fieldIdx] || "" : "";
						} else if (typeof t.raw === "object") {
							const key = Object.keys(t.raw).find(k => k.toLowerCase() === name.toLowerCase());
							val = key ? t.raw[key] || "" : "";
						}
					}
					return `"${val.toString().replace(/"/g, '""')}"`;
				})
			];
			csvRows.push(row.join(","));
		});

		const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement("a");
		link.setAttribute("href", encodedUri);
		link.setAttribute("download", `expenses_${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const exportToGoogleSheets = async () => {
		const sessionRes = await supabase.auth.getSession();
		const session = sessionRes.data.session;
		if (!session) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: "Export Failed",
				description: "Please log in first."
			});
			return;
		}

		if (!isGoogleConnected) {
			handleGoogleLogin();
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/export/sheets", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.access_token}`
				}
			});
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Failed to export data to Google Sheets");
			}

			setStatusModal({
				isOpen: true,
				type: "success",
				title: "Export Success",
				description: "Data exported successfully to your Google Sheet: 'Expense Export by GENLORD'!"
			});
		} catch (error: any) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: "Export Failed",
				description: error.message || "An error occurred during export."
			});
		} finally {
			setLoading(false);
		}
	};

	return {
		exportToCSV,
		exportToGoogleSheets
	};
}

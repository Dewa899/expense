"use client";

import * as React from "react";
import { useLanguage } from "@/components/language-provider";
import { stripRupiah } from "@/components/dashboard/numeric-keyboard";
import { supabase } from "@/lib/supabase-client";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

let isGlobalIntegrating = false;
let globalIntegrationToken = "";
let globalIntegrationResult: "success" | "error" | null = null;
let globalIntegrationError = "";
let globalInitPromise: Promise<any> | null = null;

export type CustomFieldDef = {
	name: string;
	type: "text" | "dropdown";
	required: boolean;
	options?: string[];
};

export type CustomChartConfig = {
	fieldName: string;
	type: "income" | "expense";
};

export type Transaction = {
	id?: string;
	date: string;
	name: string;
	amount: number;
	type: string;
	category: string;
	note: string;
	raw: any; // Original row data for custom fields access
};

export type StatusModalState = {
	isOpen: boolean;
	type: "success" | "error" | null;
	title: string;
	description: string;
};

interface DashboardLogicOptions {
	isDemoMode?: boolean;
	demoTransactions?: Transaction[];
	addDemoTransaction?: (tx: Transaction) => void;
}

export function useDashboardLogic(options: DashboardLogicOptions = {}) {
	const { isDemoMode = false, demoTransactions = [], addDemoTransaction } = options;
	const { t } = useLanguage();
	const [view, setView] = React.useState<"form" | "analytics">("form");
	const [headers, setHeaders] = React.useState<string[]>([]);
	const [categories, setCategories] = React.useState<string[]>([]);
	const [customFields, setCustomFields] = React.useState<CustomFieldDef[]>([]);
	const [customChartConfigs, setCustomChartConfigs] = React.useState<CustomChartConfig[]>([]);
	const [transactions, setTransactions] = React.useState<Transaction[]>([]);
	const [allTransactions, setAllTransactions] = React.useState<any[]>([]);
	const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);
	const [selectedMonth, setSelectedMonth] = React.useState<string>("");
	const [newCategoryInput, setNewCategoryInput] = React.useState("");
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [loading, setLoading] = React.useState(false);
	const [isIntegrating, setIsIntegrating] = React.useState(false);
	const [totalAmount, setTotalAmount] = React.useState(0);
	const [user, setUser] = React.useState<{ name: string; accessToken: string; } | null>(null);
	const [config, setConfig] = React.useState({ sheetId: "" });
	const [supabaseUser, setSupabaseUser] = React.useState<any>(null);
	const [isGoogleConnected, setIsGoogleConnected] = React.useState(false);
	const [googleEmail, setGoogleEmail] = React.useState("");

	// UI Component States
	const [isManageFieldsOpen, setIsManageFieldsOpen] = React.useState(false);
	const [newFieldName, setNewFieldName] = React.useState("");
	const [newFieldType, setNewFieldType] = React.useState<"text" | "dropdown">("text");
	const [newFieldRequired, setNewFieldRequired] = React.useState(true);
	const [newOptionInput, setNewOptionInput] = React.useState("");
	const [deleteConfirmIndex, setDeleteConfirmIndex] = React.useState<number>(-1);

	const [statusModal, setStatusModal] = React.useState<StatusModalState>({
		isOpen: false, type: null, title: "", description: "",
	});

	const fetchSupabaseUserData = async (userId: string) => {
		try {
			setLoading(true);
			const { data: settings } = await supabase
				.from("user_settings")
				.select("*")
				.eq("user_id", userId)
				.single();
				
			let fields: CustomFieldDef[] = [];
			if (settings) {
				if (settings.custom_categories) setCategories(settings.custom_categories);
				if (settings.custom_field_defs) {
					setCustomFields(settings.custom_field_defs);
					fields = settings.custom_field_defs;
				}
				if (settings.custom_chart_configs) setCustomChartConfigs(settings.custom_chart_configs);
			}
			setHeaders([...CORE_HEADERS_DUAL, ...fields.map((f: any) => f.name)]);

			const { data: txs } = await supabase
				.from("transactions")
				.select("*")
				.eq("user_id", userId)
				.order("date", { ascending: false });

			let currentMonthTxs = txs || [];
			const currentMonthName = getCurrentMonthSheetName();
			const firstDayOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

			// Find if there is already an Initial Balance for the current month
			const hasCurrentMonthInitialBalance = currentMonthTxs.some(t => {
				const isInitialBalance = t.category === "Initial Balance";
				return isInitialBalance && new Date(t.date) >= firstDayOfCurrentMonth;
			});

			const hasPastTransactions = currentMonthTxs.some(t => new Date(t.date) < firstDayOfCurrentMonth);

			if (!hasCurrentMonthInitialBalance && hasPastTransactions) {
				console.log("Auto-carrying forward balance from previous months...");
				let carryForwardBalance = 0;
				currentMonthTxs.forEach(t => {
					if (new Date(t.date) < firstDayOfCurrentMonth) {
						const isExpense = t.type === "expense" || t.type.toLowerCase().includes("expense") || t.type.toLowerCase().includes("pengeluaran");
						carryForwardBalance += isExpense ? -Math.abs(t.amount) : Math.abs(t.amount);
					}
				});

				const prevMonthName = getPreviousMonthName(currentMonthName);

				const { error: insertError } = await supabase.from("transactions").insert({
					user_id: userId,
					date: new Date().toISOString(),
					name: `${t("initialBalance")} (${prevMonthName})`,
					amount: Math.abs(carryForwardBalance),
					type: carryForwardBalance >= 0 ? "income" : "expense",
					category: "Initial Balance",
					note: t("fromPreviousMonth")
				});

				if (!insertError) {
					const { data: updatedTxs } = await supabase
						.from("transactions")
						.select("*")
						.eq("user_id", userId)
						.order("date", { ascending: false });

					if (updatedTxs) {
						currentMonthTxs = updatedTxs;
					}
				}
			}

			if (currentMonthTxs.length > 0) {
				const parsedTxs = currentMonthTxs.map(t => {
					const isExpense = t.type === "expense" || t.type.toLowerCase().includes("expense") || t.type.toLowerCase().includes("pengeluaran");
					return {
						id: t.id,
						date: new Date(t.date).toLocaleString(),
						rawDate: t.date,
						name: t.name,
						amount: isExpense ? -Math.abs(t.amount) : Math.abs(t.amount),
						type: t.type === "expense" ? "Pengeluaran / Expense" : "Pemasukan / Income",
						category: t.category,
						note: t.note || "",
						raw: t.custom_fields || {}
					};
				});
				setAllTransactions(parsedTxs);

				const dates = currentMonthTxs.map(t => new Date(t.date).toLocaleString("id-ID", { month: "long", year: "numeric" }));
				const uniqueMonths = Array.from(new Set(dates));
				const current = getCurrentMonthSheetName();
				if (!uniqueMonths.includes(current)) {
					uniqueMonths.push(current);
				}
				setAvailableMonths(uniqueMonths);
				setSelectedMonth(current);
			} else {
				setAllTransactions([]);
				setAvailableMonths([getCurrentMonthSheetName()]);
				setSelectedMonth(getCurrentMonthSheetName());
			}
		} catch (e) {
			console.error("Error loading user data from Supabase:", e);
		} finally {
			setLoading(false);
		}
	};

	const checkGoogleConnectionStatus = async (sessionToken: string) => {
		try {
			const response = await fetch("/api/auth/google/token", {
				headers: { Authorization: `Bearer ${sessionToken}` }
			});
			if (response.ok) {
				const data = await response.json();
				if (data.connected) {
					setIsGoogleConnected(true);
					setGoogleEmail(data.googleEmail);
					setUser({ name: data.googleEmail, accessToken: data.accessToken });
					setConfig({ sheetId: data.sheetId });
				} else {
					setIsGoogleConnected(false);
					setGoogleEmail("");
					setUser(null);
					setConfig({ sheetId: "" });
				}
			} else {
				setIsGoogleConnected(false);
				setGoogleEmail("");
				setUser(null);
				setConfig({ sheetId: "" });
			}
		} catch (e) {
			console.error("Error checking Google Connection status:", e);
		}
	};

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
		const session = (await supabase.auth.getSession()).data.session;
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

	const CORE_FIELDS_COUNT = 6;
	const CORE_HEADERS_DUAL = ["Date / Tanggal", "Name / Nama", "Amount / Jumlah", "Type / Tipe", "Category / Kategori", "Note / Catatan"];

	const getCurrentMonthSheetName = () => {
		return new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });
	};

	const getPreviousMonthName = (currentMonthName: string) => {
		const [month, year] = currentMonthName.split(' ');
		const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
		let monthIdx = months.indexOf(month);
		let prevYear = parseInt(year);
		
		if (monthIdx === 0) {
			monthIdx = 11;
			prevYear -= 1;
		} else {
			monthIdx -= 1;
		}
		
		return `${months[monthIdx]} ${prevYear}`;
	};

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("id-ID", { 
			style: "currency", currency: "IDR", minimumFractionDigits: 0 
		}).format(val).replace("Rp", "Rp ");
	};

	const cleanNumber = (val: any): number => {
		if (typeof val === "number") return Math.abs(val);
		if (!val) return 0;
		const cleaned = val.toString()
			.replace(/Rp/g, "")
			.replace(/\s/g, "")
			.replace(/\./g, "")
			.replace(/,/g, ".");
		
		const tokens = cleaned.match(/(\d+(?:\.\d+)?|[+-])/g);
		if (!tokens) return 0;

		let result = 0;
		let currentOp = "+";

		for (const token of tokens) {
			if (token === "+" || token === "-") {
				currentOp = token;
			} else {
				const num = parseFloat(token) || 0;
				if (currentOp === "+") {
					result += num;
				} else if (currentOp === "-") {
					result -= num;
				}
			}
		}
		return Math.abs(result);
	};

	const fetchSheetData = async (sheetId: string, token: string, sheetName: string) => {
		if (!sheetId || !token) return;
		console.log("Fetching sheet data for:", sheetName);
		try {
			setLoading(true);
			const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:H`, { headers: { Authorization: `Bearer ${token}` } });
			const data = await response.json();
			if (response.status === 401 || data.error?.code === 401) {
				handleAuthError();
				return;
			}
			if (data.values && data.values.length > 0) {
				const fetchedHeaders = data.values[0].slice(0, 8);
				setHeaders(fetchedHeaders);

				const amountIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount"));
				const dateIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("tanggal") || h.toLowerCase().includes("date"));
				const nameIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("nama") || h.toLowerCase().includes("name"));
				const typeIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type"));
				const catIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category"));
				const noteIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("catatan") || h.toLowerCase().includes("note"));

				const rowData = data.values.slice(1).map((row: any) => {
					const rawAmount = cleanNumber(row[amountIdx]);
					const type = row[typeIdx] || "";
					const isExpense = type.toLowerCase().includes("expense") || type.toLowerCase().includes("pengeluaran") || type.toLowerCase().includes("out");
					return {
						date: row[dateIdx] || "",
						name: row[nameIdx] || "",
						amount: isExpense ? -rawAmount : rawAmount,
						type: type,
						category: row[catIdx] || "",
						note: row[noteIdx] || "",
						raw: row
					};
				});
				
				setTransactions(rowData);
				setTotalAmount(rowData.reduce((sum: number, t: any) => sum + t.amount, 0));

				// Auto-discover unique categories from the Google Sheet and sync them locally
				const sheetCategories = Array.from(new Set(rowData.map((t: any) => t.category).filter(Boolean)));
				setCategories(prev => {
					const updated = [...prev];
					let hasNew = false;
					sheetCategories.forEach((cat: any) => {
						if (!updated.includes(cat)) {
							updated.push(cat);
							hasNew = true;
						}
					});
					if (hasNew) {
						localStorage.setItem("customCategories", JSON.stringify(updated));
					}
					return updated;
				});

				const savedFieldsStr = localStorage.getItem("customFieldDefs");
				const savedFields: CustomFieldDef[] = savedFieldsStr ? JSON.parse(savedFieldsStr) : [];
				const discoveredFields: CustomFieldDef[] = [];
				fetchedHeaders.forEach((h: string) => {
					if (!CORE_HEADERS_DUAL.includes(h)) {
						const existing = savedFields.find(f => f.name.toLowerCase() === h.toLowerCase());
						if (existing) discoveredFields.push(existing);
						else discoveredFields.push({ name: h, type: "text", required: true });
					}
				});
				setCustomFields(discoveredFields);
				localStorage.setItem("customFieldDefs", JSON.stringify(discoveredFields));
			} else { 
				setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
				setTotalAmount(0); 
				setTransactions([]); 
			}
		} catch (error) { 
			console.error("Fetch Error:", error);
			setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
		} finally { 
			setLoading(false); 
		}
	};

	const setupGoogleSheet = async (token: string) => {
		// We set isIntegrating elsewhere too, but let's be sure
		setIsIntegrating(true);
		setLoading(true);
		
		console.log("Starting Google Sheet Setup...");
		
		try {
			setStatusModal(prev => ({ ...prev, description: "Connecting to Google Drive..." }));
			const folderSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='expense by genlord' and mimeType='application/vnd.google-apps.folder' and trashed=false`, { headers: { Authorization: `Bearer ${token}` } });
			const folderSearchData = await folderSearchRes.json();
			let folderId = folderSearchData.files?.[0]?.id;
			
			if (!folderId) {
				console.log("Creating folder...");
				setStatusModal(prev => ({ ...prev, description: "Creating application folder..." }));
				const folderCreateRes = await fetch("https://www.googleapis.com/drive/v3/files", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ name: "expense by genlord", mimeType: "application/vnd.google-apps.folder" }),
				});
				const folderData = await folderCreateRes.json();
				folderId = folderData.id;
			}

			setStatusModal(prev => ({ ...prev, description: "Preparing your Expense Tracker..." }));
			const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='Expense Tracker' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`, { headers: { Authorization: `Bearer ${token}` } });
			const searchData = await searchRes.json();
			let spreadsheetId = searchData.files?.[0]?.id;
			
			if (!spreadsheetId) {
				console.log("Creating spreadsheet...");
				setStatusModal(prev => ({ ...prev, description: "Creating new Google Sheet..." }));
				const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ name: "Expense Tracker", mimeType: "application/vnd.google-apps.spreadsheet", parents: [folderId] }),
				});
				const createData = await createRes.json();
				spreadsheetId = createData.id;
			}

			const sheetName = getCurrentMonthSheetName();
			setStatusModal(prev => ({ ...prev, description: `Setting up sheet: ${sheetName}...` }));
			const internalSheetId = await ensureAndGetSheetId(spreadsheetId, sheetName, token);

			// Fetch user info from Google Drive API about endpoint
			let userName = "Google User";
			let userEmail = "";
			try {
				const aboutRes = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)", {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (aboutRes.ok) {
					const aboutData = await aboutRes.json();
					if (aboutData.user) {
						userName = aboutData.user.displayName || "Google User";
						userEmail = aboutData.user.emailAddress || "";
					}
				}
			} catch (err) {
				console.error("Error fetching user profile:", err);
			}

			// PERSIST
			localStorage.setItem("sheetId", spreadsheetId);
			const newUser = { name: userName, email: userEmail, accessToken: token };
			localStorage.setItem("googleUser", JSON.stringify(newUser));
			
			// UPDATE STATE
			console.log("Setup complete, updating states...");
			setUser(newUser);
			setConfig({ sheetId: spreadsheetId });
			setSelectedMonth(sheetName);
			
			// FETCH DATA BEFORE CLOSING LOADING
			await fetchSheetData(spreadsheetId, token, sheetName);
			await fetchAvailableMonths(spreadsheetId, token);

			setStatusModal({ 
				isOpen: true, 
				type: "success", 
				title: t("syncSuccessTitle"), 
				description: t("syncSuccessDesc") 
			});
			globalIntegrationResult = "success";
			console.log("Integration sequence finished successfully.");
		} catch (error: any) { 
			console.error("Setup Error:", error);
			globalIntegrationResult = "error";
			globalIntegrationError = error.message;
			setStatusModal({ 
				isOpen: true, 
				type: "error", 
				title: "Sync Failed", 
				description: error.message || "An error occurred while connecting to Google." 
			}); 
		} finally { 
			setLoading(false); 
			setIsIntegrating(false);
			sessionStorage.removeItem("google_oauth_token");
		}
	};

	const checkIfSheetIsNew = async (spreadsheetId: string, sheetName: string, token: string): Promise<boolean> => {
		const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } });
		const metadata = await metadataRes.json();
		return !metadata.sheets?.some((s: any) => s.properties?.title === sheetName);
	};

	const handleInitialBalanceCarryForward = async (spreadsheetId: string, currentMonth: string, token: string) => {
		const prevMonthName = getPreviousMonthName(currentMonth);
		try {
			// Fetch previous month's data to calculate the balance
			const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(prevMonthName)}!A:H`, { headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			
			// If previous sheet exists and has data
			if (!data.error && data.values && data.values.length > 0) {
				const fetchedHeaders = data.values[0];
				const amountIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount"));
				const typeIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type"));
				
				let totalBalance = 0;
				for (let i = 1; i < data.values.length; i++) {
					const row = data.values[i];
					const rawAmount = cleanNumber(row[amountIdx]);
					const type = row[typeIdx] || "";
					const isExpense = type.toLowerCase().includes("expense") || type.toLowerCase().includes("pengeluaran") || type.toLowerCase().includes("out");
					totalBalance += isExpense ? -rawAmount : rawAmount;
				}

				const amountVal = Math.abs(totalBalance).toString();
				const typeVal = totalBalance >= 0 ? "Pemasukan / Income" : "Pengeluaran / Expense";

				const values = [
					new Date().toLocaleString(),
					`${t("initialBalance")} (${prevMonthName})`,
					amountVal,
					typeVal,
					"Initial Balance",
					t("fromPreviousMonth")
				];
				
				await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(currentMonth)}!A1:append?valueInputOption=USER_ENTERED`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ values: [values] }),
				});
			}
		} catch (e) {
			console.log("No previous month data found to carry forward.");
		}
	};

	const ensureAndGetSheetId = async (spreadsheetId: string, sheetName: string, token: string): Promise<number> => {
		let metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
		let metadata = await metadataRes.json();
		if (metadataRes.status === 401 || metadata.error?.code === 401) {
			handleAuthError();
			throw new Error("UNAUTHORIZED");
		}
		
		let existingSheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName);
		let targetSheetId: number;

		if (!existingSheet) {
			const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
			});
			const createData = await createRes.json();
			
			if (!createRes.ok || createData.error) {
				console.error("Failed to create Google Sheet:", createData.error);
				// Attempt fallback if it actually exists due to a race condition
				const fallbackRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
				const fallbackMeta = await fallbackRes.json();
				const actuallyExists = fallbackMeta.sheets?.find((s: any) => s.properties?.title === sheetName);
				if (actuallyExists) return actuallyExists.properties.sheetId;
				throw new Error("Unable to create sheet tab: " + (createData.error?.message || "Unknown error"));
			}
			
			targetSheetId = createData.replies[0].addSheet.properties.sheetId;

			// Format newly created sheet and carry forward balance implicitly
			await initializeSheetFormatting(spreadsheetId, token, sheetName, targetSheetId);
			await handleInitialBalanceCarryForward(spreadsheetId, sheetName, token);
			
			metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
			metadata = await metadataRes.json();
		} else {
			targetSheetId = existingSheet.properties.sheetId;
		}

		const sheet1 = metadata.sheets?.find((s: any) => s.properties?.title === "Sheet1");
		if (sheet1 && metadata.sheets.length > 1) {
			try {
				await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }] }),
				});
			} catch (e) {}
		}

		return targetSheetId;
	};

	const initializeSheetFormatting = async (spreadsheetId: string, token: string, sheetName: string, internalSheetId: number, fieldsOverride?: CustomFieldDef[]) => {
		try {
			const currentFields = fieldsOverride || customFields;
			const allHeaders = [...CORE_HEADERS_DUAL, ...currentFields.map(f => f.name)];
			const lastColLetter = String.fromCharCode(65 + allHeaders.length - 1);
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:${lastColLetter}1?valueInputOption=RAW`, {
				method: "PUT",
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify({ values: [allHeaders] }),
			});
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({
					requests: [
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 200 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 3 }, properties: { pixelSize: 140 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 }, properties: { pixelSize: 160 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 4, endIndex: 5 }, properties: { pixelSize: 200 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 5, endIndex: 6 }, properties: { pixelSize: 400 }, fields: "pixelSize" } },
						{ addConditionalFormatRule: { rule: { ranges: [{ sheetId: internalSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: allHeaders.length }], booleanRule: { condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=ISODD(ROW())" }] }, format: { backgroundColor: { red: 0.95, green: 0.98, blue: 0.96 } } } }, index: 0 }},
						{ repeatCell: { range: { sheetId: internalSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: allHeaders.length }, cell: { userEnteredFormat: { backgroundColor: { red: 0.06, green: 0.72, blue: 0.5 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true }, horizontalAlignment: "CENTER" } }, fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)" }},
						{ updateSheetProperties: { properties: { sheetId: internalSheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
					],
				}),
			});
		} catch (e) {}
	};

	const handleAuthError = () => {
		if (sessionStorage.getItem("isAutoSyncing")) {
			sessionStorage.removeItem("isAutoSyncing");
			localStorage.removeItem("googleUser");
			setUser(null);
			setStatusModal({
				isOpen: true,
				type: "error",
				title: t("sessionExpiredTitle"),
				description: t("sessionExpiredDesc")
			});
		} else {
			sessionStorage.setItem("isAutoSyncing", "true");
			const scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"].join(" ");
			
			let loginHintParam = "";
			const savedUser = localStorage.getItem("googleUser");
			if (savedUser) {
				try {
					const parsed = JSON.parse(savedUser);
					if (parsed.email) {
						loginHintParam = `&login_hint=${encodeURIComponent(parsed.email)}`;
					}
				} catch (e) {}
			}

			const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true${loginHintParam}`;
			window.location.href = authUrl;
		}
	};

	const fetchAvailableMonths = async (spreadsheetId: string, token: string) => {
		try {
			const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } });
			const metadata = await metadataRes.json();
			if (metadataRes.status === 401 || metadata.error?.code === 401) {
				handleAuthError();
				return;
			}
			if (metadata.sheets) {
				const months = metadata.sheets.map((s: any) => s.properties.title);
				setAvailableMonths(months);
			}
		} catch (e) {}
	};

	const handleMonthChange = (month: string | null) => {
		if (!month) return;
		setSelectedMonth(month);
		if (user?.accessToken) fetchSheetData(config.sheetId, user.accessToken, month);
	};

	const resetToCurrentMonth = () => {
		const current = getCurrentMonthSheetName();
		if (selectedMonth !== current) {
			setSelectedMonth(current);
			if (user?.accessToken && config.sheetId) {
				fetchSheetData(config.sheetId, user.accessToken, current);
			}
		}
	};

	const handleSetInitialBalance = async (amount: number) => {
		if (supabaseUser) {
			setLoading(true);
			try {
				const existingEntry = transactions.find(t => t.category === "Initial Balance");
				if (existingEntry && existingEntry.id) {
					const { error } = await supabase
						.from("transactions")
						.update({
							amount: Math.abs(amount),
							name: `${t("initialBalance")} (Manual Setup)`,
							type: "income",
							note: "Manual Setup",
							date: new Date().toISOString()
						})
						.eq("id", existingEntry.id);
					if (error) throw error;
				} else {
					const { error } = await supabase.from("transactions").insert({
						user_id: supabaseUser.id,
						date: new Date().toISOString(),
						name: `${t("initialBalance")} (Manual Setup)`,
						amount: Math.abs(amount),
						type: "income",
						category: "Initial Balance",
						note: "Manual Setup"
					});
					if (error) throw error;
				}
				await fetchSupabaseUserData(supabaseUser.id);
				setStatusModal({ 
					isOpen: true, 
					type: "success", 
					title: t("successTitle"), 
					description: "Starting balance has been set successfully." 
				});
			} catch (error: any) {
				setStatusModal({ isOpen: true, type: "error", title: "Setup Failed", description: error.message });
			} finally {
				setLoading(false);
			}
			return;
		}

		if (!user?.accessToken || !config.sheetId || !selectedMonth) return;
		setLoading(true);
		try {
			const values = [
				new Date().toLocaleString(),
				`${t("initialBalance")} (Manual Setup)`,
				Math.abs(amount).toString(),
				"Pemasukan / Income",
				"Initial Balance",
				"Manual Setup"
			];
			
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(selectedMonth)}!A1:append?valueInputOption=USER_ENTERED`, {
				method: "POST",
				headers: { Authorization: `Bearer ${user.accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ values: [values] }),
			});
			
			await fetchSheetData(config.sheetId, user.accessToken, selectedMonth);
			setStatusModal({ 
				isOpen: true, 
				type: "success", 
				title: t("successTitle"), 
				description: "Starting balance has been set successfully." 
			});
		} catch (error: any) {
			setStatusModal({ isOpen: true, type: "error", title: "Setup Failed", description: error.message });
		} finally {
			setLoading(false);
		}
	};

	const handleSyncPreviousBalance = async () => {
		if (supabaseUser) {
			setLoading(true);
			const prevMonthName = getPreviousMonthName(selectedMonth);
			try {
				const { data: txs } = await supabase
					.from("transactions")
					.select("*")
					.eq("user_id", supabaseUser.id);
					
				if (txs) {
					let totalBalance = 0;
					txs.forEach(t => {
						const txMonth = new Date(t.date).toLocaleString("id-ID", { month: "long", year: "numeric" });
						if (txMonth === prevMonthName) {
							const isExpense = t.type === "expense" || t.type.toLowerCase().includes("expense") || t.type.toLowerCase().includes("pengeluaran");
							totalBalance += isExpense ? -Math.abs(t.amount) : Math.abs(t.amount);
						}
					});
					
					const existingEntry = transactions.find(t => t.category === "Initial Balance");
					if (existingEntry && existingEntry.id) {
						const { error } = await supabase
							.from("transactions")
							.update({
								amount: Math.abs(totalBalance),
								name: `${t("initialBalance")} (${prevMonthName})`,
								type: totalBalance >= 0 ? "income" : "expense",
								note: t("fromPreviousMonth"),
								date: new Date().toISOString()
							})
							.eq("id", existingEntry.id);
						if (error) throw error;
					} else {
						const { error } = await supabase.from("transactions").insert({
							user_id: supabaseUser.id,
							date: new Date().toISOString(),
							name: `${t("initialBalance")} (${prevMonthName})`,
							amount: Math.abs(totalBalance),
							type: totalBalance >= 0 ? "income" : "expense",
							category: "Initial Balance",
							note: t("fromPreviousMonth")
						});
						if (error) throw error;
					}
					await fetchSupabaseUserData(supabaseUser.id);
					setStatusModal({ isOpen: true, type: "success", title: "Berhasil", description: "Saldo dari bulan sebelumnya berhasil disinkronkan." });
				}
			} catch (error: any) {
				setStatusModal({ isOpen: true, type: "error", title: "Gagal", description: error.message });
			} finally {
				setLoading(false);
			}
			return;
		}

		if (!user?.accessToken || !config.sheetId || !selectedMonth) return;
		setLoading(true);
		const prevMonthName = getPreviousMonthName(selectedMonth);
		
		try {
			const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(prevMonthName)}!A:H`, { headers: { Authorization: `Bearer ${user.accessToken}` } });
			const data = await res.json();
			
			if (data.error || !data.values || data.values.length <= 1) {
				setStatusModal({ isOpen: true, type: "error", title: "Error", description: "Tidak ditemukan data transaksi di bulan sebelumnya." });
				return;
			}
			
			const fetchedHeaders = data.values[0];
			const amountIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount"));
			const typeIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type"));
			
			let totalBalance = 0;
			for (let i = 1; i < data.values.length; i++) {
				const row = data.values[i];
				const rawAmount = cleanNumber(row[amountIdx]);
				const type = row[typeIdx] || "";
				const isExpense = type.toLowerCase().includes("expense") || type.toLowerCase().includes("pengeluaran") || type.toLowerCase().includes("out");
				totalBalance += isExpense ? -rawAmount : rawAmount;
			}
			
			const amountVal = Math.abs(totalBalance).toString();
			const typeVal = totalBalance >= 0 ? "Pemasukan / Income" : "Pengeluaran / Expense";
			
			const values = [
				new Date().toLocaleString(),
				`${t("initialBalance")} (${prevMonthName})`,
				amountVal,
				typeVal,
				"Initial Balance",
				t("fromPreviousMonth")
			];
			
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(selectedMonth)}!A1:append?valueInputOption=USER_ENTERED`, {
				method: "POST",
				headers: { Authorization: `Bearer ${user.accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ values: [values] }),
			});
			
			await fetchSheetData(config.sheetId, user.accessToken, selectedMonth);
			setStatusModal({ isOpen: true, type: "success", title: "Berhasil", description: "Saldo dari bulan sebelumnya berhasil disinkronkan." });
		} catch (error: any) {
			setStatusModal({ isOpen: true, type: "error", title: "Gagal", description: error.message });
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = async (forceAccountSelection = false) => {
		if (supabaseUser) {
			try {
				setLoading(true);
				const res = await fetch(`/api/auth/google/url?userId=${supabaseUser.id}`);
				const data = await res.json();
				if (data.url) {
					window.location.href = data.url;
				} else {
					throw new Error(data.error || "Failed to generate connection URL");
				}
			} catch (e: any) {
				alert("Error: " + e.message);
			} finally {
				setLoading(false);
			}
			return;
		}

		const scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"].join(" ");
		const promptParam = forceAccountSelection ? "&prompt=select_account" : "";
		
		let loginHintParam = "";
		if (!forceAccountSelection) {
			const savedUser = localStorage.getItem("googleUser");
			if (savedUser) {
				try {
					const parsed = JSON.parse(savedUser);
					if (parsed.email) {
						loginHintParam = `&login_hint=${encodeURIComponent(parsed.email)}`;
					}
				} catch (e) {}
			}
		}

		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true${promptParam}${loginHintParam}`;
		window.location.href = authUrl;
	};

	// Main Initialization logic
	React.useEffect(() => {
		let authSubscription: any = null;

		const init = async () => {
			console.log("Initializing App State...");

			// Check URL parameters for google_sync status from server OAuth callback
			const urlParams = new URLSearchParams(window.location.search);
			const googleSyncStatus = urlParams.get("google_sync");
			if (googleSyncStatus === "success") {
				setStatusModal({
					isOpen: true,
					type: "success",
					title: t("syncSuccessTitle") || "Success",
					description: t("syncSuccessDesc") || "Google Sheets integration connected successfully!"
				});
				window.history.replaceState({}, document.title, window.location.pathname);
			} else if (googleSyncStatus === "error") {
				const reason = urlParams.get("reason");
				setStatusModal({
					isOpen: true,
					type: "error",
					title: "Sync Failed",
					description: `Failed to connect Google Sheets. Reason: ${reason || "unknown"}`
				});
				window.history.replaceState({}, document.title, window.location.pathname);
			}
			
			// 1. Check active Supabase Session
			const { data: { session } } = await supabase.auth.getSession();
			
			if (session) {
				setSupabaseUser(session.user);
				await fetchSupabaseUserData(session.user.id);
				await checkGoogleConnectionStatus(session.access_token);
			} else {
				// Fallback to local storage (Mode 1: No login sheets)
				loadLocalData();
			}

			// Listen to Auth changes dynamically
			const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
				if (session) {
					setSupabaseUser(session.user);
					await fetchSupabaseUserData(session.user.id);
					await checkGoogleConnectionStatus(session.access_token);
				} else {
					setSupabaseUser(null);
					setAllTransactions([]);
					setIsGoogleConnected(false);
					setGoogleEmail("");
					setUser(null);
					setConfig({ sheetId: "" });
					loadLocalData();
				}
			});
			authSubscription = subscription;
		};

		const loadLocalData = async () => {
			const savedCats = localStorage.getItem("customCategories");
			const savedFields = localStorage.getItem("customFieldDefs");
			const savedCharts = localStorage.getItem("customChartConfigs");

			if (savedCats) setCategories(JSON.parse(savedCats));
			else {
				const defaultCats = ["Gaji", "Makanan & Minuman", "Transportasi", "Kesehatan", "Belanja", "Tagihan", "Hiburan", "Pendidikan", "Lainnya"];
				setCategories(defaultCats);
				localStorage.setItem("customCategories", JSON.stringify(defaultCats));
			}

			if (savedFields) setCustomFields(JSON.parse(savedFields));
			if (savedCharts) setCustomChartConfigs(JSON.parse(savedCharts));
			
			const hash = window.location.hash;
			let token = "";
			
			if (hash && hash.includes("access_token")) {
				console.log("OAuth Access Token detected in URL.");
				sessionStorage.removeItem("isAutoSyncing");
				const params = new URLSearchParams(hash.substring(1));
				token = params.get("access_token") || "";
				if (token) {
					sessionStorage.setItem("google_oauth_token", token);
					window.history.replaceState({}, document.title, window.location.pathname);
				}
			} else {
				token = sessionStorage.getItem("google_oauth_token") || "";
			}

			if (token) {
				globalIntegrationToken = token;
			} else {
				token = globalIntegrationToken;
			}

			if (token) {
				setIsIntegrating(true);
				setLoading(true);
				
				if (!isGlobalIntegrating) {
					isGlobalIntegrating = true;
					globalIntegrationResult = null;
					globalIntegrationError = "";
					await setupGoogleSheet(token);
					isGlobalIntegrating = false;
					globalIntegrationToken = "";
				} else {
					const checkInterval = setInterval(() => {
						if (!isGlobalIntegrating) {
							clearInterval(checkInterval);
							if (globalIntegrationResult === "success") {
								const savedUser = localStorage.getItem("googleUser");
								if (savedUser) {
									const parsedUser = JSON.parse(savedUser);
									setUser(parsedUser);
									const sId = localStorage.getItem("sheetId") || "";
									setConfig({ sheetId: sId });
									const current = getCurrentMonthSheetName();
									setSelectedMonth(current);
									fetchSheetData(sId, parsedUser.accessToken, current);
									fetchAvailableMonths(sId, parsedUser.accessToken);
									setStatusModal({ 
										isOpen: true, 
										type: "success", 
										title: t("syncSuccessTitle") || "Success", 
										description: t("syncSuccessDesc") || "Integration sequence finished successfully." 
									});
								}
							}
							sessionStorage.removeItem("google_oauth_token");
							setIsIntegrating(false);
							setLoading(false);
						}
					}, 500);
				}
				return; 
			}

			const savedSheetId = localStorage.getItem("sheetId") || "";
			const savedUser = localStorage.getItem("googleUser");

			if (savedUser) {
				const parsedUser = JSON.parse(savedUser);
				setUser(parsedUser);
				if (savedSheetId) {
					setConfig({ sheetId: savedSheetId });
					const current = getCurrentMonthSheetName();
					setSelectedMonth(current);
					
					const doInit = async () => {
						setLoading(true);
						if (!globalInitPromise) {
							globalInitPromise = ensureAndGetSheetId(savedSheetId, current, parsedUser.accessToken)
								.then(async () => {
									await fetchSheetData(savedSheetId, parsedUser.accessToken, current);
									await fetchAvailableMonths(savedSheetId, parsedUser.accessToken);
								})
								.catch((e) => {
									fetchSheetData(savedSheetId, parsedUser.accessToken, current);
								})
								.finally(() => {
									globalInitPromise = null;
								});
						} else {
							await globalInitPromise;
							fetchSheetData(savedSheetId, parsedUser.accessToken, current);
							fetchAvailableMonths(savedSheetId, parsedUser.accessToken);
						}
					};
					doInit();
				} else setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
			} else {
				setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
			}
		};

		init();

		return () => {
			if (authSubscription) {
				authSubscription.unsubscribe();
			}
		};
	}, []);

	// Filter transactions by selectedMonth in Supabase mode
	React.useEffect(() => {
		if (supabaseUser) {
			const filtered = allTransactions.filter(t => {
				const d = new Date(t.rawDate || t.date);
				const txMonth = d.toLocaleString("id-ID", { month: "long", year: "numeric" });
				return txMonth === selectedMonth;
			});
			setTransactions(filtered);
			setTotalAmount(filtered.reduce((sum, t) => sum + t.amount, 0));
		}
	}, [selectedMonth, allTransactions, supabaseUser]);

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async () => {
		// ─── Demo Mode Short-circuit ──────────────────────────────────────────
		if (isDemoMode && addDemoTransaction) {
			const currentMonth = getCurrentMonthSheetName();
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note")) return false;
				const customField = customFields.find(f => f.name.toLowerCase() === hL);
				if (customField && !customField.required) return false;
				return !formData[h];
			});
			if (missingFields.length > 0) {
				setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") });
				return;
			}
			const getAmountRaw = (h: string) => {
				const raw = formData[h] || "0";
				return cleanNumber(stripRupiah(raw));
			};
			const amountHeader = headers.find(h => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount")) || "";
			const typeHeader = headers.find(h => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type")) || "";
			const nameHeader = headers.find(h => h.toLowerCase().includes("nama") || h.toLowerCase().includes("name")) || "";
			const catHeader = headers.find(h => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")) || "";
			const noteHeader = headers.find(h => h.toLowerCase().includes("catatan") || h.toLowerCase().includes("note")) || "";
			const typeVal = formData[typeHeader] || "";
			const isExpense = typeVal.toLowerCase().includes("expense") || typeVal.toLowerCase().includes("pengeluaran");
			const rawAmt = getAmountRaw(amountHeader);
			const customFieldValues: Record<string, string> = {};
			customFields.forEach(f => {
				const headerName = headers.find(h => h.toLowerCase() === f.name.toLowerCase());
				if (headerName) {
					customFieldValues[f.name] = formData[headerName] || "";
				}
			});

			addDemoTransaction({
				date: new Date().toLocaleString(),
				name: formData[nameHeader] || "",
				amount: isExpense ? -rawAmt : rawAmt,
				type: typeVal,
				category: formData[catHeader] || "",
				note: formData[noteHeader] || "",
				raw: customFieldValues,
			});
			setFormData({});
			setStatusModal({ isOpen: true, type: "success", title: t("successTitle"), description: t("successDesc") });
			return;
		}

		// ─── Supabase Database Path ───────────────────────────────────────────
		if (supabaseUser) {
			const currentMonth = getCurrentMonthSheetName();
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note")) return false;
				const customField = customFields.find(f => f.name.toLowerCase() === hL);
				if (customField && !customField.required) return false;
				return !formData[h];
			});

			if (missingFields.length > 0) { 
				setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); 
				return; 
			}

			setLoading(true);
			try {
				const amountHeader = headers.find(h => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount")) || "";
				const typeHeader = headers.find(h => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type")) || "";
				const nameHeader = headers.find(h => h.toLowerCase().includes("nama") || h.toLowerCase().includes("name")) || "";
				const catHeader = headers.find(h => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")) || "";
				const noteHeader = headers.find(h => h.toLowerCase().includes("catatan") || h.toLowerCase().includes("note")) || "";
				
				const typeVal = formData[typeHeader] || "";
				const isExpense = typeVal.toLowerCase().includes("expense") || typeVal.toLowerCase().includes("pengeluaran");
				const rawAmt = cleanNumber(stripRupiah(formData[amountHeader] || "0"));

				const customFieldValues: Record<string, string> = {};
				customFields.forEach(f => {
					const headerName = headers.find(h => h.toLowerCase() === f.name.toLowerCase());
					if (headerName) {
						customFieldValues[f.name] = formData[headerName] || "";
					}
				});

				const { error } = await supabase.from("transactions").insert({
					user_id: supabaseUser.id,
					date: new Date().toISOString(),
					name: formData[nameHeader] || "",
					amount: rawAmt,
					type: isExpense ? "expense" : "income",
					category: formData[catHeader] || "",
					note: formData[noteHeader] || "",
					custom_fields: customFieldValues
				});

				if (error) throw error;

				setFormData({});
				await fetchSupabaseUserData(supabaseUser.id);
				setStatusModal({ isOpen: true, type: "success", title: t("successTitle"), description: t("successDesc") });
			} catch (error: any) {
				setStatusModal({ isOpen: true, type: "error", title: "Submission Failed", description: error.message });
			} finally {
				setLoading(false);
			}
			return;
		}

		// ─── Normal Google Sheets Path ────────────────────────────────────────
		const activeSheetId = config.sheetId || localStorage.getItem("sheetId");
		const activeToken = user?.accessToken || JSON.parse(localStorage.getItem("googleUser") || "{}").accessToken;

		if (!activeToken || !activeSheetId) {
			setStatusModal({ isOpen: true, type: "error", title: "Connection Error", description: "Please sync your Google account first." });
			return;
		}

		const currentMonth = getCurrentMonthSheetName();
		const missingFields = headers.filter(h => {
			const hL = h.toLowerCase();
			if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note")) return false;
			const customField = customFields.find(f => f.name.toLowerCase() === hL);
			if (customField && !customField.required) return false;
			return !formData[h];
		});

		if (missingFields.length > 0) { 
			setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); 
			return; 
		}

		setLoading(true);
		try {
			const internalSheetId = await ensureAndGetSheetId(activeSheetId, currentMonth, activeToken);
			await initializeSheetFormatting(activeSheetId, activeToken, currentMonth, internalSheetId, customFields);
			const values = headers.map((h) => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date")) return new Date().toLocaleString();
				let val = formData[h] || "";
				// Strip Rupiah formatting before persisting raw number
				if (hL.includes("jumlah") || hL.includes("amount")) {
					val = Math.abs(cleanNumber(stripRupiah(val))).toString();
				}
				return val;
			});

			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(currentMonth)}!A1:append?valueInputOption=USER_ENTERED`, {
				method: "POST",
				headers: { Authorization: `Bearer ${activeToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ values: [values] }),
			});

			setFormData({});
			setSelectedMonth(currentMonth);
			await fetchSheetData(activeSheetId, activeToken, currentMonth);
			fetchAvailableMonths(activeSheetId, activeToken);
			setStatusModal({ isOpen: true, type: "success", title: t("successTitle"), description: t("successDesc") });
		} catch (error: any) { 
			setStatusModal({ isOpen: true, type: "error", title: "Submission Failed", description: error.message }); 
		} finally { 
			setLoading(false); 
		}
	};

	const updateSupabaseSettings = async (cats: string[], fields: CustomFieldDef[], charts: CustomChartConfig[]) => {
		if (!supabaseUser) return;
		try {
			const { error } = await supabase.from("user_settings").upsert({
				user_id: supabaseUser.id,
				custom_categories: cats,
				custom_field_defs: fields,
				custom_chart_configs: charts,
				updated_at: new Date().toISOString()
			});
			if (error) throw error;
		} catch (e) {
			console.error("Failed to update user settings in Supabase:", e);
		}
	};

	const handleAddCategory = async () => {
		if (!newCategoryInput.trim() || categories.includes(newCategoryInput.trim())) return;
		const updated = [...categories, newCategoryInput.trim()];
		setCategories(updated);
		if (isDemoMode) {
			setNewCategoryInput("");
			return;
		}
		if (supabaseUser) {
			await updateSupabaseSettings(updated, customFields, customChartConfigs);
		} else {
			localStorage.setItem("customCategories", JSON.stringify(updated));
		}
		setNewCategoryInput("");
	};

	const handleDeleteCategory = async (cat: string) => {
		const updated = categories.filter((c) => c !== cat);
		setCategories(updated);
		if (isDemoMode) return;
		if (supabaseUser) {
			await updateSupabaseSettings(updated, customFields, customChartConfigs);
		} else {
			localStorage.setItem("customCategories", JSON.stringify(updated));
		}
	};

	const handleAddField = async () => {
		if (!newFieldName.trim() || customFields.length >= 2) return;
		const newField: CustomFieldDef = { name: newFieldName.trim(), type: newFieldType, required: newFieldRequired, options: newFieldType === "dropdown" ? ["Default"] : [] };
		const updatedFields = [...customFields, newField];

		if (isDemoMode) {
			setCustomFields(updatedFields);
			setHeaders([...CORE_HEADERS_DUAL, ...updatedFields.map(f => f.name)]);
			setNewFieldName("");
			setNewFieldRequired(true);
			return;
		}

		if (supabaseUser) {
			setLoading(true);
			try {
				setCustomFields(updatedFields);
				await updateSupabaseSettings(categories, updatedFields, customChartConfigs);
				setNewFieldName("");
				setNewFieldRequired(true);
			} catch (e) {
				alert("Failed to add field");
			} finally {
				setLoading(false);
			}
			return;
		}

		if (!user?.accessToken || !config.sheetId) return;
		setLoading(true);
		try {
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken);
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			await initializeSheetFormatting(config.sheetId, user.accessToken, sheetName, internalSheetId, updatedFields);
			setNewFieldName("");
			setNewFieldRequired(true);
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to add field"); } finally { setLoading(false); }
	};

	const handleUpdateField = async (idx: number, name: string, type: "text" | "dropdown", req: boolean) => {
		if (idx === -1 || !name.trim()) return;
		const updatedFields = [...customFields];
		updatedFields[idx].name = name.trim();
		updatedFields[idx].type = type;
		updatedFields[idx].required = req;
		if (type === "dropdown" && (!updatedFields[idx].options || updatedFields[idx].options.length === 0)) {
			updatedFields[idx].options = ["Default"];
		}

		if (isDemoMode) {
			setCustomFields(updatedFields);
			setHeaders([...CORE_HEADERS_DUAL, ...updatedFields.map(f => f.name)]);
			return;
		}

		if (supabaseUser) {
			setLoading(true);
			try {
				setCustomFields(updatedFields);
				await updateSupabaseSettings(categories, updatedFields, customChartConfigs);
			} catch (e) {
				alert("Failed to update field");
			} finally {
				setLoading(false);
			}
			return;
		}

		if (!user?.accessToken || !config.sheetId) return;
		setLoading(true);
		try {
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken);
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			await initializeSheetFormatting(config.sheetId, user.accessToken, sheetName, internalSheetId, updatedFields);
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to update field"); } finally { setLoading(false); }
	};

	const handleDeleteField = async () => {
		if (deleteConfirmIndex === -1) return;
		const updatedFields = customFields.filter((_, i) => i !== deleteConfirmIndex);
		const fieldNameToDelete = customFields[deleteConfirmIndex].name;
		const updatedCharts = customChartConfigs.filter(c => c.fieldName !== fieldNameToDelete);

		if (isDemoMode) {
			setCustomChartConfigs(updatedCharts);
			setCustomFields(updatedFields);
			setHeaders([...CORE_HEADERS_DUAL, ...updatedFields.map(f => f.name)]);
			setDeleteConfirmIndex(-1);
			return;
		}

		if (supabaseUser) {
			setLoading(true);
			try {
				setCustomChartConfigs(updatedCharts);
				setCustomFields(updatedFields);
				await updateSupabaseSettings(categories, updatedFields, updatedCharts);
				setDeleteConfirmIndex(-1);
			} catch (e) {
				alert("Failed to delete column");
			} finally {
				setLoading(false);
			}
			return;
		}

		if (!user?.accessToken || !config.sheetId) return;
		setLoading(true);
		try {
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken);
			const colIndex = CORE_FIELDS_COUNT + deleteConfirmIndex;
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}:batchUpdate`, {
				method: "POST",
				headers: { Authorization: `Bearer ${user.accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: colIndex, endIndex: colIndex + 1 } } }] })
			});
			setCustomChartConfigs(updatedCharts);
			localStorage.setItem("customChartConfigs", JSON.stringify(updatedCharts));
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			setDeleteConfirmIndex(-1);
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to delete column"); } finally { setLoading(false); }
	};

	const handleAddOptionToField = async (idx: number, input: string) => {
		if (idx === -1 || !input.trim()) return;
		const updatedFields = [...customFields];
		const field = updatedFields[idx];
		if (!field.options) field.options = [];
		if (field.options.includes(input.trim())) return;
		field.options.push(input.trim());
		setCustomFields(updatedFields);
		if (isDemoMode) {
			setNewOptionInput("");
			return;
		}
		if (supabaseUser) {
			await updateSupabaseSettings(categories, updatedFields, customChartConfigs);
		} else {
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
		}
		setNewOptionInput("");
	};

	const handleDeleteOptionFromField = async (idx: number, optToDelete: string) => {
		if (idx === -1) return;
		const updatedFields = [...customFields];
		const field = updatedFields[idx];
		if (field.options) {
			const updatedOpts = field.options.filter(o => o !== optToDelete);
			field.options = updatedOpts;
			setCustomFields(updatedFields);
			if (isDemoMode) return;
			if (supabaseUser) {
				await updateSupabaseSettings(categories, updatedFields, customChartConfigs);
			} else {
				localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			}
		}
	};

	const handleAddCustomChart = async (config: CustomChartConfig) => {
		if (customChartConfigs.length >= 2) return;
		const updated = [...customChartConfigs, config];
		setCustomChartConfigs(updated);
		if (isDemoMode) return;
		if (supabaseUser) {
			await updateSupabaseSettings(categories, customFields, updated);
		} else {
			localStorage.setItem("customChartConfigs", JSON.stringify(updated));
		}
	};

	const handleDeleteCustomChart = async (idx: number) => {
		const updated = customChartConfigs.filter((_, i) => i !== idx);
		setCustomChartConfigs(updated);
		if (isDemoMode) return;
		if (supabaseUser) {
			await updateSupabaseSettings(categories, customFields, updated);
		} else {
			localStorage.setItem("customChartConfigs", JSON.stringify(updated));
		}
	};

	return {
		view, setView,
		headers, categories, customFields, transactions,
		availableMonths, selectedMonth, newCategoryInput, setNewCategoryInput,
		formData, handleInputChange, loading, totalAmount, formatCurrency,
		user, statusModal, setStatusModal,
		isManageFieldsOpen, setIsManageFieldsOpen,
		newFieldName, setNewFieldName,
		newFieldType, setNewFieldType,
		newFieldRequired, setNewFieldRequired,
		newOptionInput, setNewOptionInput,
		setDeleteConfirmIndex,
		handleAddCategory, handleDeleteCategory,
		handleAddOptionToField, handleDeleteOptionFromField,
		handleAddField, handleUpdateField, handleDeleteField,
		customChartConfigs, handleAddCustomChart, handleDeleteCustomChart,
		handleSetInitialBalance, handleSyncPreviousBalance,
		handleGoogleLogin, handleMonthChange, resetToCurrentMonth, handleSubmit,
		isIntegrating,
		supabaseUser, isGoogleConnected, googleEmail,
		exportToCSV, exportToGoogleSheets,
		translateHeader: (header: string) => {
			const h = header.toLowerCase();
			if (h.includes("nama") || h.includes("name")) return t("name");
			if (h.includes("jumlah") || h.includes("amount")) return t("amount");
			if (h.includes("tipe") || h.includes("type")) return t("transactionType");
			if (h.includes("kategori") || h.includes("category")) return t("category");
			if (h.includes("catatan") || h.includes("note")) return t("note");
			return header;
		}
	};
}



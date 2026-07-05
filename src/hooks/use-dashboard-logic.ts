"use client";

import * as React from "react";
import { useLanguage } from "@/components/language-provider";
import { stripRupiah } from "@/components/dashboard/cards/numeric-keyboard";
import { supabase } from "@/lib/supabase-client";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import {
	CORE_HEADERS_DUAL,
	CORE_FIELDS_COUNT,
	type CustomFieldDef,
	getCurrentMonthSheetName,
	getPreviousMonthName,
	formatCurrency,
	cleanNumber,
	fetchDriveFolder,
	createDriveFolder,
	fetchDriveSpreadsheet,
	createDriveSpreadsheet,
	fetchUserProfile,
	ensureAndGetSheetId,
	initializeSheetFormatting,
	handleInitialBalanceCarryForward,
	appendRowToSheet,
	deleteSheetColumn
} from "@/lib/sheets-api";

export type { CustomFieldDef };

export type PocketDef = {
	id: string;
	name: string;
	type: "default" | "budget" | "saving";
	target?: number;
	color: "emerald" | "indigo" | "amber";
};

export const DEFAULT_POCKETS: PocketDef[] = [];

const parseDateSafe = (dateStr: string): Date => {
	if (!dateStr) return new Date();
	const parsed = new Date(dateStr);
	if (!isNaN(parsed.getTime())) return parsed;
	
	try {
		const cleaned = dateStr.replace(/(\d{2})\.(\d{2})\.(\d{2})/, "$1:$2:$3");
		const parsedCleaned = new Date(cleaned);
		if (!isNaN(parsedCleaned.getTime())) return parsedCleaned;
	} catch (e) {}

	return new Date();
};

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

let isGlobalIntegrating = false;
let globalIntegrationToken = "";
let globalIntegrationResult: "success" | "error" | null = null;
let globalIntegrationError = "";
let globalInitPromise: Promise<void> | null = null;

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
	pocket?: string;
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
	const { t, language } = useLanguage();
	const [view, setView] = React.useState<"form" | "analytics">("form");
	const [headers, setHeaders] = React.useState<string[]>([]);
	const [categories, setCategories] = React.useState<string[]>([]);
	const [customFields, setCustomFields] = React.useState<CustomFieldDef[]>([]);
	const [customChartConfigs, setCustomChartConfigs] = React.useState<CustomChartConfig[]>(() => {
		if (typeof window !== "undefined") {
			const isDemo = localStorage.getItem("is_demo_mode") === "true";
			if (isDemo) {
				const stored = localStorage.getItem("demo_customChartConfigs");
				if (stored) {
					try {
						return JSON.parse(stored);
					} catch (e) {
						console.error("Failed to parse demo charts", e);
					}
				}
			}
		}
		return [];
	});
	const [transactions, setTransactions] = React.useState<Transaction[]>([]);
	const [allTransactions, setAllTransactions] = React.useState<any[]>([]);
	const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);
	const [selectedMonth, setSelectedMonth] = React.useState<string>("");
	const [newCategoryInput, setNewCategoryInput] = React.useState("");
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [pockets, setPockets] = React.useState<PocketDef[]>(() => {
		if (typeof window !== "undefined") {
			const isDemo = localStorage.getItem("is_demo_mode") === "true";
			if (isDemo) {
				const stored = localStorage.getItem("demo_pockets");
				if (stored) {
					try {
						return JSON.parse(stored);
					} catch (e) {
						console.error("Failed to parse demo pockets", e);
					}
				}
				return [
					{ id: "pocket_2", name: "Jajan", type: "budget", target: 1000000, color: "indigo" },
					{ id: "pocket_3", name: "Tabungan", type: "saving", target: 50000000, color: "amber" }
				] as PocketDef[];
			} else {
				const stored = localStorage.getItem("customPockets");
				if (stored) {
					try {
						return JSON.parse(stored);
					} catch (e) {}
				}
			}
		}
		return DEFAULT_POCKETS;
	});
	const [activePocketIdx, setActivePocketIdx] = React.useState<number>(0);
	const [recurringTemplates, setRecurringTemplates] = React.useState<any[]>([]);
	const [loading, setLoading] = React.useState(!isDemoMode);
	const [isIntegrating, setIsIntegrating] = React.useState(false);
	const [totalAmount, setTotalAmount] = React.useState(0);
	const [user, setUser] = React.useState<{ name: string; email?: string; photo?: string; accessToken: string; } | null>(null);
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

	// Delegate PWA State to sub-hook
	const {
		isInstallable,
		isAddToHomeOpen,
		setIsAddToHomeOpen,
		isStandaloneMode,
		deferredPrompt,
		triggerInstall
	} = usePWAInstall();

	const fetchSupabaseUserData = React.useCallback(async (userId: string) => {
		try {
			setLoading(true);
			const { data: settings } = await supabase
				.from("user_settings")
				.select("*")
				.eq("user_id", userId)
				.single();
				
			let fields: CustomFieldDef[] = [];
			let dbPockets = DEFAULT_POCKETS;
			if (settings) {
				if (settings.custom_categories) setCategories(settings.custom_categories);
				if (settings.custom_field_defs) {
					setCustomFields(settings.custom_field_defs);
					fields = settings.custom_field_defs;
				}
				if (settings.custom_chart_configs) setCustomChartConfigs(settings.custom_chart_configs);
				if (settings.custom_pockets && Array.isArray(settings.custom_pockets)) {
					dbPockets = settings.custom_pockets;
					setPockets(dbPockets);
				} else {
					const stored = localStorage.getItem("customPockets");
					if (stored) {
						try {
							dbPockets = JSON.parse(stored);
							if (!Array.isArray(dbPockets)) {
								dbPockets = DEFAULT_POCKETS;
							}
						} catch (e) {
							dbPockets = DEFAULT_POCKETS;
						}
					} else {
						dbPockets = DEFAULT_POCKETS;
					}
					setPockets(dbPockets);
					
					const hasMissingColumn = localStorage.getItem("supabase_missing_custom_pockets") === "true";
					if (hasMissingColumn) {
						localStorage.setItem("customPockets", JSON.stringify(dbPockets));
					} else {
						try {
							const payload: any = {
								user_id: userId,
								custom_pockets: dbPockets,
								updated_at: new Date().toISOString()
							};
							const { error } = await supabase.from("user_settings").upsert(payload);
							if (error && error.message.includes("custom_pockets")) {
								localStorage.setItem("supabase_missing_custom_pockets", "true");
								localStorage.setItem("customPockets", JSON.stringify(dbPockets));
							}
						} catch (e) {
							console.error("Failed to initialize custom_pockets in Supabase:", e);
						}
					}
				}
			} else {
				dbPockets = DEFAULT_POCKETS;
				setPockets(dbPockets);
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
					const pocketId = t.pocket_id || (t.custom_fields && typeof t.custom_fields === "object" ? (t.custom_fields as any).pocket_id : null);
					const pObj = dbPockets.find((p: any) => p.id === pocketId) || { name: "", id: "" };
					return {
						id: t.id,
						date: parseDateSafe(t.date).toLocaleString(),
						rawDate: t.date,
						name: t.name,
						amount: isExpense ? -Math.abs(t.amount) : Math.abs(t.amount),
						type: t.type === "expense" ? "Pengeluaran / Expense" : "Pemasukan / Income",
						category: t.category,
						note: t.note || "",
						pocket: pObj.name,
						raw: t.custom_fields || {}
					};
				});
				setAllTransactions(parsedTxs);

				const dates = currentMonthTxs.map(t => parseDateSafe(t.date).toLocaleString("id-ID", { month: "long", year: "numeric" }));
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
	}, []);

	const checkGoogleConnectionStatus = React.useCallback(async (sessionToken: string) => {
		try {
			const response = await fetch("/api/auth/google/token", {
				headers: { Authorization: `Bearer ${sessionToken}` }
			});
			if (response.ok) {
				const data = await response.json();
				if (data.connected) {
					setIsGoogleConnected(true);
					setGoogleEmail(data.googleEmail);
					setUser({ name: data.googleEmail, email: data.googleEmail, accessToken: data.accessToken });
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
	}, []);

	const exportToCSV = () => {
		const txsToExport = isDemoMode ? demoTransactions : (allTransactions.length > 0 ? allTransactions : transactions);
		if (txsToExport.length === 0) {
			alert(t("noTransactions") || "No transactions to export");
			return;
		}

		const customFieldNames = customFields.map(f => f.name);
		const headersRow = [...CORE_HEADERS_DUAL, ...customFieldNames];
		const csvRows = [headersRow.join(",")];

		txsToExport.forEach(t => {
			const isExpense = t.type === "expense" || t.type.toLowerCase().includes("expense") || t.type.toLowerCase().includes("pengeluaran");
			const amountVal = isExpense ? -Math.abs(t.amount) : Math.abs(t.amount);
			const row = [
				`"${t.date}"`,
				`"${t.name.replace(/"/g, '""')}"`,
				amountVal,
				`"${t.type}"`,
				`"${t.category}"`,
				`"${(t.note || "").replace(/"/g, '""')}"`,
				`"${(t.pocket || "").replace(/"/g, '""')}"`,
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

				const pocketIdx = fetchedHeaders.findIndex((h: string) => h.toLowerCase().includes("pocket") || h.toLowerCase().includes("kantong"));
				const rowData = data.values.slice(1).map((row: any) => {
					const rawAmount = cleanNumber(row[amountIdx]);
					const type = row[typeIdx] || "";
					const isExpense = type.toLowerCase().includes("expense") || type.toLowerCase().includes("pengeluaran") || type.toLowerCase().includes("out");
					const rawDateStr = row[dateIdx] || "";
					let displayDate = rawDateStr;
					try {
						const dObj = parseDateSafe(rawDateStr);
						displayDate = dObj.toLocaleString();
					} catch(e) {}
					return {
						date: displayDate,
						rawDate: rawDateStr,
						name: row[nameIdx] || "",
						amount: isExpense ? -rawAmount : rawAmount,
						type: type,
						category: row[catIdx] || "",
						note: row[noteIdx] || "",
						pocket: pocketIdx !== -1 ? row[pocketIdx] || "" : "",
						raw: row
					};
				});
				
				setTransactions(rowData);

				// Auto-discover unique categories from the Google Sheet and sync them locally
				const sheetCategories = Array.from(new Set(rowData.map((t: any) => t.category).filter(Boolean))) as string[];
				setCategories(prev => {
					const updated = [...prev];
					let hasNew = false;
					sheetCategories.forEach((cat: string) => {
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
		setIsIntegrating(true);
		setLoading(true);
		
		console.log("Starting Google Sheet Setup...");
		
		try {
			setStatusModal(prev => ({ ...prev, description: "Connecting to Google Drive..." }));
			const folderId = await fetchDriveFolder("expense by genlord", token) || await createDriveFolder("expense by genlord", token);

			setStatusModal(prev => ({ ...prev, description: "Preparing your Expense Tracker..." }));
			const spreadsheetId = await fetchDriveSpreadsheet("Expense Tracker", folderId, token) || await createDriveSpreadsheet("Expense Tracker", folderId, token);

			const sheetName = getCurrentMonthSheetName();
			setStatusModal(prev => ({ ...prev, description: `Setting up sheet: ${sheetName}...` }));
			const internalSheetId = await ensureAndGetSheetId(spreadsheetId, sheetName, token, handleAuthError);

			// Format newly created sheet and carry forward balance implicitly
			await initializeSheetFormatting(spreadsheetId, token, sheetName, internalSheetId, customFields);
			await handleInitialBalanceCarryForward(spreadsheetId, sheetName, token, t("initialBalance"), t("fromPreviousMonth"));

			// Fetch user info from Google Drive API about endpoint
			let profile = { name: "Google User", email: "", photo: "" };
			try {
				profile = await fetchUserProfile(token);
			} catch (err) {
				console.error("Error fetching user profile:", err);
			}

			// PERSIST
			localStorage.setItem("sheetId", spreadsheetId);
			const newUser = { name: profile.name, email: profile.email, photo: profile.photo, accessToken: token };
			localStorage.setItem("googleUser", JSON.stringify(newUser));

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
				const months = metadata.sheets.map((s: any) => s.properties.title) as string[];
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
			
			await appendRowToSheet(config.sheetId, selectedMonth, user.accessToken, values);
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
			
			await appendRowToSheet(config.sheetId, selectedMonth, user.accessToken, values);
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
			if (isDemoMode) return;
			console.log("Initializing App State...");

			// Reset database fallback flags on mount to re-evaluate database capabilities (e.g. after running SQL migrations)
			localStorage.removeItem("supabase_missing_custom_pockets");
			localStorage.removeItem("supabase_missing_pocket_id");

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
			
			// Listen to Auth changes dynamically
			let lastSessionToken = "";
			const authChangeRes = supabase.auth.onAuthStateChange(async (event, session) => {
				if (session) {
					if (session.access_token === lastSessionToken) {
						return;
					}
					lastSessionToken = session.access_token;
					setSupabaseUser(session.user);
					await fetchSupabaseUserData(session.user.id);
					await checkGoogleConnectionStatus(session.access_token);
				} else {
					if (lastSessionToken === null) return;
					lastSessionToken = "";
					setSupabaseUser(null);
					setAllTransactions([]);
					setIsGoogleConnected(false);
					setGoogleEmail("");
					setUser(null);
					setConfig({ sheetId: "" });
					loadLocalData();
				}
			});
			authSubscription = authChangeRes.data.subscription;
		};

		const loadLocalData = async () => {
			const savedCats = localStorage.getItem("customCategories");
			const savedFields = localStorage.getItem("customFieldDefs");
			const savedCharts = localStorage.getItem("customChartConfigs");
			const savedPockets = localStorage.getItem("customPockets");
			const savedTemplates = localStorage.getItem("recurringTemplates");

			if (savedPockets && JSON.parse(savedPockets).length > 0) setPockets(JSON.parse(savedPockets));
			else {
				setPockets(DEFAULT_POCKETS);
				localStorage.setItem("customPockets", JSON.stringify(DEFAULT_POCKETS));
			}

			if (savedTemplates) setRecurringTemplates(JSON.parse(savedTemplates));

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
							globalInitPromise = ensureAndGetSheetId(savedSheetId, current, parsedUser.accessToken, handleAuthError)
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
				} else {
					setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
					setLoading(false);
				}
			} else {
				setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
				setLoading(false);
			}
		};

		init();

		return () => {
			if (authSubscription) {
				authSubscription.unsubscribe();
			}
		};
	}, [isDemoMode]);

	// Pre-seed Demo Mode settings and templates
	React.useEffect(() => {
		if (isDemoMode) {
			const storedPockets = localStorage.getItem("demo_pockets");
			if (storedPockets) {
				setPockets(JSON.parse(storedPockets));
			} else {
				const demoPockets = [
					{ id: "pocket_2", name: "Jajan", type: "budget", target: 1000000, color: "indigo" },
					{ id: "pocket_3", name: "Tabungan", type: "saving", target: 50000000, color: "amber" }
				] as PocketDef[];
				setPockets(demoPockets);
				localStorage.setItem("demo_pockets", JSON.stringify(demoPockets));
			}

			const storedCharts = localStorage.getItem("demo_customChartConfigs");
			if (storedCharts) {
				setCustomChartConfigs(JSON.parse(storedCharts));
			}

			const demoTemplates = [
				{
					id: "rec_demo_1",
					name: "Langganan Netflix",
					amount: 186000,
					type: "expense",
					category: "Hiburan",
					pocket: "Jajan",
					interval_unit: "monthly",
					interval_value: 1,
					next_execution_at: new Date(Date.now() + 864e5 * 15).toISOString(),
					last_executed_at: new Date().toISOString()
				},
				{
					id: "rec_demo_2",
					name: "Tabungan Bulanan",
					amount: 1500000,
					type: "income",
					category: "Lainnya",
					pocket: "Tabungan",
					interval_unit: "monthly",
					interval_value: 1,
					next_execution_at: new Date(Date.now() + 864e5 * 3).toISOString(),
					last_executed_at: new Date().toISOString()
				}
			];
			setRecurringTemplates(demoTemplates);
			setTransactions(demoTransactions);
		}
	}, [isDemoMode, demoTransactions]);

	// Filter transactions by selectedMonth in Supabase mode
	React.useEffect(() => {
		if (supabaseUser) {
			const filtered = allTransactions.filter(t => {
				const d = parseDateSafe(t.rawDate || t.date);
				const txMonth = d.toLocaleString("id-ID", { month: "long", year: "numeric" });
				return txMonth === selectedMonth;
			});
			setTransactions(filtered);
		}
	}, [selectedMonth, allTransactions, supabaseUser]);

	React.useEffect(() => {
		const totalPockets = pockets.length + 1; // Total Saldo (index 0) + custom pockets
		if (activePocketIdx >= totalPockets) {
			setActivePocketIdx(0);
		}
	}, [pockets, activePocketIdx]);

	React.useEffect(() => {
		if (pockets.length > 0 && activePocketIdx > 0) {
			const activePocket = pockets[activePocketIdx - 1];
			if (activePocket) {
				const filtered = transactions.filter(t => t.pocket === activePocket.name || t.pocket === activePocket.id);
				setTotalAmount(filtered.reduce((sum, t) => sum + t.amount, 0));
			} else {
				setTotalAmount(transactions.reduce((sum, t) => sum + t.amount, 0));
			}
		} else {
			setTotalAmount(transactions.reduce((sum, t) => sum + t.amount, 0));
		}
	}, [transactions, activePocketIdx, pockets]);

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async (overrideFormData?: Record<string, string>) => {
		const activeFormData = overrideFormData || formData;
		// ─── Demo Mode Short-circuit ──────────────────────────────────────────
		if (isDemoMode && addDemoTransaction) {
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note") || hL.includes("pocket") || hL.includes("kantong")) return false;
				const customField = customFields.find(f => f.name.toLowerCase() === hL);
				if (customField && !customField.required) return false;
				return !activeFormData[h];
			});
			if (missingFields.length > 0) {
				setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") });
				return;
			}
			const getAmountRaw = (h: string) => {
				const raw = activeFormData[h] || "0";
				return cleanNumber(stripRupiah(raw));
			};
			const amountHeader = headers.find(h => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount")) || "";
			const typeHeader = headers.find(h => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type")) || "";
			const nameHeader = headers.find(h => h.toLowerCase().includes("nama") || h.toLowerCase().includes("name")) || "";
			const catHeader = headers.find(h => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")) || "";
			const noteHeader = headers.find(h => h.toLowerCase().includes("catatan") || h.toLowerCase().includes("note")) || "";
			const typeVal = activeFormData[typeHeader] || "";
			const isExpense = typeVal.toLowerCase().includes("expense") || typeVal.toLowerCase().includes("pengeluaran");
			const rawAmt = getAmountRaw(amountHeader);
			const customFieldValues: Record<string, string> = {};
			customFields.forEach(f => {
				const headerName = headers.find(h => h.toLowerCase() === f.name.toLowerCase());
				if (headerName) {
					customFieldValues[f.name] = activeFormData[headerName] || "";
				}
			});

			const activePocket = pockets.length > 0 && activePocketIdx > 0 ? pockets[activePocketIdx - 1] : null;
			addDemoTransaction({
				date: new Date().toLocaleString(),
				name: activeFormData[nameHeader] || "",
				amount: isExpense ? -rawAmt : rawAmt,
				type: typeVal,
				category: activeFormData[catHeader] || "",
				note: activeFormData[noteHeader] || "",
				pocket: activePocket ? activePocket.name : "",
				raw: customFieldValues,
			});
			setFormData({});
			setStatusModal({ isOpen: true, type: "success", title: t("successTitle"), description: t("successDesc") });
			return;
		}

		// ─── Supabase Database Path ───────────────────────────────────────────
		if (supabaseUser) {
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note") || hL.includes("pocket") || hL.includes("kantong")) return false;
				const customField = customFields.find(f => f.name.toLowerCase() === hL);
				if (customField && !customField.required) return false;
				return !activeFormData[h];
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
				
				const typeVal = activeFormData[typeHeader] || "";
				const isExpense = typeVal.toLowerCase().includes("expense") || typeVal.toLowerCase().includes("pengeluaran");
				const rawAmt = cleanNumber(stripRupiah(activeFormData[amountHeader] || "0"));

				const customFieldValues: Record<string, string> = {};
				customFields.forEach(f => {
					const headerName = headers.find(h => h.toLowerCase() === f.name.toLowerCase());
					if (headerName) {
						customFieldValues[f.name] = activeFormData[headerName] || "";
					}
				});

				const activePocket = pockets.length > 0 && activePocketIdx > 0 ? pockets[activePocketIdx - 1] : null;
				const hasMissingPocketId = localStorage.getItem("supabase_missing_pocket_id") === "true";
				const insertPayload: any = {
					user_id: supabaseUser.id,
					date: new Date().toISOString(),
					name: activeFormData[nameHeader] || "",
					amount: rawAmt,
					type: isExpense ? "expense" : "income",
					category: activeFormData[catHeader] || "",
					note: activeFormData[noteHeader] || "",
					custom_fields: customFieldValues
				};
				if (!hasMissingPocketId) {
					insertPayload.pocket_id = activePocket ? activePocket.id : null;
				} else {
					insertPayload.custom_fields = {
						...insertPayload.custom_fields,
						pocket_id: activePocket ? activePocket.id : null
					};
				}

				let { error } = await supabase.from("transactions").insert(insertPayload);

				if (error && error.message.includes("pocket_id")) {
					localStorage.setItem("supabase_missing_pocket_id", "true");
					delete insertPayload.pocket_id;
					insertPayload.custom_fields = {
						...insertPayload.custom_fields,
						pocket_id: activePocket ? activePocket.id : null
					};
					const retryResult = await supabase.from("transactions").insert(insertPayload);
					error = retryResult.error;
				}

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
			if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note") || hL.includes("pocket") || hL.includes("kantong")) return false;
			const customField = customFields.find(f => f.name.toLowerCase() === hL);
			if (customField && !customField.required) return false;
			return !activeFormData[h];
		});

		if (missingFields.length > 0) { 
			setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); 
			return; 
		}

		setLoading(true);
		try {
			const internalSheetId = await ensureAndGetSheetId(activeSheetId, currentMonth, activeToken, handleAuthError);
			await initializeSheetFormatting(activeSheetId, activeToken, currentMonth, internalSheetId, customFields);
			const activePocket = pockets.length > 0 && activePocketIdx > 0 ? pockets[activePocketIdx - 1] : null;
			const values = headers.map((h) => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date")) return new Date().toISOString();
				if (hL.includes("pocket") || hL.includes("kantong")) return activePocket ? activePocket.name : "";
				let val = activeFormData[h] || "";
				// Strip Rupiah formatting before persisting raw number
				if (hL.includes("jumlah") || hL.includes("amount")) {
					val = Math.abs(cleanNumber(stripRupiah(val))).toString();
				}
				return val;
			});

			await appendRowToSheet(activeSheetId, currentMonth, activeToken, values);

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

	const handleMoveFunds = async (sourcePocketName: string, targetPocketName: string, amount: number) => {
		if (amount <= 0) return;

		// ─── Demo Mode ────────────────────────────────────────────────────────
		if (isDemoMode && addDemoTransaction) {
			const dateStr = new Date().toLocaleString();
			// Source Deduction
			addDemoTransaction({
				date: dateStr,
				name: `${sourcePocketName || "Total Worth"} -> ${targetPocketName}`,
				amount: -amount,
				type: "expense",
				category: "Move Funds",
				note: "Pocket balance transfer",
				pocket: sourcePocketName,
				raw: {},
			});
			// Target Addition
			addDemoTransaction({
				date: dateStr,
				name: `${sourcePocketName || "Total Worth"} -> ${targetPocketName}`,
				amount: amount,
				type: "income",
				category: "Move Funds",
				note: "Pocket balance transfer",
				pocket: targetPocketName,
				raw: {},
			});
			setStatusModal({
				isOpen: true,
				type: "success",
				title: language === "en" ? "Funds Moved Successfully" : "Dana Berhasil Dipindahkan",
				description: language === "en" 
					? `Successfully moved Rp ${formatCurrency(amount)} to "${targetPocketName}".`
					: `Berhasil memindahkan Rp ${formatCurrency(amount)} ke "${targetPocketName}".`
			});
			return;
		}

		// ─── Supabase Mode ────────────────────────────────────────────────────
		if (supabaseUser) {
			setLoading(true);
			try {
				const hasMissingPocketId = localStorage.getItem("supabase_missing_pocket_id") === "true";
				
				// Find pocket IDs
				const sourcePocketObj = pockets.find(p => p.name === sourcePocketName);
				const targetPocketObj = pockets.find(p => p.name === targetPocketName);

				const payloadSource: any = {
					user_id: supabaseUser.id,
					date: new Date().toISOString(),
					name: `${sourcePocketName || "Total Worth"} -> ${targetPocketName}`,
					amount: amount,
					type: "expense",
					category: "Move Funds",
					note: "Pocket balance transfer",
					custom_fields: {},
				};
				if (!hasMissingPocketId) {
					payloadSource.pocket_id = sourcePocketObj ? sourcePocketObj.id : null;
				} else {
					payloadSource.custom_fields = { pocket_id: sourcePocketObj ? sourcePocketObj.id : null };
				}

				const payloadTarget: any = {
					user_id: supabaseUser.id,
					date: new Date().toISOString(),
					name: `${sourcePocketName || "Total Worth"} -> ${targetPocketName}`,
					amount: amount,
					type: "income",
					category: "Move Funds",
					note: "Pocket balance transfer",
					custom_fields: {},
				};
				if (!hasMissingPocketId) {
					payloadTarget.pocket_id = targetPocketObj ? targetPocketObj.id : null;
				} else {
					payloadTarget.custom_fields = { pocket_id: targetPocketObj ? targetPocketObj.id : null };
				}

				const { error: err1 } = await supabase.from("transactions").insert(payloadSource);
				if (err1) throw err1;
				const { error: err2 } = await supabase.from("transactions").insert(payloadTarget);
				if (err2) throw err2;

				await fetchSupabaseUserData(supabaseUser.id);
				setStatusModal({
					isOpen: true,
					type: "success",
					title: language === "en" ? "Funds Moved Successfully" : "Dana Berhasil Dipindahkan",
					description: language === "en" 
						? `Successfully moved Rp ${formatCurrency(amount)} to "${targetPocketName}".`
						: `Berhasil memindahkan Rp ${formatCurrency(amount)} ke "${targetPocketName}".`
				});
			} catch (err: any) {
				setStatusModal({ isOpen: true, type: "error", title: "Move Funds Failed", description: err.message });
			} finally {
				setLoading(false);
			}
			return;
		}

		// ─── Google Sheets Mode ───────────────────────────────────────────────
		const activeSheetId = config.sheetId || localStorage.getItem("sheetId");
		const activeToken = user?.accessToken || JSON.parse(localStorage.getItem("googleUser") || "{}").accessToken;

		if (!activeToken || !activeSheetId) {
			setStatusModal({ isOpen: true, type: "error", title: "Connection Error", description: "Please sync your Google account first." });
			return;
		}

		const currentMonth = getCurrentMonthSheetName();
		setLoading(true);
		try {
			const internalSheetId = await ensureAndGetSheetId(activeSheetId, currentMonth, activeToken, handleAuthError);
			await initializeSheetFormatting(activeSheetId, activeToken, currentMonth, internalSheetId, customFields);

			// Source row
			const sourceValues = headers.map((h) => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date")) return new Date().toISOString();
				if (hL.includes("nama") || hL.includes("name")) return `${sourcePocketName || "Total Worth"} -> ${targetPocketName}`;
				if (hL.includes("jumlah") || hL.includes("amount")) return amount.toString();
				if (hL.includes("tipe") || hL.includes("type")) return "expense";
				if (hL.includes("kategori") || hL.includes("category")) return "Move Funds";
				if (hL.includes("pocket") || hL.includes("kantong")) return sourcePocketName;
				if (hL.includes("catatan") || hL.includes("note")) return "Pocket balance transfer";
				return "";
			});

			// Target row
			const targetValues = headers.map((h) => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date")) return new Date().toISOString();
				if (hL.includes("nama") || hL.includes("name")) return `${sourcePocketName || "Total Worth"} -> ${targetPocketName}`;
				if (hL.includes("jumlah") || hL.includes("amount")) return amount.toString();
				if (hL.includes("tipe") || hL.includes("type")) return "income";
				if (hL.includes("kategori") || hL.includes("category")) return "Move Funds";
				if (hL.includes("pocket") || hL.includes("kantong")) return targetPocketName;
				if (hL.includes("catatan") || hL.includes("note")) return "Pocket balance transfer";
				return "";
			});

			await appendRowToSheet(activeSheetId, currentMonth, activeToken, sourceValues);
			await appendRowToSheet(activeSheetId, currentMonth, activeToken, targetValues);

			setSelectedMonth(currentMonth);
			await fetchSheetData(activeSheetId, activeToken, currentMonth);
			fetchAvailableMonths(activeSheetId, activeToken);
			setStatusModal({
				isOpen: true,
				type: "success",
				title: language === "en" ? "Funds Moved Successfully" : "Dana Berhasil Dipindahkan",
				description: language === "en" 
					? `Successfully moved Rp ${formatCurrency(amount)} to "${targetPocketName}".`
					: `Berhasil memindahkan Rp ${formatCurrency(amount)} ke "${targetPocketName}".`
			});
		} catch (err: any) {
			setStatusModal({ isOpen: true, type: "error", title: "Move Funds Failed", description: err.message });
		} finally {
			setLoading(false);
		}
	};

	const updateSupabaseSettings = async (
		cats: string[],
		fields: CustomFieldDef[],
		charts: CustomChartConfig[],
		pocketsList: PocketDef[] = pockets
	) => {
		if (!supabaseUser) return;
		try {
			const hasMissingColumn = localStorage.getItem("supabase_missing_custom_pockets") === "true";
			const payload: any = {
				user_id: supabaseUser.id,
				custom_categories: cats,
				custom_field_defs: fields,
				custom_chart_configs: charts,
				updated_at: new Date().toISOString()
			};
			if (!hasMissingColumn) {
				payload.custom_pockets = pocketsList;
			}
			let { error } = await supabase.from("user_settings").upsert(payload);
			if (error && error.message.includes("custom_pockets")) {
				localStorage.setItem("supabase_missing_custom_pockets", "true");
				delete payload.custom_pockets;
				const retry = await supabase.from("user_settings").upsert(payload);
				error = retry.error;
				localStorage.setItem("customPockets", JSON.stringify(pocketsList));
			}
			if (hasMissingColumn) {
				localStorage.setItem("customPockets", JSON.stringify(pocketsList));
			}
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
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken, handleAuthError);
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
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken, handleAuthError);
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
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken, handleAuthError);
			const colIndex = CORE_FIELDS_COUNT + deleteConfirmIndex;
			await deleteSheetColumn(config.sheetId, user.accessToken, internalSheetId, colIndex);
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
		if (isDemoMode) {
			localStorage.setItem("demo_customChartConfigs", JSON.stringify(updated));
			return;
		}
		if (supabaseUser) {
			await updateSupabaseSettings(categories, customFields, updated);
		} else {
			localStorage.setItem("customChartConfigs", JSON.stringify(updated));
		}
	};

	const handleDeleteCustomChart = async (idx: number) => {
		const updated = customChartConfigs.filter((_, i) => i !== idx);
		setCustomChartConfigs(updated);
		if (isDemoMode) {
			localStorage.setItem("demo_customChartConfigs", JSON.stringify(updated));
			return;
		}
		if (supabaseUser) {
			await updateSupabaseSettings(categories, customFields, updated);
		} else {
			localStorage.setItem("customChartConfigs", JSON.stringify(updated));
		}
	};

	const handleUpdatePockets = async (updatedList: PocketDef[]) => {
		const deletedPockets = pockets.filter(p => !updatedList.some(up => up.id === p.id));
		setPockets(updatedList);
		
		// ALWAYS backup/sync to localStorage to prevent stale state loading on page transition/refresh
		localStorage.setItem("customPockets", JSON.stringify(updatedList));

		if (isDemoMode) {
			localStorage.setItem("demo_pockets", JSON.stringify(updatedList));
			const storedDemoTxs = localStorage.getItem("demo_transactions");
			if (storedDemoTxs) {
				try {
					const txs = JSON.parse(storedDemoTxs);
					let changed = false;
					txs.forEach((tx: any) => {
						const isDeleted = deletedPockets.some(dp => dp.id === tx.pocket_id || dp.name === tx.pocket);
						if (isDeleted) {
							tx.pocket_id = null;
							tx.pocket = "";
							changed = true;
						}
					});
					if (changed) {
						localStorage.setItem("demo_transactions", JSON.stringify(txs));
					}
				} catch (e) {}
			}
			return;
		}
		if (supabaseUser) {
			await updateSupabaseSettings(categories, customFields, customChartConfigs, updatedList);
			for (const dp of deletedPockets) {
				try {
					await supabase
						.from("transactions")
						.update({ pocket_id: null })
						.eq("pocket_id", dp.id);
				} catch (e) {
					console.error("Failed to clean up pocket transactions in DB:", e);
				}
			}
		} else {
			localStorage.setItem("customPockets", JSON.stringify(updatedList));
		}
	};

	const getPocketBalance = (pocket: PocketDef) => {
		if (pocket.id === "net_worth") {
			return transactions.reduce((sum, t) => sum + t.amount, 0);
		}
		return transactions
			.filter(t => t.pocket === pocket.name || t.pocket === pocket.id)
			.reduce((sum, t) => sum + t.amount, 0);
	};

	const checkAndProcessRecurring = React.useCallback(async () => {
		if (sessionStorage.getItem("recurringChecked")) return;
		sessionStorage.setItem("recurringChecked", "true");

		const savedTemplatesStr = localStorage.getItem("recurringTemplates");
		if (!savedTemplatesStr) return;

		try {
			const templates = JSON.parse(savedTemplatesStr);
			const now = new Date();
			let hasNew = false;
			const newTxs: any[] = [];

			for (const t of templates) {
				const nextRun = new Date(t.next_execution_at);
				if (nextRun <= now) {
					hasNew = true;
					const isExpense = t.type === "expense";
					const newTx = {
						date: new Date().toISOString(),
						name: t.name,
						amount: isExpense ? -Math.abs(t.amount) : Math.abs(t.amount),
						type: isExpense ? "Pengeluaran / Expense" : "Pemasukan / Income",
						category: t.category,
						note: t.note || "Automated Recurring",
						pocket: t.pocket || ""
					};
					newTxs.push(newTx);
					
					const intervalVal = t.interval_value || 1;
					if (t.interval_unit === "daily") {
						nextRun.setDate(nextRun.getDate() + intervalVal);
					} else if (t.interval_unit === "weekly") {
						nextRun.setDate(nextRun.getDate() + 7 * intervalVal);
					} else if (t.interval_unit === "monthly") {
						nextRun.setMonth(nextRun.getMonth() + intervalVal);
					} else if (t.interval_unit === "hourly") {
						nextRun.setHours(nextRun.getHours() + intervalVal);
					}
					t.next_execution_at = nextRun.toISOString();
					t.last_executed_at = now.toISOString();
				}
			}

			if (hasNew) {
				localStorage.setItem("recurringTemplates", JSON.stringify(templates));
				const activeMonth = getCurrentMonthSheetName();
				
				if (supabaseUser) {
					const hasMissingPocketId = localStorage.getItem("supabase_missing_pocket_id") === "true";
					for (const tx of newTxs) {
						const pocketId = pockets.find(p => p.name === tx.pocket)?.id || "pocket_1";
						const insertPayload: any = {
							user_id: supabaseUser.id,
							date: new Date().toISOString(),
							name: tx.name,
							amount: Math.abs(tx.amount),
							type: tx.amount < 0 ? "expense" : "income",
							category: tx.category,
							note: tx.note
						};
						if (!hasMissingPocketId) {
							insertPayload.pocket_id = pocketId;
						} else {
							insertPayload.custom_fields = { pocket_id: pocketId };
						}
						let { error } = await supabase.from("transactions").insert(insertPayload);
						if (error && error.message.includes("pocket_id")) {
							localStorage.setItem("supabase_missing_pocket_id", "true");
							delete insertPayload.pocket_id;
							insertPayload.custom_fields = { pocket_id: pocketId };
							const retryResult = await supabase.from("transactions").insert(insertPayload);
							error = retryResult.error;
						}
					}
					await fetchSupabaseUserData(supabaseUser.id);
				} else if (user?.accessToken && config.sheetId) {
					for (const tx of newTxs) {
						const values = headers.map(h => {
							const hL = h.toLowerCase();
							if (hL.includes("tanggal") || hL.includes("date")) return tx.date;
							if (hL.includes("nama") || hL.includes("name")) return tx.name;
							if (hL.includes("jumlah") || hL.includes("amount")) return Math.abs(tx.amount).toString();
							if (hL.includes("tipe") || hL.includes("type")) return tx.type;
							if (hL.includes("kategori") || hL.includes("category")) return tx.category;
							if (hL.includes("catatan") || hL.includes("note")) return tx.note;
							if (hL.includes("pocket") || hL.includes("kantong")) return tx.pocket;
							return "";
						});
						await appendRowToSheet(config.sheetId, activeMonth, user.accessToken, values);
					}
					await fetchSheetData(config.sheetId, user.accessToken, activeMonth);
				} else {
					const currentLocal = localStorage.getItem("localTransactions") || "[]";
					const currentList = JSON.parse(currentLocal);
					localStorage.setItem("localTransactions", JSON.stringify([...newTxs, ...currentList]));
					setAllTransactions(prev => [...newTxs, ...prev]);
				}

				setStatusModal({
					isOpen: true,
					type: "success",
					title: "Transaksi Otomatis",
					description: `${newTxs.length} transaksi berulang berhasil dicatat!`
				});
			}
		} catch (e) {
			console.error("Error checking recurring templates:", e);
		}
	}, [supabaseUser, user, config, headers, pockets, selectedMonth]);

	React.useEffect(() => {
		if (transactions.length > 0) {
			checkAndProcessRecurring();
		}
	}, [transactions, checkAndProcessRecurring]);

	const handleAddRecurringTemplate = (template: any) => {
		const updated = [...recurringTemplates, template];
		setRecurringTemplates(updated);
		localStorage.setItem("recurringTemplates", JSON.stringify(updated));
	};

	const handleDeleteRecurringTemplate = (id: string) => {
		const updated = recurringTemplates.filter(t => t.id !== id);
		setRecurringTemplates(updated);
		localStorage.setItem("recurringTemplates", JSON.stringify(updated));
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
		isAddToHomeOpen, setIsAddToHomeOpen, deferredPrompt, isInstallable, triggerInstall, isStandaloneMode,
		pockets, activePocketIdx, setActivePocketIdx, handleUpdatePockets, getPocketBalance, handleMoveFunds,
		recurringTemplates, handleAddRecurringTemplate, handleDeleteRecurringTemplate,
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

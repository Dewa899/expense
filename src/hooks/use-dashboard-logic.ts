"use client";

import * as React from "react";
import { useLanguage } from "@/components/language-provider";

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

export function useDashboardLogic() {
	const { t } = useLanguage();
	const [view, setView] = React.useState<"form" | "analytics">("form");
	const [headers, setHeaders] = React.useState<string[]>([]);
	const [categories, setCategories] = React.useState<string[]>([]);
	const [customFields, setCustomFields] = React.useState<CustomFieldDef[]>([]);
	const [customChartConfigs, setCustomChartConfigs] = React.useState<CustomChartConfig[]>([]);
	const [transactions, setTransactions] = React.useState<Transaction[]>([]);
	const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);
	const [selectedMonth, setSelectedMonth] = React.useState<string>("");
	const [newCategoryInput, setNewCategoryInput] = React.useState("");
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [loading, setLoading] = React.useState(false);
	const [isIntegrating, setIsIntegrating] = React.useState(false);
	const [totalAmount, setTotalAmount] = React.useState(0);
	const [user, setUser] = React.useState<{ name: string; accessToken: string; } | null>(null);
	const [config, setConfig] = React.useState({ sheetId: "" });

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
		const cleaned = val.toString().replace(/Rp/g, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
		return Math.abs(parseFloat(cleaned)) || 0;
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

			// PERSIST
			localStorage.setItem("sheetId", spreadsheetId);
			const newUser = { name: "Google User", accessToken: token };
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
			// Just verify if the previous month exists by fetching only A1
			const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(prevMonthName)}!A1:B1`, { headers: { Authorization: `Bearer ${token}` } });
			const data = await res.json();
			
			// If previous sheet exists (doesn't throw 400 error)
			if (!data.error) {
				const netFormula = `SUMIF('${prevMonthName}'!D:D, "Pemasukan / Income", '${prevMonthName}'!C:C) - SUMIF('${prevMonthName}'!D:D, "Pengeluaran / Expense", '${prevMonthName}'!C:C)`;
				const amountFormula = `=ABS(${netFormula})`;
				const typeFormula = `=IF((${netFormula}) >= 0, "Pemasukan / Income", "Pengeluaran / Expense")`;

				const values = [
					new Date().toLocaleString(),
					`${t("initialBalance")} (${prevMonthName})`,
					amountFormula,
					typeFormula,
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
		localStorage.removeItem("googleUser");
		setUser(null);
		setStatusModal({
			isOpen: true,
			type: "error",
			title: "Session Expired",
			description: "Token autentikasi Google Anda telah kadaluarsa (expired). Silakan lakukan Sync ulang."
		});
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

	const handleGoogleLogin = (forceAccountSelection = false) => {
		const scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"].join(" ");
		const promptParam = forceAccountSelection ? "&prompt=select_account" : "";
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${window.location.origin}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true${promptParam}`;
		window.location.href = authUrl;
	};

	// Main Initialization logic
	React.useEffect(() => {
		const init = async () => {
			console.log("Initializing App State...");
			
			// 1. Load Local UI Configs (Always loaded first)
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
			
			// 1. Check for OAuth Hash first (SYNC ACTION)
			if (hash && hash.includes("access_token")) {
				console.log("OAuth Access Token detected in URL.");
				const params = new URLSearchParams(hash.substring(1));
				token = params.get("access_token") || "";
				if (token) {
					window.history.replaceState({}, document.title, window.location.pathname);
				}
			}

			if (token) {
				globalIntegrationToken = token;
			} else {
				token = globalIntegrationToken;
			}

			if (token) {
				// IMMEDIATELY LOCK UI
				setIsIntegrating(true);
				setLoading(true);
				
				if (!isGlobalIntegrating) {
					isGlobalIntegrating = true;
					globalIntegrationResult = null;
					globalIntegrationError = "";
					// START INTEGRATION
					await setupGoogleSheet(token);
					isGlobalIntegrating = false;
					globalIntegrationToken = "";
				} else {
					console.log("Another instance is integrating. Polling for completion...");
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
							} else if (globalIntegrationResult === "error") {
								setStatusModal({ 
									isOpen: true, 
									type: "error", 
									title: "Sync Failed", 
									description: globalIntegrationError || "An error occurred while connecting to Google." 
								});
							}
							setIsIntegrating(false);
							setLoading(false);
						}
					}, 500);
				}
				return; 
			}

			// 2. Fallback to localStorage for Google Sheet related
			const savedSheetId = localStorage.getItem("sheetId") || "";
			const savedUser = localStorage.getItem("googleUser");

			if (savedUser) {
				const parsedUser = JSON.parse(savedUser);
				setUser(parsedUser);
				if (savedSheetId) {
					setConfig({ sheetId: savedSheetId });
					const current = getCurrentMonthSheetName();
					setSelectedMonth(current);
					
					// Proactively create sheet & carry forward balance if a new month just started
					const doInit = async () => {
						setLoading(true);
						if (!globalInitPromise) {
							globalInitPromise = ensureAndGetSheetId(savedSheetId, current, parsedUser.accessToken)
								.then(async () => {
									await fetchSheetData(savedSheetId, parsedUser.accessToken, current);
									await fetchAvailableMonths(savedSheetId, parsedUser.accessToken);
								})
								.catch((e) => {
									console.error("Proactive sheet creation failed:", e);
									fetchSheetData(savedSheetId, parsedUser.accessToken, current);
								})
								.finally(() => {
									globalInitPromise = null;
								});
						} else {
							// Strict mode double-mount handler: Wait for mount 1, then fetch our own localized state
							await globalInitPromise;
							fetchSheetData(savedSheetId, parsedUser.accessToken, current);
							fetchAvailableMonths(savedSheetId, parsedUser.accessToken);
						}
					};
					doInit();
				} else setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
			} else {
				console.log("No user found, showing default view.");
				setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
			}
		};

		init();
	}, []);

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async () => {
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
				if (hL.includes("jumlah") || hL.includes("amount")) val = Math.abs(parseFloat(val)).toString();
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

	const handleAddCategory = () => {
		if (!newCategoryInput.trim() || categories.includes(newCategoryInput.trim())) return;
		const updated = [...categories, newCategoryInput.trim()];
		setCategories(updated);
		localStorage.setItem("customCategories", JSON.stringify(updated));
		setNewCategoryInput("");
	};

	const handleDeleteCategory = (cat: string) => {
		const updated = categories.filter((c) => c !== cat);
		setCategories(updated);
		localStorage.setItem("customCategories", JSON.stringify(updated));
	};

	const handleAddField = async () => {
		if (!newFieldName.trim() || customFields.length >= 2 || !user?.accessToken || !config.sheetId) return;
		const newField: CustomFieldDef = { name: newFieldName.trim(), type: newFieldType, required: newFieldRequired, options: newFieldType === "dropdown" ? ["Default"] : [] };
		const updatedFields = [...customFields, newField];
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
		if (idx === -1 || !name.trim() || !user?.accessToken || !config.sheetId) return;
		const updatedFields = [...customFields];
		updatedFields[idx].name = name.trim();
		updatedFields[idx].type = type;
		updatedFields[idx].required = req;
		if (type === "dropdown" && (!updatedFields[idx].options || updatedFields[idx].options.length === 0)) {
			updatedFields[idx].options = ["Default"];
		}
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
		if (deleteConfirmIndex === -1 || !user?.accessToken || !config.sheetId) return;
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
			const updatedFields = customFields.filter((_, i) => i !== deleteConfirmIndex);
			const fieldNameToDelete = customFields[deleteConfirmIndex].name;
			const updatedCharts = customChartConfigs.filter(c => c.fieldName !== fieldNameToDelete);
			setCustomChartConfigs(updatedCharts);
			localStorage.setItem("customChartConfigs", JSON.stringify(updatedCharts));
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			setDeleteConfirmIndex(-1);
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to delete column"); } finally { setLoading(false); }
	};

	const handleAddOptionToField = (idx: number, input: string) => {
		if (idx === -1 || !input.trim()) return;
		const updatedFields = [...customFields];
		const field = updatedFields[idx];
		if (!field.options) field.options = [];
		if (field.options.includes(input.trim())) return;
		field.options.push(input.trim());
		setCustomFields(updatedFields);
		localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
		setNewOptionInput("");
	};

	const handleDeleteOptionFromField = (idx: number, optToDelete: string) => {
		if (idx === -1) return;
		const updatedFields = [...customFields];
		const field = updatedFields[idx];
		if (field.options) {
			field.options = field.options.filter(o => o !== optToDelete);
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
		}
	};

	const handleAddCustomChart = (config: CustomChartConfig) => {
		if (customChartConfigs.length >= 2) return;
		const updated = [...customChartConfigs, config];
		setCustomChartConfigs(updated);
		localStorage.setItem("customChartConfigs", JSON.stringify(updated));
	};

	const handleDeleteCustomChart = (idx: number) => {
		const updated = customChartConfigs.filter((_, i) => i !== idx);
		setCustomChartConfigs(updated);
		localStorage.setItem("customChartConfigs", JSON.stringify(updated));
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
		handleSetInitialBalance,
		handleGoogleLogin, handleMonthChange, resetToCurrentMonth, handleSubmit,
		isIntegrating,
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

import * as React from "react";
import {
	CORE_HEADERS_DUAL,
	getCurrentMonthSheetName,
	fetchDriveFolder,
	createDriveFolder,
	fetchDriveSpreadsheet,
	createDriveSpreadsheet,
	ensureAndGetSheetId,
	initializeSheetFormatting,
	handleInitialBalanceCarryForward,
	cleanupDuplicateInitialBalances,
	fetchUserProfile,
	cleanNumber
} from "@/lib/sheets-api";
import { CustomFieldDef, StatusModalState } from "./types";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface UseGoogleSyncOptions {
	supabaseUser: any;
	setLoading: React.Dispatch<React.SetStateAction<boolean>>;
	setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
	setCategories: React.Dispatch<React.SetStateAction<string[]>>;
	setCustomFields: React.Dispatch<React.SetStateAction<CustomFieldDef[]>>;
	setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
	setTotalAmount: React.Dispatch<React.SetStateAction<number>>;
	setAvailableMonths: React.Dispatch<React.SetStateAction<string[]>>;
	setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
	customFields: CustomFieldDef[];
	t: (key: string) => string;
	setStatusModal: React.Dispatch<React.SetStateAction<StatusModalState>>;
}

export function useGoogleSync({
	supabaseUser,
	setLoading,
	setHeaders,
	setCategories,
	setCustomFields,
	setTransactions,
	setTotalAmount,
	setAvailableMonths,
	setSelectedMonth,
	customFields,
	t,
	setStatusModal
}: UseGoogleSyncOptions) {
	const [user, setUser] = React.useState<{ name: string; email?: string; photo?: string; accessToken: string; } | null>(null);
	const [config, setConfig] = React.useState({ sheetId: "" });
	const [isGoogleConnected, setIsGoogleConnected] = React.useState(false);
	const [googleEmail, setGoogleEmail] = React.useState("");
	const [isIntegrating, setIsIntegrating] = React.useState(false);
	const initializedMonthsRef = React.useRef<Record<string, boolean>>({});

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

	const handleAuthError = React.useCallback(() => {
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
	}, [t, setStatusModal]);

	const fetchSheetData = React.useCallback(async (sheetId: string, token: string, sheetName: string): Promise<any[][] | null> => {
		if (!sheetId || !token) return null;
		console.log("Fetching sheet data for:", sheetName);
		try {
			setLoading(true);
			const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:H`, { headers: { Authorization: `Bearer ${token}` } });
			const data = await response.json();
			if (response.status === 401 || data.error?.code === 401) {
				handleAuthError();
				return null;
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
				return data.values;
			} else { 
				setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
				setTotalAmount(0); 
				setTransactions([]); 
				return [];
			}
		} catch (error) { 
			console.error("Fetch Error:", error);
			setHeaders([...CORE_HEADERS_DUAL, ...customFields.map(f => f.name)]);
			return null;
		} finally { 
			setLoading(false); 
		}
	}, [setLoading, setHeaders, setTransactions, setTotalAmount, setCategories, setCustomFields, customFields, handleAuthError]);

	const fetchAvailableMonths = React.useCallback(async (spreadsheetId: string, token: string) => {
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
	}, [setAvailableMonths, handleAuthError]);

	const setupGoogleSheet = React.useCallback(async (token: string) => {
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
			const { sheetId: internalSheetId, availableMonths } = await ensureAndGetSheetId(spreadsheetId, sheetName, token, handleAuthError);

			await initializeSheetFormatting(spreadsheetId, token, sheetName, internalSheetId, customFields);
			await handleInitialBalanceCarryForward(spreadsheetId, sheetName, token, t("initialBalance"), t("fromPreviousMonth"));
			await cleanupDuplicateInitialBalances(spreadsheetId, sheetName, token, undefined, internalSheetId);
			initializedMonthsRef.current[sheetName] = true;

			let profile = { name: "Google User", email: "", photo: "" };
			try {
				profile = await fetchUserProfile(token);
			} catch (err) {
				console.error("Error fetching user profile:", err);
			}

			localStorage.setItem("sheetId", spreadsheetId);
			const newUser = { name: profile.name, email: profile.email, photo: profile.photo, accessToken: token };
			localStorage.setItem("googleUser", JSON.stringify(newUser));

			console.log("Setup complete, updating states...");
			setUser(newUser);
			setConfig({ sheetId: spreadsheetId });
			setSelectedMonth(sheetName);
			
			await fetchSheetData(spreadsheetId, token, sheetName);
			setAvailableMonths(availableMonths);

			setStatusModal({ 
				isOpen: true, 
				type: "success", 
				title: t("syncSuccessTitle"), 
				description: t("syncSuccessDesc") 
			});
		} catch (error: any) { 
			console.error("Setup Error:", error);
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
	}, [setLoading, setStatusModal, handleAuthError, customFields, t, setUser, setConfig, setSelectedMonth, fetchSheetData, fetchAvailableMonths]);

	const handleGoogleLogin = React.useCallback(async (forceAccountSelection = false) => {
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
	}, [supabaseUser, setLoading]);

	return {
		user,
		setUser,
		config,
		setConfig,
		isGoogleConnected,
		setIsGoogleConnected,
		googleEmail,
		setGoogleEmail,
		isIntegrating,
		setIsIntegrating,
		initializedMonthsRef,
		checkGoogleConnectionStatus,
		fetchSheetData,
		setupGoogleSheet,
		handleAuthError,
		fetchAvailableMonths,
		handleGoogleLogin
	};
}

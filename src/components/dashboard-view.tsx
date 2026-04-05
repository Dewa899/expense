"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Link as LinkIcon, Camera, History, Wallet, CheckCircle2, AlertCircle, Settings2, Trash2, ListTree, ChevronLeft, Pencil, LogOut, BarChart3, ArrowLeft, TrendingUp, TrendingDown, PieChart as PieChartIcon, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	AreaChart,
	Area,
	Legend
} from "recharts";

const GOOGLE_CLIENT_ID =
	"151196003585-j4f3p4j6d3g45o3a4lrfabc7fv6c6s18.apps.googleusercontent.com";

type CustomFieldDef = {
	name: string;
	type: "text" | "dropdown";
	required: boolean;
	options?: string[];
};

type Transaction = {
	date: string;
	name: string;
	amount: number;
	type: string;
	category: string;
	note: string;
};

export function DashboardView() {
	const { t } = useLanguage();
	const [view, setView] = React.useState<"form" | "analytics">("form");
	const [headers, setHeaders] = React.useState<string[]>([]);
	const [categories, setCategories] = React.useState<string[]>([]);
	const [customFields, setCustomFields] = React.useState<CustomFieldDef[]>([]);
	const [transactions, setTransactions] = React.useState<Transaction[]>([]);
	const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);
	const [selectedMonth, setSelectedMonth] = React.useState<string>("");
	const [newCategoryInput, setNewCategoryInput] = React.useState("");
	
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [loading, setLoading] = React.useState(false);
	const [totalAmount, setTotalAmount] = React.useState(0);
	const [user, setUser] = React.useState<{ name: string; accessToken: string; } | null>(null);
	const [config, setConfig] = React.useState({ sheetId: "" });

	// UI States
	const [isManageFieldsOpen, setIsManageFieldsOpen] = React.useState(false);
	const [isDisconnectModalOpen, setIsDisconnectModalOpen] = React.useState(false);
	const [newFieldName, setNewFieldName] = React.useState("");
	const [newFieldType, setNewFieldType] = React.useState<"text" | "dropdown">("text");
	const [newFieldRequired, setNewFieldRequired] = React.useState(true);
	const [editingOptionsIdx, setEditingOptionsIdx] = React.useState<number>(-1);
	const [renamingIdx, setRenamingIdx] = React.useState<number>(-1);
	const [renamingInput, setRenamingInput] = React.useState("");
	const [renamingType, setRenamingType] = React.useState<"text" | "dropdown">("text");
	const [renamingRequired, setRenamingRequired] = React.useState(true);
	const [newOptionInput, setNewOptionInput] = React.useState("");
	const [deleteConfirm, setDeleteConfirm] = React.useState<{ isOpen: boolean; fieldName: string; index: number }>({ isOpen: false, fieldName: "", index: -1 });

	const [statusModal, setStatusModal] = React.useState<{ isOpen: boolean; type: "success" | "error" | null; title: string; description: string; }>({
		isOpen: false, type: null, title: "", description: "",
	});

	const DEFAULT_HEADERS = ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];
	const CORE_FIELDS_COUNT = 6;
	const CORE_HEADERS_DUAL = ["Date / Tanggal", "Name / Nama", "Amount / Jumlah", "Type / Tipe", "Category / Kategori", "Note / Catatan"];

	const getCurrentMonthSheetName = () => {
		const now = new Date();
		return now.toLocaleString("id-ID", { month: "long", year: "numeric" });
	};

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val).replace("Rp", "Rp ");
	};

	const cleanNumber = (val: any): number => {
		if (typeof val === "number") return Math.abs(val);
		if (!val) return 0;
		const cleaned = val.toString().replace(/Rp/g, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
		return Math.abs(parseFloat(cleaned)) || 0;
	};

	React.useEffect(() => {
		const savedSheetId = localStorage.getItem("sheetId") || "";
		const savedUser = localStorage.getItem("googleUser");
		const savedCats = localStorage.getItem("customCategories");
		const savedFields = localStorage.getItem("customFieldDefs");

		if (savedCats) setCategories(JSON.parse(savedCats));
		else {
			const defaultCats = ["Food", "Transport", "Bills", "Shopping", "Salary", "Gift"];
			setCategories(defaultCats);
			localStorage.setItem("customCategories", JSON.stringify(defaultCats));
		}

		if (savedFields) setCustomFields(JSON.parse(savedFields));

		if (savedUser) {
			const parsedUser = JSON.parse(savedUser);
			setUser(parsedUser);
			if (savedSheetId) {
				setConfig({ sheetId: savedSheetId });
				const current = getCurrentMonthSheetName();
				setSelectedMonth(current);
				fetchSheetData(savedSheetId, parsedUser.accessToken, current);
				fetchAvailableMonths(savedSheetId, parsedUser.accessToken);
			} else setHeaders(DEFAULT_HEADERS);
		} else setHeaders(DEFAULT_HEADERS);
	}, []);

	// Clean Coder: Handle OAuth callback
	React.useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.includes("access_token")) {
			const params = new URLSearchParams(hash.substring(1));
			const token = params.get("access_token");
			if (token) {
				const newUser = { name: "Google User", accessToken: token };
				setUser(newUser);
				localStorage.setItem("googleUser", JSON.stringify(newUser));
				window.history.replaceState({}, document.title, window.location.pathname);
				setupGoogleSheet(token);
			}
		}
	}, []);

	// Management Functions
	const fetchAvailableMonths = async (spreadsheetId: string, token: string) => {
		try {
			const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, { headers: { Authorization: `Bearer ${token}` } });
			const metadata = await metadataRes.json();
			if (metadata.sheets) {
				const months = metadata.sheets.map((s: any) => s.properties.title);
				setAvailableMonths(months);
			}
		} catch (e) { console.error("Failed to fetch months"); }
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

	const handleUpdateField = async (idx: number) => {
		if (idx === -1 || !renamingInput.trim() || !user?.accessToken || !config.sheetId) return;
		const updatedFields = [...customFields];
		updatedFields[idx].name = renamingInput.trim();
		updatedFields[idx].type = renamingType;
		updatedFields[idx].required = renamingRequired;
		if (renamingType === "dropdown" && (!updatedFields[idx].options || updatedFields[idx].options.length === 0)) {
			updatedFields[idx].options = ["Default"];
		}
		setLoading(true);
		try {
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken);
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			await initializeSheetFormatting(config.sheetId, user.accessToken, sheetName, internalSheetId, updatedFields);
			setRenamingIdx(-1);
			setRenamingInput("");
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to update field"); } finally { setLoading(false); }
	};

	const handleDeleteField = async () => {
		if (deleteConfirm.index === -1 || !user?.accessToken || !config.sheetId) return;
		setLoading(true);
		try {
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken);
			const colIndex = CORE_FIELDS_COUNT + deleteConfirm.index;
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}:batchUpdate`, {
				method: "POST",
				headers: { Authorization: `Bearer ${user.accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: colIndex, endIndex: colIndex + 1 } } }] })
			});
			const updatedFields = customFields.filter((_, i) => i !== deleteConfirm.index);
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			setDeleteConfirm({ isOpen: false, fieldName: "", index: -1 });
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to delete column"); } finally { setLoading(false); }
	};

	const handleDisconnect = () => {
		localStorage.clear();
		window.location.reload();
	};

	const handleGoogleLogin = () => {
		const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
		const redirectUri = window.location.origin;
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true`;
		window.location.href = authUrl;
	};

	const setupGoogleSheet = async (token: string) => {
		setLoading(true);
		try {
			const folderSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='expense by genlord' and mimeType='application/vnd.google-apps.folder' and trashed=false`, { headers: { Authorization: `Bearer ${token}` } });
			const folderSearchData = await folderSearchRes.json();
			let folderId = folderSearchData.files?.[0]?.id;
			if (!folderId) {
				const folderCreateRes = await fetch("https://www.googleapis.com/drive/v3/files", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ name: "expense by genlord", mimeType: "application/vnd.google-apps.folder" }),
				});
				const folderData = await folderCreateRes.json();
				folderId = folderData.id;
			}
			const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='Expense Tracker' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`, { headers: { Authorization: `Bearer ${token}` } });
			const searchData = await searchRes.json();
			let spreadsheetId = searchData.files?.[0]?.id;
			if (!spreadsheetId) {
				const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ name: "Expense Tracker", mimeType: "application/vnd.google-apps.spreadsheet", parents: [folderId] }),
				});
				const createData = await createRes.json();
				spreadsheetId = createData.id;
			}
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(spreadsheetId, sheetName, token);
			await initializeSheetFormatting(spreadsheetId, token, sheetName, internalSheetId);
			localStorage.setItem("sheetId", spreadsheetId);
			setConfig({ sheetId: spreadsheetId });
			setSelectedMonth(sheetName);
			fetchSheetData(spreadsheetId, token, sheetName);
			fetchAvailableMonths(spreadsheetId, token);
		} catch (error: any) { setStatusModal({ isOpen: true, type: "error", title: "Sync Failed", description: error.message }); } finally { setLoading(false); }
	};

	const ensureAndGetSheetId = async (spreadsheetId: string, sheetName: string, token: string): Promise<number> => {
		const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
		const metadata = await metadataRes.json();
		const existingSheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName);
		const sheet1 = metadata.sheets?.find((s: any) => s.properties?.title === "Sheet1");
		let targetSheetId: number;
		if (!existingSheet) {
			const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
			});
			const createData = await createRes.json();
			targetSheetId = createData.replies[0].addSheet.properties.sheetId;
		} else targetSheetId = existingSheet.properties.sheetId;
		if (sheet1 && sheet1.properties?.title !== sheetName) {
			const totalSheets = metadata.sheets?.length || 0;
			if (totalSheets > 1) {
				try {
					await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
						method: "POST",
						headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
						body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }] }),
					});
				} catch (e) {}
			}
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

	const fetchSheetData = async (sheetId: string, token: string, sheetName: string) => {
		try {
			setLoading(true);
			const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:H`, { headers: { Authorization: `Bearer ${token}` } });
			const data = await response.json();
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
						note: row[noteIdx] || ""
					};
				});
				
				setTransactions(rowData);
				setTotalAmount(rowData.reduce((sum: number, t: any) => sum + t.amount, 0));

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
			} else { setHeaders(DEFAULT_HEADERS); setTotalAmount(0); setTransactions([]); }
		} catch (error) { setHeaders(DEFAULT_HEADERS); } finally { setLoading(false); }
	};

	const translateHeader = (header: string) => {
		const h = header.toLowerCase();
		if (h.includes("nama") || h.includes("name")) return t("name");
		if (h.includes("jumlah") || h.includes("amount")) return t("amount");
		if (h.includes("tipe") || h.includes("type")) return t("transactionType");
		if (h.includes("kategori") || h.includes("category")) return t("category");
		if (h.includes("catatan") || h.includes("note")) return t("note");
		return header;
	};

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async () => {
		if (!user?.accessToken || !config.sheetId) return;
		const currentMonth = getCurrentMonthSheetName();
		const missingFields = headers.filter(h => {
			const hL = h.toLowerCase();
			if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note")) return false;
			const customField = customFields.find(f => f.name.toLowerCase() === hL);
			if (customField && !customField.required) return false;
			return !formData[h];
		});
		if (missingFields.length > 0) { setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); return; }
		setLoading(true);
		try {
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, currentMonth, user.accessToken);
			await initializeSheetFormatting(config.sheetId, user.accessToken, currentMonth, internalSheetId, customFields);
			const values = headers.map((h) => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date")) return new Date().toLocaleString();
				let val = formData[h] || "";
				if (hL.includes("jumlah") || hL.includes("amount")) {
					val = Math.abs(parseFloat(val)).toString();
				}
				return val;
			});
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(currentMonth)}!A1:append?valueInputOption=USER_ENTERED`, {
				method: "POST",
				headers: { Authorization: `Bearer ${user.accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ values: [values] }),
			});
			setFormData({});
			setSelectedMonth(currentMonth);
			await fetchSheetData(config.sheetId, user.accessToken, currentMonth);
			fetchAvailableMonths(config.sheetId, user.accessToken);
			setStatusModal({ isOpen: true, type: "success", title: t("successTitle"), description: t("successDesc") });
		} catch (error: any) { setStatusModal({ isOpen: true, type: "error", title: "Submission Failed", description: error.message }); } finally { setLoading(false); }
	};

	const handleMonthChange = (month: string | null) => {
		if (!month) return;
		setSelectedMonth(month);
		if (user?.accessToken) fetchSheetData(config.sheetId, user.accessToken, month);
	};

	// Analytics Logic
	const getDailyData = () => {
		const dailyMap: Record<string, number> = {};
		transactions.forEach(t => {
			const day = t.date.split(',')[0];
			dailyMap[day] = (dailyMap[day] || 0) + Math.abs(t.amount);
		});
		return Object.entries(dailyMap).map(([name, amount]) => ({ name, amount })).slice(-7);
	};

	const getGroupedCategoryData = (isExpense: boolean) => {
		const catMap: Record<string, number> = {};
		transactions.filter(t => isExpense ? t.amount < 0 : t.amount > 0).forEach(t => {
			const cat = t.category || "Uncategorized";
			catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
		});
		return Object.entries(catMap).map(([name, value]) => ({ name, value }));
	};

	const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

	return (
		<motion.div
			key="dashboard"
			initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
			className="flex flex-col p-4 gap-6 max-w-md mx-auto w-full min-h-screen"
		>
			<AnimatePresence mode="wait">
				{view === "form" ? (
					<motion.div 
						key="form-view"
						initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
						className="space-y-6"
					>
						<section className="mt-2">
							<div className="bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-6 text-black shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
								<div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full blur-2xl group-hover:bg-black/10 transition-colors" />
								<div className="relative z-10">
									<div className="flex justify-between items-start">
										<p className="text-xs font-bold uppercase opacity-70 tracking-wider">Total {t("amount")} ({selectedMonth.split(' ')[0] || "..."})</p>
										<Button 
											size="sm" 
											onClick={() => { setView("analytics"); fetchAvailableMonths(config.sheetId, user?.accessToken || ""); }}
											className="h-8 bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold text-[10px] px-3"
										>
											<BarChart3 size={12} className="mr-1" /> {t("viewDetail")}
										</Button>
									</div>
									<h2 className="text-3xl font-black tracking-tight mt-1">{formatCurrency(totalAmount)}</h2>
									<div className="flex justify-between items-center mt-6">
										<div className="flex -space-x-2">
											{[1, 2, 3].map((i) => (
												<div key={i} className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-400 flex items-center justify-center text-[10px] font-bold"><History size={12} /></div>
											))}
										</div>
										<div className="flex gap-2">
											<Dialog open={isManageFieldsOpen} onOpenChange={setIsManageFieldsOpen}>
												<DialogTrigger render={<Button size="sm" variant="secondary" className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-3" />}>
													<Settings2 size={14} className="mr-1" /> {t("manageFields")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[400px] rounded-3xl overflow-hidden">
													<DialogHeader className="px-6 pt-6">
														<DialogTitle className="flex items-center gap-2">
															{(editingOptionsIdx !== -1 || renamingIdx !== -1) && <Button variant="ghost" size="sm" onClick={() => { setEditingOptionsIdx(-1); setRenamingIdx(-1); }} className="h-8 w-8 p-0 rounded-full"><ChevronLeft size={20} /></Button>}
															{editingOptionsIdx === -1 && renamingIdx === -1 ? t("manageFields") : editingOptionsIdx !== -1 ? `${t("manageOptions")}: ${customFields[editingOptionsIdx].name}` : t("editField")}
														</DialogTitle>
														<DialogDescription className="px-1">Update your field configuration.</DialogDescription>
													</DialogHeader>
													<div className="space-y-4 p-6 pt-2">
														{editingOptionsIdx === -1 && renamingIdx === -1 ? (
															<>
																<div className="flex flex-col gap-3">
																	<Input placeholder="Field Name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} disabled={customFields.length >= 2} />
																	<div className="flex flex-col gap-2">
																		<div className="flex gap-2">
																			<Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v || "text")} disabled={customFields.length >= 2}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">{t("text")}</SelectItem><SelectItem value="dropdown">{t("dropdown")}</SelectItem></SelectContent></Select>
																			<Button onClick={handleAddField} disabled={customFields.length >= 2 || loading || !newFieldName.trim()} className="bg-emerald-500 text-black font-bold px-6">{t("add")}</Button>
																		</div>
																		<div className="flex items-center gap-2 px-1"><input type="checkbox" id="newFieldReq" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} className="w-4 h-4 rounded" /><Label htmlFor="newFieldReq" className="text-xs font-medium">{t("isRequired")}</Label></div>
																	</div>
																</div>
																<div className="space-y-2 mt-4">
																	{customFields.map((field, idx) => (
																		<div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
																			<div className="flex-1"><div className="flex items-center gap-2"><p className="text-sm font-bold">{field.name}</p></div><p className="text-[10px] opacity-60 uppercase tracking-widest">{field.type}</p></div>
																			<div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => { setRenamingIdx(idx); setRenamingInput(field.name); setRenamingType(field.type); setRenamingRequired(field.required); }}><Pencil size={16} /></Button>{field.type === "dropdown" && (<Button variant="ghost" size="sm" onClick={() => setEditingOptionsIdx(idx)}><ListTree size={16} /></Button>)}<Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ isOpen: true, fieldName: field.name, index: idx })}><Trash2 size={16} /></Button></div>
																		</div>
																	))}
																</div>
															</>
														) : renamingIdx !== -1 ? (
															<div className="space-y-4">
																<div className="space-y-2"><Label className="text-xs">{t("name")}</Label><Input value={renamingInput} onChange={(e) => setRenamingInput(e.target.value)} className="rounded-xl" /></div>
																<div className="space-y-2"><Label className="text-xs">{t("fieldType")}</Label><Select value={renamingType} onValueChange={(v: any) => setRenamingType(v || "text")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">{t("text")}</SelectItem><SelectItem value="dropdown">{t("dropdown")}</SelectItem></SelectContent></Select></div>
																<div className="flex items-center gap-2 px-1 py-1"><input type="checkbox" id="renameFieldReq" checked={renamingRequired} onChange={(e) => setRenamingRequired(e.target.checked)} /><Label htmlFor="renameFieldReq" className="text-xs font-medium">{t("isRequired")}</Label></div>
																<Button onClick={() => handleUpdateField(renamingIdx)} disabled={loading} className="w-full bg-emerald-500 text-black font-bold h-12 rounded-xl mt-2">{t("editField")}</Button>
															</div>
														) : (
															<div className="space-y-4">
																<div className="flex gap-2"><Input placeholder={t("newOption")} value={newOptionInput} onChange={(e) => setNewOptionInput(e.target.value)} className="rounded-xl" /><Button onClick={() => handleAddOptionToField(editingOptionsIdx, newOptionInput)} className="bg-emerald-500 text-black font-bold rounded-xl">{t("add")}</Button></div>
																<div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">{(customFields[editingOptionsIdx].options || []).map((opt) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl"><span>{opt}</span><Button variant="ghost" size="sm" onClick={() => handleDeleteOptionFromField(editingOptionsIdx, opt)}><Trash2 size={14} /></Button></div>))}</div>
															</div>
														)}
													</div>
												</DialogContent>
											</Dialog>

											<Dialog>
												<DialogTrigger render={<Button size="sm" variant="secondary" className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold px-3" />}>
													<LinkIcon size={14} className="mr-1" /> {user ? "Sync" : t("integration")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[425px] rounded-3xl">
													<DialogHeader><DialogTitle>{t("integrationTitle")}</DialogTitle></DialogHeader>
													<div className="py-6 flex flex-col items-center text-center gap-4">
														<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2"><Wallet className="text-emerald-600 dark:text-emerald-400" size={32} /></div>
														{user ? (
															<div className="space-y-2">
																<p className="font-bold text-sm text-emerald-600">{t("googleSyncActive")}</p>
																<p className="text-[10px] text-zinc-500 italic opacity-70">Current: {getCurrentMonthSheetName()}</p>
																<Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 font-bold text-[10px] mt-4" onClick={() => setIsDisconnectModalOpen(true)}>{t("googleSyncDisconnect")}</Button>
															</div>
														) : (
															<Button className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold h-12 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-sm" onClick={handleGoogleLogin} disabled={loading}>Continue with Google</Button>
														)}
													</div>
												</DialogContent>
											</Dialog>
										</div>
									</div>
								</div>
							</div>
						</section>

						{/* Quick Add Form */}
						<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
							<h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Plus className="text-emerald-500" size={20} />{t("quickAdd")}</h3>
							<div className="space-y-5">
								{loading && headers.length === 0 ? (
									<div className="py-10 text-center text-zinc-500 font-medium">Connecting...</div>
								) : (
									headers.map((header) => {
										const hL = header.toLowerCase();
										if (hL.includes("tanggal") || hL.includes("date")) return null;
										const isCoreCat = hL.includes("kategori") || hL.includes("category");
										const isType = hL.includes("tipe") || hL.includes("type");
										const isAmount = hL.includes("jumlah") || hL.includes("amount");
										const customFieldIdx = customFields.findIndex(f => f.name.toLowerCase() === hL);
										const customField = customFieldIdx !== -1 ? customFields[customFieldIdx] : null;

										return (
											<div key={header} className="space-y-2">
												<div className="flex items-center justify-between ml-1">
													<Label className="text-xs text-zinc-500 dark:text-zinc-400">{translateHeader(header)} {customField?.required && <span className="text-red-500">*</span>}</Label>
													{(isCoreCat || customField?.type === "dropdown") && (
														<Dialog>
															<DialogTrigger render={<Button variant="ghost" size="sm" disabled={loading} className="h-6 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-2 rounded-lg" />}>
																{t("manageOptions")}
															</DialogTrigger>
															<DialogContent className="sm:max-w-[400px] rounded-3xl">
																<DialogHeader><DialogTitle>{isCoreCat ? t("manageCategories") : `${t("manageOptions")}: ${header}`}</DialogTitle></DialogHeader>
																<div className="space-y-4 py-4">
																	<div className="flex gap-2"><Input placeholder={isCoreCat ? t("newCategory") : t("newOption")} value={isCoreCat ? newCategoryInput : newOptionInput} onChange={(e) => isCoreCat ? setNewCategoryInput(e.target.value) : setNewOptionInput(e.target.value)} className="rounded-xl" /><Button onClick={() => isCoreCat ? handleAddCategory() : handleAddOptionToField(customFieldIdx, newOptionInput)} className="bg-emerald-500 text-black font-bold rounded-xl">{t("add")}</Button></div>
																	<div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">{(isCoreCat ? categories : customField?.options || []).map((opt) => (<div key={opt} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl"><span>{opt}</span><Button variant="ghost" size="sm" onClick={() => isCoreCat ? handleDeleteCategory(opt) : handleDeleteOptionFromField(customFieldIdx, opt)}><Trash2 size={14} /></Button></div>))}</div>
																</div>
															</DialogContent>
														</Dialog>
													)}
												</div>
												{(isCoreCat || (customField?.type === "dropdown")) ? (
													<Select value={formData[header] || ""} disabled={loading} onValueChange={(val) => handleInputChange(header, val || "")}>
														<SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
														<SelectContent className="rounded-xl">{(isCoreCat ? categories : customField?.options || []).map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}</SelectContent>
													</Select>
												) : isType ? (
													<Select value={formData[header] || ""} disabled={loading} onValueChange={(val) => handleInputChange(header, val || "")}>
														<SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"><SelectValue placeholder={t("transactionType")} /></SelectTrigger>
														<SelectContent className="rounded-xl"><SelectItem value={t("income")}>{t("income")}</SelectItem><SelectItem value={t("expense")}>{t("expense")}</SelectItem></SelectContent>
													</Select>
												) : (
													<Input type={isAmount ? "number" : "text"} disabled={loading} placeholder={`Enter ${translateHeader(header)}`} className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950" value={formData[header] || ""} onChange={(e) => handleInputChange(header, e.target.value)} />
												)}
											</div>
										);
									})
								)}
								<Button disabled={loading || !user} onClick={handleSubmit} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg rounded-2xl mt-4 shadow-lg shadow-emerald-500/20">
									{loading ? "..." : user ? t("addExpense") : "Please Login First"}
								</Button>
							</div>
						</section>
					</motion.div>
				) : (
					<motion.div 
						key="analytics-view"
						initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
						className="space-y-6"
					>
						{/* Analytics Header */}
						<header className="flex flex-col gap-4">
							<div className="flex items-center justify-between gap-4">
								<Button variant="ghost" size="sm" onClick={() => setView("form")} className="rounded-full h-10 w-10 p-0">
									<ArrowLeft size={20} />
								</Button>
								<h3 className="text-xl font-black flex-1">{t("detailedDashboard")}</h3>
							</div>
							
							{/* Month Picker */}
							<div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
								<CalendarDays className="text-emerald-500 ml-2" size={18} />
								<Select value={selectedMonth} onValueChange={handleMonthChange} disabled={loading}>
									<SelectTrigger className="border-none bg-transparent shadow-none focus:ring-0 font-bold text-sm h-10">
										<SelectValue placeholder={t("selectMonth")} />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										{availableMonths.map(m => (
											<SelectItem key={m} value={m}>{m}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</header>

						{/* Stats Summary */}
						<div className="grid grid-cols-2 gap-4">
							<div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
								<div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2"><TrendingUp size={16} /></div>
								<p className="text-[10px] uppercase font-bold text-zinc-400">{t("incomeTotal")}</p>
								<p className="text-sm font-black text-emerald-600">{formatCurrency(transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0))}</p>
							</div>
							<div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
								<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mb-2"><TrendingDown size={16} /></div>
								<p className="text-[10px] uppercase font-bold text-zinc-400">{t("expenseTotal")}</p>
								<p className="text-sm font-black text-red-600">{formatCurrency(Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)))}</p>
							</div>
						</div>

						{/* Charts */}
						{loading ? (
							<div className="h-[400px] flex items-center justify-center text-zinc-400 font-medium">Loading Data...</div>
						) : transactions.length === 0 ? (
							<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-2">
								<AlertCircle size={48} className="opacity-20" />
								<p>No data found for this month.</p>
							</div>
						) : (
							<>
								<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
									<div className="flex items-center gap-2">
										<div className="w-2 h-6 bg-emerald-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">{t("transactionTrend")}</h4>
									</div>
									<div className="h-[200px] w-full">
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart data={getDailyData()}>
												<defs><linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
												<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
												<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
												<Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
												<Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
											</AreaChart>
										</ResponsiveContainer>
									</div>
								</section>

								{/* Expense Chart */}
								<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
									<div className="flex items-center gap-2">
										<div className="w-2 h-6 bg-red-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">{t("expenseByCat")}</h4>
									</div>
									<div className="h-[200px] w-full flex items-center justify-center relative">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart><Pie data={getGroupedCategoryData(true)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
												{getGroupedCategoryData(true).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
											</Pie><Tooltip /></PieChart>
										</ResponsiveContainer>
										<div className="absolute"><TrendingDown className="text-red-500/20" size={32} /></div>
									</div>
									<div className="grid grid-cols-2 gap-2">{getGroupedCategoryData(true).map((entry, index) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span></div>))}</div>
								</section>

								{/* Income Chart */}
								<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4">
									<div className="flex items-center gap-2">
										<div className="w-2 h-6 bg-emerald-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">Income by Category</h4>
									</div>
									<div className="h-[200px] w-full flex items-center justify-center relative">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart><Pie data={getGroupedCategoryData(false)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
												{getGroupedCategoryData(false).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
											</Pie><Tooltip /></PieChart>
										</ResponsiveContainer>
										<div className="absolute"><TrendingUp className="text-emerald-500/20" size={32} /></div>
									</div>
									<div className="grid grid-cols-2 gap-2">{getGroupedCategoryData(false).map((entry, index) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span></div>))}</div>
								</section>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Status & Confirmation Modals */}
			<Dialog open={statusModal.isOpen} onOpenChange={(open) => setStatusModal(prev => ({ ...prev, isOpen: open }))}>
				<DialogContent className="sm:max-w-[400px] rounded-[32px] p-8">
					<div className="flex flex-col items-center text-center gap-4">
						<div className={`w-20 h-20 rounded-full flex items-center justify-center ${statusModal.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
							{statusModal.type === "success" ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
						</div>
						<div className="space-y-2">
							<DialogTitle className="text-2xl font-black tracking-tight">{statusModal.title}</DialogTitle>
							<DialogDescription className="text-sm text-zinc-500 px-4">{statusModal.description}</DialogDescription>
						</div>
						<Button onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))} className={`w-full h-12 rounded-xl font-bold mt-2 ${statusModal.type === "success" ? "bg-emerald-500 text-black" : "bg-destructive text-white"}`}>{t("close")}</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isDisconnectModalOpen} onOpenChange={setIsDisconnectModalOpen}>
				<DialogContent className="sm:max-w-[400px] rounded-[32px] p-8">
					<div className="flex flex-col items-center text-center gap-4">
						<div className="w-20 h-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"><LogOut size={48} /></div>
						<div className="space-y-2">
							<DialogTitle className="text-2xl font-black tracking-tight">{t("disconnectWarningTitle")}</DialogTitle>
							<DialogDescription className="text-sm text-zinc-500 px-4 leading-relaxed">{t("disconnectWarningDesc")}</DialogDescription>
						</div>
						<div className="flex gap-3 w-full mt-2">
							<Button variant="outline" onClick={() => setIsDisconnectModalOpen(false)} className="flex-1 rounded-xl font-bold">{t("close")}</Button>
							<Button onClick={handleDisconnect} className="flex-1 bg-destructive text-white rounded-xl font-bold">{t("disconnectConfirm")}</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={deleteConfirm.isOpen} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}>
				<DialogContent className="sm:max-w-[400px] rounded-[32px] p-8">
					<div className="flex flex-col items-center text-center gap-4">
						<div className="w-20 h-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center"><Trash2 size={48} /></div>
						<div className="space-y-2">
							<DialogTitle className="text-2xl font-black tracking-tight">{t("deleteFieldWarning")}</DialogTitle>
							<DialogDescription className="text-sm text-zinc-500 px-4">{t("deleteFieldDesc")}</DialogDescription>
						</div>
						<div className="flex gap-3 w-full mt-2">
							<Button variant="outline" onClick={() => setDeleteConfirm({ isOpen: false, fieldName: "", index: -1 })} className="flex-1 rounded-xl font-bold">{t("close")}</Button>
							<Button onClick={handleDeleteField} className="flex-1 bg-destructive text-white rounded-xl font-bold">{t("delete")}</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* OCR Placeholder Section */}
			{view === "form" && (
				<section className="mt-2 pb-10">
					<Button variant="outline" disabled className="w-full h-16 rounded-2xl border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center justify-center gap-3 opacity-60">
						<div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center"><Camera size={20} className="text-zinc-500" /></div>
						<div className="text-left">
							<p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Scan Receipt</p>
							<p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600">{t("ocrComingSoon")}</p>
						</div>
					</Button>
				</section>
			)}
		</motion.div>
	);
}

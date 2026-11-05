"use client";

import * as React from "react";
import { useLanguage } from "@/components/language-provider";
import { stripRupiah } from "@/components/dashboard/cards/numeric-keyboard";
import { supabase } from "@/lib/supabase-client";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import {
	CORE_HEADERS_DUAL,
	getCurrentMonthSheetName,
	getPreviousMonthName,
	formatCurrency,
	cleanNumber,
	ensureAndGetSheetId,
	initializeSheetFormatting,
	handleInitialBalanceCarryForward,
	cleanupDuplicateInitialBalances,
	appendRowToSheet,
	upsertInitialBalanceInSheets,
	syncPreviousBalanceInSheets,
	calculateCarryForwardBalance
} from "@/lib/sheets-api";

import {
	CustomFieldDef,
	CustomChartConfig,
	Transaction,
	StatusModalState,
	DashboardLogicOptions,
	PocketDef
} from "./types";

import { useCategories } from "./use-categories";
import { useCustomFields } from "./use-custom-fields";
import { useCustomCharts } from "./use-custom-charts";
import { useSupabaseSync } from "./use-supabase-sync";
import { useGoogleSync } from "./use-google-sync";
import { useExport } from "./use-export";

let globalInitPromise: Promise<any> | null = null;

export const isInternalTransfer = (t: any): boolean => {
	if (!t) return false;
	const cat = (t.category || "").toLowerCase().trim();
	const note = (t.note || "").toLowerCase().trim();
	return (
		cat === "transfer" ||
		cat === "mutasi" ||
		note === "transfer antar kantong" ||
		note.startsWith("transfer antar kantong")
	);
};

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

export function useDashboardLogic(options: DashboardLogicOptions = {}) {
	const { isDemoMode = false, demoTransactions = [], addDemoTransaction } = options;
	const { t, language } = useLanguage();
	const [view, setView] = React.useState<"form" | "analytics">("form");
	const [headers, setHeaders] = React.useState<string[]>([]);
	const [transactions, setTransactions] = React.useState<Transaction[]>([]);
	const [allTransactions, setAllTransactions] = React.useState<any[]>([]);
	const [availableMonths, setAvailableMonths] = React.useState<string[]>([]);
	const [selectedMonth, setSelectedMonth] = React.useState<string>("");
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [loading, setLoading] = React.useState(() => {
		if (isDemoMode) return false;
		if (typeof window !== "undefined") {
			const savedUser = localStorage.getItem("googleUser");
			const hash = window.location.hash;
			const search = window.location.search;
			const hasGoogleAuth = hash.includes("access_token") || sessionStorage.getItem("google_oauth_token");
			const hasSupabaseSession = Object.keys(localStorage).some(key => key.startsWith("sb-") && key.endsWith("-auth-token")) || search.includes("code");
			if (savedUser || hasGoogleAuth || hasSupabaseSession) {
				return true;
			}
		}
		return false;
	});
	const [isOcrReady, setIsOcrReady] = React.useState(false);
	const [totalAmount, setTotalAmount] = React.useState(0);

	const [statusModal, setStatusModal] = React.useState<StatusModalState>({
		isOpen: false, type: null, title: "", description: "",
	});

	const [toastState, setToastState] = React.useState<{ isOpen: boolean; message: string; type?: "success" | "error" | "info" }>({
		isOpen: false, message: "", type: "success"
	});

	const showToast = React.useCallback((message: string, type: "success" | "error" | "info" = "success") => {
		setToastState({ isOpen: true, message, type });
	}, []);

	const hideToast = React.useCallback(() => {
		setToastState(prev => ({ ...prev, isOpen: false }));
	}, []);

	// Pockets and Recurring Templates States
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
		return [];
	});
	const [activePocketIdx, setActivePocketIdx] = React.useState<number>(0);
	const [recurringTemplates, setRecurringTemplates] = React.useState<any[]>([]);

	// Delegate PWA State to sub-hook
	const {
		isInstallable,
		isAddToHomeOpen,
		setIsAddToHomeOpen,
		isStandaloneMode,
		deferredPrompt,
		triggerInstall
	} = usePWAInstall();

	// Sub-hook shared states declared at parent level
	const [categories, setCategories] = React.useState<string[]>([]);
	const [customFields, setCustomFields] = React.useState<CustomFieldDef[]>([]);
	const [customChartConfigs, setCustomChartConfigs] = React.useState<CustomChartConfig[]>([]);

	// 1. Supabase Sync Hook
	const supabaseSync = useSupabaseSync({
		setLoading,
		setCategories,
		setCustomFields,
		setCustomChartConfigs,
		setHeaders,
		setAllTransactions,
		setAvailableMonths,
		setSelectedMonth,
		t,
		pockets,
		setPockets
	});
	const { supabaseUser, setSupabaseUser, fetchSupabaseUserData, updateSupabaseSettings } = supabaseSync;

	// 2. Google Sync Hook
	const googleSync = useGoogleSync({
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
	});
	const {
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
	} = googleSync;

	// 3. Categories hook delegation
	const {
		newCategoryInput,
		setNewCategoryInput,
		handleAddCategory,
		handleDeleteCategory
	} = useCategories({
		categories,
		setCategories,
		supabaseUser,
		isDemoMode,
		updateSupabaseSettings,
		customFields,
		customChartConfigs
	});

	// 4. Custom Charts hook delegation
	const {
		handleAddCustomChart,
		handleDeleteCustomChart
	} = useCustomCharts({
		customChartConfigs,
		setCustomChartConfigs,
		supabaseUser,
		isDemoMode,
		updateSupabaseSettings,
		categories,
		customFields
	});

	// 5. Custom Fields hook delegation
	const {
		newFieldName,
		setNewFieldName,
		newFieldType,
		setNewFieldType,
		newFieldRequired,
		setNewFieldRequired,
		newOptionInput,
		setNewOptionInput,
		deleteConfirmIndex,
		setDeleteConfirmIndex,
		isManageFieldsOpen,
		setIsManageFieldsOpen,
		handleAddField,
		handleUpdateField,
		handleDeleteField,
		handleAddOptionToField,
		handleDeleteOptionFromField
	} = useCustomFields({
		customFields,
		setCustomFields,
		supabaseUser,
		isDemoMode,
		categories,
		customChartConfigs,
		setCustomChartConfigs,
		user,
		config,
		setHeaders,
		setLoading,
		handleAuthError,
		fetchSheetData,
		updateSupabaseSettings
	});

	// 6. Data Export Hook
	const {
		exportToCSV,
		exportToGoogleSheets
	} = useExport({
		transactions,
		customFields,
		headers,
		isGoogleConnected,
		handleGoogleLogin,
		setLoading,
		setStatusModal,
		t
	});

	// Helper to check if a transaction belongs to a specific custom pocket
	const isTxInPocket = React.useCallback((t: any, pocket: PocketDef) => {
		return (
			t.pocket === pocket.name ||
			t.pocket === pocket.id ||
			(t as any).pocket_id === pocket.id
		);
	}, []);

	// Helper to check if a transaction belongs to ANY active custom pocket
	const isTxInAnyCustomPocket = React.useCallback(
		(t: any, customPockets: PocketDef[] = pockets) => {
			return customPockets.some(p => isTxInPocket(t, p));
		},
		[pockets, isTxInPocket]
	);

	// Unallocated / Main Pocket Balance (Dompet Utama / Saldo Bebas)
	const getMainPocketBalance = React.useCallback(
		(txList: any[] = transactions) => {
			return txList
				.filter(t => !isTxInAnyCustomPocket(t, pockets))
				.reduce((sum, t) => sum + t.amount, 0);
		},
		[transactions, pockets, isTxInAnyCustomPocket]
	);

	// Total Balance Allocated across all Custom Pockets
	const getAllocatedPocketsBalance = React.useCallback(
		(txList: any[] = transactions) => {
			if (pockets.length === 0) return 0;
			return txList
				.filter(t => isTxInAnyCustomPocket(t, pockets))
				.reduce((sum, t) => sum + t.amount, 0);
		},
		[transactions, pockets, isTxInAnyCustomPocket]
	);

	// Get Pocket Balance implementation
	const getPocketBalance = React.useCallback(
		(pocket: PocketDef, txList: any[] = transactions) => {
			if (pocket.id === "net_worth" || pocket.id === "main_pocket") {
				return getMainPocketBalance(txList);
			}
			return txList
				.filter(t => isTxInPocket(t, pocket))
				.reduce((sum, t) => sum + t.amount, 0);
		},
		[transactions, getMainPocketBalance, isTxInPocket]
	);

	// Move Funds implementation (Internal Transfer / Mutasi)
	const handleMoveFunds = async (fromPocketId: string, toPocketId: string, amount: number, note?: string) => {
		setLoading(true);
		try {
			const isMainPocketRef = (ref: string) =>
				!ref || ref === "net_worth" || ref === "main_pocket";

			const fromIsMain = isMainPocketRef(fromPocketId);
			const toIsMain = isMainPocketRef(toPocketId);

			if (fromIsMain && toIsMain) {
				throw new Error(
					language === "en"
						? "Source and destination pockets must be different."
						: "Kantong sumber dan tujuan harus berbeda."
				);
			}

			const fromPocket = fromIsMain
				? null
				: pockets.find(p => p.id === fromPocketId || p.name === fromPocketId);
			const toPocket = toIsMain
				? null
				: pockets.find(p => p.id === toPocketId || p.name === toPocketId);

			if (!fromIsMain && !fromPocket) {
				throw new Error(
					language === "en" ? "Source pocket not found." : "Kantong sumber tidak ditemukan."
				);
			}
			if (!toIsMain && !toPocket) {
				throw new Error(
					language === "en" ? "Destination pocket not found." : "Kantong tujuan tidak ditemukan."
				);
			}
			if (!fromIsMain && !toIsMain && fromPocket?.id === toPocket?.id) {
				throw new Error(
					language === "en"
						? "Source and destination pockets must be different."
						: "Kantong sumber dan tujuan harus berbeda."
				);
			}

			const mainPocketLabel =
				language === "en" ? "Main Pocket (Unallocated)" : "Dompet Utama (Saldo Bebas)";
			const fromDisplayName = fromIsMain ? mainPocketLabel : fromPocket!.name;
			const toDisplayName = toIsMain ? mainPocketLabel : toPocket!.name;

			const activeTxList = isDemoMode ? demoTransactions : transactions;
			const availableSourceBalance = fromIsMain
				? getMainPocketBalance(activeTxList)
				: getPocketBalance(fromPocket!, activeTxList);

			const transferAmt = Math.abs(amount);
			if (transferAmt <= 0) {
				throw new Error(
					language === "en"
						? "Transfer amount must be greater than 0."
						: "Nominal transfer harus lebih dari 0."
				);
			}

			// Balance Validation: source pocket (Main Pocket or Custom Pocket) cannot go negative
			if (transferAmt > availableSourceBalance) {
				setStatusModal({
					isOpen: true,
					type: "error",
					title: language === "en" ? "Insufficient Balance" : "Saldo Tidak Mencukupi",
					description:
						language === "en"
							? `Cannot move ${formatCurrency(transferAmt)}. Available balance in ${fromDisplayName} is ${formatCurrency(Math.max(0, availableSourceBalance))}.`
							: `Tidak dapat memindahkan ${formatCurrency(transferAmt)}. Saldo tersedia di ${fromDisplayName} hanya ${formatCurrency(Math.max(0, availableSourceBalance))}.`
				});
				setLoading(false);
				return;
			}

			const nowIso = new Date().toISOString();
			const nowLocale = new Date().toLocaleString();
			const transferCategory = "Transfer";
			const transferNote = note || "Transfer antar kantong";

			const txFrom = {
				date: nowIso,
				name:
					language === "en"
						? `Transfer to ${toDisplayName}`
						: `Pindahan Dana ke ${toDisplayName}`,
				amount: -transferAmt,
				type: "expense",
				category: transferCategory,
				note: transferNote,
				pocket: fromIsMain ? "" : fromPocket!.name,
				pocket_id: fromIsMain ? null : fromPocket!.id
			};

			const txTo = {
				date: nowIso,
				name:
					language === "en"
						? `Transfer from ${fromDisplayName}`
						: `Pindahan Dana dari ${fromDisplayName}`,
				amount: transferAmt,
				type: "income",
				category: transferCategory,
				note: transferNote,
				pocket: toIsMain ? "" : toPocket!.name,
				pocket_id: toIsMain ? null : toPocket!.id
			};

			if (isDemoMode && addDemoTransaction) {
				addDemoTransaction({
					date: nowLocale,
					name: txFrom.name,
					amount: txFrom.amount,
					type: "Pengeluaran / Expense",
					category: txFrom.category,
					note: txFrom.note,
					pocket: txFrom.pocket,
					raw: {}
				});
				addDemoTransaction({
					date: nowLocale,
					name: txTo.name,
					amount: txTo.amount,
					type: "Pemasukan / Income",
					category: txTo.category,
					note: txTo.note,
					pocket: txTo.pocket,
					raw: {}
				});
			} else if (supabaseUser) {
				const hasMissingPocketId = localStorage.getItem("supabase_missing_pocket_id") === "true";
				const payloadFrom: any = {
					user_id: supabaseUser.id,
					date: txFrom.date,
					name: txFrom.name,
					amount: Math.abs(txFrom.amount),
					type: "expense",
					category: txFrom.category,
					note: txFrom.note,
					custom_fields: txFrom.pocket_id
						? { pocket_id: txFrom.pocket_id, pocket: txFrom.pocket }
						: {}
				};
				const payloadTo: any = {
					user_id: supabaseUser.id,
					date: txTo.date,
					name: txTo.name,
					amount: Math.abs(txTo.amount),
					type: "income",
					category: txTo.category,
					note: txTo.note,
					custom_fields: txTo.pocket_id
						? { pocket_id: txTo.pocket_id, pocket: txTo.pocket }
						: {}
				};

				if (!hasMissingPocketId) {
					if (txFrom.pocket_id) payloadFrom.pocket_id = txFrom.pocket_id;
					if (txTo.pocket_id) payloadTo.pocket_id = txTo.pocket_id;
				}

				let { error: errFrom } = await supabase.from("transactions").insert(payloadFrom);
				if (errFrom && errFrom.message.includes("pocket_id")) {
					localStorage.setItem("supabase_missing_pocket_id", "true");
					delete payloadFrom.pocket_id;
					const retryFrom = await supabase.from("transactions").insert(payloadFrom);
					errFrom = retryFrom.error;
				}
				if (errFrom) throw errFrom;

				let { error: errTo } = await supabase.from("transactions").insert(payloadTo);
				if (errTo && errTo.message.includes("pocket_id")) {
					localStorage.setItem("supabase_missing_pocket_id", "true");
					delete payloadTo.pocket_id;
					const retryTo = await supabase.from("transactions").insert(payloadTo);
					errTo = retryTo.error;
				}
				if (errTo) throw errTo;

				await fetchSupabaseUserData(supabaseUser.id);
			} else if (user?.accessToken && config.sheetId) {
				const monthName = selectedMonth || getCurrentMonthSheetName();
				let activeHeaders = [...headers];
				const hasPocketCol = activeHeaders.some(
					h => h.toLowerCase().includes("pocket") || h.toLowerCase().includes("kantong")
				);
				if (!hasPocketCol) {
					activeHeaders.push("Pocket / Kantong");
					const lastColLetter = String.fromCharCode(65 + activeHeaders.length - 1);
					await fetch(
						`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(monthName)}!A1:${lastColLetter}1?valueInputOption=RAW`,
						{
							method: "PUT",
							headers: {
								Authorization: `Bearer ${user.accessToken}`,
								"Content-Type": "application/json"
							},
							body: JSON.stringify({ values: [activeHeaders] })
						}
					);
					setHeaders(activeHeaders);
				}

				const valuesFrom = activeHeaders.map(h => {
					const hL = h.toLowerCase();
					if (hL.includes("tanggal") || hL.includes("date")) return nowLocale;
					if (hL.includes("nama") || hL.includes("name")) return txFrom.name;
					if (hL.includes("jumlah") || hL.includes("amount")) return Math.abs(txFrom.amount).toString();
					if (hL.includes("tipe") || hL.includes("type")) return "Pengeluaran / Expense";
					if (hL.includes("kategori") || hL.includes("category")) return txFrom.category;
					if (hL.includes("catatan") || hL.includes("note")) return txFrom.note;
					if (hL.includes("pocket") || hL.includes("kantong")) return txFrom.pocket;
					return "";
				});
				const valuesTo = activeHeaders.map(h => {
					const hL = h.toLowerCase();
					if (hL.includes("tanggal") || hL.includes("date")) return nowLocale;
					if (hL.includes("nama") || hL.includes("name")) return txTo.name;
					if (hL.includes("jumlah") || hL.includes("amount")) return Math.abs(txTo.amount).toString();
					if (hL.includes("tipe") || hL.includes("type")) return "Pemasukan / Income";
					if (hL.includes("kategori") || hL.includes("category")) return txTo.category;
					if (hL.includes("catatan") || hL.includes("note")) return txTo.note;
					if (hL.includes("pocket") || hL.includes("kantong")) return txTo.pocket;
					return "";
				});

				await appendRowToSheet(config.sheetId, monthName, user.accessToken, valuesFrom);
				await appendRowToSheet(config.sheetId, monthName, user.accessToken, valuesTo);
				await fetchSheetData(config.sheetId, user.accessToken, monthName);
			} else {
				const currentLocal = localStorage.getItem("localTransactions") || "[]";
				const currentList = JSON.parse(currentLocal);
				const updatedList = [
					{
						date: nowLocale,
						name: txFrom.name,
						amount: txFrom.amount,
						type: "Pengeluaran / Expense",
						category: txFrom.category,
						note: txFrom.note,
						pocket: txFrom.pocket
					},
					{
						date: nowLocale,
						name: txTo.name,
						amount: txTo.amount,
						type: "Pemasukan / Income",
						category: txTo.category,
						note: txTo.note,
						pocket: txTo.pocket
					},
					...currentList
				];
				localStorage.setItem("localTransactions", JSON.stringify(updatedList));
				setAllTransactions(updatedList);
			}

			setStatusModal({
				isOpen: true,
				type: "success",
				title: language === "en" ? "Transfer Successful" : "Pindahan Dana Berhasil",
				description:
					language === "en"
						? `${formatCurrency(transferAmt)} has been moved from ${fromDisplayName} to ${toDisplayName}.`
						: `Dana sebesar ${formatCurrency(transferAmt)} berhasil dipindahkan dari ${fromDisplayName} ke ${toDisplayName}.`
			});
		} catch (e: any) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Transfer Failed" : "Pindahan Dana Gagal",
				description: e.message || (language === "en" ? "An error occurred" : "Terjadi kesalahan")
			});
		} finally {
			setLoading(false);
		}
	};

	// Update Pockets implementation
	const handleUpdatePockets = async (updatedList: PocketDef[]) => {
		const deletedPockets = pockets.filter(p => !updatedList.some(ul => ul.id === p.id));
		const renamedMap = new Map<string, string>();
		updatedList.forEach(ul => {
			const prev = pockets.find(p => p.id === ul.id);
			if (prev && prev.name !== ul.name) {
				renamedMap.set(prev.name, ul.name);
			}
		});

		setPockets(updatedList);
		if (activePocketIdx > updatedList.length) {
			setActivePocketIdx(0);
		}

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
						} else if (tx.pocket && renamedMap.has(tx.pocket)) {
							tx.pocket = renamedMap.get(tx.pocket);
							changed = true;
						}
					});
					if (changed) {
						localStorage.setItem("demo_transactions", JSON.stringify(txs));
						setTransactions([...txs]);
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
			await fetchSupabaseUserData(supabaseUser.id);
		} else {
			localStorage.setItem("customPockets", JSON.stringify(updatedList));
			if (deletedPockets.length > 0 || renamedMap.size > 0) {
				setTransactions(prev =>
					prev.map(tx => {
						const isDeleted = deletedPockets.some(
							dp => dp.id === (tx as any).pocket_id || dp.name === tx.pocket
						);
						if (isDeleted) {
							return { ...tx, pocket: "", pocket_id: null } as any;
						}
						if (tx.pocket && renamedMap.has(tx.pocket)) {
							return { ...tx, pocket: renamedMap.get(tx.pocket)! };
						}
						return tx;
					})
				);

				if (user?.accessToken && config.sheetId) {
					const monthName = selectedMonth || getCurrentMonthSheetName();
					try {
						const res = await fetch(
							`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(monthName)}!A1:Z1000`,
							{ headers: { Authorization: `Bearer ${user.accessToken}` } }
						);
						const data = await res.json();
						if (data.values && data.values.length > 1) {
							const sheetHeaders: string[] = data.values[0];
							const pocketColIdx = sheetHeaders.findIndex(
								(h: string) =>
									h.toLowerCase().includes("pocket") || h.toLowerCase().includes("kantong")
							);
							if (pocketColIdx !== -1) {
								const colLetter = String.fromCharCode(65 + pocketColIdx);
								const colValues = data.values.slice(1).map((row: any) => {
									const val = row[pocketColIdx] || "";
									if (deletedPockets.some(dp => dp.name === val || dp.id === val)) {
										return [""];
									}
									if (renamedMap.has(val)) {
										return [renamedMap.get(val)!];
									}
									return [val];
								});
								await fetch(
									`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(monthName)}!${colLetter}2:${colLetter}${colValues.length + 1}?valueInputOption=RAW`,
									{
										method: "PUT",
										headers: {
											Authorization: `Bearer ${user.accessToken}`,
											"Content-Type": "application/json"
										},
										body: JSON.stringify({ values: colValues })
									}
								);
							}
						}
					} catch (e) {
						console.error("Failed to sync pocket changes in Google Sheet:", e);
					}
				}
			}
		}
	};

	// Recurring templates checking implementation
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
				let ran = false;
				while (nextRun <= now) {
					hasNew = true;
					ran = true;
					const isExpense = t.type === "expense";
					const newTx = {
						date: nextRun.toISOString(),
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
				}
				if (ran) {
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
						const matchedPocket = pockets.find(p => p.name === tx.pocket || p.id === tx.pocket);
						const pocketId = matchedPocket?.id || null;
						const insertPayload: any = {
							user_id: supabaseUser.id,
							date: new Date().toISOString(),
							name: tx.name,
							amount: Math.abs(tx.amount),
							type: tx.amount < 0 ? "expense" : "income",
							category: tx.category,
							note: tx.note,
							custom_fields: pocketId ? { pocket_id: pocketId, pocket: matchedPocket?.name || "" } : {}
						};
						if (pocketId && !hasMissingPocketId) {
							insertPayload.pocket_id = pocketId;
						}
						let { error } = await supabase.from("transactions").insert(insertPayload);
						if (error && error.message.includes("pocket_id")) {
							localStorage.setItem("supabase_missing_pocket_id", "true");
							delete insertPayload.pocket_id;
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
	}, [supabaseUser, user, config, headers, pockets, fetchSupabaseUserData, fetchSheetData, setAllTransactions]);

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

	const tRef = React.useRef(t);
	const languageRef = React.useRef(language);
	const isDemoModeRef = React.useRef(isDemoMode);
	const loadedSupabaseUserIdRef = React.useRef<string | null>(null);
	React.useEffect(() => {
		tRef.current = t;
		languageRef.current = language;
		isDemoModeRef.current = isDemoMode;
	}, [t, language, isDemoMode]);

	// Main Initialization logic
	React.useEffect(() => {
		let authSubscription: any = null;
		let isMounted = true;
		const init = async () => {
			const urlParams = new URLSearchParams(window.location.search);
			const code = urlParams.get("code");
			if (code) {
				const stateParam = urlParams.get("state") || "";
				if (stateParam.startsWith("google_connect:")) {
					console.log("Found Google connect code in URL. Handling connect...");
					setLoading(true);
					try {
						const res = await fetch(`/api/auth/google/callback?code=${code}&state=${encodeURIComponent(stateParam)}`);
						if (!res.ok) {
							throw new Error("Failed to connect Google account");
						}
						window.history.replaceState({}, document.title, window.location.pathname);
					} catch (e: any) {
						alert("Google Connection Failed: " + e.message);
					} finally {
						setLoading(false);
					}
				}
				return;
			}

			const hash = window.location.hash;
			if (hash) {
				const params = new URLSearchParams(hash.substring(1));
				const token = params.get("access_token");
				const scope = params.get("scope") || "";
				const isGoogleSheetsAuth = token && (scope.includes("spreadsheets") || scope.includes("drive"));
				
				if (isGoogleSheetsAuth) {
					console.log("Found Google OAuth token in hash. Setting up sheet...");
					sessionStorage.setItem("google_oauth_token", token);
					setupGoogleSheet(token).finally(() => {
						window.history.replaceState({}, document.title, window.location.pathname);
					});
					return;
				}
			}

			const oauthCallbackCheck = sessionStorage.getItem("google_oauth_token");
			if (oauthCallbackCheck) {
				console.log("OAuth setup already running via storage.");
				return;
			}

			const googleSyncStatus = urlParams.get("google_sync");
			if (googleSyncStatus === "success") {
				const savedUser = localStorage.getItem("googleUser");
				if (savedUser) {
					const parsedUser = JSON.parse(savedUser);
					setUser(parsedUser);
					const sId = localStorage.getItem("sheetId") || "";
					setConfig({ sheetId: sId });
					const current = getCurrentMonthSheetName();
					setSelectedMonth(current);
					
					await Promise.all([
						fetchSheetData(sId, parsedUser.accessToken, current),
						fetchAvailableMonths(sId, parsedUser.accessToken)
					]);

					setStatusModal({ 
						isOpen: true, 
						type: "success", 
						title: tRef.current("syncSuccessTitle") || "Success", 
						description: tRef.current("syncSuccessDesc") || "Integration sequence finished successfully." 
					});
					sessionStorage.removeItem("google_oauth_token");
					setIsIntegrating(false);
					setLoading(false);
					window.history.replaceState({}, document.title, window.location.pathname);
					return;
				}
				setStatusModal({ 
					isOpen: true, 
					type: "success", 
					title: tRef.current("syncSuccessTitle") || "Success", 
					description: tRef.current("syncSuccessDesc") || "Integration sequence finished successfully." 
				});
				sessionStorage.removeItem("google_oauth_token");
				window.history.replaceState({}, document.title, window.location.pathname);
			} else if (googleSyncStatus === "error") {
				setStatusModal({ 
					isOpen: true, 
					type: "error", 
					title: "Sync Failed", 
					description: urlParams.get("error_description") || "Google Sheets integration failed." 
				});
				sessionStorage.removeItem("google_oauth_token");
				setIsIntegrating(false);
				setLoading(false);
				window.history.replaceState({}, document.title, window.location.pathname);
			}

			const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
				if (session && session.user) {
					// Clear any standalone Google Sheets localStorage credentials so modes never collide
					localStorage.removeItem("googleUser");
					localStorage.removeItem("sheetId");
					setSupabaseUser(session.user);

					// Skip redundant full-screen reload if this user's initial session is already loaded
					if (
						loadedSupabaseUserIdRef.current === session.user.id &&
						(event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "SIGNED_IN")
					) {
						return;
					}
					loadedSupabaseUserIdRef.current = session.user.id;

					const isGoogleAccount =
						session.user?.app_metadata?.provider === "google" ||
						session.user?.app_metadata?.providers?.includes("google") ||
						session.user?.identities?.some((id: any) => id.provider === "google");

					setIsIntegrating(true);
					setLoading(true);
					setStatusModal(prev => ({
						...prev,
						description: isGoogleAccount
							? (languageRef.current === "en" ? "Synchronizing Google Account..." : "Menyinkronkan Akun Google...")
							: (languageRef.current === "en" ? "Synchronizing Account Data..." : "Menyinkronkan Data Akun...")
					}));

					// Defer Supabase queries outside of onAuthStateChange synchronous execution stack
					// to avoid navigator.locks deadlock on mobile browsers during token recovery/refresh.
					const userId = session.user.id;
					const accessToken = session.access_token;
					setTimeout(async () => {
						if (!isMounted) return;
						// Check Google export connection status in the background without blocking dashboard load
						void checkGoogleConnectionStatus(accessToken);
						try {
							await fetchSupabaseUserData(userId);
						} finally {
							if (isMounted) {
								setIsIntegrating(false);
								setLoading(false);
							}
						}
					}, 0);
				} else {
					loadedSupabaseUserIdRef.current = null;
					setSupabaseUser(null);
					setIsGoogleConnected(false);
					setGoogleEmail("");
					
					if (isDemoModeRef.current) {
						return;
					}

					const savedUser = localStorage.getItem("googleUser");
					if (!savedUser) {
						setLoading(false);
					}
					
					const localCatsStr = localStorage.getItem("customCategories");
					if (localCatsStr) {
						try {
							setCategories(JSON.parse(localCatsStr));
						} catch (e) {}
					} else {
						setCategories(["Jajan", "Makan", "Transport", "Kebutuhan", "Entertainment", "Tagihan", "Investasi", "Lainnya"]);
					}

					const localFieldsStr = localStorage.getItem("customFieldDefs");
					if (localFieldsStr) {
						try {
							const parsed = JSON.parse(localFieldsStr);
							setCustomFields(parsed);
							setHeaders([...CORE_HEADERS_DUAL, ...parsed.map((f: any) => f.name)]);
						} catch (e) {
							setHeaders([...CORE_HEADERS_DUAL]);
						}
					} else {
						setHeaders([...CORE_HEADERS_DUAL]);
					}

					const localChartsStr = localStorage.getItem("customChartConfigs");
					if (localChartsStr) {
						try {
							setCustomChartConfigs(JSON.parse(localChartsStr));
						} catch (e) {}
					}

					const savedPockets = localStorage.getItem("customPockets");
					const savedTemplates = localStorage.getItem("recurringTemplates");

					if (savedPockets && JSON.parse(savedPockets).length > 0) setPockets(JSON.parse(savedPockets));
					else {
						setPockets([]);
						localStorage.setItem("customPockets", JSON.stringify([]));
					}

					if (savedTemplates) setRecurringTemplates(JSON.parse(savedTemplates));
				}
			});
			authSubscription = subscription;

			const { data: { session: activeSupabaseSession } } = await supabase.auth.getSession();
			const savedSheetId = localStorage.getItem("sheetId") || "";
			const savedUser = localStorage.getItem("googleUser");

			if (savedUser && !activeSupabaseSession?.user) {
				const parsedUser = JSON.parse(savedUser);
				setUser(parsedUser);
				if (savedSheetId) {
					setConfig({ sheetId: savedSheetId });
					const current = getCurrentMonthSheetName();
					setSelectedMonth(current);
					
					const doInit = async () => {
						setLoading(true);
						setIsIntegrating(true);
						setStatusModal(prev => ({
							...prev,
							description: languageRef.current === "en" ? "Synchronizing with Google Sheets..." : "Menyinkronkan dengan Google Sheets..."
						}));

						if (!globalInitPromise) {
							globalInitPromise = ensureAndGetSheetId(savedSheetId, current, parsedUser.accessToken, handleAuthError)
								.then(async ({ sheetId: internalSheetId, availableMonths }) => {
									setAvailableMonths(availableMonths);

									const currentValues = await fetchSheetData(savedSheetId, parsedUser.accessToken, current);

									let hasInitialBalance = false;
									let initialBalanceCount = 0;
									if (currentValues && currentValues.length > 0) {
										const headers = currentValues[0];
										const catIdx = headers.findIndex(
											(h: string) => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")
										);
										if (catIdx !== -1) {
											currentValues.slice(1).forEach((row: any) => {
												if (row[catIdx] === "Initial Balance") {
													hasInitialBalance = true;
													initialBalanceCount++;
												}
											});
										}
									}

									let carried = false;
									if (!hasInitialBalance) {
										carried = await handleInitialBalanceCarryForward(
											savedSheetId,
											current,
											parsedUser.accessToken,
											tRef.current("initialBalance"),
											tRef.current("fromPreviousMonth"),
											currentValues || undefined
										);
									}

									let duplicatesCleaned = false;
									if (initialBalanceCount > 1) {
										duplicatesCleaned = await cleanupDuplicateInitialBalances(
											savedSheetId,
											current,
											parsedUser.accessToken,
											currentValues || undefined,
											internalSheetId
										);
									}

									initializedMonthsRef.current[current] = true;

									if (carried || duplicatesCleaned) {
										await fetchSheetData(savedSheetId, parsedUser.accessToken, current);
									}

									return { sheetId: internalSheetId, availableMonths };
								})
								.catch(async (e) => {
									await fetchSheetData(savedSheetId, parsedUser.accessToken, current);
									throw e;
								})
								.finally(() => {
									globalInitPromise = null;
									setIsIntegrating(false);
									setLoading(false);
								});
						} else {
							try {
								const result: any = await globalInitPromise;
								let availableMonths: string[] = [];
								if (result && typeof result === "object") {
									availableMonths = result.availableMonths || [];
								}
								const currentValues = await fetchSheetData(savedSheetId, parsedUser.accessToken, current);
								if (availableMonths.length > 0) {
									setAvailableMonths(availableMonths);
								}
							} catch (e) {
								await fetchSheetData(savedSheetId, parsedUser.accessToken, current);
							} finally {
								setIsIntegrating(false);
								setLoading(false);
							}
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
			isMounted = false;
			if (authSubscription) {
				authSubscription.unsubscribe();
			}
		};
	}, []);

	// Asynchronous background OCR ping with retries
	React.useEffect(() => {
		let active = true;
		let timeoutId: NodeJS.Timeout;
		let retryCount = 0;
		const maxRetries = 5;
		const ocrApiUrl = process.env.NEXT_PUBLIC_OCR_API_URL;
		if (!ocrApiUrl) return;

		const pingOcr = async () => {
			try {
				const controller = new AbortController();
				const id = setTimeout(() => controller.abort(), 5000);
				const res = await fetch(ocrApiUrl, { signal: controller.signal });
				clearTimeout(id);
				
				if (res.ok && active) {
					setIsOcrReady(true);
					return;
				}
			} catch (e) {
				console.log(`OCR ping attempt ${retryCount + 1} failed:`, e);
			}

			if (active && retryCount < maxRetries) {
				retryCount++;
				timeoutId = setTimeout(pingOcr, 5000);
			}
		};

		// Start first ping after 1.5 seconds to avoid competing with Google Sheets initial sync
		timeoutId = setTimeout(pingOcr, 1500);

		return () => {
			active = false;
			clearTimeout(timeoutId);
		};
	}, []);

	// Filter transactions by selectedMonth and parse dates safely
	React.useEffect(() => {
		if (supabaseUser) {
			const filtered = allTransactions.filter(t => {
				const d = parseDateSafe(t.rawDate || t.date);
				const txMonth = d.toLocaleString("id-ID", { month: "long", year: "numeric" });
				return txMonth === selectedMonth;
			});
			setTransactions(filtered);
			setTotalAmount(filtered.reduce((sum, t) => sum + t.amount, 0));
		}
	}, [selectedMonth, allTransactions, supabaseUser]);

	// Load Demo Mode seed data
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

	const handleMonthChange = (month: string | null) => {
		if (!month) return;
		setSelectedMonth(month);
		if (!supabaseUser && user?.accessToken && config.sheetId) {
			fetchSheetData(config.sheetId, user.accessToken, month);
		}
	};

	const resetToCurrentMonth = React.useCallback(() => {
		const current = getCurrentMonthSheetName();
		if (selectedMonth && selectedMonth !== current) {
			setSelectedMonth(current);
			if (!supabaseUser && user?.accessToken && config.sheetId) {
				fetchSheetData(config.sheetId, user.accessToken, current);
			}
		}
	}, [selectedMonth, supabaseUser, user?.accessToken, config.sheetId, fetchSheetData]);

	const handleSetInitialBalance = async (amount: number) => {
		if (supabaseUser) {
			setLoading(true);
			try {
				const existingEntries = transactions.filter(t => t.category === "Initial Balance");
				const existingEntry = existingEntries[0];
				if (existingEntry && existingEntry.id) {
					const { error } = await supabase
						.from("transactions")
						.update({
							amount: Math.abs(amount),
							name: `${t("initialBalance")} (Manual Setup)`,
							type: amount >= 0 ? "income" : "expense",
							note: "Manual Setup",
							date: new Date().toISOString()
						})
						.eq("id", existingEntry.id);
					if (error) throw error;

					if (existingEntries.length > 1) {
						const duplicateIds = existingEntries
							.slice(1)
							.map(e => e.id)
							.filter(Boolean);
						if (duplicateIds.length > 0) {
							await supabase.from("transactions").delete().in("id", duplicateIds);
						}
					}
				} else {
					const { error } = await supabase.from("transactions").insert({
						user_id: supabaseUser.id,
						date: new Date().toISOString(),
						name: `${t("initialBalance")} (Manual Setup)`,
						amount: Math.abs(amount),
						type: amount >= 0 ? "income" : "expense",
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
				amount >= 0 ? "Pemasukan / Income" : "Pengeluaran / Expense",
				"Initial Balance",
				"Manual Setup"
			];
			
			await upsertInitialBalanceInSheets(config.sheetId, selectedMonth, user.accessToken, values);
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
					.eq("user_id", supabaseUser.id)
					.order("date", { ascending: false });
					
				if (txs) {
					const totalBalance = calculateCarryForwardBalance(txs, selectedMonth);
					
					const existingEntries = transactions.filter(t => t.category === "Initial Balance");
					const existingEntry = existingEntries[0];
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

						if (existingEntries.length > 1) {
							const duplicateIds = existingEntries
								.slice(1)
								.map(e => e.id)
								.filter(Boolean);
							if (duplicateIds.length > 0) {
								await supabase.from("transactions").delete().in("id", duplicateIds);
							}
						}
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
		try {
			await syncPreviousBalanceInSheets(config.sheetId, selectedMonth, user.accessToken, t("initialBalance"), t("fromPreviousMonth"));
			await fetchSheetData(config.sheetId, user.accessToken, selectedMonth);
			setStatusModal({ isOpen: true, type: "success", title: "Berhasil", description: "Saldo dari bulan sebelumnya berhasil disinkronkan." });
		} catch (error: any) {
			setStatusModal({ isOpen: true, type: "error", title: "Gagal", description: error.message });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async (overrideFormData?: Record<string, string>) => {
		const activeFormData = overrideFormData || formData;
		const activeSelectedPocket = activePocketIdx > 0 ? pockets[activePocketIdx - 1] : null;
		if (isDemoMode && addDemoTransaction) {
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note") || hL.includes("pocket") || hL.includes("kantong")) return false;
				const customField = customFields.find(f => f.name.toLowerCase() === hL);
				if (!customField && !CORE_HEADERS_DUAL.includes(h)) return false;
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
			const pocketHeader = headers.find(h => h.toLowerCase().includes("pocket") || h.toLowerCase().includes("kantong")) || "";
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

			addDemoTransaction({
				date: new Date().toLocaleString(),
				name: activeFormData[nameHeader] || "",
				amount: isExpense ? -rawAmt : rawAmt,
				type: typeVal,
				category: activeFormData[catHeader] || "",
				note: activeFormData[noteHeader] || "",
				pocket: activeFormData[pocketHeader] || activeSelectedPocket?.name || "",
				raw: customFieldValues,
			});
			setFormData({});
			showToast(language === "en" ? "Transaction Saved!" : "Transaksi Berhasil Disimpan!", "success");
			return;
		}

		if (supabaseUser) {
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note") || hL.includes("pocket") || hL.includes("kantong")) return false;
				const customField = customFields.find(f => f.name.toLowerCase() === hL);
				if (!customField && !CORE_HEADERS_DUAL.includes(h)) return false;
				if (customField && !customField.required) return false;
				return !activeFormData[h];
			});

			if (missingFields.length > 0) { 
				setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); 
				return; 
			}

			// Optimistic UX: Reset form immediately and display toast notification
			setFormData({});
			showToast(language === "en" ? "Transaction Saved!" : "Transaksi Berhasil Disimpan!", "success");

			(async () => {
				try {
					const amountHeader = headers.find(h => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount")) || "";
					const typeHeader = headers.find(h => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type")) || "";
					const nameHeader = headers.find(h => h.toLowerCase().includes("nama") || h.toLowerCase().includes("name")) || "";
					const catHeader = headers.find(h => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")) || "";
					const noteHeader = headers.find(h => h.toLowerCase().includes("catatan") || h.toLowerCase().includes("note")) || "";
					const pocketHeader = headers.find(h => h.toLowerCase().includes("pocket") || h.toLowerCase().includes("kantong")) || "";
					
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

					const pocketVal = activeFormData[pocketHeader] || activeSelectedPocket?.name || "";
					const matchedPocket = pockets.find(p => p.name === pocketVal || p.id === pocketVal) || activeSelectedPocket || null;
					const pocketId = matchedPocket?.id || null;
					const hasMissingPocketId = localStorage.getItem("supabase_missing_pocket_id") === "true";

					const payload: any = {
						user_id: supabaseUser.id,
						date: new Date().toISOString(),
						name: activeFormData[nameHeader] || "",
						amount: rawAmt,
						type: isExpense ? "expense" : "income",
						category: activeFormData[catHeader] || "",
						note: activeFormData[noteHeader] || "",
						custom_fields: {
							...customFieldValues,
							...(pocketId ? { pocket_id: pocketId, pocket: matchedPocket?.name || pocketVal } : {})
						}
					};

					if (pocketId && !hasMissingPocketId) {
						payload.pocket_id = pocketId;
					}

					let { error } = await supabase.from("transactions").insert(payload);
					if (error && error.message.includes("pocket_id")) {
						localStorage.setItem("supabase_missing_pocket_id", "true");
						delete payload.pocket_id;
						const retryResult = await supabase.from("transactions").insert(payload);
						error = retryResult.error;
					}

					if (error) throw error;

					await fetchSupabaseUserData(supabaseUser.id);
				} catch (error: any) {
					setStatusModal({ isOpen: true, type: "error", title: "Submission Failed", description: error.message });
				}
			})();
			return;
		}

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
			if (!customField && !CORE_HEADERS_DUAL.includes(h)) return false;
			if (customField && !customField.required) return false;
			return !activeFormData[h];
		});

		if (missingFields.length > 0) { 
			setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); 
			return; 
		}

		// Optimistic UX: Reset form immediately and display toast notification
		setFormData({});
		showToast(language === "en" ? "Transaction Saved!" : "Transaksi Berhasil Disimpan!", "success");

		// Perform API submission and sync in the background without blocking form typing
		(async () => {
			try {
				const isInitialized = initializedMonthsRef.current[currentMonth];
				if (!isInitialized) {
					const { sheetId: internalSheetId } = await ensureAndGetSheetId(activeSheetId, currentMonth, activeToken, handleAuthError);
					await initializeSheetFormatting(activeSheetId, activeToken, currentMonth, internalSheetId, customFields);
					await handleInitialBalanceCarryForward(activeSheetId, currentMonth, activeToken, t("initialBalance"), t("fromPreviousMonth"));
					await cleanupDuplicateInitialBalances(activeSheetId, currentMonth, activeToken, undefined, internalSheetId);
					initializedMonthsRef.current[currentMonth] = true;
				}
				let activeHeaders = [...headers];
				const hasPocketCol = activeHeaders.some(
					h => h.toLowerCase().includes("pocket") || h.toLowerCase().includes("kantong")
				);
				if (!hasPocketCol) {
					activeHeaders.push("Pocket / Kantong");
					const lastColLetter = String.fromCharCode(65 + activeHeaders.length - 1);
					await fetch(
						`https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(currentMonth)}!A1:${lastColLetter}1?valueInputOption=RAW`,
						{
							method: "PUT",
							headers: {
								Authorization: `Bearer ${activeToken}`,
								"Content-Type": "application/json"
							},
							body: JSON.stringify({ values: [activeHeaders] })
						}
					);
					setHeaders(activeHeaders);
				}
				const values = activeHeaders.map((h) => {
					const hL = h.toLowerCase();
					if (hL.includes("tanggal") || hL.includes("date")) return new Date().toLocaleString();
					if (hL.includes("pocket") || hL.includes("kantong")) return activeFormData[h] || activeSelectedPocket?.name || "";
					let val = activeFormData[h] || "";
					if (hL.includes("jumlah") || hL.includes("amount")) {
						val = Math.abs(cleanNumber(stripRupiah(val))).toString();
					}
					return val;
				});

				await appendRowToSheet(activeSheetId, currentMonth, activeToken, values);
				setSelectedMonth(currentMonth);
				await fetchSheetData(activeSheetId, activeToken, currentMonth);
				fetchAvailableMonths(activeSheetId, activeToken);
			} catch (error: any) { 
				setStatusModal({ isOpen: true, type: "error", title: "Submission Failed", description: error.message }); 
			}
		})();
	};

	return {
		view, setView,
		headers, categories, customFields, transactions,
		availableMonths, selectedMonth, newCategoryInput, setNewCategoryInput,
		formData, handleInputChange, loading, totalAmount, formatCurrency,
		user, statusModal, setStatusModal,
		toastState, showToast, hideToast,
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
		supabaseUser, isGoogleConnected, googleEmail, isOcrReady,
		exportToCSV, exportToGoogleSheets,
		isAddToHomeOpen, setIsAddToHomeOpen, deferredPrompt, isInstallable, triggerInstall, isStandaloneMode,
		pockets, activePocketIdx, setActivePocketIdx, handleUpdatePockets, getPocketBalance, getMainPocketBalance, getAllocatedPocketsBalance, handleMoveFunds,
		recurringTemplates, handleAddRecurringTemplate, handleDeleteRecurringTemplate,
		translateHeader: (header: string) => {
			const h = header.toLowerCase();
			if (h.includes("nama") || h.includes("name")) return t("name");
			if (h.includes("jumlah") || h.includes("amount")) return t("amount");
			if (h.includes("tipe") || h.includes("type")) return t("transactionType");
			if (h.includes("kategori") || h.includes("category")) return t("category");
			if (h.includes("catatan") || h.includes("note")) return t("note");
			if (h.includes("pocket") || h.includes("kantong")) return t("pocket");
			return header;
		}
	};
}

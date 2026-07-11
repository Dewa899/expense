"use client";

import * as React from "react";
import { useLanguage } from "@/components/language-provider";
import { stripRupiah } from "@/components/dashboard/numeric-keyboard";
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
	syncPreviousBalanceInSheets
} from "@/lib/sheets-api";

import {
	CustomFieldDef,
	CustomChartConfig,
	Transaction,
	StatusModalState,
	DashboardLogicOptions
} from "./types";

import { useCategories } from "./use-categories";
import { useCustomFields } from "./use-custom-fields";
import { useCustomCharts } from "./use-custom-charts";
import { useSupabaseSync } from "./use-supabase-sync";
import { useGoogleSync } from "./use-google-sync";
import { useExport } from "./use-export";

let globalInitPromise: Promise<any> | null = null;

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
	const [loading, setLoading] = React.useState(false);
	const [isOcrReady, setIsOcrReady] = React.useState(false);
	const [totalAmount, setTotalAmount] = React.useState(0);

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
		t
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

	// Main Initialization logic
	React.useEffect(() => {
		let authSubscription: any = null;
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
						title: t("syncSuccessTitle") || "Success", 
						description: t("syncSuccessDesc") || "Integration sequence finished successfully." 
					});
				}
				sessionStorage.removeItem("google_oauth_token");
				setIsIntegrating(false);
				setLoading(false);
				window.history.replaceState({}, document.title, window.location.pathname);
				return; 
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
				return;
			}

			const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
				if (session && session.user) {
					setIsIntegrating(true);
					setLoading(true);
					setStatusModal(prev => ({
						...prev,
						description: language === "en" ? "Synchronizing with Supabase..." : "Menyinkronkan dengan Supabase..."
					}));
					setSupabaseUser(session.user);
					try {
						await fetchSupabaseUserData(session.user.id);
						await checkGoogleConnectionStatus(session.access_token);
					} finally {
						setIsIntegrating(false);
						setLoading(false);
					}
				} else {
					setSupabaseUser(null);
					setIsGoogleConnected(false);
					setGoogleEmail("");
					
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
				}
			});
			authSubscription = subscription;

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
						setIsIntegrating(true);
						setStatusModal(prev => ({
							...prev,
							description: language === "en" ? "Synchronizing with Google Sheets..." : "Menyinkronkan dengan Google Sheets..."
						}));

						if (!globalInitPromise) {
							globalInitPromise = ensureAndGetSheetId(savedSheetId, current, parsedUser.accessToken, handleAuthError)
								.then(async ({ sheetId: internalSheetId, availableMonths }) => {
									setAvailableMonths(availableMonths);

									const currentValues = await fetchSheetData(savedSheetId, parsedUser.accessToken, current);

									const carried = await handleInitialBalanceCarryForward(
										savedSheetId,
										current,
										parsedUser.accessToken,
										t("initialBalance"),
										t("fromPreviousMonth"),
										currentValues || undefined
									);

									const duplicatesCleaned = await cleanupDuplicateInitialBalances(
										savedSheetId,
										current,
										parsedUser.accessToken,
										currentValues || undefined,
										internalSheetId
									);

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
			if (authSubscription) {
				authSubscription.unsubscribe();
			}
		};
	}, [t, language]);

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
		try {
			const prevMonthName = getPreviousMonthName(selectedMonth);
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
		if (isDemoMode && addDemoTransaction) {
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note")) return false;
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

			addDemoTransaction({
				date: new Date().toLocaleString(),
				name: activeFormData[nameHeader] || "",
				amount: isExpense ? -rawAmt : rawAmt,
				type: typeVal,
				category: activeFormData[catHeader] || "",
				note: activeFormData[noteHeader] || "",
				raw: customFieldValues,
			});
			setFormData({});
			setStatusModal({ isOpen: true, type: "success", title: t("successTitle"), description: t("successDesc") });
			return;
		}

		if (supabaseUser) {
			const missingFields = headers.filter(h => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date") || hL.includes("catatan") || hL.includes("note")) return false;
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

				const { error } = await supabase.from("transactions").insert({
					user_id: supabaseUser.id,
					date: new Date().toISOString(),
					name: activeFormData[nameHeader] || "",
					amount: rawAmt,
					type: isExpense ? "expense" : "income",
					category: activeFormData[catHeader] || "",
					note: activeFormData[noteHeader] || "",
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
			return !activeFormData[h];
		});

		if (missingFields.length > 0) { 
			setStatusModal({ isOpen: true, type: "error", title: t("validationError"), description: t("validationDesc") }); 
			return; 
		}

		setLoading(true);
		try {
			const isInitialized = initializedMonthsRef.current[currentMonth];
			if (!isInitialized) {
				const { sheetId: internalSheetId } = await ensureAndGetSheetId(activeSheetId, currentMonth, activeToken, handleAuthError);
				await initializeSheetFormatting(activeSheetId, activeToken, currentMonth, internalSheetId, customFields);
				await handleInitialBalanceCarryForward(activeSheetId, currentMonth, activeToken, t("initialBalance"), t("fromPreviousMonth"));
				await cleanupDuplicateInitialBalances(activeSheetId, currentMonth, activeToken, undefined, internalSheetId);
				initializedMonthsRef.current[currentMonth] = true;
			}
			const values = headers.map((h) => {
				const hL = h.toLowerCase();
				if (hL.includes("tanggal") || hL.includes("date")) return new Date().toLocaleString();
				let val = activeFormData[h] || "";
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
		supabaseUser, isGoogleConnected, googleEmail, isOcrReady,
		exportToCSV, exportToGoogleSheets,
		isAddToHomeOpen, setIsAddToHomeOpen, deferredPrompt, isInstallable, triggerInstall, isStandaloneMode,
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

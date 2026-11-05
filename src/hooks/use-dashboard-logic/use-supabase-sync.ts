import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import {
	CORE_HEADERS_DUAL,
	getCurrentMonthSheetName,
	getPreviousMonthName,
	calculateCarryForwardBalance
} from "@/lib/sheets-api";
import { CustomFieldDef, CustomChartConfig, PocketDef } from "./types";

interface UseSupabaseSyncOptions {
	setLoading: React.Dispatch<React.SetStateAction<boolean>>;
	setCategories: React.Dispatch<React.SetStateAction<string[]>>;
	setCustomFields: React.Dispatch<React.SetStateAction<CustomFieldDef[]>>;
	setCustomChartConfigs: React.Dispatch<React.SetStateAction<CustomChartConfig[]>>;
	setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
	setAllTransactions: React.Dispatch<React.SetStateAction<any[]>>;
	setAvailableMonths: React.Dispatch<React.SetStateAction<string[]>>;
	setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
	t: (key: string) => string;
	pockets: PocketDef[];
	setPockets: React.Dispatch<React.SetStateAction<PocketDef[]>>;
}

export function useSupabaseSync({
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
}: UseSupabaseSyncOptions) {
	const [supabaseUser, setSupabaseUser] = React.useState<any>(null);
	const isSyncingCarryForwardRef = React.useRef(false);
	const inFlightFetchRef = React.useRef<{ userId: string; promise: Promise<void> } | null>(null);
	const tRef = React.useRef(t);
	React.useEffect(() => {
		tRef.current = t;
	}, [t]);

	const fetchSupabaseUserData = React.useCallback(async (userId: string) => {
		if (inFlightFetchRef.current && inFlightFetchRef.current.userId === userId) {
			return inFlightFetchRef.current.promise;
		}

		const runFetch = async () => {
			try {
				setLoading(true);
				const [{ data: settings }, { data: txs }] = await Promise.all([
					supabase
						.from("user_settings")
						.select("*")
						.eq("user_id", userId)
						.maybeSingle(),
					supabase
						.from("transactions")
						.select("*")
						.eq("user_id", userId)
						.order("date", { ascending: false })
				]);
					
				let fields: CustomFieldDef[] = [];
				let dbPockets: PocketDef[] = [];
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
									dbPockets = [];
								}
							} catch (e) {
								dbPockets = [];
							}
						} else {
							dbPockets = [];
						}
						setPockets(dbPockets);
						
						if (dbPockets.length > 0) {
							const hasMissingColumn = localStorage.getItem("supabase_missing_custom_pockets") === "true";
							if (hasMissingColumn) {
								localStorage.setItem("customPockets", JSON.stringify(dbPockets));
							} else {
								void (async () => {
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
								})();
							}
						}
					}
				} else {
					dbPockets = [];
					setPockets(dbPockets);
				}
				setHeaders([...CORE_HEADERS_DUAL, ...fields.map((f: any) => f.name)]);

				let currentMonthTxs = txs || [];
			const currentMonthName = getCurrentMonthSheetName();
			const firstDayOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

			if (!isSyncingCarryForwardRef.current) {
				isSyncingCarryForwardRef.current = true;
				try {
					// 1. Deduplicate any multiple "Initial Balance" rows within the same month
					const initByMonth = new Map<string, any[]>();
					currentMonthTxs.forEach(tx => {
						if (tx.category === "Initial Balance") {
							const mName = new Date(tx.date).toLocaleString("id-ID", { month: "long", year: "numeric" });
							if (!initByMonth.has(mName)) initByMonth.set(mName, []);
							initByMonth.get(mName)!.push(tx);
						}
					});

					const idsToDelete: string[] = [];
					initByMonth.forEach((list) => {
						if (list.length > 1) {
							// Keep list[0] (most recently created/updated since ordered by date DESC)
							list.slice(1).forEach(dup => {
								if (dup.id) idsToDelete.push(dup.id);
							});
						}
					});

					if (idsToDelete.length > 0) {
						await supabase.from("transactions").delete().in("id", idsToDelete);
						currentMonthTxs = currentMonthTxs.filter(tx => !idsToDelete.includes(tx.id));
					}

					// 2. Check and handle current month Initial Balance carry-forward
					const currentMonthInitTx = currentMonthTxs.find(t => {
						const txMonth = new Date(t.date).toLocaleString("id-ID", { month: "long", year: "numeric" });
						return t.category === "Initial Balance" && txMonth === currentMonthName;
					});

					const hasPastTransactions = currentMonthTxs.some(t => {
						const txMonth = new Date(t.date).toLocaleString("id-ID", { month: "long", year: "numeric" });
						return txMonth !== currentMonthName && new Date(t.date) < firstDayOfCurrentMonth;
					});

					if (hasPastTransactions) {
						const carryForwardBalance = calculateCarryForwardBalance(currentMonthTxs, currentMonthName);
						const prevMonthName = getPreviousMonthName(currentMonthName);

						if (!currentMonthInitTx) {
							console.log("Auto-carrying forward balance from previous months...");
							const { error: insertError } = await supabase.from("transactions").insert({
								user_id: userId,
								date: new Date().toISOString(),
								name: `${tRef.current("initialBalance")} (${prevMonthName})`,
								amount: Math.abs(carryForwardBalance),
								type: carryForwardBalance >= 0 ? "income" : "expense",
								category: "Initial Balance",
								note: tRef.current("fromPreviousMonth")
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
						} else {
							const isManual =
								currentMonthInitTx.note === "Manual Setup" ||
								(currentMonthInitTx.name && currentMonthInitTx.name.includes("Manual Setup"));
							const isEx =
								currentMonthInitTx.type === "expense" ||
								currentMonthInitTx.type?.toLowerCase().includes("expense") ||
								currentMonthInitTx.type?.toLowerCase().includes("pengeluaran");
							const currentSignedAmt = isEx
								? -Math.abs(Number(currentMonthInitTx.amount) || 0)
								: Math.abs(Number(currentMonthInitTx.amount) || 0);

							if (!isManual && currentMonthInitTx.id && Math.round(currentSignedAmt) !== Math.round(carryForwardBalance)) {
								const { error: updateErr } = await supabase
									.from("transactions")
									.update({
										amount: Math.abs(carryForwardBalance),
										type: carryForwardBalance >= 0 ? "income" : "expense",
										name: `${tRef.current("initialBalance")} (${prevMonthName})`,
										note: tRef.current("fromPreviousMonth")
									})
									.eq("id", currentMonthInitTx.id);

								if (!updateErr) {
									currentMonthInitTx.amount = Math.abs(carryForwardBalance);
									currentMonthInitTx.type = carryForwardBalance >= 0 ? "income" : "expense";
								}
							}
						}
					}
				} finally {
					isSyncingCarryForwardRef.current = false;
				}
			}

			if (currentMonthTxs.length > 0) {
				const parsedTxs = currentMonthTxs.map(t => {
					const isExpense =
						t.type === "expense" ||
						t.type?.toLowerCase().includes("expense") ||
						t.type?.toLowerCase().includes("pengeluaran") ||
						t.type?.toLowerCase().includes("out") ||
						t.type?.toLowerCase().includes("keluar");
					const rawPocketRef =
						t.pocket_id ||
						t.custom_fields?.pocket_id ||
						t.pocket ||
						t.custom_fields?.pocket ||
						null;
					const matchedPocket = rawPocketRef
						? dbPockets.find(p => p.id === rawPocketRef || p.name === rawPocketRef)
						: undefined;
					const resolvedPocketId = matchedPocket ? matchedPocket.id : null;
					const resolvedPocketName = matchedPocket ? matchedPocket.name : "";
					return {
						id: t.id,
						date: new Date(t.date).toLocaleString(),
						rawDate: t.date,
						name: t.name,
						amount: isExpense ? -Math.abs(t.amount) : Math.abs(t.amount),
						type: isExpense ? "Pengeluaran / Expense" : "Pemasukan / Income",
						category: t.category,
						note: t.note || "",
						pocket: resolvedPocketName,
						pocket_id: resolvedPocketId,
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
				setSelectedMonth(prev => (prev && uniqueMonths.includes(prev) ? prev : current));
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

		const promise = runFetch().finally(() => {
			if (inFlightFetchRef.current?.userId === userId) {
				inFlightFetchRef.current = null;
			}
		});
		inFlightFetchRef.current = { userId, promise };
		return promise;
	}, [setLoading, setCategories, setCustomFields, setCustomChartConfigs, setHeaders, setAllTransactions, setAvailableMonths, setSelectedMonth, setPockets]);

	const updateSupabaseSettings = React.useCallback(async (cats: string[], fields: CustomFieldDef[], charts: CustomChartConfig[], pks: PocketDef[] = pockets) => {
		if (!supabaseUser) return;
		try {
			const payload: any = {
				user_id: supabaseUser.id,
				custom_categories: cats,
				custom_field_defs: fields,
				custom_chart_configs: charts,
				updated_at: new Date().toISOString()
			};
			const hasMissingColumn = localStorage.getItem("supabase_missing_custom_pockets") === "true";
			if (!hasMissingColumn) {
				payload.custom_pockets = pks;
			}
			const { error } = await supabase.from("user_settings").upsert(payload);
			if (error) {
				if (error.message.includes("custom_pockets")) {
					localStorage.setItem("supabase_missing_custom_pockets", "true");
					delete payload.custom_pockets;
					await supabase.from("user_settings").upsert(payload);
				} else {
					throw error;
				}
			}
		} catch (e) {
			console.error("Failed to update user settings in Supabase:", e);
		}
	}, [supabaseUser, pockets]);

	return {
		supabaseUser,
		setSupabaseUser,
		fetchSupabaseUserData,
		updateSupabaseSettings
	};
}

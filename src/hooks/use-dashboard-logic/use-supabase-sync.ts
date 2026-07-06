import * as React from "react";
import { supabase } from "@/lib/supabase-client";
import { CORE_HEADERS_DUAL, getCurrentMonthSheetName, getPreviousMonthName } from "@/lib/sheets-api";
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

	const fetchSupabaseUserData = React.useCallback(async (userId: string) => {
		try {
			setLoading(true);
			const { data: settings } = await supabase
				.from("user_settings")
				.select("*")
				.eq("user_id", userId)
				.single();
				
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
				dbPockets = [];
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
						pocket: t.pocket || "",
						pocket_id: t.pocket_id || null,
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
	}, [setLoading, setCategories, setCustomFields, setCustomChartConfigs, setHeaders, setAllTransactions, setAvailableMonths, setSelectedMonth, t, setPockets]);

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

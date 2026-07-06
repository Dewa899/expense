import * as React from "react";
import { CustomChartConfig, CustomFieldDef } from "./types";

interface UseCustomChartsOptions {
	customChartConfigs: CustomChartConfig[];
	setCustomChartConfigs: React.Dispatch<React.SetStateAction<CustomChartConfig[]>>;
	supabaseUser: any;
	isDemoMode: boolean;
	updateSupabaseSettings: (cats: string[], fields: CustomFieldDef[], charts: CustomChartConfig[]) => Promise<void>;
	categories: string[];
	customFields: CustomFieldDef[];
}

export function useCustomCharts({
	customChartConfigs,
	setCustomChartConfigs,
	supabaseUser,
	isDemoMode,
	updateSupabaseSettings,
	categories,
	customFields
}: UseCustomChartsOptions) {
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
		handleAddCustomChart,
		handleDeleteCustomChart
	};
}

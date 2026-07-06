import * as React from "react";
import { CustomFieldDef, CustomChartConfig } from "./types";

interface UseCategoriesOptions {
	categories: string[];
	setCategories: React.Dispatch<React.SetStateAction<string[]>>;
	supabaseUser: any;
	isDemoMode: boolean;
	updateSupabaseSettings: (cats: string[], fields: CustomFieldDef[], charts: CustomChartConfig[]) => Promise<void>;
	customFields: CustomFieldDef[];
	customChartConfigs: CustomChartConfig[];
}

export function useCategories({
	categories,
	setCategories,
	supabaseUser,
	isDemoMode,
	updateSupabaseSettings,
	customFields,
	customChartConfigs
}: UseCategoriesOptions) {
	const [newCategoryInput, setNewCategoryInput] = React.useState("");

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

	return {
		newCategoryInput,
		setNewCategoryInput,
		handleAddCategory,
		handleDeleteCategory
	};
}

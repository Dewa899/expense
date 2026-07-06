import * as React from "react";
import { CustomFieldDef, CustomChartConfig } from "./types";
import { CORE_HEADERS_DUAL, getCurrentMonthSheetName, ensureAndGetSheetId, initializeSheetFormatting } from "@/lib/sheets-api";

interface UseCustomFieldsOptions {
	customFields: CustomFieldDef[];
	setCustomFields: React.Dispatch<React.SetStateAction<CustomFieldDef[]>>;
	supabaseUser: any;
	isDemoMode: boolean;
	categories: string[];
	customChartConfigs: CustomChartConfig[];
	setCustomChartConfigs: React.Dispatch<React.SetStateAction<CustomChartConfig[]>>;
	user: any;
	config: any;
	setHeaders: React.Dispatch<React.SetStateAction<string[]>>;
	setLoading: React.Dispatch<React.SetStateAction<boolean>>;
	handleAuthError: () => void;
	fetchSheetData: (sheetId: string, token: string, sheetName: string) => Promise<void>;
	updateSupabaseSettings: (cats: string[], fields: CustomFieldDef[], charts: CustomChartConfig[]) => Promise<void>;
}

export function useCustomFields({
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
}: UseCustomFieldsOptions) {
	const [newFieldName, setNewFieldName] = React.useState("");
	const [newFieldType, setNewFieldType] = React.useState<"text" | "dropdown">("text");
	const [newFieldRequired, setNewFieldRequired] = React.useState(true);
	const [newOptionInput, setNewOptionInput] = React.useState("");
	const [deleteConfirmIndex, setDeleteConfirmIndex] = React.useState<number>(-1);
	const [isManageFieldsOpen, setIsManageFieldsOpen] = React.useState(false);

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
				alert("Failed to delete field");
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
			setCustomChartConfigs(updatedCharts);
			setCustomFields(updatedFields);
			localStorage.setItem("customFieldDefs", JSON.stringify(updatedFields));
			localStorage.setItem("customChartConfigs", JSON.stringify(updatedCharts));
			await initializeSheetFormatting(config.sheetId, user.accessToken, sheetName, internalSheetId, updatedFields);
			setDeleteConfirmIndex(-1);
			await fetchSheetData(config.sheetId, user.accessToken, sheetName);
		} catch (e) { alert("Failed to delete column"); } finally { setLoading(false); }
	};

	const handleAddOptionToField = async (idx: number) => {
		if (idx === -1 || !newOptionInput.trim()) return;
		const updatedFields = [...customFields];
		const field = updatedFields[idx];
		if (!field.options) field.options = [];
		if (field.options.includes(newOptionInput.trim())) return;

		field.options = [...field.options, newOptionInput.trim()];
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

	return {
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
	};
}

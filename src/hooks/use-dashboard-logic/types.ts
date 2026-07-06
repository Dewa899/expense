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
	id?: string;
	date: string;
	rawDate?: string;
	name: string;
	amount: number;
	type: string;
	category: string;
	note: string;
	pocket?: string;
	pocket_id?: string | null;
	raw: any; // Original row data for custom fields access
};

export type StatusModalState = {
	isOpen: boolean;
	type: "success" | "error" | null;
	title: string;
	description: string;
};

export interface DashboardLogicOptions {
	isDemoMode?: boolean;
	demoTransactions?: Transaction[];
	addDemoTransaction?: (tx: Transaction) => void;
}

export type PocketDef = {
	id: string;
	name: string;
	type: "default" | "budget" | "saving";
	target?: number;
	color: "emerald" | "indigo" | "amber" | "rose" | "cyan" | "violet" | "orange";
};

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, TrendingUp, TrendingDown, AlertCircle, PieChart as PieChartIcon, Wallet, Plus, Trash2, Loader2, ArrowRight, Settings } from "lucide-react";
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
	Area
} from "recharts";
import { Transaction, CustomFieldDef, CustomChartConfig } from "@/hooks/use-dashboard-logic";

interface AnalyticsViewProps {
	headers: string[];
	transactions: Transaction[];
	availableMonths: string[];
	selectedMonth: string;
	loading: boolean;
	customFields: CustomFieldDef[];
	customChartConfigs: CustomChartConfig[];
	onBack: () => void;
	onMonthChange: (month: string | null) => void;
	onAddCustomChart: (config: CustomChartConfig) => void;
	onDeleteCustomChart: (idx: number) => void;
	onSetInitialBalance: (amount: number) => void;
	formatCurrency: (val: number) => string;
}

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl ring-1 ring-black/5">
				<p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
				{payload.map((item: any, index: number) => (
					<p key={index} className="text-sm font-black flex items-center gap-2" style={{ color: item.color || item.fill }}>
						<span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
						{formatCurrency(Math.abs(item.value))}
					</p>
				))}
			</div>
		);
	}
	return null;
};

export function AnalyticsView({
	headers,
	transactions,
	availableMonths,
	selectedMonth,
	loading,
	customFields,
	customChartConfigs,
	onBack,
	onMonthChange,
	onAddCustomChart,
	onDeleteCustomChart,
	onSetInitialBalance,
	formatCurrency
}: AnalyticsViewProps) {
	const { t } = useLanguage();
	const [isAddChartOpen, setIsAddCustomChartOpen] = React.useState(false);
	const [isSetupBalanceOpen, setIsSetupBalanceOpen] = React.useState(false);
	const [manualBalanceInput, setManualBalanceInput] = React.useState("");
	const [newChartField, setNewChartField] = React.useState("");
	const [newChartType, setNewChartType] = React.useState<"income" | "expense">("expense");

	// Clean Coder: Differentiate between initial balance and monthly activity
	const initialBalanceEntry = transactions.find(t => t.category === "Initial Balance");
	const startingBalance = initialBalanceEntry ? initialBalanceEntry.amount : 0;
	
	const monthlyTransactions = transactions.filter(t => t.category !== "Initial Balance");
	const incomeTotal = monthlyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
	const expenseTotal = Math.abs(monthlyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
	
	const netBalance = startingBalance + incomeTotal - expenseTotal;

	const getDailyData = () => {
		const dailyMap: Record<string, number> = {};
		monthlyTransactions.forEach(t => {
			const day = t.date.split(',')[0];
			dailyMap[day] = (dailyMap[day] || 0) + Math.abs(t.amount);
		});
		return Object.entries(dailyMap).map(([name, amount]) => ({ name, amount })).slice(-7);
	};

	const getGroupedCategoryData = (isExpense: boolean) => {
		const catMap: Record<string, number> = {};
		monthlyTransactions.filter(t => isExpense ? t.amount < 0 : t.amount > 0).forEach(t => {
			const cat = t.category || "Uncategorized";
			catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
		});
		return Object.entries(catMap).map(([name, value]) => ({ name, value }));
	};

	const getCustomChartData = (fieldName: string, type: "income" | "expense") => {
		const dataMap: Record<string, number> = {};
		const fieldNameLower = fieldName.toLowerCase();
		const fieldIdx = headers.findIndex(h => h.toLowerCase() === fieldNameLower);
		if (fieldIdx === -1) return [];

		monthlyTransactions.filter(t => type === "expense" ? t.amount < 0 : t.amount > 0).forEach(t => {
			const val = (t.raw[fieldIdx] || "N/A").toString().trim();
			if (val) dataMap[val] = (dataMap[val] || 0) + Math.abs(t.amount);
		});
		return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
	};

	const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

	return (
		<motion.div 
			initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
			className="space-y-6 pb-20"
		>
			<header className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-4">
					<Button variant="ghost" size="sm" onClick={onBack} className="rounded-full h-10 w-10 p-0 cursor-pointer">
						<ArrowLeft size={20} />
					</Button>
					<h3 className="text-xl font-black flex-1">{t("detailedDashboard")}</h3>
				</div>
				
				<div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
					<CalendarDays className="text-emerald-500 ml-2" size={18} />
					<Select value={selectedMonth} onValueChange={onMonthChange} disabled={loading}>
						<SelectTrigger className="border-none bg-transparent shadow-none focus:ring-0 font-bold text-sm h-10 cursor-pointer">
							<SelectValue placeholder={t("selectMonth")} />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							{availableMonths.map(m => (
								<SelectItem key={m} value={m} className="cursor-pointer">{m}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</header>

			{/* Detailed Balance Summary */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-h-[140px]">
					<div>
						<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{t("startingBalance")}</p>
						<h4 className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(startingBalance)}</h4>
					</div>
					
					{/* Smart Setup Button: Only show if NO initial balance is found yet */}
					{!initialBalanceEntry && (
						<Dialog open={isSetupBalanceOpen} onOpenChange={setIsSetupBalanceOpen}>
							<DialogTrigger render={
								<Button variant="ghost" className="mt-4 h-auto p-0 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-transparent justify-start cursor-pointer group">
									<div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
										<Settings size={14} />
									</div>
									<span className="text-[10px] font-black uppercase tracking-tight">{t("setupInitialBalance")}</span>
								</Button>
							} />
							<DialogContent className="sm:max-w-[400px] rounded-3xl">
								<DialogHeader>
									<DialogTitle>{t("setupInitialBalance")}</DialogTitle>
									<DialogDescription>{t("initialBalanceDesc")}</DialogDescription>
								</DialogHeader>
								<div className="py-4 space-y-4">
									<div className="space-y-2">
										<Label className="text-xs">{t("amount")}</Label>
										<Input 
											type="number" 
											placeholder="0" 
											value={manualBalanceInput} 
											onChange={(e) => setManualBalanceInput(e.target.value)}
											className="h-12 rounded-xl"
										/>
									</div>
									<Button 
										className="w-full bg-emerald-500 text-black font-black h-12 rounded-xl cursor-pointer"
										onClick={() => {
											onSetInitialBalance(parseFloat(manualBalanceInput) || 0);
											setIsSetupBalanceOpen(false);
										}}
									>
										Save Balance
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					)}
				</div>
				<div className="bg-emerald-500 dark:bg-emerald-600 p-6 rounded-[32px] text-black shadow-lg shadow-emerald-500/20 md:col-span-2 flex flex-col justify-between min-h-[140px]">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-[10px] uppercase font-bold opacity-70 tracking-widest text-black">Total {t("netBalance")}</p>
							<h4 className="text-3xl font-black tracking-tight mt-1 text-black">{formatCurrency(netBalance)}</h4>
						</div>
						<Wallet className="opacity-20 text-black" size={32} />
					</div>
					<div className="flex items-center gap-2 mt-4 text-[10px] font-bold uppercase opacity-70 flex-wrap text-black">
						<span>{formatCurrency(startingBalance)}</span>
						<ArrowRight size={12} />
						<div className="flex items-center gap-1">
							<TrendingUp size={12} className="text-emerald-900" />
							<span>{formatCurrency(incomeTotal)}</span>
						</div>
						<ArrowRight size={12} />
						<div className="flex items-center gap-1">
							<TrendingDown size={12} className="text-red-900" />
							<span>{formatCurrency(expenseTotal)}</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
					<div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2"><TrendingUp size={16} /></div>
					<p className="text-[10px] uppercase font-bold text-zinc-400">{t("incomeTotal")}</p>
					<p className="text-sm font-black text-emerald-600">{formatCurrency(incomeTotal)}</p>
				</div>
				<div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
					<div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 flex items-center justify-center mb-2"><TrendingDown size={16} /></div>
					<p className="text-[10px] uppercase font-bold text-zinc-400">{t("expenseTotal")}</p>
					<p className="text-sm font-black text-red-600">{formatCurrency(expenseTotal)}</p>
				</div>
			</div>

			{/* Charts Section */}
			{loading ? (
				<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-4">
					<Loader2 className="animate-spin" size={48} />
					<p className="font-bold uppercase tracking-widest text-[10px]">Processing Data...</p>
				</div>
			) : transactions.length > 0 ? (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
					<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4 lg:col-span-2">
						<div className="flex items-center gap-2">
							<div className="w-2 h-6 bg-emerald-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">{t("transactionTrend")}</h4>
						</div>
						<div className="h-[250px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={getDailyData()}>
									<defs><linearGradient id="colorAmount" x1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
									<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
									<Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</section>

					<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4 h-full">
						<div className="flex items-center gap-2">
							<div className="w-2 h-6 bg-red-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">{t("expenseByCat")}</h4>
						</div>
						<div className="h-[200px] w-full flex items-center justify-center relative">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={getGroupedCategoryData(true)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
										{getGroupedCategoryData(true).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
									</Pie>
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
								</PieChart>
							</ResponsiveContainer>
							<div className="absolute"><TrendingDown className="text-red-500/20" size={32} /></div>
						</div>
						<div className="grid grid-cols-2 gap-2">{getGroupedCategoryData(true).map((entry, index) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span></div>))}</div>
					</section>

					<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4 h-full">
						<div className="flex items-center gap-2">
							<div className="w-2 h-6 bg-emerald-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">Income by Category</h4>
						</div>
						<div className="h-[200px] w-full flex items-center justify-center relative">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie data={getGroupedCategoryData(false)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
										{getGroupedCategoryData(false).map((entry, index) => (
											<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
										))}
									</Pie>
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
								</PieChart>
							</ResponsiveContainer>
							<div className="absolute"><TrendingUp className="text-emerald-500/20" size={32} /></div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							{getGroupedCategoryData(false).map((entry, index) => (
								<div key={entry.name} className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
									<span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span>
								</div>
							))}
						</div>
					</section>

					{customChartConfigs.map((config, idx) => {
						const chartData = getCustomChartData(config.fieldName, config.type);
						return (
							<section key={idx} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-4 relative group/chart h-full">
								<Button variant="ghost" size="sm" onClick={() => onDeleteCustomChart(idx)} className="absolute top-4 right-4 opacity-0 group-hover/chart:opacity-100 transition-opacity text-destructive h-8 w-8 p-0 cursor-pointer"><Trash2 size={14} /></Button>
								<div className="flex items-center gap-2">
									<div className={`w-2 h-6 rounded-full ${config.type === 'expense' ? 'bg-red-500' : 'bg-emerald-500'}`} />
									<h4 className="font-bold text-sm uppercase tracking-tight">{config.fieldName} ({config.type === 'expense' ? t("expense") : t("income")})</h4>
								</div>
								<div className="h-[200px] w-full">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={chartData}>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
											<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
											<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
											<Bar dataKey="value" radius={[10, 10, 0, 0]}>
												{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</section>
						);
					})}

					{customFields.length > 0 && customChartConfigs.length < 2 && (
						<div className="lg:col-span-2">
							<Dialog open={isAddChartOpen} onOpenChange={setIsAddCustomChartOpen}>
								<DialogTrigger render={
									<Button className="w-full h-16 rounded-2xl border-dashed border-2 border-emerald-500/30 bg-emerald-50/10 hover:bg-emerald-50/20 text-emerald-600 font-bold flex items-center justify-center gap-2 cursor-pointer">
										<Plus size={20} /> {t("addCustomChart")}
									</Button>
								} />
								<DialogContent className="sm:max-w-[400px] rounded-3xl">
									<DialogHeader><DialogTitle>{t("addCustomChart")}</DialogTitle><DialogDescription>{t("customChartLimit")}</DialogDescription></DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2"><Label className="text-xs">{t("selectField")}</Label><Select value={newChartField} onValueChange={(v) => setNewChartField(v || "")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue placeholder="Choose a custom field" /></SelectTrigger><SelectContent className="rounded-xl">{customFields.map(f => (<SelectItem key={f.name} value={f.name} className="cursor-pointer">{f.name}</SelectItem>))}</SelectContent></Select></div>
										<div className="space-y-2"><Label className="text-xs">{t("chartType")}</Label><Select value={newChartType} onValueChange={(v: any) => setNewChartType(v || "expense")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="expense" className="cursor-pointer">{t("expense")}</SelectItem><SelectItem value="income" className="cursor-pointer">{t("income")}</SelectItem></SelectContent></Select></div>
										<Button disabled={!newChartField} onClick={() => { onAddCustomChart({ fieldName: newChartField, type: newChartType }); setIsAddCustomChartOpen(false); setNewChartField(""); }} className="w-full bg-emerald-500 text-black font-black h-12 rounded-xl mt-4 cursor-pointer">{t("add")}</Button>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					)}
				</div>
			) : (
				<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-2">
					<AlertCircle size={48} className="opacity-20" />
					<p>No data found for this month.</p>
				</div>
			)}
		</motion.div>
	);
}

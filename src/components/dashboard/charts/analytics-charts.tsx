"use client";

import * as React from "react";
import { Loader2, TrendingUp, TrendingDown, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	AreaChart,
	Area,
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Sector,
} from "recharts";
import { useLanguage } from "@/components/language-provider";
import { CustomFieldDef } from "@/hooks/use-dashboard-logic";

const CATEGORICAL_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];

const DynamicPie: any = Pie;

const renderActiveShape = (props: any) => {
	const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
	return (
		<Sector
			cx={cx}
			cy={cy}
			innerRadius={innerRadius}
			outerRadius={outerRadius + 8}
			startAngle={startAngle}
			endAngle={endAngle}
			fill={fill}
		/>
	);
};

interface AnalyticsChartsProps {
	loading: boolean;
	transactions: any[];
	customChartConfigs: any[];
	customFields: CustomFieldDef[];
	newChartField: string;
	setNewChartField: (val: string) => void;
	newChartType: "income" | "expense";
	setNewChartType: (val: "income" | "expense") => void;
	onAddCustomChart: (config: { fieldName: string; type: "income" | "expense" }) => void;
	onDeleteCustomChart: (idx: number) => void;
	formatCurrency: (val: number) => string;
	themeColors: {
		gradient: string;
		accentHex: string;
		text: string;
		border: string;
		bgLight: string;
	};
	getDailyData: () => any[];
	getGroupedCategoryData: (isExpense: boolean) => any[];
	getCustomChartData: (fieldName: string, type: "income" | "expense") => any[];
}

const CustomTooltip = ({ active, payload, formatCurrency }: any) => {
	if (active && payload && payload.length) {
		return (
			<div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-xl">
				<p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{payload[0].name}</p>
				<p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(payload[0].value)}</p>
			</div>
		);
	}
	return null;
};

export function AnalyticsCharts({
	loading,
	transactions,
	customChartConfigs,
	customFields,
	newChartField,
	setNewChartField,
	newChartType,
	setNewChartType,
	onAddCustomChart,
	onDeleteCustomChart,
	formatCurrency,
	themeColors,
	getDailyData,
	getGroupedCategoryData,
	getCustomChartData,
}: AnalyticsChartsProps) {
	const { t } = useLanguage();
	const [isAddChartOpen, setIsAddCustomChartOpen] = React.useState(false);
	const [activeExpenseIndex, setActiveExpenseIndex] = React.useState<number | null>(null);
	const [activeIncomeIndex, setActiveIncomeIndex] = React.useState<number | null>(null);

	if (loading) {
		return (
			<div className="h-[400px] flex flex-col items-center justify-center text-zinc-400 gap-4">
				<Loader2 className="animate-spin" size={48} />
				<p className="font-bold uppercase tracking-widest text-[10px]">Processing Data...</p>
			</div>
		);
	}

	if (transactions.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
			<section className="glass-card rounded-3xl p-6 space-y-4 lg:col-span-2">
				<div className="flex items-center gap-2">
					<div className={`w-1.5 h-5 bg-gradient-to-b ${themeColors.gradient} rounded-full`} />
					<h4 className="font-bold text-sm uppercase tracking-tight">{t("transactionTrend")}</h4>
				</div>
				<div className="h-[250px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={getDailyData()}>
							<defs>
								<linearGradient id="colorIncome" x1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={themeColors.accentHex} stopOpacity={0.3}/>
									<stop offset="95%" stopColor={themeColors.accentHex} stopOpacity={0}/>
								</linearGradient>
								<linearGradient id="colorExpense" x1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
									<stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
							<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
							<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
							<Area type="monotone" name="Income" dataKey="income" stroke={themeColors.accentHex} strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
							<Area type="monotone" name="Expense" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</section>

			<section className="glass-card rounded-3xl p-6 space-y-4 h-full">
				<div className="flex items-center gap-2">
					<div className="w-1.5 h-5 bg-red-500 rounded-full" /><h4 className="font-bold text-sm uppercase tracking-tight">{t("expenseByCat")}</h4>
				</div>
				<div className="h-[200px] w-full flex items-center justify-center relative">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<DynamicPie 
								activeIndex={activeExpenseIndex !== null ? activeExpenseIndex : undefined}
								activeShape={renderActiveShape}
								data={getGroupedCategoryData(true)} 
								cx="50%" 
								cy="50%" 
								innerRadius={60} 
								outerRadius={80} 
								paddingAngle={5} 
								dataKey="value" 
								nameKey="name"
								onMouseEnter={(_: any, idx: number) => setActiveExpenseIndex(idx)}
								onMouseLeave={() => setActiveExpenseIndex(null)}
								onClick={(_: any, idx: number) => setActiveExpenseIndex(idx)}
							>
								{getGroupedCategoryData(true).map((entry, index) => (<Cell key={`cell-${index}`} fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]} />))}
							</DynamicPie>
							<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={false} />
						</PieChart>
					</ResponsiveContainer>
					<div className="absolute"><TrendingDown className="text-red-500/20" size={32} /></div>
				</div>
				<div className="grid grid-cols-2 gap-2">{getGroupedCategoryData(true).map((entry, index) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] }} /><span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span></div>))}</div>
			</section>

			<section className="glass-card rounded-3xl p-6 space-y-4 h-full">
				<div className="flex items-center gap-2">
					<div className={`w-1.5 h-5 bg-gradient-to-b ${themeColors.gradient} rounded-full`} />
					<h4 className="font-bold text-sm uppercase tracking-tight">Income by Category</h4>
				</div>
				<div className="h-[200px] w-full flex items-center justify-center relative">
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<DynamicPie 
								activeIndex={activeIncomeIndex !== null ? activeIncomeIndex : undefined}
								activeShape={renderActiveShape}
								data={getGroupedCategoryData(false)} 
								cx="50%" 
								cy="50%" 
								innerRadius={60} 
								outerRadius={80} 
								paddingAngle={5} 
								dataKey="value" 
								nameKey="name"
								onMouseEnter={(_: any, idx: number) => setActiveIncomeIndex(idx)}
								onMouseLeave={() => setActiveIncomeIndex(null)}
								onClick={(_: any, idx: number) => setActiveIncomeIndex(idx)}
							>
								{getGroupedCategoryData(false).map((entry, index) => (
									<Cell key={`cell-${index}`} fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]} />
								))}
							</DynamicPie>
							<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} cursor={false} />
						</PieChart>
					</ResponsiveContainer>
					<div className="absolute"><TrendingUp className={`${themeColors.text} opacity-20`} size={32} /></div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					{getGroupedCategoryData(false).map((entry, index) => (
						<div key={entry.name} className="flex items-center gap-2">
							<div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] }} />
							<span className="text-[10px] font-bold text-zinc-500 truncate">{entry.name}</span>
						</div>
					))}
				</div>
			</section>

			{customChartConfigs.map((config, idx) => {
				const chartData = getCustomChartData(config.fieldName, config.type);
				return (
					<section key={idx} className="glass-card rounded-3xl p-6 space-y-4 relative group/chart h-full">
						<Button variant="ghost" size="sm" onClick={() => onDeleteCustomChart(idx)} className="absolute top-4 right-4 opacity-0 group-hover/chart:opacity-100 transition-opacity text-destructive h-8 w-8 p-0 cursor-pointer border-none bg-transparent"><Trash2 size={14} /></Button>
						<div className="flex items-center gap-2">
							<div className={`w-1.5 h-5 rounded-full ${config.type === 'expense' ? 'bg-red-500' : 'bg-gradient-to-b ' + themeColors.gradient}`} />
							<h4 className="font-bold text-sm uppercase tracking-tight">{config.fieldName} ({config.type === 'expense' ? t("expense") : t("income")})</h4>
						</div>
						<div className="h-[200px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
									<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
									<Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
									<Bar dataKey="value" radius={[10, 10, 0, 0]}>
										{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]} />))}
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
							<Button className={`w-full h-16 rounded-2xl border-dashed border-2 ${themeColors.border} ${themeColors.bgLight} hover:opacity-90 ${themeColors.text} font-bold flex items-center justify-center gap-2 cursor-pointer`}>
								<Plus size={20} /> {t("addCustomChart")}
							</Button>
						} />
						<DialogContent className="sm:max-w-[400px] rounded-3xl">
							<DialogHeader><DialogTitle>{t("addCustomChart")}</DialogTitle><DialogDescription>{t("customChartLimit")}</DialogDescription></DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2"><Label className="text-xs">{t("selectField")}</Label><Select value={newChartField} onValueChange={(v) => setNewChartField(v || "")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue placeholder="Choose a custom field" /></SelectTrigger><SelectContent className="rounded-xl">{customFields.map(f => (<SelectItem key={f.name} value={f.name} className="cursor-pointer">{f.name}</SelectItem>))}</SelectContent></Select></div>
								<div className="space-y-2"><Label className="text-xs">{t("chartType")}</Label><Select value={newChartType} onValueChange={(v: any) => setNewChartType(v || "expense")}><SelectTrigger className="rounded-xl cursor-pointer"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="expense" className="cursor-pointer">{t("expense")}</SelectItem><SelectItem value="income" className="cursor-pointer">{t("income")}</SelectItem></SelectContent></Select></div>
								<Button disabled={!newChartField} onClick={() => { onAddCustomChart({ fieldName: newChartField, type: newChartType }); setIsAddCustomChartOpen(false); setNewChartField(""); }} className={`w-full bg-gradient-to-r ${themeColors.gradient} text-black font-black h-12 rounded-xl mt-4 cursor-pointer border-none shadow-sm`}>{t("add")}</Button>
							</div>
						</DialogContent>
					</Dialog>
				</div>
			)}
		</div>
	);
}

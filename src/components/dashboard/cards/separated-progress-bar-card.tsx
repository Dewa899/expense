"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet } from "lucide-react";
import { PocketDef } from "@/hooks/use-dashboard-logic";

interface SeparatedProgressBarCardProps {
	activePocket: PocketDef;
	progressBarPercent: number;
	formatCurrency: (val: number) => string;
	language: string;
	themeColors: {
		text: string;
		textDark: string;
	};
}

export function SeparatedProgressBarCard({
	activePocket,
	progressBarPercent,
	formatCurrency,
	language,
	themeColors,
}: SeparatedProgressBarCardProps) {
	return (
		<AnimatePresence>
			{activePocket.type !== "default" && activePocket.target && (
				<motion.div
					initial={{ opacity: 0, height: 0, marginTop: 0 }}
					animate={{ opacity: 1, height: "auto", marginTop: 12 }}
					exit={{ opacity: 0, height: 0, marginTop: 0 }}
					transition={{ duration: 0.2, ease: "easeInOut" }}
					className="overflow-hidden w-full"
				>
					<div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-850 rounded-[28px] p-5 shadow-sm space-y-2 transition-all duration-300">
						<div className="flex justify-between text-[11px] font-black text-zinc-650 dark:text-zinc-350">
							<span className="flex items-center gap-1.5">
								<Wallet size={13} className={themeColors.text} />
								{activePocket.type === "budget" 
									? `${language === "en" ? "Monthly Limit" : "Batas Bulanan"}: ${formatCurrency(activePocket.target)}`
									: `${language === "en" ? "Savings Goal" : "Target Tabungan"}: ${formatCurrency(activePocket.target)}`}
							</span>
							<span className={themeColors.textDark}>{Math.round(progressBarPercent)}%</span>
						</div>
						<div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
							<motion.div 
								initial={{ width: 0 }}
								animate={{ width: `${Math.min(progressBarPercent, 100)}%` }}
								className={`h-full rounded-full ${
									activePocket.type === "budget"
										? progressBarPercent > 90
											? "bg-red-500"
											: progressBarPercent > 70
												? "bg-amber-500"
												: "bg-emerald-500"
										: "bg-teal-500"
								}`}
							/>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

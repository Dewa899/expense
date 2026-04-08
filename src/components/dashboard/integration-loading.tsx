"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Database, Layout } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface IntegrationLoadingProps {
	isOpen: boolean;
	description: string;
}

export function IntegrationLoading({ isOpen, description }: IntegrationLoadingProps) {
	const { t } = useLanguage();

	if (!isOpen) return null;

	return (
		<motion.div 
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center"
		>
			<div className="max-w-xs w-full space-y-8">
				{/* Animated Icon Group */}
				<div className="relative h-24 flex items-center justify-center">
					<motion.div
						animate={{ 
							scale: [1, 1.1, 1],
							rotate: [0, 5, -5, 0]
						}}
						transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
						className="w-20 h-20 bg-emerald-500 rounded-[32px] flex items-center justify-center shadow-xl shadow-emerald-500/20"
					>
						<Database className="text-black" size={32} />
					</motion.div>
					
					<motion.div 
						animate={{ y: [0, -10, 0] }}
						transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
						className="absolute -top-2 -right-2 w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-lg"
					>
						<ShieldCheck className="text-emerald-500" size={20} />
					</motion.div>

					<motion.div 
						animate={{ y: [0, 10, 0] }}
						transition={{ duration: 2, repeat: Infinity, delay: 1 }}
						className="absolute -bottom-2 -left-2 w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-lg"
					>
						<Layout className="text-emerald-500" size={20} />
					</motion.div>
				</div>

				<div className="space-y-3">
					<h2 className="text-2xl font-black tracking-tight">{t("integrationTitle")}</h2>
					<div className="flex flex-col items-center gap-4">
						<div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800">
							<Loader2 size={16} className="animate-spin text-emerald-500" />
							<span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest animate-pulse">
								{description}
							</span>
						</div>
						<p className="text-sm text-zinc-500 leading-relaxed px-4">
							{t("integrationWaitDesc") || "Please wait while we set up your personalized Expense Tracker in your Google Drive."}
						</p>
					</div>
				</div>

				{/* Progress Dots */}
				<div className="flex justify-center gap-2">
					{[0, 1, 2].map((i) => (
						<motion.div
							key={i}
							animate={{ 
								scale: [1, 1.5, 1],
								opacity: [0.3, 1, 0.3]
							}}
							transition={{ 
								duration: 1.5, 
								repeat: Infinity, 
								delay: i * 0.2 
							}}
							className="w-2 h-2 bg-emerald-500 rounded-full"
						/>
					))}
				</div>
			</div>

			{/* Background Decoration */}
			<div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-50">
				<div className="absolute top-1/4 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
				<div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
			</div>
		</motion.div>
	);
}

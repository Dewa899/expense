"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export default function NotFound() {
	const { t } = useLanguage();

	return (
		<div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 bg-grid-pattern text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative overflow-x-hidden">
			{/* Ambient glow orbs */}
			<div className="fixed top-0 right-0 w-[350px] h-[350px] md:w-[700px] md:h-[700px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] pointer-events-none select-none z-0" />
			<div className="fixed bottom-0 left-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-teal-500/20 dark:bg-teal-500/8 blur-[120px] pointer-events-none select-none z-0" />

			{/* Header */}
			<header className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 glass-header">
				<Link href="/" className="flex items-center gap-1 leading-none text-left">
					<div className="flex flex-col">
						<div className="flex items-baseline">
							<span className="text-xl font-black tracking-tighter text-emerald-500 italic">EXP</span>
							<span className="text-xs font-bold tracking-tight text-emerald-600/70 dark:text-emerald-400/50 -ml-0.5">ense</span>
						</div>
						<span className="text-[8px] font-light tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-500 ml-0.5">by GENLORD</span>
					</div>
				</Link>
			</header>

			{/* Main content */}
			<main className="flex-grow flex flex-col items-center justify-center p-6 z-10 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
					className="flex flex-col items-center gap-6 max-w-sm"
				>
					{/* 404 illustration */}
					<motion.div
						initial={{ scale: 0.85, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
						className="relative w-full h-64"
					>
						<Image
							src="/illustrations/404.png"
							alt="404 Not Found"
							fill
							className="object-contain drop-shadow-xl"
							priority
						/>
					</motion.div>

					{/* Text content */}
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						className="space-y-3"
					>
						<h1 className="text-4xl font-black tracking-tight">
							<span className="text-emerald-500">404</span>
						</h1>
						<h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
							{t("notFoundTitle")}
						</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
							{t("notFoundDesc")}
						</p>
					</motion.div>

					{/* Back to home button */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.4, delay: 0.5 }}
					>
						<Link
							href="/"
							className="inline-flex items-center gap-2 h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.97] cursor-pointer text-sm"
						>
							<Home size={18} />
							{t("backToHome")}
						</Link>
					</motion.div>
				</motion.div>
			</main>
		</div>
	);
}

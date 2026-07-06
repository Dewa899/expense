"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from "framer-motion";
import { Wallet, Settings, ChevronLeft, ChevronRight, Eye, EyeOff, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PocketDef } from "@/hooks/use-dashboard-logic";
import { useLanguage } from "@/components/language-provider";

interface PocketCarouselCardProps {
	pockets: PocketDef[];
	activePocket: PocketDef;
	activePocketIdx: number;
	setActivePocketIdx: (idx: number) => void;
	themeColors: {
		gradient: string;
		shadow: string;
		navText: string;
		bgLight: string;
	};
	isPrivate: boolean;
	togglePrivacy: () => void;
	isSyncing?: boolean;
	formatCurrency: (val: number) => string;
	totalAmount: number;
	transactions: any[];
	variant: "form" | "analytics";
	onSettingsClick?: () => void;
	onPocketSelectClick: () => void;
	onCardClick?: () => void;
	onMoveFundsClick?: () => void;
}

export function PocketCarouselCard({
	pockets,
	activePocket,
	activePocketIdx,
	setActivePocketIdx,
	themeColors,
	isPrivate,
	togglePrivacy,
	isSyncing = false,
	formatCurrency,
	totalAmount,
	transactions,
	variant,
	onSettingsClick,
	onPocketSelectClick,
	onCardClick,
	onMoveFundsClick,
}: PocketCarouselCardProps) {
	const { language } = useLanguage();

	const dragX = useMotionValue(0);
	const dragY = useMotionValue(0);

	// Custom transforms for background cards stack peek effect
	const leftPeekX = useTransform(dragX, (x) => x > 0 ? x * -0.15 : 0);
	const leftPeekOpacity = useTransform(dragX, (x) => x > 0 ? Math.min(x / 30, 0.95) : 0);
	
	const rightPeekX = useTransform(dragX, (x) => x < 0 ? x * -0.15 : 0);
	const rightPeekOpacity = useTransform(dragX, (x) => x < 0 ? Math.min(Math.abs(x) / 30, 0.95) : 0);

	const horizontalPeekScale = useTransform(dragX, (x) => {
		const absX = Math.abs(x);
		return Math.min(0.90 + (absX / 600), 0.96);
	});

	const verticalStack1Y = useTransform(dragY, (y) => Math.max(0, y * 0.45));
	const verticalStack1Scale = useTransform(dragY, (y) => Math.min(0.95, 0.90 + (y / 1000)));
	const verticalStack1Opacity = useTransform(dragY, (y) => y > 0 ? Math.min(y / 40, 0.9) : 0);

	const verticalStack2Y = useTransform(dragY, (y) => Math.max(0, y * 0.22));
	const verticalStack2Scale = useTransform(dragY, (y) => Math.min(0.90, 0.84 + (y / 1500)));
	const verticalStack2Opacity = useTransform(dragY, (y) => y > 0 ? Math.min(y / 60, 0.75) : 0);

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo", type: "default" as const, color: "emerald", target: undefined },
		...pockets
	], [pockets, language]);

	// Pre-calculated target pocket colors
	const prevPocket = carouselPockets[(activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length];
	const prevColorKey = prevPocket.color || "emerald";
	const prevGradient = {
		emerald: "from-emerald-500/80 to-teal-500/80",
		indigo: "from-indigo-500/80 to-purple-500/80",
		amber: "from-amber-500/80 to-rose-500/80",
		rose: "from-rose-500/80 to-pink-500/80",
		cyan: "from-cyan-500/80 to-blue-500/80",
		violet: "from-violet-500/80 to-fuchsia-500/80",
		orange: "from-orange-500/80 to-yellow-500/80"
	}[prevColorKey];

	const nextPocket = carouselPockets[(activePocketIdx + 1) % carouselPockets.length];
	const nextColorKey = nextPocket.color || "emerald";
	const nextGradient = {
		emerald: "from-emerald-500/80 to-teal-500/80",
		indigo: "from-indigo-500/80 to-purple-500/80",
		amber: "from-amber-500/80 to-rose-500/80",
		rose: "from-rose-500/80 to-pink-500/80",
		cyan: "from-cyan-500/80 to-blue-500/80",
		violet: "from-violet-500/80 to-fuchsia-500/80",
		orange: "from-orange-500/80 to-yellow-500/80"
	}[nextColorKey];

	const stack2Pocket = carouselPockets[(activePocketIdx + 2) % carouselPockets.length];
	const stack2ColorKey = stack2Pocket.color || "emerald";
	const stack2Gradient = {
		emerald: "from-emerald-500/60 to-teal-500/60",
		indigo: "from-indigo-500/60 to-purple-500/60",
		amber: "from-amber-500/60 to-rose-500/60",
		rose: "from-rose-500/60 to-pink-500/60",
		cyan: "from-cyan-500/60 to-blue-500/60",
		violet: "from-violet-500/60 to-fuchsia-500/60",
		orange: "from-orange-500/60 to-yellow-500/60"
	}[stack2ColorKey];

	const maskValue = (val: string) => isPrivate ? "******" : val;

	return (
		<section className="relative z-0 isolate mt-2">
			{/* Background Peek Card (Previous Pocket, peeks left) */}
			{pockets.length > 0 && (
				<motion.div
					style={{
						x: leftPeekX,
						opacity: leftPeekOpacity,
						scale: horizontalPeekScale,
					}}
					className={`absolute inset-0 bg-gradient-to-br ${prevGradient} rounded-3xl -z-10 pointer-events-none`}
				/>
			)}

			{/* Background Peek Card (Next Pocket, peeks right) */}
			{pockets.length > 0 && (
				<motion.div
					style={{
						x: rightPeekX,
						opacity: rightPeekOpacity,
						scale: horizontalPeekScale,
					}}
					className={`absolute inset-0 bg-gradient-to-br ${nextGradient} rounded-3xl -z-10 pointer-events-none`}
				/>
			)}

			{/* Vertical Stack Hint Cards (Swipe Down) */}
			{pockets.length > 0 && (
				<>
					{/* Stack Card 1 (directly behind main card) */}
					<motion.div
						style={{
							y: verticalStack1Y,
							opacity: verticalStack1Opacity,
							scale: verticalStack1Scale,
							rotate: 1.5,
						}}
						className={`absolute inset-0 bg-gradient-to-br ${nextGradient} rounded-3xl -z-10 pointer-events-none`}
					/>
					{/* Stack Card 2 (further behind, slightly opposite rotate) */}
					<motion.div
						style={{
							y: verticalStack2Y,
							opacity: verticalStack2Opacity,
							scale: verticalStack2Scale,
							rotate: -1.5,
						}}
						className={`absolute inset-0 bg-gradient-to-br ${stack2Gradient} rounded-3xl -z-20 pointer-events-none`}
					/>
				</>
			)}

			<motion.div 
				style={{ x: dragX, y: dragY }}
				drag={pockets.length > 0 ? true : false}
				dragConstraints={{ left: -120, right: 120, top: 0, bottom: 100 }}
				dragElastic={{ top: 0, bottom: 0.15, left: 0.15, right: 0.15 }}
				dragDirectionLock={true}
				onDragEnd={(e, info) => {
					if (pockets.length === 0) return;
					const swipeThreshold = 50;
					if (info.offset.y > swipeThreshold) {
						onPocketSelectClick();
					} else if (info.offset.x < -swipeThreshold) {
						setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
					} else if (info.offset.x > swipeThreshold) {
						setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
					}
					// Snaps back to exactly 0,0 with smooth spring simulation
					animate(dragX, 0, { type: "spring", stiffness: 350, damping: 25 });
					animate(dragY, 0, { type: "spring", stiffness: 350, damping: 25 });
				}}
				className="w-full cursor-grab active:cursor-grabbing select-none"
			>
				<div 
					onClick={(e) => {
						if (onCardClick) {
							e.stopPropagation();
							onCardClick();
						}
					}}
					className={`bg-gradient-to-br ${themeColors.gradient} p-6 rounded-3xl text-black shadow-lg ${themeColors.shadow} flex flex-col justify-between min-h-[140px] relative overflow-hidden transition-all duration-300 ${
						onCardClick ? "cursor-pointer hover:shadow-xl active:scale-[0.99]" : ""
					}`}
				>
					<div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full blur-2xl pointer-events-none" />
					
					<AnimatePresence mode="wait">
						<motion.div
							key={activePocket.id}
							initial={{ x: 20, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: -20, opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="w-full flex flex-col justify-between gap-y-4"
						>
							<div>
								<div className="flex justify-between items-start">
									<div className="flex flex-col max-w-[70%]">
										<span className="text-[9px] font-black uppercase tracking-wider opacity-60">
											{activePocket.id === "net_worth" ? (language === "en" ? "Total Balance" : "Total Saldo") : "Pocket"}
										</span>
										<h4 className="text-sm font-black uppercase tracking-wide flex items-center gap-1.5 mt-0.5 truncate text-ellipsis overflow-hidden whitespace-nowrap">
											<Wallet size={14} className="opacity-70 shrink-0" />
											<span className="truncate">{activePocket.name}</span>
										</h4>
									</div>
									<div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
										{pockets.length > 0 && onMoveFundsClick && (
											<Button 
												size="icon" 
												variant="ghost" 
												onClick={(e) => { e.stopPropagation(); onMoveFundsClick(); }}
												disabled={isSyncing}
												className="h-8 w-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full cursor-pointer flex items-center justify-center bg-transparent"
												aria-label="Pindah Dana"
												title={language === "en" ? "Move Funds" : "Pindah Dana"}
											>
												<ArrowLeftRight size={14} />
											</Button>
										)}

										<Button 
											size="icon" 
											variant="ghost" 
											onClick={(e) => { e.stopPropagation(); togglePrivacy(); }}
											disabled={isSyncing}
											className="h-8 w-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full cursor-pointer flex items-center justify-center bg-transparent"
										>
											{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
										</Button>
										
										{/* Settings gear icon button inside card - Only visible in homepage form variant */}
										{variant === "form" && onSettingsClick && (
											<Button 
												size="icon" 
												variant="ghost" 
												onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
												disabled={isSyncing}
												className="h-8 w-8 bg-black/10 hover:bg-black/25 text-black border-none rounded-full cursor-pointer flex items-center justify-center bg-transparent"
												aria-label="Pengaturan Dasbor"
											>
												<Settings size={14} />
											</Button>
										)}
									</div>
								</div>

								<div className="flex items-baseline justify-between mt-3 w-full">
									<h2 className="text-3xl font-black tracking-tight text-left">
										{maskValue(formatCurrency(totalAmount))}
									</h2>
									{variant === "form" && (
										<span className="text-[9px] font-black uppercase tracking-widest opacity-40 select-none pointer-events-none shrink-0 text-right">
											{language === "en" ? "Click for details" : "Klik untuk detail"}
										</span>
									)}
								</div>

								{/* Static balance details directly inside card - Only visible in homepage form variant */}
								{variant === "form" && (
									<div className="mt-2 flex items-center justify-between text-[10px] font-black opacity-80 flex-wrap gap-y-1.5 w-full">
										<div className="flex items-center gap-1.5">
											<Wallet size={12} className="opacity-50" />
											<span>{maskValue(formatCurrency(transactions.find(t => t.category === "Initial Balance" && (activePocket.id === "net_worth" || t.pocket === activePocket.name || t.pocket === activePocket.id))?.amount || 0))}</span>
										</div>
										
										<div className="flex items-center gap-3">
											<div className="flex items-center gap-1 text-emerald-950/80">
												<ChevronLeft size={12} className="rotate-90" />
												<span>{maskValue(formatCurrency(transactions.filter(t => t.category !== "Initial Balance" && (activePocket.id === "net_worth" || t.pocket === activePocket.name || t.pocket === activePocket.id) && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)))}</span>
											</div>
											<div className="w-1 h-1 rounded-full bg-black/10" />
											<div className="flex items-center gap-1 text-red-950/80">
												<ChevronRight size={12} className="rotate-90" />
												<span>{maskValue(formatCurrency(Math.abs(transactions.filter(t => t.category !== "Initial Balance" && (activePocket.id === "net_worth" || t.pocket === activePocket.name || t.pocket === activePocket.id) && t.amount < 0).reduce((sum, t) => sum + t.amount, 0))))}</span>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Navigation controls < ... > at the bottom of the card content */}
							{pockets.length > 0 && (
								<div className="pt-2 border-t border-black/5 flex items-center justify-between mt-4" onClick={(e) => e.stopPropagation()}>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
										}}
										className={`w-8 h-8 bg-transparent hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-none ${themeColors.navText}`}
										aria-label="Previous Pocket"
									>
										<ChevronLeft size={16} />
									</button>
									
									{/* Titik 3 Button to open direct selection dialog */}
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onPocketSelectClick();
										}}
										className={`px-4 py-1.5 bg-transparent hover:scale-105 active:scale-95 text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1 border-none ${themeColors.navText}`}
									>
										<span className="w-1.5 h-1.5 rounded-full bg-current" />
										<span className="w-1.5 h-1.5 rounded-full bg-current" />
										<span className="w-1.5 h-1.5 rounded-full bg-current" />
									</button>
									
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
										}}
										className={`w-8 h-8 bg-transparent hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-none ${themeColors.navText}`}
										aria-label="Next Pocket"
									>
										<ChevronRight size={16} />
									</button>
								</div>
							)}
						</motion.div>
					</AnimatePresence>
				</div>
			</motion.div>
		</section>
	);
}

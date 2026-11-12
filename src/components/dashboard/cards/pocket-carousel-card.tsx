"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, animate } from "framer-motion";
import { Wallet, Settings, ChevronLeft, ChevronRight, Eye, EyeOff, ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PocketDef, isInternalTransfer } from "@/hooks/use-dashboard-logic";
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
		cardText?: string;
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

const SOFT_POCKET_GRADIENTS: Record<string, string> = {
	emerald: "from-[#6EE7B7] to-[#34D399]",
	indigo: "from-[#A5B4FC] to-[#818CF8]",
	amber: "from-[#FCD34D] to-[#FBBF24]",
	rose: "from-[#FDA4AF] to-[#FB7185]",
	cyan: "from-[#67E8F9] to-[#22D3EE]",
	violet: "from-[#C4B5FD] to-[#A78BFA]",
	orange: "from-[#FDBA74] to-[#FB923C]",
};

const SOFT_POCKET_TEXT: Record<string, string> = {
	emerald: "text-[#063626]",
	indigo: "text-[#1E1B4B]",
	amber: "text-[#451A03]",
	rose: "text-[#4C0519]",
	cyan: "text-[#083344]",
	violet: "text-[#2E1065]",
	orange: "text-[#431407]",
};

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

	// Active foreground card subtle 3D response during drag
	const activeRotateZ = useTransform(dragX, [-140, 0, 140], [-2.2, 0, 2.2]);
	const activeScale = useTransform([dragX, dragY], ([x, y]) => {
		const dist = Math.hypot(Number(x) || 0, Number(y) || 0);
		return Math.max(0.975, 1 - dist / 4500);
	});

	// ─── 1. IDLE + SWIPE-DOWN SYMMETRICAL DECK STACK ("All Pockets") ───────────
	// Strict downward pull limit (~48px) so the card never gets dragged far down.
	// When pulling down (dragY > 2), the background deck rises prominently (-28px and -44px)
	// and reveals "All Pockets" / "Semua Kantong" at the top of the stack.
	const deck1Y = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numY > 2) {
			const progress = Math.min(numY / 42, 1);
			return 8 - progress * 36; // +8px (idle bottom peek) -> -28px (prominent top reveal on swipe down)
		}
		const horizProgress = Math.min(Math.abs(numX) / 45, 1);
		return 8 * (1 - horizProgress);
	});

	const deck1Scale = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numY > 2) {
			const progress = Math.min(numY / 42, 1);
			return 0.955 + progress * 0.025; // 0.955 -> 0.98
		}
		const horizProgress = Math.min(Math.abs(numX) / 55, 1);
		return 0.955 - horizProgress * 0.02;
	});

	const deck1Opacity = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numY > 2) {
			return Math.min(0.9 + (numY / 42) * 0.1, 1);
		}
		const horizProgress = Math.min(Math.abs(numX) / 35, 1);
		return 0.85 * (1 - horizProgress);
	});

	const deck2Y = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numY > 2) {
			const progress = Math.min(numY / 42, 1);
			return 15 - progress * 59; // +15px (idle bottom peek) -> -44px (prominent second stack rise)
		}
		const horizProgress = Math.min(Math.abs(numX) / 45, 1);
		return 15 * (1 - horizProgress);
	});

	const deck2Scale = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numY > 2) {
			const progress = Math.min(numY / 42, 1);
			return 0.91 + progress * 0.035; // 0.91 -> 0.945
		}
		const horizProgress = Math.min(Math.abs(numX) / 55, 1);
		return 0.91 - horizProgress * 0.02;
	});

	const deck2Opacity = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numY > 2) {
			return Math.min(0.65 + (numY / 42) * 0.3, 0.95);
		}
		const horizProgress = Math.min(Math.abs(numX) / 35, 1);
		return 0.55 * (1 - horizProgress);
	});

	// ─── 2. MIRROR-SYMMETRICAL HORIZONTAL SWIPE CARDS (LEFT / RIGHT) ──────────
	// Swiping Right (dragX > 0) reveals Previous Pocket peeking from the left with vertical label
	const prevCardX = useTransform(dragX, (x) => {
		if (x <= 0) return -18;
		const progress = Math.min(x / 90, 1);
		return -26 + progress * 10; // Peeks out on the left edge so vertical pocket name is clearly readable
	});
	const prevCardScale = useTransform(dragX, (x) => {
		if (x <= 0) return 0.95;
		const progress = Math.min(x / 90, 1);
		return 0.95 + progress * 0.04;
	});
	const prevCardOpacity = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numX <= 2 || numY > 20) return 0;
		return Math.min(0.4 + numX / 30, 1);
	});

	// Swiping Left (dragX < 0) reveals Next Pocket peeking from the right with vertical label
	const nextCardX = useTransform(dragX, (x) => {
		if (x >= 0) return 18;
		const progress = Math.min(Math.abs(x) / 90, 1);
		return 26 - progress * 10; // Peeks out on the right edge so vertical pocket name is clearly readable
	});
	const nextCardScale = useTransform(dragX, (x) => {
		if (x >= 0) return 0.95;
		const progress = Math.min(Math.abs(x) / 90, 1);
		return 0.95 + progress * 0.04;
	});
	const nextCardOpacity = useTransform([dragX, dragY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numX >= -2 || numY > 20) return 0;
		return Math.min(0.4 + Math.abs(numX) / 30, 1);
	});

	const carouselPockets = React.useMemo<PocketDef[]>(() => [
		{ id: "net_worth", name: language === "en" ? "Total Balance" : "Total Saldo", type: "default" as const, color: "emerald", target: undefined },
		...pockets
	], [pockets, language]);

	// Pre-calculated target pocket colors & typography
	const prevPocket = carouselPockets[(activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length];
	const prevColorKey = prevPocket.color || "emerald";
	const prevGradient = SOFT_POCKET_GRADIENTS[prevColorKey] || SOFT_POCKET_GRADIENTS.emerald;
	const prevTextClass = SOFT_POCKET_TEXT[prevColorKey] || SOFT_POCKET_TEXT.emerald;

	const nextPocket = carouselPockets[(activePocketIdx + 1) % carouselPockets.length];
	const nextColorKey = nextPocket.color || "emerald";
	const nextGradient = SOFT_POCKET_GRADIENTS[nextColorKey] || SOFT_POCKET_GRADIENTS.emerald;
	const nextTextClass = SOFT_POCKET_TEXT[nextColorKey] || SOFT_POCKET_TEXT.emerald;

	const stack2Pocket = carouselPockets[(activePocketIdx + 2) % carouselPockets.length];
	const stack2ColorKey = stack2Pocket.color || "emerald";
	const stack2Gradient = SOFT_POCKET_GRADIENTS[stack2ColorKey] || SOFT_POCKET_GRADIENTS.emerald;

	const activeColorKey = activePocket.color || "emerald";
	const cardTextClass = themeColors.cardText || SOFT_POCKET_TEXT[activeColorKey] || "text-[#063626]";

	const maskValue = (val: string) => isPrivate ? "******" : val;

	const mainPocketBalance = React.useMemo(() => {
		return transactions
			.filter(t => !pockets.some(p => t.pocket === p.name || t.pocket === p.id || (t as any).pocket_id === p.id))
			.reduce((sum, t) => sum + t.amount, 0);
	}, [transactions, pockets]);

	const getPocketPreviewBalance = React.useCallback(
		(pocket: PocketDef) => {
			if (pocket.id === "net_worth") {
				return pockets.length > 0 ? mainPocketBalance : totalAmount;
			}
			return transactions
				.filter(
					(t) =>
						t.pocket === pocket.name ||
						t.pocket === pocket.id ||
						(t as any).pocket_id === pocket.id
				)
				.reduce((sum, t) => sum + t.amount, 0);
		},
		[pockets, mainPocketBalance, totalAmount, transactions]
	);

	const getPocketDisplayTitle = React.useCallback(
		(pocket: PocketDef) => {
			if (pocket.id === "net_worth" && pockets.length > 0) {
				return language === "en" ? "Main Pocket" : "Saldo Utama";
			}
			return pocket.name;
		},
		[pockets.length, language]
	);

	const matchesActivePocket = React.useCallback(
		(t: any) => {
			if (activePocket.id === "net_worth") {
				return !pockets.some(
					p => t.pocket === p.name || t.pocket === p.id || (t as any).pocket_id === p.id
				);
			}
			return (
				t.pocket === activePocket.name ||
				t.pocket === activePocket.id ||
				(t as any).pocket_id === activePocket.id
			);
		},
		[activePocket, pockets]
	);

	const displayedBalance =
		activePocket.id === "net_worth" && pockets.length > 0 ? mainPocketBalance : totalAmount;

	// Content for the Swipe-Down Deck ("All Pockets" / "Semua Kantong")
	const renderAllPocketsDeckContent = (textClass: string) => (
		<div className={`w-full h-full flex flex-col justify-start items-center pt-2.5 px-6 ${textClass} select-none pointer-events-none`}>
			<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/8 dark:bg-black/15">
				<Wallet size={12} className="opacity-85 shrink-0" />
				<span className="text-[10px] font-black uppercase tracking-widest leading-none">
					{language === "en" ? "All Pockets" : "Semua Kantong"}
				</span>
				<span className="text-[9px] font-extrabold opacity-65">
					({carouselPockets.length})
				</span>
			</div>
		</div>
	);

	// Content for Horizontal Swipe Peek Card (Vertical rotated pocket icon + name along exposed side edge)
	const renderHorizontalPeekContent = (pocket: PocketDef, textClass: string, side: "left" | "right") => (
		<div className={`w-full h-full relative flex items-center ${textClass} select-none pointer-events-none`}>
			{/* Vertical rotated pocket badge on the exposed edge */}
			<div
				className={`absolute top-0 bottom-0 ${
					side === "right" ? "right-0 w-12" : "left-0 w-12"
				} flex items-center justify-center`}
			>
				<div
					className={`flex items-center gap-1.5 whitespace-nowrap ${
						side === "right" ? "rotate-90" : "-rotate-90"
					}`}
				>
					<Wallet size={13} className="opacity-85 shrink-0" />
					<span className="text-[11px] font-black uppercase tracking-wider">
						{getPocketDisplayTitle(pocket)}
					</span>
				</div>
			</div>

			{/* Inner balance preview when dragged further */}
			<div className={`flex flex-col justify-center ${side === "right" ? "pl-6 pr-14" : "pl-14 pr-6"} opacity-75`}>
				<span className="text-[9px] font-extrabold uppercase tracking-wider opacity-65">
					{getPocketDisplayTitle(pocket)}
				</span>
				<p className="text-lg font-black tracking-tight leading-tight mt-0.5">
					{maskValue(formatCurrency(getPocketPreviewBalance(pocket)))}
				</p>
			</div>
		</div>
	);

	return (
		<section className={`relative z-0 isolate mt-2 ${pockets.length > 0 ? "mb-3.5" : ""}`}>
			{/* 1. Symmetrical Deck Stack (Idle Bottom Stack + Swipe-Down "All Pockets" Top Reveal) */}
			{pockets.length > 0 && (
				<>
					{/* Deck Layer 2 (Further behind, rises higher on swipe down) */}
					{carouselPockets.length > 2 && (
						<motion.div
							style={{
								y: deck2Y,
								scale: deck2Scale,
								opacity: deck2Opacity,
							}}
							className={`absolute inset-0 origin-center bg-gradient-to-br ${stack2Gradient} rounded-3xl -z-20 pointer-events-none shadow-[0_4px_10px_rgba(0,0,0,0.06)] overflow-hidden`}
						>
							<div className="absolute inset-0 bg-black/12 dark:bg-black/22" />
						</motion.div>
					)}

					{/* Deck Layer 1 (Directly behind active card, displays "All Pockets" on swipe down) */}
					<motion.div
						style={{
							y: deck1Y,
							scale: deck1Scale,
							opacity: deck1Opacity,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onPocketSelectClick();
						}}
						className={`absolute inset-0 origin-center bg-gradient-to-br ${nextGradient} rounded-3xl -z-10 cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.08)] overflow-hidden`}
					>
						<div className="absolute inset-0 bg-black/5 dark:bg-black/10 pointer-events-none" />
						{renderAllPocketsDeckContent(nextTextClass)}
					</motion.div>
				</>
			)}

			{/* 2. Mirror-Symmetrical Horizontal Peek Cards (Swipe Left / Swipe Right with Vertical Pocket Name) */}
			{pockets.length > 0 && (
				<>
					{/* Previous Pocket Card (Appears from left when swiping right, vertical label on left edge) */}
					<motion.div
						style={{
							x: prevCardX,
							scale: prevCardScale,
							opacity: prevCardOpacity,
						}}
						className={`absolute inset-0 origin-center bg-gradient-to-br ${prevGradient} rounded-3xl -z-10 pointer-events-none shadow-[0_4px_10px_rgba(0,0,0,0.08)] overflow-hidden`}
					>
						{renderHorizontalPeekContent(prevPocket, prevTextClass, "left")}
					</motion.div>

					{/* Next Pocket Card (Appears from right when swiping left, vertical label on right edge) */}
					<motion.div
						style={{
							x: nextCardX,
							scale: nextCardScale,
							opacity: nextCardOpacity,
						}}
						className={`absolute inset-0 origin-center bg-gradient-to-br ${nextGradient} rounded-3xl -z-10 pointer-events-none shadow-[0_4px_10px_rgba(0,0,0,0.08)] overflow-hidden`}
					>
						{renderHorizontalPeekContent(nextPocket, nextTextClass, "right")}
					</motion.div>
				</>
			)}

			<motion.div 
				style={{ x: dragX, y: dragY, rotateZ: activeRotateZ, scale: activeScale }}
				drag={pockets.length > 0 ? true : false}
				dragConstraints={{ left: -95, right: 95, top: 0, bottom: 46 }}
				dragElastic={{ top: 0, bottom: 0.05, left: 0.14, right: 0.14 }}
				dragDirectionLock={true}
				onDragEnd={(e, info) => {
					if (pockets.length === 0) return;
					const vertThreshold = 30;
					const horizThreshold = 45;
					if (info.offset.y > vertThreshold) {
						onPocketSelectClick();
					} else if (info.offset.x < -horizThreshold) {
						setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
					} else if (info.offset.x > horizThreshold) {
						setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
					}
					// Snaps back to exactly 0,0 with smooth spring simulation
					animate(dragX, 0, { type: "spring", stiffness: 380, damping: 28 });
					animate(dragY, 0, { type: "spring", stiffness: 380, damping: 28 });
				}}
				className="w-full cursor-grab active:cursor-grabbing select-none relative z-10"
			>
				<div 
					onClick={(e) => {
						if (onCardClick) {
							e.stopPropagation();
							onCardClick();
						}
					}}
					className={`bg-gradient-to-br ${themeColors.gradient} ${
						variant === "form" ? "px-6 py-5 min-h-[144px]" : "p-6 min-h-[160px]"
					} rounded-3xl ${cardTextClass} shadow-[0_4px_10px_rgba(0,0,0,0.10)] flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
						onCardClick ? "cursor-pointer active:scale-[0.99]" : ""
					}`}
				>
					<AnimatePresence mode="wait">
						<motion.div
							key={activePocket.id}
							initial={{ x: 20, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: -20, opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="w-full flex flex-col justify-between flex-1 gap-y-3"
						>
							<div className="flex justify-between items-start gap-2">
								<div className="flex flex-col min-w-0 max-w-[72%]">
									<span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70 flex items-center gap-1.5 leading-none">
										{activePocket.id === "net_worth"
											? pockets.length > 0
												? (language === "en" ? "Main Pocket" : "Dompet Utama")
												: (language === "en" ? "Total Balance" : "Total Saldo")
											: "Pocket"}
										{isSyncing && <Loader2 size={10} className="animate-spin shrink-0 opacity-80" />}
									</span>
									<h4 className="text-xs sm:text-sm font-black uppercase tracking-wide flex items-center gap-1.5 mt-1.5 truncate text-ellipsis overflow-hidden whitespace-nowrap leading-tight">
										<Wallet size={14} className="opacity-75 shrink-0" />
										<span className="truncate">
											{activePocket.id === "net_worth" && pockets.length > 0
												? (language === "en" ? "Unallocated Balance" : "Saldo Utama")
												: activePocket.name}
										</span>
									</h4>
								</div>
								<div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
									{pockets.length > 0 && onMoveFundsClick && (
										<Button 
											size="icon" 
											variant="ghost" 
											onClick={(e) => { e.stopPropagation(); onMoveFundsClick(); }}
											disabled={isSyncing}
											className={`h-8 w-8 bg-black/8 hover:bg-black/15 ${cardTextClass} border-none rounded-xl cursor-pointer flex items-center justify-center transition-colors`}
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
										className={`h-8 w-8 bg-black/8 hover:bg-black/15 ${cardTextClass} border-none rounded-xl cursor-pointer flex items-center justify-center transition-colors`}
									>
										{isPrivate ? <EyeOff size={14} /> : <Eye size={14} />}
									</Button>
								</div>
							</div>

							<div className="flex items-baseline justify-between w-full py-1">
								<h2 className="text-2xl sm:text-3xl font-black tracking-tight text-left leading-none">
									{maskValue(formatCurrency(displayedBalance))}
								</h2>
								{variant === "form" && (
									<span className="text-[9px] font-extrabold uppercase tracking-widest opacity-55 select-none pointer-events-none shrink-0 text-right">
										{language === "en" ? "Click for details" : "Klik untuk detail"}
									</span>
								)}
							</div>

							{/* Static balance details (Initial Balance / Income / Expense) moved to detail (analytics) page */}
							{variant === "analytics" && (
								<div className="pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-black opacity-85 flex-wrap gap-y-1 w-full">
									<div className="flex items-center gap-1.5">
										<Wallet size={12} className="opacity-70" />
										<span>{maskValue(formatCurrency(transactions.filter(t => t.category === "Initial Balance" && matchesActivePocket(t)).reduce((sum, t) => sum + t.amount, 0)))}</span>
									</div>
									
									<div className="flex items-center gap-3">
										<div className="flex items-center gap-1 opacity-90">
											<ChevronLeft size={12} className="rotate-90" />
											<span>{maskValue(formatCurrency(transactions.filter(t => t.category !== "Initial Balance" && !isInternalTransfer(t) && matchesActivePocket(t) && t.amount > 0).reduce((sum, t) => sum + t.amount, 0)))}</span>
										</div>
										<div className="w-1 h-1 rounded-full bg-current/25" />
										<div className="flex items-center gap-1 text-red-950/85">
											<ChevronRight size={12} className="rotate-90" />
											<span>{maskValue(formatCurrency(Math.abs(transactions.filter(t => t.category !== "Initial Balance" && !isInternalTransfer(t) && matchesActivePocket(t) && t.amount < 0).reduce((sum, t) => sum + t.amount, 0))))}</span>
										</div>
									</div>
								</div>
							)}

							{/* Dedicated navigation area < ... > at the bottom of the card content (prevents accidental click-through to detail page) */}
							{pockets.length > 0 && (
								<div
									className="pt-1.5 border-t border-current/10 flex items-center justify-between"
									onClick={(e) => e.stopPropagation()}
								>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
										}}
										className={`w-7 h-7 bg-transparent hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-none rounded-xl hover:bg-black/8 ${themeColors.navText}`}
										aria-label="Previous Pocket"
									>
										<ChevronLeft size={16} />
									</button>

									{/* Dot indicator button to open direct pocket selection dialog */}
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onPocketSelectClick();
										}}
										aria-label={language === "en" ? "Select Pocket" : "Pilih Kantong"}
										className={`px-4 py-1.5 bg-transparent hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center justify-center gap-1.5 border-none rounded-xl hover:bg-black/8 ${themeColors.navText}`}
									>
										{carouselPockets.map((p, idx) => (
											<span
												key={p.id}
												className={`h-1.5 rounded-full transition-all duration-300 ${
													idx === activePocketIdx
														? "w-4 bg-current opacity-80"
														: "w-1.5 bg-current opacity-30 hover:opacity-50"
												}`}
											/>
										))}
									</button>

									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
										}}
										className={`w-7 h-7 bg-transparent hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer transition-all border-none rounded-xl hover:bg-black/8 ${themeColors.navText}`}
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

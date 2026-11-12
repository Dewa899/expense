"use client";

import * as React from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring, useTransform, AnimatePresence, animate, MotionValue } from "framer-motion";
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
	pullDownOffset?: MotionValue<number>;
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
	pullDownOffset,
}: PocketCarouselCardProps) {
	const { language } = useLanguage();

	const dragX = useMotionValue(0);
	const dragY = useMotionValue(0);
	const lockedDirectionRef = React.useRef<"x" | "y" | null>(null);

	// Silky spring-smoothed motion values for fluid 60/120fps stack & sibling push animation
	const smoothX = useSpring(dragX, { stiffness: 360, damping: 32, mass: 0.45 });
	const smoothY = useSpring(dragY, { stiffness: 340, damping: 30, mass: 0.5 });

	// Push the sibling card(s) below downward in real-time as the user pulls down
	useMotionValueEvent(smoothY, "change", (latestY) => {
		if (pullDownOffset) {
			pullDownOffset.set(Math.max(0, latestY));
		}
	});

	// Active foreground card subtle 3D response during drag
	const activeRotateZ = useTransform(smoothX, [-120, 0, 120], [-1.8, 0, 1.8]);
	const activeScale = useTransform([smoothX, smoothY], ([x, y]) => {
		const dist = Math.hypot(Number(x) || 0, Number(y) || 0);
		return Math.max(0.98, 1 - dist / 5000);
	});

	// ─── 1. IDLE + SWIPE-DOWN SYMMETRICAL DECK STACK ("All Pockets") ───────────
	// Generous, smooth downward travel (up to ~56px) while pushing the card below downward:
	// - Phase 1 (y: 0 -> 14px): Deck smoothly pops its top rim above the active card (+6px -> -3px)
	// - Phase 2 (y: 14 -> 56px): Both deck1 and deck2 glide downward together with the active card
	//   (-3px -> +22px and -7px -> +11px), opening a spacious 34px reveal for "All Pockets".
	const deck1Y = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Math.max(0, Number(y) || 0);
		if (numY > 0.5) {
			if (numY <= 14) {
				const t = numY / 14;
				const smooth = t * t * (3 - 2 * t);
				return 6 - 9 * smooth; // +6px (idle bottom peek) -> -3px (initial top reveal)
			}
			const extraY = Math.min(numY - 14, 48);
			return -3 + extraY * 0.6; // Glides DOWN together with the dragged card (-3px -> +25.8px)
		}
		const horizProgress = Math.min(Math.abs(numX) / 40, 1);
		return 6 * (1 - horizProgress);
	});

	const deck1Scale = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Math.max(0, Number(y) || 0);
		if (numY > 0.5) {
			const progress = Math.min(numY / 50, 1);
			return 0.96 + progress * 0.02; // 0.96 -> 0.98
		}
		const horizProgress = Math.min(Math.abs(numX) / 50, 1);
		return 0.96 - horizProgress * 0.02;
	});

	const deck1Opacity = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Math.max(0, Number(y) || 0);
		if (numY > 0.5) {
			return Math.min(0.88 + (numY / 35) * 0.12, 1);
		}
		const horizProgress = Math.min(Math.abs(numX) / 30, 1);
		return 0.85 * (1 - horizProgress);
	});

	const deck2Y = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Math.max(0, Number(y) || 0);
		if (numY > 0.5) {
			if (numY <= 14) {
				const t = numY / 14;
				const smooth = t * t * (3 - 2 * t);
				return 11 - 18 * smooth; // +11px (idle bottom peek) -> -7px (second card rim)
			}
			const extraY = Math.min(numY - 14, 48);
			return -7 + extraY * 0.42; // Glides DOWN together with deck1 and active card (-7px -> +13.1px)
		}
		const horizProgress = Math.min(Math.abs(numX) / 40, 1);
		return 11 * (1 - horizProgress);
	});

	const deck2Scale = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Math.max(0, Number(y) || 0);
		if (numY > 0.5) {
			const progress = Math.min(numY / 50, 1);
			return 0.92 + progress * 0.03; // 0.92 -> 0.95
		}
		const horizProgress = Math.min(Math.abs(numX) / 50, 1);
		return 0.92 - horizProgress * 0.02;
	});

	const deck2Opacity = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Math.max(0, Number(y) || 0);
		if (numY > 0.5) {
			return Math.min(0.65 + (numY / 40) * 0.3, 0.95);
		}
		const horizProgress = Math.min(Math.abs(numX) / 30, 1);
		return 0.55 * (1 - horizProgress);
	});

	const allPocketsBadgeOpacity = useTransform(smoothY, [4, 20], [0, 1]);
	const allPocketsBadgeScale = useTransform(smoothY, [4, 45], [0.9, 1.02]);
	const allPocketsBadgeY = useTransform(smoothY, [4, 45], [0, 4]);

	// ─── 2. MIRROR-SYMMETRICAL HORIZONTAL SWIPE CARDS (LEFT / RIGHT) ──────────
	// Swiping Right (dragX > 0) reveals Previous Pocket peeking from the left with scaling vertical title
	const prevCardX = useTransform(smoothX, (x) => {
		if (x <= 0) return -12;
		const progress = Math.min(x / 80, 1);
		return -18 + progress * 6;
	});
	const prevCardScale = useTransform(smoothX, (x) => {
		if (x <= 0) return 0.95;
		const progress = Math.min(x / 80, 1);
		return 0.95 + progress * 0.03;
	});
	const prevCardOpacity = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numX <= 1.5 || numY > 14) return 0;
		return Math.min(0.35 + numX / 28, 1);
	});
	// Scales the vertical pocket name smoothly with right-swipe progress without exceeding card bounds
	const prevLabelScale = useTransform(smoothX, [0, 15, 80], [0.76, 0.86, 1.08]);

	// Swiping Left (dragX < 0) reveals Next Pocket peeking from the right with scaling vertical title
	const nextCardX = useTransform(smoothX, (x) => {
		if (x >= 0) return 12;
		const progress = Math.min(Math.abs(x) / 80, 1);
		return 18 - progress * 6;
	});
	const nextCardScale = useTransform(smoothX, (x) => {
		if (x >= 0) return 0.95;
		const progress = Math.min(Math.abs(x) / 80, 1);
		return 0.95 + progress * 0.03;
	});
	const nextCardOpacity = useTransform([smoothX, smoothY], ([x, y]) => {
		const numX = Number(x) || 0;
		const numY = Number(y) || 0;
		if (numX >= -1.5 || numY > 14) return 0;
		return Math.min(0.35 + Math.abs(numX) / 28, 1);
	});
	// Scales the vertical pocket name smoothly with left-swipe progress without exceeding card bounds
	const nextLabelScale = useTransform(smoothX, [0, -15, -80], [0.76, 0.86, 1.08]);

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
		<motion.div
			style={{ opacity: allPocketsBadgeOpacity, scale: allPocketsBadgeScale, y: allPocketsBadgeY }}
			className={`w-full flex justify-center items-center pt-1.5 px-4 ${textClass} select-none pointer-events-none`}
		>
			<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/8 dark:bg-black/15">
				<Wallet size={11} className="opacity-85 shrink-0" />
				<span className="text-[9.5px] font-black uppercase tracking-widest leading-none">
					{language === "en" ? "All Pockets" : "Semua Kantong"}
				</span>
				<span className="text-[9px] font-extrabold opacity-65 leading-none">
					({carouselPockets.length})
				</span>
			</div>
		</motion.div>
	);

	// Content for Horizontal Swipe Peek Card (Only the vertical rotated pocket icon + name that scales with swipe progress)
	const renderHorizontalPeekContent = (pocket: PocketDef, textClass: string, side: "left" | "right") => (
		<div className={`w-full h-full relative flex items-center ${textClass} select-none pointer-events-none overflow-hidden`}>
			<div
				className={`absolute top-3 bottom-3 ${
					side === "right" ? "right-0 w-12" : "left-0 w-12"
				} flex items-center justify-center overflow-hidden`}
			>
				<motion.div
					style={{ scale: side === "right" ? nextLabelScale : prevLabelScale }}
					className={`flex items-center justify-center gap-1.5 whitespace-nowrap max-w-[94px] sm:max-w-[106px] px-2.5 py-1 rounded-full bg-black/8 dark:bg-black/15 ${
						side === "right" ? "rotate-90" : "-rotate-90"
					}`}
				>
					<Wallet size={11} className="opacity-85 shrink-0" />
					<span className="text-[10px] font-black uppercase tracking-wider truncate">
						{getPocketDisplayTitle(pocket)}
					</span>
				</motion.div>
			</div>
		</div>
	);

	return (
		<section className={`relative z-20 isolate mt-1.5 ${pockets.length > 0 ? "mb-3.5" : "mb-1.5"}`}>
			{/* 1. Symmetrical Deck Stack (Idle Bottom Stack + Swipe-Down "All Pockets" Top Reveal) */}
			{pockets.length > 0 && (
				<>
					{/* Deck Layer 2 (Further behind, moves up slightly then follows downward pull) */}
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

			{/* 2. Mirror-Symmetrical Horizontal Peek Cards (Swipe Left / Swipe Right with Scaling Vertical Pocket Name) */}
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
				dragConstraints={{ left: -85, right: 85, top: 0, bottom: 56 }}
				dragElastic={{ top: 0, bottom: 0.08, left: 0.12, right: 0.12 }}
				dragDirectionLock={true}
				onDirectionLock={(axis) => {
					lockedDirectionRef.current = axis;
					if (axis === "x") dragY.set(0);
					if (axis === "y") dragX.set(0);
				}}
				onDragStart={() => {
					lockedDirectionRef.current = null;
				}}
				onDrag={(_e, info) => {
					if (!lockedDirectionRef.current) {
						const absX = Math.abs(info.offset.x);
						const absY = Math.abs(info.offset.y);
						if (absX > 4 || absY > 4) {
							// Favor horizontal lock whenever horizontal movement is at least 75% of vertical movement
							lockedDirectionRef.current = absX >= absY * 0.75 ? "x" : "y";
						}
					}
					if (lockedDirectionRef.current === "x") {
						dragY.set(0);
					} else if (lockedDirectionRef.current === "y") {
						dragX.set(0);
						// When swiping UP on the card (finger moves up, offset.y < 0), allow scrolling down the page
						if (info.offset.y <= 0) {
							dragY.set(0);
							if (
								info.delta.y < 0 &&
								typeof window !== "undefined" &&
								(typeof CSS === "undefined" || typeof CSS.supports !== "function" || !CSS.supports("touch-action", "pan-down"))
							) {
								window.scrollBy(0, -info.delta.y);
							}
						}
					}
				}}
				onDragEnd={(_e, info) => {
					const lockedAxis = lockedDirectionRef.current;
					lockedDirectionRef.current = null;
					if (pockets.length === 0) return;

					const vertThreshold = 26;
					const horizThreshold = 38;
					const absX = Math.abs(info.offset.x);
					const absY = Math.abs(info.offset.y);

					// If the drag started horizontally or had dominant horizontal travel, ONLY switch pockets (never open All Pockets)
					const isHorizontalSwipe = lockedAxis === "x" || absX >= absY * 0.8;

					if (isHorizontalSwipe) {
						if (info.offset.x < -horizThreshold) {
							setActivePocketIdx((activePocketIdx + 1) % carouselPockets.length);
						} else if (info.offset.x > horizThreshold) {
							setActivePocketIdx((activePocketIdx - 1 + carouselPockets.length) % carouselPockets.length);
						}
					} else if (lockedAxis === "y" && info.offset.y > vertThreshold && absY > absX * 1.2) {
						onPocketSelectClick();
					}

					// Snaps back to 0,0 with smooth critically-damped spring simulation
					animate(dragX, 0, { type: "spring", stiffness: 360, damping: 30 });
					animate(dragY, 0, { type: "spring", stiffness: 340, damping: 28 });
				}}
				className={`w-full cursor-grab active:cursor-grabbing select-none relative z-10 ${
					pockets.length > 0 ? "[touch-action:pan-down_!important]" : ""
				}`}
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

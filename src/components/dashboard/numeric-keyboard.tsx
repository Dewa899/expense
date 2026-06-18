"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

// ─── Rupiah Formatting Utilities ──────────────────────────────────────────────

/** Formats a raw integer string to Indonesian Rupiah style: 1.000.000 */
export function formatRupiah(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (!digits) return "";
	return Number(digits).toLocaleString("id-ID");
}

/** Strips Rupiah formatting and returns plain integer string */
export function stripRupiah(formatted: string): string {
	return formatted.replace(/\./g, "").replace(/,/g, "");
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NumericKeyboardProps {
	value: string; // Raw formatted value, e.g. "12.500"
	onChange: (value: string) => void; // Called with formatted value
	onSubmit: () => void;
	disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
	{ label: "+1.000", value: 1000 },
	{ label: "+5.000", value: 5000 },
	{ label: "+10.000", value: 10000 },
	{ label: "+50.000", value: 50000 },
];

export function NumericKeyboard({
	value,
	onChange,
	onSubmit,
	disabled = false,
}: NumericKeyboardProps) {
	const { t } = useLanguage();

	const rawNumber = React.useMemo(() => {
		const stripped = stripRupiah(value);
		return stripped ? parseInt(stripped, 10) : 0;
	}, [value]);

	const handleDigit = (digit: string) => {
		if (disabled) return;
		const currentRaw = stripRupiah(value);
		const newRaw = currentRaw === "0" || !currentRaw ? digit : currentRaw + digit;
		onChange(formatRupiah(newRaw));
	};

	const handleBackspace = () => {
		if (disabled) return;
		const currentRaw = stripRupiah(value);
		const newRaw = currentRaw.slice(0, -1);
		onChange(newRaw ? formatRupiah(newRaw) : "");
	};

	// Ref to track the latest value prop and avoid closure stale state in setInterval
	const valueRef = React.useRef(value);
	React.useEffect(() => {
		valueRef.current = value;
	}, [value]);

	// ─── Click-and-Hold (Hold to Delete) continuous deletion ───────────
	const deleteTimerRef = React.useRef<NodeJS.Timeout | null>(null);
	const deleteIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

	const startContinuousDelete = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		if (disabled) return;

		// Perform initial single deletion
		handleBackspace();

		// Set a delay of 400ms before starting continuous delete
		deleteTimerRef.current = setTimeout(() => {
			deleteIntervalRef.current = setInterval(() => {
				const currentRaw = stripRupiah(valueRef.current || "");
				const newRaw = currentRaw.slice(0, -1);
				onChange(newRaw ? formatRupiah(newRaw) : "");
			}, 80); // delete a digit every 80ms
		}, 400);
	};

	const stopContinuousDelete = () => {
		if (deleteTimerRef.current) {
			clearTimeout(deleteTimerRef.current);
			deleteTimerRef.current = null;
		}
		if (deleteIntervalRef.current) {
			clearInterval(deleteIntervalRef.current);
			deleteIntervalRef.current = null;
		}
	};

	// Clean up timers on unmount
	React.useEffect(() => {
		return () => {
			if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
			if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
		};
	}, []);

	const handleQuickAdd = (addValue: number) => {
		if (disabled) return;
		const newTotal = rawNumber + addValue;
		onChange(formatRupiah(String(newTotal)));
	};

	// CSS classes for premium styling matching native mobile keyboards
	const normalKeyClass = "h-14 rounded-lg bg-white dark:bg-zinc-800 text-2xl font-normal text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 active:scale-95 active:bg-zinc-100 dark:active:bg-zinc-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center disabled:opacity-40 select-none cursor-pointer";
	
	const specialKeyClass = "h-14 rounded-lg bg-[#d0d3d9] dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 hover:bg-[#c4c7cc] dark:hover:bg-zinc-600/60 active:scale-95 active:bg-[#b8bbc2] dark:active:bg-zinc-600 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center disabled:opacity-40 select-none cursor-pointer";
	
	const selesaiKeyClass = "row-span-3 h-full rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_1px_3px_rgba(16,185,129,0.3)] active:scale-[0.98] flex items-center justify-center disabled:opacity-40 select-none cursor-pointer";

	return (
		<AnimatePresence>
			<motion.div
				key="numeric-keyboard"
				initial={{ y: "100%", opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: "100%", opacity: 0 }}
				transition={{ type: "spring", damping: 28, stiffness: 300 }}
				className="fixed bottom-0 left-0 right-0 z-50 bg-[#e3e4e6] dark:bg-zinc-950 border-t border-zinc-300 dark:border-zinc-800 pb-safe shadow-2xl"
			>
				{/* Quick Add Chips container (has slightly lighter background for division) */}
				<div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800/50">
					{QUICK_CHIPS.map((chip) => (
						<button
							type="button"
							key={chip.label}
							onClick={() => handleQuickAdd(chip.value)}
							disabled={disabled}
							className="flex-shrink-0 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
						>
							{chip.label}
						</button>
					))}
				</div>

				{/* Key Grid: 4 columns structure matching reference layout */}
				<div className="grid grid-cols-4 gap-[6px] p-[6px]">
					{/* Row 1 */}
					<button type="button" onClick={() => handleDigit("1")} disabled={disabled} className={normalKeyClass}>1</button>
					<button type="button" onClick={() => handleDigit("2")} disabled={disabled} className={normalKeyClass}>2</button>
					<button type="button" onClick={() => handleDigit("3")} disabled={disabled} className={normalKeyClass}>3</button>
					<button
						type="button"
						onMouseDown={startContinuousDelete}
						onMouseUp={stopContinuousDelete}
						onMouseLeave={stopContinuousDelete}
						onTouchStart={startContinuousDelete}
						onTouchEnd={stopContinuousDelete}
						disabled={disabled}
						className={specialKeyClass}
					>
						<Delete size={20} />
					</button>

					{/* Row 2 */}
					<button type="button" onClick={() => handleDigit("4")} disabled={disabled} className={normalKeyClass}>4</button>
					<button type="button" onClick={() => handleDigit("5")} disabled={disabled} className={normalKeyClass}>5</button>
					<button type="button" onClick={() => handleDigit("6")} disabled={disabled} className={normalKeyClass}>6</button>
					<button type="button" onClick={onSubmit} disabled={disabled} className={selesaiKeyClass}>
						{t("done")}
					</button>

					{/* Row 3 */}
					<button type="button" onClick={() => handleDigit("7")} disabled={disabled} className={normalKeyClass}>7</button>
					<button type="button" onClick={() => handleDigit("8")} disabled={disabled} className={normalKeyClass}>8</button>
					<button type="button" onClick={() => handleDigit("9")} disabled={disabled} className={normalKeyClass}>9</button>

					{/* Row 4 */}
					<div className="invisible" />
					<button type="button" onClick={() => handleDigit("0")} disabled={disabled} className={normalKeyClass}>0</button>
					<button
						type="button"
						onClick={() => {
							if (disabled) return;
							const currentRaw = stripRupiah(value);
							if (!currentRaw) return;
							onChange(formatRupiah(currentRaw + "000"));
						}}
						disabled={disabled}
						className={`${normalKeyClass} text-lg font-medium`}
					>
						000
					</button>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

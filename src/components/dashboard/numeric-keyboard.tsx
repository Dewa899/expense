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

/** Safely evaluates addition and subtraction expressions without using eval() */
export function evaluateExpression(expr: string): number {
	const cleaned = expr.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
	if (!cleaned) return 0;

	// Tokenize numbers and operators
	const tokens = cleaned.match(/(\d+|[+-])/g);
	if (!tokens) return 0;

	let result = 0;
	let currentOp = "+";

	for (const token of tokens) {
		if (token === "+" || token === "-") {
			currentOp = token;
		} else {
			const num = parseInt(token, 10) || 0;
			if (currentOp === "+") {
				result += num;
			} else if (currentOp === "-") {
				result -= num;
			}
		}
	}
	return result;
}

/** Formats each number token in the expression while keeping operators and spaces */
export function formatExpression(expr: string): string {
	const cleaned = expr.replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
	const tokens = cleaned.match(/(\d+|[+-])/g);
	if (!tokens) return "";

	return tokens
		.map((token) => {
			if (token === "+" || token === "-") {
				return ` ${token} `;
			} else {
				return formatRupiah(token);
			}
		})
		.join("");
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NumericKeyboardProps {
	value: string; // Current value in expression form (e.g. "10.000 + 5.000")
	onChange: (value: string) => void;
	onSubmit: () => void;
	disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NumericKeyboard({
	value,
	onChange,
	onSubmit,
	disabled = false,
}: NumericKeyboardProps) {
	const { t } = useLanguage();

	const handleDigit = (digit: string) => {
		if (disabled) return;
		const cleaned = (value || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
		let newRaw = "";
		if (cleaned === "0" || !cleaned) {
			newRaw = digit;
		} else {
			newRaw = cleaned + digit;
		}
		onChange(formatExpression(newRaw));
	};

	const handleBackspace = () => {
		if (disabled) return;
		const cleaned = (value || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
		if (!cleaned) return;
		const newRaw = cleaned.slice(0, -1);
		onChange(newRaw ? formatExpression(newRaw) : "");
	};

	const handleOperator = (operator: "+" | "-") => {
		if (disabled) return;
		const cleaned = (value || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
		if (!cleaned) {
			onChange(`0 ${operator} `);
			return;
		}

		const endsWithOperator = cleaned.endsWith("+") || cleaned.endsWith("-");
		if (endsWithOperator) {
			const base = cleaned.slice(0, -1);
			onChange(formatExpression(base + operator));
		} else {
			const tokens = cleaned.match(/(\d+|[+-])/g);
			const hasActiveOperator = tokens?.some(t => t === "+" || t === "-");
			
			if (hasActiveOperator) {
				const result = evaluateExpression(cleaned);
				onChange(formatExpression(result.toString() + operator));
			} else {
				onChange(formatExpression(cleaned + operator));
			}
		}
	};

	const handleDone = () => {
		if (disabled) return;
		const cleaned = (value || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
		if (cleaned) {
			const result = evaluateExpression(cleaned);
			onChange(formatRupiah(result.toString()));
		}
		onSubmit();
	};

	// Ref to track the latest value prop for the continuous delete timer
	const valueRef = React.useRef(value);
	React.useEffect(() => {
		valueRef.current = value;
	}, [value]);

	// ─── Click-and-Hold continuous deletion ───────────────────────────
	const deleteTimerRef = React.useRef<NodeJS.Timeout | null>(null);
	const deleteIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
	const isTouchActive = React.useRef(false);

	const startContinuousDelete = (e: React.MouseEvent | React.TouchEvent) => {
		e.preventDefault();
		if (disabled) return;

		// Perform initial single deletion
		handleBackspace();

		// Set a delay of 400ms before starting continuous delete
		deleteTimerRef.current = setTimeout(() => {
			deleteIntervalRef.current = setInterval(() => {
				const cleaned = (valueRef.current || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
				if (!cleaned) {
					onChange("");
					return;
				}
				const newRaw = cleaned.slice(0, -1);
				onChange(newRaw ? formatExpression(newRaw) : "");
			}, 80); // delete a token/digit every 80ms
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

	const handleMouseDown = (e: React.MouseEvent) => {
		if (isTouchActive.current) return;
		startContinuousDelete(e);
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		isTouchActive.current = true;
		startContinuousDelete(e);
	};

	const handleMouseUpOrLeave = () => {
		if (isTouchActive.current) return;
		stopContinuousDelete();
	};

	const handleTouchEnd = () => {
		stopContinuousDelete();
		setTimeout(() => {
			isTouchActive.current = false;
		}, 100);
	};

	React.useEffect(() => {
		return () => {
			if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
			if (deleteIntervalRef.current) clearInterval(deleteIntervalRef.current);
		};
	}, []);

	// CSS classes for premium styling matching native mobile keyboards
	const normalKeyClass = "h-14 rounded-lg bg-white dark:bg-zinc-800 text-2xl font-normal text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 active:scale-95 active:bg-zinc-100 dark:active:bg-zinc-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center disabled:opacity-40 select-none cursor-pointer";
	
	const specialKeyClass = "h-14 rounded-lg bg-[#d0d3d9] dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 hover:bg-[#c4c7cc] dark:hover:bg-zinc-600/60 active:scale-95 active:bg-[#b8bbc2] dark:active:bg-zinc-600 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center disabled:opacity-40 select-none cursor-pointer";
	
	const selesaiKeyClass = "row-span-2 h-full rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_1px_3px_rgba(16,185,129,0.3)] active:scale-[0.98] flex items-center justify-center disabled:opacity-40 select-none cursor-pointer";

	return (
		<AnimatePresence>
			<motion.div
				key="numeric-keyboard"
				initial={{ y: "100%", opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: "100%", opacity: 0 }}
				transition={{ type: "spring", damping: 28, stiffness: 300 }}
				className="fixed bottom-0 left-0 right-0 z-[70] bg-[#e3e4e6] dark:bg-zinc-950 border-t border-zinc-300 dark:border-zinc-800 pb-safe shadow-2xl"
			>
				{/* Key Grid: 4 columns structure matching reference layout */}
				<div className="grid grid-cols-4 gap-[6px] p-[6px]">
					{/* Row 1 */}
					<button type="button" onClick={() => handleDigit("1")} disabled={disabled} className={normalKeyClass}>1</button>
					<button type="button" onClick={() => handleDigit("2")} disabled={disabled} className={normalKeyClass}>2</button>
					<button type="button" onClick={() => handleDigit("3")} disabled={disabled} className={normalKeyClass}>3</button>
					<button
						type="button"
						onMouseDown={handleMouseDown}
						onMouseUp={handleMouseUpOrLeave}
						onMouseLeave={handleMouseUpOrLeave}
						onTouchStart={handleTouchStart}
						onTouchEnd={handleTouchEnd}
						disabled={disabled}
						className={specialKeyClass}
					>
						<Delete size={20} />
					</button>

					{/* Row 2 */}
					<button type="button" onClick={() => handleDigit("4")} disabled={disabled} className={normalKeyClass}>4</button>
					<button type="button" onClick={() => handleDigit("5")} disabled={disabled} className={normalKeyClass}>5</button>
					<button type="button" onClick={() => handleDigit("6")} disabled={disabled} className={normalKeyClass}>6</button>
					<button type="button" onClick={() => handleOperator("+")} disabled={disabled} className={`${specialKeyClass} text-2xl font-bold`}>+</button>

					{/* Row 3 */}
					<button type="button" onClick={() => handleDigit("7")} disabled={disabled} className={normalKeyClass}>7</button>
					<button type="button" onClick={() => handleDigit("8")} disabled={disabled} className={normalKeyClass}>8</button>
					<button type="button" onClick={() => handleDigit("9")} disabled={disabled} className={normalKeyClass}>9</button>
					<button type="button" onClick={handleDone} disabled={disabled} className={selesaiKeyClass}>
						{t("done")}
					</button>

					{/* Row 4 */}
					<button type="button" onClick={() => handleOperator("-")} disabled={disabled} className={`${specialKeyClass} text-2xl font-bold`}>-</button>
					<button type="button" onClick={() => handleDigit("0")} disabled={disabled} className={normalKeyClass}>0</button>
					<button
						type="button"
						onClick={() => {
							if (disabled) return;
							const cleaned = (value || "").replace(/\./g, "").replace(/,/g, "").replace(/\s/g, "");
							if (!cleaned || cleaned.endsWith("+") || cleaned.endsWith("-")) return;
							onChange(formatExpression(cleaned + "000"));
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

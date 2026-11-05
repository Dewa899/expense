"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastState {
	isOpen: boolean;
	message: string;
	type?: "success" | "error" | "info";
}

interface ToastNotificationProps {
	toast: ToastState;
	onClose: () => void;
}

export function ToastNotification({ toast, onClose }: ToastNotificationProps) {
	React.useEffect(() => {
		if (toast.isOpen) {
			const timer = setTimeout(() => {
				onClose();
			}, 2500);
			return () => clearTimeout(timer);
		}
	}, [toast.isOpen, onClose]);

	return (
		<AnimatePresence>
			{toast.isOpen && (
				<motion.div
					role="dialog"
					initial={{ opacity: 0, y: 50, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 20, scale: 0.95 }}
					transition={{ duration: 0.2, ease: "easeOut" }}
					className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] max-w-sm w-[calc(100%-2rem)]"
				>
					<div className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border ${
						toast.type === "error"
							? "bg-red-500/90 text-white border-red-400/30 shadow-red-500/20"
							: toast.type === "info"
							? "bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 border-zinc-700/30"
							: "bg-emerald-500/90 text-white border-emerald-400/30 shadow-emerald-500/20"
					}`}>
						<div className="flex items-center gap-2.5 min-w-0">
							{toast.type === "error" ? (
								<AlertCircle className="w-5 h-5 shrink-0" />
							) : toast.type === "info" ? (
								<Info className="w-5 h-5 shrink-0" />
							) : (
								<CheckCircle2 className="w-5 h-5 shrink-0" />
							)}
							<span className="text-xs font-bold truncate tracking-wide">
								{toast.message}
							</span>
						</div>

						<button
							data-slot="dialog-close"
							onClick={onClose}
							className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

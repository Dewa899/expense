"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface WarningConfirmModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	onConfirm: () => void;
	onCancel?: () => void;
	confirmText?: string;
	cancelText?: string;
	variant?: "danger" | "warning";
}

export function WarningConfirmModal({
	isOpen,
	onOpenChange,
	title,
	description,
	onConfirm,
	onCancel,
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "danger",
}: WarningConfirmModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[360px] rounded-3xl p-6">
				<DialogHeader>
					<DialogTitle className={`flex items-center gap-2 font-black ${variant === "danger" ? "text-red-500" : "text-amber-500"}`}>
						<AlertTriangle size={20} />
						{title}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					<p className="text-xs text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed text-left">
						{description}
					</p>
					<div className="flex gap-2">
						<Button
							onClick={() => {
								onConfirm();
								onOpenChange(false);
							}}
							className={`flex-1 h-10 font-bold rounded-xl border-none cursor-pointer ${
								variant === "danger" 
									? "bg-red-500 hover:bg-red-650 text-white" 
									: "bg-amber-500 hover:bg-amber-600 text-black"
							}`}
						>
							{confirmText}
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								if (onCancel) onCancel();
								onOpenChange(false);
							}}
							className="flex-1 h-10 rounded-xl font-bold cursor-pointer bg-transparent"
						>
							{cancelText}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

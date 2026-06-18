"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";

interface DeleteFieldModalProps {
	isOpen: boolean;
	fieldName: string;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function DeleteFieldModal({ isOpen, fieldName, onOpenChange, onConfirm }: DeleteFieldModalProps) {
	const { t } = useLanguage();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-[32px] p-8 relative" showCloseButton={false}>
				<button 
					type="button"
					onClick={() => onOpenChange(false)}
					className="absolute top-6 right-6 rounded-full w-10 h-10 p-0 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-200 z-[110] transition-colors flex items-center justify-center cursor-pointer"
				>
					<X size={20} />
				</button>
				<div className="flex flex-col items-center text-center gap-4">
					<div className="w-20 h-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
						<Trash2 size={48} />
					</div>
					<div className="space-y-2">
						<DialogTitle className="text-2xl font-black tracking-tight">{t("deleteFieldWarning")}</DialogTitle>
						<DialogDescription className="text-sm text-zinc-500 px-4">
							{t("deleteFieldDesc")}
						</DialogDescription>
					</div>
					<div className="flex gap-3 w-full mt-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl font-bold">
							{t("close")}
						</Button>
						<Button onClick={onConfirm} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold">
							{t("delete")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

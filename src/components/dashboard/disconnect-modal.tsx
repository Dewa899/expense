"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";

interface DisconnectModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function DisconnectModal({ isOpen, onOpenChange, onConfirm }: DisconnectModalProps) {
	const { t } = useLanguage();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[400px] rounded-[32px] p-8">
				<div className="flex flex-col items-center text-center gap-4">
					<div className="w-20 h-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
						<LogOut size={48} />
					</div>
					<div className="space-y-2">
						<DialogTitle className="text-2xl font-black tracking-tight">{t("disconnectWarningTitle")}</DialogTitle>
						<DialogDescription className="text-sm text-zinc-500 px-4 leading-relaxed">
							{t("disconnectWarningDesc")}
						</DialogDescription>
					</div>
					<div className="flex gap-3 w-full mt-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl font-bold">
							{t("close")}
						</Button>
						<Button onClick={onConfirm} className="flex-1 bg-destructive text-white rounded-xl font-bold">
							{t("disconnectConfirm")}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

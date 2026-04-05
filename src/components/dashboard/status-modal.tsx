"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { StatusModalState } from "@/hooks/use-dashboard-logic";

interface StatusModalProps {
	state: StatusModalState;
	onClose: () => void;
}

export function StatusModal({ state, onClose }: StatusModalProps) {
	const { t } = useLanguage();

	return (
		<Dialog open={state.isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[400px] rounded-[32px] p-8">
				<div className="flex flex-col items-center text-center gap-4">
					<div className={`w-20 h-20 rounded-full flex items-center justify-center ${
						state.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
					}`}>
						{state.type === "success" ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
					</div>
					<div className="space-y-2">
						<DialogTitle className="text-2xl font-black tracking-tight">{state.title}</DialogTitle>
						<DialogDescription className="text-sm text-zinc-500 px-4">
							{state.description}
						</DialogDescription>
					</div>
					<Button 
						onClick={onClose} 
						className={`w-full h-12 rounded-xl font-bold mt-2 ${
							state.type === "success" ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-destructive hover:bg-destructive/90 text-white"
						}`}
					>
						{t("close")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

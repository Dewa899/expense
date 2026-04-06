"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
	const isLoading = state.type === null && state.isOpen;
	const isSyncSuccess = state.type === "success" && state.title === t("syncSuccessTitle");

	return (
		<Dialog open={state.isOpen} onOpenChange={(open) => {
			if (!open && isLoading) return; // Prevent closing if loading
			if (!open) onClose();
		}}>
			<DialogContent 
				className="sm:max-w-[400px] rounded-[32px] p-8"
				showCloseButton={!isLoading}
			>
				<div className="flex flex-col items-center text-center gap-4">
					<div className={`flex items-center justify-center ${
						isSyncSuccess ? "w-full h-40" : 
						state.type === "success" ? "w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500" :
						state.type === "error" ? "w-20 h-20 rounded-full bg-destructive/10 text-destructive" :
						"w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
					}`}>
						{isSyncSuccess ? (
							<div className="relative w-full h-full">
								<Image 
									src="/illustrations/done.png" 
									alt="Success" 
									fill
									className="object-contain"
									priority
								/>
							</div>
						) : state.type === "success" ? <CheckCircle2 size={48} /> : 
						 state.type === "error" ? <AlertCircle size={48} /> :
						 <Loader2 size={48} className="animate-spin" />}
					</div>
					<div className="space-y-2">
						<DialogTitle className="text-2xl font-black tracking-tight">{state.title}</DialogTitle>
						<DialogDescription className="text-sm text-zinc-500 px-4">
							{state.description}
						</DialogDescription>
					</div>
					
					{state.type !== null && (
						<Button 
							onClick={onClose} 
							className={`w-full h-12 rounded-xl font-bold mt-2 ${
								state.type === "success" ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-destructive hover:bg-destructive/90 text-white"
							}`}
						>
							{t("close")}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

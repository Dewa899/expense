"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
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
	onGoogleLogin?: (force?: boolean) => void;
	onReportBug?: (title: string, description: string) => void;
}

export function StatusModal({ state, onClose, onGoogleLogin, onReportBug }: StatusModalProps) {
	const { t } = useLanguage();
	const isLoading = state.type === null && state.isOpen;
	const isSyncSuccess = state.type === "success" && state.title === t("syncSuccessTitle");
	const isAuthError = state.title === t("sessionExpiredTitle");

	return (
		<Dialog open={state.isOpen} onOpenChange={(open) => {
			if (!open && isLoading) return; // Prevent closing if loading
			if (!open) onClose();
		}}>
			<DialogContent 
				className="sm:max-w-[400px] p-8"
				showCloseButton={!isLoading}
			>
				<div className="flex flex-col items-center text-center gap-4">
					<div className={`flex items-center justify-center ${
						(isSyncSuccess || state.type === "error") ? "w-full h-40" : 
						state.type === "success" ? "w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500" :
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
						) : state.type === "error" ? (
							<div className="relative w-full h-full">
								<Image 
									src="/illustrations/404.png" 
									alt="Error" 
									fill
									className="object-contain"
									priority
								/>
							</div>
						) : state.type === "success" ? <CheckCircle2 size={48} /> : 
						 <Loader2 size={48} className="animate-spin" />}
					</div>
					<div className="space-y-2">
						<DialogTitle className="text-2xl font-black tracking-tight">{state.title}</DialogTitle>
						<DialogDescription className="text-sm text-zinc-500 px-4">
							{state.description}
						</DialogDescription>
					</div>
					
					{state.type !== null && (
						<div className="w-full flex flex-col gap-3 mt-2">
							{isAuthError && onGoogleLogin ? (
								<>
									<Button
										onClick={() => {
											onClose();
											onGoogleLogin(false);
										}}
										className="w-full h-12 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-black cursor-pointer"
									>
										{t("syncWithGoogle")}
									</Button>
									<Button
										variant="ghost"
										onClick={() => {
											onClose();
											onGoogleLogin(true);
										}}
										className="w-full h-10 rounded-xl font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[10px] uppercase tracking-wider cursor-pointer"
									>
										{t("chooseOtherAccount")}
									</Button>
								</>
							) : state.type === "error" && onReportBug ? (
								<>
									<Button
										onClick={() => {
											const errTitle = state.title;
											const errDesc = state.description;
											onClose();
											onReportBug(errTitle, errDesc);
										}}
										className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black cursor-pointer"
									>
										{t("reportBug")}
									</Button>
									<Button
										variant="outline"
										onClick={onClose}
										className="w-full h-12 rounded-xl font-bold border-zinc-200 dark:border-zinc-800 cursor-pointer"
									>
										{t("close")}
									</Button>
								</>
							) : (
								<Button 
									onClick={onClose} 
									variant={isAuthError ? "outline" : "default"}
									className={`w-full h-12 rounded-xl font-bold cursor-pointer ${
										!isAuthError ? (state.type === "success" ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-destructive hover:bg-destructive/90 text-white") : ""
									}`}
								>
									{t("close")}
								</Button>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

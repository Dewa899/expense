"use client";

import * as React from "react";
import { Bug, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";

interface BugReportModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: (title: string, desc: string) => void;
}

export function BugReportModal({ isOpen, onOpenChange, onSuccess }: BugReportModalProps) {
	const { t } = useLanguage();
	const [loading, setLoading] = React.useState(false);
	const [formData, setFormData] = React.useState({
		title: "",
		email: "",
		message: ""
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title || !formData.message) return;

		setLoading(true);
		try {
			// Web3Forms API Integration
			const response = await fetch("https://api.web3forms.com/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
					subject: `[Bug Report] ${formData.title}`,
					from_name: "Expense App User",
					email: formData.email || "no-email@provided.com",
					message: formData.message,
				}),
			});

			if (response.ok) {
				onSuccess(t("bugSuccess"), t("bugSuccessDesc"));
				setFormData({ title: "", email: "", message: "" });
				onOpenChange(false);
			}
		} catch (error) {
			console.error("Failed to send bug report");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[450px] rounded-[32px] p-0 overflow-hidden border-none">
				<div className="bg-emerald-500 p-8 text-black flex flex-col items-center gap-2 relative">
					<div className="w-16 h-16 rounded-full bg-black/10 flex items-center justify-center mb-2">
						<Bug size={32} />
					</div>
					<DialogTitle className="text-2xl font-black tracking-tight">{t("reportBug")}</DialogTitle>
					<p className="text-[10px] uppercase font-bold opacity-70 tracking-widest text-center px-8">
						{t("bugSupportDesc")}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white dark:bg-zinc-900">
					<div className="space-y-2">
						<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
							{t("bugTitle")} *
						</Label>
						<Input 
							required
							placeholder={t("bugTitlePlaceholder")} 
							value={formData.title}
							onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
							className="h-12 rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium"
						/>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
							Email ({t("optionalLabel")})
						</Label>
						<Input 
							type="email"
							placeholder={t("bugEmailPlaceholder")} 
							value={formData.email}
							onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
							className="h-12 rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium"
						/>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
							{t("category")} *
						</Label>
						<textarea 
							required
							placeholder={t("bugDesc")}
							value={formData.message}
							onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
							className="w-full min-h-[120px] p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
						/>
					</div>

					<Button 
						type="submit" 
						disabled={loading || !formData.title || !formData.message}
						className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg rounded-[20px] shadow-lg shadow-emerald-500/20 gap-2"
					>
						{loading ? "..." : (
							<>
								<Send size={18} />
								{t("sendReport")}
							</>
						)}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}

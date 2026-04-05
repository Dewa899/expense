"use client";

import * as React from "react";
import { X, Send, Bug, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";

interface SupportModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: (title: string, desc: string) => void;
	initialCategory?: string;
	initialEmail?: string;
}

export function SupportModal({ 
	isOpen, 
	onOpenChange, 
	onSuccess, 
	initialCategory = "bug",
	initialEmail = ""
}: SupportModalProps) {
	const { t } = useLanguage();
	const [loading, setLoading] = React.useState(false);
	const [formData, setFormData] = React.useState({
		title: "",
		email: "",
		category: initialCategory,
		message: ""
	});

	// Clean Coder: Sync form data with initial props when modal opens
	React.useEffect(() => {
		if (isOpen) {
			setFormData(prev => ({
				...prev,
				category: initialCategory,
				email: initialEmail || prev.email,
			}));
		}
	}, [isOpen, initialCategory, initialEmail]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.title || !formData.message || !formData.category) return;

		setLoading(true);
		try {
			// Web3Forms API Integration
			const response = await fetch("https://api.web3forms.com/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
					subject: `[${formData.category.toUpperCase()}] ${formData.title}`,
					from_name: "Expense App User",
					email: formData.email || "no-email@provided.com",
					category: formData.category,
					message: formData.message,
				}),
			});

			if (response.ok) {
				onSuccess(t("supportSuccess"), t("supportSuccessDesc"));
				setFormData({ title: "", email: "", category: "bug", message: "" });
				onOpenChange(false);
			}
		} catch (error) {
			console.error("Failed to send support message");
		} finally {
			setLoading(false);
		}
	};

	const getIcon = () => {
		switch (formData.category) {
			case "bug": return <Bug size={32} />;
			default: return <HelpCircle size={32} />;
		}
	};

	const categories = [
		{ id: "bug", label: t("supportCatBug"), icon: <Bug size={14} /> },
		{ id: "other", label: t("supportCatOther"), icon: <HelpCircle size={14} /> },
	];

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[450px] rounded-[32px] p-0 overflow-hidden border-none max-h-[90vh] overflow-y-auto">
				<div className="bg-emerald-500 p-8 text-black flex flex-col items-center gap-2 relative">
					<div className="w-16 h-16 rounded-full bg-black/10 flex items-center justify-center mb-2">
						{getIcon()}
					</div>
					<DialogTitle className="text-2xl font-black tracking-tight">{t("contactSupport")}</DialogTitle>
					<p className="text-[10px] uppercase font-bold opacity-70 tracking-widest text-center px-8">
						{t("supportHelperDesc")}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="p-8 space-y-5 bg-white dark:bg-zinc-900">
					<div className="space-y-3">
						<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
							{t("supportCategory")} *
						</Label>
						<div className="grid grid-cols-1 gap-2">
							{categories.map((cat) => (
								<Button
									key={cat.id}
									type="button"
									variant={formData.category === cat.id ? "default" : "outline"}
									onClick={() => setFormData(prev => ({ 
										...prev, 
										category: cat.id
									}))}
									className={`h-12 justify-start gap-3 rounded-2xl font-bold transition-all ${
										formData.category === cat.id 
											? "bg-emerald-500 text-black border-emerald-500 hover:bg-emerald-600" 
											: "border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
									}`}
								>
									<div className={`w-8 h-8 rounded-full flex items-center justify-center ${
										formData.category === cat.id ? "bg-black/10" : "bg-zinc-100 dark:bg-zinc-800"
									}`}>
										{cat.icon}
									</div>
									{cat.label}
								</Button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
							{t("supportTitle")} *
						</Label>
						<Input 
							required
							placeholder={t("supportTitlePlaceholder")} 
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
							placeholder={t("supportEmailPlaceholder")} 
							value={formData.email}
							onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
							className="h-12 rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium"
						/>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
							{t("supportDesc")} *
						</Label>
						<textarea 
							required
							placeholder={t("supportDesc")}
							value={formData.message}
							onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
							className="w-full min-h-[100px] p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
						/>
					</div>

					<Button 
						type="submit" 
						disabled={loading || !formData.title || !formData.message}
						className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg rounded-[20px] shadow-lg shadow-emerald-500/20 gap-2 mt-2"
					>
						{loading ? "..." : (
							<>
								<Send size={18} />
								{t("sendMessage")}
							</>
						)}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase-client";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider, useLanguage } from "@/components/language-provider";
import { StatusModal } from "@/components/dashboard/modals/status-modal";
import { SupportModal } from "@/components/dashboard/modals/bug-report-modal";

function ResetPasswordInner() {
	const { t, language } = useLanguage();
	const router = useRouter();
	const [password, setPassword] = React.useState("");
	const [confirmPassword, setConfirmPassword] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [success, setSuccess] = React.useState(false);

	const [statusModal, setStatusModal] = React.useState<{
		isOpen: boolean;
		type: "success" | "error" | null;
		title: string;
		description: string;
	}>({
		isOpen: false,
		type: null,
		title: "",
		description: ""
	});

	const [isSupportOpen, setIsSupportOpen] = React.useState(false);
	const [supportData, setSupportData] = React.useState({
		category: "bug",
		email: "",
		title: "",
		message: ""
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!password || !confirmPassword) return;

		if (password !== confirmPassword) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Passwords Don't Match" : "Kata Sandi Tidak Cocok",
				description: language === "en" ? "Please make sure both passwords are identical." : "Pastikan kedua kata sandi identik."
			});
			return;
		}

		if (password.length < 6) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Password Too Short" : "Kata Sandi Terlalu Pendek",
				description: language === "en" ? "Password must be at least 6 characters long." : "Kata sandi minimal 6 karakter."
			});
			return;
		}

		setLoading(true);

		try {
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;
			
			setSuccess(true);
			setTimeout(() => {
				router.push("/");
			}, 3000);
		} catch (err: any) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Password Update Failed" : "Gagal Memperbarui Kata Sandi",
				description: err.message || "Failed to update password"
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 bg-grid-pattern text-zinc-900 dark:text-zinc-50 transition-colors duration-300 relative overflow-x-hidden">
			{/* Ambient glows */}
			<div className="fixed top-0 right-0 w-[350px] h-[350px] md:w-[700px] md:h-[700px] rounded-full bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] pointer-events-none select-none z-0" />
			<div className="fixed bottom-0 left-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full bg-teal-500/20 dark:bg-teal-500/8 blur-[120px] pointer-events-none select-none z-0" />

			<header className="px-4 py-3 flex items-center justify-between sticky top-0 z-50 glass-header">
				<div className="flex items-center gap-1 leading-none text-left">
					<div className="flex flex-col">
						<div className="flex items-baseline">
							<span className="text-xl font-black tracking-tighter text-emerald-500 italic">EXP</span>
							<span className="text-xs font-bold tracking-tight text-emerald-600/70 dark:text-emerald-400/50 -ml-0.5">ense</span>
						</div>
						<span className="text-[8px] font-light tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-500 ml-0.5">by GENLORD</span>
					</div>
				</div>
			</header>

			<main className="flex-grow flex items-center justify-center p-4 max-w-md mx-auto w-full z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="w-full glass-card rounded-[32px] overflow-hidden relative flex flex-col"
				>
					<div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-8 text-black flex flex-col items-center gap-2 relative">
						<div className="w-14 h-14 rounded-full bg-black/10 flex items-center justify-center mb-1">
							<Wallet size={28} />
						</div>
						<h2 className="text-2xl font-black tracking-tight leading-none italic">
							EXP<span className="text-zinc-900 not-italic font-bold text-base -ml-0.5">ense</span>
						</h2>
						<p className="text-[10px] uppercase font-bold opacity-70 tracking-widest text-center mt-1">
							{language === "en" ? "Set New Password" : "Atur Kata Sandi Baru"}
						</p>
					</div>

					<AnimatePresence mode="wait">
						{success ? (
							<motion.div
								key="success"
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								className="p-8 text-center space-y-4"
							>
								<div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
									<CheckCircle2 className="text-emerald-500" size={24} />
								</div>
								<h3 className="text-lg font-bold">
									{language === "en" ? "Password Updated Successfully!" : "Kata Sandi Berhasil Diperbarui!"}
								</h3>
								<p className="text-xs text-zinc-500 dark:text-zinc-400">
									{language === "en" 
										? "Your password has been changed. You will be redirected to the homepage in 3 seconds."
										: "Kata sandi Anda telah diubah. Anda akan diarahkan ke halaman utama dalam 3 detik."}
								</p>
							</motion.div>
						) : (
							<motion.form
								key="form"
								onSubmit={handleSubmit}
								className="p-8 space-y-5 bg-transparent flex-1"
							>
								<div className="space-y-2">
									<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
										{language === "en" ? "New Password" : "Kata Sandi Baru"}
									</Label>
									<div className="relative flex items-center">
										<span className="absolute left-4 text-zinc-400">
											<Lock size={16} />
										</span>
										<Input
											type="password"
											required
											placeholder="••••••••"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="h-12 w-full pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-sm transition-colors"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
										{language === "en" ? "Confirm New Password" : "Konfirmasi Kata Sandi Baru"}
									</Label>
									<div className="relative flex items-center">
										<span className="absolute left-4 text-zinc-400">
											<Lock size={16} />
										</span>
										<Input
											type="password"
											required
											placeholder="••••••••"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="h-12 w-full pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-sm transition-colors"
										/>
									</div>
								</div>

								<Button
									type="submit"
									disabled={loading}
									className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black text-base rounded-xl shadow-lg shadow-emerald-500/20 mt-2 cursor-pointer border-none transition-all active:scale-[0.98]"
								>
									{loading ? "..." : (language === "en" ? "Update Password" : "Perbarui Kata Sandi")}
								</Button>
							</motion.form>
						)}
					</AnimatePresence>
				</motion.div>
			</main>

			{/* Status Modal for success/error feedback */}
			<StatusModal 
				state={statusModal}
				onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
				onReportBug={(title, desc) => {
					setSupportData({
						category: "bug",
						email: "",
						title: `[BUG] ${title}`,
						message: `User encountered error on the password reset page:\n\nError Title: ${title}\nError Message: ${desc}`
					});
					setStatusModal(prev => ({ ...prev, isOpen: false }));
					setIsSupportOpen(true);
				}}
			/>

			{/* Support / Bug Report Modal */}
			<SupportModal 
				isOpen={isSupportOpen}
				onOpenChange={setIsSupportOpen}
				onSuccess={(title, desc) => {
					setStatusModal({
						isOpen: true,
						type: "success",
						title,
						description: desc
					});
				}}
				initialCategory={supportData.category}
				initialEmail={supportData.email}
				initialTitle={supportData.title}
				initialMessage={supportData.message}
			/>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			enableSystem
			disableTransitionOnChange
		>
			<LanguageProvider>
				<ResetPasswordInner />
			</LanguageProvider>
		</ThemeProvider>
	);
}

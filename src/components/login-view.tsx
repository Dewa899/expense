"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Mail, Lock, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { StatusModal } from "./dashboard/modals/status-modal";
import { SupportModal } from "./dashboard/modals/bug-report-modal";

interface LoginViewProps {
	onLoginSuccess: () => void;
	onBypassSheets: () => void;
	onBack: () => void;
	mode?: "login" | "register";
}

export function LoginView({ onLoginSuccess, onBypassSheets, onBack, mode = "login" }: LoginViewProps) {
	const router = useRouter();
	const { t, language } = useLanguage();
	const [isSignUp, setIsSignUp] = React.useState(mode === "register");
	const [isForgotPassword, setIsForgotPassword] = React.useState(false);
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [name, setName] = React.useState("");
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setIsSignUp(mode === "register");
	}, [mode]);
	
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

	const handleAuthSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password || (isSignUp && !name)) return;

		setLoading(true);
		try {
			if (isSignUp) {
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							full_name: name,
						}
					}
				});
				if (error) throw error;
				if (data.session) {
					onLoginSuccess();
				} else {
					setStatusModal({
						isOpen: true,
						type: "success",
						title: language === "en" ? "Registration Successful" : "Pendaftaran Berhasil",
						description: language === "en" 
							? "Please check your email for confirmation." 
							: "Silakan periksa email Anda untuk konfirmasi."
					});
				}
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});
				if (error) throw error;
				onLoginSuccess();
			}
		} catch (error: any) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Authentication Failed" : "Autentikasi Gagal",
				description: error.message || "An unexpected error occurred"
			});
		} finally {
			setLoading(false);
		}
	};

	const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setLoading(true);
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`,
			});
			if (error) throw error;
			setStatusModal({
				isOpen: true,
				type: "success",
				title: language === "en" ? "Reset Link Sent" : "Link Reset Terkirim",
				description: language === "en" 
					? "Password reset link has been sent to your email!" 
					: "Link reset kata sandi telah dikirim ke email Anda!"
			});
			setIsForgotPassword(false);
		} catch (error: any) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Failed to Send Reset Link" : "Gagal Mengirim Link Reset",
				description: error.message || "Failed to send reset link"
			});
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		setLoading(true);
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: window.location.origin,
				}
			});
			if (error) throw error;
		} catch (error: any) {
			setStatusModal({
				isOpen: true,
				type: "error",
				title: language === "en" ? "Google Login Failed" : "Gagal Masuk Google",
				description: error.message || "Failed to log in with Google"
			});
			setLoading(false);
		}
	};

	return (
		<motion.div
			key="login"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.4 }}
			className="flex-grow flex items-center justify-center p-4 max-w-md mx-auto w-full"
		>
			<div className="w-full glass-card rounded-[32px] overflow-hidden relative flex flex-col">
				{/* Top Header Card with App Brand */}
				<div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-8 text-black flex flex-col items-center gap-2 relative">
					<button
						onClick={onBack}
						className="absolute top-6 left-6 rounded-full w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 text-black transition-colors cursor-pointer"
					>
						<ArrowLeft size={16} />
					</button>

					<div className="w-14 h-14 rounded-full bg-black/10 flex items-center justify-center mb-1">
						<Wallet size={28} />
					</div>
					<h2 className="text-2xl font-black tracking-tight leading-none italic">
						EXP<span className="text-zinc-900 not-italic font-bold text-base -ml-0.5">ense</span>
					</h2>
					<p className="text-[10px] uppercase font-bold opacity-70 tracking-widest text-center mt-1">
						{isForgotPassword
							? (language === "en" ? "Reset your password" : "Reset kata sandi Anda")
							: isSignUp 
								? (language === "en" ? "Create an account to start" : "Daftar akun untuk memulai") 
								: (language === "en" ? "Welcome back" : "Selamat datang kembali")}
					</p>
				</div>

				{/* Form Body */}
				<AnimatePresence mode="wait">
					{isForgotPassword ? (
						<motion.form
							key="forgot-password-form"
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							onSubmit={handleForgotPasswordSubmit}
							className="p-8 space-y-5 bg-transparent flex-1"
						>
							<div className="space-y-2">
								<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
									Email
								</Label>
								<div className="relative flex items-center">
									<span className="absolute left-4 text-zinc-400">
										<Mail size={16} />
									</span>
									<Input
										type="email"
										required
										placeholder="name@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="h-12 w-full pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-sm transition-colors"
									/>
								</div>
							</div>

							<Button
								type="submit"
								disabled={loading}
								className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black text-base rounded-xl shadow-lg shadow-emerald-500/20 mt-2 cursor-pointer border-none transition-all active:scale-[0.98]"
							>
								{loading ? "..." : (language === "en" ? "Send Reset Link" : "Kirim Link Reset")}
							</Button>

							{/* Toggle back to Sign In */}
							<div className="text-center pt-2">
								<button
									type="button"
									onClick={() => setIsForgotPassword(false)}
									className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer"
								>
									{language === "en" ? "Back to Sign In" : "Kembali ke Halaman Masuk"}
								</button>
							</div>
						</motion.form>
					) : (
						<motion.form
							key="login-signup-form"
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: 20 }}
							onSubmit={handleAuthSubmit}
							className="p-8 space-y-5 bg-transparent flex-1"
						>
							<AnimatePresence mode="wait">
								{isSignUp && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										className="space-y-2 overflow-hidden"
									>
										<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
											{language === "en" ? "Name" : "Nama Lengkap"}
										</Label>
										<div className="relative flex items-center">
											<span className="absolute left-4 text-zinc-400">
												<HelpCircle size={16} />
											</span>
											<Input
												required={isSignUp}
												placeholder={language === "en" ? "Your Name" : "Nama Anda"}
												value={name}
												onChange={(e) => setName(e.target.value)}
												className="h-12 w-full pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-sm transition-colors"
											/>
										</div>
									</motion.div>
								)}
							</AnimatePresence>

							<div className="space-y-2">
								<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter ml-1">
									Email
								</Label>
								<div className="relative flex items-center">
									<span className="absolute left-4 text-zinc-400">
										<Mail size={16} />
									</span>
									<Input
										type="email"
										required
										placeholder="name@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="h-12 w-full pl-11 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/40 focus:bg-white/80 dark:focus:bg-zinc-950/80 font-medium text-sm transition-colors"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between items-center ml-1">
									<Label className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">
										{language === "en" ? "Password" : "Kata Sandi"}
									</Label>
									{!isSignUp && (
										<button
											type="button"
											onClick={() => setIsForgotPassword(true)}
											className="text-[10px] font-bold text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer"
										>
											{language === "en" ? "Forgot Password?" : "Lupa Kata Sandi?"}
										</button>
									)}
								</div>
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

							<Button
								type="submit"
								disabled={loading}
								className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-black font-black text-base rounded-xl shadow-lg shadow-emerald-500/20 mt-2 cursor-pointer border-none transition-all active:scale-[0.98]"
							>
								{loading ? "..." : isSignUp 
									? (language === "en" ? "Create Account" : "Daftar Akun") 
									: (language === "en" ? "Sign In" : "Masuk")}
							</Button>

							{/* Divider */}
							<div className="relative flex items-center justify-center my-4">
								<div className="absolute inset-0 flex items-center">
									<div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
								</div>
								<span className="relative px-3 text-[10px] font-bold text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-md uppercase tracking-widest">
									{language === "en" ? "or continue with" : "atau lanjutkan dengan"}
								</span>
							</div>

							{/* Google login OAuth */}
							<Button
								type="button"
								onClick={handleGoogleLogin}
								disabled={loading}
								variant="outline"
								className="w-full h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/30 hover:bg-white/70 dark:hover:bg-zinc-950/60 flex items-center justify-center gap-3 transition-all cursor-pointer font-bold text-sm text-zinc-850 dark:text-zinc-200"
							>
								<svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
									<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
								</svg>
								{language === "en" ? "Continue with Google" : "Masuk dengan Google"}
							</Button>

							{/* Toggle login/signup */}
							<div className="text-center pt-2">
								<button
									type="button"
									onClick={() => setIsSignUp(!isSignUp)}
									className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-500 transition-colors"
								>
									{isSignUp 
										? (language === "en" ? "Already have an account? Sign In" : "Sudah punya akun? Masuk")
										: (language === "en" ? "Don't have an account? Sign Up" : "Belum punya akun? Daftar")}
								</button>
							</div>

							{/* Sheets Sync Bypass (Crucial constraint requirement!) */}
							<div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-4 flex flex-col items-center">
								<button
									type="button"
									onClick={onBypassSheets}
									className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors underline underline-offset-4 cursor-pointer"
								>
									{language === "en" ? "Use Google Sheets directly (No Account)" : "Gunakan Google Sheets langsung (Tanpa Akun)"}
								</button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>
			</div>

			<StatusModal 
				state={statusModal}
				onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
				onReportBug={(statusModal.description?.toLowerCase().includes("credential") || 
					statusModal.description?.toLowerCase().includes("invalid") || 
					statusModal.description?.toLowerCase().includes("not found") || 
					statusModal.description?.toLowerCase().includes("password") || 
					statusModal.description?.toLowerCase().includes("email") ||
					statusModal.description?.toLowerCase().includes("kredensial") || 
					statusModal.description?.toLowerCase().includes("sandi") ||
					statusModal.description?.toLowerCase().includes("tidak ditemukan")) ? undefined : (title, desc) => {
						setSupportData({
							category: "bug",
							email: email || "",
							title: `[BUG] ${title}`,
							message: `User encountered error during login/recovery:\n\nError Title: ${title}\nError Message: ${desc}`
						});
						setIsSupportOpen(true);
					}}
			/>

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
		</motion.div>
	);
}

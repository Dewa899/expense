"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Mail, ArrowLeft, CheckCircle2, Link2, Unlink } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase-client";

interface ProfileConnectionModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onBackToSettings?: () => void;
	user: any;
	supabaseUser: any;
	isGoogleConnected: boolean;
	googleEmail: string;
	onGoogleLogin: (forceAccountSelection?: boolean) => void;
	onDisconnect: () => void;
	isSyncing: boolean;
	themeColors: {
		text: string;
		textDark?: string;
		border?: string;
		bgLight: string;
		gradient: string;
		buttonShadow: string;
	};
}

export function getAccountDisplayInfo(supabaseUser: any, user: any, isDemoMode: boolean, language: string) {
	const displayName =
		supabaseUser?.user_metadata?.full_name ||
		supabaseUser?.user_metadata?.name ||
		user?.name ||
		(supabaseUser?.email ? supabaseUser.email.split("@")[0] : null) ||
		(isDemoMode ? (language === "en" ? "Demo User" : "Pengguna Demo") : (language === "en" ? "Guest" : "Tamu"));

	const email = supabaseUser?.email || user?.email || "";
	const avatarUrl = supabaseUser?.user_metadata?.avatar_url || supabaseUser?.user_metadata?.picture || user?.picture || "";

	const isGoogleOAuth =
		supabaseUser?.app_metadata?.provider === "google" ||
		supabaseUser?.identities?.some((id: any) => id?.provider === "google");

	let loginMethod = "";
	if (supabaseUser) {
		loginMethod = isGoogleOAuth
			? (language === "en" ? "Google Account" : "Akun Google")
			: (language === "en" ? "Email Account" : "Akun Email");
	} else if (user) {
		loginMethod = language === "en" ? "Google Sheets Direct" : "Google Sheets Langsung";
	} else if (isDemoMode) {
		loginMethod = language === "en" ? "Demo Mode" : "Mode Demo";
	} else {
		loginMethod = language === "en" ? "Not Signed In" : "Belum Masuk";
	}

	return { displayName, email, avatarUrl, loginMethod, isGoogleOAuth };
}

export function ProfileConnectionModal({
	isOpen,
	onOpenChange,
	onBackToSettings,
	user,
	supabaseUser,
	isGoogleConnected,
	googleEmail,
	onGoogleLogin,
	onDisconnect,
	isSyncing,
	themeColors,
}: ProfileConnectionModalProps) {
	const { t, language } = useLanguage();

	const { displayName, email, avatarUrl, loginMethod } = getAccountDisplayInfo(
		supabaseUser,
		user,
		false,
		language
	);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		localStorage.removeItem("googleUser");
		localStorage.removeItem("sheetId");
		localStorage.removeItem("customFieldDefs");
		localStorage.removeItem("customChartConfigs");
		localStorage.removeItem("customPockets");
		localStorage.removeItem("customCategories");
		localStorage.removeItem("recurringTemplates");
		onOpenChange(false);
		window.location.reload();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px] rounded-3xl p-5 sm:p-6">
				<DialogHeader>
					<div className="flex items-center gap-2">
						{onBackToSettings && (
							<button
								type="button"
								onClick={() => {
									onBackToSettings();
								}}
								aria-label={language === "en" ? "Back to Settings" : "Kembali ke Pengaturan"}
								title={language === "en" ? "Back to Settings" : "Kembali ke Pengaturan"}
								className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer border-none shrink-0"
							>
								<ArrowLeft size={14} />
							</button>
						)}
						<DialogTitle className="text-base font-black">
							{t("profileAndAccount")}
						</DialogTitle>
					</div>
				</DialogHeader>

				<div className="pt-3 flex flex-col gap-3.5">
					{/* User Identity Card with Email Detail */}
					<div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col gap-3">
						<div className="flex items-center gap-3.5">
							{avatarUrl ? (
								<img
									src={avatarUrl}
									alt="Profile"
									className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-sm shrink-0"
								/>
							) : (
								<div className={`w-13 h-13 rounded-2xl ${themeColors.bgLight} flex items-center justify-center border ${themeColors.border || "border-emerald-500/30"} shrink-0`}>
									<span className={`${themeColors.textDark || themeColors.text} font-black text-xl uppercase`}>
										{displayName?.[0] || email?.[0] || "?"}
									</span>
								</div>
							)}

							<div className="min-w-0 flex-1 text-left">
								<div className="flex items-center gap-1.5 flex-wrap">
									<h4 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 truncate">
										{displayName}
									</h4>
								</div>
								<span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${themeColors.bgLight} ${themeColors.textDark || themeColors.text} border ${themeColors.border || "border-emerald-500/25"}`}>
									<CheckCircle2 size={10} />
									{loginMethod}
								</span>
							</div>
						</div>

						{/* Email Detail Row */}
						<div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/80">
							<Mail size={14} className="text-zinc-400 shrink-0" />
							<div className="min-w-0 flex-1 text-left">
								<p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 leading-none">
									{language === "en" ? "Registered Email" : "Email Terdaftar"}
								</p>
								<p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate select-all mt-0.5">
									{email || (language === "en" ? "No email associated" : "Tidak ada email")}
								</p>
							</div>
						</div>
					</div>

					{/* Single-Row Google Sheets Sync Status + Action Button */}
					{supabaseUser ? (
						<div
							onClick={() => {
								if (!isGoogleConnected && !isSyncing) {
									onGoogleLogin(false);
								}
							}}
							className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-colors ${
								isGoogleConnected
									? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
									: "border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 cursor-pointer"
							}`}
						>
							<div className="flex items-center gap-2.5 min-w-0 flex-1">
								<div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-xs">
									<svg className="w-4 h-4" viewBox="0 0 24 24">
										<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
										<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
										<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
										<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
									</svg>
								</div>
								<div className="min-w-0 flex-1 text-left leading-tight">
									<p className="text-xs font-black text-zinc-800 dark:text-zinc-100 truncate">
										Google Sheets Sync
									</p>
									<p className={`text-[10px] font-bold truncate mt-0.5 flex items-center gap-1 ${
										isGoogleConnected ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"
									}`}>
										<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isGoogleConnected ? "bg-emerald-500" : "bg-zinc-400"}`} />
										<span className="truncate">
											{isGoogleConnected
												? (googleEmail ? `${language === "en" ? "Connected" : "Terhubung"} • ${googleEmail}` : (language === "en" ? "Connected" : "Terhubung"))
												: (language === "en" ? "Not Connected" : "Belum Terhubung")}
										</span>
									</p>
								</div>
							</div>

							{!isGoogleConnected ? (
								<Button
									type="button"
									size="sm"
									disabled={isSyncing}
									onClick={(e) => {
										e.stopPropagation();
										onGoogleLogin(false);
									}}
									className={`h-9 px-3.5 bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black text-[11px] rounded-xl shadow-sm ${themeColors.buttonShadow} flex items-center gap-1.5 cursor-pointer border-none shrink-0`}
								>
									<Link2 size={13} />
									<span>{language === "en" ? "Connect" : "Hubungkan"}</span>
								</Button>
							) : (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={(e) => {
										e.stopPropagation();
										onDisconnect();
									}}
									className="h-9 px-3 text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/25 font-bold text-[11px] rounded-xl flex items-center gap-1.5 cursor-pointer bg-transparent shrink-0"
								>
									<Unlink size={13} />
									<span>{language === "en" ? "Disconnect" : "Putuskan"}</span>
								</Button>
							)}
						</div>
					) : null}

					{/* Tidy Bottom-Placed Logout Button */}
					<div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70">
						<Button
							type="button"
							variant="ghost"
							onClick={handleLogout}
							className="w-full h-11 rounded-2xl text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
						>
							<LogOut size={15} />
							<span>{t("signOut")}</span>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

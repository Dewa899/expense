"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase-client";

interface ProfileConnectionModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	user: any;
	supabaseUser: any;
	isGoogleConnected: boolean;
	googleEmail: string;
	onGoogleLogin: (forceAccountSelection?: boolean) => void;
	onDisconnect: () => void;
	isSyncing: boolean;
	themeColors: {
		text: string;
		bgLight: string;
		gradient: string;
		buttonShadow: string;
	};
}

export function ProfileConnectionModal({
	isOpen,
	onOpenChange,
	user,
	supabaseUser,
	isGoogleConnected,
	googleEmail,
	onGoogleLogin,
	onDisconnect,
	isSyncing,
	themeColors,
}: ProfileConnectionModalProps) {
	const { t } = useLanguage();

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
			<DialogContent className="sm:max-w-[425px] rounded-3xl">
				<DialogHeader>
					<DialogTitle>{t("profileAndAccount")}</DialogTitle>
				</DialogHeader>
				<div className="py-6 flex flex-col items-center text-center gap-4">
					{supabaseUser && (supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture) ? (
						<img 
							src={supabaseUser.user_metadata.avatar_url || supabaseUser.user_metadata.picture} 
							alt="Profile" 
							className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md"
						/>
					) : (
						<div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shadow-inner">
							<span className="text-zinc-500 dark:text-zinc-400 font-bold text-2xl uppercase">
								{supabaseUser?.email?.[0] || user?.name?.[0] || "?"}
							</span>
						</div>
					)}
					
					<div className="space-y-1">
						<h4 className="text-base font-black text-zinc-900 dark:text-zinc-100">
							{supabaseUser?.user_metadata?.full_name || supabaseUser?.user_metadata?.name || user?.name || "User Account"}
						</h4>
						<p className="text-xs text-zinc-500 font-semibold select-all">
							{supabaseUser?.email || user?.email || "No Email Associated"}
						</p>
					</div>

					<div className="w-full space-y-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
						{/* Sign Out Button */}
						<Button
							variant="ghost"
							onClick={handleLogout}
							className="w-full h-11 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border-none bg-transparent"
						>
							<LogOut size={16} />
							{t("signOut")}
						</Button>
					</div>

					{/* Google Integration controls */}
					{supabaseUser ? (
						<div className="w-full space-y-3 mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-850">
							<div className="flex items-center gap-3 justify-center">
								<svg className="w-5 h-5" viewBox="0 0 24 24">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
									<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
								</svg>
								<div className="text-left">
									<p className="text-xs font-black text-zinc-800 dark:text-zinc-200">Google Sheets Sync</p>
									<p className={`text-[10px] font-bold ${isGoogleConnected ? "text-emerald-600" : "text-zinc-450"}`}>
										{isGoogleConnected ? `Connected (${googleEmail})` : "Not Connected"}
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								{!isGoogleConnected ? (
									<Button 
										disabled={isSyncing}
										onClick={() => onGoogleLogin(false)}
										className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black h-12 rounded-xl shadow-md ${themeColors.buttonShadow} flex items-center justify-center gap-2 cursor-pointer border-none`}
									>
										<Wallet size={16} />
										{t("googleSyncConnect")}
									</Button>
								) : (
									<Button 
										variant="ghost" 
										className="w-full h-11 text-destructive hover:bg-destructive/10 font-bold text-xs rounded-xl cursor-pointer border-none bg-transparent" 
										onClick={onDisconnect}
									>
										{t("googleSyncDisconnect")}
									</Button>
								)}
							</div>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}

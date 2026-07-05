"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Download } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface PwaDownloaderModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	isInstallable: boolean;
	triggerInstall: () => void;
	themeColors: {
		gradient: string;
		buttonShadow: string;
	};
}

export function PwaDownloaderModal({
	isOpen,
	onOpenChange,
	isInstallable,
	triggerInstall,
	themeColors,
}: PwaDownloaderModalProps) {
	const { t } = useLanguage();
	const [showManualInstruction, setShowManualInstruction] = React.useState(false);

	// Detect OS
	const os = React.useMemo(() => {
		if (typeof window === "undefined") return "desktop";
		const ua = window.navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(ua)) return "ios";
		if (/android/.test(ua)) return "android";
		return "desktop";
	}, []);

	// Reset state when modal is closed
	React.useEffect(() => {
		if (!isOpen) {
			setShowManualInstruction(false);
		}
	}, [isOpen]);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px] rounded-3xl overflow-hidden p-6">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Home size={20} className="text-emerald-500" />
						{t("addToHomeTitle")}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 pt-2">
					<p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed font-semibold">
						{t("addToHomeDesc")}
					</p>
					
					<Button 
						onClick={() => {
							if (isInstallable) {
								triggerInstall();
							} else {
								setShowManualInstruction(true);
							}
						}}
						className={`w-full bg-gradient-to-r ${themeColors.gradient} hover:opacity-95 text-black font-black h-12 rounded-xl shadow-lg ${themeColors.buttonShadow} flex items-center justify-center gap-2 transition-all cursor-pointer border-none`}
					>
						<Download size={18} />
						{isInstallable ? t("installApp") : t("addToHomepage")}
					</Button>

					{showManualInstruction && (
						<motion.div 
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed space-y-1.5"
						>
							{(os === "ios" ? t("iosShortInstruction") : os === "android" ? t("chromeInstructions") : t("desktopInstructions")).split("\n").map((line, idx) => (
								<p key={idx}>{line}</p>
							))}
						</motion.div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

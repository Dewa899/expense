"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
	Cloud, 
	BarChart3, 
	X, 
	ChevronRight, 
	ChevronLeft, 
	CheckCircle2, 
	Globe,
	Settings2,
	UserPlus,
	Send,
	Loader2,
	Smartphone,
	Download,
	Home,
	ReceiptText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";

interface OnboardingTutorialProps {
	isOpen: boolean;
	onClose: () => void;
	isSynced: boolean;
	onGoogleLogin: (forceAccountSelection?: boolean) => void;
	onLoginClick: () => void;
	isInstallable?: boolean;
	triggerInstall?: () => void;
	isStandaloneMode?: boolean;
}

export function OnboardingTutorial({ 
	isOpen, 
	onClose, 
	isSynced, 
	onGoogleLogin,
	onLoginClick,
	isInstallable = false,
	triggerInstall = () => {},
	isStandaloneMode = false
}: OnboardingTutorialProps) {
	const { t, language, setLanguage } = useLanguage();
	const [step, setStep] = React.useState(0);
	const [isReopen, setIsReopen] = React.useState(false);
	const [showManualInstruction, setShowManualInstruction] = React.useState(false);

	const os = React.useMemo(() => {
		if (typeof window === "undefined") return "desktop";
		const ua = window.navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(ua)) return "ios";
		if (/android/.test(ua)) return "android";
		return "desktop";
	}, []);

	// Clean Coder: Reset tutorial states whenever it's opened
	React.useEffect(() => {
		if (isOpen) {
			const completed = localStorage.getItem("onboarding_complete") === "true";
			setIsReopen(completed);
			setStep(completed ? 1 : 0);
			setShowManualInstruction(false);
		}
	}, [isOpen]);

	React.useEffect(() => {
		setShowManualInstruction(false);
	}, [step]);

	const LogoComponent = (
		<div className="flex flex-col items-center text-left leading-none scale-150 mb-4">
			<div className="flex items-baseline">
				<span className="text-3xl font-black tracking-tighter text-emerald-500 italic">EXP</span>
				<span className="text-sm font-bold tracking-tight text-emerald-600/70 dark:text-emerald-400/50 -ml-0.5">ense</span>
			</div>
			<span className="text-[10px] font-light tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-500 ml-0.5">by GENLORD</span>
		</div>
	);

	const ManageFieldsButtonPreview = (
		<div className="bg-zinc-100 dark:bg-zinc-800 rounded-full px-5 py-2.5 flex items-center gap-2 border-none shadow-md scale-[1.4] mb-6 mt-4">
			<Settings2 size={18} className="text-emerald-600 dark:text-emerald-400" />
			<span className="text-[12px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
				{t("manageFields")}
			</span>
		</div>
	);

	const allSteps = [
		{
			title: t("chooseLanguage"),
			desc: "Choose your preferred language to start the tutorial.",
			icon: <Globe className="text-blue-500" size={48} />,
			content: (
				<div className="flex gap-4 mt-4 justify-center">
					<Button 
						variant={language === "en" ? "default" : "outline"}
						onClick={() => setLanguage("en")}
						className="rounded-xl px-8"
					>
						English
					</Button>
					<Button 
						variant={language === "id" ? "default" : "outline"}
						onClick={() => setLanguage("id")}
						className="rounded-xl px-8"
					>
						Indonesia
					</Button>
				</div>
			)
		},
		{
			title: t("step1Title"),
			desc: t("step1Desc"),
			vision: true,
			icon: <Image src="/illustrations/hello.webp" alt="Hello" width={180} height={180} className="scale-125" />
		},
		{
			title: t("stepOcrTitle"),
			desc: t("stepOcrDesc"),
			icon: <ReceiptText className="text-emerald-500" size={48} />
		},
		{
			title: t("step3Title"),
			desc: t("step3Desc"),
			customLogo: LogoComponent
		},
		{
			title: t("step4Title"),
			desc: t("step4Desc"),
			customLogo: ManageFieldsButtonPreview
		},
		{
			title: t("step5Title"),
			desc: t("step5Desc"),
			icon: <BarChart3 className="text-pink-500" size={48} />
		},
		{
			title: isSynced 
				? (language === "en" ? "You're ready to go!" : "Anda siap memulai!") 
				: (language === "en" ? "Choose Database & Sync" : "Pilih Database & Sinkronisasi"),
			desc: isSynced 
				? (language === "en" ? "Your account is already connected and ready to track your expenses." : "Akun Anda sudah terhubung dan siap untuk melacak pengeluaran Anda.") 
				: (language === "en" 
					? "Choose how you want to use the app: Log In/Sign Up to secure your database in the cloud, or directly link Google Sheets to your Google Drive without an account." 
					: "Pilih cara penggunaan aplikasi: Login/Daftar untuk menyimpan database dengan aman di cloud, atau langsung hubungkan Google Sheets ke Google Drive Anda tanpa membuat akun."),
			icon: isSynced ? <CheckCircle2 className="text-emerald-500" size={48} /> : <Cloud className="text-emerald-500" size={48} />,
			content: !isSynced ? (
				<div className="flex flex-col items-center gap-2.5 w-full mt-4">
					<Button 
						onClick={onLoginClick}
						className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-12 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
					>
						<UserPlus size={18} />
						{language === "en" ? "Sign In / Sign Up Account" : "Masuk / Daftar Akun"}
					</Button>
					
					<div className="relative flex items-center justify-center w-full my-1">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
						</div>
						<span className="relative px-3 text-[10px] font-bold text-zinc-400 bg-white dark:bg-zinc-900 uppercase tracking-widest">
							{language === "en" ? "or use sheets directly" : "atau gunakan sheets langsung"}
						</span>
					</div>

					<Button 
						onClick={() => onGoogleLogin(false)}
						className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-200 font-bold h-12 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer"
					>
						<svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
							<path fill="#0F9D58" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
							<path fill="#F1F1F1" d="M14 8h6L14 2v6z" />
							<path fill="#F1F1F1" d="M8 10h8v2H8zm0 3h8v2H8zm0 3h8v2H8z" />
							<path fill="#0F9D58" d="M7 9h10v10H7z" />
							<path fill="#FFFFFF" d="M10 11H8v2h2v-2zm4 0h-2v2h2v-2zm-4 4H8v2h2v-2zm4 0h-2v2h2v-2zm-8-4h6v6H6v-6zm6-2h6v6h-6V9zm0 6h6v6h-6v-6z" />
						</svg>
						{language === "en" ? "Use Google Sheets Directly" : "Gunakan Google Sheets Langsung"}
					</Button>
				</div>
			) : null
		},
		{
			title: t("stepAddToHomeTitle"),
			desc: t("stepAddToHomeDesc"),
			icon: <Smartphone className="text-emerald-500" size={48} />,
			content: (
				<div className="w-full flex flex-col items-center gap-3 mt-2">
					<Button 
						onClick={() => {
							if (isInstallable) {
								triggerInstall();
							} else {
								setShowManualInstruction(true);
							}
						}}
						className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black h-12 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
					>
						<Download size={18} />
						{isInstallable ? t("installApp") : t("addToHomepage")}
					</Button>

					{showManualInstruction && (
						<motion.div 
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							className="bg-amber-500/10 border border-amber-500/20 text-amber-850 dark:text-amber-400 p-4 rounded-2xl text-[11px] font-semibold leading-relaxed text-left space-y-1 w-full max-h-[140px] overflow-y-auto"
						>
							{(os === "ios" ? t("iosShortInstruction") : os === "android" ? t("chromeInstructions") : t("desktopInstructions")).split("\n").map((line, idx) => (
								<p key={idx}>{line}</p>
							))}
						</motion.div>
					)}
				</div>
			)
		}
	];
	const steps = isStandaloneMode ? allSteps.slice(0, 6) : allSteps;

	if (!isOpen) return null;

	const currentStep = steps[step];

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
			<motion.div 
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative"
			>
				{/* Top Skip Button */}
				<Button 
					variant="ghost" 
					size="sm" 
					onClick={onClose}
					className="absolute top-6 right-6 rounded-full w-10 h-10 p-0 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 z-[110]"
				>
					<X size={20} />
				</Button>

				{/* Progress Bar */}
				<div className="absolute top-0 left-0 w-full h-1.5 flex gap-1 p-4 pt-6">
					{steps.map((_, i) => (
						<div key={i} className={`h-full flex-1 rounded-full transition-colors ${i <= step ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"}`} />
					))}
				</div>

				<div className="p-8 pt-16 flex flex-col items-center text-center gap-6">
					<motion.div 
						key={step}
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						className="min-h-[120px] flex items-center justify-center mb-2"
					>
						{currentStep.customLogo ? currentStep.customLogo : (
							<div className={`${currentStep.title === t("step1Title") ? "" : "w-24 h-24 rounded-full bg-zinc-50 dark:bg-zinc-800/50"} flex items-center justify-center`}>
								{currentStep.icon}
							</div>
						)}
					</motion.div>

					<div className="space-y-2">
						<h2 className="text-2xl font-black tracking-tight">{currentStep.title}</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 px-2 leading-relaxed">
							{currentStep.desc}
						</p>
						{currentStep.vision && (
							<div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
								<p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest italic">
									"{t("vision")}"
								</p>
							</div>
						)}
					</div>

					{currentStep.content}

					<div className="w-full flex items-center justify-between mt-4 gap-4">
						{step > (isReopen ? 1 : 0) && (
							<Button variant="ghost" onClick={() => setStep(s => s - 1)} className="rounded-2xl font-bold">
								<ChevronLeft size={18} className="mr-1" /> {t("prev")}
							</Button>
						)}

						<div className="flex-1" />

						{step < steps.length - 1 ? (
							<Button 
								onClick={() => setStep(s => s + 1)}
								className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl px-8"
							>
								{t("next")} <ChevronRight size={18} className="ml-1" />
							</Button>
						) : (
							<Button 
								onClick={onClose}
								className="bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-2xl px-10 shadow-lg shadow-emerald-500/20"
							>
								{t("finish")}
							</Button>
						)}
					</div>
				</div>
			</motion.div>
		</div>
	);
}

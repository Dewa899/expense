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
	Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";

interface OnboardingTutorialProps {
	isOpen: boolean;
	onClose: () => void;
	isSynced: boolean;
	onGoogleLogin: () => void;
	onRequestAccess?: (email: string) => void;
}

export function OnboardingTutorial({ 
	isOpen, 
	onClose, 
	isSynced, 
	onGoogleLogin,
	onRequestAccess = () => {}
}: OnboardingTutorialProps) {
	const { t, language, setLanguage } = useLanguage();
	const [step, setStep] = React.useState(0);
	const [isReopen, setIsReopen] = React.useState(false);
	const [requestEmail, setRequestEmail] = React.useState("");
	const [loading, setLoading] = React.useState(false);
	const [submitted, setSubmitted] = React.useState(false);

	// Clean Coder: Reset tutorial states whenever it's opened
	React.useEffect(() => {
		if (isOpen) {
			const completed = localStorage.getItem("onboarding_complete") === "true";
			setIsReopen(completed);
			setStep(completed ? 1 : 0);
			setSubmitted(false);
			setRequestEmail("");
		}
	}, [isOpen]);

	const handleSendRequest = async () => {
		if (!requestEmail.includes("@")) return;
		setLoading(true);
		try {
			// Web3Forms API Integration
			const response = await fetch("https://api.web3forms.com/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
					subject: "[ACCESS] Integration Access Request",
					from_name: "Expense App User (Tutorial)",
					email: requestEmail,
					category: "access",
					message: `User requested integration access from the onboarding tutorial. Email: ${requestEmail}`,
				}),
			});

			if (response.ok) {
				setSubmitted(true);
			}
		} catch (error) {
			console.error("Failed to send access request");
		} finally {
			setLoading(false);
		}
	};

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

	const steps = [
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
			icon: <Image src="/illustrations/hello.png" alt="Hello" width={180} height={180} className="scale-125" />
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
			title: submitted ? t("supportSuccess") : t("step6Title"),
			desc: submitted ? t("supportSuccessDesc") : t("step6Desc"),
			icon: submitted ? <CheckCircle2 className="text-emerald-500" size={48} /> : <UserPlus className="text-zinc-500" size={48} />,
			content: !submitted ? (
				<div className="w-full flex flex-col gap-3 mt-4">
					<Input 
						type="email"
						placeholder={t("emailInputPlaceholder")}
						value={requestEmail}
						onChange={(e) => setRequestEmail(e.target.value)}
						className="h-12 rounded-2xl border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-center"
						disabled={loading}
					/>
					<Button 
						onClick={handleSendRequest}
						disabled={loading || !requestEmail.includes("@")}
						className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-black h-12 rounded-2xl shadow-lg gap-2"
					>
						{loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
						{t("requestAccess")}
					</Button>
				</div>
			) : (
				<div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
					{t("supportSuccessDesc")}
				</div>
			)
		},
		{
			title: isSynced ? "You're ready to go!" : t("step2Title"),
			desc: isSynced ? "Your account is already connected and ready to track your expenses." : t("step2Desc"),
			icon: isSynced ? <CheckCircle2 className="text-emerald-500" size={48} /> : <Cloud className="text-emerald-500" size={48} />,
			content: !isSynced ? (
				<div className="flex flex-col items-center gap-2 w-full mt-4">
					<Button 
						onClick={onGoogleLogin}
						className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-200 font-bold h-12 rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all"
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24">
							<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
							<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
							<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
							<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
						</svg>
						Continue with Google
					</Button>
					<button 
						onClick={() => setStep(steps.findIndex(s => s.title === t("step6Title")))}
						className="text-[10px] font-bold text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-2 cursor-pointer"
					>
						{t("requestAccess")}
					</button>
				</div>
			) : null
		}
	];

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

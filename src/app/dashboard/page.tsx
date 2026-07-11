"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LandingView } from "@/components/landing-view";
import { AppLayoutWrapper } from "@/components/app-layout-wrapper";
import { useDemo } from "@/components/demo-context";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase-client";

export default function DashboardLandingPage() {
	const router = useRouter();
	const logic = useDashboardLogic();
	const { enterDemo } = useDemo();
	const { language } = useLanguage();
	const [mounted, setMounted] = React.useState(false);
	const [isDemoConfirmOpen, setIsDemoConfirmOpen] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	const handleTryDemo = () => {
		const isLogged = !!logic.supabaseUser || !!logic.user;
		if (isLogged) {
			setIsDemoConfirmOpen(true);
		} else {
			enterDemo();
			router.push("/");
		}
	};

	const handleGetStarted = () => {
		router.push("/login");
	};

	return (
		<AppLayoutWrapper>
			<LandingView
				onGetStarted={handleGetStarted}
				onTryDemo={handleTryDemo}
			/>

			{/* Demo Mode Confirmation Warning Modal */}
			<Dialog open={isDemoConfirmOpen} onOpenChange={setIsDemoConfirmOpen}>
				<DialogContent className="sm:max-w-[400px] rounded-3xl">
					<DialogHeader>
						<DialogTitle className="text-amber-500 flex items-center gap-2">
							{language === "en" ? "⚠️ Enter Demo Mode?" : "⚠️ Masuk Mode Demo?"}
						</DialogTitle>
						<DialogDescription className="mt-2 text-zinc-650 dark:text-zinc-350 text-sm leading-relaxed text-left">
							{language === "en" ? (
								<>
									Entering demo mode will <strong>log out your current active account</strong>.
									<br /><br />
									Are you sure you want to continue and enter demo mode?
								</>
							) : (
								<>
									Masuk ke mode demo akan <strong>mengeluarkan (log out) akun aktif Anda</strong> saat ini.
									<br /><br />
									Apakah Anda yakin ingin melanjutkan dan masuk ke mode demo?
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="flex gap-3 mt-4">
						<Button
							variant="outline"
							onClick={() => setIsDemoConfirmOpen(false)}
							className="flex-1 h-12 rounded-xl font-bold cursor-pointer"
						>
							{language === "en" ? "Cancel" : "Batal"}
						</Button>
						<Button
							onClick={async () => {
								if (logic.supabaseUser) {
									await supabase.auth.signOut();
								}
								localStorage.removeItem("googleUser");
								localStorage.removeItem("sheetId");
								localStorage.removeItem("customFieldDefs");
								localStorage.removeItem("customChartConfigs");
								localStorage.removeItem("customPockets");
								localStorage.removeItem("customCategories");
								localStorage.removeItem("recurringTemplates");
								setIsDemoConfirmOpen(false);
								enterDemo();
								router.push("/");
							}}
							className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black cursor-pointer"
						>
							{language === "en" ? "Yes, Enter Demo" : "Ya, Masuk Demo"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</AppLayoutWrapper>
	);
}

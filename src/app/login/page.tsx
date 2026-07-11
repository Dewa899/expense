"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoginView } from "@/components/login-view";
import { AppLayoutWrapper } from "@/components/app-layout-wrapper";
import { useDashboardLogic } from "@/hooks/use-dashboard-logic";
import { supabase } from "@/lib/supabase-client";

export default function LoginPage() {
	const router = useRouter();
	const logic = useDashboardLogic();

	React.useEffect(() => {
		// Check local storage for direct Google Sheets active session
		const savedUser = localStorage.getItem("googleUser");
		const savedToken = sessionStorage.getItem("google_oauth_token");
		if (savedUser || savedToken) {
			router.replace("/");
			return;
		}

		// Listen to Supabase auth state change
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				router.replace("/");
			}
		});

		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (session) {
				router.replace("/");
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [router]);

	return (
		<AppLayoutWrapper>
			<LoginView
				mode="login"
				onLoginSuccess={() => router.push("/")}
				onBypassSheets={() => {
					logic.handleGoogleLogin(false);
				}}
				onBack={() => router.push("/")}
			/>
		</AppLayoutWrapper>
	);
}

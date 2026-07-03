import * as React from "react";

export interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

export function usePWAInstall() {
	const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
	const [isInstallable, setIsInstallable] = React.useState(false);
	const [isAddToHomeOpen, setIsAddToHomeOpen] = React.useState(false);
	const [isStandaloneMode, setIsStandaloneMode] = React.useState(false);

	React.useEffect(() => {
		if (typeof window !== "undefined") {
			const handleAppInstalled = () => {
				console.log("PWA was installed");
				localStorage.setItem("pwa_installed", "true");
				setIsStandaloneMode(true);
			};
			window.addEventListener("appinstalled", handleAppInstalled);

			const isStandalone =
				window.matchMedia("(display-mode: standalone)").matches ||
				(window.navigator as any).standalone;
			const isLocalInstalled = localStorage.getItem("pwa_installed") === "true";
			if (isStandalone || isLocalInstalled) {
				setIsStandaloneMode(true);
			}

			if ((window as any).deferredPrompt) {
				setDeferredPrompt((window as any).deferredPrompt);
				setIsInstallable(true);
			}

			const handlePrompt = (e: Event) => {
				e.preventDefault();
				const promptEvent = e as BeforeInstallPromptEvent;
				(window as any).deferredPrompt = promptEvent;
				setDeferredPrompt(promptEvent);
				setIsInstallable(true);
			};
			window.addEventListener("beforeinstallprompt", handlePrompt);

			return () => {
				window.removeEventListener("appinstalled", handleAppInstalled);
				window.removeEventListener("beforeinstallprompt", handlePrompt);
			};
		}
	}, []);

	const triggerInstall = async () => {
		const promptObj =
			deferredPrompt ||
			(typeof window !== "undefined" ? (window as any).deferredPrompt : null);
		if (!promptObj) return;
		promptObj.prompt();
		const { outcome } = await promptObj.userChoice;
		console.log(`User choice outcome: ${outcome}`);
		if (outcome === "accepted") {
			localStorage.setItem("pwa_installed", "true");
			setIsStandaloneMode(true);
		}
		setDeferredPrompt(null);
		if (typeof window !== "undefined") {
			(window as any).deferredPrompt = null;
		}
		setIsInstallable(false);
	};

	return {
		isInstallable,
		isAddToHomeOpen,
		setIsAddToHomeOpen,
		isStandaloneMode,
		deferredPrompt,
		triggerInstall
	};
}

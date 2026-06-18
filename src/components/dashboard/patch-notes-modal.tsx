"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { Sparkles, RefreshCw, Keyboard, Smartphone, Banknote, PlayCircle, ScrollText } from "lucide-react";

interface PatchNotesModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

const VERSION = "v1.0";

interface FeatureEntry {
	icon: React.ReactNode;
	titleKey: string;
	descKey: string;
}

const FEATURES: FeatureEntry[] = [
	{
		icon: <RefreshCw size={16} className="text-emerald-500" />,
		titleKey: "patchFeature1Title",
		descKey: "patchFeature1Desc",
	},
	{
		icon: <Smartphone size={16} className="text-emerald-500" />,
		titleKey: "patchFeature2Title",
		descKey: "patchFeature2Desc",
	},
	{
		icon: <Banknote size={16} className="text-emerald-500" />,
		titleKey: "patchFeature3Title",
		descKey: "patchFeature3Desc",
	},
	{
		icon: <PlayCircle size={16} className="text-emerald-500" />,
		titleKey: "patchFeature4Title",
		descKey: "patchFeature4Desc",
	},
	{
		icon: <ScrollText size={16} className="text-emerald-500" />,
		titleKey: "patchFeature5Title",
		descKey: "patchFeature5Desc",
	},
	{
		icon: <Keyboard size={16} className="text-emerald-500" />,
		titleKey: "patchFeature6Title",
		descKey: "patchFeature6Desc",
	},
];

export function PatchNotesModal({ isOpen, onOpenChange }: PatchNotesModalProps) {
	const { t } = useLanguage();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px] rounded-3xl overflow-hidden p-0">
				{/* Header */}
				<div className="bg-emerald-500 dark:bg-emerald-600 px-6 pt-6 pb-5 text-black">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-black">
							<Sparkles size={18} />
							<span>{t("patchNotesTitle")}</span>
							<span className="ml-auto text-xs font-black bg-black/15 px-2 py-0.5 rounded-full">
								{VERSION}
							</span>
						</DialogTitle>
					</DialogHeader>
					<p className="text-xs font-medium text-black/70 mt-1">
						{t("patchNotesSubtitle")}
					</p>
				</div>

				{/* Feature list */}
				<div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
					{FEATURES.map((feat, i) => (
						<div key={i} className="flex gap-3">
							<div className="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mt-0.5">
								{feat.icon}
							</div>
							<div>
								<p className="text-sm font-bold">{t(feat.titleKey as any)}</p>
								<p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
									{t(feat.descKey as any)}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Footer */}
				<div className="px-6 pb-5">
					<p className="text-[10px] text-center text-zinc-400 uppercase tracking-widest font-bold">
						EXPense by GENLORD · {VERSION}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

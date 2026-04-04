"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Link as LinkIcon, Camera, History, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";

const GOOGLE_CLIENT_ID =
	"151196003585-j4f3p4j6d3g45o3a4lrfabc7fv6c6s18.apps.googleusercontent.com";

export function DashboardView() {
	const { t } = useLanguage();
	const [headers, setHeaders] = React.useState<string[]>([]);
	const [categories, setCategories] = React.useState<string[]>([]);
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [loading, setLoading] = React.useState(false);
	const [user, setUser] = React.useState<{
		name: string;
		accessToken: string;
	} | null>(null);
	const [config, setConfig] = React.useState({
		sheetId: "",
	});

	// Load configuration and user from localStorage
	React.useEffect(() => {
		const savedSheetId = localStorage.getItem("sheetId") || "";
		const savedUser = localStorage.getItem("googleUser");

		if (savedUser) {
			const parsedUser = JSON.parse(savedUser);
			setUser(parsedUser);
			if (savedSheetId) {
				setConfig({ sheetId: savedSheetId });
				fetchSheetData(savedSheetId, parsedUser.accessToken);
			}
		} else {
			// Demo fallback
			setHeaders(["Nama Pengeluaran", "Jumlah", "Kategori", "Catatan"]);
			setCategories(["Food", "Transport", "Bills", "Shopping"]);
		}
	}, []);

	const handleGoogleLogin = () => {
		const scope =
			"https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
		const redirectUri = window.location.origin;
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true`;

		window.location.href = authUrl;
	};

	// Handle OAuth callback (extract token from URL)
	React.useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.includes("access_token")) {
			const params = new URLSearchParams(hash.substring(1));
			const token = params.get("access_token");
			if (token) {
				const newUser = { name: "Google User", accessToken: token };
				setUser(newUser);
				localStorage.setItem("googleUser", JSON.stringify(newUser));
				window.location.hash = ""; // Clean URL
				setupGoogleSheet(token);
			}
		}
	}, []);

	const setupGoogleSheet = async (token: string) => {
		setLoading(true);
		try {
			// 1. Search for existing sheet
			const searchRes = await fetch(
				`https://www.googleapis.com/drive/v3/files?q=name='Expense Tracker' and mimeType='application/vnd.google-apps.spreadsheet'`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const searchData = await searchRes.json();

			let sheetId = "";
			if (searchData.files && searchData.files.length > 0) {
				sheetId = searchData.files[0].id;
			} else {
				// 2. Create new sheet if not found
				const createRes = await fetch(
					"https://sheets.googleapis.com/v4/spreadsheets",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							properties: { title: "Expense Tracker" },
							sheets: [{ properties: { title: "Sheet1" } }],
						}),
					},
				);
				const createData = await createRes.json();
				sheetId = createData.spreadsheetId;

				// 3. Initialize headers
				await fetch(
					`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:E1?valueInputOption=RAW`,
					{
						method: "PUT",
						headers: { Authorization: `Bearer ${token}` },
						body: JSON.stringify({
							values: [["Tanggal", "Nama", "Jumlah", "Kategori", "Catatan"]],
						}),
					},
				);
			}

			localStorage.setItem("sheetId", sheetId);
			setConfig({ sheetId });
			fetchSheetData(sheetId, token);
		} catch (error) {
			console.error("Setup failed:", error);
		} finally {
			setLoading(false);
		}
	};

	const fetchSheetData = async (sheetId: string, token: string) => {
		try {
			setLoading(true);
			const response = await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:E1`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const data = await response.json();
			if (data.values && data.values[0]) {
				setHeaders(data.values[0]);
			}
		} catch (error) {
			console.error("Fetch failed:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async () => {
		if (!user?.accessToken || !config.sheetId) return;

		setLoading(true);
		try {
			const values = headers.map((h) => {
				if (h.toLowerCase().includes("tanggal"))
					return new Date().toLocaleString();
				return formData[h] || "";
			});

			await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${user.accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ values: [values] }),
				},
			);

			alert("Expense added to Google Sheets!");
			setFormData({});
		} catch (error) {
			console.error("Submit failed:", error);
			alert("Failed to add expense.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<motion.div
			key="dashboard"
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 20 }}
			className="flex flex-col p-4 gap-6 max-w-md mx-auto w-full"
		>
			{/* Dashboard Content */}
			<section className="mt-2">
				<div className="bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-6 text-black shadow-lg shadow-emerald-500/20">
					<p className="text-xs font-bold uppercase opacity-70 tracking-wider">
						Total {t("amount")} (Apr)
					</p>
					<h2 className="text-3xl font-black tracking-tight mt-1">Rp 0</h2>
					<div className="flex justify-between items-center mt-6">
						<div className="flex -space-x-2">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-400 flex items-center justify-center text-[10px] font-bold"
								>
									<History size={12} />
								</div>
							))}
						</div>
						<Dialog>
							<DialogTrigger
								render={
									<Button
										size="sm"
										variant="secondary"
										className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold"
									/>
								}
							>
								<LinkIcon size={14} className="mr-1" />
								{user ? "Sync Active" : t("integration")}
							</DialogTrigger>
							<DialogContent className="sm:max-w-[425px] rounded-3xl">
								<DialogHeader>
									<DialogTitle>{t("integrationTitle")}</DialogTitle>
									<DialogDescription>{t("integrationDesc")}</DialogDescription>
								</DialogHeader>

								<div className="py-6 flex flex-col items-center text-center gap-4">
									<div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
										<Wallet
											className="text-emerald-600 dark:text-emerald-400"
											size={32}
										/>
									</div>

									{user ? (
										<div className="space-y-2">
											<p className="font-bold text-sm text-emerald-600">
												{t("googleSyncActive")}
											</p>
											<p className="text-[10px] text-zinc-500 italic opacity-70">
												File: Expense Tracker
											</p>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive hover:bg-destructive/10 font-bold text-[10px] mt-4"
												onClick={() => {
													localStorage.removeItem("googleUser");
													localStorage.removeItem("sheetId");
													window.location.reload();
												}}
											>
												{t("googleSyncDisconnect")}
											</Button>
										</div>
									) : (
										<>
											<div>
												<p className="font-bold text-sm mb-1">
													{t("googleSyncTitle")}
												</p>
												<p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-4">
													{t("googleSyncDesc")}
												</p>
											</div>

											<Button
												className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold h-12 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm"
												onClick={handleGoogleLogin}
												disabled={loading}
											>
												<svg className="w-5 h-5" viewBox="0 0 24 24">
													<path
														fill="currentColor"
														d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
													/>
													<path
														fill="currentColor"
														d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
													/>
													<path
														fill="currentColor"
														d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
													/>
													<path
														fill="currentColor"
														d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
													/>
												</svg>
												{loading ? "..." : t("googleSyncBtn")}
											</Button>
										</>
									)}
								</div>

								<div className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center px-4 mb-2 leading-tight opacity-80">
									{t("googleSyncPrivacy")}
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</section>

			<section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
				<h3 className="text-lg font-bold mb-6 flex items-center gap-2">
					<Plus className="text-emerald-500" size={20} />
					{t("quickAdd")}
				</h3>

				<div className="space-y-5">
					{loading && headers.length === 0 ? (
						<div className="py-10 text-center text-zinc-500 font-medium">
							Connecting to Google...
						</div>
					) : (
						headers.map((header) => {
							if (header.toLowerCase().includes("tanggal")) return null;

							return (
								<div key={header} className="space-y-2">
									<Label className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
										{header}
									</Label>

									{header.toLowerCase() === "kategori" &&
									categories.length > 0 ? (
										<Select
											onValueChange={(val) =>
												handleInputChange(header, val as string)
											}
										>
											<SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
												<SelectValue placeholder={t("selectCategory")} />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												{categories.map((cat) => (
													<SelectItem key={cat} value={cat}>
														{cat}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<Input
											type={
												header.toLowerCase().includes("jumlah")
													? "number"
													: "text"
											}
											placeholder={`Enter ${header}`}
											className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-emerald-500"
											value={formData[header] || ""}
											onChange={(e) =>
												handleInputChange(header, e.target.value)
											}
										/>
									)}
								</div>
							);
						})
					)}

					<Button
						disabled={loading || !user}
						onClick={handleSubmit}
						className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/20 mt-4"
					>
						{loading ? "..." : user ? t("addExpense") : "Please Login First"}
					</Button>
				</div>
			</section>

			<section className="mt-2">
				<Button
					variant="outline"
					disabled
					className="w-full h-16 rounded-2xl border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center justify-center gap-3 group opacity-60"
				>
					<div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
						<Camera size={20} className="text-zinc-500" />
					</div>
					<div className="text-left">
						<p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
							Scan Receipt
						</p>
						<p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-500">
							{t("ocrComingSoon")}
						</p>
					</div>
				</Button>
			</section>
		</motion.div>
	);
}

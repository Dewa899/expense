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
	const [newCategoryInput, setNewCategoryInput] = React.useState("");
	const [formData, setFormData] = React.useState<Record<string, string>>({});
	const [loading, setLoading] = React.useState(false);
	const [user, setUser] = React.useState<{
		name: string;
		accessToken: string;
	} | null>(null);
	const [config, setConfig] = React.useState({
		sheetId: "",
	});

	const DEFAULT_HEADERS = ["Nama Pengeluaran", "Jumlah", "Tipe", "Kategori", "Catatan"];

	const getCurrentMonthSheetName = () => {
		const now = new Date();
		return now.toLocaleString("id-ID", { month: "long", year: "numeric" });
	};

	React.useEffect(() => {
		const savedSheetId = localStorage.getItem("sheetId") || "";
		const savedUser = localStorage.getItem("googleUser");
		const savedCats = localStorage.getItem("customCategories");

		if (savedCats) {
			setCategories(JSON.parse(savedCats));
		} else {
			const defaultCats = ["Food", "Transport", "Bills", "Shopping", "Salary", "Gift"];
			setCategories(defaultCats);
			localStorage.setItem("customCategories", JSON.stringify(defaultCats));
		}

		if (savedUser) {
			const parsedUser = JSON.parse(savedUser);
			setUser(parsedUser);
			if (savedSheetId) {
				setConfig({ sheetId: savedSheetId });
				fetchSheetData(savedSheetId, parsedUser.accessToken);
			} else {
				setHeaders(DEFAULT_HEADERS);
			}
		} else {
			setHeaders(DEFAULT_HEADERS);
		}
	}, []);

	const handleAddCategory = () => {
		if (!newCategoryInput.trim() || categories.includes(newCategoryInput.trim())) return;
		const updated = [...categories, newCategoryInput.trim()];
		setCategories(updated);
		localStorage.setItem("customCategories", JSON.stringify(updated));
		setNewCategoryInput("");
	};

	const handleDeleteCategory = (cat: string) => {
		const updated = categories.filter((c) => c !== cat);
		setCategories(updated);
		localStorage.setItem("customCategories", JSON.stringify(updated));
	};

	const handleGoogleLogin = () => {
		const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
		const redirectUri = window.location.origin;
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true`;
		window.location.href = authUrl;
	};

	React.useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.includes("access_token")) {
			const params = new URLSearchParams(hash.substring(1));
			const token = params.get("access_token");
			if (token) {
				const newUser = { name: "Google User", accessToken: token };
				setUser(newUser);
				localStorage.setItem("googleUser", JSON.stringify(newUser));
				window.location.hash = "";
				setupGoogleSheet(token);
			}
		}
	}, []);

	const setupGoogleSheet = async (token: string) => {
		setLoading(true);
		try {
			// 1. Folder Management
			const folderSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='expense by genlord' and mimeType='application/vnd.google-apps.folder' and trashed=false`, { headers: { Authorization: `Bearer ${token}` } });
			const folderSearchData = await folderSearchRes.json();
			if (folderSearchData.error) throw new Error(folderSearchData.error.message);
			
			let folderId = folderSearchData.files?.[0]?.id;

			if (!folderId) {
				const folderCreateRes = await fetch("https://www.googleapis.com/drive/v3/files", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ name: "expense by genlord", mimeType: "application/vnd.google-apps.folder" }),
				});
				const folderData = await folderCreateRes.json();
				if (folderData.error) throw new Error("Folder create error: " + folderData.error.message);
				folderId = folderData.id;
			}

			if (!folderId) throw new Error("Failed to secure folder ID");

			// 2. Spreadsheet Management
			const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='Expense Tracker' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`, { headers: { Authorization: `Bearer ${token}` } });
			const searchData = await searchRes.json();
			if (searchData.error) throw new Error(searchData.error.message);
			
			let spreadsheetId = searchData.files?.[0]?.id;

			if (!spreadsheetId) {
				const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
					method: "POST",
					headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
					body: JSON.stringify({ name: "Expense Tracker", mimeType: "application/vnd.google-apps.spreadsheet", parents: [folderId] }),
				});
				const createData = await createRes.json();
				if (createData.error) throw new Error("Spreadsheet create error: " + createData.error.message);
				spreadsheetId = createData.id;
			}

			if (!spreadsheetId) throw new Error("Failed to secure spreadsheet ID");

			// 3. Tab & Formatting Management
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(spreadsheetId, sheetName, token);
			await initializeSheetFormatting(spreadsheetId, token, sheetName, internalSheetId);

			localStorage.setItem("sheetId", spreadsheetId);
			setConfig({ sheetId: spreadsheetId });
			fetchSheetData(spreadsheetId, token);
		} catch (error: any) {
			console.error("Setup failed:", error);
			alert("Sync Error: " + error.message);
		} finally {
			setLoading(false);
		}
	};

	const ensureAndGetSheetId = async (spreadsheetId: string, sheetName: string, token: string): Promise<number> => {
		const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, { headers: { Authorization: `Bearer ${token}` } });
		const metadata = await metadataRes.json();
		if (metadata.error) throw new Error("Metadata error: " + metadata.error.message);
		
		const existingSheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName);
		if (existingSheet) return existingSheet.properties.sheetId;

		const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
		});
		const createData = await createRes.json();
		if (createData.error) throw new Error("Tab creation error: " + createData.error.message);
		
		const newSheetId = createData.replies?.[0]?.addSheet?.properties?.sheetId;
		if (newSheetId === undefined) throw new Error("Failed to retrieve new tab ID");
		
		return newSheetId;
	};

	const initializeSheetFormatting = async (spreadsheetId: string, token: string, sheetName: string, internalSheetId: number) => {
		try {
			const dualHeaders = ["Date / Tanggal", "Name / Nama", "Amount / Jumlah", "Type / Tipe", "Category / Kategori", "Note / Catatan"];
			
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:F1?valueInputOption=RAW`, {
				method: "PUT",
				headers: { Authorization: `Bearer ${token}` },
				body: JSON.stringify({ values: [dualHeaders] }),
			});

			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
				body: JSON.stringify({
					requests: [
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 }, properties: { pixelSize: 200 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 }, properties: { pixelSize: 280 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 3 }, properties: { pixelSize: 140 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 }, properties: { pixelSize: 160 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 4, endIndex: 5 }, properties: { pixelSize: 200 }, fields: "pixelSize" } },
						{ updateDimensionProperties: { range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 5, endIndex: 6 }, properties: { pixelSize: 400 }, fields: "pixelSize" } },
						{
							addConditionalFormatRule: {
								rule: {
									ranges: [{ sheetId: internalSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 6 }],
									booleanRule: {
										condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=ISODD(ROW())" }] },
										format: { backgroundColor: { red: 0.95, green: 0.98, blue: 0.96 } },
									},
								},
								index: 0,
							},
						},
						{
							repeatCell: {
								range: { sheetId: internalSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 6 },
								cell: {
									userEnteredFormat: {
										backgroundColor: { red: 0.06, green: 0.72, blue: 0.5 },
										textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true },
										horizontalAlignment: "CENTER",
									},
								},
								fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
							},
						},
						{ updateSheetProperties: { properties: { sheetId: internalSheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
					],
				}),
			});
		} catch (e) {
			console.error("Formatting failed", e);
		}
	};

	const fetchSheetData = async (sheetId: string, token: string) => {
		try {
			setLoading(true);
			const sheetName = getCurrentMonthSheetName();
			const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:F1`, { headers: { Authorization: `Bearer ${token}` } });
			const data = await response.json();
			if (data.values && data.values[0]) {
				setHeaders(data.values[0]);
			} else {
				setHeaders(DEFAULT_HEADERS);
			}
		} catch (error) {
			console.error("Fetch failed:", error);
			setHeaders(DEFAULT_HEADERS);
		} finally {
			setLoading(false);
		}
	};

	const translateHeader = (header: string) => {
		const h = header.toLowerCase();
		if (h.includes("nama") || h.includes("name")) return t("name") || "Name";
		if (h.includes("jumlah") || h.includes("amount")) return t("amount") || "Amount";
		if (h.includes("tipe") || h.includes("type")) return t("transactionType") || "Type";
		if (h.includes("kategori") || h.includes("category")) return t("category") || "Category";
		if (h.includes("catatan") || h.includes("note")) return t("note") || "Note";
		return header;
	};

	const handleInputChange = (header: string, value: string) => {
		setFormData((prev) => ({ ...prev, [header]: value }));
	};

	const handleSubmit = async () => {
		if (!user?.accessToken || !config.sheetId) return;
		setLoading(true);
		try {
			const sheetName = getCurrentMonthSheetName();
			const internalSheetId = await ensureAndGetSheetId(config.sheetId, sheetName, user.accessToken);
			await initializeSheetFormatting(config.sheetId, user.accessToken, sheetName, internalSheetId);

			const values = headers.map((h) => {
				const headerLower = h.toLowerCase();
				if (headerLower.includes("tanggal") || headerLower.includes("date")) return new Date().toLocaleString();
				let val = formData[h] || "";
				if (headerLower.includes("jumlah") || headerLower.includes("amount")) {
					const typeKey = headers.find((header) => header.toLowerCase().includes("tipe") || header.toLowerCase().includes("type"));
					const typeValue = typeKey ? formData[typeKey] : "";
					const isExpense = typeValue === "Expense" || typeValue === "Pengeluaran" || typeValue.toLowerCase().includes("out") || typeValue.includes("Expense");
					if (isExpense) val = (Math.abs(parseFloat(val)) * -1).toString();
				}
				return val;
			});

			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`, {
				method: "POST",
				headers: { Authorization: `Bearer ${user.accessToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ values: [values] }),
			});

			alert("Expense added to " + sheetName);
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
			<section className="mt-2">
				<div className="bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-6 text-black shadow-lg shadow-emerald-500/20">
					<p className="text-xs font-bold uppercase opacity-70 tracking-wider">
						Total {t("amount")} ({getCurrentMonthSheetName().split(' ')[0]})
					</p>
					<h2 className="text-3xl font-black tracking-tight mt-1">Rp 0</h2>
					<div className="flex justify-between items-center mt-6">
						<div className="flex -space-x-2">
							{[1, 2, 3].map((i) => (
								<div key={i} className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-400 flex items-center justify-center text-[10px] font-bold">
									<History size={12} />
								</div>
							))}
						</div>
						<Dialog>
							<DialogTrigger render={<Button size="sm" variant="secondary" className="bg-black/10 hover:bg-black/20 text-black border-none rounded-full font-bold" />}>
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
										<Wallet className="text-emerald-600 dark:text-emerald-400" size={32} />
									</div>
									{user ? (
										<div className="space-y-2">
											<p className="font-bold text-sm text-emerald-600">{t("googleSyncActive")}</p>
											<p className="text-[10px] text-zinc-500 italic opacity-70">Current Tab: {getCurrentMonthSheetName()}</p>
											<Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 font-bold text-[10px] mt-4" onClick={() => { localStorage.removeItem("googleUser"); localStorage.removeItem("sheetId"); window.location.reload(); }}>{t("googleSyncDisconnect")}</Button>
										</div>
									) : (
										<>
											<div>
												<p className="font-bold text-sm mb-1">{t("googleSyncTitle")}</p>
												<p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-4">{t("googleSyncDesc")}</p>
											</div>
											<Button className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold h-12 rounded-xl flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm" onClick={handleGoogleLogin} disabled={loading}>
												<svg className="w-5 h-5" viewBox="0 0 24 24">
													<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
													<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
													<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
													<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
												</svg>
												{loading ? "..." : t("googleSyncBtn")}
											</Button>
										</>
									)}
								</div>
								<div className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center px-4 mb-2 leading-tight opacity-80">{t("googleSyncPrivacy")}</div>
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
						<div className="py-10 text-center text-zinc-500 font-medium">Connecting to Google...</div>
					) : (
						headers.map((header) => {
							const hLower = header.toLowerCase();
							if (hLower.includes("tanggal") || hLower.includes("date")) return null;

							const isCategory = hLower.includes("kategori") || hLower.includes("category");
							const isType = hLower.includes("tipe") || hLower.includes("type");
							const isAmount = hLower.includes("jumlah") || hLower.includes("amount");

							return (
								<div key={header} className="space-y-2">
									<div className="flex items-center justify-between ml-1">
										<Label className="text-xs text-zinc-500 dark:text-zinc-400">
											{translateHeader(header)}
										</Label>
										{isCategory && (
											<Dialog>
												<DialogTrigger
													render={
														<Button
															variant="ghost"
															size="sm"
															className="h-6 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-2 rounded-lg"
														/>
													}
												>
													{t("manageCategories")}
												</DialogTrigger>
												<DialogContent className="sm:max-w-[400px] rounded-3xl">
													<DialogHeader>
														<DialogTitle>{t("manageCategories")}</DialogTitle>
														<DialogDescription>
															Add or remove categories from your list.
														</DialogDescription>
													</DialogHeader>
													<div className="space-y-4 py-4">
														<div className="flex gap-2">
															<Input
																placeholder={t("newCategory")}
																value={newCategoryInput}
																onChange={(e) =>
																	setNewCategoryInput(e.target.value)
																}
																className="rounded-xl"
															/>
															<Button
																onClick={handleAddCategory}
																className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl"
															>
																{t("add")}
															</Button>
														</div>
														<div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
															{categories.map((cat) => (
																<div
																	key={cat}
																	className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800"
																>
																	<span className="text-sm font-medium">
																		{cat}
																	</span>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => handleDeleteCategory(cat)}
																		className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg"
																	>
																		×
																	</Button>
																</div>
															))}
														</div>
													</div>
												</DialogContent>
											</Dialog>
										)}
									</div>

									{isCategory && categories.length > 0 ? (
										<div className="space-y-3">
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
										</div>
									) : isType ? (
										<Select
											onValueChange={(val) =>
												handleInputChange(header, val as string)
											}
										>
											<SelectTrigger className="h-12 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
												<SelectValue placeholder={t("transactionType")} />
											</SelectTrigger>
											<SelectContent className="rounded-xl">
												<SelectItem value={t("income")}>{t("income")}</SelectItem>
												<SelectItem value={t("expense")}>
													{t("expense")}
												</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<Input
											type={isAmount ? "number" : "text"}
											placeholder={`Enter ${translateHeader(header)}`}
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
					<Button disabled={loading || !user} onClick={handleSubmit} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg rounded-2xl shadow-lg shadow-emerald-500/20 mt-4">
						{loading ? "..." : user ? t("addExpense") : "Please Login First"}
					</Button>
				</div>
			</section>
			<section className="mt-2">
				<Button variant="outline" disabled className="w-full h-16 rounded-2xl border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center justify-center gap-3 group opacity-60">
					<div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
						<Camera size={20} className="text-zinc-500" />
					</div>
					<div className="text-left">
						<p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Scan Receipt</p>
						<p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-500">{t("ocrComingSoon")}</p>
					</div>
				</Button>
			</section>
		</motion.div>
	);
}

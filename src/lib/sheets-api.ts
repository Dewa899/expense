export const CORE_HEADERS_DUAL = [
	"Date / Tanggal",
	"Name / Nama",
	"Amount / Jumlah",
	"Type / Tipe",
	"Category / Kategori",
	"Note / Catatan"
];

export const CORE_FIELDS_COUNT = 6;

export interface CustomFieldDef {
	name: string;
	type: "text" | "dropdown";
	required: boolean;
	options?: string[];
}

export interface UserProfile {
	name: string;
	email: string;
	photo: string;
}

export function getCurrentMonthSheetName(): string {
	return new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });
}

export function getPreviousMonthName(currentMonthName: string): string {
	const [month, year] = currentMonthName.split(" ");
	const months = [
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember"
	];
	let monthIdx = months.indexOf(month);
	let prevYear = parseInt(year, 10);

	if (monthIdx === 0) {
		monthIdx = 11;
		prevYear -= 1;
	} else {
		monthIdx -= 1;
	}

	return `${months[monthIdx]} ${prevYear}`;
}

export function formatCurrency(val: number): string {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0
	})
		.format(val)
		.replace("Rp", "Rp ");
}

export function cleanNumber(val: any): number {
	if (typeof val === "number") return Math.abs(val);
	if (!val) return 0;
	const cleaned = val
		.toString()
		.replace(/Rp/g, "")
		.replace(/\s/g, "")
		.replace(/\./g, "")
		.replace(/,/g, ".");

	const tokens = cleaned.match(/(\d+(?:\.\d+)?|[+-])/g);
	if (!tokens) return 0;

	let result = 0;
	let currentOp = "+";

	for (const token of tokens) {
		if (token === "+" || token === "-") {
			currentOp = token;
		} else {
			const num = parseFloat(token) || 0;
			if (currentOp === "+") {
				result += num;
			} else if (currentOp === "-") {
				result -= num;
			}
		}
	}
	return Math.abs(result);
}

// Drive and Sheets API helper calls

export async function fetchDriveFolder(name: string, token: string): Promise<string | null> {
	const folderSearchRes = await fetch(
		`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
			name
		)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!folderSearchRes.ok) {
		throw new Error(`Drive folder search failed: HTTP ${folderSearchRes.status}`);
	}
	const folderSearchData = await folderSearchRes.json();
	return folderSearchData.files?.[0]?.id || null;
}

export async function createDriveFolder(name: string, token: string): Promise<string> {
	const folderCreateRes = await fetch("https://www.googleapis.com/drive/v3/files", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			name,
			mimeType: "application/vnd.google-apps.folder"
		})
	});
	if (!folderCreateRes.ok) {
		throw new Error(`Folder creation failed: HTTP ${folderCreateRes.status}`);
	}
	const folderData = await folderCreateRes.json();
	return folderData.id;
}

export async function fetchDriveSpreadsheet(
	name: string,
	folderId: string,
	token: string
): Promise<string | null> {
	const searchRes = await fetch(
		`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
			name
		)}' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!searchRes.ok) {
		throw new Error(`Drive spreadsheet search failed: HTTP ${searchRes.status}`);
	}
	const searchData = await searchRes.json();
	return searchData.files?.[0]?.id || null;
}

export async function createDriveSpreadsheet(
	name: string,
	folderId: string,
	token: string
): Promise<string> {
	const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			name,
			mimeType: "application/vnd.google-apps.spreadsheet",
			parents: [folderId]
		})
	});
	if (!createRes.ok) {
		throw new Error(`Spreadsheet creation failed: HTTP ${createRes.status}`);
	}
	const createData = await createRes.json();
	return createData.id;
}

export async function fetchUserProfile(token: string): Promise<UserProfile> {
	const aboutRes = await fetch(
		"https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)",
		{
			headers: { Authorization: `Bearer ${token}` }
		}
	);
	if (!aboutRes.ok) {
		throw new Error(`Profile fetch failed: HTTP ${aboutRes.status}`);
	}
	const aboutData = await aboutRes.json();
	if (!aboutData.user) {
		throw new Error("User data missing in Google profile response");
	}
	return {
		name: aboutData.user.displayName || "Google User",
		email: aboutData.user.emailAddress || "",
		photo: aboutData.user.photoLink || ""
	};
}

export interface SheetInitResult {
	sheetId: number;
	availableMonths: string[];
}

export async function ensureAndGetSheetId(
	spreadsheetId: string,
	sheetName: string,
	token: string,
	onAuthError: () => void
): Promise<SheetInitResult> {
	let metadataRes = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	let metadata = await metadataRes.json();
	if (metadataRes.status === 401 || metadata.error?.code === 401) {
		onAuthError();
		throw new Error("UNAUTHORIZED");
	}

	const availableMonths = metadata.sheets?.map((s: any) => s.properties?.title).filter(Boolean) || [];
	let existingSheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName);
	let targetSheetId: number;

	if (!existingSheet) {
		const createRes = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					requests: [{ addSheet: { properties: { title: sheetName } } }]
				})
			}
		);
		const createData = await createRes.json();

		if (!createRes.ok || createData.error) {
			// Fallback check
			const fallbackRes = await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const fallbackMeta = await fallbackRes.json();
			const actuallyExists = fallbackMeta.sheets?.find((s: any) => s.properties?.title === sheetName);
			if (actuallyExists) {
				const updatedMonths = fallbackMeta.sheets?.map((s: any) => s.properties?.title).filter(Boolean) || [];
				return { sheetId: actuallyExists.properties.sheetId, availableMonths: updatedMonths };
			}
			throw new Error("Unable to create sheet tab: " + (createData.error?.message || "Unknown error"));
		}

		targetSheetId = createData.replies[0].addSheet.properties.sheetId;
		if (!availableMonths.includes(sheetName)) {
			availableMonths.push(sheetName);
		}
	} else {
		targetSheetId = existingSheet.properties.sheetId;
	}

	// Delete default Sheet1 if there are multiple sheets
	const sheet1 = metadata.sheets?.find((s: any) => s.properties?.title === "Sheet1");
	if (sheet1 && metadata.sheets.length > 1) {
		try {
			await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }]
				})
			});
		} catch (e) {
			// Ignore
		}
	}

	return { sheetId: targetSheetId, availableMonths };
}

export async function initializeSheetFormatting(
	spreadsheetId: string,
	token: string,
	sheetName: string,
	internalSheetId: number,
	customFields: CustomFieldDef[]
): Promise<void> {
	const allHeaders = [...CORE_HEADERS_DUAL, ...customFields.map((f) => f.name)];
	const lastColLetter = String.fromCharCode(65 + allHeaders.length - 1);

	const writeHeadersRes = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
			sheetName
		)}!A1:${lastColLetter}1?valueInputOption=RAW`,
		{
			method: "PUT",
			headers: { Authorization: `Bearer ${token}` },
			body: JSON.stringify({ values: [allHeaders] })
		}
	);
	if (!writeHeadersRes.ok) {
		throw new Error(`Failed to write headers: HTTP ${writeHeadersRes.status}`);
	}

	const formatRes = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				requests: [
					{
						updateDimensionProperties: {
							range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
							properties: { pixelSize: 200 },
							fields: "pixelSize"
						}
					},
					{
						updateDimensionProperties: {
							range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
							properties: { pixelSize: 280 },
							fields: "pixelSize"
						}
					},
					{
						updateDimensionProperties: {
							range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 2, endIndex: 3 },
							properties: { pixelSize: 140 },
							fields: "pixelSize"
						}
					},
					{
						updateDimensionProperties: {
							range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 3, endIndex: 4 },
							properties: { pixelSize: 160 },
							fields: "pixelSize"
						}
					},
					{
						updateDimensionProperties: {
							range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 4, endIndex: 5 },
							properties: { pixelSize: 200 },
							fields: "pixelSize"
						}
					},
					{
						updateDimensionProperties: {
							range: { sheetId: internalSheetId, dimension: "COLUMNS", startIndex: 5, endIndex: 6 },
							properties: { pixelSize: 400 },
							fields: "pixelSize"
						}
					},
					{
						addConditionalFormatRule: {
							rule: {
								ranges: [
									{
										sheetId: internalSheetId,
										startRowIndex: 1,
										endRowIndex: 1000,
										startColumnIndex: 0,
										endColumnIndex: allHeaders.length
									}
								],
								booleanRule: {
									condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: "=ISODD(ROW())" }] },
									format: { backgroundColor: { red: 0.95, green: 0.98, blue: 0.96 } }
								}
							},
							index: 0
						}
					},
					{
						repeatCell: {
							range: {
								sheetId: internalSheetId,
								startRowIndex: 0,
								endRowIndex: 1,
								startColumnIndex: 0,
								endColumnIndex: allHeaders.length
							},
							cell: {
								userEnteredFormat: {
									backgroundColor: { red: 0.06, green: 0.72, blue: 0.5 },
									textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 10, bold: true },
									horizontalAlignment: "CENTER"
								}
							},
							fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
						}
					},
					{
						updateSheetProperties: {
							properties: { sheetId: internalSheetId, gridProperties: { frozenRowCount: 1 } },
							fields: "gridProperties.frozenRowCount"
						}
					}
				]
			})
		}
	);
	if (!formatRes.ok) {
		throw new Error(`Failed to format sheet dimensions/rules: HTTP ${formatRes.status}`);
	}
}

export async function handleInitialBalanceCarryForward(
	spreadsheetId: string,
	currentMonth: string,
	token: string,
	initialBalanceText: string,
	fromPreviousMonthText: string,
	currentValues?: any[][]
): Promise<boolean> {
	// Check if current month already has an Initial Balance row
	try {
		let values = currentValues;
		if (!values) {
			const currentRes = await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
					currentMonth
				)}!A:H`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const currentData = await currentRes.json();
			if (!currentData.error && currentData.values) {
				values = currentData.values;
			}
		}

		if (values && values.length > 0) {
			const headers = values[0];
			const catIdx = headers.findIndex(
				(h: string) => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")
			);
			if (catIdx !== -1) {
				const hasInitialBalance = values.slice(1).some((row: any) => {
					return row[catIdx] === "Initial Balance";
				});
				if (hasInitialBalance) {
					console.log("Current month already has an Initial Balance. Skipping carry forward.");
					return false;
				}
			}
		}
	} catch (e) {
		console.log("Error checking current month initial balance:", e);
	}

	const prevMonthName = getPreviousMonthName(currentMonth);
	try {
		const res = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
				prevMonthName
			)}!A:H`,
			{ headers: { Authorization: `Bearer ${token}` } }
		);
		const data = await res.json();

		if (!data.error && data.values && data.values.length > 0) {
			const fetchedHeaders = data.values[0];
			const amountIdx = fetchedHeaders.findIndex(
				(h: string) => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount")
			);
			const typeIdx = fetchedHeaders.findIndex(
				(h: string) => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type")
			);

			let totalBalance = 0;
			for (let i = 1; i < data.values.length; i++) {
				const row = data.values[i];
				const rawAmount = cleanNumber(row[amountIdx]);
				const type = row[typeIdx] || "";
				const isExpense =
					type.toLowerCase().includes("expense") ||
					type.toLowerCase().includes("pengeluaran") ||
					type.toLowerCase().includes("out");
				totalBalance += isExpense ? -rawAmount : rawAmount;
			}

			const amountVal = Math.abs(totalBalance).toString();
			const typeVal = totalBalance >= 0 ? "Pemasukan / Income" : "Pengeluaran / Expense";

			const values = [
				new Date().toLocaleString(),
				`${initialBalanceText} (${prevMonthName})`,
				amountVal,
				typeVal,
				"Initial Balance",
				fromPreviousMonthText
			];

			await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
					currentMonth
				)}!A1:append?valueInputOption=USER_ENTERED`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ values: [values] })
				}
			);
			return true;
		}
	} catch (e) {
		console.log("No previous month data found to carry forward:", e);
	}
	return false;
}

export async function cleanupDuplicateInitialBalances(
	spreadsheetId: string,
	sheetName: string,
	token: string,
	currentValues?: any[][],
	internalSheetId?: number
): Promise<boolean> {
	try {
		let values = currentValues;
		if (!values) {
			const res = await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
					sheetName
				)}!A:H`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const data = await res.json();
			if (data.error || !data.values) return false;
			values = data.values;
		}

		if (!values || values.length <= 1) return false;

		const fetchedHeaders = values[0];
		const catIdx = fetchedHeaders.findIndex(
			(h: string) => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")
		);
		if (catIdx === -1) return false;

		// 2. Identify indices of "Initial Balance" rows
		const initialBalanceIndices: number[] = [];
		for (let i = 1; i < values.length; i++) {
			const row = values[i];
			if (row[catIdx] === "Initial Balance") {
				initialBalanceIndices.push(i);
			}
		}

		// If there are duplicates, delete everything except the first one
		if (initialBalanceIndices.length > 1) {
			const indicesToDelete = initialBalanceIndices.slice(1).sort((a, b) => b - a);

			let targetSheetId = internalSheetId;
			if (targetSheetId === undefined) {
				// Get the internal sheet ID
				const metadataRes = await fetch(
					`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
					{ headers: { Authorization: `Bearer ${token}` } }
				);
				const metadata = await metadataRes.json();
				const sheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName);
				if (!sheet) return false;
				targetSheetId = sheet.properties.sheetId;
			}

			// Prepare batchUpdate requests
			const requests = indicesToDelete.map((idx) => ({
				deleteDimension: {
					range: {
						sheetId: targetSheetId,
						dimension: "ROWS",
						startIndex: idx,
						endIndex: idx + 1
					}
				}
			}));

			const batchRes = await fetch(
				`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ requests })
				}
			);
			if (!batchRes.ok) {
				console.error("Failed to delete duplicate initial balances:", await batchRes.text());
				return false;
			} else {
				console.log(`Successfully deleted ${requests.length} duplicate initial balance rows.`);
				return true;
			}
		}
		return false;
	} catch (error) {
		console.error("Error during cleanup of duplicate initial balances:", error);
		return false;
	}
}

export async function appendRowToSheet(
	spreadsheetId: string,
	sheetName: string,
	token: string,
	values: string[]
): Promise<void> {
	const res = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
			sheetName
		)}!A1:append?valueInputOption=USER_ENTERED`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ values: [values] })
		}
	);
	if (!res.ok) {
		throw new Error(`Failed to append transaction row: HTTP ${res.status}`);
	}
}

export async function deleteSheetColumn(
	spreadsheetId: string,
	token: string,
	internalSheetId: number,
	colIndex: number
): Promise<void> {
	const res = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				requests: [
					{
						deleteDimension: {
							range: {
								sheetId: internalSheetId,
								dimension: "COLUMNS",
								startIndex: colIndex,
								endIndex: colIndex + 1
							}
						}
					}
				]
			})
		}
	);
	if (!res.ok) {
		throw new Error(`Failed to delete column at index ${colIndex}: HTTP ${res.status}`);
	}
}

export async function syncPreviousBalanceInSheets(
	spreadsheetId: string,
	selectedMonth: string,
	token: string,
	initialBalanceText: string,
	fromPreviousMonthText: string
): Promise<void> {
	const prevMonthName = getPreviousMonthName(selectedMonth);
	const res = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
			prevMonthName
		)}!A:H`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const data = await res.json();
	
	if (data.error || !data.values || data.values.length <= 1) {
		throw new Error("Tidak ditemukan data transaksi di bulan sebelumnya.");
	}
	
	const fetchedHeaders = data.values[0];
	const amountIdx = fetchedHeaders.findIndex(
		(h: string) => h.toLowerCase().includes("jumlah") || h.toLowerCase().includes("amount")
	);
	const typeIdx = fetchedHeaders.findIndex(
		(h: string) => h.toLowerCase().includes("tipe") || h.toLowerCase().includes("type")
	);
	
	let totalBalance = 0;
	for (let i = 1; i < data.values.length; i++) {
		const row = data.values[i];
		const rawAmount = cleanNumber(row[amountIdx]);
		const type = row[typeIdx] || "";
		const isExpense =
			type.toLowerCase().includes("expense") ||
			type.toLowerCase().includes("pengeluaran") ||
			type.toLowerCase().includes("out");
		totalBalance += isExpense ? -rawAmount : rawAmount;
	}
	
	const amountVal = Math.abs(totalBalance).toString();
	const typeVal = totalBalance >= 0 ? "Pemasukan / Income" : "Pengeluaran / Expense";
	
	const values = [
		new Date().toLocaleString(),
		`${initialBalanceText} (${prevMonthName})`,
		amountVal,
		typeVal,
		"Initial Balance",
		fromPreviousMonthText
	];
	
	// Check if there is an existing Initial Balance row in the current sheet
	const currentRes = await fetch(
		`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
			selectedMonth
		)}!A:H`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	const currentData = await currentRes.json();
	
	let existingRowIndex = -1; // 1-based row number
	if (!currentData.error && currentData.values && currentData.values.length > 0) {
		const headers = currentData.values[0];
		const catIdx = headers.findIndex(
			(h: string) => h.toLowerCase().includes("kategori") || h.toLowerCase().includes("category")
		);
		if (catIdx !== -1) {
			for (let i = 1; i < currentData.values.length; i++) {
				if (currentData.values[i][catIdx] === "Initial Balance") {
					existingRowIndex = i + 1; // 1-based index in the sheet
					break;
				}
			}
		}
	}

	if (existingRowIndex !== -1) {
		const lastColLetter = String.fromCharCode(65 + values.length - 1);
		const updateRes = await fetch(
			`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
				selectedMonth
			)}!A${existingRowIndex}:${lastColLetter}${existingRowIndex}?valueInputOption=USER_ENTERED`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ values: [values] })
			}
		);
		if (!updateRes.ok) {
			throw new Error(`Failed to update existing initial balance: HTTP ${updateRes.status}`);
		}
	} else {
		await appendRowToSheet(spreadsheetId, selectedMonth, token, values);
	}
}

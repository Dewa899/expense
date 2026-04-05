"use client";

import React, { createContext, useContext, useState } from "react";

type Language = "en" | "id";

type Dictionary = {
	[key: string]: {
		en: string;
		id: string;
	};
};

const dictionary: Dictionary = {
	// Vision
	vision: { en: "Your Expenses, Your Rules.", id: "Pengeluaran Anda, Aturan Anda." },
	
	// Tutorial General
	skip: { en: "Skip", id: "Lewati" },
	next: { en: "Next", id: "Lanjut" },
	prev: { en: "Previous", id: "Kembali" },
	finish: { en: "Got it!", id: "Mengerti!" },
	chooseLanguage: { en: "Choose Language", id: "Pilih Bahasa" },
	
	// Tutorial Steps
	step1Title: { en: "Welcome to Expense", id: "Selamat Datang di Expense" },
	step1Desc: { 
		en: "The minimalist expense manager that lives in your Google Sheets. You own your data, we just provide the interface.",
		id: "Manajer pengeluaran minimalis yang hidup di Google Sheets Anda. Anda pemilik data Anda, kami hanya menyediakan antarmukanya."
	},
	step2Title: { en: "Cloud Synchronization", id: "Sinkronisasi Cloud" },
	step2Desc: { 
		en: "Connect your Google account. We will automatically add a spreadsheet based on our template to your Google Drive.",
		id: "Hubungkan akun Google Anda. Kami akan otomatis menambahkan spreadsheet sesuai template ke Google Drive Anda."
	},
	step3Title: { en: "Quick & Smart Input", id: "Input Cepat & Cerdas" },
	step3Desc: { 
		en: "Add data quickly. Your transactions can be read and added exactly as you wish.",
		id: "Tambah data dengan cepat. Data yang ditambahkan dapat dibaca dan ditambahkan sesuai dengan keinginan kalian."
	},
	step4Title: { en: "Custom Columns", id: "Kolom Kustom" },
	step4Desc: { 
		en: "Need to track Location or Payment Method? Use 'Manage Fields' to add up to 2 extra columns (Text or Dropdown).",
		id: "Perlu mencatat Lokasi atau Metode Pembayaran? Gunakan 'Kelola Kolom' untuk menambah hingga 2 kolom ekstra (Teks atau Pilihan)."
	},
	step5Title: { en: "Visual Insights", id: "Visualisasi Data" },
	step5Desc: { 
		en: "Switch to 'View Details' to see trends, category breakdowns, and even add your own custom charts based on your fields.",
		id: "Pindah ke 'Lihat Detail' untuk melihat tren, pembagian kategori, dan bahkan menambah grafik kustom Anda sendiri."
	},
	step6Title: { en: "Limited Testing Access", id: "Akses Testing Terbatas" },
	step6Desc: {
		en: "During our testing phase, only approved emails can sync with Google Sheets. Please provide your email below to request access.",
		id: "Selama fase testing, hanya email yang disetujui yang dapat sinkron dengan Google Sheets. Silakan masukkan email Anda di bawah untuk meminta akses."
	},

	// Common UI
	heroTitle: { en: "Your Expenses, Your Rules.", id: "Pengeluaran Anda, Aturan Anda." },
	heroSubtitle: { en: "The minimalist expense manager that adapts to your Google Sheets structure.", id: "Manajer pengeluaran minimalis yang menyesuaikan dengan struktur Google Sheets Anda." },
	getStarted: { en: "Get Started", id: "Mulai Sekarang" },
	connectSheets: { en: "Connect Google Sheets", id: "Hubungkan Google Sheets" },
	features: { en: "Features", id: "Fitur" },
	integration: { en: "Integration", id: "Integrasi" },
	pricing: { en: "Pricing", id: "Harga" },
	signIn: { en: "Connect to Google", id: "Hubungkan ke Google" },
	name: { en: "Name", id: "Nama" },
	amount: { en: "Amount", id: "Jumlah" },
	category: { en: "Category", id: "Kategori" },
	note: { en: "Note", id: "Catatan" },
	addExpense: { en: "Add Expense", id: "Tambah Pengeluaran" },
	validationError: { en: "Missing Information", id: "Data Belum Lengkap" },
	validationDesc: { en: "Please fill in all fields except Note before submitting.", id: "Silakan isi semua bidang kecuali Catatan sebelum mengirim." },
	successTitle: { en: "Transaction Saved!", id: "Transaksi Tersimpan!" },
	successDesc: { en: "Your expense has been successfully added to Google Sheets.", id: "Pengeluaran Anda telah berhasil ditambahkan ke Google Sheets." },
	close: { en: "Close", id: "Tutup" },
	ocrComingSoon: { en: "OCR Receipt (Coming Soon)", id: "OCR Struk (Segera Hadir)" },
	integrationTitle: { en: "Google Sheets Sync", id: "Sinkronisasi Google Sheets" },
	integrationDesc: { en: "Securely connect your private Google Sheet for real-time expense tracking.", id: "Hubungkan Google Sheet pribadi Anda secara aman untuk pencatatan real-time." },
	googleSyncTitle: { en: "One-Click Google Sync", id: "Sinkronisasi Google Sekali Klik" },
	googleSyncDesc: { en: "Connect your Google account to automatically create and sync expenses to a private Google Sheet.", id: "Hubungkan akun Google Anda untuk membuat dan sinkronisasi pengeluaran ke Google Sheet pribadi secara otomatis." },
	googleSyncBtn: { en: "Continue with Google", id: "Lanjutkan dengan Google" },
	googleSyncActive: { en: "Connected to Google Sheets", id: "Terhubung ke Google Sheets" },
	googleSyncDisconnect: { en: "Disconnect Account", id: "Putuskan Akun" },
	disconnectWarningTitle: { en: "Disconnect Account?", id: "Putuskan Akun?" },
	disconnectWarningDesc: { en: "Your custom field settings (types and options) will be removed from this browser. However, your data and columns will remain safe in your Google Sheets.", id: "Konfigurasi kolom kustom Anda (tipe dan pilihan) akan dihapus dari browser ini. Namun, data dan kolom Anda akan tetap aman di Google Sheets Anda." },
	disconnectConfirm: { en: "Disconnect Now", id: "Putuskan Sekarang" },
	googleSyncPrivacy: { en: "We only request access to create and edit the specific 'Expense Tracker' sheet in your Drive.", id: "Kami hanya meminta akses untuk membuat dan mengedit file 'Expense Tracker' spesifik di Drive Anda." },
	syncGeneralPrompt: { 
		en: "Unlock full potential! Connect your Google account to start tracking and managing your finances better.", 
		id: "Buka fitur lengkap! Hubungkan akun Google Anda untuk mulai mencatat dan mengelola keuangan dengan lebih hebat." 
	},
	syncFieldsPrompt: { 
		en: "Personalize your tracker! Sync your account to add custom columns and manage your data structure.", 
		id: "Personalisasi catatan Anda! Hubungkan akun untuk menambah kolom kustom dan mengelola struktur data Anda." 
	},
	syncBalancePrompt: { 
		en: "Get accurate insights! Sync to set your starting balance and track your net worth accurately.", 
		id: "Dapatkan analisis akurat! Hubungkan akun untuk mengatur saldo awal dan pantau kekayaan bersih Anda dengan tepat." 
	},
	quickAdd: { en: "Quick Add", id: "Tambah Cepat" },
	transactionType: { en: "Transaction Type", id: "Tipe Transaksi" },
	income: { en: "Income", id: "Pemasukan" },
	expense: { en: "Expense", id: "Pengeluaran" },
	selectCategory: { en: "Select a category", id: "Pilih kategori" },
	newCategory: { en: "New Category", id: "Kategori Baru" },
	addManualCategory: { en: "Or type manual category...", id: "Atau ketik kategori manual..." },
	manageCategories: { en: "Manage Categories", id: "Kelola Kategori" },
	manageFields: { en: "Manage Fields", id: "Kelola Kolom" },
	isRequired: { en: "Wajib Diisi?", id: "Wajib Diisi?" },
	requiredLabel: { en: "Required", id: "Wajib" },
	optionalLabel: { en: "Optional", id: "Opsional" },
	manageOptions: { en: "Manage Options", id: "Kelola Opsi" },
	newOption: { en: "New Option", id: "Opsi Baru" },
	addField: { en: "Add New Field", id: "Tambah Kolom Baru" },
	editField: { en: "Edit Field Name", id: "Ubah Nama Kolom" },
	fieldType: { en: "Field Type", id: "Tipe Kolom" },
	text: { en: "Text", id: "Teks" },
	dropdown: { en: "Dropdown", id: "Pilihan" },
	deleteFieldWarning: { en: "Delete Column?", id: "Hapus Kolom?" },
	deleteFieldDesc: { en: "This will permanently remove the column and ALL data inside it from your Google Sheets. This action cannot be undone.", id: "Ini akan menghapus kolom dan SELURUH data di dalamnya secara permanen dari Google Sheets Anda. Tindakan ini tidak dapat dibatalkan." },
	maxFieldsReached: { en: "Maximum 2 custom fields reached.", id: "Batas maksimal 2 kolom kustom tercapai." },
	add: { en: "Add", id: "Tambah" },
	detailedDashboard: { en: "Detailed Dashboard", id: "Dashboard Detail" },
	selectMonth: { en: "Select Month", id: "Pilih Bulan" },
	addCustomChart: { en: "Add Custom Chart", id: "Tambah Grafik Kustom" },
	customChartLimit: { en: "You can add up to 2 custom charts based on your fields.", id: "Anda dapat menambah hingga 2 grafik kustom berdasarkan kolom Anda." },
	selectField: { en: "Select Field", id: "Pilih Kolom" },
	chartType: { en: "Show data for", id: "Tampilkan data untuk" },
	viewDetail: { en: "View Details", id: "Lihat Detail" },
	incomeTotal: { en: "Total Income", id: "Total Pemasukan" },
	expenseTotal: { en: "Total Expense", id: "Total Pengeluaran" },
	netBalance: { en: "Net Balance", id: "Saldo Bersih" },
	initialBalance: { en: "Initial Balance", id: "Saldo Awal" },
	startingBalance: { en: "Starting Balance", id: "Saldo Awal" },
	endingBalance: { en: "Ending Balance", id: "Saldo Akhir" },
	fromPreviousMonth: { en: "From previous month", id: "Dari bulan sebelumnya" },
	setupInitialBalance: { en: "Setup Initial Balance", id: "Atur Saldo Awal" },
	initialBalanceDesc: { 
		en: "Enter your current total balance to start tracking accurately.", 
		id: "Masukkan total saldo Anda saat ini untuk mulai mencatat dengan akurat." 
	},
	transactionTrend: { en: "Transaction Trend", id: "Tren Transaksi" },
	expenseByCat: { en: "Expense by Category", id: "Pengeluaran per Kategori" },
	back: { en: "Back", id: "Kembali" },
	delete: { en: "Delete", id: "Hapus" },
	ocrTitle: { en: "Receipt Scanning", id: "Scan Struk" },
	ocrDesc: { en: "Coming soon: Instantly capture expenses from receipts using AI-powered OCR technology.", id: "Segera hadir: Catat pengeluaran secara instan dari struk menggunakan teknologi OCR berbasis AI." },
	dynamicTitle: { en: "Dynamic Schema", id: "Skema Dinamis" },
	dynamicDesc: { en: "Adapt to any Google Sheet structure. Define your own categories and columns easily.", id: "Menyesuaikan dengan struktur Google Sheet apa pun. Tentukan kategori dan kolom Anda sendiri dengan mudah." },
	contactSupport: {
		en: "Contact Support",
		id: "Hubungi Support",
	},
	supportTitle: {
		en: "Message Title",
		id: "Judul Pesan",
	},
	supportTitlePlaceholder: {
		en: "What can we help you with?",
		id: "Apa yang bisa kami bantu?",
	},
	supportEmailPlaceholder: {
		en: "Your email for follow-up",
		id: "Email Anda untuk tindak lanjut",
	},
	supportDesc: {
		en: "Describe your issue or request...",
		id: "Jelaskan masalah atau permintaan Anda...",
	},
	supportHelperDesc: {
		en: "Need help or want to request integration access? Let us know and we'll get back to you soon.",
		id: "Butuh bantuan atau ingin minta akses integrasi? Beri tahu kami dan kami akan segera membalas.",
	},
	supportSuccess: {
		en: "Message Sent!",
		id: "Pesan Terkirim!",
	},
	supportSuccessDesc: {
		en: "Thank you! We've received your message and will look into it soon.",
		id: "Terima kasih! Kami telah menerima pesan Anda dan akan segera memeriksanya.",
	},
	sendMessage: {
		en: "Send Message",
		id: "Kirim Pesan",
	},
	supportCategory: { en: "Category", id: "Kategori" },
	supportCatBug: { en: "Report a Bug", id: "Laporkan Bug" },
	supportCatAccess: { en: "Request Integration Access", id: "Minta Akses Integrasi" },
	supportCatOther: { en: "Other Question", id: "Pertanyaan Lain" },
	requestAccess: { en: "Request Access", id: "Minta Akses" },
	emailInputPlaceholder: { en: "yourname@gmail.com", id: "namaanda@gmail.com" },

	sheetsTitle: { en: "Real-time Sync", id: "Sinkronisasi Real-time" },
	sheetsDesc: { en: "Your data stays in your control. Expenses are synced directly to your personal Google Sheets.", id: "Data Anda tetap dalam kendali Anda. Pengeluaran disinkronkan langsung ke Google Sheets pribadi Anda." },
};

type LanguageContextType = {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: (key: keyof typeof dictionary) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguage] = useState<Language>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("lang") as Language;
			return saved === "en" || saved === "id" ? saved : "en";
		}
		return "en";
	});

	const handleSetLanguage = (lang: Language) => {
		setLanguage(lang);
		localStorage.setItem("lang", lang);
	};

	const t = (key: keyof typeof dictionary): string => {
		return dictionary[key]?.[language] || (key as string);
	};

	return (
		<LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (context === undefined) throw new Error("useLanguage must be used within a LanguageProvider");
	return context;
}

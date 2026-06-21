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
	notFoundTitle: {
		en: "Page Not Found",
		id: "Halaman Tidak Ditemukan",
	},
	notFoundDesc: {
		en: "Oops! The page you are looking for does not exist or has been moved.",
		id: "Ups! Halaman yang Anda cari tidak ada atau telah dipindahkan.",
	},
	backToHome: {
		en: "Back to Home",
		id: "Kembali ke Beranda",
	},
	reportBug: {
		en: "Report Bug",
		id: "Laporkan Bug",
	},
	// Vision
	vision: {
		en: "Your Expenses, Your Rules.",
		id: "Pengeluaran Anda, Aturan Anda.",
	},

	// Tutorial General
	skip: { en: "Skip", id: "Lewati" },
	next: { en: "Next", id: "Lanjut" },
	prev: { en: "Previous", id: "Kembali" },
	finish: { en: "Got it!", id: "Mengerti!" },
	chooseLanguage: { en: "Choose Language", id: "Pilih Bahasa" },

	// Tutorial Steps
	step1Title: { en: "Welcome to Expense", id: "Selamat Datang di Expense" },
	step1Desc: {
		en: "The minimalist expense manager that connects directly to your Google Sheets—no account or signup required. Keep complete ownership of your data.",
		id: "Manajer pengeluaran minimalis yang terhubung langsung ke Google Sheets Anda—tanpa perlu membuat akun atau mendaftar. Miliki data Anda sepenuhnya.",
	},
	step2Title: { en: "Cloud Synchronization", id: "Sinkronisasi Cloud" },
	step2Desc: {
		en: "Connect your Google account. We will automatically add a spreadsheet based on our template to your Google Drive.",
		id: "Hubungkan akun Google Anda. Kami akan otomatis menambahkan spreadsheet sesuai template ke Google Drive Anda.",
	},
	step3Title: { en: "Quick & Smart Input", id: "Input Cepat & Cerdas" },
	step3Desc: {
		en: "Add data quickly. Your transactions can be read and added exactly as you wish.",
		id: "Tambah data dengan cepat. Data yang ditambahkan dapat dibaca dan ditambahkan sesuai dengan keinginan kalian.",
	},
	step4Title: { en: "Custom Columns", id: "Kolom Kustom" },
	step4Desc: {
		en: "Need to track Location or Payment Method? Use 'Manage Fields' to add up to 2 extra columns (Text or Dropdown).",
		id: "Perlu mencatat Lokasi atau Metode Pembayaran? Gunakan 'Kelola Kolom' untuk menambah hingga 2 kolom ekstra (Teks atau Pilihan).",
	},
	step5Title: { en: "Visual Insights", id: "Visualisasi Data" },
	step5Desc: {
		en: "Switch to 'View Details' to see trends, category breakdowns, and even add your own custom charts based on your fields.",
		id: "Pindah ke 'Lihat Detail' untuk melihat tren, pembagian kategori, dan bahkan menambah grafik kustom Anda sendiri.",
	},

	// Common UI
	heroTitle: {
		en: "Your Expenses, Your Rules.",
		id: "Pengeluaran Anda, Aturan Anda.",
	},
	heroSubtitle: {
		en: "The minimalist expense manager that adapts to your Google Sheets structure.",
		id: "Manajer pengeluaran minimalis yang menyesuaikan dengan struktur Google Sheets Anda.",
	},
	getStarted: { en: "Get Started", id: "Mulai Sekarang" },
	connectSheets: { en: "Connect Google Sheets", id: "Hubungkan Google Sheets" },
	features: { en: "Features", id: "Fitur" },
	integration: { en: "Integration", id: "Integrasi" },
	pricing: { en: "Pricing", id: "Harga" },
	signIn: { en: "Login", id: "Masuk" },
	name: { en: "Name", id: "Nama" },
	amount: { en: "Amount", id: "Jumlah" },
	category: { en: "Category", id: "Kategori" },
	note: { en: "Note", id: "Catatan" },
	addExpense: { en: "Add Expense", id: "Tambah Pengeluaran" },
	validationError: { en: "Missing Information", id: "Data Belum Lengkap" },
	validationDesc: {
		en: "Please fill in all fields except Note before submitting.",
		id: "Silakan isi semua bidang kecuali Catatan sebelum mengirim.",
	},
	successTitle: { en: "Transaction Saved!", id: "Transaksi Tersimpan!" },
	successDesc: {
		en: "Your expense has been successfully added to Google Sheets.",
		id: "Pengeluaran Anda telah berhasil ditambahkan ke Google Sheets.",
	},
	close: { en: "Close", id: "Tutup" },
	ocrComingSoon: {
		en: "OCR Receipt (Coming Soon)",
		id: "OCR Struk (Segera Hadir)",
	},
	integrationTitle: {
		en: "Google Sheets Sync",
		id: "Sinkronisasi Google Sheets",
	},
	integrationDesc: {
		en: "Securely connect your private Google Sheet for real-time expense tracking.",
		id: "Hubungkan Google Sheet pribadi Anda secara aman untuk pencatatan real-time.",
	},
	googleSyncTitle: {
		en: "One-Click Google Sync",
		id: "Sinkronisasi Google Sekali Klik",
	},
	googleSyncDesc: {
		en: "Connect your Google account to automatically create and sync expenses to a private Google Sheet.",
		id: "Hubungkan akun Google Anda untuk membuat dan sinkronisasi pengeluaran ke Google Sheet pribadi secara otomatis.",
	},
	googleSyncBtn: { en: "Continue with Google", id: "Lanjutkan dengan Google" },
	googleSyncActive: {
		en: "Connected to Google Sheets",
		id: "Terhubung ke Google Sheets",
	},
	googleSyncDisconnect: { en: "Disconnect Account", id: "Putuskan Akun" },
	syncSuccessTitle: { en: "Sync Successful", id: "Sinkronisasi Berhasil" },
	syncSuccessDesc: {
		en: "Your account is now fully integrated with Google Sheets.",
		id: "Akun Anda sekarang telah terintegrasi sepenuhnya dengan Google Sheets.",
	},
	sessionExpiredTitle: {
		en: "Session Expired",
		id: "Sesi Berakhir",
	},
	sessionExpiredDesc: {
		en: "Your Google authentication token has expired. Please sync again.",
		id: "Token autentikasi Google Anda telah kadaluarsa. Silakan lakukan sinkronisasi ulang.",
	},
	syncWithGoogle: {
		en: "Sync with Google",
		id: "Sinkronisasi dengan Google",
	},
	chooseOtherAccount: {
		en: "Choose another Google account",
		id: "Pilih akun Google lain",
	},
	integrationWaitDesc: {
		en: "Please wait while we set up your personalized Expense Tracker in your Google Drive.",
		id: "Mohon tunggu sementara kami menyiapkan Expense Tracker pribadi Anda di Google Drive Anda.",
	},
	disconnectWarningTitle: { en: "Disconnect Account?", id: "Putuskan Akun?" },
	disconnectWarningDesc: {
		en: "Your custom field settings (types and options) will be removed from this browser. However, your data and columns will remain safe in your Google Sheets.",
		id: "Konfigurasi kolom kustom Anda (tipe dan pilihan) akan dihapus dari browser ini. Namun, data dan kolom Anda akan tetap aman di Google Sheets Anda.",
	},
	disconnectConfirm: { en: "Disconnect Now", id: "Putuskan Sekarang" },
	googleSyncPrivacy: {
		en: "We only request access to create and edit the specific 'Expense Tracker' sheet in your Drive.",
		id: "Kami hanya meminta akses untuk membuat dan mengedit file 'Expense Tracker' spesifik di Drive Anda.",
	},
	syncGeneralPrompt: {
		en: "Unlock full potential! Connect your Google account to start tracking and managing your finances better.",
		id: "Buka fitur lengkap! Hubungkan akun Google Anda untuk mulai mencatat dan mengelola keuangan dengan lebih hebat.",
	},
	syncFieldsPrompt: {
		en: "Personalize your tracker! Sync your account to add custom columns and manage your data structure.",
		id: "Personalisasi catatan Anda! Hubungkan akun untuk menambah kolom kustom dan mengelola struktur data Anda.",
	},
	syncBalancePrompt: {
		en: "Get accurate insights! Sync to set your starting balance and track your net worth accurately.",
		id: "Dapatkan analisis akurat! Hubungkan akun untuk mengatur saldo awal dan pantau kekayaan bersih Anda dengan tepat.",
	},
	quickAdd: { en: "Quick Add", id: "Tambah Cepat" },
	transactionType: { en: "Transaction Type", id: "Tipe Transaksi" },
	income: { en: "Income", id: "Pemasukan" },
	expense: { en: "Expense", id: "Pengeluaran" },
	selectCategory: { en: "Select a category", id: "Pilih kategori" },
	newCategory: { en: "New Category", id: "Kategori Baru" },
	addManualCategory: {
		en: "Or type manual category...",
		id: "Atau ketik kategori manual...",
	},
	manageCategories: { en: "Manage Categories", id: "Kelola Kategori" },
	manageFields: { en: "Manage Fields", id: "Kelola Field" },
	isRequired: { en: "Wajib Diisi?", id: "Wajib Diisi?" },
	requiredLabel: { en: "Required", id: "Wajib" },
	optionalLabel: { en: "Optional", id: "Opsional" },
	manageOptions: { en: "Manage Options", id: "Kelola Opsi" },
	newOption: { en: "New Option", id: "Opsi Baru" },
	addField: { en: "Add New Field", id: "Tambah Field Baru" },
	editField: { en: "Edit Field Name", id: "Ubah Nama Field" },
	fieldType: { en: "Field Type", id: "Tipe Field" },
	text: { en: "Text", id: "Teks" },
	dropdown: { en: "Dropdown", id: "Pilihan" },
	deleteFieldWarning: { en: "Delete Field?", id: "Hapus Field?" },
	deleteFieldDesc: {
		en: "This will permanently remove the field and ALL data inside it from your Google Sheets. This action cannot be undone.",
		id: "Ini akan menghapus field dan SELURUH data di dalamnya secara permanen dari Google Sheets Anda. Tindakan ini tidak dapat dibatalkan.",
	},
	maxFieldsReached: {
		en: "Maximum 2 custom fields reached.",
		id: "Batas maksimal 2 field kustom tercapai.",
	},
	add: { en: "Add", id: "Tambah" },
	detailedDashboard: { en: "Detailed Dashboard", id: "Dashboard Detail" },
	selectMonth: { en: "Select Month", id: "Pilih Bulan" },
	addCustomChart: { en: "Add Custom Chart", id: "Tambah Grafik Kustom" },
	customChartLimit: {
		en: "You can add up to 2 custom charts based on your fields.",
		id: "Anda dapat menambah hingga 2 grafik kustom berdasarkan field Anda.",
	},
	selectField: { en: "Select Field", id: "Pilih Field" },
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
		id: "Masukkan total saldo Anda saat ini untuk mulai mencatat dengan akurat.",
	},
	transactionTrend: { en: "Transaction Trend", id: "Tren Transaksi" },
	expenseByCat: { en: "Expense by Category", id: "Pengeluaran per Kategori" },
	noDataFound: {
		en: "No data found for this month",
		id: "Data tidak ditemukan untuk bulan ini",
	},
	back: { en: "Back", id: "Kembali" },
	delete: { en: "Delete", id: "Hapus" },
	ocrTitle: { en: "Receipt Scanning", id: "Scan Struk" },
	ocrDesc: {
		en: "Coming soon: Instantly capture expenses from receipts using AI-powered OCR technology.",
		id: "Segera hadir: Catat pengeluaran secara instan dari struk menggunakan teknologi OCR berbasis AI.",
	},
	dynamicTitle: { en: "Dynamic Schema", id: "Skema Dinamis" },
	dynamicDesc: {
		en: "Adapt to any Google Sheet structure. Define your own categories and columns easily.",
		id: "Menyesuaikan dengan struktur Google Sheet apa pun. Tentukan kategori dan kolom Anda sendiri dengan mudah.",
	},
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
		en: "Need help? Let us know and we'll get back to you soon.",
		id: "Butuh bantuan? Beri tahu kami dan kami akan segera membalas.",
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
	supportCatOther: { en: "Other Question", id: "Pertanyaan Lain" },

	sheetsTitle: { en: "Real-time Sync", id: "Sinkronisasi Real-time" },
	sheetsDesc: {
		en: "Your data stays in your control. Expenses are synced directly to your personal Google Sheets.",
		id: "Data Anda tetap dalam kendali Anda. Pengeluaran disinkronkan langsung ke Google Sheets pribadi Anda.",
	},

	// Privacy Policy
	privacyTitle: { en: "Privacy Policy", id: "Kebijakan Privasi" },
	lastUpdated: { en: "Last updated", id: "Terakhir diperbarui" },
	introTitle: { en: "Introduction", id: "Pendahuluan" },
	introDesc: {
		en: "Welcome to Expense by GENLORD. Your privacy is our top priority. This app is designed as a client-side interface that connects directly to your personal Google Sheets. We do not own your data; you do.",
		id: "Selamat datang di Expense by GENLORD. Privasi Anda adalah prioritas utama kami. Aplikasi ini dirancang sebagai antarmuka sisi klien yang terhubung langsung ke Google Sheets pribadi Anda. Kami tidak memiliki data Anda; Anda yang memilikinya.",
	},
	infoTitle: { en: "Information We Access", id: "Informasi yang Kami Akses" },
	infoDesc: {
		en: "To provide our service, we request access to your Google Account via the following scopes:",
		id: "Untuk menyediakan layanan kami, kami meminta akses ke Akun Google Anda melalui scope berikut:",
	},
	scopeSheets: {
		en: "Google Sheets API: To create, read, and update the specific 'Expense Tracker' spreadsheet in your account.",
		id: "Google Sheets API: Untuk membuat, membaca, dan memperbarui spreadsheet 'Expense Tracker' spesifik di akun Anda.",
	},
	scopeDrive: {
		en: "Google Drive (file-specific) API: To search for and identify the 'Expense Tracker' file so you can resume tracking across sessions.",
		id: "Google Drive (file-specific) API: Untuk mencari dan mengidentifikasi file 'Expense Tracker' sehingga Anda dapat melanjutkan pelacakan antar sesi.",
	},
	usageTitle: {
		en: "How We Use Your Data",
		id: "Bagaimana Kami Menggunakan Data Anda",
	},
	usageDesc1: {
		en: "All your financial data is stored exclusively in your personal Google Sheets. Expense by GENLORD does not have a central database to store your personal transactions. The processing of your data happens locally in your browser.",
		id: "Semua data keuangan Anda disimpan secara eksklusif di Google Sheets pribadi Anda. Expense by GENLORD tidak memiliki database pusat untuk menyimpan transaksi pribadi Anda. Pemrosesan data Anda terjadi secara lokal di browser Anda.",
	},
	usagePoint1: {
		en: "We do not sell your personal information.",
		id: "Kami tidak menjual informasi pribadi Anda.",
	},
	usagePoint2: {
		en: "We do not use your data for advertising purposes.",
		id: "Kami tidak menggunakan data Anda untuk tujuan periklanan.",
	},
	usagePoint3: {
		en: "We do not share your data with third parties.",
		id: "Kami tidak membagikan data Anda dengan pihak ketiga.",
	},
	securityTitle: { en: "Security", id: "Keamanan" },
	securityDesc: {
		en: "We use industry-standard OAuth 2.0 to authenticate with Google. Your access token is stored locally in your browser's localStorage and is never sent to our servers.",
		id: "Kami menggunakan standar industri OAuth 2.0 untuk autentikasi dengan Google. Token akses Anda disimpan secara lokal di localStorage browser Anda dan tidak pernah dikirim ke server kami.",
	},
	contactTitle: { en: "Contact Us", id: "Hubungi Kami" },
	contactDesc: {
		en: "If you have any questions about this Privacy Policy, please contact us via our support modal:",
		id: "Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami melalui modal bantuan kami:",
	},
	openSupport: { en: "Get Support", id: "Dapatkan Bantuan" },

	// Demo Mode
	tryDemo: { en: "Try demo", id: "Coba demo" },
	demoModeBanner: {
		en: "Demo mode – data will not be saved.",
		id: "Mode demo – data tidak akan disimpan.",
	},
	exitDemo: { en: "Exit Demo", id: "Keluar Demo" },

	// Amount Field
	amountPlaceholder: { en: "0", id: "0" },
	amountLabel: { en: "Amount", id: "Nominal" },
	done: { en: "Done", id: "Selesai" },

	// Patch Notes Modal
	patchNotesTitle: { en: "Patch Notes", id: "Catatan Pembaruan" },
	patchNotesSubtitle: {
		en: "Here's what's new in this release.",
		id: "Inilah yang baru di pembaruan ini.",
	},
	patchFeature1Title: { en: "Silent Re-authentication", id: "Re-autentikasi Senyap" },
	patchFeature1Desc: {
		en: "The app now automatically re-connects your Google account on every load. No repeated sign-ins.",
		id: "Aplikasi kini otomatis terhubung kembali ke akun Google saat dibuka. Tidak perlu login berulang.",
	},
	patchFeature2Title: { en: "Mobile Numeric Keyboard", id: "Keyboard Angka Mobile" },
	patchFeature2Desc: {
		en: "On mobile, a custom numeric pad slides up with Rupiah formatting and quick-add chips.",
		id: "Di mobile, papan angka kustom muncul dengan format Rupiah dan chip tambah cepat.",
	},
	patchFeature3Title: { en: "Rupiah Amount Formatting", id: "Format Nominal Rupiah" },
	patchFeature3Desc: {
		en: "The amount field now shows 'Rp 0' placeholder and formats thousands live as you type.",
		id: "Kolom nominal kini menampilkan placeholder 'Rp 0' dan memformat ribuan secara langsung.",
	},
	patchFeature4Title: { en: "Demo Mode", id: "Mode Demo" },
	patchFeature4Desc: {
		en: "Try the app without a Google account. Sample data is loaded in-memory and cleared on reload.",
		id: "Coba aplikasi tanpa akun Google. Data contoh dimuat di memori dan dihapus saat refresh.",
	},
	patchFeature5Title: { en: "Patch Notes Modal", id: "Modal Catatan Pembaruan" },
	patchFeature5Desc: {
		en: "A changelog modal (this one!) now lives in the header so you never miss an update.",
		id: "Modal perubahan versi (ini!) kini ada di header agar Anda tidak ketinggalan pembaruan.",
	},
	patchFeature6Title: { en: "Enter Key Shortcut", id: "Pintasan Tombol Enter" },
	patchFeature6Desc: {
		en: "Press Enter while filling the form to submit it instantly – no need to click the button.",
		id: "Tekan Enter saat mengisi formulir untuk langsung menyimpan – tidak perlu klik tombol.",
	},
	profileAndAccount: {
		en: "Profile & Account",
		id: "Profil & Akun",
	},
	addToHomepage: {
		en: "Add to Homepage",
		id: "Tambah ke Layar Utama",
	},
	addToHomeDesc: {
		en: "Add this app to your home screen for faster and easier access.",
		id: "Tambahkan aplikasi ini ke layar utama Anda untuk akses yang lebih cepat dan mudah.",
	},
	safariInstructions: {
		en: "iOS (Safari):\n1. Tap the Share button at the bottom.\n2. Scroll down and choose 'Add to Home Screen'.",
		id: "iOS (Safari):\n1. Ketuk tombol Bagikan (ikon Share) di bagian bawah.\n2. Gulir ke bawah lalu pilih 'Tambah ke Layar Utama'.",
	},
	chromeInstructions: {
		en: "Android (Chrome):\n1. Tap the Menu button (3 dots) in the top-right.\n2. Choose 'Add to Home screen' or 'Install app'.",
		id: "Android (Chrome):\n1. Ketuk tombol Menu (titik 3) di kanan atas.\n2. Pilih 'Tambahkan ke Layar utama' atau 'Instal aplikasi'.",
	},
	desktopInstructions: {
		en: "Desktop (Chrome / Edge):\n1. Click the Install icon in the browser address bar (right side), or\n2. Open browser menu and select 'Save and share' -> 'Install page as app'.",
		id: "Desktop (Chrome / Edge):\n1. Klik ikon Instal di bilah alamat browser (sisi kanan), atau\n2. Buka menu browser lalu pilih 'Simpan dan bagikan' -> 'Instal halaman sebagai aplikasi'.",
	},
	installApp: {
		en: "Install Standalone App",
		id: "Instal Aplikasi Mandiri",
	},
	addToHomeTitle: {
		en: "Install / Add to Home Screen",
		id: "Instal / Tambah ke Layar Utama",
	},
	stepAddToHomeTitle: {
		en: "Access From Home Screen",
		id: "Akses Dari Layar Utama",
	},
	stepAddToHomeDesc: {
		en: "Add Expense to your home screen for faster and easier access.",
		id: "Tambahkan Expense ke layar utama Anda untuk akses yang lebih cepat dan mudah.",
	},
	iosShortInstruction: {
		en: "For iOS devices, please tap the Share button (sharing icon) in Safari, then select 'Add to Home Screen'.",
		id: "Untuk perangkat iOS, silakan ketuk tombol Bagikan (ikon Share) di Safari, lalu pilih 'Tambah ke Layar Utama'.",
	},
	installSuccess: {
		en: "App installation launched!",
		id: "Instalasi aplikasi dimulai!",
	},
};

type LanguageContextType = {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: (key: keyof typeof dictionary) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
	undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [language, setLanguage] = useState<Language>("en");
	const [mounted, setMounted] = React.useState(false);

	// Sync with localStorage on mount
	React.useEffect(() => {
		const saved = localStorage.getItem("lang") as Language;
		if (saved === "en" || saved === "id") {
			setLanguage(saved);
		}
		setMounted(true);
	}, []);

	const handleSetLanguage = (lang: Language) => {
		setLanguage(lang);
		localStorage.setItem("lang", lang);
	};

	const t = (key: keyof typeof dictionary): string => {
		return dictionary[key]?.[language] || (key as string);
	};

	// To avoid hydration flicker/mismatch, we can return a placeholder
	// or ensure the first render matches server.
	// Using mounted check for the provider's logic if needed.

	return (
		<LanguageContext.Provider
			value={{ language, setLanguage: handleSetLanguage, t }}
		>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (context === undefined)
		throw new Error("useLanguage must be used within a LanguageProvider");
	return context;
}

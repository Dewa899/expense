"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { Sparkles, Bug, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalScrollArea } from "@/components/ui/modal-scroll-area";

interface PatchNotesModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

interface UpdateDetail {
	type: "feature" | "bugfix" | "improvement";
	title: { en: string; id: string };
	desc: { en: string; id: string };
}

interface UpdateItem {
	version: string;
	type: "major" | "minor" | "bugfix";
	date: { en: string; id: string };
	time: string;
	title: { en: string; id: string };
	description: { en: string; id: string };
	details: UpdateDetail[];
}

const UPDATES: UpdateItem[] = [
	{
		version: "v3.0.3",
		type: "bugfix",
		date: { en: "Thu, Nov 5, 2026", id: "Kamis, 5 November 2026" },
		time: "15:05",
		title: {
			en: "Dynamic Sync Branding, Mobile Cold-Start Optimization & Pocket Allocation Hierarchy",
			id: "Branding Sinkronisasi Dinamis, Optimasi Startup Mobile & Hierarki Alokasi Saku"
		},
		description: {
			en: "Resolved mobile startup lock hangs on cold opens, dynamically customized integration loading screens across Google Account, Email, and Sheets modes, and refined multi-pocket fund allocation & unallocated balance hierarchy.",
			id: "Mengatasi freeze/loading lama pada browser mobile saat pembukaan awal, menyesuaikan layar sinkronisasi secara dinamis sesuai tipe login (Akun Google, Email, dan Sheets), serta menyempurnakan alokasi dana dan hierarki Saldo Utama (Unallocated)."
		},
		details: [
			{
				type: "bugfix",
				title: { en: "Mobile Cold-Start Lock Deferral & Fast Parallel Queries", id: "Pelepasan Lock Startup Mobile & Query Paralel Cepat" },
				desc: { en: "Deferred data fetches outside of Supabase's `onAuthStateChange` lock stack to prevent `navigator.locks` deadlocks on mobile devices, parallelized database fetches, and backgrounded Google export checks for immediate dashboard loading.", id: "Mengalihkan pengambilan data ke luar stack lock `onAuthStateChange` Supabase untuk mencegah deadlock `navigator.locks` di HP, memparalelkan query database, serta menjalankan cek Google Sheets di latar belakang agar dashboard terbuka seketika." }
			},
			{
				type: "improvement",
				title: { en: "Contextual Account Sync Loading Screen", id: "Layar Sinkronisasi Akun Kontekstual" },
				desc: { en: "Integration loading screen now accurately reflects the active login provider (Google Account, regular email account, or direct Google Sheets) with tailored titles and status messages instead of generic Google Drive text.", id: "Layar loading sinkronisasi kini secara cerdas menampilkan status sesuai tipe login (Akun Google, Akun Email, atau Google Sheets langsung) dengan judul dan deskripsi yang tepat tanpa teks Google Drive yang keliru." }
			},
			{
				type: "feature",
				title: { en: "Unallocated Balance Hierarchy & Move Funds Modal", id: "Hierarki Saldo Utama (Unallocated) & Modal Pindah Dana" },
				desc: { en: "Separated Unallocated balance from locked pocket allocations on the main dashboard card, provided dedicated breakdown cards in Detailed Dashboard, and enabled fluid fund transfers between Main Pocket and custom pockets.", id: "Memisahkan Saldo Utama (Unallocated) dari alokasi kantong pada kartu dashboard, menyediakan kartu rincian terpisah di Detailed Dashboard, serta menghadirkan fitur Pindah Dana antar kantong dan dompet utama." }
			}
		]
	},
	{
		version: "v3.0.2",
		type: "bugfix",
		date: { en: "Thu, Nov 5, 2026", id: "Kamis, 5 November 2026" },
		time: "14:02",
		title: {
			en: "Balance Sync Consistency & Carry-Forward Hotfix",
			id: "Konsistensi Sinkronisasi Saldo & Hotfix Carry-Forward"
		},
		description: {
			en: "Resolved balance discrepancies between the Main Dashboard and Detailed Dashboard, fixed chronological carry-forward calculations, and eliminated duplicate Initial Balance entries across both Google/Supabase Account Mode and Direct Google Sheets Mode.",
			id: "Memperbaiki perbedaan total saldo antara Dashboard Utama dan Detailed Dashboard, menyempurnakan perhitungan saldo bawaan (carry-forward) bulan sebelumnya, serta mencegah duplikasi baris Saldo Awal baik di Mode Akun Google/Supabase maupun Google Sheets Langsung."
		},
		details: [
			{
				type: "bugfix",
				title: { en: "Unified Starting & Total Balance Calculation", id: "Penyeragaman Perhitungan Saldo Awal & Total Saldo" },
				desc: { en: "Standardized how Initial Balance and Net Balance are calculated across the main carousel card, pocket selector, and analytics dashboard so both views always show the exact same balance.", id: "Menyeragamkan rumus perhitungan Saldo Awal dan Total Saldo di kartu utama, pemilih kantong, dan halaman detail analitik agar seluruh tampilan selalu menampilkan angka yang identik." }
			},
			{
				type: "bugfix",
				title: { en: "Accurate Monthly Carry-Forward & Auto-Deduplication", id: "Perhitungan Carry-Forward Akurat & Deduplikasi Otomatis" },
				desc: { en: "Fixed an issue where auto carry-forward double-counted earlier months' initial balances, and added automatic cleanup for duplicate Initial Balance records in Supabase and Google Sheets.", id: "Memperbaiki bug di mana carry-forward otomatis menghitung ganda saldo awal bulan-bulan lampau, serta menambahkan pembersihan otomatis untuk baris Saldo Awal ganda di Supabase dan Google Sheets." }
			},
			{
				type: "improvement",
				title: { en: "In-Place Initial Balance Upsert & Mode Isolation", id: "Update Saldo Awal In-Place & Isolasi Mode Login" },
				desc: { en: "Updating starting balance in Direct Google Sheets Mode now updates the existing row in-place instead of appending duplicates, and isolated Supabase vs Direct Sheets sessions to prevent cross-mode data collisions.", id: "Mengubah saldo awal di Mode Google Sheets Langsung kini memperbarui baris yang sudah ada tanpa menambah baris ganda, serta mengisolasi sesi Supabase dan Sheets Langsung agar tidak saling menimpa data." }
			}
		]
	},
	{
		version: "v3.0.1",
		type: "bugfix",
		date: { en: "Wed, Aug 5, 2026", id: "Rabu, 5 Agustus 2026" },
		time: "20:15",
		title: {
			en: "Instant Page Navigation & Ultra-Fast Google Sheets Sync",
			id: "Navigasi Halaman Instan & Sync Google Sheets Super Cepat"
		},
		description: {
			en: "Eliminated recurring loading screens during page transitions using global React Context, parallelized auth checks, and restricted Google Sheets API range queries for 100x faster sync speed.",
			id: "Menghilangkan loading berulang saat navigasi halaman menggunakan React Context global, memparalelkan cek otentikasi, serta membatasi range query Google Sheets API untuk kecepatan sinkronisasi hingga 100x lebih cepat."
		},
		details: [
			{
				type: "improvement",
				title: { en: "Global Dashboard State Context", id: "Context State Dashboard Global" },
				desc: { en: "Persisted dashboard state globally across page transitions so switching between Quick Add and Analytics Detail is instantaneous without triggering reloads.", id: "Mempertahankan state dashboard secara global sehingga navigasi antara Quick Add dan Detail Analytics terjadi secara instan tanpa memicu loading ulang." }
			},
			{
				type: "bugfix",
				title: { en: "Google Sheets Range Bounding & BatchUpdate Optimization", id: "Pembatasan Range Google Sheets & Optimasi BatchUpdate" },
				desc: { en: "Bounded sheet data fetches to `A1:H100` and prevented duplicate conditional formatting rule stacking, dropping API sync latency from 40s to ~300ms.", id: "Membatasi pembacaan data ke `A1:H100` dan mencegah penumpukan aturan format bersyarat berulang, memangkas latensi API dari 40 detik menjadi ~300ms." }
			}
		]
	},
	{
		version: "v3.0.0",
		type: "major",
		date: { en: "Sat, July 11, 2026", id: "Sabtu, 11 Juli 2026" },
		time: "14:30",
		title: {
			en: "Multi-Pocket Budgets, Auto Transactions & Friendly Typography",
			id: "Anggaran Multi-Saku, Transaksi Otomatis & Tipografi Bersahabat"
		},
		description: {
			en: "This major update introduces local envelope/pocket budgeting, automatic transaction scheduling, a premium glassmorphic UI overhaul with modern and friendly rounded typography, and custom dynamic column fields.",
			id: "Pembaruan besar ini memperkenalkan penganggaran saku/amplop lokal, penjadwalan transaksi otomatis, perombakan UI glassmorphism premium dengan tipografi bulat yang modern dan bersahabat, serta kolom kustom dinamis."
		},
		details: [
			{
				type: "feature",
				title: { en: "Multi-Pocket Budgeting", id: "Penganggaran Multi-Saku" },
				desc: { en: "Allocate funds across up to 3 custom pockets (e.g. Savings, Food, Transport) with custom limits and instant wallet transfers, keeping your cash flow isolated.", id: "Alokasikan dana ke hingga 3 saku kustom (misal: Tabungan, Makan, Transport) dengan limit kustom dan transfer dompet instan untuk menjaga arus kas Anda tetap teratur." }
			},
			{
				type: "feature",
				title: { en: "Auto Transactions / Scheduler", id: "Transaksi Otomatis / Penjadwal" },
				desc: { en: "Set up recurring templates that run weekly or monthly, automatically generating log entries into your Google Sheet to save you repeating inputs.", id: "Atur template berulang mingguan atau bulanan yang secara otomatis mencatat data ke Google Sheet Anda tanpa perlu input manual berulang kali." }
			},
			{
				type: "feature",
				title: { en: "Friendly Typographic UI", id: "Tampilan Tipografi Bersahabat" },
				desc: { en: "Switched layout to Fredoka and Plus Jakarta Sans for a smooth, warm, and friendly rounded aesthetic, complemented by premium glassmorphic cards.", id: "Mengubah tipografi ke Fredoka dan Plus Jakarta Sans untuk estetika bulat yang halus, hangat, dan bersahabat, dilengkapi dengan kartu glassmorphic premium." }
			},
			{
				type: "feature",
				title: { en: "Dynamic Custom Columns", id: "Kolom Kustom Dinamis" },
				desc: { en: "Define up to 2 extra text or dropdown columns in your sheet on the fly to track any financial data you want.", id: "Definisikan hingga 2 kolom teks atau dropdown tambahan di sheet Anda secara langsung untuk melacak data keuangan apa pun yang Anda inginkan." }
			}
		]
	},
	{
		version: "v2.2.1",
		type: "bugfix",
		date: { en: "Sat, July 11, 2026", id: "Sabtu, 11 Juli 2026" },
		time: "13:20",
		title: {
			en: "Login Loop Fix & Smooth Supabase OAuth Loading",
			id: "Perbaikan Loop Login & Loading Supabase OAuth Mulus"
		},
		description: {
			en: "Fixed login redirection loops caused by stale local storage, and added a clean loading overlay during Supabase OAuth state initialization for a smoother user experience.",
			id: "Memperbaiki loop pengalihan login yang disebabkan oleh data local storage lama, serta menambahkan overlay pemuatan selama inisialisasi status Supabase OAuth untuk pengalaman pengguna yang lebih mulus."
		},
		details: [
			{
				type: "bugfix",
				title: { en: "OAuth Login Loop Fix", id: "Perbaikan Loop Login OAuth" },
				desc: { en: "Resolved an issue where having a saved spreadsheet ID without a valid user token caused infinite redirection loops between the home page and login page.", id: "Menyelesaikan masalah di mana ID spreadsheet yang tersimpan tanpa token pengguna yang valid menyebabkan pengulangan pengalihan tanpa henti antara halaman utama dan login." }
			},
			{
				type: "improvement",
				title: { en: "Smooth Supabase OAuth loading", id: "Loading Supabase OAuth Mulus" },
				desc: { en: "Integrated the full-screen synchronizing overlay during Supabase OAuth session load and initial data-fetching state instead of displaying a disabled form layout.", id: "Mengintegrasikan overlay penyelarasan layar penuh selama pemuatan sesi Supabase OAuth dan status penarikan data awal daripada menampilkan tata letak formulir dinonaktifkan." }
			}
		]
	},
	{
		version: "v2.2.0",
		type: "minor",
		date: { en: "Fri, July 3, 2026", id: "Jumat, 3 Juli 2026" },
		time: "14:15",
		title: {
			en: "Performance Tuning, Hook Modularization & Accessibility",
			id: "Penyelarasan Performa, Modularisasi Hook & Aksesibilitas"
		},
		description: {
			en: "Introducing form state isolation for fluid mobile typing, dynamic lazy loading for charts, clean modular refactoring of dashboard hooks, and accessibility enhancements.",
			id: "Memperkenalkan isolasi state formulir untuk ketikan seluler yang lancar, pemuatan grafik dinamis, refactoring modular hook dashboard, dan peningkatan aksesibilitas."
		},
		details: [
			{
				type: "improvement",
				title: { en: "Form State Isolation", id: "Isolasi State Formulir" },
				desc: { en: "Localized input form state inside FormView to eliminate parent re-renders on every keystroke, resulting in a buttery-smooth typing experience.", id: "Melokalisasi state input formulir di dalam FormView untuk menghilangkan render ulang komponen induk di setiap ketukan tombol." }
			},
			{
				type: "improvement",
				title: { en: "Dynamic Lazy Loading for Charts", id: "Pemuatan Grafis Dinamis" },
				desc: { en: "Switched to Next.js dynamic import for the AnalyticsView component, delaying heavy charting bundles until they are viewed to speed up initial load.", id: "Beralih ke impor dinamis Next.js untuk AnalyticsView, menunda pemuatan grafik Recharts yang berat hingga halaman diakses." }
			},
			{
				type: "improvement",
				title: { en: "Modular Hook Refactoring", id: "Refactoring Modular Hook" },
				desc: { en: "Split the massive 1600+ line hook into a stateless sheets-api utility file and a usePWAInstall hook, reducing maintenance complexity.", id: "Memecah hook raksasa 1600+ baris menjadi file utilitas sheets-api stateless dan hook usePWAInstall." }
			},
			{
				type: "improvement",
				title: { en: "Screen Reader Accessibility", id: "Aksesibilitas Pembaca Layar" },
				desc: { en: "Added ARIA labels and hidden elements for assistive technologies on Logo controls.", id: "Menambahkan label ARIA dan menyembunyikan elemen hiasan untuk teknologi asistif pada tombol Logo." }
			}
		]
	},
	{
		version: "v2.1.0",
		type: "minor",
		date: { en: "Wed, July 1, 2026", id: "Rabu, 1 Juli 2026" },
		time: "18:00",
		title: {
			en: "Intelligent OCR Beta & Hybrid Storage Sync",
			id: "OCR Cerdas (Beta) & Sinkronisasi Penyimpanan Hibrida"
		},
		description: {
			en: "Introducing AI-powered receipt scanning (Beta) for effortless expense capture, hybrid cloud/sheet storage updates, and improved merchant name detection.",
			id: "Memperkenalkan pemindaian struk bertenaga AI (Beta) untuk pencatatan pengeluaran instan, sinkronisasi penyimpanan cloud/sheet hibrida, dan deteksi nama merchant yang ditingkatkan."
		},
		details: [
			{
				type: "feature",
				title: { en: "Intelligent OCR Receipt Scanner (Beta)", id: "Pemindai Struk OCR Cerdas (Beta)" },
				desc: { en: "Instantly scan receipt photos to extract name, amount, date, and category. The algorithm prioritizes true totals over payment and change lines.", id: "Pindai foto struk secara instan untuk mengekstrak nama, nominal, tanggal, dan kategori. Algoritma memprioritaskan nominal total daripada baris pembayaran atau kembalian." }
			},
			{
				type: "improvement",
				title: { en: "Smart Merchant Recognition", id: "Pengenalan Merchant Cerdas" },
				desc: { en: "Recognizes well-known stores (e.g. Indomaret, Alfamart, Solaria, etc.) and cleans up receipt prefixes like 'Welcome' or 'Struk'.", id: "Mengenali toko dan gerai populer (seperti Indomaret, Alfamart, Solaria, dll.) serta membersihkan awalan struk seperti 'Welcome' atau 'Struk'." }
			},
			{
				type: "improvement",
				title: { en: "Hybrid Cloud & Google Sheets Storage", id: "Penyimpanan Cloud & Google Sheets Hibrida" },
				desc: { en: "Fully updated onboarding and privacy policy to support seamless transitions between offline Sheets mode and secure Supabase cloud login databases.", id: "Pembaruan panduan dan kebijakan privasi untuk mendukung transisi lancar antara mode offline Sheets dan database login cloud Supabase yang aman." }
			}
		]
	},
	{
		version: "v2.0.1",
		type: "minor",
		date: { en: "Sun, June 22, 2026", id: "Minggu, 22 Juni 2026" },
		time: "03:27",
		title: {
			en: "UI Polish, 404 Page & Smart Bug Reporting",
			id: "Pemoles UI, Halaman 404 & Pelaporan Bug Cerdas"
		},
		description: {
			en: "Visual improvements to form controls, a new dynamic 404 page with illustration, error modals now show the 404 artwork, and a direct one-click bug report flow from any error dialog.",
			id: "Peningkatan visual pada kontrol formulir, halaman 404 dinamis baru dengan ilustrasi, modal error kini menampilkan ilustrasi 404, dan alur laporan bug langsung dengan satu klik dari dialog error mana pun."
		},
		details: [
			{
				type: "improvement",
				title: { en: "Highlighted 'Manage Fields' Button", id: "Tombol 'Kelola Field' Lebih Mencolok" },
				desc: { en: "The Manage Fields button now has a visible emerald border, subtle background tint, and bold font weight — making it clearly distinguishable as an interactive control.", id: "Tombol Kelola Field kini memiliki border emerald yang terlihat, latar belakang tipis, dan font tebal — menjadikannya jelas sebagai kontrol yang dapat diklik." }
			},
			{
				type: "feature",
				title: { en: "Dynamic 404 Not Found Page", id: "Halaman 404 Tidak Ditemukan Dinamis" },
				desc: { en: "Navigating to a non-existent URL now shows a beautiful illustrated 404 page with full bilingual support (EN/ID) and a Back to Home button.", id: "Mengakses URL yang tidak ada kini menampilkan halaman 404 dengan ilustrasi indah, dukungan dwibahasa penuh (EN/ID), dan tombol Kembali ke Beranda." }
			},
			{
				type: "improvement",
				title: { en: "Error Modal Now Shows 404 Illustration", id: "Modal Error Kini Menampilkan Ilustrasi 404" },
				desc: { en: "When any operation fails and triggers an error modal, the dialog now displays the 404 illustration instead of a plain icon, making errors feel more intentional and less alarming.", id: "Saat operasi gagal dan memicu modal error, dialog kini menampilkan ilustrasi 404 alih-alih ikon biasa." }
			},
			{
				type: "feature",
				title: { en: "Direct Bug Report from Error Dialog", id: "Laporan Bug Langsung dari Dialog Error" },
				desc: { en: "A 'Report Bug' button now appears inside every error modal. Clicking it instantly opens the Support form with the error title and message pre-filled — you just need to tap Send.", id: "Tombol 'Laporkan Bug' kini muncul di setiap modal error. Mengkliknya langsung membuka formulir Dukungan dengan judul dan pesan error sudah terisi — tinggal klik Kirim." }
			},
			{
				type: "improvement",
				title: { en: "Premium Error Feedback on Login & Reset Password", id: "Umpan Balik Error Premium di Login & Reset Kata Sandi" },
				desc: { en: "All native browser alert() dialogs on the Login and Reset Password screens have been replaced with the premium Status Modal system, including the new bug reporting flow.", id: "Semua dialog alert() bawaan browser di layar Login dan Reset Kata Sandi telah diganti dengan sistem Status Modal premium, termasuk alur pelaporan bug baru." }
			}
		]
	},
	{
		version: "v2.0.0",
		type: "major",
		date: { en: "Sun, June 22, 2026", id: "Minggu, 22 Juni 2026" },
		time: "00:00",
		title: {
			en: "Account Mode, Sheets Direct & Visual Overhaul",
			id: "Mode Akun, Sheets Langsung & Pembaruan Visual"
		},
		description: {
			en: "Introducing full account sign-in, direct Google Sheets sync without login, export features, and a premium glassmorphic UI redesign.",
			id: "Memperkenalkan login akun penuh, sinkronisasi Google Sheets langsung tanpa login, fitur ekspor, dan desain ulang UI glassmorphic premium."
		},
		details: [
			{
				type: "feature",
				title: { en: "Account Mode (Email & Google OAuth)", id: "Mode Akun (Email & Google OAuth)" },
				desc: { en: "Sign up or log in with email/password or Google account. Data is securely stored in the cloud database.", id: "Daftar atau masuk dengan email/kata sandi atau akun Google. Data tersimpan aman di database cloud." }
			},
			{
				type: "feature",
				title: { en: "Direct Google Sheets Mode (No Account)", id: "Mode Google Sheets Langsung (Tanpa Akun)" },
				desc: { en: "Connect directly to your personal Google Drive & Sheets as the database — no registration required. Your data stays 100% in your own Google account.", id: "Hubungkan langsung ke Google Drive & Sheets pribadi Anda sebagai database — tanpa registrasi. Data Anda 100% tersimpan di akun Google Anda sendiri." }
			},
			{
				type: "feature",
				title: { en: "Export to CSV & Google Sheets (Account Mode)", id: "Ekspor ke CSV & Google Sheets (Mode Akun)" },
				desc: { en: "Export your transaction history from the Detail Transaction view as a CSV or sync it to a Google Sheets file.", id: "Ekspor riwayat transaksi dari tampilan Detail Transaksi sebagai CSV atau sinkronkan ke file Google Sheets." }
			},
			{
				type: "improvement",
				title: { en: "Glassmorphic UI & Ambient Glow", id: "UI Glassmorphic & Cahaya Ambient" },
				desc: { en: "Cards now use a frosted-glass look (backdrop blur + semi-transparent). Background orbs emit a soft emerald-teal glow for visual depth.", id: "Kartu kini menggunakan tampilan kaca buram (backdrop blur + semi-transparan). Orbs latar belakang memancarkan cahaya emerald-teal halus untuk kedalaman visual." }
			},
			{
				type: "improvement",
				title: { en: "Gradient CTA Buttons", id: "Tombol CTA Gradasi" },
				desc: { en: "Primary action buttons (Get Started, Add Expense, Sign In) now use an emerald-to-teal gradient with a subtle glow shadow.", id: "Tombol aksi utama (Mulai, Tambah Pengeluaran, Masuk) kini menggunakan gradasi emerald ke teal dengan bayangan glow halus." }
			},
			{
				type: "improvement",
				title: { en: "Full Bilingual UI (EN / ID)", id: "UI Dwibahasa Penuh (EN / ID)" },
				desc: { en: "All alert modals, balance dialogs, tutorial pages, and patch notes are now fully translated between English and Indonesian.", id: "Semua modal peringatan, dialog saldo, halaman tutorial, dan patch notes kini sepenuhnya diterjemahkan antara Bahasa Inggris dan Indonesia." }
			},
			{
				type: "bugfix",
				title: { en: "Login Page Access Guard", id: "Penjaga Akses Halaman Login" },
				desc: { en: "Users who are already logged in are now automatically redirected to the dashboard instead of being shown the login page.", id: "Pengguna yang sudah login kini otomatis diarahkan ke dashboard, bukan halaman login." }
			},
			{
				type: "bugfix",
				title: { en: "OAuth Token Race Condition Fix", id: "Perbaikan Race Condition Token OAuth" },
				desc: { en: "Fixed a React Strict Mode double-mount issue where Google OAuth tokens were lost on page reload, causing silent auth failures.", id: "Memperbaiki masalah double-mount React Strict Mode di mana token Google OAuth hilang saat halaman dimuat ulang, menyebabkan kegagalan autentikasi senyap." }
			}
		]
	},
	{
		version: "v1.1.0",
		type: "minor",
		date: { en: "Fri, June 19, 2026", id: "Jumat, 19 Juni 2026" },
		time: "16:40",
		title: {
			en: "Keyboard Math & Account Memory",
			id: "Operasi Matematika Keyboard & Memori Akun"
		},
		description: {
			en: "Added basic addition/subtraction support to the numeric keyboard and bypassed Google Account selection for returning users.",
			id: "Menambahkan dukungan tambah/kurang pada keyboard angka dan melewati pilihan akun Google untuk pengguna lama."
		},
		details: [
			{
				type: "feature",
				title: { en: "Arithmetic Keypad (+ and -)", id: "Tombol Aritmatika (+ dan -)" },
				desc: { en: "Perform addition and subtraction directly on the custom mobile keyboard. Tap Selesai to compute the final result.", id: "Melakukan penjumlahan dan pengurangan langsung di keyboard kustom mobile. Ketuk Selesai untuk melihat hasil akhir." }
			},
			{
				type: "feature",
				title: { en: "Google Account Chooser Bypass", id: "Pintasan Pemilihan Akun Google" },
				desc: { en: "Automatically remembers your Google account email and bypasses the account selection chooser screen during silent re-auth.", id: "Otomatis mengingat email akun Google Anda dan melewati layar pilihan akun saat re-autentikasi senyap." }
			},
			{
				type: "bugfix",
				title: { en: "Resolved Backspace Double-Delete", id: "Perbaikan Hapus Ganda Backspace" },
				desc: { en: "Fixed a touch event conflict on hybrid screens where tapping backspace deleted two characters instead of one.", id: "Memperbaiki konflik event sentuh pada layar hybrid di mana mengetuk hapus menghapus dua digit sekaligus." }
			},
			{
				type: "improvement",
				title: { en: "Raised Keyboard Layer Stack", id: "Peningkatan Lapisan Keyboard" },
				desc: { en: "Elevated keyboard layout and backdrop above the floating report button to prevent tap blocking.", id: "Menaikkan posisi keyboard dan latar belakang di atas tombol laporan melayang agar tidak menghalangi input." }
			}
		]
	},
	{
		version: "v1.0.1",
		type: "minor",
		date: { en: "Thu, June 18, 2026", id: "Kamis, 18 Juni 2026" },
		time: "10:30",
		title: {
			en: "Keyboard & Backdrop Polish",
			id: "Penyempurnaan Keyboard & Latar Belakang"
		},
		description: {
			en: "Polished the mobile numeric keyboard, backdrop click behavior, and aligned all modal styles.",
			id: "Menyempurnakan keyboard angka mobile, perilaku klik latar belakang, dan menyelaraskan gaya modal."
		},
		details: [
			{
				type: "improvement",
				title: { en: "Dismiss Keyboard with Done", id: "Tutup Keyboard dengan Selesai" },
				desc: { en: "Done/Selesai button now closes the mobile keyboard instead of submitting the form directly.", id: "Tombol Selesai kini hanya menutup keyboard mobile, bukan langsung mengirim formulir." }
			},
			{
				type: "improvement",
				title: { en: "Continuous Deletion on Hold", id: "Hapus Terus-menerus Saat Ditahan" },
				desc: { en: "Holding the Backspace button now deletes digits continuously.", id: "Menahan tombol Backspace kini akan menghapus nominal satu per satu secara kontinu." }
			},
			{
				type: "improvement",
				title: { en: "Auto-Scroll Focused Field", id: "Scroll Otomatis Bidang Fokus" },
				desc: { en: "Amount input now scrolls smoothly into view when keyboard opens so it never gets covered.", id: "Input nominal kini otomatis ter-scroll ke tengah layar saat keyboard dibuka agar tidak tertutup." }
			},
			{
				type: "bugfix",
				title: { en: "Transparent Keyboard Backdrop", id: "Latar Belakang Keyboard Transparan" },
				desc: { en: "Removed dimming and blur when keyboard is active to keep fields clearly visible.", id: "Menghapus efek gelap dan blur saat keyboard aktif agar input terlihat jelas." }
			},
			{
				type: "improvement",
				title: { en: "Consistent Modal Close Buttons", id: "Tombol Tutup Modal Konsisten" },
				desc: { en: "All modals now feature clean circular close buttons matching onboarding tutorial styles.", id: "Semua modal kini dilengkapi tombol tutup bulat yang bersih sesuai dengan panduan awal." }
			}
		]
	},
	{
		version: "v1.0.0",
		type: "major",
		date: { en: "Thu, June 18, 2026", id: "Kamis, 18 Juni 2026" },
		time: "10:00",
		title: {
			en: "Silent Sync & Custom Numeric Keyboard",
			id: "Sinkronisasi Senyap & Keyboard Kustom"
		},
		description: {
			en: "Our initial release introducing silent Google authentication, native numeric keyboard, and dynamic amount formatting.",
			id: "Rilis awal yang memperkenalkan autentikasi Google senyap, keyboard angka kustom, dan format nominal dinamis."
		},
		details: [
			{
				type: "feature",
				title: { en: "Silent Re-authentication", id: "Re-autentikasi Senyap" },
				desc: { en: "Automatically refreshes Google Sheets authentication tokens on load.", id: "Otomatis memperbarui token autentikasi Google Sheets saat aplikasi dibuka." }
			},
			{
				type: "feature",
				title: { en: "Mobile Numeric Keyboard", id: "Keyboard Angka Mobile" },
				desc: { en: "Slides up custom keyboard with Indonesian Rupiah layout on mobile viewports.", id: "Memunculkan keyboard kustom dengan susunan Rupiah pada tampilan perangkat seluler." }
			},
			{
				type: "improvement",
				title: { en: "Indonesian Rupiah Formatting", id: "Format Rupiah Indonesia" },
				desc: { en: "Amount input dynamically formats thousands separator as you type.", id: "Input nominal secara dinamis memformat pemisah ribuan saat Anda mengetik." }
			},
			{
				type: "feature",
				title: { en: "In-Memory Demo Mode", id: "Mode Demo dalam Memori" },
				desc: { en: "Try all tracking features instantly without requiring a Google Account.", id: "Coba seluruh fitur pencatatan secara instan tanpa membutuhkan Akun Google." }
			},
			{
				type: "feature",
				title: { en: "Patch Notes Modal", id: "Modal Catatan Pembaruan" },
				desc: { en: "A changelog screen accessible from the header to keep track of updates.", id: "Layar catatan pembaruan yang dapat diakses di bagian header." }
			}
		]
	}
];

export function PatchNotesModal({ isOpen, onOpenChange }: PatchNotesModalProps) {
	const { t, language } = useLanguage();

	const getTypeStyles = (type: "major" | "minor" | "bugfix") => {
		switch (type) {
			case "major":
				return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25";
			case "bugfix":
				return "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25";
			default:
				return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25";
		}
	};

	const getDetailIcon = (type: "feature" | "bugfix" | "improvement") => {
		switch (type) {
			case "feature":
				return <Sparkles size={12} className="text-emerald-500 dark:text-emerald-400" />;
			case "bugfix":
				return <Bug size={12} className="text-red-500 dark:text-red-400" />;
			default:
				return <ArrowUpRight size={12} className="text-blue-500 dark:text-blue-400" />;
		}
	};

	const getDetailIconBg = (type: "feature" | "bugfix" | "improvement") => {
		switch (type) {
			case "feature":
				return "bg-emerald-500/10";
			case "bugfix":
				return "bg-red-500/10";
			default:
				return "bg-blue-500/10";
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[550px] rounded-[32px] overflow-hidden p-5 max-h-[86vh] flex flex-col border-none bg-white dark:bg-[#222428] gap-3" showCloseButton={false}>
				{/* Top Close Button - Bulat ketika hover */}
				<button 
					type="button"
					onClick={() => onOpenChange(false)}
					className="absolute top-5 right-5 rounded-full w-9 h-9 p-0 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#2B2E33] hover:text-zinc-600 dark:hover:text-zinc-200 z-[110] transition-colors flex items-center justify-center cursor-pointer border-none bg-[#F1F3F5] dark:bg-[#2B2E33]"
				>
					<X size={18} />
				</button>

				{/* Fixed Modal Header */}
				<div className="px-2 pt-1 pb-1 flex flex-col gap-0.5 pr-10">
					<h2 className="text-xl font-black tracking-tight">{t("patchNotesTitle")}</h2>
					<p className="text-[10px] text-zinc-400 dark:text-zinc-400 uppercase tracking-widest font-bold">
						{t("patchNotesSubtitle")}
					</p>
				</div>

				{/* Recessed Shaded Scrollable Version List Container with Circular Interactive Scrollbar */}
				<ModalScrollArea maxHeightClass="max-h-[60vh]" className="flex-1" contentClassName="space-y-4">
					<div className="space-y-4">
						{UPDATES.map((update, idx) => (
							<div 
								key={idx} 
								className="bg-white dark:bg-[#222428] rounded-3xl p-5 border-none shadow-[0_4px_10px_rgba(0,0,0,0.06)] flex flex-col gap-3.5 relative overflow-hidden"
							>
								{/* Release Tag, Date, Time & Version */}
								<div className="flex items-center gap-2 flex-wrap text-[10px] font-bold uppercase tracking-wider">
									<span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${getTypeStyles(update.type)}`}>
										{update.type} update
									</span>
									<span className="text-zinc-300 dark:text-zinc-700">·</span>
									<span className="text-zinc-400 dark:text-zinc-400">
										POSTED {update.date[language]} · {update.time}
									</span>
									<span className="ml-auto text-[10px] font-black bg-[#F1F3F5] dark:bg-[#2B2E33] text-zinc-600 dark:text-zinc-300 px-2.5 py-0.5 rounded-full">
										{update.version}
									</span>
								</div>

								{/* Title & Desc */}
								<div className="space-y-1">
									<h3 className="text-base font-black tracking-tight text-zinc-950 dark:text-white">
										{update.title[language]}
									</h3>
									<p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
										{update.description[language]}
									</p>
								</div>

								{/* Detailed List */}
								<div className="space-y-3 pt-2.5 border-t border-zinc-100 dark:border-white/5">
									{update.details.map((detail, dIdx) => (
										<div key={dIdx} className="flex gap-3 text-left">
											<div className={`flex-shrink-0 w-6 h-6 rounded-lg ${getDetailIconBg(detail.type)} flex items-center justify-center mt-0.5`}>
												{getDetailIcon(detail.type)}
											</div>
											<div>
												<p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
													{detail.title[language]}
												</p>
												<p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-0.5">
													{detail.desc[language]}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</ModalScrollArea>

				{/* Distinct Footer */}
				<div className="pt-1 flex justify-center">
					<p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
						EXPense by GENLORD · Latest Version {UPDATES[0].version}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

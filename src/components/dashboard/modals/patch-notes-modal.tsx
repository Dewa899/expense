"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { Sparkles, Bug, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
			<DialogContent className="sm:max-w-[550px] rounded-[36px] overflow-hidden p-0 max-h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" showCloseButton={false}>
				{/* Top Close Button - Bulat ketika hover */}
				<button 
					type="button"
					onClick={() => onOpenChange(false)}
					className="absolute top-6 right-6 rounded-full w-10 h-10 p-0 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-200 z-[110] transition-colors flex items-center justify-center cursor-pointer"
				>
					<X size={20} />
				</button>

				{/* Fixed Modal Header */}
				<div className="px-8 pt-8 pb-4 border-b border-zinc-100 dark:border-zinc-900/50 flex flex-col gap-1 bg-white dark:bg-zinc-950">
					<h2 className="text-2xl font-black tracking-tight">{t("patchNotesTitle")}</h2>
					<p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold">
						{t("patchNotesSubtitle")}
					</p>
				</div>

				{/* Scrollable Version List Container */}
				<div className="flex-1 p-8 space-y-6 overflow-y-auto no-scrollbar max-h-[60vh] bg-zinc-50/50 dark:bg-zinc-950">
					{UPDATES.map((update, idx) => (
						<div 
							key={idx} 
							className="bg-white dark:bg-zinc-900/60 rounded-[28px] p-6 border border-zinc-200/60 dark:border-zinc-800/40 shadow-sm flex flex-col gap-4 relative overflow-hidden"
						>
							{/* Release Tag, Date, Time & Version */}
							<div className="flex items-center gap-2 flex-wrap text-[10px] font-bold uppercase tracking-wider">
								<span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${getTypeStyles(update.type)}`}>
									{update.type} update
								</span>
								<span className="text-zinc-300 dark:text-zinc-700">·</span>
								<span className="text-zinc-400 dark:text-zinc-500">
									POSTED {update.date[language]} · {update.time}
								</span>
								<span className="ml-auto text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2.5 py-0.5 rounded-full border border-zinc-200/20 dark:border-zinc-700/30">
									{update.version}
								</span>
							</div>

							{/* Title & Desc */}
							<div className="space-y-1">
								<h3 className="text-lg font-black tracking-tight text-zinc-950 dark:text-white">
									{update.title[language]}
								</h3>
								<p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
									{update.description[language]}
								</p>
							</div>

							{/* Detailed List */}
							<div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
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

				{/* Footer */}
				<div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-900/50 flex justify-center">
					<p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
						EXPense by GENLORD · Latest Version {UPDATES[0].version}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}

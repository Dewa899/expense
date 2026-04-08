"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Sun, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/language-provider";
import { Logo } from "@/app/page";
import { useRouter } from "next/navigation";

export default function TermsOfService() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleLanguage = () => setLanguage(language === "en" ? "id" : "en");

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      {/* Consistent Navbar */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/50 backdrop-blur-sm sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80">
        <Logo onClick={() => router.push("/")} />
        
        <div className="flex items-center gap-1">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-2 text-xs font-bold text-emerald-500">
              <ArrowLeft size={14} className="mr-1" />
              {t("back")}
            </Button>
          </Link>

          <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-full h-8 w-8 text-zinc-600 dark:text-zinc-400">
            <Languages size={16} />
            <span className="sr-only">Toggle Language</span>
            <span className="ml-0.5 text-[8px] font-bold uppercase">{language}</span>
          </Button>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-8 w-8 text-zinc-600 dark:text-zinc-400">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle Theme</span>
          </Button>
        </div>
      </header>

      <main className="flex-grow p-8 md:p-24">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-emerald-500">
              {language === "id" ? "Syarat dan Ketentuan" : "Terms of Service"}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {t("lastUpdated")}: April 9, 2026
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {language === "id" ? "1. Penerimaan Syarat" : "1. Acceptance of Terms"}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {language === "id" 
                ? "Dengan mengakses dan menggunakan Expense by Genlord (\"Aplikasi\"), Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju, mohon untuk tidak menggunakan Aplikasi ini." 
                : "By accessing and using Expense by Genlord (the \"App\"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {language === "id" ? "2. Deskripsi Layanan" : "2. Description of Service"}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {language === "id" 
                ? "Expense by Genlord adalah aplikasi web sisi-klien yang terhubung langsung dengan akun Google Anda untuk membantu mengelola dan melacak pengeluaran di dalam Google Sheets Anda sendiri. Kami menyediakan antarmuka pengguna, sementara penyimpanan dan pemrosesan data aktual ditangani secara aman oleh infrastruktur Google di bawah akun Anda." 
                : "Expense by Genlord is a client-side web application that connects directly to your Google account to help you manage and track expenses inside your own Google Sheets. We provide the user interface, while the actual data storage and processing are handled securely by Google's infrastructure under your account."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {language === "id" ? "3. Integrasi Layanan Google API" : "3. Google API Services Integration"}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {language === "id" ? (
                <>
                  Aplikasi meminta akses ke Google Spreadsheets dan file Drive tertentu yang Anda beri izin secara spesifik melalui Google OAuth. Anda memahami dan setuju bahwa data Anda disimpan di Google Drive pribadi Anda, dan Anda memegang kepemilikan dan kendali penuh atas data Anda. Untuk informasi lebih lanjut tentang bagaimana kami menangani izin secara aman, rujuk <Link href="/privacy" className="text-emerald-500 underline underline-offset-4">Kebijakan Privasi</Link> kami.
                </>
              ) : (
                <>
                  The App requests access to specifically authorized Google Spreadsheets and Drive files via Google OAuth. 
                  You understand and agree that your data is stored in your personal Google Drive, and you retain full ownership and control over your data.
                  For more information on how we handle permissions securely, please refer to our <Link href="/privacy" className="text-emerald-500 underline underline-offset-4">Privacy Policy</Link>.
                </>
              )}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {language === "id" ? "4. Tanggung Jawab Pengguna" : "4. User Responsibilities"}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {language === "id" 
                ? "Anda bertanggung jawab untuk menjaga kerahasiaan akun Google Anda dan perangkat apa pun yang Anda gunakan untuk mengakses Aplikasi. Anda setuju untuk tidak menyalahgunakan Aplikasi, termasuk merekayasa balik atau mencoba mendapatkan akses tidak sah ke layanan atau data pengguna lain." 
                : "You are responsible for maintaining the confidentiality of your Google account and any devices you use to access the App. You agree not to misuse the App, including reverse-engineering or attempting to gain unauthorized access to the service or other users' data."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {language === "id" ? "5. Batasan Tanggung Jawab" : "5. Limitation of Liability"}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {language === "id" 
                ? "Expense by Genlord disediakan \"apa adanya\" tanpa garansi apa pun. Dalam kondisi apa pun, pengembang atau pengelola tidak akan bertanggung jawab atas kehilangan data, gangguan layanan, atau kerusakan yang timbul dari penggunaan atau ketidakmampuan menggunakan Aplikasi. Karena data Anda di-host langsung di Google Drive, kehilangan data di pihak Google berada di luar kendali kami." 
                : "Expense by Genlord is provided \"as-is\" without any warranties. In no event shall the developers or maintainers be liable for any data loss, service interruptions, or damages arising out of the use or inability to use the App. Since your data is hosted directly on Google Drive, any data loss on Google's end is beyond our control."}
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              {language === "id" ? "6. Perubahan Syarat" : "6. Changes to Terms"}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
              {language === "id" 
                ? "Kami berhak untuk memperbarui Syarat dan Ketentuan ini kapan saja. Perubahan apa pun akan diposting di halaman ini dan akan segera berlaku setelah diposting." 
                : "We reserve the right to update these Terms of Service at any time. Any changes will be posted on this page and will become effective immediately upon posting."}
            </p>
          </section>
        </div>
      </main>

      <footer className="p-12 text-center mt-auto border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col items-center gap-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          EXPense by GENLORD &copy; 2026
        </p>
        <div className="flex gap-4">
          <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-4">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-500 transition-colors underline underline-offset-4">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}

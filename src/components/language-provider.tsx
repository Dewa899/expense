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
  heroTitle: {
    en: "Your Expenses, Your Rules.",
    id: "Pengeluaran Anda, Aturan Anda.",
  },
  heroSubtitle: {
    en: "The minimalist expense manager that adapts to your Google Sheets structure.",
    id: "Manajer pengeluaran minimalis yang menyesuaikan dengan struktur Google Sheets Anda.",
  },
  getStarted: {
    en: "Get Started",
    id: "Mulai Sekarang",
  },
  connectSheets: {
    en: "Connect Google Sheets",
    id: "Hubungkan Google Sheets",
  },
  features: {
    en: "Features",
    id: "Fitur",
  },
  integration: {
    en: "Integration",
    id: "Integrasi",
  },
  pricing: {
    en: "Pricing",
    id: "Harga",
  },
  signIn: {
    en: "Sign In",
    id: "Masuk",
  },
  expenseName: {
    en: "Expense Name",
    id: "Nama Pengeluaran",
  },
  category: {
    en: "Category",
    id: "Kategori",
  },
  amount: {
    en: "Amount",
    id: "Jumlah",
  },
  addExpense: {
    en: "Add Expense",
    id: "Tambah Pengeluaran",
  },
  validationError: {
    en: "Missing Information",
    id: "Data Belum Lengkap",
  },
  validationDesc: {
    en: "Please fill in all fields except Note before submitting.",
    id: "Silakan isi semua bidang kecuali Catatan sebelum mengirim.",
  },
  successTitle: {
    en: "Transaction Saved!",
    id: "Transaksi Tersimpan!",
  },
  successDesc: {
    en: "Your expense has been successfully added to Google Sheets.",
    id: "Pengeluaran Anda telah berhasil ditambahkan ke Google Sheets.",
  },
  close: {
    en: "Close",
    id: "Tutup",
  },
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
  googleSyncBtn: {
    en: "Continue with Google",
    id: "Lanjutkan dengan Google",
  },
  googleSyncActive: {
    en: "Connected to Google Sheets",
    id: "Terhubung ke Google Sheets",
  },
  googleSyncDisconnect: {
    en: "Disconnect Account",
    id: "Putuskan Akun",
  },
  disconnectWarningTitle: {
    en: "Disconnect Account?",
    id: "Putuskan Akun?",
  },
  disconnectWarningDesc: {
    en: "Your custom field settings (types and options) will be removed from this browser. However, your data and columns will remain safe in your Google Sheets.",
    id: "Konfigurasi kolom kustom Anda (tipe dan pilihan) akan dihapus dari browser ini. Namun, data dan kolom Anda akan tetap aman di Google Sheets Anda.",
  },
  disconnectConfirm: {
    en: "Disconnect Now",
    id: "Putuskan Sekarang",
  },
  googleSyncPrivacy: {
    en: "We only request access to create and edit the specific 'Expense Tracker' sheet in your Drive.",
    id: "Kami hanya meminta akses untuk membuat dan mengedit file 'Expense Tracker' spesifik di Drive Anda.",
  },
  quickAdd: {
    en: "Quick Add",
    id: "Tambah Cepat",
  },
  name: {
    en: "Name",
    id: "Nama",
  },
  amount: {
    en: "Amount",
    id: "Jumlah",
  },
  category: {
    en: "Category",
    id: "Kategori",
  },
  note: {
    en: "Note",
    id: "Catatan",
  },
  transactionType: {
    en: "Transaction Type",
    id: "Tipe Transaksi",
  },
  income: {
    en: "Income",
    id: "Pemasukan",
  },
  expense: {
    en: "Expense",
    id: "Pengeluaran",
  },
  selectCategory: {
    en: "Select a category",
    id: "Pilih kategori",
  },
  newCategory: {
    en: "New Category",
    id: "Kategori Baru",
  },
  addManualCategory: {
    en: "Or type manual category...",
    id: "Atau ketik kategori manual...",
  },
  manageCategories: {
    en: "Manage Categories",
    id: "Kelola Kategori",
  },
  manageFields: {
    en: "Manage Fields",
    id: "Kelola Kolom",
  },
  isRequired: {
    en: "Wajib Diisi?",
    id: "Wajib Diisi?",
  },
  requiredLabel: {
    en: "Required",
    id: "Wajib",
  },
  optionalLabel: {
    en: "Optional",
    id: "Opsional",
  },
  manageOptions: {
    en: "Manage Options",
    id: "Kelola Opsi",
  },
  newOption: {
    en: "New Option",
    id: "Opsi Baru",
  },
  addField: {
    en: "Add New Field",
    id: "Tambah Kolom Baru",
  },
  editField: {
    en: "Edit Field Name",
    id: "Ubah Nama Kolom",
  },
  fieldType: {
    en: "Field Type",
    id: "Tipe Kolom",
  },
  text: {
    en: "Text",
    id: "Teks",
  },
  dropdown: {
    en: "Dropdown",
    id: "Pilihan",
  },
  deleteFieldWarning: {
    en: "Delete Column?",
    id: "Hapus Kolom?",
  },
  deleteFieldDesc: {
    en: "This will permanently remove the column and ALL data inside it from your Google Sheets. This action cannot be undone.",
    id: "Ini akan menghapus kolom dan SELURUH data di dalamnya secara permanen dari Google Sheets Anda. Tindakan ini tidak dapat dibatalkan.",
  },
  maxFieldsReached: {
    en: "Maximum 2 custom fields reached.",
    id: "Batas maksimal 2 kolom kustom tercapai.",
  },
  add: {
    en: "Add",
    id: "Tambah",
  },
  detailedDashboard: {
    en: "Detailed Dashboard",
    id: "Dashboard Detail",
  },
  selectMonth: {
    en: "Select Month",
    id: "Pilih Bulan",
  },
  viewDetail: {
    en: "View Details",
    id: "Lihat Detail",
  },
  incomeTotal: {
    en: "Total Income",
    id: "Total Pemasukan",
  },
  expenseTotal: {
    en: "Total Expense",
    id: "Total Pengeluaran",
  },
  netBalance: {
    en: "Net Balance",
    id: "Saldo Bersih",
  },
  transactionTrend: {
    en: "Transaction Trend",
    id: "Tren Transaksi",
  },
  expenseByCat: {
    en: "Expense by Category",
    id: "Pengeluaran per Kategori",
  },
  back: {
    en: "Back",
    id: "Kembali",
  },
  delete: {
    en: "Delete",
    id: "Hapus",
  },
  ocrTitle: {
    en: "Receipt Scanning",
    id: "Scan Struk",
  },
  ocrDesc: {
    en: "Coming soon: Instantly capture expenses from receipts using AI-powered OCR technology.",
    id: "Segera hadir: Catat pengeluaran secara instan dari struk menggunakan teknologi OCR berbasis AI.",
  },
  dynamicTitle: {
    en: "Dynamic Schema",
    id: "Skema Dinamis",
  },
  dynamicDesc: {
    en: "Adapt to any Google Sheet structure. Define your own categories and columns easily.",
    id: "Menyesuaikan dengan struktur Google Sheet apa pun. Tentukan kategori dan kolom Anda sendiri dengan mudah.",
  },
  sheetsTitle: {
    en: "Real-time Sync",
    id: "Sinkronisasi Real-time",
  },
  sheetsDesc: {
    en: "Your data stays in your control. Expenses are synced directly to your personal Google Sheets.",
    id: "Data Anda tetap dalam kendali Anda. Pengeluaran disinkronkan langsung ke Google Sheets pribadi Anda.",
  },
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
    return dictionary[key][language] || (key as string);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

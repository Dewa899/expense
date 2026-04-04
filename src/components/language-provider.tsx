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
  googleSyncPrivacy: {
    en: "We only request access to create and edit the specific 'Expense Tracker' sheet in your Drive.",
    id: "Kami hanya meminta akses untuk membuat dan mengedit file 'Expense Tracker' spesifik di Drive Anda.",
  },
  quickAdd: {
    en: "Quick Add",
    id: "Tambah Cepat",
  },
  selectCategory: {
    en: "Select a category",
    id: "Pilih kategori",
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

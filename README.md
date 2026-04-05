# 💸 Expense by GENLORD

> **"Your Expenses, Your Rules."**

Expense by Genlord is a minimalist expense manager that puts you in full control of your data. No third-party databases—all your transactions live securely within your own private **Google Sheets**.

---

## ✨ Key Features

- **🔒 Google Sheets as Database**: Your data belongs to you. The app syncs directly with your personal Spreadsheet in real-time.
- **📅 Smart Monthly Tabs**: Automatically creates monthly tabs (id-ID format) and manages data in an organized way without manual intervention.
- **🛠️ Dynamic Custom Fields**: Add up to 2 extra custom columns (Text or Dropdown) to track specific details like "Payment Method" or "Location".
- **📊 Visual Analytics**: A beautiful detailed dashboard with transaction trends, category breakdowns, and the ability to add **Custom Charts** based on your own fields.
- **🌐 Dual Language Support**: Full support for both English and Bahasa Indonesia.
- **📱 Mobile-First Design**: A modern, responsive interface designed specifically for comfort on mobile devices.
- **🚀 Interactive Onboarding**: A comprehensive tutorial for new users to understand all features in minutes.

---

## 🚀 Tech Stack

Built with modern development standards:

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)
- **APIs**: Google Drive API v3 & Google Sheets API v4
- **UI Components**: Radix UI (Base)

---

## 🛠️ Local Development

### 1. Prerequisites
- Node.js 18+ 
- Google Cloud Console Account (for OAuth Client ID)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/username/expense-by-genlord.git
cd expense-by-genlord
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root folder and add your Google Client ID:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 4. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

---

## 🌍 Deployment

This application is optimized for deployment on **Vercel**:

1. Push your code to GitHub.
2. Connect your repository to Vercel.
3. Add the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` environment variable in the Vercel dashboard.
4. **Important**: Ensure you have registered your production URL in the [Google Cloud Console](https://console.cloud.google.com/) under *Authorized JavaScript origins* and *Authorized redirect URIs*.

---

## 🛡️ Privacy & Security

This app only requests `drive.file` and `spreadsheets` scopes. This means it can only access files it creates or files you specifically give it permission to access. We never store your transaction data on external servers; everything is sent directly to your Google Sheets.

---

## 👤 Author

**GENLORD**  
*"Minimalist, Efficient, and Secure."*

---
🎨 *Project bootstrapped with Next.js and optimized by Clean Coder standards.*

# Project: EXP (Expense & Experience)

**Identity:** Expense Manager by Genlord
**Core Concept:** A highly customizable web-based expense manager integrated with Google Sheets as the primary database/backend.

---

## 1. Vision & Problem Solving

- **Problem:** Existing apps are too rigid/not customizable enough.
- **Solution:** A "Schema-agnostic" UI that adapts to the user's Google Sheets structure.
- **Branding:** "by Genlord" signature. Minimalist, dark-themed, and professional UI.

## 2. Technical Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Integration:** - Google Sheets API (via Google Apps Script or OAuth)
  - OCR AI: Gumloop Integration

## 3. Core Features (The "EXP" Experience)

- **Dynamic Form Rendering:** Web UI must read headers from Google Sheets and generate input fields automatically.
- **OCR Receipt Scanning:** Fast photo upload to extract Date, Description, and Amount via Gumloop.
- **Personalized Onboarding:** Step-by-step guide to connect a user's specific Google Sheet ID.
- **Dashboard Summary:** Clean visual cards for quick spend tracking, leaving heavy data viz to the connected Google Sheets.

## 4. Design Language

- **Theme:** Dark Mode (Slate/Zinc palette) with Emerald/Green accents for financial elements.
- **Logo:** "EXP" (Bold) with "by GENLORD" (Light/Small) sub-text.
- **UX Goal:** Speed. Minimizing clicks from opening the app to saving an expense.

## 5. Implementation Roadmap (Phases)

### Phase 1: Foundation & Branding (Current Focus)

- Set up Next.js boilerplate with Tailwind and Shadcn.
- Create global Layout with "by Genlord" branding.
- Build the Landing Page and "EXP" identity.

### Phase 2: Onboarding & Connectivity

- Build the "Connect Your Sheets" UI.
- Implement logic to fetch Google Sheets headers (Metadata).

### Phase 3: Dynamic Input Engine

- Create a form component that maps Sheets columns to UI inputs.
- Implement "Add Category" logic that syncs back to Sheets.

### Phase 4: OCR & AI Integration

- Build the Camera/Upload UI.
- Integrate Gumloop API for receipt processing.

### Phase 5: Refinement

- Add Framer Motion transitions.
- Offline support (PWA) for quick logging.

---

## 6. Development Guidelines for Gemini CLI

- Always use **TypeScript** for safety.
- Follow **Atomic Design** (small, reusable components in `/components`).
- Keep the UI **Mobile-First**.
- Ensure all components are accessible (ARIA labels).

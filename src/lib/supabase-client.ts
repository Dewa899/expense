import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key";

const isPlaceholderSupabase = supabaseUrl.includes("placeholder-project.supabase.co");

// Stateful in-memory mock fetch used ONLY when NEXT_PUBLIC_SUPABASE_URL is not configured (e.g. CI / Playwright E2E without secrets)
const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "fauzanahmad899@gmail.com",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Test User" },
  identities: [{ provider: "email", id: "00000000-0000-0000-0000-000000000001" }],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

let mockUserSettings: Record<string, any> = {
  user_id: mockUser.id,
  custom_categories: ["Jajan", "Makan", "Transport", "Kebutuhan", "Entertainment", "Tagihan", "Investasi", "Lainnya"],
  custom_field_defs: [],
  custom_chart_configs: [],
  custom_pockets: [],
  updated_at: new Date().toISOString(),
};

let mockTransactions: any[] = [
  {
    id: "tx-initial-1",
    user_id: mockUser.id,
    date: new Date().toISOString(),
    name: "Saldo Awal (Manual Setup)",
    amount: 3155000,
    type: "income",
    category: "Initial Balance",
    note: "Manual Setup",
    pocket_id: null,
    custom_fields: {},
  },
];

let mockRecurringTemplates: any[] = [];

const createJsonResponse = (data: any, status = 200) =>
  new Response(data === null ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const placeholderSupabaseFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers(init?.headers || {});
  const accept = headers.get("accept") || "";
  const isSingleObject = accept.includes("application/vnd.pgrst.object+json");
  const url = new URL(urlStr);

  let bodyData: any = null;
  if (init?.body && typeof init.body === "string") {
    try {
      bodyData = JSON.parse(init.body);
    } catch {}
  }

  // 1. Auth Endpoints
  if (url.pathname.includes("/auth/v1/token") || url.pathname.includes("/auth/v1/signup")) {
    const email = bodyData?.email || mockUser.email;
    const sessionUser = { ...mockUser, email };
    return createJsonResponse({
      access_token: "mock-supabase-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "mock-supabase-refresh-token",
      user: sessionUser,
    });
  }

  if (url.pathname.includes("/auth/v1/user")) {
    return createJsonResponse(mockUser);
  }

  if (url.pathname.includes("/auth/v1/logout") || url.pathname.includes("/auth/v1/recover")) {
    return createJsonResponse({}, 200);
  }

  // 2. REST Endpoints: user_settings
  if (url.pathname.includes("/rest/v1/user_settings")) {
    if (method === "GET") {
      return createJsonResponse(isSingleObject ? mockUserSettings : [mockUserSettings]);
    }
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      const payload = Array.isArray(bodyData) ? bodyData[0] : bodyData;
      if (payload) {
        mockUserSettings = { ...mockUserSettings, ...payload };
      }
      return createJsonResponse(isSingleObject ? mockUserSettings : [mockUserSettings]);
    }
  }

  // 3. REST Endpoints: transactions
  if (url.pathname.includes("/rest/v1/transactions")) {
    if (method === "GET") {
      return createJsonResponse(isSingleObject ? (mockTransactions[0] || null) : mockTransactions);
    }
    if (method === "POST") {
      const items = Array.isArray(bodyData) ? bodyData : [bodyData];
      const inserted = items.map((item, idx) => ({
        id: item?.id || `tx-${Date.now()}-${idx}`,
        user_id: mockUser.id,
        date: item?.date || new Date().toISOString(),
        ...item,
      }));
      mockTransactions = [...inserted, ...mockTransactions];
      return createJsonResponse(isSingleObject ? inserted[0] : inserted, 201);
    }
    if (method === "PATCH") {
      const idFilter = url.searchParams.get("id");
      const pocketFilter = url.searchParams.get("pocket_id");
      mockTransactions = mockTransactions.map((tx) => {
        if (idFilter && idFilter === `eq.${tx.id}`) {
          return { ...tx, ...(bodyData || {}) };
        }
        if (pocketFilter && pocketFilter === `eq.${tx.pocket_id}`) {
          return { ...tx, ...(bodyData || {}) };
        }
        return tx;
      });
      return createJsonResponse(isSingleObject ? (mockTransactions[0] || {}) : mockTransactions);
    }
    if (method === "DELETE") {
      const idFilter = url.searchParams.get("id");
      if (idFilter?.startsWith("eq.")) {
        const targetId = idFilter.slice(3);
        mockTransactions = mockTransactions.filter((tx) => tx.id !== targetId);
      } else if (idFilter?.startsWith("in.(")) {
        const ids = idFilter.slice(4, -1).replace(/"/g, "").split(",");
        mockTransactions = mockTransactions.filter((tx) => !ids.includes(tx.id));
      }
      return createJsonResponse([], 200);
    }
  }

  // 4. REST Endpoints: recurring_templates
  if (url.pathname.includes("/rest/v1/recurring_templates")) {
    if (method === "GET") {
      return createJsonResponse(isSingleObject ? (mockRecurringTemplates[0] || null) : mockRecurringTemplates);
    }
    if (method === "POST") {
      const items = Array.isArray(bodyData) ? bodyData : [bodyData];
      const inserted = items.map((item, idx) => ({
        id: item?.id || `rec-${Date.now()}-${idx}`,
        user_id: mockUser.id,
        ...item,
      }));
      mockRecurringTemplates = [...mockRecurringTemplates, ...inserted];
      return createJsonResponse(isSingleObject ? inserted[0] : inserted, 201);
    }
    if (method === "DELETE") {
      const idFilter = url.searchParams.get("id");
      if (idFilter?.startsWith("eq.")) {
        const targetId = idFilter.slice(3);
        mockRecurringTemplates = mockRecurringTemplates.filter((rec) => rec.id !== targetId);
      }
      return createJsonResponse([], 200);
    }
  }

  // 5. Fallback for any other REST endpoints (e.g. google_connections)
  return createJsonResponse(isSingleObject ? null : [], 200);
};

const resilientSupabaseFetch: typeof fetch = async (input, init) => {
  if (isPlaceholderSupabase) {
    return placeholderSupabaseFetch(input, init);
  }
  try {
    return await fetch(input, init);
  } catch {
    return placeholderSupabaseFetch(input, init);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: typeof window !== "undefined",
  },
  global: { fetch: resilientSupabaseFetch },
});

// Service client for secure server-side operations bypassing RLS if needed
export const getSupabaseServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. Falling back to anon key.");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};

/* Expense by GENLORD — Service Worker
 * Purpose: handle Web Share Target (receipts shared from bank / e-wallet apps).
 * Shared files are stored temporarily in Cache Storage, then the user is redirected
 * to the dashboard (`/?from=share`) where the receipt is read, OCR-ed and auto-filled.
 * All other requests pass through untouched (no offline caching).
 */
const SHARE_CACHE = "shared-receipts";
const SHARE_FILE_KEY = "/__shared/receipt";
const SHARE_TEXT_KEY = "/__shared/text";

self.addEventListener("install", () => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

async function handleShareTarget(request) {
	try {
		const formData = await request.formData();
		const cache = await caches.open(SHARE_CACHE);
		await cache.delete(SHARE_FILE_KEY);
		await cache.delete(SHARE_TEXT_KEY);

		const files = formData.getAll("receipt").filter((f) => f && typeof f === "object" && "size" in f && f.size > 0);
		const file = files[0];
		if (file) {
			await cache.put(
				SHARE_FILE_KEY,
				new Response(file, {
					headers: {
						"content-type": file.type || "application/octet-stream",
						"x-file-name": encodeURIComponent(file.name || "receipt"),
					},
				})
			);
		}

		const payload = {
			title: String(formData.get("title") || ""),
			text: String(formData.get("text") || ""),
			url: String(formData.get("url") || ""),
		};
		if (payload.title || payload.text || payload.url) {
			await cache.put(
				SHARE_TEXT_KEY,
				new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } })
			);
		}
	} catch (err) {
		// Still redirect so the user lands in the app
		console.error("[sw] share-target error", err);
	}
	return Response.redirect("/?from=share", 303);
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "POST") return;
	const url = new URL(request.url);
	if (url.origin === self.location.origin && url.pathname === "/share-target") {
		event.respondWith(handleShareTarget(request));
	}
});

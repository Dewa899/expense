"use client";

import * as React from "react";

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = React.useState(false);

	React.useEffect(() => {
		const mq = window.matchMedia("(max-width: 640px)");
		setIsMobile(mq.matches);

		const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return isMobile;
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ModalScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	maxHeightClass?: string;
	contentClassName?: string;
	thumbColorClass?: string;
}

/**
 * Shaded scrollable modal body with an always-visible custom scrollbar
 * featuring a circular thumb that enlarges on touch/click for fast scrolling,
 * with generous breathing room between content and the modal border.
 */
export function ModalScrollArea({
	children,
	className,
	maxHeightClass = "max-h-[380px]",
	contentClassName,
	thumbColorClass = "bg-emerald-500 dark:bg-emerald-400 ring-emerald-500/25",
	...props
}: ModalScrollAreaProps) {
	const viewportRef = React.useRef<HTMLDivElement>(null);
	const trackRef = React.useRef<HTMLDivElement>(null);

	const [scrollRatio, setScrollRatio] = React.useState(0);
	const [isScrollable, setIsScrollable] = React.useState(false);
	const [isDragging, setIsDragging] = React.useState(false);
	const [isHovered, setIsHovered] = React.useState(false);

	const updateScrollMetrics = React.useCallback(() => {
		const el = viewportRef.current;
		if (!el) return;
		const maxScroll = el.scrollHeight - el.clientHeight;
		if (maxScroll > 2) {
			setIsScrollable(true);
			setScrollRatio(Math.min(1, Math.max(0, el.scrollTop / maxScroll)));
		} else {
			setIsScrollable(false);
			setScrollRatio(0);
		}
	}, []);

	React.useEffect(() => {
		const el = viewportRef.current;
		if (!el) return;
		updateScrollMetrics();

		const handleScroll = () => updateScrollMetrics();
		el.addEventListener("scroll", handleScroll, { passive: true });

		const resizeObserver = new ResizeObserver(() => updateScrollMetrics());
		resizeObserver.observe(el);
		if (el.firstElementChild) {
			resizeObserver.observe(el.firstElementChild);
		}

		const mutationObserver = new MutationObserver(() => updateScrollMetrics());
		mutationObserver.observe(el, { childList: true, subtree: true });

		return () => {
			el.removeEventListener("scroll", handleScroll);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	}, [updateScrollMetrics, children]);

	const scrollToPointerY = React.useCallback((clientY: number) => {
		const track = trackRef.current;
		const viewport = viewportRef.current;
		if (!track || !viewport) return;

		const rect = track.getBoundingClientRect();
		const pad = 8; // effective thumb radius padding inside track
		const usableHeight = Math.max(1, rect.height - pad * 2);
		const relY = Math.min(usableHeight, Math.max(0, clientY - rect.top - pad));
		const ratio = relY / usableHeight;
		const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
		viewport.scrollTop = ratio * maxScroll;
		setScrollRatio(ratio);
	}, []);

	const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
		scrollToPointerY(e.clientY);

		const onPointerMove = (moveEvent: PointerEvent) => {
			moveEvent.preventDefault();
			scrollToPointerY(moveEvent.clientY);
		};

		const onPointerUp = () => {
			setIsDragging(false);
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
		};

		window.addEventListener("pointermove", onPointerMove, { passive: false });
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);
	};

	return (
		<div
			className={cn(
				"relative rounded-2xl bg-[#ECEDF2] dark:bg-[#17191D] shadow-[inset_0_2px_6px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.32)] overflow-hidden",
				className
			)}
			{...props}
		>
			{/* Scrollable Viewport with generous right padding so content never touches the scrollbar */}
			<div
				ref={viewportRef}
				className={cn(
					"w-full overflow-y-auto no-scrollbar p-3.5 pr-9 scroll-smooth",
					isDragging && "scroll-auto select-none",
					maxHeightClass,
					contentClassName
				)}
			>
				<div>{children}</div>
			</div>

			{/* Always-visible Aesthetic Custom Scrollbar with Circular Expanding Thumb */}
			<div
				ref={trackRef}
				onPointerDown={handlePointerDown}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				role="scrollbar"
				aria-controls="modal-scroll-viewport"
				aria-valuenow={Math.round(scrollRatio * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				className={cn(
					"absolute top-3.5 bottom-3.5 right-2.5 w-5 flex items-center justify-center z-20 select-none touch-none",
					isScrollable ? "cursor-grab active:cursor-grabbing opacity-100" : "opacity-45 pointer-events-none"
				)}
				title="Drag circular thumb for fast scroll"
			>
				{/* Subtle Vertical Track Line */}
				<div className="w-1 h-full rounded-full bg-zinc-300/85 dark:bg-zinc-700/80 relative flex justify-center">
					{/* Filled Progress Line */}
					<div
						style={{ height: `${scrollRatio * 100}%` }}
						className="w-full rounded-full bg-emerald-500/40 dark:bg-emerald-400/40 transition-[height] duration-75"
					/>
				</div>

				{/* Circular Thumb (Enlarges on click / touch / drag for fast scrolling) */}
				<div
					style={{
						top: `calc(${scrollRatio * 100}% - ${scrollRatio * 16}px)`,
					}}
					className={cn(
						"absolute left-1/2 -translate-x-1/2 rounded-full transition-transform duration-150 ease-out flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.25)]",
						thumbColorClass,
						isDragging
							? "w-5 h-5 scale-110 ring-4"
							: isHovered
								? "w-4 h-4 scale-105 ring-2"
								: "w-3.5 h-3.5"
					)}
				>
					<span className="w-1.5 h-1.5 rounded-full bg-white/90 dark:bg-zinc-950/90 pointer-events-none" />
				</div>
			</div>
		</div>
	);
}

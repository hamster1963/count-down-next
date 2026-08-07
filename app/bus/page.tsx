"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const BUS_API_URL = "https://home-api.takecoffee.top/v2/GetAdvancedBusInfo";
const BUS_SSE_URL = `${BUS_API_URL}?sse=true`;
const LINE_COLORS = [
	"text-yellow-600",
	"text-blue-600",
	"text-red-600",
	"text-violet-600",
	"text-cyan-600",
] as const;
const LINE_CONFIG: Record<
	string,
	{
		busNumber: string;
		busName: string;
	}
> = {
	"581路-上班": {
		busNumber: "581",
		busName: "Home",
	},
	"581路-下班": {
		busNumber: "581",
		busName: "Workplace",
	},
	"494路-下班": {
		busNumber: "494",
		busName: "Workplace",
	},
	"广州东-家": {
		busNumber: "776",
		busName: "EastStation",
	},
	"家-广州东": {
		busNumber: "776",
		busName: "Home",
	},
};
const LINE_ORDER = new Map(
	Object.keys(LINE_CONFIG).map((line, index) => [line, index]),
);

type BusInfo = {
	busId: string;
	licensePlate: string;
	lines: string;
	reachtime: string;
	surplus: string;
	travelTime: string;
};

type DisplayBus = BusInfo & {
	isHistorical: boolean;
};

type BusPayload = {
	bus_list?: BusInfo[];
	data?: {
		bus_list?: BusInfo[];
	};
};

export default function Page() {
	const [buses, setBuses] = useState<DisplayBus[] | null>(null);

	useEffect(() => {
		const abortController = new AbortController();
		let eventSource: EventSource | null = null;

		const updateBuses = (busList: BusInfo[]) => {
			const currentBuses = selectNearestBusPerLine(busList);
			setBuses((previousBuses) =>
				mergeBusSnapshots(previousBuses, currentBuses),
			);
		};

		const connectSse = () => {
			eventSource = new EventSource(BUS_SSE_URL);

			eventSource.onmessage = (event) => {
				try {
					const payload = JSON.parse(event.data) as BusPayload;
					updateBuses(getBusList(payload));
				} catch (error) {
					console.error("Failed to parse bus SSE message", error);
					setBuses(markBusesAsHistorical);
				}
			};

			eventSource.onerror = () => {
				setBuses(markBusesAsHistorical);
			};
		};

		const loadInitialBuses = async () => {
			try {
				const response = await fetch(BUS_API_URL, {
					cache: "no-store",
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`Initial bus request failed: ${response.status}`);
				}

				const payload = (await response.json()) as BusPayload;
				updateBuses(getBusList(payload));
			} catch (error) {
				if (!abortController.signal.aborted) {
					console.error("Failed to load initial bus data", error);
					setBuses(markBusesAsHistorical);
				}
			} finally {
				if (!abortController.signal.aborted) {
					connectSse();
				}
			}
		};

		void loadInitialBuses();

		return () => {
			abortController.abort();
			eventSource?.close();
		};
	}, []);

	const isLoading = buses === null || buses.length === 0;
	const busesByLine = new Map(
		(buses ?? []).map((bus) => [bus.lines.trim(), bus]),
	);

	const renderBus = (bus: DisplayBus) => {
		const { busName, busNumber } = getLineDisplay(bus.lines);
		const { isNow, label } = formatTravelTime(bus.travelTime, bus.surplus);

		return (
			<BusRow
				busColor={getLineColor(bus.lines)}
				busName={busName}
				busNumber={busNumber}
				busTime={label}
				isHistorical={bus.isHistorical}
				isLoading={false}
				isNow={isNow}
				key={bus.lines}
			/>
		);
	};

	const configuredRows = Object.entries(LINE_CONFIG)
		.sort(([firstLine], [secondLine]) =>
			compareLineNames(firstLine, secondLine),
		)
		.map(([lines, { busName, busNumber }]) => {
			const bus = busesByLine.get(lines);

			return bus ? (
				renderBus(bus)
			) : (
				<BusRow
					busColor={getLineColor(lines)}
					busName={busName}
					busNumber={busNumber}
					busTime="--"
					isHistorical={false}
					isLoading
					isNow={false}
					key={lines}
				/>
			);
		});

	const extraRows = (buses ?? [])
		.filter((bus) => !Object.hasOwn(LINE_CONFIG, bus.lines.trim()))
		.map(renderBus);

	const content = [...configuredRows, ...extraRows];

	return (
		<div className="h-dvh flex flex-col items-center justify-center overflow-hidden">
			<section aria-busy={isLoading} className="flex flex-col items-start">
				{content}
			</section>
		</div>
	);
}

function parseTravelMinutes(travelTime: string) {
	const match = /^(\d+)\s*分钟$/.exec(travelTime.trim());
	return match ? Number.parseInt(match[1], 10) : null;
}

function getBusList(payload: BusPayload) {
	const busList = payload.bus_list ?? payload.data?.bus_list;

	if (!Array.isArray(busList)) {
		throw new Error("Bus response does not contain bus_list");
	}

	return busList;
}

function selectNearestBusPerLine(busList: BusInfo[]) {
	const uniqueBuses = new Map<string, BusInfo>();

	for (const bus of busList) {
		const busId = bus.busId.trim();

		if (busId && !uniqueBuses.has(busId)) {
			uniqueBuses.set(busId, bus);
		}
	}

	const nearestByLine = new Map<string, BusInfo>();

	for (const bus of uniqueBuses.values()) {
		const line = bus.lines.trim();
		const current = nearestByLine.get(line);

		if (!current) {
			nearestByLine.set(line, bus);
			continue;
		}

		const currentMinutes = parseTravelMinutes(current.travelTime);
		const candidateMinutes = parseTravelMinutes(bus.travelTime);

		if (
			candidateMinutes !== null &&
			(currentMinutes === null || candidateMinutes < currentMinutes)
		) {
			nearestByLine.set(line, bus);
		}
	}

	return Array.from(nearestByLine.values()).sort((first, second) =>
		compareBusLines(first, second),
	);
}

function mergeBusSnapshots(
	previousBuses: DisplayBus[] | null,
	currentBuses: BusInfo[],
) {
	const currentLines = new Set(currentBuses.map((bus) => bus.lines.trim()));
	const mergedBuses: DisplayBus[] = currentBuses.map((bus) => ({
		...bus,
		isHistorical: false,
	}));

	for (const bus of previousBuses ?? []) {
		if (!currentLines.has(bus.lines.trim())) {
			mergedBuses.push({
				...bus,
				isHistorical: true,
			});
		}
	}

	return mergedBuses.sort(compareBusLines);
}

function markBusesAsHistorical(previousBuses: DisplayBus[] | null) {
	return (
		previousBuses?.map((bus) => ({
			...bus,
			isHistorical: true,
		})) ?? null
	);
}

function compareBusLines(first: BusInfo, second: BusInfo) {
	return compareLineNames(first.lines, second.lines);
}

function compareLineNames(first: string, second: string) {
	const firstLine = first.trim();
	const secondLine = second.trim();
	const firstOrder = LINE_ORDER.get(firstLine);
	const secondOrder = LINE_ORDER.get(secondLine);

	if (firstOrder !== undefined && secondOrder !== undefined) {
		return firstOrder - secondOrder;
	}

	if (firstOrder !== undefined) {
		return -1;
	}

	if (secondOrder !== undefined) {
		return 1;
	}

	return firstLine.localeCompare(secondLine, "zh-CN", {
		numeric: true,
		sensitivity: "base",
	});
}

function getLineDisplay(lines: string) {
	const normalizedLines = lines.trim();

	return (
		LINE_CONFIG[normalizedLines] ?? {
			busNumber: "",
			busName: normalizedLines,
		}
	);
}

function formatTravelTime(travelTime: string, surplus: string) {
	if (surplus.trim() === "即将到达") {
		return { label: "now", isNow: true };
	}

	const minutes = parseTravelMinutes(travelTime);

	if (minutes !== null) {
		return { label: `${minutes}min`, isNow: false };
	}

	return travelTime.trim() === "等待中"
		? { label: "wait", isNow: false }
		: { label: travelTime, isNow: false };
}

function getLineColor(lines: string) {
	let hash = 0;

	for (const character of lines) {
		hash = (hash * 31 + (character.codePointAt(0) ?? 0)) | 0;
	}

	return LINE_COLORS[Math.abs(hash) % LINE_COLORS.length];
}

function BusRow({
	busName,
	busNumber,
	busTime,
	busColor,
	isHistorical,
	isLoading,
	isNow,
}: {
	busName: string;
	busNumber: string;
	busTime: string;
	busColor: string;
	isHistorical: boolean;
	isLoading: boolean;
	isNow: boolean;
}) {
	return (
		<section className="flex items-center gap-2">
			<div
				className={cn(
					"min-w-[30px] font-medium text-sm font-pixel-square",
					isHistorical ? "text-red-600" : busColor,
				)}
			>
				{Array.from(busNumber ?? "").map((digit, index) => (
					<span
						className="inline-block w-[0.6em] text-center"
						key={`${digit}-${index}`}
					>
						{digit}
					</span>
				))}
			</div>
			<div
				className={cn(
					"min-w-30 font-medium text-sm font-pixel-square",
					isHistorical && "text-red-600",
				)}
			>
				{busName}
			</div>
			<section
				className={cn(
					"min-w-[80px] flex items-center gap-0.5 font-pixel-square justify-end",
					isLoading && "opacity-40",
				)}
			>
				<WifiIcon
					className={cn(
						"mt-px",
						isHistorical ? "text-red-600" : "text-green-600",
					)}
				/>
				<div
					className={cn(
						"font-medium text-sm",
						isHistorical ? "text-red-600" : "text-green-600",
						isNow && !isHistorical && !isLoading && "bus-now-blink",
					)}
				>
					{busTime}
				</div>
			</section>
		</section>
	);
}

function WifiIcon({
	className,
	color,
}: {
	className?: string;
	color?: string;
}) {
	return (
		<svg
			className={cn("size-3", className)}
			fill={color ?? "currentColor"}
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>wifi</title>
			<g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
			<g
				id="SVGRepo_tracerCarrier"
				strokeLinecap="round"
				strokeLinejoin="round"
			></g>
			<g id="SVGRepo_iconCarrier">
				<path d="M20.364,3a1,1,0,0,1-1,1A15.381,15.381,0,0,0,4,19.363a1,1,0,0,1-2,0A17.384,17.384,0,0,1,19.364,2,1,1,0,0,1,20.364,3ZM7.909,20.363a1,1,0,0,0,1-1A10.467,10.467,0,0,1,19.364,8.909a1,1,0,1,0,0-2A12.469,12.469,0,0,0,6.909,19.363,1,1,0,0,0,7.909,20.363Zm5.909-1a5.552,5.552,0,0,1,5.546-5.545,1,1,0,0,0,0-2,7.554,7.554,0,0,0-7.546,7.545,1,1,0,0,0,2,0Zm7.182,0A1.637,1.637,0,1,0,19.364,21,1.637,1.637,0,0,0,21,19.364Z"></path>
			</g>
		</svg>
	);
}

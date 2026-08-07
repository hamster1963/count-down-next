import { cn } from "@/lib/utils";

export default function Page() {
	return (
		<div className="h-dvh flex flex-col items-center justify-center overflow-hidden">
			<section className="flex flex-col items-start">
				<BusRow
					busName="SoftwareWest"
					busNumber="581"
					busTime="1min"
					busColor="text-yellow-600"
				/>
				<BusRow
					busName="Workplace"
					busNumber="581"
					busTime="3min"
					busColor="text-blue-600"
				/>
				<BusRow
					busName="Workplace"
					busNumber="429"
					busTime="1min"
					busColor="text-red-600"
				/>
			</section>
		</div>
	);
}

function BusRow({
	busName,
	busNumber,
	busTime,
	busColor,
}: {
	busName?: string;
	busNumber?: string;
	busTime?: string;
	busColor?: string;
}) {
	return (
		<section className="flex items-center gap-2">
			<div
				className={cn(
					"min-w-[30px] font-medium text-sm font-pixel-square",
					busColor,
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
			<div className="min-w-30 font-medium text-sm font-pixel-square">
				{busName}
			</div>
			<section className="min-w-[50px] flex items-center gap-0.5 font-pixel-square justify-end">
				<WifiIcon className="text-green-600 mt-px" />
				<div className="font-medium text-sm text-green-600">{busTime}</div>
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

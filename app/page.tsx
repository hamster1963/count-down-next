"use client";

import { useEffect, useMemo, useState } from "react";
import AnimateCountClient from "@/components/animate-count";

export default function Page() {
	const targetDate = useMemo(() => {
		return new Date(2026, 3, 5, 0, 0, 0);
	}, []);

	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);

		return () => {
			window.clearInterval(id);
		};
	}, []);

	const remainingMs = Math.max(0, targetDate.getTime() - now);
	const totalSeconds = Math.floor(remainingMs / 1000);

	const days = Math.floor(totalSeconds / (24 * 60 * 60));
	const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
	const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
	const seconds = totalSeconds % 60;

	return (
		<div className="min-h-screen flex flex-col items-center justify-center">
			<div className="flex flex-row items-center leading-none">
				<div className="font-semibold">距离离职还有</div>
				<AnimateCountClient
					count={days}
					minDigits={1}
					className="font-semibold mx-1 tabular-nums"
				/>
				<div className="font-semibold">天</div>
				<AnimateCountClient
					count={hours}
					minDigits={2}
					className="font-semibold mx-1 tabular-nums"
				/>
				<div className="font-semibold">小时</div>
				<AnimateCountClient
					count={minutes}
					minDigits={2}
					className="font-semibold mx-1 tabular-nums"
				/>
				<div className="font-semibold">分钟</div>
				<AnimateCountClient
					count={seconds}
					minDigits={2}
					className="font-semibold mx-1 tabular-nums"
				/>
				<div className="font-semibold">秒</div>
			</div>
		</div>
	);
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "export",
	reactStrictMode: false,
	compiler: {
		removeConsole: {
			exclude: ["error"],
		},
	},
	reactCompiler: true,
	logging: {
		fetches: {
			fullUrl: true,
		},
	},
};

export default nextConfig;

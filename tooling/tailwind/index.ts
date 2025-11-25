import variablesPlugin from "@mertasan/tailwindcss-variables";
import colorVariable from "@mertasan/tailwindcss-variables/colorVariable";
import containerQueryPlugin from "@tailwindcss/container-queries";
import formsPlugin from "@tailwindcss/forms";
import typographyPlugin from "@tailwindcss/typography";
import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

export const lightVariables = {
	colors: {
		border: "#e5e7eb",
		input: "#d1d5db",
		ring: "#18181b",
		background: "#ffffff",
		foreground: "#18181b",
		primary: "#18181b",
		"primary-foreground": "#fafafa",
		secondary: "#f4f4f5",
		"secondary-foreground": "#18181b",
		destructive: "#ef4444",
		"destructive-foreground": "#ffffff",
		success: "#22c55e",
		"success-foreground": "#ffffff",
		muted: "#f4f4f5",
		"muted-foreground": "#71717a",
		accent: "#f4f4f5",
		"accent-foreground": "#18181b",
		popover: "#ffffff",
		"popover-foreground": "#18181b",
		card: "#ffffff",
		"card-foreground": "#18181b",
		highlight: "#71717a",
		"highlight-foreground": "#ffffff",
	},
};

export const darkVariables = {
	colors: {
		border: "#27272a",
		input: "#3f3f46",
		ring: "#d4d4d8",
		background: "#09090b",
		foreground: "#fafafa",
		primary: "#fafafa",
		"primary-foreground": "#18181b",
		secondary: "#27272a",
		"secondary-foreground": "#fafafa",
		destructive: "#ef4444",
		"destructive-foreground": "#ffffff",
		success: "#22c55e",
		"success-foreground": "#ffffff",
		muted: "#27272a",
		"muted-foreground": "#a1a1aa",
		accent: "#27272a",
		"accent-foreground": "#fafafa",
		popover: "#09090b",
		"popover-foreground": "#fafafa",
		card: "#09090b",
		"card-foreground": "#fafafa",
		highlight: "#a1a1aa",
		"highlight-foreground": "#ffffff",
	},
};

export default {
	content: [],
	darkMode: ["class"],
	theme: {
		container: {
			center: true,
			padding: "1.5rem",
		},
		extend: {
			boxShadow: {
				sm: "0 2px 8px 0 rgb(0, 0, 0, 0.025), 0 0 1px rgba(0,0,0,0.1)",
				DEFAULT: "0 4px 16px 0 rgb(0, 0, 0, 0.05), 0 0 1px rgba(0,0,0,0.1)",
				md: "0 6px 24px 0 rgb(0, 0, 0, 0.075), 0 0 1px rgba(0,0,0,0.1)",
				lg: "0 8px 32px 0 rgb(0, 0, 0, 0.1), 0 0 1px rgba(0,0,0,0.1)",
				xl: "0 12px 48px 0 rgb(0, 0, 0, 0.125), 0 0 1px rgba(0,0,0,0.1)",
				"2xl": "0 16px 64px 0 rgb(0, 0, 0, 0.15), 0 0 1px rgba(0,0,0,0.1)",
			},
			borderRadius: {
				lg: "0.75rem",
				md: "calc(0.75rem - 2px)",
				sm: "calc(0.75rem - 4px)",
			},
			fontFamily: {
				sans: ["var(--font-sans)", "sans-serif"],
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
			colors: {
				border: colorVariable("--colors-border"),
				input: colorVariable("--colors-input"),
				ring: colorVariable("--colors-ring"),
				background: colorVariable("--colors-background"),
				foreground: colorVariable("--colors-foreground"),
				primary: {
					DEFAULT: colorVariable("--colors-primary"),
					foreground: colorVariable("--colors-primary-foreground"),
				},
				secondary: {
					DEFAULT: colorVariable("--colors-secondary"),
					foreground: colorVariable("--colors-secondary-foreground"),
				},
				destructive: {
					DEFAULT: colorVariable("--colors-destructive"),
					foreground: colorVariable("--colors-destructive-foreground"),
				},
				success: {
					DEFAULT: colorVariable("--colors-success"),
					foreground: colorVariable("--colors-success-foreground"),
				},
				muted: {
					DEFAULT: colorVariable("--colors-muted"),
					foreground: colorVariable("--colors-muted-foreground"),
				},
				accent: {
					DEFAULT: colorVariable("--colors-accent"),
					foreground: colorVariable("--colors-accent-foreground"),
				},
				popover: {
					DEFAULT: colorVariable("--colors-popover"),
					foreground: colorVariable("--colors-popover-foreground"),
				},
				card: {
					DEFAULT: colorVariable("--colors-card"),
					foreground: colorVariable("--colors-card-foreground"),
				},
				highlight: {
					DEFAULT: colorVariable("--colors-highlight"),
					foreground: colorVariable("--colors-highlight-foreground"),
				},
			},
		},
		variables: {
			DEFAULT: lightVariables,
		},
		darkVariables: {
			DEFAULT: darkVariables,
		},
	},
	plugins: [
		formsPlugin({
			strategy: "base",
		}),
		typographyPlugin,
		animatePlugin,
		containerQueryPlugin,
		variablesPlugin({
			colorVariables: true,
		}),
	],
} satisfies Config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#e5e2e1",
        "primary": "#c0c1ff",
        "on-tertiary": "#003640",
        "on-primary": "#1000a9",
        "on-primary-container": "#0d0096",
        "surface-dim": "#131313",
        "on-primary-fixed": "#07006c",
        "secondary-fixed-dim": "#4edea3",
        "secondary-fixed": "#6ffbbe",
        "on-tertiary-container": "#002f38",
        "on-secondary-fixed-variant": "#005236",
        "surface-variant": "#353534",
        "on-tertiary-fixed": "#001f26",
        "surface-container": "#201f1f",
        "error-container": "#93000a",
        "outline": "#908fa0",
        "on-secondary-container": "#00311f",
        "on-surface": "#e5e2e1",
        "secondary-container": "#00a572",
        "surface-container-low": "#1c1b1b",
        "tertiary-fixed": "#acedff",
        "on-error-container": "#ffdad6",
        "surface-container-high": "#2a2a2a",
        "primary-fixed-dim": "#c0c1ff",
        "inverse-surface": "#e5e2e1",
        "surface-bright": "#3a3939",
        "tertiary-container": "#009eb9",
        "on-error": "#690005",
        "primary-fixed": "#e1e0ff",
        "on-primary-fixed-variant": "#2f2ebe",
        "inverse-primary": "#494bd6",
        "error": "#ffb4ab",
        "outline-variant": "#464554",
        "secondary": "#4edea3",
        "surface-tint": "#c0c1ff",
        "background": "#131313",
        "surface-container-lowest": "#0e0e0e",
        "on-secondary": "#003824",
        "on-surface-variant": "#c7c4d7",
        "tertiary": "#4cd7f6",
        "inverse-on-surface": "#313030",
        "surface": "#131313",
        "on-tertiary-fixed-variant": "#004e5c",
        "tertiary-fixed-dim": "#4cd7f6",
        "surface-container-highest": "#353534",
        "on-secondary-fixed": "#002113",
        "primary-container": "#8083ff"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "container-max": "1200px",
        "stack-md": "16px",
        "base": "4px",
        "margin-mobile": "16px",
        "stack-sm": "8px",
        "stack-lg": "32px",
        "gutter": "24px"
      },
      fontFamily: {
        "label-sm": ["JetBrains Mono", "monospace"],
        "headline-lg-mobile": ["Geist", "sans-serif"],
        "body-md": ["Geist", "sans-serif"],
        "display-lg": ["Geist", "sans-serif"],
        "code-md": ["JetBrains Mono", "monospace"],
        "headline-lg": ["Geist", "sans-serif"]
      },
      fontSize: {
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "display-lg": ["64px", { lineHeight: "72px", letterSpacing: "-0.04em", fontWeight: "700" }],
        "code-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }]
      }
    }
  },
  plugins: []
};
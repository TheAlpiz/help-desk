/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // All colors reference CSS variables defined in globals.css.
        // :root = light theme, .dark = dark theme.
        // Format: rgb(var(--md-xxx) / <alpha-value>) enables bg-primary/50 opacity modifiers.
        "background":                 "rgb(var(--md-background) / <alpha-value>)",
        "surface":                    "rgb(var(--md-surface) / <alpha-value>)",
        "surface-dim":                "rgb(var(--md-surface-dim) / <alpha-value>)",
        "surface-bright":             "rgb(var(--md-surface-bright) / <alpha-value>)",
        "surface-variant":            "rgb(var(--md-surface-variant) / <alpha-value>)",
        "surface-tint":               "rgb(var(--md-surface-tint) / <alpha-value>)",
        "surface-container":          "rgb(var(--md-surface-container) / <alpha-value>)",
        "surface-container-low":      "rgb(var(--md-surface-container-low) / <alpha-value>)",
        "surface-container-high":     "rgb(var(--md-surface-container-high) / <alpha-value>)",
        "surface-container-lowest":   "rgb(var(--md-surface-container-lowest) / <alpha-value>)",
        "surface-container-highest":  "rgb(var(--md-surface-container-highest) / <alpha-value>)",
        "on-background":              "rgb(var(--md-on-background) / <alpha-value>)",
        "on-surface":                 "rgb(var(--md-on-surface) / <alpha-value>)",
        "on-surface-variant":         "rgb(var(--md-on-surface-variant) / <alpha-value>)",
        "inverse-surface":            "rgb(var(--md-inverse-surface) / <alpha-value>)",
        "inverse-on-surface":         "rgb(var(--md-inverse-on-surface) / <alpha-value>)",
        "inverse-primary":            "rgb(var(--md-inverse-primary) / <alpha-value>)",
        "outline":                    "rgb(var(--md-outline) / <alpha-value>)",
        "outline-variant":            "rgb(var(--md-outline-variant) / <alpha-value>)",
        "primary":                    "rgb(var(--md-primary) / <alpha-value>)",
        "on-primary":                 "rgb(var(--md-on-primary) / <alpha-value>)",
        "primary-container":          "rgb(var(--md-primary-container) / <alpha-value>)",
        "on-primary-container":       "rgb(var(--md-on-primary-container) / <alpha-value>)",
        "primary-fixed":              "rgb(var(--md-primary-fixed) / <alpha-value>)",
        "primary-fixed-dim":          "rgb(var(--md-primary-fixed-dim) / <alpha-value>)",
        "on-primary-fixed":           "rgb(var(--md-on-primary-fixed) / <alpha-value>)",
        "on-primary-fixed-variant":   "rgb(var(--md-on-primary-fixed-variant) / <alpha-value>)",
        "secondary":                  "rgb(var(--md-secondary) / <alpha-value>)",
        "on-secondary":               "rgb(var(--md-on-secondary) / <alpha-value>)",
        "secondary-container":        "rgb(var(--md-secondary-container) / <alpha-value>)",
        "on-secondary-container":     "rgb(var(--md-on-secondary-container) / <alpha-value>)",
        "secondary-fixed":            "rgb(var(--md-secondary-fixed) / <alpha-value>)",
        "secondary-fixed-dim":        "rgb(var(--md-secondary-fixed-dim) / <alpha-value>)",
        "on-secondary-fixed":         "rgb(var(--md-on-secondary-fixed) / <alpha-value>)",
        "on-secondary-fixed-variant": "rgb(var(--md-on-secondary-fixed-variant) / <alpha-value>)",
        "tertiary":                   "rgb(var(--md-tertiary) / <alpha-value>)",
        "on-tertiary":                "rgb(var(--md-on-tertiary) / <alpha-value>)",
        "tertiary-container":         "rgb(var(--md-tertiary-container) / <alpha-value>)",
        "on-tertiary-container":      "rgb(var(--md-on-tertiary-container) / <alpha-value>)",
        "tertiary-fixed":             "rgb(var(--md-tertiary-fixed) / <alpha-value>)",
        "tertiary-fixed-dim":         "rgb(var(--md-tertiary-fixed-dim) / <alpha-value>)",
        "on-tertiary-fixed":          "rgb(var(--md-on-tertiary-fixed) / <alpha-value>)",
        "on-tertiary-fixed-variant":  "rgb(var(--md-on-tertiary-fixed-variant) / <alpha-value>)",
        "error":                      "rgb(var(--md-error) / <alpha-value>)",
        "on-error":                   "rgb(var(--md-on-error) / <alpha-value>)",
        "error-container":            "rgb(var(--md-error-container) / <alpha-value>)",
        "on-error-container":         "rgb(var(--md-on-error-container) / <alpha-value>)",
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

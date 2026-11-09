import type { Config } from "tailwindcss";

// Palette is taken from the projection booth: screen white, leader-tape
// blue, cue-mark red, gaffer-tape yellow, navy ink.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Black-and-blue theme. Same token names kept throughout the
        // codebase (just new values) so every component that already
        // references bg-paper / text-ink / border-fog / etc. re-themes
        // automatically with no per-component edits needed.
        paper: "#05070D",    // page background (near-black)
        surface: "#0E1220",  // cards, tables, inputs (dark navy)
        ink: "#EAF0FF",      // text (near-white, cool blue tint)
        muted: "#8C97C2",    // secondary text (muted blue-gray)
        fog: "#1E2740",      // rules and borders (dark blue)
        beam: "#3B5BFF",     // primary: links, hero fields, buttons (electric blue)
        beamDeep: "#2540C9", // hover/pressed state of beam
        cue: "#FF5C5C",      // spoiler + destructive markers (kept red for function, brightened for dark bg)
        tape: "#5EC8FF",     // highlights, focus ring, stars (icy blue, was yellow)
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
      },
      boxShadow: {
        // Was a dark-navy offset shadow for a light background — invisible
        // against the new near-black page, so this is now a blue glow
        // offset instead, which keeps the same "cutout card" look.
        block: "4px 4px 0 0 #3B5BFF",
        blockSm: "3px 3px 0 0 #3B5BFF",
      },
    },
  },
  plugins: [],
};
export default config;

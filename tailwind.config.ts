import type { Config } from "tailwindcss";

// Palette is taken from the projection booth: screen white, leader-tape
// blue, cue-mark red, gaffer-tape yellow, navy ink.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F7FB",    // page background (screen white, faintly cool)
        surface: "#FFFFFF",  // cards, tables, inputs
        ink: "#0D1030",      // text (navy, not black)
        muted: "#575E7E",    // secondary text
        fog: "#E3E6F1",      // rules and borders
        beam: "#2A3FF0",     // primary: links, hero fields, buttons
        beamDeep: "#1B2BB8", // hover/pressed state of beam
        cue: "#F23D2B",      // spoiler + destructive markers
        tape: "#FFD23F",     // highlights, focus ring, stars
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
      },
      boxShadow: {
        block: "4px 4px 0 0 #0D1030",
        blockSm: "3px 3px 0 0 #0D1030",
      },
    },
  },
  plugins: [],
};
export default config;

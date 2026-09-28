import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#2A3FF0",
                  }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 8,
            color: "#FFD23F",
            fontFamily: "sans-serif",
            marginBottom: 20,
          }}
        >
          🎬 MARQUEE 🍥
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "sans-serif",
            letterSpacing: 2,
          }}
        >
          Discover anime &amp; movies
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            color: "#DCE0FF",
            fontFamily: "sans-serif",
          }}
        >
          Rankings · Moods · Quizzes · Blog
        </div>
      </div>
    ),
    { ...size }
  );
}

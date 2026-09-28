import { ImageResponse } from "next/og";

// Google requires favicons in multiples of 48px; 48 is the one used in results.
export function generateImageMetadata() {
  return [48, 192, 512].map((s) => ({
    id: String(s),
    size: { width: s, height: s },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> | string | number }) {
  const s = Number(await id) || 48;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2A3FF0",
          color: "#FFD84A",
          fontSize: Math.round(s * 0.68),
          fontWeight: 800,
          borderRadius: Math.round(s * 0.2),
        }}
      >
        M
      </div>
    ),
    { width: s, height: s }
  );
}

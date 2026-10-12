import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "MVCorner - Maseno University Study Resources & Campus Marketplace";

// Skip static generation — ImageResponse has a known Windows incompatibility
// with fileURLToPath. The image will still be generated at request time on Vercel.
export const dynamic = "force-dynamic";

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
          background: "#050816",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Blue glow, top-left */}
        <div
          style={{
            position: "absolute",
            top: "-260px",
            left: "-220px",
            width: "800px",
            height: "800px",
            background:
              "radial-gradient(circle, rgba(37,86,232,0.45) 0%, rgba(37,86,232,0) 70%)",
          }}
        />
        {/* Violet glow, bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "-300px",
            right: "-220px",
            width: "840px",
            height: "840px",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.42) 0%, rgba(124,58,237,0) 70%)",
          }}
        />
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #2556E8, #7C3AED, #22D3EE)",
          }}
        />
        {/* Logo mark: gradient square, square top-right corner, cyan flag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "40px",
            width: "120px",
            height: "120px",
            borderTopLeftRadius: "26px",
            borderTopRightRadius: "0px",
            borderBottomRightRadius: "26px",
            borderBottomLeftRadius: "26px",
            background: "linear-gradient(135deg, #2556E8 0%, #7C3AED 100%)",
            position: "relative",
          }}
        >
          <svg width="120" height="120" viewBox="0 0 64 64" fill="none">
            <path
              d="M15.83 45.67V17.83L31.83 33.83 47.83 17.83V45.67"
              stroke="#F4F6FF"
              strokeWidth="5.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 33px 33px 0",
              borderColor: "transparent #22D3EE transparent transparent",
            }}
          />
        </div>
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "800",
            color: "#F4F6FF",
            marginBottom: "16px",
            lineHeight: "1.1",
            textAlign: "center",
          }}
        >
          MVCorner
        </h1>
        <p
          style={{
            fontSize: "30px",
            fontWeight: "400",
            color: "#93C5FD",
            marginBottom: "32px",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: "1.4",
          }}
        >
          Maseno University Study Resources &amp; Campus Marketplace
        </p>
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            left: "80px",
            right: "80px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: "20px", color: "#94A3B8" }}>
            Download • Upload • Buy • Sell
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
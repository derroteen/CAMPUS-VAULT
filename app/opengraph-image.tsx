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
          background: "linear-gradient(135deg, #122E23 0%, #1B4332 50%, #2FA66A 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            background: "linear-gradient(90deg, #FFD23F, #FF6B5B, #FFD23F)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "40px",
            width: "96px",
            height: "96px",
            borderRadius: "24px",
            background: "#1B4332",
            position: "relative",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <path
              d="M8 23V9L16 17L24 9V23"
              stroke="#FFFBF5"
              strokeWidth="2.6"
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
              borderWidth: "0 22px 22px 0",
              borderColor: "transparent #FFD23F transparent transparent",
              borderTopRightRadius: "24px",
            }}
          />
        </div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: "800",
            color: "#FFFBF5",
            marginBottom: "16px",
            lineHeight: "1.1",
            textAlign: "center",
          }}
        >
          MVCorner
        </h1>
        <p
          style={{
            fontSize: "28px",
            fontWeight: "400",
            color: "#FFD23F",
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
            bottom: "32px",
            left: "80px",
            right: "80px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: "18px", color: "#EAF3DE" }}>
            Download • Upload • Buy • Sell
          </p>
          <p style={{ fontSize: "18px", color: "#EAF3DE" }}>
            campusvault.top
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
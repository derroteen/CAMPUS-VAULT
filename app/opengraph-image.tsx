import { ImageResponse } from "next/og";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Campus Vault - Maseno University Study Resources";

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
          background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)",
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
            background: "linear-gradient(90deg, #0284c7, #38bdf8, #0284c7)",
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
            background: "#0284c7",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 192 192"
            fill="none"
          >
            <polygon points="96,24 16,64 96,104 176,64" fill="white" />
            <rect x="92" y="104" width="8" height="40" fill="white" />
            <polygon points="96,144 88,160 104,160" fill="white" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: "800",
            color: "#f8fafc",
            marginBottom: "16px",
            lineHeight: "1.1",
            textAlign: "center",
          }}
        >
          Campus Vault
        </h1>
        <p
          style={{
            fontSize: "28px",
            fontWeight: "400",
            color: "#38bdf8",
            marginBottom: "32px",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: "1.4",
          }}
        >
          Maseno University Notes, Past Papers &amp; Study Resources
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
          <p style={{ fontSize: "18px", color: "#64748b" }}>
            Download • Upload • Unlock
          </p>
          <p style={{ fontSize: "18px", color: "#64748b" }}>
            campus-vault-six.vercel.app
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
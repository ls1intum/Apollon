import React from "react"
import { useNavigate } from "react-router"

type ErrorPageProps = {
  title?: string
  message?: string
  buttonLabel?: string
  backPath?: string
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = "Oops!",
  message = "Something went wrong.",
  buttonLabel = "Go Home",
  backPath = "/",
}) => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        textAlign: "center",
        overflow: "hidden",
        backgroundColor: "var(--home-bg-primary)",
        color: "var(--home-text-primary)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--home-accent-color) 20%, transparent), transparent 52%), radial-gradient(circle at 95% 100%, color-mix(in srgb, var(--apollon-guide-horizontal) 16%, transparent), transparent 50%)",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(92vw, 680px)",
          borderRadius: "16px",
          border: "1px solid var(--home-border-color)",
          backgroundColor: "var(--home-bg-card)",
          padding: "32px 28px",
          boxShadow:
            "0 16px 32px -24px rgba(24, 38, 52, 0.22), 0 7px 14px -10px rgba(24, 38, 52, 0.14)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
            width: "100%",
          }}
        >
          <svg
            aria-hidden="true"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: "block", flexShrink: 0 }}
          >
            <path
              d="M7 7l10 10M17 7L7 17"
              stroke="var(--apollon-alert-danger-color)"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              margin: 0,
              lineHeight: 1,
              color: "var(--home-text-primary)",
            }}
          >
            {title}
          </h1>
        </div>
        <p
          style={{
            fontSize: "1.2rem",
            color: "var(--home-text-secondary)",
            marginTop: "10px",
            marginBottom: 0,
          }}
        >
          {message}
        </p>
        <button
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            backgroundColor: "var(--home-accent-color)",
            color: "#fff",
            border: "1px solid var(--home-accent-color)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={() => navigate(backPath)}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}

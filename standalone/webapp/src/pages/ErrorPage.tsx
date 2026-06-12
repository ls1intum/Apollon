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
  buttonLabel = "All diagrams",
  backPath = "/",
}) => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        textAlign: "center",
        backgroundColor: "var(--apollon-background)",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: "bold",
          color: "var(--apollon-guide-vertical)",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: "1.2rem",
          color: "var(--apollon-primary-contrast)",
          marginTop: "8px",
        }}
      >
        {message}
      </p>
      <button
        style={{
          marginTop: "16px",
          padding: "10px 20px",
          backgroundColor: "var(--apollon-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={() => navigate(backPath)}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

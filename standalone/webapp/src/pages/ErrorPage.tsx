import React from "react"
import { Link } from "@tanstack/react-router"

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
      <Link
        to={backPath}
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--home-accent-ring)]"
        style={{
          marginTop: "16px",
          padding: "10px 20px",
          backgroundColor: "var(--apollon-primary)",
          color: "var(--home-on-accent-text)",
          borderRadius: "5px",
          cursor: "pointer",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {buttonLabel}
      </Link>
    </div>
  )
}

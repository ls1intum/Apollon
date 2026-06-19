import React from "react"
import { Link } from "@tanstack/react-router"

type ErrorPageProps = {
  title?: string
  message?: string
  buttonLabel?: string
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = "Oops!",
  message = "Something went wrong.",
  buttonLabel = "All diagrams",
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
        to="/"
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--home-accent-ring)]"
        style={{
          marginTop: "16px",
          padding: "10px 20px",
          backgroundColor: "var(--apollon-primary)",
          color: "#fff",
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

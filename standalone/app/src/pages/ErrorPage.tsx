import React from "react"
import { useNavigate } from "react-router"

export const ErrorPage: React.FC = () => {
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
        backgroundColor: "#f8f8f8",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#d9534f" }}>
        Oops!
      </h1>
      <p style={{ fontSize: "1.2rem", color: "#333", marginTop: "8px" }}>
        Something went wrong.
      </p>
      <button
        style={{
          marginTop: "16px",
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/")}
      >
        Go Home
      </button>
    </div>
  )
}

import React from "react"
import { Link } from "@tanstack/react-router"
import { navbarButtonStyle } from "@/components/navbar/styleConstants"

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
    <div className="home-canvas-bg flex h-full flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-bold text-foreground md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-base text-muted-foreground">{message}</p>
      <Link
        to={backPath}
        className={navbarButtonStyle("apollon-chrome-accent-btn mt-4")}
      >
        {buttonLabel}
      </Link>
    </div>
  )
}

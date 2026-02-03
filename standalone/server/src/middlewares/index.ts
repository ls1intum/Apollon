import express, { Express } from "express"
import { errorHandler } from "./errors"
import { configureCors } from "./cors"

export function configureMiddlewares(app: Express) {
  app.use(configureCors()) // Configure CORS
  // Increase JSON payload limit for SVG and diagram model data
  app.use(express.json({ limit: "50mb" }))
  app.use(errorHandler) // Error handling middleware
}

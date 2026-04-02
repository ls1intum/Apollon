import express, { Express } from "express"
import { errorHandler } from "./errors"
import { configureCors } from "./cors"

export function configureMiddlewares(app: Express) {
  app.use(configureCors()) // Configure CORS
  app.use(express.json({ limit: "10mb" }))
  app.use(errorHandler) // Error handling middleware
}

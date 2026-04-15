import express, { Express } from "express"
import { configureCors } from "./cors"

export function configureMiddlewares(app: Express) {
  app.use(configureCors()) // Configure CORS
  app.use(express.json({ limit: "10mb" }))
}

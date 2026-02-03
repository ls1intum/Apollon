/**
 * RenderPage - Headless rendering page for server-side PDF/SVG generation
 *
 * This page is designed to be loaded by Playwright/Puppeteer for server-side
 * diagram rendering. It accepts a model via query parameter OR via injected
 * window property (for large models that exceed URL limits).
 *
 * Usage:
 *   /render?model=<base64-encoded-json>
 *   OR inject via: window.__APOLLON_INJECTED_MODEL__ = jsonString
 *
 * The page exposes:
 *   window.__APOLLON_RENDER_READY__: boolean - true when rendering is complete
 *   window.__APOLLON_EXPORT_SVG__(): Promise<{svg: string, clip: {x, y, width, height}}>
 *   window.__APOLLON_ERROR__: string | null - error message if rendering failed
 */
import { ApollonEditor, UMLModel } from "@tumaet/apollon"
import React, { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router"

// Extend window type for our custom properties
declare global {
  interface Window {
    __APOLLON_RENDER_READY__: boolean
    __APOLLON_EXPORT_SVG__: () => Promise<{
      svg: string
      clip: { x: number; y: number; width: number; height: number }
    }>
    __APOLLON_ERROR__: string | null
    __APOLLON_INJECTED_MODEL__?: string
  }
}

export const RenderPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<ApollonEditor | null>(null)
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Initialize global state
    window.__APOLLON_RENDER_READY__ = false
    window.__APOLLON_ERROR__ = null

    // Check for model from URL parameter or injected via Playwright
    const modelParam = searchParams.get("model")
    const injectedModel = window.__APOLLON_INJECTED_MODEL__

    if (!modelParam && !injectedModel) {
      const err = "No model parameter provided"
      setError(err)
      window.__APOLLON_ERROR__ = err
      return
    }

    if (!containerRef.current) {
      const err = "Container not available"
      setError(err)
      window.__APOLLON_ERROR__ = err
      return
    }

    try {
      // Parse model from either source
      // Injected model is already JSON string, URL param is base64 encoded
      let modelJson: string
      if (injectedModel) {
        modelJson = injectedModel
      } else {
        modelJson = atob(modelParam!)
      }
      const model: UMLModel = JSON.parse(modelJson)

      // Create the editor instance
      const instance = new ApollonEditor(containerRef.current, {
        model,
        readonly: true,
        enablePopups: false,
      })

      editorRef.current = instance

      // Expose export function
      window.__APOLLON_EXPORT_SVG__ = async () => {
        if (!editorRef.current) {
          throw new Error("Editor not initialized")
        }
        return editorRef.current.exportAsSVG()
      }

      // Mark as ready after a longer delay to ensure React Flow and edges are fully initialized
      // Edges with markers need extra time to calculate positions
      const readyTimeout = setTimeout(() => {
        window.__APOLLON_RENDER_READY__ = true
        setReady(true)
      }, 1500)

      return () => {
        clearTimeout(readyTimeout)
        if (editorRef.current) {
          editorRef.current.destroy()
          editorRef.current = null
        }
      }
    } catch (e) {
      const err = `Failed to parse model: ${(e as Error).message}`
      setError(err)
      window.__APOLLON_ERROR__ = err
    }
  }, [searchParams])

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "red",
        }}
      >
        Error: {error}
      </div>
    )
  }

  return (
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        height: "100vh",
        width: "100vw",
        position: "absolute",
        top: 0,
        left: 0,
      }}
      ref={containerRef}
      data-ready={ready}
      data-testid="render-container"
    />
  )
}

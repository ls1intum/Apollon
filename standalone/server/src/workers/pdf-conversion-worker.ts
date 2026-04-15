import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { UMLModel } from "@tumaet/apollon"
import { ConversionService } from "../services/conversion-service"

async function readStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    process.stdin.on("data", (chunk: Buffer) => {
      chunks.push(chunk)
    })

    process.stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"))
    })

    process.stdin.on("error", reject)
  })
}

async function renderPdf(model: UMLModel): Promise<Buffer> {
  const conversionService = new ConversionService()
  const { svg, clip } = await conversionService.convertToSvg(model)
  const { width, height } = clip

  pdfMake.vfs = pdfFonts.vfs

  const doc = pdfMake.createPdf({
    content: [
      {
        svg,
      },
    ],
    pageSize: { width, height },
    pageMargins: 0,
  })

  return await new Promise<Buffer>((resolve, reject) => {
    void (doc as any).getStream().then((stream: NodeJS.ReadableStream) => {
      const chunks: Buffer[] = []

      stream.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })

      stream.on("end", () => {
        resolve(Buffer.concat(chunks))
      })

      stream.on("error", reject)
      stream.resume()
      ;(stream as { end?: () => void }).end?.()
    }, reject)
  })
}

async function main() {
  const input = await readStdin()
  const model = JSON.parse(input) as UMLModel
  const pdf = await renderPdf(model)
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(pdf, (error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})

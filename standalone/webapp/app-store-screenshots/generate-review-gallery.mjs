import { readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const fastlaneDirectory = path.resolve(scriptDirectory, "../fastlane")
const rawDirectory = path.join(fastlaneDirectory, "screenshots/en-US")
const outputPath = path.join(fastlaneDirectory, "screenshots-review.html")

const files = (await readdir(rawDirectory))
  .filter((file) => file.endsWith(".png"))
  .sort((left, right) => left.localeCompare(right))

const devices = [...new Set(files.map((file) => file.split("-0")[0]))]

const imagePath = (directory, file) =>
  `${directory}/${file.split("/").map(encodeURIComponent).join("/")}`

const sections = devices
  .map((device) => {
    const deviceFiles = files.filter((file) => file.startsWith(device))
    const rows = deviceFiles
      .map((file) => {
        const title = file
          .replace(`${device}-`, "")
          .replace(".png", "")
          .replaceAll("-", " ")

        return `
          <article class="comparison">
            <h3>${title}</h3>
            <div class="pair">
              <figure>
                <figcaption>Framed candidate</figcaption>
                <a href="${imagePath("screenshots-framed/en-US", file)}">
                  <img src="${imagePath("screenshots-framed/en-US", file)}" alt="${device} ${title}, framed">
                </a>
              </figure>
              <figure>
                <figcaption>Raw Simulator master</figcaption>
                <a href="${imagePath("screenshots/en-US", file)}">
                  <img src="${imagePath("screenshots/en-US", file)}" alt="${device} ${title}, raw">
                </a>
              </figure>
            </div>
          </article>
        `
      })
      .join("")

    return `
      <section>
        <h2>${device}</h2>
        ${rows}
      </section>
    `
  })
  .join("")

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Apollon App Store screenshot review</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        background: #071a2c;
        color: #f5f8fb;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0 auto;
        max-width: 1500px;
        padding: 48px 28px 80px;
      }

      h1 {
        margin-bottom: 8px;
      }

      .intro {
        color: #bdc9d5;
        margin: 0 0 48px;
      }

      section {
        margin-top: 56px;
      }

      .comparison {
        background: #102b45;
        border: 1px solid #284760;
        border-radius: 18px;
        margin: 24px 0;
        padding: 24px;
      }

      .comparison h3 {
        margin: 0 0 20px;
      }

      .pair {
        align-items: start;
        display: grid;
        gap: 24px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      figure {
        margin: 0;
      }

      figcaption {
        color: #dce6ee;
        font-weight: 700;
        margin-bottom: 10px;
      }

      img {
        background: #d9dde3;
        border-radius: 8px;
        display: block;
        height: auto;
        width: 100%;
      }

      @media (max-width: 760px) {
        body {
          padding: 28px 16px 48px;
        }

        .pair {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <h1>Apollon App Store screenshot review</h1>
    <p class="intro">
      Framed candidates and untouched Simulator masters. Select an image to
      inspect its full-resolution, App Store-sized PNG.
    </p>
    ${sections}
  </body>
</html>
`

await writeFile(outputPath, html)
console.log(`Review gallery: ${outputPath}`)

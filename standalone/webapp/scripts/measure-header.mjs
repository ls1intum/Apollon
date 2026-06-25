// Header responsiveness probe. Sweeps viewport widths across every routed page
// and measures the visible header islands — their boxes, the gaps between them,
// dead space, wrap/overflow, the search field width, and which action controls
// are labelled vs icon-only — so we can see where the band wastes space (too
// defensive: icon-only while there's room) or crowds (too aggressive: overflow /
// wrap / starved search).
//
//   node scripts/measure-header.mjs            # assumes vite on :5173
//   BASE=http://localhost:5173 node scripts/measure-header.mjs
import { chromium } from "playwright"

const BASE = process.env.BASE || "http://localhost:5173"
const ROUTES = [
  { name: "home", path: "/" },
  { name: "imprint", path: "/imprint" },
  { name: "404", path: "/this-route-does-not-exist" },
]
// Dense around the collapse zone (600–1100), sparser at the extremes.
const WIDTHS = [
  320, 360, 390, 420, 460, 500, 540, 580, 620, 639, 640, 680, 720, 760, 767,
  768, 800, 840, 880, 920, 960, 1000, 1023, 1024, 1080, 1160, 1280, 1366, 1440,
  1600, 1920,
]

function measure() {
  // Declared inside `measure` because this body runs in the browser (page
  // .evaluate) and can't see module scope.
  const ACTION_LABELS = [
    "Refine",
    "Import",
    "New diagram",
    "Help",
    "All diagrams",
  ]
  const inHeader = (el) => el.getBoundingClientRect().top < 160
  const islands = [...document.querySelectorAll(".apollon-chrome-island")]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && inHeader(el)
    })
    .map((el) => {
      const r = el.getBoundingClientRect()
      return {
        el,
        left: r.left,
        right: r.right,
        top: r.top,
        w: r.width,
        h: r.height,
      }
    })
    .sort((a, b) => a.left - b.left)
  if (!islands.length) return { err: "no islands" }

  const vpW = window.innerWidth
  const tops = islands.map((i) => Math.round(i.top))
  const wrapped = Math.max(...tops) - Math.min(...tops) > 4
  const rightMost = Math.max(...islands.map((i) => i.right))
  const rightInset = Math.round(vpW - rightMost)
  const overflow =
    rightInset < -1 || document.documentElement.scrollWidth > vpW + 1

  // gaps between consecutive islands (dead space in the band)
  const gaps = []
  for (let i = 1; i < islands.length; i++)
    gaps.push(Math.round(islands[i].left - islands[i - 1].right))

  // search field (desktop islands) — dead space to its right inside its island
  const input = document.querySelector('input[type="search"]')
  let searchW = 0
  let searchDeadR = 0
  if (input) {
    const ir = input.getBoundingClientRect()
    searchW = Math.round(ir.width)
    const island = islands.find((i) => i.left <= ir.left && i.right >= ir.right)
    if (island) searchDeadR = Math.round(island.right - ir.right)
  }

  // which action labels are actually visible (icon-only vs labelled)
  const actions = islands[islands.length - 1].el
  const visibleText = [...actions.querySelectorAll("button, a")]
    .filter((b) => b.getBoundingClientRect().width > 0)
    // innerText (NOT textContent) so labels hidden via `hidden lg:inline`
    // correctly read as empty — i.e. icon-only is detected as icon-only.
    .map((b) => (b.innerText || "").replace(/\s+/g, " ").trim())
    .join(" | ")
  const labels = ACTION_LABELS.filter((l) => visibleText.includes(l))

  return {
    vpW,
    band: wrapped ? "WRAP" : "1row",
    bandH: Math.round(Math.max(...islands.map((i) => i.h))),
    ovf: overflow ? "OVF" : "-",
    rightInset,
    islW: islands.map((i) => Math.round(i.w)),
    gaps,
    searchW,
    searchDeadR,
    labels,
  }
}

const b = await chromium.launch()
for (const route of ROUTES) {
  console.log(`\n===== ${route.name}  (${route.path}) =====`)
  console.log(
    "width | band | bandH | ovf | rInset | islandWs | gaps | searchW | deadR | action-labels"
  )
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(BASE + route.path, {
    waitUntil: "domcontentloaded",
    timeout: 40000,
  })
  await page.waitForTimeout(2500)
  const issues = []
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 720 })
    await page.waitForTimeout(180)
    const m = await page.evaluate(measure)
    if (m.err) {
      console.log(`${String(w).padStart(5)} | ${m.err}`)
      continue
    }
    const row = [
      String(w).padStart(5),
      m.band.padEnd(4),
      String(m.bandH).padStart(5),
      m.ovf.padEnd(3),
      String(m.rightInset).padStart(6),
      `[${m.islW.join(",")}]`.padEnd(16),
      `[${m.gaps.join(",")}]`.padEnd(12),
      String(m.searchW).padStart(7),
      String(m.searchDeadR).padStart(5),
      m.labels.join(",") || "(icons)",
    ].join(" | ")
    console.log(row)
    if (m.band === "WRAP") issues.push(`${w}: WRAP`)
    if (m.ovf === "OVF") issues.push(`${w}: OVERFLOW (inset ${m.rightInset})`)
    if (m.searchDeadR > 40)
      issues.push(`${w}: search dead-right ${m.searchDeadR}px`)
    const maxGap = Math.max(0, ...m.gaps)
    const minGap = m.gaps.length ? Math.min(...m.gaps) : 0
    // A SINGLE large gap = a one-sided void (content shoved to the edges, dead
    // glass between) — waste. Two ~symmetric large gaps = a deliberately CENTRED
    // middle island (the title/search), i.e. intentional masthead whitespace, not
    // waste. Only the one-sided / lopsided cases are flagged.
    if (m.gaps.length === 1 && maxGap > 40)
      issues.push(`${w}: one-sided void ${maxGap}px`)
    else if (m.gaps.length >= 2 && maxGap > 40 && maxGap - minGap > 48)
      issues.push(`${w}: lopsided gap ${maxGap}/${minGap}px`)
  }
  await page.close()
  console.log(
    issues.length
      ? `ISSUES:\n  - ${issues.join("\n  - ")}`
      : "no flagged issues"
  )
}
await b.close()

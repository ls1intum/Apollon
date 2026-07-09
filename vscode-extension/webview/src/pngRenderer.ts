/**
 * The PNG renderer, alone.
 *
 * A bundler keeps every export of a dynamically imported module, since nothing
 * constrains what its namespace object is read for. `@tumaet/apollon/export`
 * also exports `svgToPdf`, so importing it directly pulls jsPDF, svg2pdf and
 * html2canvas — around 860 kB — into the VSIX for a code path this webview never
 * takes. Narrowing the namespace to one binding lets them be shaken out.
 */
export { svgToPng } from "@tumaet/apollon/export"

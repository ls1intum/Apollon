import * as vscode from "vscode"

const nonce = (): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64")

export function renderWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const asset = (name: string) =>
    webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "webview", "dist", name)
    )
  const scriptNonce = nonce()

  const csp = [
    `default-src 'none'`,
    // `blob:` is required for PNG export: the SVG→PNG converter loads the
    // rendered SVG into an <img> via URL.createObjectURL before drawing it to a
    // canvas. `data:` covers images inlined in the SVG.
    `img-src ${webview.cspSource} https: data: blob:`,
    `script-src 'nonce-${scriptNonce}'`,
    // React Flow writes inline `style` attributes on nodes and edges at runtime,
    // which a nonce-based CSP cannot cover. Keep until that stops being true.
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    // The editor's stylesheet embeds its webfonts as `data:` URIs.
    `font-src ${webview.cspSource} data:`,
  ].join("; ")

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <link rel="stylesheet" href="${asset("index.css")}" />
  </head>
  <body>
    <noscript>You need to enable JavaScript to edit Apollon diagrams.</noscript>
    <div id="root"></div>
    <script type="module" nonce="${scriptNonce}" src="${asset("index.js")}"></script>
  </body>
</html>
`
}

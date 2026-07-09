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
    // `data:` covers images inlined in the diagram's SVG.
    `img-src ${webview.cspSource} https: data:`,
    // The nonce covers the entry module; `cspSource` covers the chunks it
    // `import()`s (a nonce does not propagate to imported modules), and it only
    // ever resolves to this extension's own `localResourceRoots`.
    // `wasm-unsafe-eval` instantiates the resvg module the PNG export renders
    // with. It permits WebAssembly compilation only, not `eval`.
    `script-src 'nonce-${scriptNonce}' ${webview.cspSource} 'wasm-unsafe-eval'`,
    // The PNG export fetches the resvg binary (a webview asset) and the
    // library's `data:`-embedded fonts.
    `connect-src ${webview.cspSource} data:`,
    // React Flow writes inline `style` attributes on nodes and edges at runtime,
    // which a nonce-based CSP cannot cover.
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

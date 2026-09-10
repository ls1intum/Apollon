package de.tum.cit.aet.apollon.theme

import com.intellij.openapi.editor.colors.EditorColorsManager
import java.awt.Color
import javax.swing.UIManager

/**
 * The handful of `--apollon-*` custom properties the library auto-derives its
 * full chrome ramp from — mirrors what the VS Code extension's `index.css`
 * binds to `--vscode-*` tokens (see that file), computed here instead since
 * there is no equivalent CSS-token layer inside a JCEF page to bind through.
 * Only chrome is pushed: the functional palette (grid, node fills,
 * collaboration cursors, ...) stays the library's own, unrelated to editor
 * surface colors.
 */
data class ThemeTokens(
    val dark: Boolean,
    val background: Color,
    val foreground: Color,
    val secondary: Color,
    val primary: Color,
    val surface: Color,
    val surfaceSunken: Color,
    val border: Color,
    val borderSubtle: Color,
    val danger: Color,
)

/**
 * Samples the IDE's current look and feel. Every non-editor-scheme lookup
 * has a literal fallback: `UIManager` keys are LaF-specific and not
 * guaranteed present across Darcula, the light theme, and any third-party
 * LaF a user has installed.
 */
fun currentThemeTokens(): ThemeTokens {
    val manager = EditorColorsManager.getInstance()
    val scheme = manager.globalScheme
    val dark = manager.isDarkEditor
    val background = scheme.defaultBackground
    val foreground = scheme.defaultForeground
    return ThemeTokens(
        dark = dark,
        background = background,
        foreground = foreground,
        secondary = UIManager.getColor("Label.disabledForeground") ?: foreground,
        primary =
            UIManager.getColor("Component.focusColor")
                ?: UIManager.getColor("Focus.color")
                ?: Color(0x3e, 0x8a, 0xcc),
        surface = UIManager.getColor("Panel.background") ?: background,
        surfaceSunken = UIManager.getColor("TextField.background") ?: background,
        border =
            UIManager.getColor("Component.borderColor")
                ?: UIManager.getColor("Separator.separatorColor")
                ?: Color(0xce, 0xd4, 0xda),
        borderSubtle = UIManager.getColor("Separator.separatorColor") ?: Color(0xe9, 0xec, 0xef),
        danger = if (dark) Color(0xf1, 0x4c, 0x4c) else Color(0xd3, 0x33, 0x33),
    )
}

private fun Color.toCss(): String = "rgba(%d, %d, %d, %.3f)".format(red, green, blue, alpha / 255.0)

private fun ThemeTokens.toCssDeclarations(): Map<String, String> =
    linkedMapOf(
        "--apollon-background" to background.toCss(),
        "--apollon-foreground" to foreground.toCss(),
        "--apollon-secondary" to secondary.toCss(),
        "--apollon-primary" to primary.toCss(),
        "--apollon-surface" to surface.toCss(),
        "--apollon-surface-sunken" to surfaceSunken.toCss(),
        "--apollon-border" to border.toCss(),
        "--apollon-border-subtle" to borderSubtle.toCss(),
        "--apollon-danger" to danger.toCss(),
    )

private fun jsStringLiteral(value: String): String = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

/**
 * The script `ApollonFileEditor` runs (via `executeJavaScript`) to apply
 * these tokens: `data-theme` for the library's light/dark deltas, plus one
 * `style.setProperty` per chrome token — see `theme.ts` and `index.css` on
 * the webview side for where these land.
 */
fun ThemeTokens.toInjectionScript(): String {
    val setters =
        toCssDeclarations().entries.joinToString("\n") { (name, value) ->
            "document.documentElement.style.setProperty(${jsStringLiteral(name)}, ${jsStringLiteral(value)});"
        }
    val theme = jsStringLiteral(if (dark) "dark" else "light")
    return "document.documentElement.dataset.theme = $theme;\n$setters"
}

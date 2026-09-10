import org.jetbrains.intellij.platform.gradle.tasks.VerifyPluginTask
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.intellij.platform)
}

// The version carrier is `package.json`, not this file — see its comment for
// why: Changesets (the JS-side release tool already used everywhere else in
// this monorepo) needs a package.json to version and release-note the plugin
// alongside `@tumaet/apollon`, and duplicating the number here would drift.
version =
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")
        .find(file("package.json").readText())!!
        .groupValues[1]

repositories {
    mavenCentral()
    intellijPlatform {
        // Omitting this is the single most common cause of
        // "Could not find idea:ideaIC:…" — it is easy to mistake for the
        // unrelated 2025.3+ Community-artifact removal.
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // The compile-time floor, not a ceiling: `intellijIdeaCommunity(...)`
        // is only published for platform versions < 2025.3 (build 253), and
        // 2025.2 (252) is the newest branch where it still resolves. Compile
        // against this floor; the Plugin Verifier (Phase 6 CI) checks
        // compatibility against newer IDEs, including WebStorm.
        intellijIdeaCommunity(libs.versions.intellijIdeaCommunity)
    }
    implementation(libs.kotlinx.serialization.json)
    testImplementation(libs.junit)
}

// No `kotlin.jvmToolchain(...)`, deliberately: that would pull in a JDK
// auto-provisioning resolver just to get a JDK 21 this build doesn't need to
// run on. `--release`/`-Xjdk-release` produce byte-identical JDK-21 class
// files (major version 65) regardless of which JDK actually runs Gradle.
tasks.withType<JavaCompile>().configureEach {
    options.release = libs.versions.javaTarget.get().toInt()
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_21
        // Emitted language/API level is capped at what IntelliJ Platform 252
        // actually bundles (kotlin-stdlib 2.1.20), independent of how new the
        // compiler itself is — see the comment in gradle/libs.versions.toml.
        apiVersion = KotlinVersion.KOTLIN_2_1
        languageVersion = KotlinVersion.KOTLIN_2_1
        freeCompilerArgs.add("-Xjdk-release=${libs.versions.javaTarget.get()}")
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "252"
            // Explicitly open. The default derives an `until-build` of
            // "252.*" from the compile-time target above, which would make
            // this plugin uninstallable on every IDE release after 2025.2 —
            // including whatever is currently shipping. Revisit only if the
            // Plugin Verifier (Phase 6) finds an actual incompatibility.
            untilBuild = provider { null }
        }
        // Populated per-release by CI (`-PpluginChangeNotes=...`, rendered from
        // this package's CHANGELOG.md section via the same
        // scripts/extract-changelog.mjs the other release workflows use). A
        // dev build has no release to describe, so it falls back to pointing
        // at the file directly rather than shipping an empty section.
        changeNotes =
            providers.gradleProperty("pluginChangeNotes").orElse(
                "See the <a href=\"https://github.com/ls1intum/Apollon/blob/main/jetbrains-plugin/CHANGELOG.md\">changelog</a>.",
            )
    }

    pluginVerification {
        ides {
            // The IDEs JetBrains itself recommends verifying against for the
            // declared sinceBuild/untilBuild range — not just the 2025.2
            // compile-time floor, so a newer IDE release that removes or
            // changes an API this plugin calls is caught here instead of by a
            // user's bug report.
            recommended()
        }
        // `isApplicable`/`isDoNotActivateOnStart`/`getIcon`/`getAnchor` on
        // `ToolWindowFactory` are deprecated/internal *on the interface
        // itself* — implementing it at all makes the Verifier report them as
        // "overridden", regardless of whether this plugin's source touches
        // them. Failing the build on that would mean no `ToolWindowFactory`
        // implementation could ever pass. Gate on the categories that
        // actually indicate a broken plugin instead.
        //
        // MISSING_DEPENDENCIES is deliberately excluded too: plugin.xml
        // declares <module name="intellij.platform.ui.jcef"/> because
        // `com.intellij.ui.jcef.JBCefApp` moved into that content module
        // starting with the 2026.2 platform line (undeclared, it's a runtime
        // NoClassDefFoundError on 2026.2+ — see e.g.
        // https://github.com/asciidoctor/asciidoctor-intellij-plugin/issues/2073
        // and https://github.com/cline/cline/issues/11830 hitting the exact
        // same class). Our own sinceBuild floor (252 / 2025.2) predates that
        // split: verified directly against the downloaded IC-252.28539.97's
        // product-info.json that the module simply isn't listed there yet, so
        // `recommended()`'s older end of the range always reports this
        // dependency as unresolvable even though the plugin loads fine on it
        // (JBCefApp was reachable the pre-split way there).
        failureLevel =
            listOf(
                VerifyPluginTask.FailureLevel.COMPATIBILITY_PROBLEMS,
                VerifyPluginTask.FailureLevel.INVALID_PLUGIN,
                VerifyPluginTask.FailureLevel.NOT_DYNAMIC,
            )
    }

    // No real Marketplace signing key/token exists in this environment — these
    // read from env vars that CI would provide (see
    // .github/workflows/release-jetbrains-plugin.yml) and stay unset locally.
    // `signPlugin`/`publishPlugin` only fail on a missing value if actually
    // invoked; every other task (build, test, verifyPlugin) is unaffected.
    signing {
        certificateChain = providers.environmentVariable("JETBRAINS_CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("JETBRAINS_PRIVATE_KEY")
        password = providers.environmentVariable("JETBRAINS_PRIVATE_KEY_PASSWORD")
    }
    publishing {
        token = providers.environmentVariable("JETBRAINS_MARKETPLACE_TOKEN")
    }
}

// JUnit 4 (libs.junit), not JUnit 5/Jupiter — this is the version the
// IntelliJ Platform Test Framework itself is built against, so platform
// fixture tests (Phase 3+, `LightPlatformTestCase` and friends) and these
// plain unit tests share one test engine. `useJUnitPlatform()` would need
// the JUnit Vintage engine added just to run these; skip both.

// Gradle does not shell out to pnpm itself — building `webview/dist` is the
// same `pnpm run build:jetbrains` step CI and local dev already use for
// every other workspace in this monorepo. This only copies the result into
// `src/main/resources/webview`, where `ApollonWebviewRequestHandler` reads it
// from the classpath at runtime (see that class for why `file://` cannot be
// used instead). A `Sync`, not a `Copy`: Vite content-hashes chunk filenames,
// and a plain copy would leave every previous build's stale hashed chunk
// behind forever.
val copyWebviewAssets =
    tasks.register<Sync>("copyWebviewAssets") {
        val distDir = layout.projectDirectory.dir("webview/dist")
        doFirst {
            check(distDir.asFile.exists()) {
                "webview/dist is missing — run `pnpm run build:jetbrains` " +
                    "(from the repo root) before building the plugin."
            }
        }
        from(distDir)
        into(layout.projectDirectory.dir("src/main/resources/webview"))
    }

tasks.named("processResources") {
    dependsOn(copyWebviewAssets)
}

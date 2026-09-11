import org.jetbrains.intellij.platform.gradle.tasks.PublishPluginTask
import org.jetbrains.intellij.platform.gradle.tasks.SignPluginTask
import org.jetbrains.intellij.platform.gradle.tasks.VerifyPluginTask
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.intellij.platform)
}

/* The version carrier is `package.json`, not this file — see its comment for
   why: Changesets (the JS-side release tool already used everywhere else in
   this monorepo) needs a package.json to version and release-note the plugin
   alongside `@tumaet/apollon`, and duplicating the number here would drift.
 */
version =
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")
        .find(file("package.json").readText())!!
        .groupValues[1]

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

val marketplaceCertificateChain = providers.environmentVariable("JETBRAINS_CERTIFICATE_CHAIN")
val marketplacePrivateKey = providers.environmentVariable("JETBRAINS_PRIVATE_KEY")
val marketplacePrivateKeyPassword = providers.environmentVariable("JETBRAINS_PRIVATE_KEY_PASSWORD")
val marketplaceToken = providers.environmentVariable("JETBRAINS_MARKETPLACE_TOKEN")

dependencies {
    intellijPlatform {
        intellijIdea(libs.versions.intellijIdea)
        bundledModule("intellij.platform.ui.jcef")
        bundledModule("intellij.libraries.jcef")
    }
    implementation(libs.kotlinx.serialization.json)
    testImplementation(libs.junit)
}

tasks.withType<JavaCompile>().configureEach {
    options.release = libs.versions.javaTarget.get().toInt()
}

kotlin {
    jvmToolchain(libs.versions.javaTarget.get().toInt())
    compilerOptions {
        jvmTarget = JvmTarget.JVM_25
        apiVersion = KotlinVersion.KOTLIN_2_4
        languageVersion = KotlinVersion.KOTLIN_2_4
        freeCompilerArgs.add("-Xjdk-release=${libs.versions.javaTarget.get()}")
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "262"
            untilBuild = provider { null }
        }
        changeNotes =
            providers.gradleProperty("pluginChangeNotes").orElse(
                "See the <a href=\"https://github.com/ls1intum/Apollon/blob/main/jetbrains-plugin/CHANGELOG.md\">changelog</a>.",
            )
    }

    pluginVerification {
        ides {
            recommended()
        }
        failureLevel =
            listOf(
                VerifyPluginTask.FailureLevel.COMPATIBILITY_PROBLEMS,
                VerifyPluginTask.FailureLevel.INVALID_PLUGIN,
                VerifyPluginTask.FailureLevel.MISSING_DEPENDENCIES,
                VerifyPluginTask.FailureLevel.NOT_DYNAMIC,
            )
    }

    // No real Marketplace signing key/token exists in this environment — these
    // read from env vars that CI would provide (see
    // .github/workflows/release-jetbrains-plugin.yml) and stay unset locally.
    signing {
        certificateChain = marketplaceCertificateChain
        privateKey = marketplacePrivateKey
        password = marketplacePrivateKeyPassword
    }
    publishing {
        token = marketplaceToken
    }
}

tasks.named<PublishPluginTask>("publishPlugin") {
    onlyIf("JETBRAINS_MARKETPLACE_TOKEN must be set") {
        marketplaceToken.isPresent
    }
}

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

tasks.named<SignPluginTask>("signPlugin") {
    onlyIf("JETBRAINS_CERTIFICATE_CHAIN, JETBRAINS_PRIVATE_KEY and JETBRAINS_PRIVATE_KEY_PASSWORD must all be set") {
        marketplaceCertificateChain.isPresent && marketplacePrivateKey.isPresent && marketplacePrivateKeyPassword.isPresent
    }
    providers.gradleProperty("prebuiltPluginZip").orNull?.let { path ->
        archiveFile.set(layout.projectDirectory.file(path))
    }
}

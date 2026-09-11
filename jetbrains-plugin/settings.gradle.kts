plugins {
    // The IntelliJ Platform Gradle Plugin enforces its own Java-25 toolchain
    // requirement for the target platform (262) independent of anything set
    // in build.gradle.kts's `kotlin { }` block — `compileKotlin` fails
    // otherwise on a machine that only has a different JDK installed. This
    // resolver lets Gradle fetch a matching JDK instead of requiring one to
    // already be present.
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "apollon-jetbrains"

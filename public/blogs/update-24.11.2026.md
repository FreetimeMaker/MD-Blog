# Update from the 24.11.2026

## **Released on <t:1795524468:F> (<t:1795524468:R>)**

## **Categories: Releases, GeoWeather, Blog, Apps, Android, Websites, License Generator, Freetime Core, F-droid**

## ****Update from the 24.11.2026****

### ****What's new in GeoWeather v4.7.6?****

- **Removed the extra APK alignment rewrite before signing; the 16 KB alignment check remains active**
- **Added release-signature reproduction verification against the F-Droid build before publication**

### ****What's new in Freetime Core v4.0.1?****

#### ****Unified KMP publication****

- **Replaced the three-coordinate KMP layout (root package plus `Core-android`/`Core-desktop` target packages) with **one Maven coordinate per library**. `com.freetime:<Module>:4.0.1` carries the common metadata JAR, sources JAR, `-android.aar`, `-android-sources.jar`, `-desktop.jar` and `-desktop-sources.jar` as classifiers, together with the POM and `.module` metadata. Consumers only ever reference the root coordinate.**
- **Added a three-stage credential-free pipeline: `stageNativePublications` publishes the native root/Android/desktop publications to the private `build/native-maven` input tree, `prepareUnifiedPublications` runs `.github/scripts/consolidate_kmp_publications.py`, and `stagePublications` publishes the resulting `unified` publication to `build/public-maven`.**
- **The consolidator validates the whole input before writing anything: SemVer shape, group/version/module agreement, one file per variant, size and SHA-512/SHA-256/SHA-1/MD5 agreement, allowed variant roles, no nested `available-at`, and a complete set of eight artifacts per module. Output files are replaced individually and atomically, and staging/output must be disjoint. Cross-module dependencies on `Core-android`/`Core-desktop` and `Design-desktop` are rewritten to their root coordinates; unrelated third-party dependencies are left untouched.**
- **Only the unified publication may leave the build. Native publications are restricted to the private staging repository, the `unified` publication is the only one that can reach the public staging and Gemfury repositories, and the historical AAR-only `publishPublic` path still fails with an explicit message.**
- **The unified POM keeps the native dependency block and the `published-with-gradle-metadata` marker so Gradle requests the complete variant metadata instead of falling back to the POM. It also reports `jar` packaging: attaching the `.module` file as a second classifier-less artifact otherwise makes Gradle emit `pom`.**

#### ****Release verification****

- **Rewrote `verify_gemfury_release.py` around the unified layout. It now requires the POM, `.module`, main JAR, Android AAR and desktop JAR, parses the metadata and requires every referenced artifact, rejects `available-at` redirects, unsafe or non-root URLs, wrong `formatVersion`/component identity and missing API/runtime variants, then downloads every staged file anonymously and compares SHA-256 hashes. Added `--local-only` to validate a staging tree without network access and a CLI that reports failures without a traceback.**
- **Expanded `test_gemfury_release.py` from 7 to 18 tests covering the required-file set, metadata validation, redirect/URL rejection, HTTP error handling and both CLI modes, and added `test_consolidate_kmp.py` with 14 offline integration tests over native-shaped metadata and ZIPs. The publishing suite now runs 41 tests.**

#### ****Build, dependencies and version consistency****

- **Updated Compose Multiplatform from `1.10.3` to `1.12.2` and the Android device-test libraries to AndroidX Test runner `1.7.0` and JUnit ext `1.3.0`.**
- **Updated the shared release version, both `FreetimeCore.SDK_VERSION` actuals, the SDK identity tests, the dependency examples in the root and module READMEs, the migration guide and the Sample documentation to `4.0.1`.**
- **Verified locally: the complete CI command set (`:Design:checkTemplates`, five `testAndroidHostTest`, `:Sample-android:assembleDebug`/`assembleRelease`, the six `desktopTest` tasks and `:Sample:compileKotlinDesktop`), `stagePublications` with six publications and 48 files, `verify_gemfury_release.py --local-only` over that tree, and a scratch Gradle consumer that resolves `com.freetime:Core:4.0.1` to `Core-4.0.1-desktop.jar`.**

### ****What happend to `https://fdroid.free-time.me`?****

- **I restructured it for more App Repositories like ´APT´, ´YUM´ or ´DNF´ and even for Maven.**
- **It's avaible [here](https://repo.free-time.me/).**

### ****What's this new App License Generator?****

- **License Generator is a CLI and GUI App written in Python for Open Source Projects and is inspired by [anth0nycodes/license-generator](https://github.com/anth0nycodes/license-generator)**
- **It's only for Linux for now, if I know if it's possible to do the same in C# for Windows.**

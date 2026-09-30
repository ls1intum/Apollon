# C4-PlantUML, vendored

Verbatim copies of the macro files from
[plantuml-stdlib/C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) **v2.13.0**, MIT
licensed (see `LICENSE`). They ship inside the plugin so that the **View** tab can render a C4
diagram with no network access and without depending on what `plantuml-mit` happens to carry in its
own `stdlib/c4` — see
[`C4MacroBundle`](../../kotlin/de/tum/cit/aet/apollon/render/C4MacroBundle.kt) for how they are
handed to PlantUML.

`index.txt` is the manifest the extractor reads: a plugin classloader cannot list a resource
directory, so the file names have to be written down. It is generated, one relative path per line:

```sh
cd src/main/resources/c4 && ls *.puml themes/*.puml | LC_ALL=C sort > index.txt
```

## Updating

1. Download the release tarball for the version you want and copy the seven top-level `C4*.puml`
   files plus `themes/*.puml` over this directory, **unmodified** — do not hand-patch them, or the
   next update silently reverts the patch.
2. Drop `themes/puml-theme-C4_FirstTest.puml`; it is an upstream test fixture, not a theme.
3. Regenerate `index.txt` with the command above.
4. Bump `C4MacroBundle.VERSION` — it names the extraction directory, so a stale copy from the
   previous version is ignored rather than reused.
5. Run `./gradlew test`. `PlantUmlRenderServiceTest` renders a real C4 diagram through the bundle
   and asserts the macros actually expanded.

Each `C4_*.puml` opens with a `%variable_exists("RELATIVE_INCLUDE")` check that decides between
including its neighbour from disk and fetching it from GitHub. `PlantUmlRenderService` defines that
variable, which is what keeps the nested include local.

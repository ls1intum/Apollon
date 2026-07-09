// @ts-check
import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// Runs in Node — no browser APIs / JSX here.
//
// Three doc plugins keep the surfaces honest:
//   - library     — @tumaet/apollon API reference + embedding guides.
//                   Listed FIRST: Apollon is a published library before it
//                   is anything else, and the navigation should say so.
//   - user        — how to use the standalone app + VS Code extension
//   - contributor — monorepo dev workflow, scripts, versioning, tests
//
// Operations / runbook / legal / DSMS records are NOT on this public site —
// they live in the repo's top-level ops/ directory (internal, un-indexed).
//
// Apollon itself is embedded live on the homepage via <BrowserOnly>;
// see src/components/ApollonEmbed.

const config: Config = {
  title: "Apollon",
  tagline: "Open-source UML modeling editor for the web",
  favicon: "img/favicon.ico",

  // Docusaurus Faster: Rspack + SWC + LightningCSS → 2-4x faster builds.
  // https://docusaurus.io/blog/releases/3.6#docusaurus-faster
  future: {
    v4: true,
    faster: {
      swcJsLoader: true,
      swcJsMinimizer: true,
      swcHtmlMinimizer: true,
      lightningCssMinimizer: true,
      rspackBundler: true,
      mdxCrossCompilerCache: true,
    },
  },

  url: "https://ls1intum.github.io",
  // Pull request builds use '/', GitHub Pages production uses '/Apollon/'.
  baseUrl: process.env.DOCUSAURUS_BASE_URL || "/Apollon/",
  organizationName: "ls1intum",
  projectName: "Apollon",

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  onDuplicateRoutes: "throw",
  trailingSlash: false,

  i18n: { defaultLocale: "en", locales: ["en"] },

  markdown: {
    // `.md` parses as CommonMark (the legacy `<email@host>` /
    // `Art. 30 <something>` patterns in our docs would otherwise be
    // misread as JSX). `.mdx` files (the homepage embeds, future React
    // demos) still parse as MDX.
    format: "detect",
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "throw",
      onBrokenMarkdownImages: "throw",
    },
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: false,
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
        sitemap: {
          lastmod: "datetime",
          changefreq: "weekly",
          priority: 0.5,
          filename: "sitemap.xml",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "default",
        path: "./user",
        routeBasePath: "user",
        sidebarPath: "./sidebars.user.ts",
        editUrl: "https://github.com/ls1intum/Apollon/tree/main/docs/",
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "library",
        path: "./library",
        routeBasePath: "library",
        sidebarPath: "./sidebars.library.ts",
        editUrl: "https://github.com/ls1intum/Apollon/tree/main/docs/",
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "contributor",
        path: "./contributor",
        routeBasePath: "contributor",
        sidebarPath: "./sidebars.contributor.ts",
        editUrl: "https://github.com/ls1intum/Apollon/tree/main/docs/",
        showLastUpdateAuthor: true,
        showLastUpdateTime: true,
      },
    ],
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en"],
        indexBlog: false,
        docsRouteBasePath: ["user", "library", "contributor"],
        docsDir: ["user", "library", "contributor"],
        searchContextByPaths: [
          { label: { en: "User Guide" }, path: "user" },
          { label: { en: "Library Reference" }, path: "library" },
          { label: { en: "Contributor Guide" }, path: "contributor" },
        ],
        hideSearchBarWithNoSearchContext: true,
        useAllContextsWithNoSearchContext: false,
        highlightSearchTermsOnTargetPage: true,
        searchResultContextMaxLength: 60,
      },
    ],
  ],

  themeConfig: {
    // Link-unfurl preview image. The logo works; a dedicated 1200×630 card
    // would render better in social embeds.
    image: "img/logo.png",
    colorMode: {
      respectPrefersColorScheme: true,
      disableSwitch: false,
    },
    metadata: [
      {
        name: "description",
        content:
          "Open-source UML modeling editor for the web. Embeddable library, standalone web app, and VS Code extension.",
      },
      {
        name: "keywords",
        content:
          "UML, diagram editor, modeling, BPMN, class diagram, React library, npm, Yjs, collaborative editing, TUM",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@ls1intum" },
      { name: "twitter:title", content: "Apollon" },
    ],
    navbar: {
      title: "Apollon",
      logo: { alt: "Apollon logo", src: "img/logo.png" },
      items: [
        {
          type: "docSidebar",
          sidebarId: "librarySidebar",
          docsPluginId: "library",
          position: "left",
          label: "Library",
        },
        {
          type: "docSidebar",
          sidebarId: "userSidebar",
          docsPluginId: "default",
          position: "left",
          label: "User Guide",
        },
        {
          type: "docSidebar",
          sidebarId: "contributorSidebar",
          docsPluginId: "contributor",
          position: "left",
          label: "Contributor",
        },
        {
          href: "https://apollon.aet.cit.tum.de",
          label: "Try Apollon",
          position: "right",
        },
        {
          href: "https://www.npmjs.com/package/@tumaet/apollon",
          label: "npm",
          position: "right",
        },
        {
          href: "https://github.com/ls1intum/Apollon",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Product",
          items: [
            { label: "User Guide", to: "/user/" },
            {
              label: "Try Apollon",
              href: "https://apollon.aet.cit.tum.de",
            },
            {
              label: "VS Code Extension",
              href: "https://marketplace.visualstudio.com/items?itemName=aet-tum.apollon-extension",
            },
            {
              label: "Release Notes",
              href: "https://github.com/ls1intum/Apollon/releases",
            },
          ],
        },
        {
          title: "Library",
          items: [
            { label: "API Reference", to: "/library/api" },
            { label: "Embedding Examples", to: "/library/embedding/install" },
            {
              label: "npm",
              href: "https://www.npmjs.com/package/@tumaet/apollon",
            },
          ],
        },
        {
          title: "Contribute",
          items: [
            { label: "Contributor Guide", to: "/contributor/" },
            {
              label: "Discussions",
              href: "https://github.com/ls1intum/Apollon/discussions",
            },
            {
              label: "Issues",
              href: "https://github.com/ls1intum/Apollon/issues",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "Applied Education Technologies",
              href: "https://aet.cit.tum.de/",
            },
            {
              label: "GitHub Repository",
              href: "https://github.com/ls1intum/Apollon",
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Technical University of Munich · Apollon team at Applied Education Technologies (AET)`,
    },
    docs: {
      sidebar: { hideable: true, autoCollapseCategories: true },
    },
    tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 4 },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "yaml", "tsx", "diff", "docker"],
    },
  } satisfies Preset.ThemeConfig,
}

export default config

import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  librarySidebar: [
    { type: "doc", id: "overview", label: "Overview" },
    { type: "doc", id: "quickstart", label: "Quickstart" },
    {
      type: "category",
      label: "Embedding",
      collapsed: false,
      items: [
        "embedding/install",
        "embedding/react",
        "embedding/angular",
        "embedding/vanilla",
      ],
    },
    { type: "doc", id: "theming", label: "Theming" },
    {
      type: "category",
      label: "API reference",
      collapsed: false,
      // The category landing page is api.md itself, so the sidebar never
      // shows the confusing "API > API" leaf.
      link: { type: "doc", id: "api" },
      items: [
        "api/overlay-controls",
        "api/assessment",
        "api/collaboration",
        "api/export",
        "api/headless-rendering",
        "api/conversion-api",
        "api/model-contract",
      ],
    },
    { type: "doc", id: "troubleshooting", label: "Troubleshooting" },
    { type: "doc", id: "upgrading", label: "Upgrading" },
  ],
}

export default sidebars

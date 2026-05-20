import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  librarySidebar: [
    { type: "doc", id: "overview", label: "Overview" },
    {
      type: "category",
      label: "Embedding",
      collapsible: false,
      items: [
        "embedding/install",
        "embedding/angular",
        "embedding/react",
        "embedding/vanilla",
      ],
    },
    {
      type: "category",
      label: "API",
      items: ["api", "api/collaboration", "api/export"],
    },
  ],
}

export default sidebars

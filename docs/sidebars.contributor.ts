import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  contributorSidebar: [
    { type: "doc", id: "overview", label: "Overview" },
    {
      type: "category",
      label: "Development",
      collapsed: false,
      items: [
        "development/project-structure",
        "development/component-guidelines",
        "development/scripts",
        "development/diagram-version-history",
        "development/visual-tests",
        "development/mobile-builds",
      ],
    },
    {
      type: "category",
      label: "Release pipeline",
      collapsed: false,
      items: [
        "development/release-notes",
        "deployment/github-actions",
        "deployment/npm-publishing",
      ],
    },
    { type: "doc", id: "troubleshooting", label: "Troubleshooting" },
  ],
}

export default sidebars

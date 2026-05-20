import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  contributorSidebar: [
    { type: "doc", id: "overview", label: "Overview" },
    {
      type: "category",
      label: "Development",
      collapsible: false,
      items: [
        "development/project-structure",
        "development/scripts",
        "development/versioning",
        "development/visual-tests",
      ],
    },
    {
      type: "category",
      label: "Release Pipeline",
      items: [
        "deployment/github-actions",
        "deployment/npm-publishing",
      ],
    },
  ],
}

export default sidebars

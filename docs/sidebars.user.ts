import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  userSidebar: [
    { type: "doc", id: "overview", label: "Overview" },
    {
      type: "category",
      label: "Getting started",
      collapsed: false,
      items: ["getting-started/requirements", "getting-started/setup"],
    },
  ],
}

export default sidebars

import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  userSidebar: [
    {
      type: "category",
      label: "Getting Started",
      collapsible: false,
      items: ["getting-started/requirements", "getting-started/setup"],
    },
    {
      type: "category",
      label: "Mobile (iOS / Android)",
      items: ["mobile/ios-android-setup"],
    },
    {
      type: "category",
      label: "Troubleshooting",
      items: ["troubleshooting/common-issues"],
    },
  ],
}

export default sidebars

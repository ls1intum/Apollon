import type { SidebarsConfig } from "@docusaurus/plugin-content-docs"

const sidebars: SidebarsConfig = {
  adminSidebar: [
    { type: "doc", id: "operations", label: "Operations" },
    { type: "doc", id: "runbook", label: "Runbook" },
    { type: "doc", id: "legal-pages", label: "Legal pages" },
    {
      type: "category",
      label: "Data-protection management (DSMS)",
      items: [
        "dsms/overview",
        "dsms/record-of-processing",
        "dsms/dpia-prescreen",
        "dsms/processor-checklist",
      ],
    },
  ],
}

export default sidebars

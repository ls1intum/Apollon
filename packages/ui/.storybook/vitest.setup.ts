import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview"
import { setProjectAnnotations } from "@storybook/react-vite"
import { beforeAll } from "vitest"
import * as preview from "./preview"

// Apply the right configuration when testing stories as portable stories.
// More info: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const project = setProjectAnnotations([a11yAddonAnnotations, preview])

beforeAll(project.beforeAll)

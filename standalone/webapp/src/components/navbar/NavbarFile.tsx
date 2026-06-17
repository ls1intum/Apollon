import { FC, useCallback, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { secondary } from "@/constants"
import { useModalContext } from "@/contexts"
import {
  useExportAsJSON,
  useExportAsPDF,
  useExportAsPNG,
  useExportAsSVG,
} from "@/hooks"
import { JsonFileImportButton } from "./JsonFileImportButton"
import { navTriggerClass } from "./styles"

interface Props {
  color?: string
  handleCloseNavMenu?: () => void
}

export const NavbarFile: FC<Props> = ({ color, handleCloseNavMenu }) => {
  const { openModal } = useModalContext()
  const exportAsSvg = useExportAsSVG("compat")
  const exportAsPng = useExportAsPNG()
  const exportAsJSON = useExportAsJSON()
  const exportAsPDF = useExportAsPDF()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    handleCloseNavMenu?.()
  }, [handleCloseNavMenu])

  const handleNewDiagram = useCallback(() => {
    openModal("NEW_DIAGRAM")
    close()
  }, [openModal, close])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id="file-menu-button"
        className={navTriggerClass}
        style={{ color: color ?? secondary }}
      >
        <span>File</span>
        <ChevronDownIcon className="ml-1 size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-labelledby="file-menu-button">
        <DropdownMenuItem onClick={handleNewDiagram}>
          New Diagram
        </DropdownMenuItem>
        {/* Templates are a tab in the New Diagram dialog, and the dashboard is
            the diagram loader — so no "Start from Template"/"Load Diagram" here.
            Version history has its own VersionHistoryButton. */}
        <JsonFileImportButton close={close} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Export
            <ChevronRightIcon className="ml-auto size-4" aria-hidden />
          </DropdownMenuSubTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                exportAsSvg()
                close()
              }}
            >
              As SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportAsPng({ setWhiteBackground: true })
                close()
              }}
            >
              As PNG (White Background)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportAsPng({ setWhiteBackground: false })
                close()
              }}
            >
              As PNG (Transparent Background)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportAsJSON()
                close()
              }}
            >
              As JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                exportAsPDF()
                close()
              }}
            >
              As PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openModal("EXPORT_PPTX")
                close()
              }}
            >
              As PPTX (Presentation)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

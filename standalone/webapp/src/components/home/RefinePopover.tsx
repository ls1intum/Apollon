import { useState, type ReactElement, type ReactNode } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"
import { Button } from "@tumaet/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@tumaet/ui/components/toggle-group"
import { cn } from "@tumaet/ui/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@tumaet/ui/components/popover"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@tumaet/ui/components/sheet"
import { GroupDivider } from "@/components/navbar/islandPrimitives"
import { getDiagramTypeLabel } from "./diagramTypeMeta"
import {
  HOME_SORT_FIELD_OPTIONS,
  HOME_SOURCE_OPTIONS,
  homeSortOrderOptions,
  type HomeChrome,
} from "./useHomeChrome"

/**
 * Linear-style grouped refinement panel: Source → Type → Sort, split by the
 * shared `GroupDivider` hairline. The SAME body renders in two shells:
 *
 *  • Desktop (md+): a `Popover` anchored to the Refine button.
 *  • Mobile (< md): a bottom `Sheet` (thumb-reachable) — opened by the same
 *    trigger, but the trigger is supplied by the consumer (the band) so the two
 *    layouts share one open/close state.
 *
 * Favorites is intentionally absent — it is the band/pill star, not a Refine
 * block (it still earns a removable chip via `useHomeChrome.activeRefinements`).
 *
 * Every option is a real, focusable `ToggleGroupItem` (no nested interactives).
 * The shells are the STANDARD shadcn overlay surfaces — the desktop `Popover`
 * uses the same `bg-popover` / 8px / ring material as the Help menu and the
 * card ⋮ menu (NOT `.apollon-glass`, which is reserved for the band islands), so
 * the two popovers in the band never differ; the mobile `Sheet` uses the opaque
 * `bg-popover` + ring/hairline so its edge reads in light AND dark.
 */

type RefineSegmentOption<T extends string> = {
  value: T
  label: ReactNode
}

/**
 * One labelled block: a heading + a wrap of segmented choices, rendered as a
 * single-select `ToggleGroup` (spacing pulls the segments apart into individual
 * pills; the primitive's `data-pressed` handles the selected fill, so there are
 * no bespoke selected/unselected style objects). Base UI's group value is an
 * array even when single-select, so we adapt `value`/`onSelect` at the edges and
 * ignore a deselect (the home filters always carry exactly one value).
 */
function RefineGroup<T extends string>({
  label,
  options,
  value,
  onSelect,
  segmentClassName,
}: {
  label: string
  options: readonly RefineSegmentOption<T>[]
  value: T
  onSelect: (value: T) => void
  /** Extra classes per segment (e.g. `min-h-11` to meet the mobile target). */
  segmentClassName?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ color: "var(--apollon-chrome-text)" }}
      >
        {label}
      </span>
      <ToggleGroup
        aria-label={label}
        spacing={4}
        value={[value]}
        onValueChange={(next) => {
          const selected = next.find((option) => option !== value)
          if (selected !== undefined) {
            onSelect(selected as T)
          }
        }}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              "min-h-[36px] rounded-[var(--apollon-chrome-radius-sm)] px-3 text-sm font-medium",
              segmentClassName
            )}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

export type RefineBodyProps = {
  chrome: HomeChrome
  /** Available diagram types (Phase 3 derives this from loaded diagrams). */
  typeOptions: readonly UMLDiagramType[]
  /**
   * Extra per-segment classes — the mobile sheet passes `min-h-11` so the
   * primary mobile control meets the 44px touch target.
   */
  segmentClassName?: string
}

/** The shared Source → Type → Sort body, shell-agnostic. */
export function RefineBody({
  chrome,
  typeOptions,
  segmentClassName,
}: RefineBodyProps) {
  const typeSegments: RefineSegmentOption<HomeChrome["type"]>[] = [
    { value: "all", label: "All" },
    ...typeOptions.map((type) => ({
      value: type,
      label: getDiagramTypeLabel(type),
    })),
  ]

  return (
    <div className="flex flex-col gap-3">
      <RefineGroup
        label="Source"
        options={HOME_SOURCE_OPTIONS}
        value={chrome.source}
        onSelect={chrome.setSource}
        segmentClassName={segmentClassName}
      />
      <GroupDivider />
      <RefineGroup
        label="Type"
        options={typeSegments}
        value={chrome.type}
        onSelect={chrome.setType}
        segmentClassName={segmentClassName}
      />
      <GroupDivider />
      <RefineGroup
        label="Sort by"
        options={HOME_SORT_FIELD_OPTIONS}
        value={chrome.sort.field}
        onSelect={chrome.setSortField}
        segmentClassName={segmentClassName}
      />
      <RefineGroup
        label="Order"
        options={homeSortOrderOptions(chrome.sort.field)}
        value={chrome.sort.order}
        onSelect={chrome.setSortOrder}
        segmentClassName={segmentClassName}
      />
    </div>
  )
}

export type RefinePopoverProps = RefineBodyProps & {
  /** The trigger element (the band's Refine button). */
  trigger: ReactNode
  /** `"popover"` = desktop anchored panel; `"sheet"` = mobile bottom-sheet. */
  variant: "popover" | "sheet"
}

/**
 * Wraps the Refine `trigger` in the right shell for the viewport. Desktop and
 * mobile bands render their own `RefinePopover` with the matching `variant`,
 * each gated by Tailwind `md`, so only one is interactive at a time.
 */
export function RefinePopover({
  trigger,
  variant,
  chrome,
  typeOptions,
}: RefinePopoverProps) {
  const [open, setOpen] = useState(false)

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger as ReactElement} />
        {/* Three-region shadcn Sheet contract: the Popup is a NON-scrolling
            `flex flex-col` (the primitive's default) capped at 80vh, with its
            own overflow hidden so it can never become the scroller. `gap-0`
            because each region owns its own padding — the header keeps its full
            `p-4` top inset because nothing precedes it. The header pins at the
            top; only the MIDDLE body scrolls; the footer pins at the bottom.
            `showCloseButton={false}`: the sheet already carries a "Refine"
            SheetTitle and a "Done" footer, so the corner X is redundant (mirrors
            VersionDrawer). Dropping it also removes the close row entirely, so
            the `gap-0` override can't collide with the row's offset. Opaque
            `bg-popover` + the primitive's ring/top-hairline (NOT `.apollon-glass`)
            so the edge is readable in light as well as dark. */}
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[80vh] gap-0 overflow-hidden"
        >
          <SheetHeader className="pb-3">
            <SheetTitle style={{ color: "var(--apollon-chrome-text)" }}>
              Refine
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <RefineBody
              chrome={chrome}
              typeOptions={typeOptions}
              segmentClassName="min-h-11"
            />
          </div>
          <SheetFooter className="pb-[calc(var(--apollon-chrome-edge-safe-bottom)+1rem)]">
            <SheetClose
              render={
                <Button type="button" variant="default">
                  Done
                </Button>
              }
            />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger as ReactElement} />
      {/* Standard shadcn PopoverContent surface (same as the Help menu + card ⋮):
          `bg-popover`, 8px radius, ring and shadow all come from the primitive —
          only the width is tuned for the grouped body. No `.apollon-glass`. */}
      <PopoverContent
        aria-label="Refine"
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-1.5rem)]"
      >
        <RefineBody chrome={chrome} typeOptions={typeOptions} />
      </PopoverContent>
    </Popover>
  )
}

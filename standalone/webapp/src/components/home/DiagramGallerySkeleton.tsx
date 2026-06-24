import { Skeleton } from "@tumaet/ui/components/skeleton"

type Props = {
  count?: number
}

export const DiagramGallerySkeleton = ({ count = 6 }: Props) => {
  const cards = Array.from({ length: count }, (_, i) => i)

  return (
    <div className="w-full" role="status" aria-label="Loading diagrams">
      <div className="space-y-6">
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-9 w-full md:max-w-xl" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <Skeleton className="h-9 w-full sm:w-56" />
            <Skeleton className="h-9 w-full sm:w-32" />
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-nowrap lg:items-center">
            <Skeleton className="h-9 sm:w-44" />
            <Skeleton className="h-9 sm:w-44" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        <div
          role="list"
          aria-hidden="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] justify-start gap-4 md:grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] md:gap-6 xl:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]"
        >
          {cards.map((index) => (
            // Footprint must match DiagramCard exactly (island radius/border/
            // shadow/surface + the pt-12 preview inset and footer rhythm) so the
            // skeleton→card swap does not shift layout.
            <div
              key={index}
              className="home-diagram-card flex min-h-[var(--card-min-h)] w-full flex-col overflow-hidden rounded-[var(--apollon-chrome-radius-lg)] border border-[var(--apollon-chrome-border)] bg-[var(--home-card-surface)] shadow-[var(--apollon-chrome-shadow-floating)]"
            >
              <div className="flex flex-1 flex-col gap-2 px-4 pt-12 pb-2">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="mt-auto space-y-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              </div>
              <div className="mx-4 h-px bg-border-subtle" />
              <div className="flex items-center justify-between px-4 pt-2.5 pb-3.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

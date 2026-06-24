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
          className="grid grid-cols-[repeat(auto-fill,260px)] justify-center gap-6 md:grid-cols-[repeat(auto-fill,280px)] lg:gap-8 xl:grid-cols-[repeat(auto-fill,300px)]"
        >
          {cards.map((index) => (
            <div
              key={index}
              className="home-diagram-card mx-auto flex h-[300px] w-[260px] flex-col overflow-hidden bg-card md:h-[323px] md:w-[280px] xl:h-[346px] xl:w-[300px]"
              style={{ borderRadius: "var(--home-radius-sm)" }}
            >
              <div className="flex flex-1 flex-col px-4 pb-3 pt-14">
                <Skeleton className="mx-auto mb-8 h-24 w-28" />
                <div className="mt-auto space-y-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              </div>
              <div className="mx-4 border-t border-[var(--home-border-strong)]" />
              <div className="flex h-14 items-center justify-between px-4">
                <div className="space-y-2">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

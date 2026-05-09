import { useMemo } from "react"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"

const formatRelativeTimestamp = (lastModifiedAt?: string) => {
  if (!lastModifiedAt) {
    return "No recent activity"
  }

  const parsedDate = new Date(lastModifiedAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return "No recent activity"
  }

  const nowMs = Date.now()
  const diffMs = nowMs - parsedDate.getTime()
  const hourMs = 60 * 60 * 1000
  const dayMs = 24 * hourMs

  if (diffMs < hourMs) {
    return "Updated within the last hour"
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs)
    return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  if (diffMs < 2 * dayMs) {
    return "Updated yesterday"
  }

  return `Updated on ${parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`
}

export const HomeStats = () => {
  const models = usePersistenceModelStore((state) => state.models)

  const statsLabel = useMemo(() => {
    const modelEntries = Object.entries(models)
      .filter(([id]) => id !== playgroundModelId)
      .map(([, persistentModelEntity]) => ({
        lastModifiedAt: persistentModelEntity.lastModifiedAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastModifiedAt).getTime() -
          new Date(a.lastModifiedAt).getTime()
      )

    return {
      diagramCount: modelEntries.length,
      activityText: formatRelativeTimestamp(modelEntries[0]?.lastModifiedAt),
    }
  }, [models])

  return (
    <>
      <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2.5 py-1 text-[var(--home-text-secondary)]">
        {statsLabel.diagramCount} saved diagram
        {statsLabel.diagramCount === 1 ? "" : "s"}
      </span>
      <span className="inline-flex rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)] px-2.5 py-1 text-[var(--home-text-secondary)]">
        {statsLabel.activityText}
      </span>
    </>
  )
}

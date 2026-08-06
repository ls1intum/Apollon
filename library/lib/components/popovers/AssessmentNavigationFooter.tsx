import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@tumaet/ui/components/button"
import { useLabels } from "@/i18n/useLabels"
import { useAssessmentNavigation } from "@/hooks"

interface AssessmentNavigationFooterProps {
  elementId: string
}

/** Persistent assessment navigation kept outside the scrollable popover body. */
export const AssessmentNavigationFooter = ({
  elementId,
}: AssessmentNavigationFooterProps) => {
  const t = useLabels()
  const { canNavigate, navigate } = useAssessmentNavigation(elementId)

  if (!canNavigate) return null

  return (
    <nav
      className="apollon-assessment-navigation"
      aria-label={`${t.previousAssessment} / ${t.nextAssessment}`}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("previous")}
        aria-keyshortcuts="Control+ArrowLeft Meta+ArrowLeft"
      >
        <ChevronLeft aria-hidden="true" />
        {t.previousAssessment}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate("next")}
        aria-keyshortcuts="Control+ArrowRight Meta+ArrowRight"
      >
        {t.nextAssessment}
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}

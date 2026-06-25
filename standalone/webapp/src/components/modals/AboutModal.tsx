import type { ReactNode } from "react"
import {
  appVersion,
  apollonLibraryVersion,
  releasesLink,
  repositoryLink,
} from "@/constants"
import { Button } from "@tumaet/ui/components/button"
import { DialogFooter } from "@tumaet/ui/components/dialog"

type AboutModalProps = {
  /** Called when the user dismisses the modal via the Close button. */
  onClose: () => void
}

const npmLink = "https://www.npmjs.com/package/@tumaet/apollon"
const licenseLink = `${repositoryLink}/blob/main/LICENSE`
const aetLink = "https://github.com/ls1intum"
const tumLink = "https://www.tum.de/en/"

const linkClass =
  "rounded-sm text-primary underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"

const ExternalLink = ({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) => (
  <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
    {children}
  </a>
)

export const AboutModal = ({ onClose }: AboutModalProps) => {
  return (
    <div className="flex flex-col gap-5 text-sm text-foreground">
      <p className="leading-relaxed">
        Apollon is an open-source UML modeling editor built by the{" "}
        <ExternalLink href={aetLink}>AET team</ExternalLink> at{" "}
        <ExternalLink href={tumLink}>TUM</ExternalLink>.
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
        <dt className="font-medium">App</dt>
        <dd>
          <ExternalLink href={repositoryLink}>Apollon</ExternalLink>{" "}
          {appVersion}
        </dd>
        <dt className="font-medium">Library</dt>
        <dd>
          <ExternalLink href={npmLink}>@tumaet/apollon</ExternalLink>{" "}
          {apollonLibraryVersion}
        </dd>
      </dl>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <ExternalLink href={repositoryLink}>GitHub</ExternalLink>
        <ExternalLink href={releasesLink}>Releases</ExternalLink>
        <ExternalLink href={licenseLink}>License (MIT)</ExternalLink>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  )
}

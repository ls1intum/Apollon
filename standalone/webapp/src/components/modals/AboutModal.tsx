import type { ReactNode } from "react"
import {
  appVersion,
  apollonLibraryVersion,
  releasesLink,
  repositoryLink,
} from "@/constants"
import { useModalContext } from "@/contexts"
import { Button } from "@/components/ui/button"

const npmLink = "https://www.npmjs.com/package/@tumaet/apollon"
const licenseLink = `${repositoryLink}/blob/main/LICENSE`
const aetLink = "https://github.com/ls1intum"
const tumLink = "https://www.tum.de/en/"

const linkClass =
  "rounded-sm text-[var(--home-accent-base)] underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"

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

export const AboutModal = () => {
  const { closeModal } = useModalContext()

  return (
    <div className="flex flex-col gap-5 text-sm text-[var(--apollon-primary-contrast)]">
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

      <div className="flex justify-end">
        <Button variant="default" onClick={closeModal}>
          Close
        </Button>
      </div>
    </div>
  )
}

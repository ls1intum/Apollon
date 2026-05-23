import type { ReactNode } from "react"
import Layout from "@theme/Layout"
import Link from "@docusaurus/Link"
import BrowserOnly from "@docusaurus/BrowserOnly"
import CodeBlock from "@theme/CodeBlock"
import clsx from "clsx"
import styles from "./index.module.css"

// The minimal React usage — the same component shown live in the editor below.
const REACT_EXAMPLE = `import { Apollon, UMLDiagramType } from "@tumaet/apollon/react"
import "@tumaet/apollon/style.css"

export function Diagram() {
  return (
    <Apollon
      type={UMLDiagramType.ClassDiagram}
      style={{ height: 600 }}
    />
  )
}`

function Hero() {
  return (
    <header className={styles.hero}>
      <div className="container">
        <h1 className={styles.heroTitle}>
          The open-source UML editor you can{" "}
          <span className={styles.accent}>embed</span>, host, or run in VS Code.
        </h1>
        <p className={styles.heroSubtitle}>
          A UML modeling editor for the web — 13 diagram types, exportable
          everywhere, and published as a framework-agnostic npm package.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/library/">
            Embed it in your app
          </Link>
          <Link className="button button--secondary button--lg" to="/user/">
            Open the editor
          </Link>
        </div>
        <div className={styles.install}>
          <CodeBlock language="bash">npm install @tumaet/apollon</CodeBlock>
        </div>
      </div>
    </header>
  )
}

function LiveDemo() {
  return (
    <section className={clsx(styles.section, styles.demo)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Try it live</h2>
        <p className={styles.sectionLead}>
          The editor on the right is the real <code>@tumaet/apollon</code>{" "}
          package, mounted by the code on the left. Drag from the palette, edit,
          export — it all runs in your browser.
        </p>
        <div className={clsx("row", styles.demoRow)}>
          <div className={clsx("col col--6", styles.demoCol)}>
            <CodeBlock language="tsx" title="Diagram.tsx">
              {REACT_EXAMPLE}
            </CodeBlock>
          </div>
          <div className={clsx("col col--6", styles.demoCol)}>
            <div className={styles.demoWindow}>
              <div className={styles.demoBar}>
                <span className={styles.demoDot} aria-hidden="true" />
                <span className={styles.demoDot} aria-hidden="true" />
                <span className={styles.demoDot} aria-hidden="true" />
                <span className={styles.demoBarLabel}>
                  <span className={styles.liveChip}>LIVE</span>
                  @tumaet/apollon
                </span>
              </div>
              <BrowserOnly
                fallback={
                  <div className="apollon-embed-frame" aria-busy="true">
                    Loading Apollon&hellip;
                  </div>
                }
              >
                {() => {
                  // Lazy-require keeps the editor (and its emotion/MUI/xyflow
                  // transitive imports) out of the SSR bundle. BrowserOnly
                  // only runs this on the client, so `require` never hits Node.
                  const ApollonEmbed =
                    require("../components/ApollonEmbed").default
                  return <ApollonEmbed />
                }}
              </BrowserOnly>
            </div>
            <p className={styles.demoCaption}>
              Edits stay local — refresh to reset.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

type LinkCard = {
  title: string
  body: ReactNode
  to: string
  cta: string
  kicker?: string
}

/** A responsive grid of cards that are each a link. Used by Ways and WhereToNext. */
function LinkCardGrid({ items }: { items: LinkCard[] }) {
  return (
    <div className={styles.cardGrid}>
      {items.map((item) => (
        <Link to={item.to} className={styles.card} key={item.title}>
          {item.kicker && (
            <span className={styles.cardKicker}>{item.kicker}</span>
          )}
          <h3 className={styles.cardTitle}>{item.title}</h3>
          <p className={styles.cardBody}>{item.body}</p>
          <span className={styles.cardLink}>{item.cta} →</span>
        </Link>
      ))}
    </div>
  )
}

const WAYS: LinkCard[] = [
  {
    kicker: "Library",
    title: "Embed it",
    body: (
      <>
        <code>@tumaet/apollon</code> on npm. Framework-agnostic by default;
        Angular hosts install <strong>zero peer deps</strong>. A{" "}
        <code>/react</code> subpath dedupes React when the host already has it.
      </>
    ),
    to: "/library/",
    cta: "Embedding guide",
  },
  {
    kicker: "Standalone",
    title: "Host the web app",
    body: (
      <>
        A full diagram editor with sharing and real-time collaboration. Use the
        hosted instance or run your own with Docker.
      </>
    ),
    to: "/user/",
    cta: "User guide",
  },
  {
    kicker: "VS Code",
    title: "Edit next to your code",
    body: (
      <>
        The Apollon extension stores diagrams as <code>.apollon</code> files in
        your repository — versioned and reviewed alongside the code.
      </>
    ),
    to: "/user/getting-started/setup",
    cta: "Install the extension",
  },
]

function Ways() {
  return (
    <section className={clsx(styles.section, styles.tinted)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Three ways to use Apollon</h2>
        <p className={styles.sectionLead}>
          Same editor, same diagram format — only the delivery differs.
        </p>
        <LinkCardGrid items={WAYS} />
      </div>
    </section>
  )
}

const FEATURES = [
  {
    kicker: "Modeling",
    title: "13 diagram types",
    body: "Class, Object, Activity, Use Case, Communication, Component, Deployment, Petri Net, Reachability Graph, Syntax Tree, Flowchart, BPMN, and SFC.",
  },
  {
    kicker: "Output",
    title: "Export anywhere",
    body: "SVG, PNG, PDF, and JSON — from a mounted editor or a headless model. Round-trips through JSON without loss.",
  },
  {
    kicker: "Collaboration",
    title: "Real-time, opt-in",
    body: "Multi-user editing via Yjs over any transport you already run — WebSocket, WebRTC, or BroadcastChannel.",
  },
]

function Features() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>What you get</h2>
        <div className={styles.cardGrid}>
          {FEATURES.map((f) => (
            <div className={clsx(styles.card, styles.cardStatic)} key={f.title}>
              <span className={styles.cardKicker}>{f.kicker}</span>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const NEXT: LinkCard[] = [
  {
    title: "Library",
    body: "Embed @tumaet/apollon in your product. API reference, quickstart, and per-framework guides.",
    to: "/library/",
    cta: "Read the Library docs",
  },
  {
    title: "User Guide",
    body: "Draw diagrams in the hosted app, the VS Code extension, or a self-hosted instance.",
    to: "/user/",
    cta: "Open the User Guide",
  },
  {
    title: "Contributor",
    body: "Build Apollon from source, run the monorepo locally, and contribute changes back.",
    to: "/contributor/",
    cta: "Start contributing",
  },
]

function WhereToNext() {
  return (
    <section className={clsx(styles.section, styles.tinted)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Where to next</h2>
        <LinkCardGrid items={NEXT} />
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <Layout
      title="UML modeling editor for the web"
      description="Apollon is an open-source UML modeling editor for the web — an embeddable npm library, a standalone web app, and a VS Code extension."
    >
      <Hero />
      <main>
        <LiveDemo />
        <Ways />
        <Features />
        <WhereToNext />
      </main>
    </Layout>
  )
}

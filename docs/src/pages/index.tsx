import type { ReactNode } from "react"
import Layout from "@theme/Layout"
import Link from "@docusaurus/Link"
import BrowserOnly from "@docusaurus/BrowserOnly"
import CodeBlock from "@theme/CodeBlock"
import Tabs from "@theme/Tabs"
import TabItem from "@theme/TabItem"
import clsx from "clsx"
import styles from "./index.module.css"

const HOSTED_URL = "https://apollon.aet.cit.tum.de"

// The read+write loop people actually write: load a saved model and
// persist edits as they happen. In each host's current idiom.
const REACT_SNIPPET = `import { Apollon } from "@tumaet/apollon/react"
import type { UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

export function Diagram({ initialModel }: { initialModel?: UMLModel }) {
  return (
    <Apollon
      style={{ height: 600 }}
      defaultModel={initialModel}
      onMount={(editor) => {
        const id = editor.subscribeToModelChange((model) => {
          localStorage.setItem("diagram", JSON.stringify(model))
        })
        return () => editor.unsubscribe(id)
      }}
    />
  )
}`

const ANGULAR_SNIPPET = `import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from "@angular/core"
import { ApollonEditor, type UMLModel } from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

@Component({
  selector: "app-diagram",
  template: \`<div #host style="height: 600px"></div>\`,
})
export class DiagramComponent {
  readonly initialModel = input<UMLModel>()
  private host = viewChild.required<ElementRef<HTMLDivElement>>("host")

  constructor() {
    const destroyRef = inject(DestroyRef)
    afterNextRender(() => {
      const editor = new ApollonEditor(this.host().nativeElement, {
        model: this.initialModel(),
      })
      const subId = editor.subscribeToModelChange((model) => {
        localStorage.setItem("diagram", JSON.stringify(model))
      })
      destroyRef.onDestroy(() => {
        editor.unsubscribe(subId)
        editor.destroy()
      })
    })
  }
}`

const VANILLA_SNIPPET = `<link
  rel="stylesheet"
  href="https://esm.sh/@tumaet/apollon@4.9.0/style.css"
/>
<div id="apollon" style="width: 100%; height: 600px"></div>

<script type="module">
  // esm.sh serves Apollon's required yjs/y-protocols peers automatically.
  import { ApollonEditor } from "https://esm.sh/@tumaet/apollon@4.9.0"

  const saved = localStorage.getItem("diagram")
  const editor = new ApollonEditor(document.getElementById("apollon"), {
    model: saved ? JSON.parse(saved) : undefined,
  })

  editor.subscribeToModelChange((model) => {
    localStorage.setItem("diagram", JSON.stringify(model))
  })

  // editor.destroy() when you're done.
</script>`

function Hero() {
  return (
    <header className={styles.hero}>
      <div className="container">
        <h1 className={styles.heroTitle}>
          Draw <span className={styles.accent}>UML diagrams</span> in the
          browser.
        </h1>
        <p className={styles.heroSubtitle}>
          An open-source UML modeling editor. 13 diagram types, SVG/PNG/PDF/JSON
          export, real-time collaboration. Use it in the browser, in VS Code, or
          as an npm library.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" href={HOSTED_URL}>
            Open the editor
          </Link>
          <Link className="button button--secondary button--lg" to="/library/">
            Embed it in your app
          </Link>
        </div>
        <div className={styles.install}>
          <CodeBlock language="bash">
            npm install @tumaet/apollon yjs y-protocols
          </CodeBlock>
        </div>
      </div>
    </header>
  )
}

function FrameworkTabs() {
  return (
    <Tabs groupId="framework" className={styles.demoTabs}>
      <TabItem value="react" label="React" default>
        <CodeBlock language="tsx" title="Diagram.tsx">
          {REACT_SNIPPET}
        </CodeBlock>
      </TabItem>
      <TabItem value="angular" label="Angular">
        <CodeBlock language="ts" title="diagram.component.ts">
          {ANGULAR_SNIPPET}
        </CodeBlock>
      </TabItem>
      <TabItem value="vanilla" label="Vanilla JS">
        <CodeBlock language="html" title="index.html">
          {VANILLA_SNIPPET}
        </CodeBlock>
      </TabItem>
    </Tabs>
  )
}

function LiveDemo() {
  return (
    <section className={clsx(styles.section, styles.demo)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Try it live</h2>
        <p className={styles.sectionLead}>
          The <code>@tumaet/apollon</code> package running in your browser. The
          snippet beside it is the code that mounts it — switch frameworks in
          the tabs.
        </p>
        <div className={clsx("row", styles.demoRow)}>
          <div className={clsx("col col--6", styles.demoCol)}>
            <FrameworkTabs />
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
                  // Lazy-require: BrowserOnly only runs this on the client,
                  // so the editor's emotion/MUI/xyflow imports stay out of
                  // Docusaurus's SSR bundle.
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
        Angular hosts install just <code>yjs</code> + <code>y-protocols</code>.
        A <code>/react</code> subpath dedupes React when the host already has
        it.
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

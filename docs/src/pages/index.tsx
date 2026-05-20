import Layout from "@theme/Layout"
import Link from "@docusaurus/Link"
import BrowserOnly from "@docusaurus/BrowserOnly"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import clsx from "clsx"
import styles from "./index.module.css"

function Hero() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={clsx("hero hero--primary", styles.hero)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/library/">
            Embed in your app
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/user/getting-started/setup"
          >
            Try the standalone
          </Link>
        </div>
      </div>
    </header>
  )
}

function LiveDemo() {
  return (
    <section className={styles.demo}>
      <div className="container">
        <h2>Try it now</h2>
        <p>
          The editor below is the real <code>@tumaet/apollon</code> npm package,
          mounted live in your browser. Edits stay local — refresh to reset.
        </p>
        <BrowserOnly
          fallback={
            <div className="apollon-embed-frame" aria-busy="true">
              Loading Apollon&hellip;
            </div>
          }
        >
          {() => {
            // Lazy-require keeps the editor (and its emotion/MUI/xyflow
            // transitive imports) out of the SSR bundle. BrowserOnly only
            // calls this on the client, so the `require` never runs in Node.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const ApollonEmbed =
              require("../components/ApollonEmbed").default
            return <ApollonEmbed />
          }}
        </BrowserOnly>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <h3>13 diagram types</h3>
            <p>
              Class, Object, Activity, Use Case, Communication, Component,
              Deployment, Petri Net, Reachability Graph, Syntax Tree, Flowchart,
              BPMN, SFC.
            </p>
          </div>
          <div className="col col--4">
            <h3>Embeddable library</h3>
            <p>
              <code>@tumaet/apollon</code> on npm. Framework-agnostic by default
              — Angular hosts get the editor with <strong>zero peer deps</strong>{" "}
              to install. A <code>/react</code> subpath dedupes React when your
              host already has it.
            </p>
          </div>
          <div className="col col--4">
            <h3>Export anywhere</h3>
            <p>
              SVG, PNG, PDF, JSON. Optional real-time collaboration via Yjs over
              any transport (WebSocket, WebRTC, BroadcastChannel).
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <Layout
      title="Apollon"
      description="Open-source UML modeling editor for the web. Embeddable library, standalone web app, and VS Code extension."
    >
      <Hero />
      <main>
        <LiveDemo />
        <Features />
      </main>
    </Layout>
  )
}

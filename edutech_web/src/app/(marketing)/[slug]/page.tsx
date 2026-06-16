import Link from "next/link";
import { notFound } from "next/navigation";
import {
  marketingPages,
  type MarketingPageSlug,
} from "@/lib/site-content";

export default async function MarketingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = marketingPages[slug as MarketingPageSlug];

  if (!page) {
    notFound();
  }

  return (
    <main className="home">
      <header className="container nav">
        <Link className="brand" href="/">
          <span className="brandMark">N</span>
          <span className="brandText">
            <strong>Nexora</strong>
            <small>Learn. Practice. Succeed.</small>
          </span>
        </Link>

        <div className="navActions">
          <Link className="button buttonGhost" href="/login">
            Login
          </Link>
          <Link className="button buttonPrimary" href="/signup">
            Request Access
          </Link>
        </div>
      </header>

      <section className="container marketingInfoHero">
        <div className="sectionIntro">
          <span className="eyebrow">{page.eyebrow}</span>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
        </div>

        <div className="marketingInfoGrid">
          {page.bullets.map((bullet) => (
            <article className="categoryCard" key={bullet}>
              <span className="categoryIcon">N</span>
              <strong>{bullet}</strong>
              <p>
                This route is now part of the working web experience and can be
                expanded further without changing the overall information
                architecture.
              </p>
            </article>
          ))}
        </div>

        <div className="heroActions">
          <Link className="button buttonPrimary" href="/signup">
            Request Access
          </Link>
          <Link className="button buttonSecondary" href="/">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}

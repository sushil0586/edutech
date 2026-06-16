import Link from "next/link";

type StudentStatePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  ctaHref?: string;
  ctaLabel?: string;
  statusLabel?: string;
};

export function StudentStatePanel({
  eyebrow,
  title,
  description,
  bullets = [],
  ctaHref,
  ctaLabel,
  statusLabel = "Live data only",
}: StudentStatePanelProps) {
  return (
    <section className="featurePlaceholder statePanel">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>

      {bullets.length ? (
        <div className="placeholderPanel">
          <div className="placeholderGrid">
            {bullets.map((bullet) => (
              <article className="placeholderCard" key={bullet}>
                <span className="placeholderDot" aria-hidden="true" />
                <strong>{bullet}</strong>
                <small>Returned and rendered directly from the current app state.</small>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {statusLabel || (ctaHref && ctaLabel) ? (
        <div className="placeholderFooter">
          {statusLabel ? <span className="statusPill">{statusLabel}</span> : <span />}
          {ctaHref && ctaLabel ? (
            <Link className="button buttonSecondary" href={ctaHref}>
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

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
      <div className="statePanelHeader">
        <span className="eyebrow">{eyebrow}</span>
        <span className="statusPill">{statusLabel}</span>
      </div>

      <div className="statePanelCopy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

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

      {ctaHref && ctaLabel ? (
        <div className="placeholderFooter">
          <span className="statePanelFootnote">Returned from the current live app flow and ready once configuration is restored.</span>
          <Link className="button buttonSecondary" href={ctaHref}>
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

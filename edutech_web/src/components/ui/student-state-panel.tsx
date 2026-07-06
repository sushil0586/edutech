import Link from "next/link";

type StudentStatePanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  ctaHref?: string;
  ctaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  statusLabel?: string;
  footnote?: string;
};

export function StudentStatePanel({
  eyebrow,
  title,
  description,
  bullets = [],
  ctaHref,
  ctaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
  statusLabel = "Live data only",
  footnote = "Returned from the current live app flow and ready once configuration is restored.",
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

      {((ctaHref && ctaLabel) || (secondaryCtaHref && secondaryCtaLabel)) ? (
        <div className="placeholderFooter">
          <span className="statePanelFootnote">{footnote}</span>
          <div className="resultCardActions">
            {secondaryCtaHref && secondaryCtaLabel ? (
              <Link className="button buttonGhost" href={secondaryCtaHref}>
                {secondaryCtaLabel}
              </Link>
            ) : null}
            {ctaHref && ctaLabel ? (
              <Link className="button buttonSecondary" href={ctaHref}>
                {ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

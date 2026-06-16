type FeaturePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel?: string;
};

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
  bullets,
  ctaLabel = "Coming Next",
}: FeaturePlaceholderProps) {
  return (
    <section className="featurePlaceholder">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="placeholderPanel">
        <div className="placeholderGrid">
          {bullets.map((bullet) => (
            <article className="placeholderCard" key={bullet}>
              <span className="placeholderDot" aria-hidden="true" />
              <strong>{bullet}</strong>
              <small>Planned in the next frontend milestone.</small>
            </article>
          ))}
        </div>
      </div>

      <div className="placeholderFooter">
        <span className="statusPill">Structured and ready for implementation</span>
        <button className="button buttonSecondary" type="button">
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}

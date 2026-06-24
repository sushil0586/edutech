import Link from "next/link";

type ReviewResponseArtifact = {
  asset_kind: string;
  upload_token: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  duration_seconds?: number;
  storage_status?: string;
  checksum?: string;
  storage_path?: string;
  file_url?: string;
};

type ReviewResponseArtifactsProps = {
  answerText: string;
  answerTranscript?: string;
  responseArtifacts?: ReviewResponseArtifact[];
  openedAtLabel?: string;
};

function artifactLabel(value: string) {
  return value.replaceAll("_", " ");
}

function artifactPreviewKind(assetKind: string) {
  if (assetKind === "audio_recording") return "audio";
  if (assetKind === "video_recording") return "video";
  if (assetKind === "image_upload") return "image";
  if (assetKind === "document_upload") return "document";
  return "other";
}

export function ReviewResponseArtifacts({
  answerText,
  answerTranscript = "",
  responseArtifacts = [],
  openedAtLabel,
}: ReviewResponseArtifactsProps) {
  return (
    <div className="analyticsResultAnswerPanel">
      <div className="sectionHeading">
        <strong>Student response</strong>
        {openedAtLabel ? <span>{openedAtLabel}</span> : null}
      </div>
      <div className="analyticsResultAnswerBody">
        {answerText || answerTranscript || responseArtifacts.length
          ? answerText || "No typed answer captured."
          : "No response captured."}
      </div>

      {answerTranscript ? (
        <div className="analyticsResultReviewNotes">
          <span>Transcript</span>
          <p>{answerTranscript}</p>
        </div>
      ) : null}

      {responseArtifacts.length ? (
        <div className="attemptArtifactList">
          {responseArtifacts.map((artifact) => {
            const previewKind = artifactPreviewKind(artifact.asset_kind);
            const href = artifact.file_url || "";
            return (
              <article className="attemptArtifactRow" key={artifact.upload_token}>
                <div className="attemptArtifactPreviewCopy">
                  <strong>{artifact.file_name || artifactLabel(artifact.asset_kind)}</strong>
                  <span>
                    {artifactLabel(artifact.asset_kind)}
                    {artifact.storage_status ? ` · ${artifact.storage_status}` : ""}
                  </span>
                </div>

                {href ? (
                  <div className="attemptArtifactPreviewMedia">
                    {previewKind === "audio" ? (
                      <audio controls preload="metadata" src={href}>
                        Your browser does not support audio playback.
                      </audio>
                    ) : previewKind === "video" ? (
                      <video controls preload="metadata" src={href}>
                        Your browser does not support video playback.
                      </video>
                    ) : previewKind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={artifact.file_name || "Response artifact"} src={href} />
                    ) : previewKind === "document" ? (
                      <iframe src={href} title={artifact.file_name || "Response document"} />
                    ) : null}
                    <Link className="button buttonGhost" href={href} target="_blank">
                      Open file
                    </Link>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

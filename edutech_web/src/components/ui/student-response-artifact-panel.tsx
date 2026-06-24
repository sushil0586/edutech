"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  StudentAttemptAnswer,
  StudentUploadedResponseArtifact,
} from "@/features/dashboard/types";
import { RESPONSE_ARTIFACT_TYPE_RULES } from "@/lib/http/upload-validation";

type ResponseArtifactKind = keyof typeof RESPONSE_ARTIFACT_TYPE_RULES;

type StudentResponseArtifactPanelProps = {
  attemptId: string;
  questionId: string;
  fieldName: string;
  initialArtifacts: StudentAttemptAnswer["response_artifacts"];
  allowedArtifactKinds?: ResponseArtifactKind[];
};

const RESPONSE_ARTIFACT_OPTIONS: Array<{
  value: ResponseArtifactKind;
  label: string;
}> = [
  { value: "audio_recording", label: "Audio response" },
  { value: "video_recording", label: "Video response" },
  { value: "image_upload", label: "Image upload" },
  { value: "document_upload", label: "Document upload" },
];

const RESPONSE_ARTIFACT_ACCEPT_MAP: Record<ResponseArtifactKind, string> = {
  audio_recording: ".mp3,.wav,.m4a,.aac,.ogg,audio/*",
  video_recording: ".mp4,.webm,.mov,.m4v,video/*",
  image_upload: ".png,.jpg,.jpeg,.gif,.webp,.svg,image/*",
  document_upload: ".pdf,application/pdf",
};

function artifactKindLabel(value: string) {
  return (
    RESPONSE_ARTIFACT_OPTIONS.find((option) => option.value === value)?.label ??
    value.replace(/_/g, " ")
  );
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Upload failed. Please try again.";
  }

  const details = payload as Record<string, unknown>;
  const fields = [details.detail, details.error, details.file, details.question];
  for (const field of fields) {
    if (typeof field === "string" && field.trim()) {
      return field;
    }
    if (Array.isArray(field) && field.length > 0) {
      return String(field[0]);
    }
  }

  return "Upload failed. Please try again.";
}

function isRecordableArtifactKind(
  value: ResponseArtifactKind,
): value is "audio_recording" | "video_recording" {
  return value === "audio_recording" || value === "video_recording";
}

function extensionFromMimeType(mimeType: string, assetKind: ResponseArtifactKind) {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.includes("ogg")) return "ogg";
  if (normalizedMimeType.includes("mpeg") || normalizedMimeType.includes("mp3")) return "mp3";
  if (normalizedMimeType.includes("wav")) return "wav";
  if (normalizedMimeType.includes("mp4")) {
    return assetKind === "audio_recording" ? "m4a" : "mp4";
  }
  if (normalizedMimeType.includes("webm")) return "webm";
  return assetKind === "audio_recording" ? "webm" : "webm";
}

function resolveRecorderMimeType(assetKind: "audio_recording" | "video_recording") {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates =
    assetKind === "audio_recording"
      ? [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ]
      : [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

export function StudentResponseArtifactPanel({
  attemptId,
  questionId,
  fieldName,
  initialArtifacts,
  allowedArtifactKinds,
}: StudentResponseArtifactPanelProps) {
  const availableArtifactKinds = useMemo(
    () =>
      allowedArtifactKinds && allowedArtifactKinds.length
        ? allowedArtifactKinds
        : RESPONSE_ARTIFACT_OPTIONS.map((option) => option.value),
    [allowedArtifactKinds],
  );
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [artifactKind, setArtifactKind] =
    useState<ResponseArtifactKind>(availableArtifactKinds[0] ?? "audio_recording");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState("");
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const isRecorderAvailable =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined";

  const canRecord = isRecordableArtifactKind(artifactKind) && isRecorderAvailable;

  useEffect(() => {
    if (!availableArtifactKinds.includes(artifactKind)) {
      setArtifactKind(availableArtifactKinds[0] ?? "audio_recording");
      setSelectedFileName("");
      setErrorMessage("");
      setNoticeMessage("");
    }
  }, [artifactKind, availableArtifactKinds]);

  const stopMediaTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const clearRecordedPreview = () => {
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
    }
    setRecordedPreviewUrl("");
  };

  const resetRecordedMedia = () => {
    setRecordedBlob(null);
    setRecordingDurationSeconds(0);
    clearRecordedPreview();
  };

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) {
      return undefined;
    }

    const handleSubmit = (event: SubmitEvent) => {
      if (!isUploading && !isRecording) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setErrorMessage(
        isRecording
          ? "Please stop the recording before saving this answer."
          : "Please wait for the upload to finish before saving this answer.",
      );
      setNoticeMessage("");
    };

    form.addEventListener("submit", handleSubmit, true);
    return () => {
      form.removeEventListener("submit", handleSubmit, true);
    };
  }, [isRecording, isUploading]);

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      clearRecordedPreview();
      stopMediaTracks();
    };
  }, [recordedPreviewUrl]);

  const handleUpload = async (uploadSource?: {
    file: Blob | File;
    fileName: string;
  }) => {
    const file = uploadSource?.file ?? fileInputRef.current?.files?.[0];
    const fileName = uploadSource?.fileName ?? fileInputRef.current?.files?.[0]?.name ?? "";
    if (!file) {
      setErrorMessage("Choose a response artifact file before uploading.");
      setNoticeMessage("");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      const formData = new FormData();
      formData.set("question", questionId);
      formData.set("asset_kind", artifactKind);
      formData.set("file", file, fileName);

      const uploadedArtifact = await new Promise<StudentUploadedResponseArtifact>(
        (resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open(
            "POST",
            `/api/student/attempts/${attemptId}/response-artifact`,
          );
          request.responseType = "json";
          request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress(Math.max(5, Math.round((event.loaded / event.total) * 100)));
            }
          };
          request.onerror = () => {
            reject(new Error("Upload failed. Please check your connection and try again."));
          };
          request.onload = () => {
            let payload: unknown = null;

            if (request.response && typeof request.response === "object") {
              payload = request.response;
            } else if (request.responseText) {
              try {
                payload = JSON.parse(request.responseText);
              } catch {
                payload = null;
              }
            }

            if (request.status >= 200 && request.status < 300) {
              resolve(payload as StudentUploadedResponseArtifact);
              return;
            }

            reject(new Error(readErrorMessage(payload)));
          };
          request.send(formData);
        },
      );

      setArtifacts((current) => [...current, uploadedArtifact]);
      setProgress(100);
      setNoticeMessage(
        `${uploadedArtifact.file_name} uploaded. Save the answer to keep it attached.`,
      );
      setSelectedFileName("");
      resetRecordedMedia();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Upload failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
      window.setTimeout(() => {
        setProgress(null);
      }, 500);
    }
  };

  const handleStartRecording = async () => {
    if (!isRecordableArtifactKind(artifactKind)) {
      setErrorMessage("Recording is only available for audio and video responses.");
      return;
    }

    if (!isRecorderAvailable) {
      setErrorMessage("This browser does not support in-page recording on this device.");
      return;
    }

    try {
      resetRecordedMedia();
      setSelectedFileName("");
      setErrorMessage("");
      setNoticeMessage("");

      const stream = await navigator.mediaDevices.getUserMedia(
        artifactKind === "audio_recording"
          ? { audio: true }
          : { audio: true, video: true },
      );
      mediaStreamRef.current = stream;

      const mimeType = resolveRecorderMimeType(artifactKind);
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        clearRecordingTimer();
        stopMediaTracks();
        setIsRecording(false);

        const finalMimeType = mediaRecorder.mimeType || mimeType || "";
        const blob = new Blob(recordedChunksRef.current, {
          type: finalMimeType,
        });

        if (blob.size <= 0) {
          setErrorMessage("Recording finished, but no media was captured. Please try again.");
          return;
        }

        const previewUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedPreviewUrl(previewUrl);
        setSelectedFileName(
          `recorded-response.${extensionFromMimeType(finalMimeType, artifactKind)}`,
        );
        setNoticeMessage("Recording is ready. Upload it now, then save the answer.");
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDurationSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDurationSeconds((current) => current + 1);
      }, 1000);
      setNoticeMessage(
        artifactKind === "audio_recording"
          ? "Recording audio response..."
          : "Recording video response...",
      );
    } catch (error) {
      stopMediaTracks();
      clearRecordingTimer();
      setIsRecording(false);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Unable to start recording. Please check microphone or camera permissions.",
      );
      setNoticeMessage("");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleClearRecording = () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }

    resetRecordedMedia();
    setSelectedFileName("");
    setNoticeMessage("Recorded media cleared.");
    setErrorMessage("");
  };

  useEffect(() => {
    if (isRecording) {
      handleStopRecording();
    } else {
      resetRecordedMedia();
      setSelectedFileName("");
      setErrorMessage("");
      setNoticeMessage("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactKind]);

  return (
    <div className="attemptArtifactPanel" ref={rootRef}>
      <div className="attemptArtifactPanelHeader">
        <div>
          <strong>Optional file-backed response</strong>
          <p>
            Upload an audio, video, image, or document response when the
            question needs supporting media.
          </p>
        </div>
        <span className="questionBankTagChip">{artifacts.length} saved</span>
      </div>

      <input name={fieldName} type="hidden" value={JSON.stringify(artifacts)} />

      <div className="attemptArtifactControls">
        <label className="attemptArtifactField">
          <span>Artifact type</span>
          <select
            className="input"
            disabled={isUploading}
            onChange={(event) => setArtifactKind(event.target.value as ResponseArtifactKind)}
            value={artifactKind}
          >
            {RESPONSE_ARTIFACT_OPTIONS.filter((option) =>
              availableArtifactKinds.includes(option.value),
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="attemptArtifactField">
          <span>Attach file</span>
          <input
            accept={RESPONSE_ARTIFACT_ACCEPT_MAP[artifactKind]}
            ref={fileInputRef}
            className="input"
            disabled={isUploading}
            onChange={(event) =>
              setSelectedFileName(event.target.files?.[0]?.name?.trim() ?? "")
            }
            type="file"
          />
        </label>
        <button
          className="button buttonSecondary attemptArtifactUploadButton"
          disabled={isUploading || isRecording}
          onClick={() => {
            void handleUpload();
          }}
          type="button"
        >
          {isUploading ? "Uploading..." : "Upload file"}
        </button>
      </div>

      {canRecord ? (
        <div className="attemptRecorderPanel">
          <div className="attemptRecorderHeader">
            <strong>
              {artifactKind === "audio_recording" ? "Record in browser" : "Record video response"}
            </strong>
            {isRecording ? (
              <span className="attemptRecorderStatus">
                Recording {recordingDurationSeconds}s
              </span>
            ) : recordedBlob ? (
              <span className="attemptRecorderStatus">Recording ready</span>
            ) : (
              <span className="attemptRecorderStatus">Recorder idle</span>
            )}
          </div>
          <div className="attemptRecorderActions">
            <button
              className="button buttonGhost"
              disabled={isUploading || isRecording}
              onClick={() => {
                void handleStartRecording();
              }}
              type="button"
            >
              Start recording
            </button>
            <button
              className="button buttonGhost"
              disabled={!isRecording}
              onClick={handleStopRecording}
              type="button"
            >
              Stop recording
            </button>
            <button
              className="button buttonGhost"
              disabled={isUploading || (!isRecording && !recordedBlob)}
              onClick={handleClearRecording}
              type="button"
            >
              Clear recording
            </button>
            <button
              className="button buttonSecondary"
              disabled={isUploading || isRecording || !recordedBlob}
              onClick={() => {
                if (!recordedBlob) {
                  return;
                }
                const fileName = `recorded-response.${extensionFromMimeType(
                  recordedBlob.type,
                  artifactKind,
                )}`;
                void handleUpload({
                  file: recordedBlob,
                  fileName,
                });
              }}
              type="button"
            >
              Upload recording
            </button>
          </div>
          {recordedPreviewUrl ? (
            <div className="attemptArtifactPreviewMedia">
              {artifactKind === "audio_recording" ? (
                <audio controls src={recordedPreviewUrl} />
              ) : (
                <video controls src={recordedPreviewUrl} />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedFileName ? (
        <small className="fieldHint">Selected: {selectedFileName}</small>
      ) : null}

      {progress !== null ? (
        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progress}
          className="attemptArtifactProgress"
          role="progressbar"
        >
          <div
            className="attemptArtifactProgressBar"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {errorMessage ? (
        <small className="setupFieldError">{errorMessage}</small>
      ) : noticeMessage ? (
        <small className="fieldHint">{noticeMessage}</small>
      ) : (
        <small className="fieldHint">
          Uploaded files stay attached after you click Save Answer.
        </small>
      )}

      {artifacts.length ? (
        <div className="attemptArtifactList">
          {artifacts.map((artifact) => (
            <div className="attemptArtifactRow" key={artifact.upload_token}>
              <div>
                <strong>
                  {artifact.file_name || artifactKindLabel(artifact.asset_kind)}
                </strong>
                <span>
                  {artifactKindLabel(artifact.asset_kind)}
                  {artifact.storage_status ? ` · ${artifact.storage_status}` : ""}
                </span>
              </div>
              <div className="attemptArtifactRowActions">
                {artifact.file_url ? (
                  <a
                    className="button buttonGhost"
                    href={artifact.file_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open
                  </a>
                ) : null}
                <button
                  className="button buttonGhost"
                  disabled={isUploading}
                  onClick={() =>
                    setArtifacts((current) =>
                      current.filter(
                        (candidate) =>
                          candidate.upload_token !== artifact.upload_token,
                      ),
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

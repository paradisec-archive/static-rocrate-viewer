type MediaAction = "audio" | "image" | "download";

const audioTypes = new Set(["audio/mpeg", "audio/wav", "audio/vnd.wav"]);
const imageTypes = new Set(["image/jpeg", "image/png"]);

export const getMediaAction = (encodingFormat: string): MediaAction => {
  if (audioTypes.has(encodingFormat)) return "audio";
  if (imageTypes.has(encodingFormat)) return "image";
  return "download";
};

export const isPlayableAudio = (encodingFormat: string): boolean =>
  encodingFormat === "audio/mpeg";

export const getMediaLabel = (encodingFormat: string): string => {
  const labels: Record<string, string> = {
    "audio/mpeg": "MP3 Audio",
    "audio/wav": "WAV Audio",
    "audio/vnd.wav": "WAV Audio",
    "image/jpeg": "JPEG Image",
    "image/png": "PNG Image",
    "image/tiff": "TIFF Image",
  };
  return labels[encodingFormat] ?? encodingFormat;
};

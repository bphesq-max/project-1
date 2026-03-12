export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image: string;
};

export async function fetchLinkPreview(sourceUrl: string) {
  const response = await fetch(`/api/link-preview?url=${encodeURIComponent(sourceUrl)}`);
  const payload = (await response.json()) as LinkPreview | { error: string };

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Unable to fetch preview.");
  }

  return payload;
}

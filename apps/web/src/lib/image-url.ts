// Turn a pasted image link into one a browser can actually load in an <img>.
// Google Drive "share" links point at an HTML viewer page, not the image
// bytes, so they never render — we rewrite them to the hotlink-friendly
// googleusercontent endpoint. Other URLs pass through unchanged.

export function normalizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Extract a Drive file id from the common share-link shapes:
  //   https://drive.google.com/file/d/<ID>/view?usp=sharing
  //   https://drive.google.com/open?id=<ID>
  //   https://drive.google.com/uc?export=view&id=<ID>
  const driveId =
    trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/)?.[1] ??
    trimmed.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([^&]+)/)?.[1];

  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}`;

  return trimmed;
}

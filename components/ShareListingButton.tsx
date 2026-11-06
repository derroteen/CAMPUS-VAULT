"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type ShareListingButtonProps = {
  listingId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
};

export function ShareListingButton({
  listingId,
  title,
  description,
  imageUrl,
}: ShareListingButtonProps) {
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setShareError(null);

    if (!navigator.share) {
      setShareError("Sharing isn't supported on this device.");
      return;
    }

    setSharing(true);
    try {
      const url = new URL(`/marketplace/${listingId}`, window.location.origin).toString();
      const text = [description?.trim(), url].filter(Boolean).join("\n\n");
      let shareData: ShareData = { title, text };

      if (imageUrl) {
        const response = await fetch(`/api/marketplace/${listingId}/share-image`);
        if (!response.ok) {
          throw new Error(`Unable to load listing image (${response.status}).`);
        }

        const image = await response.blob();
        const extension = image.type.split("/")[1]?.split(";")[0] || "jpg";
        const file = new File([image], `listing-${listingId}.${extension}`, {
          type: image.type || "image/jpeg",
        });

        if (navigator.canShare?.({ files: [file] })) {
          shareData = { title, text, files: [file] };
        } else {
          shareData = {
            title,
            text: [description?.trim(), imageUrl, url].filter(Boolean).join("\n\n"),
          };
        }
      }

      await navigator.share(shareData);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Failed to share marketplace listing:", error);
      setShareError("Couldn't share this listing. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-charcoal shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
        aria-label={`Share ${title}`}
        title="Share listing"
      >
        <Share2 className="h-4 w-4" />
      </button>
      {shareError ? (
        <span
          role="alert"
          className="absolute bottom-2 left-2 max-w-[75%] rounded-lg bg-slate-900/95 px-2 py-1 text-xs text-coral shadow-sm"
        >
          {shareError}
        </span>
      ) : null}
    </>
  );
}

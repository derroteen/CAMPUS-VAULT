"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

type ResourceViewerProps = {
  resourceId: string;
  resourceTitle: string;
};

export default function ResourceViewer({ resourceId, resourceTitle }: ResourceViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const [pageContainerWidth, setPageContainerWidth] = useState(0);

  const refreshSignedUrl = useCallback(
    async (silent = false) => {
      if (refreshInFlightRef.current) {
        return;
      }

      refreshInFlightRef.current = true;

      if (!silent) {
        setLoadingUrl(true);
        setError(null);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError("Sign in to view this resource.");
          setSignedUrl(null);
          return;
        }

        const response = await fetch(`/api/resources/${resourceId}/view`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const result = await response.json();
        if (!response.ok || !result.url) {
          if (!silent) {
            setError(result.error ?? "Unable to load this resource right now.");
          }
          return;
        }

        setSignedUrl(result.url);
        if (!silent) {
          setLoadingPdf(true);
        }
      } catch {
        if (!silent) {
          setError("Unable to load this resource right now.");
        }
      } finally {
        if (!silent) {
          setLoadingUrl(false);
        }
        refreshInFlightRef.current = false;
      }
    },
    [resourceId]
  );

  useEffect(() => {
    void refreshSignedUrl();
  }, [refreshSignedUrl]);

  useEffect(() => {
    const measure = () => {
      if (!pageContainerRef.current) {
        return;
      }

      setPageContainerWidth(pageContainerRef.current.clientWidth);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    if (pageContainerRef.current) {
      observer.observe(pageContainerRef.current);
    }

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [signedUrl]);

  const fitWidth = Math.max(240, Math.floor(((pageContainerWidth > 0 ? pageContainerWidth : 360) - 24) * scale));

  const handleLoadSuccess = ({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
    setPageNumber((current) => Math.min(Math.max(current, 1), nextNumPages));
    setLoadingPdf(false);
    setError(null);
  };

  const handleLoadError = async (loadError: Error) => {
    const message = loadError.message.toLowerCase();
    const couldBeExpired =
      message.includes("403") ||
      message.includes("401") ||
      message.includes("expired") ||
      message.includes("signature") ||
      message.includes("token");

    if (couldBeExpired) {
      await refreshSignedUrl(true);
      return;
    }

    setLoadingPdf(false);
    setError("Unable to render this PDF right now.");
  };

  const goPrev = () => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const goNext = () => {
    setPageNumber((current) => Math.min(numPages || 1, current + 1));
  };

  const zoomOut = () => {
    setScale((current) => Math.max(0.6, Number((current - 0.1).toFixed(1))));
  };

  const zoomIn = () => {
    setScale((current) => Math.min(2, Number((current + 0.1).toFixed(1))));
  };

  return (
    <section
      className="flex max-h-[80vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`Viewer for ${resourceTitle}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-medium text-charcoal">{resourceTitle}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-sm sm:gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageNumber <= 1 || loadingPdf || !numPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-charcoal transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <span className="min-w-24 text-center text-slate-700">
            {numPages > 0 ? `Page ${pageNumber} of ${numPages}` : "Page -"}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={pageNumber >= numPages || loadingPdf || !numPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-charcoal transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-charcoal transition hover:bg-slate-50"
          >
            -
          </button>
          <span className="min-w-16 text-center text-slate-700">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-charcoal transition hover:bg-slate-50"
          >
            +
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
        {loadingUrl ? (
          <div className="mx-auto max-w-3xl space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-[65vh] w-full rounded-2xl" />
          </div>
        ) : error ? (
          <div className="mx-auto max-w-xl rounded-xl border border-coral/20 bg-white p-6 text-center">
            <p className="text-sm text-coral">{error}</p>
          </div>
        ) : signedUrl ? (
          <div className="overflow-x-auto">
            <div ref={pageContainerRef} className="mx-auto w-full max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Document
                file={signedUrl}
                loading={
                  <div className="w-[300px] sm:w-[640px]">
                    <Skeleton className="h-[65vh] w-full rounded-xl" />
                  </div>
                }
                onLoadSuccess={handleLoadSuccess}
                onLoadError={handleLoadError}
                onSourceError={handleLoadError}
              >
                <Page
                  pageNumber={pageNumber}
                  width={fitWidth}
                  renderMode="canvas"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
              {loadingPdf ? <Skeleton className="mt-3 h-2 w-32 rounded-full" /> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
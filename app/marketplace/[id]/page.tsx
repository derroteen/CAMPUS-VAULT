"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

type ListingDetail = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  phone_number: string;
  whatsapp_number: string | null;
  status: string;
  is_boosted: boolean;
  created_at: string;
  expires_at: string;
  category_name: string | null;
};

type ListingImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Get current user (may be null for anon visitors)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      setCurrentUserId(userId);

      // Fetch listing
      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("id, seller_id, title, description, price, phone_number, whatsapp_number, status, is_boosted, created_at, expires_at, category_id")
        .eq("id", listingId)
        .single();

      if (listingError || !listingData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Visibility check: active listings are public; non-active only for owner
      if (listingData.status !== "active" && listingData.seller_id !== userId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch category name
      let categoryName: string | null = null;
      if (listingData.category_id) {
        const { data: catData } = await supabase
          .from("market_categories")
          .select("name")
          .eq("id", listingData.category_id)
          .single();
        categoryName = catData?.name ?? null;
      }

      setListing({
        id: listingData.id,
        seller_id: listingData.seller_id,
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        phone_number: listingData.phone_number,
        whatsapp_number: listingData.whatsapp_number,
        status: listingData.status,
        is_boosted: listingData.is_boosted,
        created_at: listingData.created_at,
        expires_at: listingData.expires_at,
        category_name: categoryName,
      });

      // Fetch images
      const { data: imgData } = await supabase
        .from("listing_images")
        .select("id, image_url, sort_order")
        .eq("listing_id", listingId)
        .order("sort_order", { ascending: true });

      if (imgData) setImages(imgData);

      setLoading(false);
    };

    load();
  }, [listingId]);

  useEffect(() => {
    const loadWishlistState = async () => {
      if (!currentUserId || !listing?.id) {
        return;
      }

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("listing_id", listing.id)
        .maybeSingle();

      if (error) {
        setIsWishlisted(false);
        return;
      }

      setIsWishlisted(Boolean(data));
    };

    loadWishlistState();
  }, [currentUserId, listing?.id]);

  const isOwner = currentUserId != null && listing?.seller_id === currentUserId;

  const handleWishlistToggle = async () => {
    if (!listing) return;

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setWishlistLoading(true);

    if (isWishlisted) {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", currentUserId)
        .eq("listing_id", listing.id);

      if (!error) {
        setIsWishlisted(false);
      }
    } else {
      const { error } = await supabase
        .from("wishlist_items")
        .insert({ user_id: currentUserId, listing_id: listing.id });

      if (!error) {
        setIsWishlisted(true);
      }
    }

    setWishlistLoading(false);
  };

  const handleDelete = async () => {
    if (!listing) return;
    setDeleting(true);

    // Delete associated images from storage first
    if (images.length > 0) {
      // Extract storage paths from public URLs
      const bucketBase = supabase.storage.from("listing-images").getPublicUrl("").data.publicUrl;
      const storagePaths = images
        .map((img) => {
          if (img.image_url.startsWith(bucketBase)) {
            return decodeURIComponent(img.image_url.slice(bucketBase.length));
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        await supabase.storage.from("listing-images").remove(storagePaths);
      }
    }

    // listing_images rows cascade-delete from the listings FK
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listing.id);

    if (error) {
      setDeleting(false);
      return;
    }

    router.push("/marketplace");
  };

  const formatWhatsAppUrl = (phone: string, title: string) => {
    // Strip everything except digits
    let digits = phone.replace(/\D/g, "");
    // Prefix with Kenya country code if it starts with 0
    if (digits.startsWith("0")) {
      digits = "254" + digits.slice(1);
    }
    const message = encodeURIComponent(
      `Hi, I'm interested in your product on MVCorner: ${title}`
    );
    return `https://wa.me/${digits}?text=${message}`;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatPrice = (price: number) =>
    `KES ${price.toLocaleString("en-KE")}`;

  const prevImage = () =>
    setCurrentImage((i) => (i === 0 ? images.length - 1 : i - 1));
  const nextImage = () =>
    setCurrentImage((i) => (i === images.length - 1 ? 0 : i + 1));

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-3 shadow-sm">
                <Skeleton className="h-full w-full rounded-xl" />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-6 shadow-sm sm:p-8">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="mt-4 h-8 w-4/5 rounded-lg" />
              <Skeleton className="mt-4 h-9 w-1/2 rounded-lg" />
              <div className="mt-6 space-y-3">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-5/6 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>
              <Skeleton className="mt-8 h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Not found state ────────────────────────────────────────────────────
  if (notFound || !listing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-warm-bg px-6 text-charcoal">
        <p className="text-lg text-charcoal/60">
          Product not found or no longer available.
        </p>
        <Link
          href="/marketplace"
          className="text-sm text-forest transition hover:text-coral"
        >
          ← Back to marketplace
        </Link>
      </main>
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back link */}
        <Link
          href="/marketplace"
          className="mb-6 inline-flex items-center gap-1 text-sm text-charcoal/60 transition hover:text-forest"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to marketplace
        </Link>

        {/* Non-active status banner for owners */}
        {listing.status !== "active" && isOwner && (
          <div className="mb-6 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-sunflower/25 border-y-sunflower/25 border-l-4 border-l-sunflower bg-white/90 p-4 shadow-sm">
            <p className="text-sm text-charcoal">
              This product is <span className="font-semibold">{listing.status}</span> and is only visible to you.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 shadow-sm">
              {images.length > 0 ? (
                <>
                  <Image
                    src={images[currentImage].image_url}
                    alt={`${listing.title} — image ${currentImage + 1}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                    priority
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-charcoal shadow-sm transition hover:bg-warm-bg"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-charcoal shadow-sm transition hover:bg-warm-bg"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs text-charcoal shadow-sm">
                        {currentImage + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-charcoal/30">
                  No images
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setCurrentImage(idx)}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      idx === currentImage
                        ? "border-leaf"
                        : "border-forest/15 hover:border-coral"
                    }`}
                  >
                    <Image
                      src={img.image_url}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="relative overflow-hidden rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-6 shadow-sm sm:p-8">
            <div className="absolute right-0 top-0 h-7 w-7 bg-sunflower/35 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
            {listing.category_name && (
              <span className="mb-3 inline-block rounded-full border border-leaf/25 bg-leaf/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-forest">
                {listing.category_name}
              </span>
            )}

            <h1 className="text-2xl font-semibold text-charcoal sm:text-3xl">
              {listing.title}
            </h1>

            <p className="mt-3 text-3xl font-bold text-forest">
              {formatPrice(listing.price)}
            </p>

            <p className="mt-1 text-sm text-charcoal/60">
              Posted {formatDate(listing.created_at)}
            </p>

            {listing.description && (
              <div className="mt-6 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-medium text-charcoal/75">
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal/70">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-8 space-y-3">
              {isOwner ? (
                <>
                  <Link
                    href={`/marketplace/${listing.id}/edit`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-medium text-white transition hover:bg-leaf"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit product
                  </Link>

                  {showDeleteConfirm ? (
                    <div className="space-y-2 rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/90 p-4 shadow-sm">
                      <p className="text-sm text-charcoal">
                        Are you sure? This will permanently delete this product
                        and its images.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex-1 rounded-xl bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-forest disabled:opacity-70"
                        >
                          {deleting ? "Deleting..." : "Yes, delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 rounded-xl border border-forest/25 px-4 py-2 text-sm font-medium text-forest transition hover:bg-sunflower/15"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/90 px-4 py-3 text-sm font-medium text-coral shadow-sm transition hover:bg-sunflower/15"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete product
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleWishlistToggle}
                    disabled={wishlistLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-leaf/25 bg-leaf/10 px-4 py-3 text-sm font-medium text-forest transition hover:bg-sunflower/15 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Heart
                      className={`h-4 w-4 ${isWishlisted ? "fill-coral text-coral" : "text-charcoal/60"}`}
                    />
                    {wishlistLoading
                      ? "Updating..."
                      : isWishlisted
                        ? "Saved to wishlist"
                        : "Save to wishlist"}
                  </button>

                  <a
                    href={`tel:${listing.phone_number}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-medium text-white transition hover:bg-forest"
                  >
                    <Phone className="h-4 w-4" />
                    Call / SMS
                  </a>

                  {listing.whatsapp_number && (
                    <a
                      href={formatWhatsAppUrl(
                        listing.whatsapp_number,
                        listing.title
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-leaf/25 bg-leaf/10 px-4 py-3 text-sm font-medium text-forest transition hover:bg-sunflower/15"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

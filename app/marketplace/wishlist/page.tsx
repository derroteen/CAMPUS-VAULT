"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import { MouseEvent, useEffect, useState } from "react";
import { Skeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

type WishlistJoinedRow = {
  listing_id: string;
  listings: WishlistListingRow | WishlistListingRow[] | null;
};

type WishlistListingRow = {
  id: string;
  title: string;
  price: number;
  status: string;
  seller_id: string;
  category_id: string | null;
  created_at: string;
};

type WishlistListing = {
  id: string;
  title: string;
  price: number;
  status: string;
  seller_id: string;
  category_name: string | null;
  thumbnail_url: string | null;
};

export default function WishlistPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<WishlistListing[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadWishlist = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;
      setCurrentUserId(uid);

      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlist_items")
        .select(
          "listing_id, listings(id, title, price, status, seller_id, category_id, created_at)"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (wishlistError || !wishlistData) {
        setListings([]);
        setLoading(false);
        return;
      }

      const normalizedRows = (wishlistData as WishlistJoinedRow[])
        .map((row) => {
          const listing = Array.isArray(row.listings)
            ? row.listings[0] ?? null
            : row.listings;

          return {
            listing_id: row.listing_id,
            listing,
          };
        })
        .filter(
          (row): row is { listing_id: string; listing: WishlistListingRow } =>
            row.listing !== null
        );

      const activeRows = normalizedRows.filter(
        (row) => row.listing.status === "active"
      );

      if (activeRows.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const listingIds = activeRows.map((row) => row.listing_id);
      const categoryIds = Array.from(
        new Set(
          activeRows
            .map((row) => row.listing.category_id)
            .filter(Boolean)
        )
      ) as string[];

      const { data: imagesData } = await supabase
        .from("listing_images")
        .select("listing_id, image_url, sort_order")
        .in("listing_id", listingIds)
        .order("sort_order", { ascending: true });

      const imageMap = new Map<string, string>();
      if (imagesData) {
        for (const image of imagesData) {
          if (!imageMap.has(image.listing_id)) {
            imageMap.set(image.listing_id, image.image_url);
          }
        }
      }

      const categoryMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const { data: categoriesData } = await supabase
          .from("market_categories")
          .select("id, name")
          .in("id", categoryIds);

        if (categoriesData) {
          for (const category of categoriesData) {
            categoryMap.set(category.id, category.name);
          }
        }
      }

      const mergedListings: WishlistListing[] = activeRows
        .map((row) => {
          return {
            id: row.listing.id,
            title: row.listing.title,
            price: row.listing.price,
            status: row.listing.status,
            seller_id: row.listing.seller_id,
            category_name: row.listing.category_id
              ? (categoryMap.get(row.listing.category_id) ?? null)
              : null,
            thumbnail_url: imageMap.get(row.listing.id) ?? null,
          };
        })
        .filter(Boolean) as WishlistListing[];

      setListings(mergedListings);
      setLoading(false);
    };

    loadWishlist();
  }, [router]);

  const handleRemoveFromWishlist = async (
    event: MouseEvent<HTMLButtonElement>,
    listingId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("user_id", currentUserId)
      .eq("listing_id", listingId);

    if (!error) {
      setListings((prev) => prev.filter((listing) => listing.id !== listingId));
    }

    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(listingId);
      return next;
    });
  };

  const formatPrice = (price: number) => `KES ${price.toLocaleString("en-KE")}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <Skeleton className="h-9 w-52 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-72 rounded-lg" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-4 shadow-sm"
              >
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="mt-4 h-4 w-3/4 rounded-lg" />
                <Skeleton className="mt-3 h-4 w-1/3 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-charcoal">My Wishlist</h1>
          <p className="mt-2 text-sm text-charcoal/60">
            Products you have saved for later.
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-forest/15 bg-white/90 p-8 text-center text-charcoal/60 shadow-sm">
            You haven&apos;t saved any products yet.{" "}
            <Link href="/marketplace" className="text-forest transition hover:text-coral">
              Browse marketplace →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="group relative overflow-hidden rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 shadow-sm transition hover:border-coral/30 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 h-5 w-5 bg-sunflower/30 [clip-path:polygon(100%_0,0_0,100%_100%)]" />

                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-warm-bg">
                  {listing.thumbnail_url ? (
                    <Image
                      src={listing.thumbnail_url}
                      alt={listing.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-charcoal/30">
                      <ShoppingBag className="h-10 w-10" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(event) => handleRemoveFromWishlist(event, listing.id)}
                    disabled={removingIds.has(listing.id)}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                    aria-label="Remove from wishlist"
                  >
                    <Heart className="h-4 w-4 fill-coral text-coral" />
                  </button>
                </div>

                <div className="p-4">
                  {listing.category_name && (
                    <span className="mb-2 inline-block rounded-full border border-leaf/25 bg-leaf/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-forest">
                      {listing.category_name}
                    </span>
                  )}
                  <h3 className="line-clamp-2 text-sm font-semibold text-charcoal group-hover:text-forest">
                    {listing.title}
                  </h3>
                  <p className="mt-2 text-lg font-bold text-forest">
                    {formatPrice(listing.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

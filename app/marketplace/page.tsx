"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, Suspense, useEffect, useState } from "react";
import { Heart, Search, ShoppingBag, Sparkles } from "lucide-react";
import ProTrialBanner from "@/app/components/ProTrialBanner";
import { Skeleton } from "@/components/Skeleton";
import { isSubscriptionCurrentlyActive } from "@/lib/subscription-status";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  is_boosted: boolean;
  seller_id: string;
  created_at: string;
  category_name: string | null;
  thumbnail_url: string | null;
};

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-warm-bg px-6 py-12 text-charcoal">
          <div className="mx-auto max-w-6xl space-y-4">
            <Skeleton className="h-9 w-56 rounded-xl" />
            <Skeleton className="h-5 w-80 rounded-xl" />
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
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [wishlistedListingIds, setWishlistedListingIds] = useState<Set<string>>(new Set());
  const [wishlistLoadingIds, setWishlistLoadingIds] = useState<Set<string>>(new Set());
  const [showProductRequest, setShowProductRequest] = useState(false);
  const [productRequestTitle, setProductRequestTitle] = useState("");
  const [productRequestDescription, setProductRequestDescription] = useState("");
  const [productRequestError, setProductRequestError] = useState<string | null>(null);
  const [productRequestMessage, setProductRequestMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setCurrentUserId(session?.user?.id ?? null);
    };

    loadSession();
  }, []);

  // Load categories once on mount
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from("market_categories")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (data) setCategories(data);
    };

    loadCategories();
  }, []);

  // Fetch listings whenever category or search term changes (debounced for search)
  useEffect(() => {
    const fetchListings = async () => {
      setSearching(true);

      // Build the query: active listings joined with first image and category name.
      // Supabase JS client doesn't support lateral joins, so we fetch listings
      // first, then batch-fetch images and categories.

      let query = supabase
        .from("listings")
        .select("id, title, price, seller_id, created_at, category_id")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (selectedCategoryId !== "all") {
        query = query.eq("category_id", selectedCategoryId);
      }

      const trimmed = searchQuery.trim();
      if (trimmed) {
        query = query.ilike("title", `%${trimmed}%`);
      }

      const { data: listingsData, error } = await query;

      if (error || !listingsData) {
        setListings([]);
        setSearching(false);
        setLoading(false);
        return;
      }

      if (listingsData.length === 0) {
        setListings([]);
        setSearching(false);
        setLoading(false);
        return;
      }

      const listingIds = listingsData.map((l) => l.id);
      const sellerIds = Array.from(new Set(listingsData.map((l) => l.seller_id)));
      const categoryIds = Array.from(
        new Set(listingsData.map((l) => l.category_id).filter(Boolean))
      );

      const activeProSellers = new Set<string>();
      if (sellerIds.length > 0) {
        const { data: activeSubscriptions } = await supabase
          .from("subscriptions")
          .select("user_id, status, expires_at")
          .in("user_id", sellerIds)
          .eq("tier", "pro")
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString());

        (activeSubscriptions ?? []).forEach((subscription) => {
          if (isSubscriptionCurrentlyActive(subscription)) {
            activeProSellers.add(subscription.user_id);
          }
        });
      }

      // Fetch first image per listing (lowest sort_order)
      const { data: imagesData } = await supabase
        .from("listing_images")
        .select("listing_id, image_url, sort_order")
        .in("listing_id", listingIds)
        .order("sort_order", { ascending: true });

      // Build a map: listing_id -> first image_url
      const imageMap = new Map<string, string>();
      if (imagesData) {
        for (const img of imagesData) {
          if (!imageMap.has(img.listing_id)) {
            imageMap.set(img.listing_id, img.image_url);
          }
        }
      }

      // Fetch category names
      const categoryMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const { data: catData } = await supabase
          .from("market_categories")
          .select("id, name")
          .in("id", categoryIds);

        if (catData) {
          for (const cat of catData) {
            categoryMap.set(cat.id, cat.name);
          }
        }
      }

      // Merge
      const merged: Listing[] = listingsData.map((l) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        is_boosted: activeProSellers.has(l.seller_id),
        seller_id: l.seller_id,
        created_at: l.created_at,
        category_name: l.category_id ? (categoryMap.get(l.category_id) ?? null) : null,
        thumbnail_url: imageMap.get(l.id) ?? null,
      }));

      const sortedListings = merged.sort((a, b) => {
        if (a.is_boosted !== b.is_boosted) {
          return a.is_boosted ? -1 : 1;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setListings(sortedListings);
      setSearching(false);
      setLoading(false);
    };

    // Debounce search input; category changes fire immediately
    const delay = searchQuery.trim() ? 400 : 0;
    const timeout = window.setTimeout(fetchListings, delay);
    return () => window.clearTimeout(timeout);
  }, [selectedCategoryId, searchQuery]);

  useEffect(() => {
    const loadWishlistState = async () => {
      if (!currentUserId) {
        setWishlistedListingIds(new Set());
        return;
      }

      const displayedListingIds = listings.map((listing) => listing.id);
      if (displayedListingIds.length === 0) {
        setWishlistedListingIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("listing_id")
        .eq("user_id", currentUserId)
        .in("listing_id", displayedListingIds);

      if (error || !data) {
        setWishlistedListingIds(new Set());
        return;
      }

      setWishlistedListingIds(new Set(data.map((row) => row.listing_id)));
    };

    loadWishlistState();
  }, [currentUserId, listings]);

  const handleWishlistToggle = async (
    event: MouseEvent<HTMLButtonElement>,
    listingId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setWishlistLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });

    const isWishlisted = wishlistedListingIds.has(listingId);

    if (isWishlisted) {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id", currentUserId)
        .eq("listing_id", listingId);

      if (!error) {
        setWishlistedListingIds((prev) => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("wishlist_items")
        .insert({ user_id: currentUserId, listing_id: listingId });

      if (!error) {
        setWishlistedListingIds((prev) => {
          const next = new Set(prev);
          next.add(listingId);
          return next;
        });
      }
    }

    setWishlistLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(listingId);
      return next;
    });
  };

  const handleProductRequestSubmit = async (event?: FormEvent<HTMLFormElement> | null) => {
    event?.preventDefault();
    setProductRequestError(null);
    setProductRequestMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setProductRequestError("You must be logged in to request a product.");
      return;
    }

    if (!productRequestTitle.trim()) {
      setProductRequestError("Please enter the product title you're looking for.");
      return;
    }

    const { error: requestError } = await supabase.from("product_requests").insert({
      requested_by: session.user.id,
      title: productRequestTitle.trim(),
      description: productRequestDescription.trim() || null,
      status: "pending",
    });

    if (requestError) {
      setProductRequestError(requestError.message);
      return;
    }

    fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: "product_request",
        title: productRequestTitle.trim(),
        userEmail: session.user.email ?? "",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error("Admin notification API returned error status:", res.status);
        }
      })
      .catch((err) => {
        console.error("Failed to send product request admin email notification:", err);
      });

    setShowProductRequest(false);
    setProductRequestTitle("");
    setProductRequestDescription("");
    setProductRequestMessage(
      "Thanks! Your request has been submitted for review. Approved requests appear on the homepage so sellers can spot demand."
    );
  };

  const formatPrice = (price: number) =>
    `KES ${price.toLocaleString("en-KE")}`;

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-8 shadow-sm sm:p-10">
          <div className="absolute right-0 top-0 h-7 w-7 bg-sunflower/35 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
          <div className="inline-flex items-center rounded-full border border-leaf/30 bg-leaf/10 px-3 py-1 text-sm font-medium text-forest">
            <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
            Campus Marketplace
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-charcoal sm:text-5xl">
                Buy &amp; sell on campus
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-charcoal/70">
                Electronics, books, hostel items, and more — from the campus community, for
                the campus community.
              </p>
            </div>
            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-4 shadow-sm">
              <label
                htmlFor="marketplace-search"
                className="mb-2 block text-sm font-medium text-charcoal/75"
              >
                Search products
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
                <input
                  id="marketplace-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title…"
                  className="w-full rounded-xl border border-forest/15 bg-white py-3 pl-10 pr-4 text-sm text-charcoal outline-none ring-0 placeholder:text-charcoal/40"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <ProTrialBanner />
        </div>

        {/* Main grid: sidebar + cards */}
        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-charcoal">Categories</h2>
              <div className="mt-4 space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("all")}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selectedCategoryId === "all"
                      ? "bg-leaf/15 font-medium text-forest"
                      : "text-charcoal/70 hover:bg-sunflower/15 hover:text-forest"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      selectedCategoryId === cat.id
                        ? "bg-leaf/15 font-medium text-forest"
                        : "text-charcoal/70 hover:bg-sunflower/15 hover:text-forest"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/marketplace/new"
              className="flex items-center justify-center gap-2 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 px-4 py-3 text-sm font-medium text-coral shadow-sm transition hover:bg-sunflower/15"
            >
              <ShoppingBag className="h-4 w-4" />
              Post a product
            </Link>

            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 p-5 shadow-sm">
              <button
                type="button"
                onClick={() => setShowProductRequest((current) => !current)}
                className="text-left text-sm font-medium text-forest transition hover:text-leaf"
              >
                Can&apos;t find a product? Request it
              </button>

              {showProductRequest ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-5">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="productRequestTitle" className="mb-2 block text-sm text-slate-700">
                        Product title
                      </label>
                      <input
                        id="productRequestTitle"
                        type="text"
                        value={productRequestTitle}
                        onChange={(e) => setProductRequestTitle(e.target.value)}
                        placeholder="e.g. Engineering Drawing Set"
                        className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="productRequestDescription" className="mb-2 block text-sm text-slate-700">
                        Description (optional)
                      </label>
                      <textarea
                        id="productRequestDescription"
                        value={productRequestDescription}
                        onChange={(e) => setProductRequestDescription(e.target.value)}
                        placeholder="Add preferred condition, model, size, or budget range."
                        className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-charcoal"
                        rows={3}
                      />
                    </div>
                  </div>
                  {productRequestError ? <p className="mt-3 text-sm text-coral">{productRequestError}</p> : null}
                  {productRequestMessage ? <p className="mt-3 text-sm text-forest">{productRequestMessage}</p> : null}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleProductRequestSubmit()}
                      className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-white transition hover:bg-leaf"
                    >
                      Submit request
                    </button>
                  </div>
                </div>
              ) : null}

              {!showProductRequest && productRequestMessage ? (
                <p className="mt-3 text-sm text-forest">{productRequestMessage}</p>
              ) : null}
            </div>
          </aside>

          {/* Listings grid */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-charcoal">
                  {searchQuery.trim()
                    ? `Results for "${searchQuery.trim()}"`
                    : "Active products"}
                </h2>
                <p className="text-sm text-charcoal/60">
                  {searchQuery.trim()
                    ? "Showing matching products across the marketplace."
                    : "Browse what's being sold on campus right now."}
                </p>
              </div>
              <span className="rounded-full border border-forest/15 bg-white/90 px-3 py-1 text-sm text-charcoal shadow-sm">
                {listings.length} product{listings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading || searching ? (
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
            ) : listings.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/marketplace/${listing.id}`}
                    className="group relative overflow-hidden rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 shadow-sm transition hover:border-coral/30 hover:shadow-md"
                  >
                    <div className="absolute right-0 top-0 h-5 w-5 bg-sunflower/30 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
                    {/* Thumbnail */}
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
                      {listing.is_boosted && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-sunflower/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-charcoal">
                          <Sparkles className="h-3 w-3" />
                          Boosted
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(event) => handleWishlistToggle(event, listing.id)}
                        disabled={wishlistLoadingIds.has(listing.id)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label={wishlistedListingIds.has(listing.id) ? "Remove from wishlist" : "Save to wishlist"}
                      >
                        <Heart
                          className={`h-4 w-4 ${wishlistedListingIds.has(listing.id) ? "fill-coral text-coral" : "text-charcoal/60"}`}
                        />
                      </button>
                    </div>

                    {/* Details */}
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
            ) : (
              <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-8 text-center text-charcoal/60 shadow-sm">
                No products match your current filters.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

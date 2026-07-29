"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { Search, ShoppingBag, Sparkles } from "lucide-react";
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
  created_at: string;
  category_name: string | null;
  thumbnail_url: string | null;
};

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
          <div className="mx-auto max-w-6xl">
            <p className="text-slate-400">Loading marketplace...</p>
          </div>
        </main>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

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
        .select("id, title, price, is_boosted, created_at, category_id")
        .eq("status", "active")
        .order("is_boosted", { ascending: false })
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
      const categoryIds = Array.from(
        new Set(listingsData.map((l) => l.category_id).filter(Boolean))
      );

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
        is_boosted: l.is_boosted,
        created_at: l.created_at,
        category_name: l.category_id ? (categoryMap.get(l.category_id) ?? null) : null,
        thumbnail_url: imageMap.get(l.id) ?? null,
      }));

      setListings(merged);
      setSearching(false);
      setLoading(false);
    };

    // Debounce search input; category changes fire immediately
    const delay = searchQuery.trim() ? 400 : 0;
    const timeout = window.setTimeout(fetchListings, delay);
    return () => window.clearTimeout(timeout);
  }, [selectedCategoryId, searchQuery]);

  const formatPrice = (price: number) =>
    `KES ${price.toLocaleString("en-KE")}`;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
          <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
            <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
            Campus Marketplace
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Buy &amp; sell on campus
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-400">
                Electronics, books, hostel items, and more — from students, for
                students.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <label
                htmlFor="marketplace-search"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Search listings
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="marketplace-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Main grid: sidebar + cards */}
        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
              <h2 className="text-lg font-semibold text-white">Categories</h2>
              <div className="mt-4 space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("all")}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selectedCategoryId === "all"
                      ? "bg-emerald-500/15 font-medium text-emerald-200"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
                        ? "bg-emerald-500/15 font-medium text-emerald-200"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/marketplace/new"
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <ShoppingBag className="h-4 w-4" />
              Post a listing
            </Link>
          </aside>

          {/* Listings grid */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {searchQuery.trim()
                    ? `Results for "${searchQuery.trim()}"`
                    : "Active listings"}
                </h2>
                <p className="text-sm text-slate-400">
                  {searchQuery.trim()
                    ? "Showing matching listings across the marketplace."
                    : "Browse what students are selling right now."}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                {listings.length} listing{listings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loading || searching ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
                Loading listings...
              </div>
            ) : listings.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/marketplace/${listing.id}`}
                    className="group rounded-2xl border border-slate-800 bg-slate-900 shadow-sm transition hover:border-emerald-500/40 hover:shadow-lg"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-slate-800">
                      {listing.thumbnail_url ? (
                        <Image
                          src={listing.thumbnail_url}
                          alt={listing.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-600">
                          <ShoppingBag className="h-10 w-10" />
                        </div>
                      )}
                      {listing.is_boosted && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-950">
                          <Sparkles className="h-3 w-3" />
                          Boosted
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      {listing.category_name && (
                        <span className="mb-2 inline-block rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-200">
                          {listing.category_name}
                        </span>
                      )}
                      <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-emerald-100">
                        {listing.title}
                      </h3>
                      <p className="mt-2 text-lg font-bold text-emerald-400">
                        {formatPrice(listing.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">
                No listings match your current filters.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

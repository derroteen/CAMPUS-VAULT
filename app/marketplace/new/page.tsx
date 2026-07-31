"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
};

type ImagePreview = {
  file: File;
  url: string;
};

const FREE_MAX_IMAGES = 2;
const PRO_MAX_IMAGES = 6;
const FREE_MAX_ACTIVE_LISTINGS = 3;

export default function NewListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [activeListingCount, setActiveListingCount] = useState(0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxImages = isPro ? PRO_MAX_IMAGES : FREE_MAX_IMAGES;

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      // Load categories, subscription tier, and active listing count in parallel
      const [catResult, subResult, countResult] = await Promise.all([
        supabase
          .from("market_categories")
          .select("id, name")
          .order("name", { ascending: true }),
        supabase
          .from("subscriptions")
          .select("tier")
          .eq("user_id", userId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", userId)
          .eq("status", "active"),
      ]);

      if (catResult.data) {
        setCategories(catResult.data);
      }

      if (subResult.data?.tier === "pro") {
        setIsPro(true);
      }

      setActiveListingCount(countResult.count ?? 0);
      setLoading(false);
    };

    init();
  }, [router]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const remaining = maxImages - images.length;
    const newFiles = Array.from(files).slice(0, remaining);

    const newPreviews: ImagePreview[] = newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newPreviews]);

    // Reset input so re-selecting the same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const isAtListingCap = !isPro && activeListingCount >= FREE_MAX_ACTIVE_LISTINGS;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (isAtListingCap) {
      setError(
        "Free plan allows up to 3 active listings. Upgrade to Pro for more."
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("You must be logged in to create a listing.");
      return;
    }

    if (
      !title.trim() ||
      !price ||
      !categoryId ||
      !phoneNumber.trim() ||
      images.length === 0
    ) {
      setError("Please fill in all required fields and add at least one image.");
      return;
    }

    setSubmitting(true);

    const userId = session.user.id;
    const timestamp = Date.now();

    // 1. Upload images to storage
    const uploadedPaths: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const safeName = img.file.name.replace(/\s+/g, "-");
      const storagePath = `${userId}/${timestamp}-${i}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(storagePath, img.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      uploadedPaths.push(storagePath);
    }

    // 2. Build public URLs
    const publicUrls = uploadedPaths.map((path) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("listing-images").getPublicUrl(path);
      return publicUrl;
    });

    // 3. Insert listing row
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { data: listing, error: insertError } = await supabase
      .from("listings")
      .insert({
        seller_id: userId,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim() || null,
        status: "active",
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !listing) {
      setError(insertError?.message ?? "Failed to create listing.");
      setSubmitting(false);
      return;
    }

    // 4. Insert listing_images rows
    const imageRows = publicUrls.map((url, idx) => ({
      listing_id: listing.id,
      image_url: url,
      sort_order: idx,
    }));

    const { error: imgInsertError } = await supabase
      .from("listing_images")
      .insert(imageRows);

    if (imgInsertError) {
      setError(imgInsertError.message);
      setSubmitting(false);
      return;
    }

    // Reset form
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setMessage("Listing created successfully!");
    setTitle("");
    setDescription("");
    setPrice("");
    setCategoryId("");
    setPhoneNumber("");
    setWhatsappNumber("");
    setImages([]);
    setActiveListingCount((c) => c + 1);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 text-charcoal">
        <p className="text-charcoal/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-bg px-4 py-10 text-charcoal sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-coral bg-white/90 p-8 shadow-sm sm:p-10">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-leaf/25 bg-leaf/10 px-3 py-1 text-sm font-medium text-forest">
            Marketplace
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Create a listing</h1>
          <p className="mt-2 text-charcoal/60">
            Sell items to fellow students on campus.
          </p>
        </div>

        {/* Free-tier listing cap warning */}
        {isAtListingCap && (
          <div className="mb-6 rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-sunflower/25 border-y-sunflower/25 border-l-4 border-l-sunflower bg-white/90 p-4 shadow-sm">
            <p className="text-sm text-charcoal">
              Free plan allows up to 3 active listings. Upgrade to Pro for more.
            </p>
            <Link
              href="/marketplace/pro"
              className="mt-2 inline-block text-sm font-medium text-forest transition hover:text-coral"
            >
              Upgrade →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
            <label htmlFor="listing-title" className="mb-2 block text-sm text-charcoal/75">
              Title
            </label>
            <input
              id="listing-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HP Laptop 15-inch, barely used"
              className="w-full rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40"
            />
          </div>

          {/* Description */}
          <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
            <label htmlFor="listing-description" className="mb-2 block text-sm text-charcoal/75">
              Description
            </label>
            <textarea
              id="listing-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item — condition, age, why you're selling, etc."
              rows={4}
              className="w-full resize-none rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40"
            />
          </div>

          {/* Price & Category */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
              <label htmlFor="listing-price" className="mb-2 block text-sm text-charcoal/75">
                Price (KES)
              </label>
              <input
                id="listing-price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 3500"
                className="w-full rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40"
              />
            </div>

            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
              <label htmlFor="listing-category" className="mb-2 block text-sm text-charcoal/75">
                Category
              </label>
              <select
                id="listing-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-charcoal"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone & WhatsApp */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
              <label htmlFor="listing-phone" className="mb-2 block text-sm text-charcoal/75">
                Phone number
              </label>
              <input
                id="listing-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40"
              />
            </div>

            <div className="rounded-2xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-warm-bg p-4 shadow-sm">
              <label htmlFor="listing-whatsapp" className="mb-2 block text-sm text-charcoal/75">
                WhatsApp number{" "}
                <span className="text-charcoal/45">(optional)</span>
              </label>
              <input
                id="listing-whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full rounded-xl border border-forest/15 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40"
              />
            </div>
          </div>

          {/* Image upload */}
          <div className="rounded-2xl border border-dashed border-forest/15 bg-white/90 p-5 shadow-sm">
            <label
              htmlFor="listing-images"
              className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-forest/15 bg-warm-bg px-4 py-8 text-center transition hover:border-coral hover:bg-white"
            >
              <ImagePlus className="mb-3 h-8 w-8 text-forest" />
              <span className="text-sm font-medium text-charcoal">
                Click to add images
              </span>
              <span className="mt-1 text-sm text-charcoal/60">
                {images.length}/{maxImages} images
                {!isPro && " (upgrade to Pro for up to 6)"}
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="listing-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={images.length >= maxImages}
              className="hidden"
            />

            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Preview ${idx + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-charcoal/60 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-coral"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="text-sm text-coral">{error}</p> : null}
          {message ? <p className="text-sm text-leaf">{message}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest/15 pt-4">
            <Link
              href="/dashboard"
              className="text-sm text-charcoal/60 transition hover:text-forest"
            >
              Back to dashboard
            </Link>
            <button
              type="submit"
              disabled={submitting || isAtListingCap}
              className="rounded-xl bg-forest px-4 py-2 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Creating..." : "Create Listing"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

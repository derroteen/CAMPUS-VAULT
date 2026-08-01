"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
};

type ExistingImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type NewImagePreview = {
  file: File;
  url: string;
};

const FREE_MAX_IMAGES = 2;
const PRO_MAX_IMAGES = 6;

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isPro, setIsPro] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImagePreview[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxImages = isPro ? PRO_MAX_IMAGES : FREE_MAX_IMAGES;
  const currentTotalImages = existingImages.length + newImages.length;

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

      // Fetch categories, user subscription tier, listing details, and existing images in parallel
      const [catResult, subResult, listingResult, imagesResult] = await Promise.all([
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
          .select("id, seller_id, title, description, price, category_id, phone_number, whatsapp_number")
          .eq("id", listingId)
          .maybeSingle(),
        supabase
          .from("listing_images")
          .select("id, image_url, sort_order")
          .eq("listing_id", listingId)
          .order("sort_order", { ascending: true }),
      ]);

      if (catResult.data) {
        setCategories(catResult.data);
      }

      if (subResult.data?.tier === "pro") {
        setIsPro(true);
      }

      const listingData = listingResult.data;
      if (!listingData) {
        router.replace("/marketplace");
        return;
      }

      // Check seller permission
      if (listingData.seller_id !== userId) {
        router.replace(`/marketplace/${listingId}`);
        return;
      }

      // Pre-fill form state
      setTitle(listingData.title ?? "");
      setDescription(listingData.description ?? "");
      setPrice(listingData.price !== undefined && listingData.price !== null ? String(listingData.price) : "");
      setCategoryId(listingData.category_id ?? "");
      setPhoneNumber(listingData.phone_number ?? "");
      setWhatsappNumber(listingData.whatsapp_number ?? "");

      if (imagesResult.data) {
        setExistingImages(imagesResult.data);
      }

      setLoading(false);
    };

    init();
  }, [listingId, router]);

  // Clean up blob URLs for new images on unmount
  useEffect(() => {
    return () => {
      newImages.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewImagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const remaining = maxImages - currentTotalImages;
    if (remaining <= 0) return;

    const selectedFiles = Array.from(files).slice(0, remaining);
    const newPreviews: NewImagePreview[] = selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setNewImages((prev) => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
    setRemovedImageIds((prev) => [...prev, id]);
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("You must be logged in to edit this product.");
      return;
    }

    if (
      !title.trim() ||
      !price ||
      !categoryId ||
      !phoneNumber.trim() ||
      currentTotalImages === 0
    ) {
      setError("Please fill in all required fields and ensure at least one image remains.");
      return;
    }

    setSubmitting(true);
    const userId = session.user.id;

    // 1. Update listings row (do not alter seller_id, created_at, or expires_at)
    const { error: updateError } = await supabase
      .from("listings")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        category_id: categoryId,
        phone_number: phoneNumber.trim(),
        whatsapp_number: whatsappNumber.trim() || null,
      })
      .eq("id", listingId)
      .eq("seller_id", userId);

    if (updateError) {
      setError(`Failed to update product: ${updateError.message}`);
      setSubmitting(false);
      return;
    }

    // 2. Delete removed images from storage bucket and listing_images table
    if (removedImageIds.length > 0) {
      // Get URLs of removed images
      const { data: removedRows } = await supabase
        .from("listing_images")
        .select("id, image_url")
        .in("id", removedImageIds);

      if (removedRows && removedRows.length > 0) {
        const bucketBase = supabase.storage
          .from("listing-images")
          .getPublicUrl("").data.publicUrl;

        const storagePaths = removedRows
          .map((row) => {
            if (row.image_url.startsWith(bucketBase)) {
              return decodeURIComponent(row.image_url.slice(bucketBase.length));
            }
            return null;
          })
          .filter(Boolean) as string[];

        if (storagePaths.length > 0) {
          await supabase.storage.from("listing-images").remove(storagePaths);
        }

        await supabase
          .from("listing_images")
          .delete()
          .in("id", removedImageIds);
      }
    }

    // 3. Upload new images and insert listing_images rows
    if (newImages.length > 0) {
      const timestamp = Date.now();
      const newImageRows: { listing_id: string; image_url: string; sort_order: number }[] = [];

      const currentSortOrder = existingImages.length;

      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const safeName = img.file.name.replace(/\s+/g, "-");
        const storagePath = `${userId}/${timestamp}-${i}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(storagePath, img.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setError(`Failed to upload image: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-images").getPublicUrl(storagePath);

        newImageRows.push({
          listing_id: listingId,
          image_url: publicUrl,
          sort_order: currentSortOrder + i,
        });
      }

      const { error: imgInsertError } = await supabase
        .from("listing_images")
        .insert(newImageRows);

      if (imgInsertError) {
        setError(`Failed to save image metadata: ${imgInsertError.message}`);
        setSubmitting(false);
        return;
      }
    }

    // Update existing images sort orders if needed
    for (let idx = 0; idx < existingImages.length; idx++) {
      const img = existingImages[idx];
      if (img.sort_order !== idx) {
        await supabase
          .from("listing_images")
          .update({ sort_order: idx })
          .eq("id", img.id);
      }
    }

    setSubmitting(false);
    router.push(`/marketplace/${listingId}`);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-bg px-6 text-charcoal">
        <p className="text-charcoal/60">Loading product details...</p>
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
          <h1 className="mt-4 text-3xl font-semibold">Edit product</h1>
          <p className="mt-2 text-charcoal/60">
            Update your item details or manage images.
          </p>
        </div>

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

          {/* Images Management */}
          <div className="rounded-2xl border border-dashed border-forest/15 bg-white/90 p-5 shadow-sm">
            <label
              htmlFor="listing-images"
              className={`mb-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest/15 bg-warm-bg px-4 py-8 text-center transition ${
                currentTotalImages >= maxImages
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:border-coral hover:bg-white"
              }`}
            >
              <ImagePlus className="mb-3 h-8 w-8 text-forest" />
              <span className="text-sm font-medium text-charcoal">
                Click to add images
              </span>
              <span className="mt-1 text-sm text-charcoal/60">
                {currentTotalImages}/{maxImages} images
                {!isPro && " (upgrade to Pro for up to 6)"}
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="listing-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewImagesChange}
              disabled={currentTotalImages >= maxImages}
              className="hidden"
            />

            {currentTotalImages > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {/* Existing Images */}
                {existingImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-forest/15 border-y-forest/15 border-l-4 border-l-forest bg-white/90 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt="Existing product image"
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-charcoal/60 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-coral"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* New Image Previews */}
                {newImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl border-r-[0.5px] border-y-[0.5px] border-r-coral/20 border-y-coral/20 border-l-4 border-l-coral bg-white/90 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`New image preview ${idx + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(idx)}
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
              href={`/marketplace/${listingId}`}
              className="text-sm text-charcoal/60 transition hover:text-forest"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-forest px-4 py-2 font-medium text-white transition hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

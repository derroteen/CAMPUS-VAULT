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
      setError("You must be logged in to edit this listing.");
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
      setError(`Failed to update listing: ${updateError.message}`);
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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-slate-300">Loading listing details...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40 sm:p-10">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">
            Marketplace
          </div>
          <h1 className="mt-4 text-3xl font-semibold">Edit listing</h1>
          <p className="mt-2 text-slate-400">
            Update your item details or manage images.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <label htmlFor="listing-title" className="mb-2 block text-sm text-slate-300">
              Title
            </label>
            <input
              id="listing-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HP Laptop 15-inch, barely used"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            />
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <label htmlFor="listing-description" className="mb-2 block text-sm text-slate-300">
              Description
            </label>
            <textarea
              id="listing-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the item — condition, age, why you're selling, etc."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            />
          </div>

          {/* Price & Category */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <label htmlFor="listing-price" className="mb-2 block text-sm text-slate-300">
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
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <label htmlFor="listing-category" className="mb-2 block text-sm text-slate-300">
                Category
              </label>
              <select
                id="listing-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
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
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <label htmlFor="listing-phone" className="mb-2 block text-sm text-slate-300">
                Phone number
              </label>
              <input
                id="listing-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <label htmlFor="listing-whatsapp" className="mb-2 block text-sm text-slate-300">
                WhatsApp number{" "}
                <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="listing-whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </div>
          </div>

          {/* Images Management */}
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5">
            <label
              htmlFor="listing-images"
              className={`mb-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-4 py-8 text-center transition ${
                currentTotalImages >= maxImages
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:border-emerald-500 hover:bg-slate-900"
              }`}
            >
              <ImagePlus className="mb-3 h-8 w-8 text-emerald-400" />
              <span className="text-sm font-medium text-slate-200">
                Click to add images
              </span>
              <span className="mt-1 text-sm text-slate-400">
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
                    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt="Existing listing image"
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/80 p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* New Image Previews */}
                {newImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl border border-emerald-500/50 bg-slate-900/80"
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
                      className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/80 p-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <Link
              href={`/marketplace/${listingId}`}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

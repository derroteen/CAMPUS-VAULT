import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";
import { ShareListingButton } from "@/components/ShareListingButton";

export type MarketplaceListingCardData = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  is_boosted: boolean;
  category_name: string | null;
  thumbnail_url: string | null;
};

type MarketplaceListingCardProps = {
  listing: MarketplaceListingCardData;
  isWishlisted?: boolean;
  wishlistLoading?: boolean;
  onWishlistToggle?: (listingId: string) => void;
};

const formatPrice = (price: number) => `KES ${price.toLocaleString("en-KE")}`;

const hasOriginalPrice = (listing: MarketplaceListingCardData) =>
  listing.original_price !== null && listing.original_price > listing.price;

export function MarketplaceListingCard({
  listing,
  isWishlisted = false,
  wishlistLoading = false,
  onWishlistToggle,
}: MarketplaceListingCardProps) {
  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/80 transition hover:border-forest/50 hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-warm-bg">
        {listing.thumbnail_url ? (
          <Image
            src={listing.thumbnail_url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-charcoal/30">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
        {listing.is_boosted && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-sunflower/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-charcoal">
            <Sparkles className="h-2.5 w-2.5" />
            Boosted
          </span>
        )}
        {hasOriginalPrice(listing) ? (
          <span className="absolute bottom-2 left-2 rounded-sm bg-sunflower px-1.5 py-0.5 text-[10px] font-bold text-charcoal">
            -{Math.round(
              ((listing.original_price! - listing.price) / listing.original_price!) * 100
            )}%
          </span>
        ) : null}
        {onWishlistToggle ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onWishlistToggle(listing.id);
            }}
            disabled={wishlistLoading}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-charcoal shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart
              className={`h-3.5 w-3.5 ${isWishlisted ? "fill-coral text-coral" : "text-charcoal/60"}`}
            />
          </button>
        ) : null}
        <ShareListingButton
          listingId={listing.id}
          title={listing.title}
          description={listing.description}
          imageUrl={listing.thumbnail_url}
        />
      </div>

      <div className="p-2 sm:p-2.5">
        <h3 className="line-clamp-2 min-h-[2rem] text-xs leading-snug text-charcoal group-hover:text-forest sm:text-[13px]">
          {listing.title}
        </h3>
        <div className="mt-1 flex items-baseline gap-1.5">
          <p className="text-sm font-bold text-sunflower sm:text-base">{formatPrice(listing.price)}</p>
          {hasOriginalPrice(listing) ? (
            <p className="text-[11px] text-slate-500 line-through">
              {formatPrice(listing.original_price ?? listing.price)}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
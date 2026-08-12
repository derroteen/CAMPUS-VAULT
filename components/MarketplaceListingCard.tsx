import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";

export type MarketplaceListingCardData = {
  id: string;
  title: string;
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
        {listing.is_boosted && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-sunflower/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-charcoal">
            <Sparkles className="h-3 w-3" />
            Boosted
          </span>
        )}
        {onWishlistToggle ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onWishlistToggle(listing.id);
            }}
            disabled={wishlistLoading}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart
              className={`h-4 w-4 ${isWishlisted ? "fill-coral text-coral" : "text-charcoal/60"}`}
            />
          </button>
        ) : null}
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
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-lg font-bold text-forest">{formatPrice(listing.price)}</p>
          {hasOriginalPrice(listing) ? (
            <p className="text-sm line-through text-charcoal/40">
              {formatPrice(listing.original_price ?? listing.price)}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
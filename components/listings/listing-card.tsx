import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, DollarSign, Truck, Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GunbrokerListing {
  itemID: number;
  title: string;
  price: number;
  thumbnailURL?: string;
  timeLeft?: string;
  isFixedPrice?: boolean;
  hasBuyNow?: boolean;
  isFeaturedItem?: boolean;
  freeShippingAvailable?: boolean;
  hasReserve?: boolean;
  hasReserveBeenMet?: boolean;
  quantity?: number;
  bidCount?: number;
  seller?: {
    username: string;
  };
}

interface ListingCardProps {
  listing: GunbrokerListing;
  variant?: 'grid' | 'list';
  className?: string;
}

export function ListingCard({ listing, variant = 'grid', className }: ListingCardProps) {
  // Debug logging
  console.log('ListingCard received data:', {
    listingId: listing?.itemID,
    title: listing?.title,
    price: listing?.price,
    fullListing: listing
  });

  if (!listing) {
    return null;
  }

  // Format the price
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(listing?.price ?? 0);

  // Format the time left
  const formatTimeLeft = (timeLeft: string) => {
    if (!timeLeft) return 'Unknown';
    
    // Handle ISO 8601 duration format (e.g., P58DT6H27M14S)
    if (timeLeft.startsWith('P')) {
      try {
        let formattedTime = '';
        
        // Extract days
        const daysMatch = timeLeft.match(/(\d+)D/);
        if (daysMatch) formattedTime += `${daysMatch[1]}d `;
        
        // Extract hours
        const hoursMatch = timeLeft.match(/(\d+)H/);
        if (hoursMatch) formattedTime += `${hoursMatch[1]}h `;
        
        // Extract minutes
        const minutesMatch = timeLeft.match(/(\d+)M/);
        if (minutesMatch && !timeLeft.includes('MT')) formattedTime += `${minutesMatch[1]}m`;
        
        return formattedTime.trim() || 'Ending soon';
      } catch (e) {
        return timeLeft;
      }
    }
    
    // If it's a date string, convert to relative time
    if (timeLeft.includes('-') || timeLeft.includes('/')) {
      try {
        const date = new Date(timeLeft);
        return formatDistanceToNow(date, { addSuffix: true });
      } catch (e) {
        return timeLeft;
      }
    }
    
    return timeLeft;
  };
  
  // Get listing type badge
  const getListingTypeBadge = () => {
    if (listing.isFixedPrice) {
      return <Badge variant="default">Fixed Price</Badge>;
    } else if (listing.hasBuyNow) {
      return <Badge variant="secondary">Buy Now</Badge>;
    } else {
      return <Badge variant="outline">Auction</Badge>;
    }
  };

  if (variant === 'list') {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="flex flex-col sm:flex-row gap-4 p-4">
          {/* Image Section */}
          <div className="relative w-full sm:w-48 aspect-video sm:aspect-square bg-muted flex-shrink-0">
            {listing.thumbnailURL ? (
              <div className="relative w-full h-full">
                <img
                  src={listing.thumbnailURL}
                  alt={listing.title || 'Product image'}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden items-center justify-center h-full bg-muted absolute inset-0">
                  <span className="text-muted-foreground">No Image</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <span className="text-muted-foreground">No Image</span>
              </div>
            )}
            {listing.isFeaturedItem && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-yellow-500/80 text-white border-yellow-500">
                  Featured
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-grow flex flex-col">
            <div className="flex-grow">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="font-semibold text-lg">{listing.title || 'Untitled Listing'}</h3>
                <div className="flex items-center whitespace-nowrap">
                  <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-lg font-bold">{formattedPrice}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    <span>Seller: {listing.seller?.username || 'Unknown'}</span>
                  </div>
                  
                  {listing.timeLeft && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Time Left: {formatTimeLeft(listing.timeLeft)}</span>
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  {(listing.bidCount ?? 0) > 0 && (
                    <div className="flex items-center">
                      <span>Bids: {listing.bidCount}</span>
                    </div>
                  )}
                  
                  {(listing.quantity ?? 0) > 1 && (
                    <div className="flex items-center">
                      <span>Quantity: {listing.quantity}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                {getListingTypeBadge()}
                
                {listing.freeShippingAvailable && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="flex items-center">
                          <Truck className="h-3 w-3 mr-1" />
                          Free Shipping
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Free shipping available</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {listing.hasReserve && (
                  <Badge variant="outline" className={listing.hasReserveBeenMet ? "bg-green-50" : ""}>
                    {listing.hasReserveBeenMet ? "Reserve Met" : "Reserve"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link href={`/dashboard/listings/details/${listing.itemID}`}>
                  View Details
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <a href={`https://www.gunbroker.com/item/${listing.itemID}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">View on Gunbroker</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden flex flex-col h-full", className)}>
      <div className="relative aspect-video bg-muted">
        {listing.thumbnailURL ? (
          <div className="relative w-full h-full">
            <img
              src={listing.thumbnailURL}
              alt={listing.title || 'Product image'}
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = e.currentTarget.parentElement?.nextElementSibling;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center h-full bg-muted absolute inset-0">
              <span className="text-muted-foreground">No Image</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}
        {listing.isFeaturedItem && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-yellow-500/80 text-white border-yellow-500">
              Featured
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4 flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold line-clamp-2">{listing.title || 'Untitled Listing'}</h3>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-lg font-bold">{formattedPrice}</span>
          </div>
          {getListingTypeBadge()}
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-1" />
            <span>Seller: {listing.seller?.username || 'Unknown'}</span>
          </div>
          
          {listing.timeLeft && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>Time Left: {formatTimeLeft(listing.timeLeft)}</span>
            </div>
          )}
          
          {(listing.bidCount ?? 0) > 0 && (
            <div className="flex items-center">
              <span>Bids: {listing.bidCount}</span>
            </div>
          )}
          
          {(listing.quantity ?? 0) > 1 && (
            <div className="flex items-center">
              <span>Quantity: {listing.quantity}</span>
            </div>
          )}
        </div>
        
        <div className="mt-2 flex flex-wrap gap-1">
          {listing.freeShippingAvailable && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="flex items-center">
                    <Truck className="h-3 w-3 mr-1" />
                    Free Shipping
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Free shipping available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {listing.hasReserve && (
            <Badge variant="outline" className={listing.hasReserveBeenMet ? "bg-green-50" : ""}>
              {listing.hasReserveBeenMet ? "Reserve Met" : "Reserve"}
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 mt-auto">
        <div className="flex gap-2 w-full">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/dashboard/listings/details/${listing.itemID}`}>
              View Details
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <a href={`https://www.gunbroker.com/item/${listing.itemID}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">View on Gunbroker</span>
            </a>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 
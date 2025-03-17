'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { Database } from '@/lib/database.types';
import { authenticatedFetchJson } from '@/lib/client-utils';
import { parseISO, format, formatDistanceToNow } from 'date-fns';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Loader2,
  Package,
  Printer,
  ShieldCheck,
  Tag,
  Truck,
  AlertCircle,
  Heart,
  Layers,
  MessageSquare,
  CheckCircle,
  XCircle,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';

// Define GunBroker Listing interface
interface GunBrokerListingDetail {
  itemID: number;
  title: string;
  description: string;
  descriptionOnly?: string;
  currentBid: number;
  buyNowPrice: number;
  fixedPrice: number;
  isFixedPrice: boolean;
  bidCount?: number;
  bids?: number; // API returns 'bids' instead of 'bidCount' in some responses
  thumbnailURL: string | null;
  imageURLs?: string[];
  pictures?: any[]; // API returns pictures array
  endingDate?: string; // API returns endingDate instead of endingDateTimeUTC
  endingDateTimeUTC?: string;
  isFFLRequired: boolean;
  hasReserve: boolean;
  hasReserveBeenMet: boolean;
  canOffer: boolean;
  autoAcceptPrice?: number;
  autoRejectPrice?: number;
  watchersCount?: number;
  viewCounter?: number; // API might return viewCounter instead of watchersCount
  highestBidderUserName?: string;
  highestBidderID?: number;
  serialNumber: string;
  sku: string;
  quantity: number;
  fflInfo?: string;
  condition?: any; // API returns condition as an object
  manufacturer?: string;
  model?: string;
  caliber?: string;
  category?: string;
  categoryName?: string;
  isSandbox?: boolean;
  location?: string;
  paymentMethods?: any;
  seller?: any;
  timeLeft?: string;
  links?: any[];
  [key: string]: any; // Allow for additional properties
}

// Fetch listing details from the API
async function fetchListingDetails(itemId: string, userSession?: any): Promise<GunBrokerListingDetail> {
  if (userSession) {
    try {
      const data = await authenticatedFetchJson<GunBrokerListingDetail>(
        `/api/gunbroker/listings/${itemId}`,
        userSession
      );
      
      // Log the received data for debugging
      console.log('Client received listing details:', {
        itemID: data.itemID,
        title: data.title,
        hasThumbnail: !!data.thumbnailURL,
        hasImages: Array.isArray(data.imageURLs) && data.imageURLs?.length > 0,
        imageCount: Array.isArray(data.imageURLs) ? data.imageURLs.length : 0,
        hasPictures: Array.isArray(data.pictures) && data.pictures?.length > 0,
        fullResponseKeys: Object.keys(data)
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching listing details with session:', error);
      throw error;
    }
  } else {
    try {
      const response = await fetch(`/api/gunbroker/listings/${itemId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch listing details');
      }
      
      const data = await response.json();
      
      // Log the received data for debugging
      console.log('Client received listing details (no session):', {
        itemID: data.itemID,
        title: data.title,
        hasThumbnail: !!data.thumbnailURL,
        hasImages: Array.isArray(data.imageURLs) && data.imageURLs?.length > 0,
        imageCount: Array.isArray(data.imageURLs) ? data.imageURLs.length : 0,
        fullResponseKeys: Object.keys(data)
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching listing details without session:', error);
      throw error;
    }
  }
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { session, user } = useAuth();
  
  // Properly unwrap params using React.use()
  const unwrappedParams = use(params);
  const itemId = unwrappedParams.id;
  
  // Use React Query to fetch listing details
  const { data: listingData, isLoading, error } = useQuery({
    queryKey: ['listingDetails', itemId],
    queryFn: async () => {
      const data = await fetchListingDetails(itemId, session);
      console.log('Listing data loaded successfully:', {
        itemId: data.itemID,
        hasThumbnail: !!data.thumbnailURL,
        imageCount: data.imageURLs?.length || data.pictures?.length || 0,
        dataFields: Object.keys(data)
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Format dates and time remaining
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  const formatShortDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  const getTimeRemaining = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = parseISO(dateString);
      if (date < new Date()) {
        return 'Ended';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      if (typeof dateString === 'string' && dateString.startsWith('P')) {
        // Handle ISO 8601 duration format (e.g., "P89DT23H35M52S")
        return 'Time remaining';
      }
      return 'Unknown';
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: message,
    });
  };
  
  // Print listing
  const printListing = () => {
    window.print();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/dashboard/listings')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24 mt-2" />
            </div>
          </div>
        </div>
        <Card className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-80 w-full" />
              <div className="flex gap-2 mt-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-16" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/listings')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Listing Details</h1>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load listing details. Please try again.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => router.push('/dashboard/listings')}>
          Return to Listings
        </Button>
      </div>
    );
  }
  
  // If we don't have listing data yet, show a fallback
  if (!listingData) {
    return null;
  }
  
  // Helper function to determine listing status
  const getListingStatus = () => {
    try {
      const endDate = parseISO(listingData.endingDateTimeUTC || listingData.endingDate || '');
      if (endDate < new Date()) {
        if ((listingData.bidCount || listingData.bids || 0) > 0 && 
            (listingData.currentBid >= (listingData.buyNowPrice || 0) || 
             !listingData.hasReserve || 
             listingData.hasReserveBeenMet)) {
          return { label: 'Sold', color: 'green' };
        }
        return { label: 'Ended', color: 'red' };
      }
      
      if ((listingData.bidCount || listingData.bids || 0) > 0) {
        return { label: 'Active Bids', color: 'blue' };
      }
      
      return { label: 'Active', color: 'green' };
    } catch (error) {
      return { label: 'Unknown', color: 'gray' };
    }
  };
  
  const status = getListingStatus();
  
  // Normal render with data
  return (
    <div className="space-y-6 pb-10">
      {/* Sandbox mode indicator */}
      {listingData.isSandbox && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Sandbox Mode</AlertTitle>
          <AlertDescription className="text-amber-600">
            You are viewing this listing in sandbox mode. This is not a real listing.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with back button and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/listings')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{listingData.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Item #{listingData.itemID}</span>
              <span>•</span>
              <Badge className={
                status.color === 'green' ? 'bg-green-500 text-white' : 
                status.color === 'red' ? 'bg-red-500 text-white' : 
                status.color === 'blue' ? 'bg-blue-500 text-white' : 
                'bg-gray-500 text-white'
              }>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1"
            onClick={printListing}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-1"
          >
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Listing</span>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Image area */}
          <div className="space-y-4">
            <div className="rounded-md overflow-hidden bg-secondary/20 h-80 flex items-center justify-center">
              {listingData.thumbnailURL ? (
                <img 
                  src={listingData.thumbnailURL} 
                  alt={listingData.title}
                  className="object-contain max-h-full max-w-full"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground" />
              )}
            </div>
            
            {/* Thumbnail gallery */}
            {(listingData.imageURLs && listingData.imageURLs.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {listingData.imageURLs.map((url, index) => (
                  <div 
                    key={index} 
                    className="h-16 w-16 rounded-md overflow-hidden border cursor-pointer hover:opacity-80"
                  >
                    <img 
                      src={url} 
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Listing stats */}
            <div className="flex flex-wrap gap-4 p-4 border rounded-md bg-muted/20">
              <div className="flex items-center gap-1 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>{listingData.watchersCount || listingData.viewCounter || 0} watchers</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>{listingData.bidCount || listingData.bids || 0} bids</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{getTimeRemaining(listingData.endingDateTimeUTC || listingData.endingDate)}</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatShortDate(listingData.endingDateTimeUTC || listingData.endingDate)}</span>
              </div>
            </div>
          </div>
          
          {/* Details area */}
          <div className="space-y-6">
            {/* Pricing information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Pricing Details</h2>
              <div className="space-y-2">
                {listingData.isFixedPrice ? (
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-xl font-bold">{formatCurrency(listingData.fixedPrice)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-muted-foreground">Current Bid</span>
                      <span className="text-xl font-bold">{formatCurrency(listingData.currentBid)}</span>
                    </div>
                    {listingData.buyNowPrice > 0 && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-muted-foreground">Buy Now Price</span>
                        <span className="font-medium">{formatCurrency(listingData.buyNowPrice)}</span>
                      </div>
                    )}
                    {listingData.hasReserve && (
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-muted-foreground">Reserve</span>
                        <span className="font-medium">
                          {listingData.hasReserveBeenMet ? 
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Met</Badge> : 
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Not Met</Badge>
                          }
                        </span>
                      </div>
                    )}
                  </>
                )}
                
                {(listingData.quantity || 0) > 1 && (
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium">{listingData.quantity}</span>
                  </div>
                )}
                
                {listingData.canOffer && (
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Offers</span>
                    <span className="font-medium">Accepted</span>
                  </div>
                )}
                
                {listingData.canOffer && (listingData.autoAcceptPrice || 0) > 0 && (
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Auto-Accept Price</span>
                    <span className="font-medium">{formatCurrency(listingData.autoAcceptPrice || 0)}</span>
                  </div>
                )}
                
                {listingData.canOffer && (listingData.autoRejectPrice || 0) > 0 && (
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-muted-foreground">Auto-Reject Price</span>
                    <span className="font-medium">{formatCurrency(listingData.autoRejectPrice || 0)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Item details */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Item Details</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {(listingData.category || listingData.categoryName) && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Category:</span>{' '}
                    <span className="font-medium">{listingData.categoryName || listingData.category}</span>
                  </div>
                )}
                {listingData.manufacturer && (
                  <div>
                    <span className="text-muted-foreground">Manufacturer:</span>{' '}
                    <span className="font-medium">{listingData.manufacturer}</span>
                  </div>
                )}
                {listingData.model && (
                  <div>
                    <span className="text-muted-foreground">Model:</span>{' '}
                    <span className="font-medium">{listingData.model}</span>
                  </div>
                )}
                {listingData.caliber && (
                  <div>
                    <span className="text-muted-foreground">Caliber:</span>{' '}
                    <span className="font-medium">{listingData.caliber}</span>
                  </div>
                )}
                {(listingData.condition && typeof listingData.condition === 'object') && (
                  <div>
                    <span className="text-muted-foreground">Condition:</span>{' '}
                    <span className="font-medium">
                      {Object.values(listingData.condition as Record<string, string>)[0]}
                    </span>
                  </div>
                )}
                {listingData.serialNumber && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Serial Number:</span>{' '}
                    <span className="font-medium">{listingData.serialNumber}</span>
                    <button 
                      onClick={() => copyToClipboard(listingData.serialNumber, "Serial number copied to clipboard")}
                      className="text-primary hover:text-primary/80"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {listingData.sku && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">SKU:</span>{' '}
                    <span className="font-medium">{listingData.sku}</span>
                    <button 
                      onClick={() => copyToClipboard(listingData.sku, "SKU copied to clipboard")}
                      className="text-primary hover:text-primary/80"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {listingData.isFFLRequired && (
                  <div className="col-span-2 flex items-center gap-1 mt-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-medium">FFL Required for Transfer</span>
                  </div>
                )}
                {listingData.location && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Location:</span>{' '}
                    <span className="font-medium">{listingData.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col space-y-2">
              <a 
                href={`https://www.gunbroker.com/item/${listingData.itemID}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button className="w-full gap-1">
                  <ExternalLink className="h-4 w-4" />
                  View on GunBroker
                </Button>
              </a>
              <Button variant="outline" className="w-full gap-1">
                <Edit className="h-4 w-4" />
                Edit Listing
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="description" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="bids">Bids</TabsTrigger>
        </TabsList>
        
        {/* Description tab */}
        <TabsContent value="description" className="mt-4">
          <Card className="p-5">
            <h2 className="text-lg font-medium mb-4">Listing Description</h2>
            <div 
              className="prose max-w-none" 
              dangerouslySetInnerHTML={{ __html: listingData.description || listingData.descriptionOnly || '<p>No description provided.</p>' }}
            />
          </Card>
        </TabsContent>
        
        {/* Shipping tab */}
        <TabsContent value="shipping" className="mt-4">
          <Card className="p-5">
            <h2 className="text-lg font-medium mb-4">Shipping Information</h2>
            <div className="prose max-w-none">
              {listingData.whoPaysForShipping ? (
                <div>
                  <p><strong>Shipping terms:</strong> {Object.values(listingData.whoPaysForShipping as Record<string, string>)[0]}</p>
                  {listingData.shippingClassesSupported && (
                    <p><strong>Shipping Classes:</strong> {Object.values(listingData.shippingClassesSupported as Record<string, string>).join(', ')}</p>
                  )}
                  <p><strong>International Shipping:</strong> {listingData.willShipInternational ? 'Yes' : 'No'}</p>
                </div>
              ) : (
                <p>Shipping information not available.</p>
              )}
            </div>
          </Card>
        </TabsContent>
        
        {/* Bids tab */}
        <TabsContent value="bids" className="mt-4">
          <Card className="p-5">
            <h2 className="text-lg font-medium mb-4">Bid History</h2>
            {(listingData.bidCount || listingData.bids || 0) > 0 ? (
              <div className="prose max-w-none">
                <p>This listing has received {listingData.bidCount || listingData.bids} bids.</p>
                <p>
                  {listingData.highestBidderUserName ? (
                    <>High bidder: {listingData.highestBidderUserName}</>
                  ) : (
                    <>No high bidder information available.</>
                  )}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium">No Bids Yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  This listing hasn't received any bids yet.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/supabase-auth-provider';
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
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  Grid, 
  List, 
  Package, 
  Loader2, 
  AlertCircle, 
  Search, 
  Clock, 
  Tag, 
  Layers,
  Eye,
  DollarSign,
  ShoppingCart,
  Plus
} from 'lucide-react';

// Define the GunBroker listing interface
interface GunBrokerListing {
  itemID: number;
  title: string;
  currentBid: number;
  buyNowPrice: number;
  fixedPrice: number;
  isFixedPrice: boolean;
  bidCount: number;
  thumbnailURL: string;
  endingDateTimeUTC: string;
  isFFLRequired: boolean;
  hasReserve: boolean;
  hasReserveBeenMet: boolean;
  canOffer: boolean;
  autoAcceptPrice: number;
  autoRejectPrice: number;
  watchersCount: number;
  highestBidderUserName: string;
  highestBidderID: number;
  serialNumber: string;
  sku: string;
  quantity: number;
}

// Define the API response type
interface GunBrokerListingsResponse {
  results: GunBrokerListing[];
  count: number;
  pageIndex: number;
  pageSize: number;
  isSandbox: boolean;
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  // State for listings and pagination
  const [listings, setListings] = useState<GunBrokerListing[]>([]);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [hasGunbrokerIntegration, setHasGunbrokerIntegration] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Get authentication state
  const { session, user } = useAuth();
  
  // Get pagination, search, and filter state from URL
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setPageIndex(parseInt(pageParam, 10));
    } else {
      setPageIndex(1);
    }
    
    // Get page size from URL or use default
    const pageSizeParam = searchParams.get('pageSize');
    if (pageSizeParam) {
      setPageSize(parseInt(pageSizeParam, 10));
    }
    
    // Get view mode from URL or use default
    const viewModeParam = searchParams.get('view');
    if (viewModeParam && (viewModeParam === 'grid' || viewModeParam === 'list')) {
      setViewMode(viewModeParam);
    }
  }, [searchParams]);
  
  // Check for GunBroker integration
  useEffect(() => {
    async function checkIntegration() {
      if (!user) return;
      
      try {
        const { data: integrations, error } = await supabase
          .from('gunbroker_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        setHasGunbrokerIntegration(integrations && integrations.length > 0);
      } catch (error) {
        console.error('Error checking GunBroker integration:', error);
        setHasGunbrokerIntegration(false);
      }
    }
    
    checkIntegration();
  }, [user, supabase]);
  
  // Fetch listings when page changes or session changes
  useEffect(() => {
    async function fetchListingsData() {
      if (!session || !hasGunbrokerIntegration) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', pageIndex.toString());
        params.append('pageSize', pageSize.toString());
        params.append('timeFrame', '0'); // Default to "Current"
        params.append('sort', '0'); // Default to "Item ID Ascending"
        
        console.log('Fetching listings with params:', params.toString());
        
        // Make authenticated request
        const data = await authenticatedFetchJson<GunBrokerListingsResponse>(
          `/api/gunbroker/listings?${params.toString()}`,
          session
        );
        
        console.log('Listings API response:', {
          hasResults: !!data.results,
          resultCount: data.results?.length || 0,
          count: data.count,
          pageIndex: data.pageIndex,
          pageSize: data.pageSize,
          isSandbox: data.isSandbox,
          firstResult: data.results?.[0] ? {
            itemID: data.results[0].itemID,
            title: data.results[0].title,
          } : null
        });
        
        setListings(data.results);
        setTotalResults(data.count);
        setTotalPages(Math.ceil(data.count / data.pageSize));
        setIsSandbox(data.isSandbox);
      } catch (error) {
        console.error('Error fetching listings:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch listings');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchListingsData();
  }, [pageIndex, pageSize, session, hasGunbrokerIntegration]);
  
  // Handle refresh
  const handleRefresh = async () => {
    // Re-fetch listings data
    const fetchListingsData = async () => {
      if (!session) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        let currentSession = session;
        if (!currentSession) {
          const { data: { session: fetchedSession } } = await supabase.auth.getSession();
          if (fetchedSession) {
            currentSession = fetchedSession;
          } else {
            throw new Error('No valid session found');
          }
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', pageIndex.toString());
        params.append('pageSize', pageSize.toString());
        params.append('timeFrame', '0');
        params.append('sort', '0');
        
        // Make authenticated request
        const data = await authenticatedFetchJson<GunBrokerListingsResponse>(
          `/api/gunbroker/listings?${params.toString()}`,
          currentSession
        );
        
        setListings(data.results);
        setTotalResults(data.count);
        setTotalPages(Math.ceil(data.count / data.pageSize));
        setIsSandbox(data.isSandbox);
      } catch (error) {
        console.error('Error refreshing listings:', error);
        setError(error instanceof Error ? error.message : 'Failed to refresh listings');
        throw error;
      } finally {
        setIsLoading(false);
      }
    };
    
    await fetchListingsData();
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/dashboard/listings?page=${page}&pageSize=${pageSize}&view=${viewMode}`);
  };
  
  // Handle page size change
  const handlePageSizeChange = (size: string) => {
    const newSize = parseInt(size, 10);
    setPageSize(newSize);
    router.push(`/dashboard/listings?page=1&pageSize=${newSize}&view=${viewMode}`);
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    router.push(`/dashboard/listings?page=${pageIndex}&pageSize=${pageSize}&view=${mode}`);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Format date and time remaining
  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  const getTimeRemaining = (dateString: string) => {
    try {
      const endDate = parseISO(dateString);
      if (endDate < new Date()) {
        return 'Ended';
      }
      return formatDistanceToNow(endDate, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };
  
  // Render No integration view
  if (!hasGunbrokerIntegration) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] px-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold">No GunBroker Integration Found</h2>
          <p className="text-muted-foreground">
            You need to connect your GunBroker account to access your listings.
          </p>
          <Button onClick={() => router.push('/dashboard/settings')}>
            Set Up Integration
          </Button>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading && !listings.length) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with title and options */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your GunBroker Listings</h1>
          <p className="text-muted-foreground">
            {totalResults !== undefined ? (
              `Showing ${String(listings.length)} of ${String(totalResults)} listings`
            ) : (
              "Manage your GunBroker inventory"
            )}
          </p>
        </div>
        
        <Button 
          onClick={() => router.push('/dashboard/listings/new')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Listing
        </Button>
      </div>
      
      {/* Sandbox mode indicator */}
      {isSandbox && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            You are in sandbox mode. These listings are from the GunBroker testing environment.
          </p>
        </div>
      )}
      
      {/* Search and filter bar */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title, SKU, serial number..." 
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select defaultValue="0">
              <SelectTrigger id="timeframe" className="w-full md:w-40">
                <SelectValue placeholder="Time Frame" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Current</SelectItem>
                <SelectItem value="5">Ending Today</SelectItem>
                <SelectItem value="6">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 48 Hours</SelectItem>
                <SelectItem value="16">Ending Next 24h</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger id="page-size" className="w-full md:w-40">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="whitespace-nowrap">
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      {/* Listings content */}
      <div className="space-y-6">
        {/* Total results counter */}
        <div className="text-sm text-muted-foreground">
          {totalResults === 0 ? 'No listings found' : `Showing ${String(listings.length)} of ${String(totalResults)} listings`}
        </div>
        
        {/* Grid or list view of listings */}
        {listings.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map(listing => (
                  <Card key={listing.itemID} className="overflow-hidden">
                    <div className="relative h-40 w-full overflow-hidden">
                      {listing.thumbnailURL ? (
                        <img 
                          src={listing.thumbnailURL} 
                          alt={listing.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-secondary/20">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1">
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{getTimeRemaining(listing.endingDateTimeUTC)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span className="text-xs">{listing.watchersCount || 0} watchers</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardHeader className="p-4 pb-0">
                      <CardTitle className="text-lg line-clamp-2">
                        <a 
                          href={`/dashboard/listings/${listing.itemID}`}
                          className="hover:text-primary hover:underline"
                        >
                          {listing.title}
                        </a>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {listing.isFFLRequired && (
                            <Badge variant="outline" className="text-xs">FFL Required</Badge>
                          )}
                          {listing.isFixedPrice ? (
                            <Badge variant="secondary" className="text-xs">Fixed Price</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Auction</Badge>
                          )}
                          {listing.bidCount > 0 && (
                            <Badge variant="outline" className="text-xs">{String(listing.bidCount)} {listing.bidCount === 1 ? 'bid' : 'bids'}</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {listing.isFixedPrice ? (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Price</span>
                              <span className="font-medium">{formatCurrency(listing.fixedPrice)}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Current Bid</span>
                                <span className="font-medium">{formatCurrency(listing.currentBid)}</span>
                              </div>
                              {listing.buyNowPrice > 0 && !listing.isFixedPrice && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Buy Now</span>
                                  <span className="font-medium">{formatCurrency(listing.buyNowPrice)}</span>
                                </div>
                              )}
                            </>
                          )}
                          {listing.quantity > 1 && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Quantity</span>
                              <span className="font-medium">{listing.quantity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => router.push(`/dashboard/listings/${listing.itemID}`)}
                      >
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map(listing => (
                  <div 
                    key={listing.itemID} 
                    className="border rounded-lg hover:shadow-sm transition-shadow p-4 bg-white"
                  >
                    <div className="flex gap-4">
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
                        {listing.thumbnailURL ? (
                          <img 
                            src={listing.thumbnailURL} 
                            alt={listing.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-secondary/20">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <h3 className="font-medium line-clamp-2">
                            <a 
                              href={`/dashboard/listings/${listing.itemID}`}
                              className="hover:text-primary hover:underline"
                            >
                              {listing.title}
                            </a>
                          </h3>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {listing.isFixedPrice ? (
                              <span className="font-bold">{formatCurrency(listing.fixedPrice)}</span>
                            ) : (
                              <span className="font-bold">{formatCurrency(listing.currentBid)}</span>
                            )}
                            {listing.buyNowPrice > 0 && !listing.isFixedPrice && (
                              <span className="text-sm text-muted-foreground">
                                (Buy Now: {formatCurrency(listing.buyNowPrice)})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {String(listing.sku || 'No SKU')}
                          </div>
                          {listing.quantity > 1 && (
                            <div className="flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              <span>Qty: {listing.quantity}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {String(getTimeRemaining(listing.endingDateTimeUTC))}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {String(listing.watchersCount || 0)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {String(listing.bidCount || 0)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {listing.isFFLRequired && (
                            <Badge variant="outline" className="text-xs">FFL Required</Badge>
                          )}
                          {listing.isFixedPrice ? (
                            <Badge variant="secondary" className="text-xs">Fixed Price</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Auction</Badge>
                          )}
                          {listing.bidCount > 0 && (
                            <Badge variant="outline" className="text-xs">{String(listing.bidCount)} {listing.bidCount === 1 ? 'bid' : 'bids'}</Badge>
                          )}
                          {listing.hasReserve && !listing.hasReserveBeenMet && (
                            <Badge variant="outline" className="text-xs text-orange-500 border-orange-200 bg-orange-50">Reserve Not Met</Badge>
                          )}
                          {listing.hasReserve && listing.hasReserveBeenMet && (
                            <Badge variant="outline" className="text-xs text-green-500 border-green-200 bg-green-50">Reserve Met</Badge>
                          )}
                          {listing.canOffer && (
                            <Badge variant="outline" className="text-xs">Offers Accepted</Badge>
                          )}
                        </div>
                        <div className="text-xs font-medium">
                          {listing.quantity > 1 && `${String(listing.quantity)} Available`}
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/listings/${listing.itemID}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (pageIndex > 1) handlePageChange(pageIndex - 1);
                        }}
                        className={pageIndex <= 1 ? "pointer-events-none opacity-50" : ""}
                        size="default"
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Calculate pages to show, ensuring we have proper sequence
                      let pagesToShow: number[] = [];
                      
                      // If we're near the start
                      if (pageIndex <= 3) {
                        pagesToShow = Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1);
                      } 
                      // If we're near the end
                      else if (pageIndex > totalPages - 3) {
                        const startPage = Math.max(1, totalPages - 4);
                        pagesToShow = Array.from({ length: Math.min(5, totalPages) }, (_, i) => startPage + i);
                      } 
                      // If we're in the middle
                      else {
                        pagesToShow = [pageIndex - 2, pageIndex - 1, pageIndex, pageIndex + 1, pageIndex + 2]
                          .filter(p => p > 0 && p <= totalPages);
                      }
                      
                      const currentPage = pagesToShow[i];
                      if (!currentPage || i >= pagesToShow.length) return null;
                      
                      return (
                        <PaginationItem key={`page-${i}-${currentPage}`}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(currentPage);
                            }}
                            isActive={currentPage === pageIndex}
                            size="default"
                          >
                            {String(currentPage)}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }).filter(Boolean)}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (pageIndex < totalPages) handlePageChange(pageIndex + 1);
                        }}
                        className={pageIndex >= totalPages ? "pointer-events-none opacity-50" : ""}
                        size="default"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md bg-white">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Listings Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              You don't have any active listings at the moment. Create a new listing to get started.
            </p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/dashboard/listings/new')}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create New Listing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 
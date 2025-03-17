'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { authenticatedFetchJson } from '@/lib/client-utils';
import { 
  Package, 
  User,
  CalendarDays,
  Clock,
  CreditCard,
  TruckIcon,
  ShieldCheck,
  AlertCircle,
  RefreshCcw,
  Plus,
  LayoutGrid,
  List,
  Search
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from '@/components/ui/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Types for GunBroker API responses
interface GunBrokerOrderItem {
  itemID: number;
  title: string;
  quantity: number;
  isFFLRequired: boolean;
  thumbnail?: string;
  itemPrice?: number;
  itemCondition?: string;
}

interface GunBrokerBuyer {
  username: string;
  userID?: number;
}

interface GunBrokerOrder {
  orderID: number;
  orderDate: string;
  orderDateUTC?: string;
  totalPrice: number;
  orderCancelled: boolean;
  orderReturned: boolean;
  orderComplete: boolean;
  itemShipped: boolean;
  fflReceived: boolean;
  paymentReceived: boolean;
  buyerConfirmed: boolean;
  orderItemsCollection: GunBrokerOrderItem[];
  buyer: GunBrokerBuyer;
  billToName: string;
  shipDateUTC?: string;
  paymentMethod: Record<string, string>;
  fflNumber?: string;
}

interface GunBrokerOrdersResponse {
  results: GunBrokerOrder[];
  count: number;
  pageIndex: number;
  pageSize: number;
  isSandbox: boolean;
}

// Helper function to determine order status badge color
function getOrderStatusBadge(order: any) {
  if (order.orderCancelled) return <Badge variant="destructive">Cancelled</Badge>;
  if (order.orderReturned) return <Badge variant="destructive">Returned</Badge>;
  if (order.orderComplete) return <Badge variant="success">Complete</Badge>;
  if (order.itemShipped) return <Badge variant="default">Shipped</Badge>;
  if (order.fflReceived) return <Badge variant="secondary">FFL Received</Badge>;
  if (order.paymentReceived) return <Badge variant="secondary">Paid</Badge>;
  if (order.buyerConfirmed) return <Badge variant="outline">Confirmed</Badge>;
  return <Badge variant="outline">Processing</Badge>;
}

// Helper function to get a readable shipping status
function getShippingStatus(order: any) {
  if (order.orderCancelled) return "Cancelled";
  if (order.orderReturned) return "Returned";
  if (order.itemShipped) return "Shipped";
  if (order.fflReceived && order.orderItemsCollection.some((item: any) => item.isFFLRequired)) {
    return "FFL Received";
  }
  if (order.paymentReceived) return "Ready to Ship";
  return "Awaiting Payment";
}

// Header actions component
function HeaderActions({ onRefresh, viewMode, setViewMode }: { 
  onRefresh: () => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh();
      toast({
        title: 'Refreshed',
        description: 'Orders list has been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
        <ToggleGroupItem value="grid" aria-label="Grid view">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List view">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
      
      <Button asChild size="sm">
        <Link href="/dashboard/connect">
          <Plus className="mr-2 h-4 w-4" />
          Connect GunBroker
        </Link>
      </Button>
    </div>
  );
}

// Skeleton loading component
function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array(5).fill(0).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="grid md:grid-cols-5 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const supabase = createClient();
  
  const [orders, setOrders] = useState<GunBrokerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isSandbox, setIsSandbox] = useState(false);
  const [hasGunbrokerIntegration, setHasGunbrokerIntegration] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Get page from URL
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setPageIndex(parseInt(pageParam, 10));
    } else {
      setPageIndex(1);
    }
  }, [searchParams]);
  
  // Check for session on mount and when session changes
  useEffect(() => {
    async function checkSession() {
      if (!session) {
        // Try to get session from Supabase
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();
        
        if (!supabaseSession) {
          console.log('No session found, redirecting to login');
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
      }
    }
    
    checkSession();
  }, [session, router, supabase.auth]);
  
  // Check for GunBroker integration
  useEffect(() => {
    async function checkIntegration() {
      if (!session) return;
      
      try {
        // Check if user has an active GunBroker integration
        const { data: integrations, error: integrationError } = await supabase
          .from('gunbroker_integrations')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .limit(1);
          
        if (integrationError) {
          console.error('Error checking GunBroker integration:', integrationError);
          setHasGunbrokerIntegration(false);
        } else {
          setHasGunbrokerIntegration(integrations && integrations.length > 0);
        }
      } catch (error) {
        console.error('Error checking integration:', error);
        setHasGunbrokerIntegration(false);
      }
    }
    
    checkIntegration();
  }, [session, supabase]);
  
  // Fetch orders when page changes or session changes
  useEffect(() => {
    async function fetchOrdersData() {
      if (!session || !hasGunbrokerIntegration) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get current session
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
        params.append('pageSize', '10');
        params.append('timeFrame', '8'); // Default to "All Time"
        params.append('sort', '0');
        params.append('sortOrder', '1');
        
        console.log('Fetching orders with params:', params.toString());
        
        // Make authenticated request
        const data = await authenticatedFetchJson<GunBrokerOrdersResponse>(
          `/api/gunbroker/orders?${params.toString()}`,
          currentSession
        );
        
        console.log('Orders API response:', {
          hasResults: !!data.results,
          resultCount: data.results?.length || 0,
          count: data.count,
          pageIndex: data.pageIndex,
          pageSize: data.pageSize,
          isSandbox: data.isSandbox,
          firstResult: data.results?.[0] ? {
            orderID: data.results[0].orderID,
            orderDate: data.results[0].orderDate,
          } : null
        });
        
        setOrders(data.results);
        setTotalResults(data.count);
        setTotalPages(Math.ceil(data.count / data.pageSize));
        setIsSandbox(data.isSandbox);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch orders');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOrdersData();
  }, [pageIndex, session, hasGunbrokerIntegration, supabase.auth]);
  
  // Handle refresh
  const handleRefresh = async () => {
    // Re-fetch orders data
    const fetchOrdersData = async () => {
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
        params.append('pageSize', '10');
        params.append('timeFrame', '8');
        params.append('sort', '0');
        params.append('sortOrder', '1');
        
        // Make authenticated request
        const data = await authenticatedFetchJson<GunBrokerOrdersResponse>(
          `/api/gunbroker/orders?${params.toString()}`,
          currentSession
        );
        
        setOrders(data.results);
        setTotalResults(data.count);
        setTotalPages(Math.ceil(data.count / data.pageSize));
        setIsSandbox(data.isSandbox);
      } catch (error) {
        console.error('Error refreshing orders:', error);
        setError(error instanceof Error ? error.message : 'Failed to refresh orders');
        throw error;
      } finally {
        setIsLoading(false);
      }
    };
    
    await fetchOrdersData();
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/dashboard/orders?page=${page}`);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <HeaderActions 
          onRefresh={handleRefresh} 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
        />
      </div>
      
      {/* Search Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by order ID, buyer name, or item..." 
                  className="pl-8 w-full" 
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-2">
              <Select defaultValue="0">
                <SelectTrigger id="order-status" className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Statuses</SelectItem>
                  <SelectItem value="1">Pending</SelectItem>
                  <SelectItem value="2">Payment Received</SelectItem>
                  <SelectItem value="3">FFL Received</SelectItem>
                  <SelectItem value="4">Shipped</SelectItem>
                  <SelectItem value="5">Complete</SelectItem>
                  <SelectItem value="6">Cancelled</SelectItem>
                  <SelectItem value="7">Returned</SelectItem>
                </SelectContent>
              </Select>
              
              <Select defaultValue="8">
                <SelectTrigger id="time-frame" className="w-full md:w-40">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">All Time</SelectItem>
                  <SelectItem value="0">Today</SelectItem>
                  <SelectItem value="1">Yesterday</SelectItem>
                  <SelectItem value="2">Last 7 Days</SelectItem>
                  <SelectItem value="3">Last 14 Days</SelectItem>
                  <SelectItem value="4">Last 30 Days</SelectItem>
                  <SelectItem value="5">This Month</SelectItem>
                  <SelectItem value="6">Last Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Button className="whitespace-nowrap">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <OrdersSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <h3 className="text-lg font-semibold">Error loading orders</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !hasGunbrokerIntegration ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="text-lg font-semibold">GunBroker Not Connected</h3>
              <p className="text-sm text-muted-foreground">
                You need to connect your GunBroker account to view orders.
              </p>
              <Button 
                variant="default" 
                asChild
                className="mt-4"
              >
                <Link href="/dashboard/connect">
                  Connect GunBroker Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <Package className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No orders found</h3>
              <p className="text-sm text-muted-foreground">
                Orders from GunBroker will appear here once they are placed.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orders.map((order) => (
                <Link 
                  key={order.orderID} 
                  href={`/dashboard/orders/${order.orderID}`}
                  className="block"
                >
                  <Card className="h-full hover:bg-muted/50 transition-colors">
                    {/* Add thumbnail if available */}
                    <div className="relative w-full h-40 overflow-hidden bg-muted">
                      {order.orderItemsCollection.length > 0 ? (
                        <img 
                          src={order.orderItemsCollection[0].thumbnail || 'https://placehold.co/600x400?text=No+Image'} 
                          alt={order.orderItemsCollection[0].title} 
                          className="object-cover w-full h-full" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      {order.orderItemsCollection.length > 0 ? (
                        <CardTitle className="text-base line-clamp-2">
                          {order.orderItemsCollection[0].title}
                        </CardTitle>
                      ) : (
                        <CardTitle className="text-base">Order #{order.orderID}</CardTitle>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <CardDescription className="text-sm">
                          Order #{order.orderID}
                        </CardDescription>
                        {isSandbox && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Sandbox
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {format(new Date(order.orderDate), 'PPP')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium">Status: </span>
                          {getShippingStatus(order)}
                        </div>
                        <div className="font-medium">${order.totalPrice.toFixed(2)}</div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Items: </span>
                          {order.orderItemsCollection.length}
                        </div>
                        <div>
                          <span className="font-medium">Buyer: </span>
                          {order.buyer.username}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {order.paymentReceived && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CreditCard className="w-3 h-3 mr-1" />
                            Paid
                          </Badge>
                        )}
                        {order.itemShipped && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            <TruckIcon className="w-3 h-3 mr-1" />
                            Shipped
                          </Badge>
                        )}
                        {order.fflReceived && (
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            FFL
                          </Badge>
                        )}
                        {order.orderCancelled && (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Cancelled
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link 
                  key={order.orderID} 
                  href={`/dashboard/orders/${order.orderID}`}
                  className="block"
                >
                  <Card className="hover:bg-muted/50 transition-colors">
                    <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                      {/* Add thumbnail */}
                      <div className="sm:block relative w-full sm:w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                        {order.orderItemsCollection.length > 0 ? (
                          <img 
                            src={order.orderItemsCollection[0].thumbnail || 'https://placehold.co/600x400?text=No+Image'} 
                            alt={order.orderItemsCollection[0].title} 
                            className="object-cover w-full h-full" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        {order.orderItemsCollection.length > 0 ? (
                          <h3 className="font-medium text-base mb-1 line-clamp-1">
                            {order.orderItemsCollection[0].title}
                          </h3>
                        ) : (
                          <h3 className="font-medium text-base mb-1">
                            Order #{order.orderID}
                          </h3>
                        )}
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm text-muted-foreground">Order #{order.orderID}</span>
                          {isSandbox && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Sandbox
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {format(new Date(order.orderDate), 'PPP')}
                        </div>
                        <div className="text-sm space-y-1">
                          <div><span className="font-medium">Buyer:</span> {order.buyer.username}</div>
                          {order.orderItemsCollection.length > 1 && (
                            <div><span className="font-medium">Additional items:</span> {order.orderItemsCollection.length - 1}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="sm:text-right">
                        <div className="font-medium text-lg">${order.totalPrice.toFixed(2)}</div>
                        <div className="mt-1">
                          {getOrderStatusBadge(order)}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2 justify-end">
                          {order.paymentReceived && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                          {order.itemShipped && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <TruckIcon className="w-3 h-3 mr-1" />
                              Shipped
                            </Badge>
                          )}
                          {order.fflReceived && (
                            <Badge variant="outline" className="text-purple-600 border-purple-600">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              FFL
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href={`/dashboard/orders?page=${Math.max(1, pageIndex - 1)}`}
                      aria-disabled={pageIndex <= 1}
                      className={pageIndex <= 1 ? 'pointer-events-none opacity-50' : ''}
                      size="default"
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageToShow = Math.min(
                      Math.max(pageIndex - 2 + i, 1),
                      totalPages
                    );
                    
                    return (
                      <PaginationItem key={pageToShow}>
                        <PaginationLink
                          href={`/dashboard/orders?page=${pageToShow}`}
                          isActive={pageToShow === pageIndex}
                          size="default"
                        >
                          {pageToShow}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      href={`/dashboard/orders?page=${Math.min(totalPages, pageIndex + 1)}`}
                      aria-disabled={pageIndex >= totalPages}
                      className={pageIndex >= totalPages ? 'pointer-events-none opacity-50' : ''}
                      size="default"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft,
  Package, 
  Truck,
  User,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  ClipboardCheck,
  ShieldCheck,
  ExternalLink,
  Copy,
  Printer,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define the order types
interface OrderItem {
  itemID: number;
  title: string;
  quantity: number;
  itemPrice: number;
  salesTaxRate: number;
  salesTax: number;
  isFFLRequired: boolean;
  thumbnail?: string;
  itemCondition: string;
  serialNumber?: string;
  upc?: string;
  sku?: string;
}

interface OrderUser {
  userID: number;
  username: string;
  accountStatus: number;
  feedbackRating: string;
  isVerified: boolean;
  memberSince: string;
}

interface OrderDetail {
  orderID: number;
  orderDate: string;
  cancelDate: string | null;
  lastModifiedDate: string;
  buyer: OrderUser;
  seller: OrderUser;
  status: Record<string, string>;
  buyerReviewDate: string;
  sellerReviewCompleteDate: string;
  buyerConfirmationDate: string;
  paymentReceivedDate: string;
  fflReceivedDate: string;
  shipDate: string;
  paymentMethod: Record<string, string>;
  billToName: string;
  billToAddress1: string;
  billToAddress2: string;
  billToCity: string;
  billToState: string;
  billToPostalCode: string;
  billToCountryCode: string;
  billToPhone: string;
  billToEmail: string;
  shipToName: string;
  shipToAddress1: string;
  shipToAddress2: string;
  shipToCity: string;
  shipToState: string;
  shipToPostalCode: string;
  shipToCountryCode: string;
  shipToPhone: string;
  shipToEmail: string;
  shipFromName: string;
  shipFromAddress1: string;
  shipFromAddress2: string;
  shipFromCity: string;
  shipFromState: string;
  shipFromPostalCode: string;
  shipFromCountryCode: string;
  shipFromPhone: string;
  shipFromEmail: string;
  shipCarrier: Record<string, string>;
  shipClass: Record<string, string>;
  shipCost: number;
  shipHandlingCost: number | null;
  shipInsuranceCost: number | null;
  isItemInsured: boolean;
  shipTrackingNumber: string;
  hasSellerLeftFeedback: boolean;
  hasBuyerLeftFeedback: boolean;
  orderTotal: number;
  fflNumber: string;
  salesTaxTotal: number;
  items: OrderItem[];
  orderItemsCollection?: OrderItem[];
  couponCode: string | null;
  couponValue: number;
  isSandbox?: boolean;
}

// Fetch order details from the API
async function fetchOrderDetails(orderId: string): Promise<OrderDetail> {
  const response = await fetch(`/api/gunbroker/orders/${orderId}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch order details');
  }
  return response.json();
}

// Add a helper function to safely access items
const getOrderItems = (orderData: OrderDetail) => {
  // Handle both items and orderItemsCollection
  return orderData.items || orderData.orderItemsCollection || [];
};

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  
  // Use React Query to fetch order details
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['orderDetails', orderId],
    queryFn: () => fetchOrderDetails(orderId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadge = () => {
    if (!orderData) return <Badge className="bg-gray-500 text-white">Unknown</Badge>;
    
    const statusValue = Object.values(orderData.status)[0] || '';
    
    if (statusValue.includes('Complete')) {
      return <Badge className="bg-green-500 text-white">Completed</Badge>;
    } else if (statusValue.includes('Ship')) {
      return <Badge className="bg-blue-500 text-white">Shipped</Badge>;
    } else if (statusValue.includes('Payment')) {
      return <Badge className="bg-yellow-500 text-white">Paid</Badge>;
    } else {
      return <Badge className="bg-gray-500 text-white">Pending</Badge>;
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: message,
    });
  };

  const getPaymentMethodName = () => {
    if (!orderData) return 'Unknown';
    return Object.values(orderData.paymentMethod)[0] || 'Unknown';
  };

  const getShipCarrierName = () => {
    if (!orderData) return 'Unknown';
    return Object.values(orderData.shipCarrier)[0] || 'Standard';
  };

  const printOrder = () => {
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
              onClick={() => router.push('/dashboard/orders')}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
              <Skeleton className="h-6 w-36 mb-4" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
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
            onClick={() => router.push('/dashboard/orders')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Order Details</h1>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load order details. Please try again.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => router.push('/dashboard/orders')}>
          Return to Orders
        </Button>
      </div>
    );
  }

  // If we don't have order data yet, show a fallback
  if (!orderData) {
    return null;
  }

  // Normal render with data
  return (
    <div className="space-y-6 pb-10">
      {/* Sandbox mode indicator */}
      {orderData.isSandbox && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Sandbox Mode</AlertTitle>
          <AlertDescription className="text-amber-600">
            You are viewing this order in sandbox mode. This is not a real order.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with back button and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/orders')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order #{orderData.orderID}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatShortDate(orderData.orderDate)}</span>
              <span>•</span>
              {getStatusBadge()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1"
            onClick={printOrder}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Order summary card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order status timeline */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-medium mb-4">Order Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium">Order Placed</p>
                    <p className="text-sm text-muted-foreground">{formatDate(orderData.orderDate)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Order was placed by {orderData.buyer.username}</p>
                </div>
              </div>
              
              {orderData.paymentReceivedDate && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">Payment Received</p>
                      <p className="text-sm text-muted-foreground">{formatDate(orderData.paymentReceivedDate)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Payment via {getPaymentMethodName()}</p>
                  </div>
                </div>
              )}
              
              {orderData.fflReceivedDate && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <ClipboardCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">FFL Received</p>
                      <p className="text-sm text-muted-foreground">{formatDate(orderData.fflReceivedDate)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">FFL Number: {orderData.fflNumber || 'N/A'}</p>
                  </div>
                </div>
              )}
              
              {orderData.shipDate && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Truck className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium">Order Shipped</p>
                      <p className="text-sm text-muted-foreground">{formatDate(orderData.shipDate)}</p>
                    </div>
                    {orderData.shipTrackingNumber && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{getShipCarrierName()}</span>
                        <span>•</span>
                        <span className="font-medium">{orderData.shipTrackingNumber}</span>
                        <button 
                          onClick={() => copyToClipboard(orderData.shipTrackingNumber, "Tracking number copied to clipboard")}
                          className="text-primary hover:text-primary/80"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order summary */}
          <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">${getOrderItems(orderData).reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0).toFixed(2) || '0.00'}</dd>
              </div>
              {orderData.shipCost > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="font-medium">${orderData.shipCost.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="font-medium">${orderData.salesTaxTotal.toFixed(2)}</dd>
              </div>
              {orderData.couponValue > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-medium text-green-600">-${orderData.couponValue.toFixed(2)}</dd>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd className="text-lg">${orderData.orderTotal.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      {/* Pricing Breakdown Card */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Pricing Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Items Subtotal */}
            <div className="flex justify-between text-sm">
              <span>Items Subtotal</span>
              <span>{new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(getOrderItems(orderData).reduce((acc, item) => acc + item.itemPrice * item.quantity, 0) || 0)}</span>
            </div>

            {/* Shipping Costs */}
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{orderData.shipCost > 0 ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(orderData.shipCost) : 'Free'}</span>
            </div>

            {/* Handling Cost if present */}
            {orderData.shipHandlingCost && orderData.shipHandlingCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Handling</span>
                <span>{new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(Number(orderData.shipHandlingCost))}</span>
              </div>
            )}

            {/* Insurance Cost if present */}
            {orderData.shipInsuranceCost && orderData.shipInsuranceCost > 0 && (
              <div className="flex justify-between text-sm">
                <span>Insurance</span>
                <span>{new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(Number(orderData.shipInsuranceCost))}</span>
              </div>
            )}

            {/* Sales Tax Breakdown */}
            {orderData.salesTaxTotal > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Sales Tax (Items)</span>
                  <span>{new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(getOrderItems(orderData).reduce((acc, item) => acc + (item.salesTax || 0), 0) || 0)}</span>
                </div>
              </>
            )}

            {/* Cash Discount if applicable */}
            {orderData.couponValue > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Coupon ({orderData.couponCode})</span>
                <span>-{new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(orderData.couponValue)}</span>
              </div>
            )}

            {/* Divider before total */}
            <Separator className="my-2" />

            {/* Order Total */}
            <div className="flex justify-between font-medium">
              <span>Order Total</span>
              <span>{new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(orderData.orderTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="customer">Customer</TabsTrigger>
        </TabsList>
        
        {/* Items tab */}
        <TabsContent value="items" className="mt-4">
          <Card className="p-5">
            <h2 className="text-lg font-medium mb-4">Order Items</h2>
            <div className="space-y-4">
              {getOrderItems(orderData).length > 0 ? (
                getOrderItems(orderData).map((item) => (
                  <div key={item.itemID} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                    <div className="h-20 w-20 overflow-hidden rounded-md bg-gray-100 flex-shrink-0">
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt={item.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <img src="/placeholder.svg" alt="Placeholder" className="h-16 w-16" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="font-medium whitespace-nowrap">${item.itemPrice.toFixed(2)}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <p>Qty: {item.quantity}</p>
                        <p>Condition: {item.itemCondition}</p>
                        {item.isFFLRequired && <p className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> FFL Required</p>}
                      </div>
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => window.open(`https://www.gunbroker.com/item/${item.itemID}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Item
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No items found for this order
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        {/* Shipping tab */}
        <TabsContent value="shipping" className="mt-4">
          <Card className="p-5">
            <h2 className="text-lg font-medium mb-4">Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Ship To
                </h3>
                <address className="not-italic text-sm space-y-1">
                  <p className="font-medium">{orderData.shipToName}</p>
                  <p>{orderData.shipToAddress1}</p>
                  {orderData.shipToAddress2 && <p>{orderData.shipToAddress2}</p>}
                  <p>{orderData.shipToCity}, {orderData.shipToState} {orderData.shipToPostalCode}</p>
                  <p>{orderData.shipToCountryCode}</p>
                  <p className="text-muted-foreground">{orderData.shipToPhone}</p>
                  <p className="text-muted-foreground">{orderData.shipToEmail}</p>
                </address>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Bill To
                </h3>
                <address className="not-italic text-sm space-y-1">
                  <p className="font-medium">{orderData.billToName}</p>
                  <p>{orderData.billToAddress1}</p>
                  {orderData.billToAddress2 && <p>{orderData.billToAddress2}</p>}
                  <p>{orderData.billToCity}, {orderData.billToState} {orderData.billToPostalCode}</p>
                  <p>{orderData.billToCountryCode}</p>
                  <p className="text-muted-foreground">{orderData.billToPhone}</p>
                  <p className="text-muted-foreground">{orderData.billToEmail}</p>
                </address>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Ship From
                </h3>
                <address className="not-italic text-sm space-y-1">
                  <p className="font-medium">{orderData.shipFromName}</p>
                  <p>{orderData.shipFromAddress1}</p>
                  {orderData.shipFromAddress2 && <p>{orderData.shipFromAddress2}</p>}
                  <p>{orderData.shipFromCity}, {orderData.shipFromState} {orderData.shipFromPostalCode}</p>
                  <p>{orderData.shipFromCountryCode}</p>
                  <p className="text-muted-foreground">{orderData.shipFromPhone}</p>
                  <p className="text-muted-foreground">{orderData.shipFromEmail}</p>
                </address>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Shipping Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium">{getShipCarrierName()}</p>
                </div>
                {orderData.shipTrackingNumber && (
                  <div>
                    <p className="text-muted-foreground">Tracking Number</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{orderData.shipTrackingNumber}</p>
                      <button 
                        onClick={() => copyToClipboard(orderData.shipTrackingNumber, "Tracking number copied to clipboard")}
                        className="text-primary hover:text-primary/80"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                {orderData.shipDate && (
                  <div>
                    <p className="text-muted-foreground">Ship Date</p>
                    <p className="font-medium">{formatShortDate(orderData.shipDate)}</p>
                  </div>
                )}
                {orderData.fflNumber && (
                  <div>
                    <p className="text-muted-foreground">FFL Number</p>
                    <p className="font-medium">{orderData.fflNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Customer tab */}
        <TabsContent value="customer" className="mt-4">
          <Card className="p-5">
            <h2 className="text-lg font-medium mb-4">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Buyer
                </h3>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{orderData.buyer.username}</p>
                    {orderData.buyer.isVerified && (
                      <Badge variant="outline" className="text-xs h-5">Verified</Badge>
                    )}
                  </div>
                  <p>Feedback: {orderData.buyer.feedbackRating}</p>
                  <p className="text-muted-foreground">Member since {formatShortDate(orderData.buyer.memberSince)}</p>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => window.open(`https://www.gunbroker.com/user/${orderData.buyer.userID}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Seller
                </h3>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{orderData.seller.username}</p>
                    {orderData.seller.isVerified && (
                      <Badge variant="outline" className="text-xs h-5">Verified</Badge>
                    )}
                  </div>
                  <p>Feedback: {orderData.seller.feedbackRating}</p>
                  <p className="text-muted-foreground">Member since {formatShortDate(orderData.seller.memberSince)}</p>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => window.open(`https://www.gunbroker.com/user/${orderData.seller.userID}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Feedback Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">Seller left feedback:</p>
                  {orderData.hasSellerLeftFeedback ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-yellow-500">Pending</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">Buyer left feedback:</p>
                  {orderData.hasBuyerLeftFeedback ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-yellow-500">Pending</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
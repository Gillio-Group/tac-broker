'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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
  Printer
} from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

// Define the order types
interface OrderItem {
  itemID: number;
  title: string;
  quantity: number;
  itemPrice: number;
  salesTaxRate: number;
  salesTax: number;
  isFFLRequired: boolean;
  thumbnail: string;
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
  couponCode: string | null;
  couponValue: number;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Sample data for UI development
  const orderData: OrderDetail = {
    "orderID": 25311835,
    "orderDate": "2024-07-16T09:48:00",
    "cancelDate": null,
    "lastModifiedDate": "2024-07-17T15:56:49",
    "buyer": {
      "userID": 8184560,
      "username": "JessRipp",
      "accountStatus": 1,
      "feedbackRating": "A+(1)",
      "isVerified": false,
      "memberSince": "2024-07-16T13:39:11Z"
    },
    "seller": {
      "userID": 2316746,
      "username": "ModGuns_com",
      "accountStatus": 1,
      "feedbackRating": "A+(1127)",
      "isVerified": true,
      "memberSince": "2012-12-19T05:05:13Z"
    },
    "status": {
      "5": "Order Complete"
    },
    "buyerReviewDate": "2024-07-16T09:49:31",
    "sellerReviewCompleteDate": "2024-07-16T09:49:31",
    "buyerConfirmationDate": "2024-07-16T09:49:31",
    "paymentReceivedDate": "2024-07-16T09:49:31",
    "fflReceivedDate": "2024-07-16T09:59:02",
    "shipDate": "2024-07-17T15:56:49",
    "paymentMethod": {
      "8": "Visa / MasterCard"
    },
    "billToName": "Jess Ripp",
    "billToAddress1": "Po Box 301",
    "billToAddress2": "",
    "billToCity": "HALES CORNERS",
    "billToState": "WI",
    "billToPostalCode": "53130-2073",
    "billToCountryCode": "US",
    "billToPhone": "(414) 678-1478",
    "billToEmail": "jess@jessripp.com",
    "shipToName": "BREW CITY ARMS LLC",
    "shipToAddress1": "12121 W GREEN CT",
    "shipToAddress2": "",
    "shipToCity": "HALES CORNERS",
    "shipToState": "WI",
    "shipToPostalCode": "53130-1737",
    "shipToCountryCode": "US",
    "shipToPhone": "2624704828",
    "shipToEmail": "brewcityarms@gmail.com",
    "shipFromName": "Gun Broker",
    "shipFromAddress1": "13575 FITZHUGH RD STE 100",
    "shipFromAddress2": "",
    "shipFromCity": "AUSTIN",
    "shipFromState": "TX",
    "shipFromPostalCode": "78736-6520",
    "shipFromCountryCode": "US",
    "shipFromPhone": "833-320-7278",
    "shipFromEmail": "info@modguns.com",
    "shipCarrier": {
      "2": "UPS"
    },
    "shipClass": {},
    "shipCost": 0.00,
    "shipHandlingCost": null,
    "shipInsuranceCost": null,
    "isItemInsured": false,
    "shipTrackingNumber": "1ZC1W2714221984882",
    "hasSellerLeftFeedback": true,
    "hasBuyerLeftFeedback": false,
    "orderTotal": 1603.49,
    "fflNumber": "3-39-XXX-XX-XX-06021",
    "salesTaxTotal": 103.50,
    "items": [
      {
        "itemID": 1053731460,
        "title": "Sig Sauer M400 SDI XSeries 5.56 NATO 16\" 30 Rounds, Anodized Black",
        "quantity": 1,
        "itemPrice": 1499.99,
        "salesTaxRate": 5.9,
        "salesTax": 88.50,
        "isFFLRequired": true,
        "thumbnail": "https://assets.gunbroker.com/pics/1053731000/1053731460/thumb.jpg",
        "itemCondition": "Unspecified"
      }
    ],
    "couponCode": null,
    "couponValue": 0.0
  };

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
    return Object.values(orderData.paymentMethod)[0] || 'Unknown';
  };

  const getShipCarrierName = () => {
    return Object.values(orderData.shipCarrier)[0] || 'Standard';
  };

  const printOrder = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-10">
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
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <ClipboardCheck className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium">FFL Received</p>
                    <p className="text-sm text-muted-foreground">{formatDate(orderData.fflReceivedDate)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">FFL Number: {orderData.fflNumber}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium">Order Shipped</p>
                    <p className="text-sm text-muted-foreground">{formatDate(orderData.shipDate)}</p>
                  </div>
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
                </div>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">${orderData.items.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0).toFixed(2)}</dd>
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
              }).format(orderData.items.reduce((acc, item) => acc + item.itemPrice * item.quantity, 0))}</span>
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
                  }).format(orderData.items.reduce((acc, item) => acc + item.salesTax, 0))}</span>
                </div>
                
                {orderData.salesTaxTotal > orderData.salesTaxTotal && (
                  <div className="flex justify-between text-sm">
                    <span>Sales Tax (Shipping)</span>
                    <span>{new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(orderData.salesTaxTotal - orderData.salesTaxTotal)}</span>
                  </div>
                )}
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
              {orderData.items.map((item) => (
                <div key={item.itemID} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="h-20 w-20 overflow-hidden rounded-md bg-gray-100 flex-shrink-0">
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt={item.title} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-full w-full p-4 text-gray-400" />
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
              ))}
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
                <div>
                  <p className="text-muted-foreground">Ship Date</p>
                  <p className="font-medium">{formatShortDate(orderData.shipDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">FFL Number</p>
                  <p className="font-medium">{orderData.fflNumber}</p>
                </div>
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
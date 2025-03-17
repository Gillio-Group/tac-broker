import Image from 'next/image';
import { format } from 'date-fns';
import { DollarSign, Package, Calendar, User, Star, Shield, Truck, Info, Eye, Crown } from 'lucide-react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

// Define the type for our Gunbroker item
interface GunbrokerItem {
  itemID: number;
  title: string;
  description: string;
  descriptionOnly: string;
  standardText: string;
  standardTextVersionID: number;
  price: number;
  buyPrice: number;
  quantity: number;
  condition: Record<string, string>;
  pictures: string[];
  endingDate: string;
  seller: {
    username: string;
    feedbackRating: string;
    isVerified: boolean;
    memberSince: string;
    userID: number;
    accountStatus: number;
    isCharterGoldMember: boolean;
    isFFL: boolean;
    isGoldMember: boolean;
    isRegisteredUser: boolean;
    isTop100Seller: boolean;
    isTop10Seller: boolean;
    isTop25Seller: boolean;
    over21: boolean;
  };
  isFixedPrice: boolean;
  freeShippingAvailable: boolean;
  categoryName: string;
  categoryID: number;
  location: string;
  inspectionPeriod: Record<string, string>;
  shippingClassesSupported: Record<string, string>;
  shippingClassCosts: Record<string, number>;
  isSandbox?: boolean;
  
  // Additional fields from JSON
  bidIncrement: number;
  bidPrice: number;
  bids: number;
  currentBid: number;
  buyer: any;
  cashDiscount: number;
  collectsSalesTax: boolean;
  eligibleForImmediateCheckout: boolean;
  hasBuyNow: boolean;
  buyNowPrice: number;
  hasColor: boolean;
  hasQuickLook: boolean;
  hasPictures: boolean;
  hasReserve: boolean;
  hasReserveBeenMet: boolean;
  hasStarted: boolean;
  hasWinningBid: boolean;
  isActive: boolean;
  isCurrentUserHighBidder: boolean;
  isFeaturedItem: boolean;
  isFFLRequired: boolean;
  isHighlighted: boolean;
  isShowCaseItem: boolean;
  isTitleBoldface: boolean;
  isWatching: boolean;
  itemCharacteristics: any[];
  mfgPartNumber: string;
  minimumBid: number;
  paymentMethods: Record<string, string>;
  prop65Warning: string;
  relistedAsItemID: number;
  salesTaxes: any[];
  serialNumber: string;
  sku: string;
  startingBid: number;
  startingDate: string;
  subTitle: string;
  thumbnailURL: string;
  timeLeft: string;
  titleColor: string;
  upc: string;
  viewCounter: number;
  weight: number | null;
  weightUnit: Record<string, string>;
  whoPaysForShipping: Record<string, string>;
  willShipInternational: boolean;
  canOffer: boolean;
  gtin: string;
  restrictRating: boolean;
  collectorsElite: boolean;
  isFinanceable: boolean;
  links: Array<{
    rel: string;
    href: string;
    verb: string;
    title: string;
  }>;
}

async function getItemDetails(id: string): Promise<GunbrokerItem> {
  // Create Supabase client
  const cookieStore = await cookies();
  const supabase = await createClient();

  // Get the user's session using getUser instead of getSession
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Authentication error:', userError);
    throw new Error('Unauthorized');
  }

  // Get user's active Gunbroker integration to check sandbox status
  const { data: integration, error: integrationError } = await supabase
    .from('gunbroker_integrations')
    .select('is_sandbox')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    console.error('Integration error:', integrationError);
    throw new Error('No active Gunbroker integration found');
  }

  // Get all cookies as a string
  const cookieHeader = cookieStore.getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');

  // Fetch item details from our API
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gunbroker/items/${id}`, {
    cache: 'no-store',
    headers: {
      Cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    console.error('API error:', response.statusText);
    throw new Error(`Error fetching item details: ${response.statusText}`);
  }

  const data = await response.json();
  // Add the sandbox status to the item data
  return { ...data, isSandbox: integration.is_sandbox };
}

export default async function ListingDetailsPage({ params }: { params: { id: string } }) {
  // Ensure params.id is awaited
  const { id } = await Promise.resolve(params);
  
  try {
    const item = await getItemDetails(id);

    // Format the ending date
    const endingDate = new Date(item.endingDate);
    const formattedEndingDate = format(endingDate, 'PPpp');

    // Format the price
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(item.price);

    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{item.title}</h1>
            <p className="text-muted-foreground">Item #{item.itemID}</p>
          </div>
          <Button asChild variant="outline">
            <a
              href={`https://${item.isSandbox ? 'sandbox.' : ''}gunbroker.com/item/${item.itemID}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on {item.isSandbox ? 'Sandbox ' : ''}Gunbroker
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {item.pictures && item.pictures.length > 0 ? (
                  <Carousel className="w-full">
                    <CarouselContent>
                      {item.pictures.map((url, index) => (
                        <CarouselItem key={index}>
                          <div className="relative aspect-video">
                            <img
                              src={url}
                              alt={`${item.title} - Image ${index + 1}`}
                              className="object-contain w-full h-full"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">No images available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Price & Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-4">
                  {/* Price Information */}
                  {item.isFixedPrice ? (
                    // Fixed Price Display
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 mr-2 text-muted-foreground" />
                          <span className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(item.buyPrice || item.price)}
                          </span>
                        </div>
                        <Badge>Fixed Price</Badge>
                      </div>
                      {item.cashDiscount > 0 && (
                        <div className="flex items-center text-sm text-green-600">
                          <Info className="h-4 w-4 mr-1" />
                          {item.cashDiscount}% cash discount available
                        </div>
                      )}
                    </div>
                  ) : (
                    // Auction Display
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 mr-2 text-muted-foreground" />
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(item.currentBid || item.startingBid)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Current Bid
                              </span>
                            </div>
                            {item.bidIncrement > 0 && (
                              <div className="text-sm text-muted-foreground">
                                Bid Increment: {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(item.bidIncrement)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">Auction</Badge>
                      </div>
                      {item.hasBuyNow && item.buyNowPrice > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center">
                            <Crown className="h-4 w-4 mr-2 text-muted-foreground" />
                            <div className="space-y-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-semibold">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                  }).format(item.buyNowPrice)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  Buy Now Price
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {item.hasReserve && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Info className="h-4 w-4 mr-1" />
                          Reserve {item.hasReserveBeenMet ? 'has been met' : 'not yet met'}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Eye className="h-4 w-4 mr-1" />
                        {item.bids} bid{item.bids !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {item.isFFLRequired && (
                      <Badge variant="destructive">FFL Required</Badge>
                    )}
                    {item.isFeaturedItem && (
                      <Badge variant="secondary">Featured</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Package className="h-4 w-4 mr-2" />
                    <span>Quantity: {item.quantity}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Ends: {formattedEndingDate}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2" />
                    <span>Seller: {item.seller.username}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Star className="h-4 w-4 mr-2" />
                    <span>Rating: {item.seller.feedbackRating}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Info className="h-4 w-4 mr-2" />
                    <span>Condition: {Object.values(item.condition)[0]}</span>
                  </div>
                  {item.viewCounter > 0 && (
                    <div className="flex items-center text-sm">
                      <Eye className="h-4 w-4 mr-2" />
                      <span>Views: {item.viewCounter}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {item.freeShippingAvailable && (
                    <Badge variant="outline" className="flex items-center">
                      <Truck className="h-3 w-3 mr-1" />
                      Free Shipping
                    </Badge>
                  )}
                  {item.seller.isVerified && (
                    <Badge variant="outline" className="flex items-center">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified Seller
                    </Badge>
                  )}
                  {item.isWatching && (
                    <Badge variant="outline" className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      Watching
                    </Badge>
                  )}
                  {item.isCurrentUserHighBidder && (
                    <Badge variant="success" className="flex items-center">
                      <Crown className="h-3 w-3 mr-1" />
                      Highest Bidder
                    </Badge>
                  )}
                </div>

                {Object.keys(item.paymentMethods).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Accepted Payment Methods</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.paymentMethods).map(([key, value]) => (
                        <Badge key={key} variant="secondary">{value}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Item Status</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <dt>Listing Status</dt>
                    <dd>
                      <Badge variant={item.isActive ? "success" : "secondary"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </dd>
                  </div>
                  {item.hasStarted && (
                    <div className="flex items-center justify-between">
                      <dt>Started</dt>
                      <dd>{format(new Date(item.startingDate), 'PPpp')}</dd>
                    </div>
                  )}
                  {item.hasWinningBid && (
                    <div className="flex items-center justify-between">
                      <dt>Winning Bid</dt>
                      <dd>
                        <Badge variant="success">Sold</Badge>
                      </dd>
                    </div>
                  )}
                  {item.isFinanceable && (
                    <div className="flex items-center justify-between">
                      <dt>Financing</dt>
                      <dd>
                        <Badge variant="secondary">Available</Badge>
                      </dd>
                    </div>
                  )}
                  {item.collectsSalesTax && (
                    <div className="flex items-center justify-between">
                      <dt>Sales Tax</dt>
                      <dd>
                        <Badge variant="secondary">Applicable</Badge>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping</CardTitle>
                <CardDescription>Available shipping methods</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Object.entries(item.shippingClassesSupported).map(([key, value]) => (
                    <li key={key} className="flex items-center text-sm">
                      <Truck className="h-4 w-4 mr-2" />
                      {value}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="details">Item Details</TabsTrigger>
                <TabsTrigger value="shipping">Shipping & Returns</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-4 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: item.descriptionOnly }} />
              </TabsContent>
              <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Item Information</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-muted-foreground">Category</dt>
                        <dd>{item.categoryName} (ID: {item.categoryID})</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Location</dt>
                        <dd>{item.location}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">SKU</dt>
                        <dd>{item.sku || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">UPC</dt>
                        <dd>{item.upc || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Manufacturer Part Number</dt>
                        <dd>{item.mfgPartNumber || 'N/A'}</dd>
                      </div>
                      {item.prop65Warning && (
                        <div>
                          <dt className="text-sm text-muted-foreground">Prop 65 Warning</dt>
                          <dd className="text-yellow-600">{item.prop65Warning}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Seller Information</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm text-muted-foreground">Member Since</dt>
                        <dd>{format(new Date(item.seller.memberSince), 'PP')}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Feedback Rating</dt>
                        <dd>{item.seller.feedbackRating}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground">Seller Status</dt>
                        <dd className="space-y-1">
                          {item.seller.isVerified && (
                            <Badge variant="outline" className="mr-2">Verified Seller</Badge>
                          )}
                          {item.seller.isFFL && (
                            <Badge variant="outline" className="mr-2">FFL Dealer</Badge>
                          )}
                          {item.seller.isGoldMember && (
                            <Badge variant="outline" className="mr-2">Gold Member</Badge>
                          )}
                          {item.seller.isTop100Seller && (
                            <Badge variant="outline">Top 100 Seller</Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {!item.isFixedPrice && (
                    <div className="md:col-span-2">
                      <h3 className="font-semibold mb-2">Auction Information</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <dt className="text-sm text-muted-foreground">Current Bid</dt>
                          <dd>{item.currentBid > 0 ? new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(item.currentBid) : 'No bids'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Number of Bids</dt>
                          <dd>{item.bids}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Starting Bid</dt>
                          <dd>{new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(item.startingBid)}</dd>
                        </div>
                        {item.hasBuyNow && (
                          <div>
                            <dt className="text-sm text-muted-foreground">Buy Now Price</dt>
                            <dd>{new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD'
                            }).format(item.buyNowPrice)}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-sm text-muted-foreground">Time Left</dt>
                          <dd>{item.timeLeft}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="shipping" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Shipping Information</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.freeShippingAvailable 
                        ? "This item qualifies for free shipping."
                        : "Shipping costs will be calculated at checkout."}
                    </p>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Available Shipping Methods</h4>
                      <ul className="space-y-2">
                        {Object.entries(item.shippingClassesSupported).map(([key, value]) => (
                          <li key={key} className="flex items-center text-sm">
                            <Truck className="h-4 w-4 mr-2" />
                            {value}
                            {item.shippingClassCosts[key] && (
                              <span className="ml-2 text-muted-foreground">
                                ({new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD'
                                }).format(item.shippingClassCosts[key])})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Shipping Responsibility</h4>
                      <ul className="space-y-1">
                        {Object.entries(item.whoPaysForShipping).map(([key, value]) => (
                          <li key={key} className="text-sm">{value}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Returns & Inspection Period</h3>
                    <p className="text-sm">
                      {Object.values(item.inspectionPeriod)[0]}
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="policies" className="mt-4 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: item.standardText }} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error('Error fetching item details:', error);
    return (
      <div className="container mx-auto py-6 space-y-6">
        <h1>Error fetching item details</h1>
        <p>{error instanceof Error ? error.message : 'An error occurred'}</p>
      </div>
    );
  }
} 
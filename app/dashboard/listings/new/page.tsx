'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { 
  Upload, 
  ImagePlus, 
  ChevronLeft, 
  Info, 
  AlertCircle, 
  ExternalLink,
  Zap,
  Tag,
  Clock,
  DollarSign,
  Truck,
  FileText,
  CreditCard
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define form validation schema
const listingFormSchema = z.object({
  // Basic Information
  title: z.string().min(5, "Title must be at least 5 characters").max(75, "Title cannot exceed 75 characters"),
  categoryID: z.number().min(1, "Category is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  condition: z.number().min(1, "Condition is required"),
  
  // Pricing
  isFixedPrice: z.boolean().default(false),
  startingBid: z.number().min(0).optional(),
  buyNowPrice: z.number().min(0).optional(),
  fixedPrice: z.number().min(0).optional(),
  reservePrice: z.number().min(0).optional(),
  
  // Duration and quantity
  listingDuration: z.number().min(1, "Duration is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  
  // Item details
  serialNumber: z.string().optional(),
  sku: z.string().optional(),
  upc: z.string().optional(),
  mfgPartNumber: z.string().optional(),
  isFFLRequired: z.boolean().default(true),
  
  // Location
  countryCode: z.string().length(2, "Country code must be 2 characters"),
  postalCode: z.string().min(1, "Postal code is required"),
  
  // Shipping
  whoPaysForShipping: z.number().min(1, "Shipping payment method is required"),
  willShipInternational: z.boolean().default(false),
  shippingClassesSupported: z.object({
    Overnight: z.boolean().default(false),
    TwoDay: z.boolean().default(false),
    ThreeDay: z.boolean().default(false),
    Ground: z.boolean().default(true),
    FirstClass: z.boolean().default(false),
    Priority: z.boolean().default(false),
    InStorePickup: z.boolean().default(false),
    AlaskaHawaii: z.boolean().default(false),
    Other: z.boolean().default(false),
  }).optional(),
  shippingClassCosts: z.record(z.string(), z.number()).optional(),
  
  // Payment
  paymentMethods: z.object({
    Check: z.boolean().default(true),
    VisaMastercard: z.boolean().default(true),
    COD: z.boolean().default(false),
    Escrow: z.boolean().default(false),
    Amex: z.boolean().default(false),
    PayPal: z.boolean().default(false),
    Discover: z.boolean().default(false),
    CertifiedCheck: z.boolean().default(true),
    USPSMoneyOrder: z.boolean().default(true),
    MoneyOrder: z.boolean().default(false),
    FreedomCoin: z.boolean().default(false),
    Financing: z.boolean().default(false)
  }).optional(),
  
  // Return Policy
  inspectionPeriod: z.number().optional(),
  
  // Auto-relist options
  autoRelist: z.number().optional(),
  autoRelistFixedCount: z.number().optional(),
  
  // Offers
  canOffer: z.boolean().default(false),
  autoAcceptPrice: z.number().optional(),
  autoRejectPrice: z.number().optional(),
});

// Category options
const categoryOptions = [
  { id: 3026, name: "Pistols" },
  { id: 3027, name: "Rifles" },
  { id: 3028, name: "Shotguns" },
  { id: 2325, name: "Ammunition" },
  { id: 2327, name: "Firearm Accessories" },
  { id: 2330, name: "Optics" },
  { id: 2331, name: "Holsters & Pouches" },
  { id: 2335, name: "Knives" },
  { id: 2342, name: "Gun Parts" },
];

// Condition options
const conditionOptions = [
  { id: 1, name: "Factory New" },
  { id: 2, name: "New Old Stock" },
  { id: 3, name: "Used" },
];

// Listing duration options
const durationOptions = [
  { id: 1, name: "1 day" },
  { id: 3, name: "3 days" },
  { id: 5, name: "5 days" },
  { id: 7, name: "7 days" },
  { id: 10, name: "10 days" },
  { id: 14, name: "14 days" },
  { id: 30, name: "30 days (Fixed price only)" },
];

// Shipping options
const shippingOptions = [
  { id: 2, name: "Seller Pays Shipping" },
  { id: 4, name: "Buyer Pays Actual Shipping Cost" },
  { id: 8, name: "Buyer Pays Fixed Amount" },
];

// Inspection period options
const inspectionPeriodOptions = [
  { id: 1, name: "AS IS - No refund or exchange" },
  { id: 2, name: "No refund but item can be returned for exchange or store credit within fourteen days" },
  { id: 3, name: "No refund but item can be returned for exchange or store credit within thirty days" },
  { id: 4, name: "Three Days from the date the item is received" },
  { id: 5, name: "Three Days from the date the item is received, including the cost of shipping" },
  { id: 12, name: "30 day money back guarantee" },
  { id: 13, name: "30 day money back guarantee including the cost of shipping" },
  { id: 14, name: "Factory Warranty" },
];

// Auto-relist options
const autoRelistOptions = [
  { id: 1, name: "Do Not Relist" },
  { id: 2, name: "Relist Until Sold" },
  { id: 3, name: "Relist Fixed Count" },
  { id: 4, name: "Relist Fixed Price" },
];

export default function NewListingPage() {
  const router = useRouter();
  const { session, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  // Initialize form
  const form = useForm<z.infer<typeof listingFormSchema>>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryID: 0,
      condition: 0,
      isFixedPrice: false,
      startingBid: 0,
      quantity: 1,
      listingDuration: 7,
      isFFLRequired: true,
      countryCode: "US",
      postalCode: "",
      whoPaysForShipping: 4,
      willShipInternational: false,
      canOffer: false,
      shippingClassesSupported: {
        Overnight: false,
        TwoDay: false,
        ThreeDay: false,
        Ground: true,
        FirstClass: false,
        Priority: false,
        InStorePickup: false,
        AlaskaHawaii: false,
        Other: false,
      },
      paymentMethods: {
        Check: true,
        VisaMastercard: true,
        COD: false,
        Escrow: false,
        Amex: false,
        PayPal: false,
        Discover: false,
        CertifiedCheck: true,
        USPSMoneyOrder: true,
        MoneyOrder: false,
        FreedomCoin: false,
        Financing: false
      },
      inspectionPeriod: 1, // Default to "AS IS"
      autoRelist: 1, // Default to "Do Not Relist"
    },
  });
  
  // Form submission handler
  async function onSubmit(values: z.infer<typeof listingFormSchema>) {
    if (!session || !user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create a listing",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create form data for multipart/form-data submission
      const formData = new FormData();
      
      // Add listing data as JSON
      const listingData = {
        ...values,
        // No need to add payment methods here as they're included in the form values now
      };
      
      formData.append('data', JSON.stringify(listingData));
      
      // Add thumbnail if selected
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      
      // Add images if selected
      imageFiles.forEach(file => {
        formData.append('picture', file);
      });
      
      // Submit to our API endpoint
      const response = await fetch('/api/gunbroker/listings/create', {
        method: 'POST',
        body: formData,
        headers: {
          // Note: Don't set Content-Type here as it will be set automatically with the boundary
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create listing');
      }
      
      const result = await response.json();
      
      toast({
        title: "Listing Created",
        description: `Listing #${result.itemID} created successfully`,
      });
      
      // Redirect to listings page
      router.push('/dashboard/listings');
      
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error Creating Listing",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Handle thumbnail selection
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setThumbnailFile(e.target.files[0]);
    }
  };
  
  // Handle image selection
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  // Handle removing an image
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Check if user is authenticated
  if (!session || !user) {
    return (
      <div className="container mx-auto py-10">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to create a listing. Please log in and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/listings')}
          className="mr-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Listings
        </Button>
        <h1 className="text-3xl font-bold">Create New Listing</h1>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Details</span>
              </TabsTrigger>
              <TabsTrigger value="shipping" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Shipping</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Payment</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                <span>Images</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the basic details for your listing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-5 border space-y-5">
                    <div className="grid gap-1">
                      <Label htmlFor="title" className="text-base font-medium mb-1">Title</Label>
                      <Input 
                        id="title"
                        placeholder="Enter a descriptive title" 
                        value={form.watch("title")}
                        onChange={(e) => form.setValue("title", e.target.value)}
                        className="bg-white"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum 75 characters. No HTML or all-caps.
                      </p>
                      {form.formState.errors.title && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.title.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid gap-1">
                      <Label htmlFor="category" className="text-base font-medium mb-1">Category</Label>
                      <Select
                        value={form.watch("categoryID")?.toString() || ""}
                        onValueChange={(value) => form.setValue("categoryID", parseInt(value))}
                      >
                        <SelectTrigger id="category" className="bg-white">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose the category that best fits your item
                      </p>
                      {form.formState.errors.categoryID && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.categoryID.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid gap-1">
                      <Label htmlFor="description" className="text-base font-medium mb-1">Description</Label>
                      <Textarea 
                        id="description"
                        placeholder="Provide a detailed description of your item" 
                        className="min-h-[200px] bg-white" 
                        value={form.watch("description")}
                        onChange={(e) => form.setValue("description", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        HTML is allowed. All URLs must be HTTPS.
                      </p>
                      {form.formState.errors.description && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.description.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid gap-1">
                      <Label htmlFor="condition" className="text-base font-medium mb-1">Condition</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {conditionOptions.map((condition) => (
                          <div
                            key={condition.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              form.watch("condition") === condition.id
                                ? "bg-primary/10 border-primary"
                                : "bg-white hover:bg-slate-100"
                            }`}
                            onClick={() => form.setValue("condition", condition.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-4 h-4 rounded-full border ${
                                  form.watch("condition") === condition.id
                                    ? "border-4 border-primary"
                                    : "border border-slate-300"
                                }`}
                              />
                              <span className="font-medium">{condition.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {form.formState.errors.condition && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.condition.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Information</CardTitle>
                  <CardDescription>
                    Set up pricing details for your listing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 rounded-lg p-5 border space-y-5">
                    {/* Listing Type Switch */}
                    <div className="flex items-center justify-between rounded-lg bg-white border p-4">
                      <div>
                        <h3 className="font-medium">Listing Type</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose between auction or fixed price listing
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={form.watch("isFixedPrice") ? "text-muted-foreground" : "font-medium"}>Auction</span>
                        <Switch
                          checked={form.watch("isFixedPrice")}
                          onCheckedChange={(checked) => form.setValue("isFixedPrice", checked)}
                        />
                        <span className={!form.watch("isFixedPrice") ? "text-muted-foreground" : "font-medium"}>Fixed Price</span>
                      </div>
                    </div>
                    
                    {/* Auction Settings */}
                    {!form.watch("isFixedPrice") && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-medium">Auction Settings</h3>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="starting-bid">Starting Bid ($)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5">$</span>
                              <Input
                                id="starting-bid"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-white"
                                value={form.watch("startingBid") || ""}
                                onChange={(e) => form.setValue("startingBid", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Minimum amount users can bid
                            </p>
                            {form.formState.errors.startingBid && (
                              <p className="text-sm text-destructive">
                                {form.formState.errors.startingBid.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="buy-now-price">Buy Now Price ($) <span className="text-muted-foreground">(Optional)</span></Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5">$</span>
                              <Input
                                id="buy-now-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-white"
                                value={form.watch("buyNowPrice") || ""}
                                onChange={(e) => form.setValue("buyNowPrice", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Price to immediately purchase the item
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reserve-price">Reserve Price ($) <span className="text-muted-foreground">(Optional)</span></Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5">$</span>
                              <Input
                                id="reserve-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-white"
                                value={form.watch("reservePrice") || ""}
                                onChange={(e) => form.setValue("reservePrice", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Minimum price you're willing to accept (fee applies)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Fixed Price Settings */}
                    {form.watch("isFixedPrice") && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-medium">Fixed Price Settings</h3>
                        
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="fixed-price">Fixed Price ($)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5">$</span>
                              <Input
                                id="fixed-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-white"
                                value={form.watch("fixedPrice") || ""}
                                onChange={(e) => form.setValue("fixedPrice", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              The price for each item
                            </p>
                            {form.formState.errors.fixedPrice && (
                              <p className="text-sm text-destructive">
                                {form.formState.errors.fixedPrice.message}
                              </p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="1"
                              step="1"
                              placeholder="1"
                              className="bg-white"
                              value={form.watch("quantity") || ""}
                              onChange={(e) => form.setValue("quantity", parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Number of items available for sale
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Listing Duration */}
                    <div className="space-y-3 border-t pt-4">
                      <Label htmlFor="duration" className="font-medium">Listing Duration</Label>
                      <select
                        id="duration"
                        className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={form.watch("listingDuration") || ""}
                        onChange={(e) => form.setValue("listingDuration", parseInt(e.target.value))}
                      >
                        {durationOptions.map((duration) => (
                          <option 
                            key={duration.id} 
                            value={duration.id}
                            disabled={duration.id > 14 && !form.watch("isFixedPrice")}
                          >
                            {duration.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        {form.watch("isFixedPrice") 
                          ? "Fixed price listings can have longer durations (up to 90 days)" 
                          : "Auction listings are limited to 14 days maximum"}
                      </p>
                    </div>
                    
                    {/* Offers Section */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between pb-2">
                        <div>
                          <h3 className="font-medium">Accept Offers</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Allow buyers to make offers on your item
                          </p>
                        </div>
                        <Switch
                          checked={form.watch("canOffer") || false}
                          onCheckedChange={(checked) => form.setValue("canOffer", checked)}
                        />
                      </div>
                      
                      {form.watch("canOffer") && (
                        <div className="grid gap-4 md:grid-cols-2 pl-2 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="auto-accept">Auto-Accept Price ($)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5">$</span>
                              <Input
                                id="auto-accept"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-white"
                                value={form.watch("autoAcceptPrice") || ""}
                                onChange={(e) => form.setValue("autoAcceptPrice", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Automatically accept offers above this price
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="auto-reject">Auto-Reject Price ($)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5">$</span>
                              <Input
                                id="auto-reject"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7 bg-white"
                                value={form.watch("autoRejectPrice") || ""}
                                onChange={(e) => form.setValue("autoRejectPrice", parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Automatically reject offers below this price
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Item Details</CardTitle>
                  <CardDescription>
                    Additional details about your item
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 rounded-lg p-5 border space-y-5">
                    <div className="flex items-center justify-between rounded-lg bg-white border p-4">
                      <div>
                        <h3 className="font-medium">FFL Required</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Does this item require transfer through an FFL holder?
                        </p>
                      </div>
                      <Switch
                        checked={form.watch("isFFLRequired")}
                        onCheckedChange={(checked) => form.setValue("isFFLRequired", checked)}
                      />
                    </div>
                    
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-3">
                        <h3 className="font-medium">Product Identification</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="serial-number">Serial Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                            <Input
                              id="serial-number"
                              placeholder="Enter serial number"
                              className="bg-white mt-1"
                              value={form.watch("serialNumber") || ""}
                              onChange={(e) => form.setValue("serialNumber", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Add the item's serial number if applicable
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="sku">SKU <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                            <Input
                              id="sku"
                              placeholder="Enter SKU"
                              className="bg-white mt-1"
                              value={form.watch("sku") || ""}
                              onChange={(e) => form.setValue("sku", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Your internal stock keeping unit
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="font-medium">Product Codes</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="upc">UPC <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                            <Input
                              id="upc"
                              placeholder="Enter UPC"
                              className="bg-white mt-1"
                              value={form.watch("upc") || ""}
                              onChange={(e) => form.setValue("upc", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Universal Product Code
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="mfg-part">Manufacturer Part Number <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                            <Input
                              id="mfg-part"
                              placeholder="Enter manufacturer part number"
                              className="bg-white mt-1"
                              value={form.watch("mfgPartNumber") || ""}
                              onChange={(e) => form.setValue("mfgPartNumber", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Manufacturer's official part number
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-3 mt-2 border-t">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-start">
                          <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-blue-800">Product Detail Tips</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              Adding accurate details like UPC and manufacturer part numbers can increase your item's visibility in search results and help buyers find your listing more easily.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Shipping Tab */}
            <TabsContent value="shipping" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Details</CardTitle>
                  <CardDescription>
                    Specify shipping options and location information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="whoPaysForShipping"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Payment</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shipping option" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {shippingOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id.toString()}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="willShipInternational"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">International Shipping</FormLabel>
                          <FormDescription>
                            Will you ship this item internationally?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Shipping Classes & Costs</h3>
                    <p className="text-sm text-muted-foreground">
                      Select shipping methods and enter costs if buyer pays fixed amount
                    </p>
                    
                    <div className="bg-slate-50 rounded-lg p-4 border">
                      {Object.entries({
                        Ground: "Ground shipping (standard)",
                        Priority: "Priority shipping (faster)",
                        FirstClass: "First Class shipping",
                        Overnight: "Overnight delivery (fastest)",
                        TwoDay: "Two-day delivery",
                        ThreeDay: "Three-day delivery",
                        InStorePickup: "In-store pickup (no shipping)",
                        AlaskaHawaii: "Alaska/Hawaii shipping",
                        Other: "Other shipping methods"
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex items-center">
                            <Checkbox
                              id={`shipping-${key}`}
                              checked={form.watch(`shippingClassesSupported.${key}`) || false}
                              onCheckedChange={(checked) => {
                                form.setValue(`shippingClassesSupported.${key}`, !!checked);
                                
                                // If unchecked, clear the cost
                                if (!checked) {
                                  const currentCosts = form.getValues("shippingClassCosts") || {};
                                  if (currentCosts[key]) {
                                    const { [key]: _, ...restCosts } = currentCosts;
                                    form.setValue("shippingClassCosts", restCosts);
                                  }
                                }
                              }}
                            />
                            <Label htmlFor={`shipping-${key}`} className="ml-2 cursor-pointer">
                              {label}
                            </Label>
                          </div>
                          
                          <div className="flex items-center w-32">
                            <span className="mr-2 text-sm font-medium">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="h-8"
                              disabled={!form.watch(`shippingClassesSupported.${key}`) || form.watch("whoPaysForShipping") !== 8}
                              value={(form.watch(`shippingClassCosts.${key}`) || "").toString()}
                              onChange={(e) => {
                                const currentCosts = form.getValues("shippingClassCosts") || {};
                                form.setValue("shippingClassCosts", {
                                  ...currentCosts,
                                  [key]: parseFloat(e.target.value) || 0,
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {form.watch("whoPaysForShipping") === 8 && (
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center text-amber-800">
                          <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                          <p className="text-sm">Enter costs for each selected shipping method</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Return Policy</CardTitle>
                  <CardDescription>
                    Specify your return policy for this item
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="inspectionPeriod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspection Period / Return Policy</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString() || "1"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select return policy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inspectionPeriodOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id.toString()}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the return policy that applies to this item
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Payment Methods Tab */}
            <TabsContent value="payment" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Specify which payment methods you accept
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-slate-50 rounded-lg p-4 border">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {[
                        { key: "VisaMastercard", label: "Visa / Mastercard", icon: "💳" },
                        { key: "Amex", label: "American Express", icon: "💳" },
                        { key: "Discover", label: "Discover", icon: "💳" },
                        { key: "Check", label: "Personal Check", icon: "📝" },
                        { key: "CertifiedCheck", label: "Certified Check", icon: "✓" },
                        { key: "USPSMoneyOrder", label: "USPS Money Order", icon: "📮" },
                        { key: "MoneyOrder", label: "Money Order", icon: "💱" },
                        { key: "Escrow", label: "Escrow", icon: "🔒" },
                        { key: "Financing", label: "Financing", icon: "💰" }
                      ].map((method) => (
                        <div key={method.key} className="flex items-center justify-between py-3 px-4 rounded-lg bg-white border">
                          <div className="flex items-center">
                            <span className="mr-3 text-lg">{method.icon}</span>
                            <Label htmlFor={`payment-${method.key}`} className="cursor-pointer">
                              {method.label}
                            </Label>
                          </div>
                          <Switch
                            id={`payment-${method.key}`}
                            checked={form.watch(`paymentMethods.${method.key}`) || false}
                            onCheckedChange={(checked) => {
                              form.setValue(`paymentMethods.${method.key}`, checked);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Relist Options</CardTitle>
                  <CardDescription>
                    Specify how you want your listing to be relisted
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-5 border">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {autoRelistOptions.map((option) => (
                          <div
                            key={option.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              form.watch("autoRelist") === option.id
                                ? "bg-primary/10 border-primary"
                                : "bg-white hover:bg-slate-100"
                            }`}
                            onClick={() => form.setValue("autoRelist", option.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-4 h-4 rounded-full border ${
                                  form.watch("autoRelist") === option.id
                                    ? "border-4 border-primary"
                                    : "border border-slate-300"
                                }`}
                              />
                              <span className="font-medium">{option.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {form.watch("autoRelist") === 3 && (
                        <div className="pt-4 mt-1 border-t">
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <Label className="font-medium">Number of times to relist:</Label>
                              <Input 
                                type="number" 
                                min="1" 
                                step="1" 
                                placeholder="1" 
                                className="w-full sm:w-32 h-9"
                                value={form.watch("autoRelistFixedCount") || ""}
                                onChange={(e) => form.setValue("autoRelistFixedCount", parseInt(e.target.value) || 1)} 
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Images Tab */}
            <TabsContent value="images" className="space-y-6 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                  <CardDescription>
                    Upload images of your item (thumbnail and additional photos)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label>Thumbnail Image</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                      {thumbnailFile ? (
                        <div className="flex flex-col items-center gap-4">
                          <img 
                            src={URL.createObjectURL(thumbnailFile)} 
                            alt="Thumbnail preview" 
                            className="w-40 h-40 object-contain border rounded-md"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{thumbnailFile.name}</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setThumbnailFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <ImagePlus className="h-12 w-12 text-gray-400 mb-2" />
                          <p className="text-sm text-muted-foreground mb-4">
                            Upload a main thumbnail image
                          </p>
                          <Label 
                            htmlFor="thumbnail-upload" 
                            className="cursor-pointer inline-flex items-center py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Select Thumbnail
                          </Label>
                          <Input 
                            id="thumbnail-upload" 
                            type="file" 
                            className="hidden" 
                            onChange={handleThumbnailChange}
                            accept="image/*"
                          />
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <Label>Additional Images</Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                      <ImagePlus className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Upload additional images of your item
                      </p>
                      <Label 
                        htmlFor="image-upload" 
                        className="cursor-pointer inline-flex items-center py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Add Images
                      </Label>
                      <Input 
                        id="image-upload" 
                        type="file" 
                        className="hidden" 
                        onChange={handleImagesChange}
                        accept="image/*"
                        multiple
                      />
                    </div>
                    
                    {imageFiles.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Selected Images ({imageFiles.length})</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {imageFiles.map((file, index) => (
                            <div 
                              key={index} 
                              className="relative border rounded-md overflow-hidden group"
                            >
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={`Image ${index + 1}`} 
                                className="w-full h-24 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => removeImage(index)}
                                  className="w-8 h-8 p-0 rounded-full"
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                                <p className="text-white text-xs truncate">
                                  {file.name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/listings')}
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              className="gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Listing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Create Listing
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 
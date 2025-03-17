'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ListingCard } from '@/components/listings/listing-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/components/providers/supabase-auth-provider';
import { authenticatedFetchJson } from '@/lib/client-utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

// Define the form schema
const searchFormSchema = z.object({
  searchText: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  condition: z.string().optional(),
  sortBy: z.string().optional(),
  auctionsOnly: z.boolean().optional(),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

// Define the search response type
interface SearchResult {
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

interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  pageSize: number;
  pageIndex: number;
  maxPages: number;
  hasMoreItems: boolean;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageIndex, setPageIndex] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { session } = useAuth();
  const supabase = createClient();
  
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

  // Initialize form with URL search params
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      searchText: searchParams.get('searchText') || '',
      categoryId: searchParams.get('categoryId') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      condition: searchParams.get('condition') || '0',
      sortBy: searchParams.get('sortBy') || '13',
      auctionsOnly: searchParams.get('auctionsOnly') === 'true',
    },
  });

  // Update page when URL changes
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setPageIndex(parseInt(pageParam));
    } else {
      setPageIndex(1);
    }
  }, [searchParams]);

  // Build query parameters for API call
  const pageSize = 25; // Fixed page size
  const buildQueryParams = (formValues: SearchFormValues, currentPage: number) => {
    const params = new URLSearchParams();
    
    if (formValues.searchText) params.append('searchText', formValues.searchText);
    if (formValues.categoryId && formValues.categoryId !== 'all') params.append('categoryId', formValues.categoryId);
    if (formValues.minPrice) params.append('minPrice', formValues.minPrice);
    if (formValues.maxPrice) params.append('maxPrice', formValues.maxPrice);
    if (formValues.condition && formValues.condition !== '0') params.append('condition', formValues.condition);
    if (formValues.sortBy) params.append('sortBy', formValues.sortBy);
    if (formValues.auctionsOnly) params.append('auctionsOnly', 'true');
    
    params.append('pageIndex', currentPage.toString());
    params.append('pageSize', pageSize.toString());
    
    return params.toString();
  };

  // Get current form values for query
  const currentValues = form.getValues();
  const queryString = buildQueryParams(currentValues, pageIndex);
  
  // Fetch search results
  const { data, isLoading, isError, error } = useQuery<SearchResponse>({
    queryKey: ['gunbroker-search', queryString, session?.access_token],
    queryFn: async () => {
      if (!currentValues.searchText && !currentValues.categoryId) {
        // Don't search if no main criteria provided
        return { 
          results: [], 
          totalResults: 0, 
          pageSize: 25, 
          pageIndex: 1, 
          maxPages: 1, 
          hasMoreItems: false 
        };
      }
      
      // Create API query params, transforming sortBy to Sort for Gunbroker API
      const apiParams = new URLSearchParams(queryString);
      if (apiParams.has('sortBy')) {
        const sortValue = apiParams.get('sortBy');
        apiParams.delete('sortBy');
        apiParams.append('Sort', sortValue!);
      }
      
      console.log('Making search request with params:', apiParams.toString());
      
      // Get current session
      let currentSession = session;
      if (!currentSession) {
        const { data: { session: fetchedSession } } = await supabase.auth.getSession();
        currentSession = fetchedSession;
      }
      
      if (!currentSession) {
        throw new Error('No valid session found');
      }
      
      const response = await authenticatedFetchJson(`/api/gunbroker/search?${apiParams.toString()}`, currentSession);
      
      // Type guard to ensure response matches our expected structure
      const typedResponse = response as SearchResponse;
      if (!typedResponse || typeof typedResponse !== 'object') {
        throw new Error('Invalid response format');
      }

      // Ensure required fields exist with proper types
      const validatedResponse: SearchResponse = {
        results: Array.isArray(typedResponse.results) ? typedResponse.results : [],
        totalResults: typeof typedResponse.totalResults === 'number' ? typedResponse.totalResults : 0,
        pageSize: typeof typedResponse.pageSize === 'number' ? typedResponse.pageSize : pageSize,
        pageIndex: typeof typedResponse.pageIndex === 'number' ? typedResponse.pageIndex : 1,
        maxPages: typeof typedResponse.maxPages === 'number' ? typedResponse.maxPages : 1,
        hasMoreItems: Boolean(typedResponse.hasMoreItems)
      };

      console.log('Search API Response:', {
        totalResults: validatedResponse.totalResults,
        pageIndex: validatedResponse.pageIndex,
        pageSize: validatedResponse.pageSize,
        maxPages: validatedResponse.maxPages,
        resultCount: validatedResponse.results?.length,
        firstResult: validatedResponse.results?.[0],
        sampleResult: validatedResponse.results?.[0] ? {
          itemID: validatedResponse.results[0].itemID,
          title: validatedResponse.results[0].title,
          price: validatedResponse.results[0].price,
          thumbnailURL: validatedResponse.results[0].thumbnailURL,
        } : null
      });

      return validatedResponse;
    },
    enabled: (!!currentValues.searchText || !!currentValues.categoryId) && !!session,
  });

  // Add effect to log data changes
  useEffect(() => {
    if (data) {
      console.log('Search Results Updated:', {
        hasResults: !!data.results?.length,
        totalResults: data.totalResults,
        pageIndex: data.pageIndex,
        resultCount: data.results?.length,
        sampleResult: data.results?.[0] ? {
          itemID: data.results[0].itemID,
          title: data.results[0].title,
          price: data.results[0].price,
          thumbnailURL: data.results[0].thumbnailURL,
        } : null
      });
    }
  }, [data]);

  // Handle form submission
  const onSubmit = (values: SearchFormValues) => {
    setPageIndex(1); // Reset to first page on new search
    
    // Update URL with search params
    const params = new URLSearchParams();
    if (values.searchText) params.append('searchText', values.searchText);
    if (values.categoryId) params.append('categoryId', values.categoryId);
    if (values.minPrice) params.append('minPrice', values.minPrice);
    if (values.maxPrice) params.append('maxPrice', values.maxPrice);
    if (values.condition) params.append('condition', values.condition);
    if (values.sortBy) params.append('sortBy', values.sortBy);
    if (values.auctionsOnly) params.append('auctionsOnly', 'true');
    
    router.push(`/dashboard/search?${params.toString()}`);
  };

  // Helper function to safely calculate pagination values
  const getPaginationValues = (data: SearchResponse | undefined) => {
    if (!data) {
      return {
        startItem: 0,
        endItem: 0,
        totalResults: 0,
        currentPage: 1,
        maxPages: 1,
        hasMoreItems: false
      };
    }

    const startItem = Math.max(((data.pageIndex - 1) * data.pageSize) + 1, 0);
    const endItem = Math.min(data.pageIndex * data.pageSize, data.totalResults);
    
    return {
      startItem,
      endItem,
      totalResults: data.totalResults,
      currentPage: data.pageIndex,
      maxPages: data.maxPages || 1,
      hasMoreItems: data.hasMoreItems
    };
  };

  // Get pagination values
  const {
    startItem,
    endItem,
    totalResults,
    currentPage,
    maxPages,
    hasMoreItems
  } = getPaginationValues(data);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Gunbroker</h1>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Filters</CardTitle>
              <CardDescription>
                Search for items on Gunbroker using various criteria
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="searchText"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search Gunbroker..." 
                            className="pl-8" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sortBy"
                  render={({ field }) => (
                    <FormItem className="w-full lg:w-48">
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sort by..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="13">Featured & Relevance</SelectItem>
                            <SelectItem value="0">Ending Soonest</SelectItem>
                            <SelectItem value="1">Ending Latest</SelectItem>
                            <SelectItem value="4">Price (Low to High)</SelectItem>
                            <SelectItem value="5">Price (High to Low)</SelectItem>
                            <SelectItem value="6">Newly Listed</SelectItem>
                            <SelectItem value="7">Recently Listed</SelectItem>
                            <SelectItem value="8">Fewest Bids</SelectItem>
                            <SelectItem value="9">Most Bids</SelectItem>
                            <SelectItem value="10">Lowest Quantity</SelectItem>
                            <SelectItem value="11">Highest Quantity</SelectItem>
                            <SelectItem value="12">Relevance</SelectItem>
                            <SelectItem value="2">Item # (Ascending)</SelectItem>
                            <SelectItem value="3">Item # (Descending)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full lg:w-auto">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              </div>
              
              <Accordion
                type="single"
                collapsible
                className="w-full"
                value={isFilterOpen ? "filters" : undefined}
                onValueChange={(value) => setIsFilterOpen(!!value)}
              >
                <AccordionItem value="filters" className="border-b-0">
                  <AccordionTrigger className="py-2 hidden lg:flex">
                    <span className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      Advanced Filters
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Categories</SelectItem>
                                  <SelectItem value="2325">Pistols</SelectItem>
                                  <SelectItem value="3024">Rifles</SelectItem>
                                  <SelectItem value="2084">Shotguns</SelectItem>
                                  <SelectItem value="3127">Ammunition</SelectItem>
                                  <SelectItem value="2329">Accessories</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="condition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Any condition" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">All Conditions</SelectItem>
                                  <SelectItem value="1">New Items Only</SelectItem>
                                  <SelectItem value="2">New and New Old Stock</SelectItem>
                                  <SelectItem value="3">Used and New Old Stock</SelectItem>
                                  <SelectItem value="4">Used Items Only</SelectItem>
                                  <SelectItem value="5">New Old Stock Only</SelectItem>
                                  <SelectItem value="6">New and Used Items</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="minPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Price</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="0.00" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="maxPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Price</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="No limit" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <FormField
                        control={form.control}
                        name="auctionsOnly"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Auctions Only
                              </FormLabel>
                              <FormDescription>
                                Show only auction listings (excludes fixed price items)
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Search Results */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[300px] rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-2">Error loading search results</p>
            <p className="text-muted-foreground">{(error as Error)?.message || 'Unknown error occurred'}</p>
          </div>
        ) : data?.results?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xl font-semibold mb-2">No results found</p>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                {data?.totalResults ? `Showing ${data.results.length} of ${data.totalResults} results` : 'No results found'}
              </p>
              <div className="lg:hidden">
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <LayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.results?.map((result) => (
                  <ListingCard key={result.itemID} listing={result} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {data?.results?.map((result) => (
                  <ListingCard key={result.itemID} listing={result} />
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {totalResults > 0 ? (
                  `Showing ${startItem} to ${endItem} of ${totalResults} results`
                ) : (
                  'No results found'
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex(prev => Math.max(1, prev - 1))}
                  disabled={pageIndex <= 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {maxPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex(prev => Math.min(maxPages, prev + 1))}
                  disabled={!hasMoreItems || pageIndex >= maxPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

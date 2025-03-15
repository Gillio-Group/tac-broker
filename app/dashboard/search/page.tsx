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
import { getSessionFromLocalStorage } from '@/lib/auth-utils';

// Define the form schema
const searchFormSchema = z.object({
  searchText: z.string().optional(),
  categoryId: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  condition: z.string().optional(),
  sortBy: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { session } = useAuth();
  
  // Redirect to login if no session
  useEffect(() => {
    const localSession = getSessionFromLocalStorage();
    if (!session && !localSession) {
      router.push('/auth/login');
    }
  }, [session, router]);

  // Initialize form with URL search params
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      searchText: searchParams.get('searchText') || '',
      categoryId: searchParams.get('categoryId') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      condition: searchParams.get('condition') || '',
      sortBy: searchParams.get('sortBy') || 'EndingSoonest',
    },
  });

  // Update page when URL changes
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      setPage(parseInt(pageParam));
    } else {
      setPage(1);
    }
  }, [searchParams]);

  // Build query parameters for API call
  const buildQueryParams = (formValues: SearchFormValues, currentPage: number) => {
    const params = new URLSearchParams();
    
    if (formValues.searchText) params.append('searchText', formValues.searchText);
    if (formValues.categoryId) params.append('categoryId', formValues.categoryId);
    if (formValues.minPrice) params.append('minPrice', formValues.minPrice);
    if (formValues.maxPrice) params.append('maxPrice', formValues.maxPrice);
    if (formValues.condition) params.append('condition', formValues.condition);
    if (formValues.sortBy) params.append('sortBy', formValues.sortBy);
    
    params.append('page', currentPage.toString());
    params.append('pageSize', '25');
    
    return params.toString();
  };

  // Get current form values for query
  const currentValues = form.getValues();
  const queryString = buildQueryParams(currentValues, page);
  
  // Fetch search results
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gunbroker-search', queryString],
    queryFn: async () => {
      if (!currentValues.searchText && !currentValues.categoryId) {
        // Don't search if no main criteria provided
        return { results: [], count: 0, totalResults: 0, pageSize: 25, currentPage: 0, maxPages: 0 };
      }
      
      console.log('Making search request with params:', queryString);
      const localSession = getSessionFromLocalStorage();
      const response = await authenticatedFetchJson(`/api/gunbroker/search?${queryString}`, localSession || session);
      console.log('Search API Response:', {
        totalResults: response.totalResults,
        currentPage: response.currentPage,
        pageSize: response.pageSize,
        maxPages: response.maxPages,
        resultCount: response.results?.length,
        firstResult: response.results?.[0],
      });
      return response;
    },
    enabled: (!!currentValues.searchText || !!currentValues.categoryId) && (!!session || !!getSessionFromLocalStorage()),
  });

  // Add effect to log data changes
  useEffect(() => {
    if (data) {
      console.log('Search Results Updated:', {
        hasResults: !!data.results?.length,
        totalResults: data.totalResults,
        currentPage: data.currentPage,
        resultCount: data.results?.length,
      });
    }
  }, [data]);

  // Handle form submission
  const onSubmit = (values: SearchFormValues) => {
    setPage(1); // Reset to first page on new search
    
    // Update URL with search params
    const params = new URLSearchParams();
    if (values.searchText) params.append('searchText', values.searchText);
    if (values.categoryId) params.append('categoryId', values.categoryId);
    if (values.minPrice) params.append('minPrice', values.minPrice);
    if (values.maxPrice) params.append('maxPrice', values.maxPrice);
    if (values.condition) params.append('condition', values.condition);
    if (values.sortBy) params.append('sortBy', values.sortBy);
    
    router.push(`/dashboard/search?${params.toString()}`);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/dashboard/search?${params.toString()}`);
    setPage(newPage);
  };

  // Calculate total pages
  const totalPages = data?.maxPages || 1;

  return (
    <div className="space-y-6">
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
                            <SelectItem value="EndingSoonest">Ending Soonest</SelectItem>
                            <SelectItem value="PriceHighToLow">Price (High to Low)</SelectItem>
                            <SelectItem value="PriceLowToHigh">Price (Low to High)</SelectItem>
                            <SelectItem value="NewestListed">Newest Listed</SelectItem>
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
                                  <SelectItem value="">All Categories</SelectItem>
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
                                  <SelectItem value="">Any Condition</SelectItem>
                                  <SelectItem value="New">New Only</SelectItem>
                                  <SelectItem value="Used">Used Only</SelectItem>
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Results */}
      <div className="space-y-4">
        {data?.results?.length > 0 && (
          <div className="flex items-center justify-between border-b pb-4">
            <p className="text-sm text-muted-foreground">
              {data.totalResults.toLocaleString()} results found
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">View:</span>
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}
                aria-label="View mode"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}

        {isLoading ? (
          // Loading state
          <div className={viewMode === 'grid' ? 
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : 
            "space-y-4"
          }>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className={viewMode === 'grid' ? "w-full" : "w-full"}>
                <CardContent className="p-0">
                  {viewMode === 'grid' ? (
                    <>
                      <div className="aspect-video w-full">
                        <Skeleton className="h-full w-full" />
                      </div>
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </>
                  ) : (
                    <div className="p-4 flex gap-4">
                      <Skeleton className="h-24 w-24 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          // Error state
          <Card className="p-6">
            <div className="text-center space-y-2">
              <p className="text-red-500 font-medium">
                {error instanceof Error ? error.message : 'An error occurred while searching'}
              </p>
              <Button onClick={() => form.handleSubmit(onSubmit)()}>
                Try Again
              </Button>
            </div>
          </Card>
        ) : data?.results?.length ? (
          // Results found
          <>
            <div className={viewMode === 'grid' ? 
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : 
              "space-y-4"
            }>
              {data.results.map((listing: any) => (
                <div key={listing.itemID}>
                  {viewMode === 'grid' ? (
                    <ListingCard listing={listing} />
                  ) : (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {listing.thumbnailURL && (
                            <div className="flex-shrink-0">
                              <img 
                                src={listing.thumbnailURL} 
                                alt={listing.title}
                                className="w-24 h-24 object-cover rounded-md"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm line-clamp-2">{listing.title}</h3>
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>Price: ${listing.buyPrice || listing.currentPrice}</p>
                              <p>Seller: {listing.seller?.userName}</p>
                              <p>Time Left: {listing.timeLeft}</p>
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="outline">View Details</Button>
                                <Button size="sm">Buy Now</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          // No results
          <Card className="p-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                No items found matching your search criteria
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
} 
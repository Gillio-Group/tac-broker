/**
 * Types for the Gunbroker API responses
 */

// Authentication response from /Users/AccessToken
export interface GunbrokerAuthResponse {
  accessToken: string;
  expirationDate?: string;
  expiresIn?: number;
  userId?: number;
  autoRenewToken?: boolean;
  tokenType?: string;
}

// Account info response from /Users/AccountInfo
export interface GunbrokerAccountInfo {
  userId: number;
  username: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  company: string;
  isFFLUser: boolean;
  isFFLDealer: boolean;
  isCorporateUser: boolean;
  isBidder: boolean;
  isSeller: boolean;
  isPremiumSeller: boolean;
  sellerRating: number;
  feedbackPercent: number;
  memberSince: string;
  preferredContactType: string;
  mailingAddressLine1: string;
  mailingAddressLine2: string;
  mailingCity: string;
  mailingStateCode: string;
  mailingZipCode: string;
  mailingCountry: string;
  phoneNumber: string;
  faxNumber: string;
  ffls: GunbrokerFFL[];
}

// FFL information
export interface GunbrokerFFL {
  fflNumber: string;
  licenseType: string;
  isDefault: boolean;
  businessName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateCode: string;
  zipCode: string;
  phoneNumber: string;
  expirationDate: string;
}

// Listing response structure
export interface GunbrokerListingResponse {
  results: GunbrokerListing[];
  count: number;
  totalResults: number;
  pageSize: number;
  currentPage: number;
  maxPages: number;
}

// Structure of a listing item
export interface GunbrokerListing {
  itemID: number;
  title: string;
  subtitle: string;
  description: string;
  categoryID: number;
  price: number;
  quantity: number;
  autoRelist: boolean;
  buyNowEnabled: boolean;
  buyItNowPrice: number;
  reservePrice: number;
  reserveMet: boolean;
  hasReserve: boolean;
  timeLeft: string;
  startTime: string;
  endTime: string;
  bidCount: number;
  currentBid: number;
  currentBidderUserName: string;
  sellerId: number;
  sellerUserName: string;
  condition: string;
  conditionDescription: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  upc: string;
  location: string;
  isLocalPickupOnly: boolean;
  imageUrl: string;
  imageCount: number;
  hasMultimediaFiles: boolean;
  status: string;
}

// Order response structure
export interface GunbrokerOrderResponse {
  results: GunbrokerOrder[];
  count: number;
  totalResults: number;
  pageSize: number;
  currentPage: number;
  maxPages: number;
}

// Structure of an order
export interface GunbrokerOrder {
  orderID: number;
  orderDate: string;
  buyerUserName: string;
  buyerUserId: number;
  itemID: number;
  itemTitle: string;
  quantity: number;
  orderTotal: number;
  buyerPaid: boolean;
  trackingNumber: string;
  shippingCarrier: string;
  shippingMethod: string;
  shippingPrice: number;
  shippingAddress: {
    fullName: string;
    companyName: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
  };
  status: string;
  notes: string;
  lastUpdated: string;
}

// Search parameters for the /Items endpoint
export interface GunbrokerSearchParams {
  // Basic search parameters
  searchText?: string;
  categoryId?: number;
  manufacturerId?: number;
  sellerName?: string;
  
  // Filtering parameters
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  isNew?: boolean;
  isUsed?: boolean;
  
  // Sorting and pagination
  sortBy?: 'EndingSoonest' | 'PriceHighToLow' | 'PriceLowToHigh' | 'NewestListed';
  sortOrder?: 'Ascending' | 'Descending';
  pageSize?: number;
  pageIndex?: number;
} 
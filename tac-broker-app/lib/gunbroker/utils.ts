/**
 * Make an HTTP request to the Gunbroker API
 * @param baseURL - The base URL for the Gunbroker API
 * @param endpoint - The API endpoint to call (without the base URL)
 * @param devKey - The developer key for the Gunbroker API
 * @param method - The HTTP method to use
 * @param data - Optional data to include in the request body
 * @param headers - Additional headers to include in the request
 * @param accessToken - Optional access token for authenticated requests
 */
export async function makeGunbrokerRequest<T>(
  baseURL: string,
  endpoint: string,
  devKey: string,
  method: string = 'GET',
  data?: any,
  headers: Record<string, string> = {},
  accessToken?: string
): Promise<T> {
  const url = `${baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  console.log(`Making Gunbroker API request to: ${url}`);
  console.log(`Method: ${method}`);
  console.log(`DevKey: ${devKey.substring(0, 3)}...${devKey.substring(devKey.length - 3)}`);
  
  const requestHeaders: HeadersInit = {
    'X-DevKey': devKey,
    ...headers,
  };
  
  // Add access token if available
  if (accessToken) {
    requestHeaders['X-AccessToken'] = accessToken;
  }
  
  const options: RequestInit = {
    method,
    headers: requestHeaders,
  };
  
  if (data) {
    if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      options.body = data;
      console.log(`Request body (form): ${data}`);
    } else {
      options.body = JSON.stringify(data);
      requestHeaders['Content-Type'] = 'application/json';
      console.log(`Request body (json): ${JSON.stringify(data)}`);
    }
  }
  
  try {
    console.log(`Sending request to Gunbroker API...`);
    
    // Log the complete request configuration
    console.log('Request configuration:', {
      url,
      method,
      headers: requestHeaders,
      body: options.body ? options.body.toString().substring(0, 100) + '...' : undefined,
    });
    
    const response = await fetch(url, options);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(`Response headers:`, Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Gunbroker API rate limit exceeded. Please try again later.');
      }
      
      // Check for CORS issues
      if (response.type === 'opaque' || response.type === 'cors') {
        console.log(`Possible CORS issue detected. Response type: ${response.type}`);
      }
      
      // Check for redirects
      if (response.redirected) {
        console.log(`Request was redirected from ${url} to ${response.url}`);
      }
      
      // Handle other errors
      let errorMessage = `Gunbroker API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.log(`Error response body:`, errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.log(`Could not parse error response as JSON, trying to get text...`);
        try {
          const errorText = await response.text();
          console.log(`Error response text:`, errorText);
        } catch (textError) {
          console.log(`Could not get error response text either:`, textError);
        }
      }
      
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    
    const responseData = await response.json() as T;
    console.log(`Response data:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`Error in makeGunbrokerRequest:`, error);
    
    // More detailed network error logging
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('This may be a network connectivity issue, CORS problem, or the API endpoint is unreachable');
    }
    
    throw error;
  }
} 
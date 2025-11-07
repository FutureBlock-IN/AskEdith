import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Check if response is HTML (indicating routing issue)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`${res.status}: API routing error - received HTML instead of JSON`);
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Force API requests to bypass frontend routing
  const apiUrl = url.startsWith('/api/') ? url : `/api${url}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  
  // Try to get the session token from Clerk if available
  if (typeof window !== 'undefined' && (window as any).Clerk) {
    try {
      const sessionToken = await (window as any).Clerk.session?.getToken();
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
    } catch (error) {
      console.debug('Could not get Clerk session token:', error);
    }
  }
  
  const res = await fetch(apiUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Handle array-based query keys for parameterized URLs
    if (queryKey.length > 1) {
      const params = queryKey.slice(1);
      // If it's a posts by author query, construct the proper URL
      if (url === '/api/posts/by-author') {
        url = `${url}/${params[0]}`;
      }
      // If it's user posts query, construct the proper URL
      if (url === '/api/posts/user') {
        url = `/api/posts/by-author/${params[0]}`;
      }
      // If it's an expert profile query, construct the proper URL
      if (url === '/api/experts') {
        if (params.length === 2 && params[1] === 'profile') {
          url = `${url}/${params[0]}/profile`;
        } else {
          url = `${url}/${params[0]}`;
        }
      }
      // If it's a categories by parent query, construct the proper URL
      if (url === '/api/categories/parent') {
        url = `${url}/${params[0]}`;
      }
    }
    
    // Get the session token from Clerk for authenticated requests
    const headers: Record<string, string> = {};
    
    if (typeof window !== 'undefined' && (window as any).Clerk) {
      try {
        const sessionToken = await (window as any).Clerk.session?.getToken();
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
      } catch (error) {
        console.debug('Could not get Clerk session token:', error);
      }
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

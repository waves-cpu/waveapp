

// 1. Definisikan tipe untuk opsi tambahan (misalnya query params)
interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
  timeout?: number; // dalam milidetik
}

// 2. Custom Error Class agar error handling di frontend lebih mudah
export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// 3. Konstanta Base URL (Opsional, tapi disarankan)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''; 

// 4. Fungsi Utama dengan Generics <T>
export const apiFetch = async <T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const { params, timeout = 60000, headers, body, ...restOptions } = options;

  // A. Handling URL & Query Params
  const url = new URL(endpoint, BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      // Perbaikan: jangan tambahkan parameter jika nilainya undefined, null, atau string 'undefined'
      if (value !== undefined && value !== null && value !== 'undefined') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  // B. Handling Timeout dengan AbortController
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  // C. Auto-detect Content-Type & Stringify Body
  const configHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'secret-api-key-for-waveapp', 
    ...headers,
  };

  // Jika body adalah object (dan bukan FormData/Blob), stringify otomatis
  const requestBody = 
    body && typeof body === 'object' && !(body instanceof FormData) 
      ? JSON.stringify(body) 
      : body;

  try {
    const res = await fetch(url.toString(), {
      ...restOptions,
      headers: configHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(id); // Hapus timeout jika request selesai

    // D. Handling 204 No Content
    if (res.status === 204) {
      return null as T;
    }

    // E. Handling Error (Non-2xx)
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(errorData.message || 'Something went wrong', res.status, errorData);
    }

    // F. Return Data
    // Cek apakah response benar-benar JSON sebelum parse
    if (res.headers.get('Content-Type')?.includes('application/json')) {
      return await res.json();
    }

    // Fallback jika bukan JSON (misal text/blob)
    return (await res.text()) as unknown as T;

  } catch (error: any) {
    clearTimeout(id);
    
    // Handle AbortError (Timeout)
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, null);
    }
    
    // Lempar ulang error jika itu sudah instance ApiError, jika tidak buat baru
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(error.message || 'Network error', 500, null);
  }
};

    

export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'secret-api-key-for-waveapp',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message);
    }

    if (res.status === 204) { // No Content
        return null;
    }

    if (res.headers.get('Content-Type')?.includes('application/json')) {
        return res.json();
    }
    
    return res;
};

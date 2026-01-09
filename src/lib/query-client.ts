import { QueryClient } from '@tanstack/react-query';

// Create a single, stable QueryClient instance to be used across the entire application.
// This prevents the cache from being cleared on page navigation.
const queryClient = new QueryClient();

export default queryClient;

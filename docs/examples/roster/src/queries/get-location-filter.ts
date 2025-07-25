import { useQuery } from '@tanstack/react-query';

export interface LocationGroup {
  label: string;
  locationIds: number[];
}

interface LocationsResponse {
  data: LocationGroup[] | null;
  error: any;
}

export const useLocationFilter = () => {
  return useQuery<LocationGroup[], Error>({
    queryKey: ['locations'],
    queryFn: async (): Promise<LocationGroup[]> => {
      const response = await fetch('/api/locations');

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const result: LocationsResponse = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'An error occurred while fetching locations');
      }

      return result.data || [];
    },
  });
};

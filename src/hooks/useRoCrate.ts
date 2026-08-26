import { useQuery } from '@tanstack/react-query';
import { getRoCrate } from '../lib/dataLoader';

export const useRoCrate = (crateKey: string | undefined) =>
  useQuery({
    queryKey: ['rocrate', crateKey],
    queryFn: () => getRoCrate(crateKey as string),
    enabled: !!crateKey,
    staleTime: Infinity,
  });

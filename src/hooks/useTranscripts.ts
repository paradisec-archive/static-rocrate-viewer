import { useQuery } from '@tanstack/react-query';
import { getTranscripts } from '../lib/dataLoader';

export const useTranscripts = () =>
  useQuery({
    queryKey: ['transcripts'],
    queryFn: () => getTranscripts(),
    staleTime: Infinity,
  });

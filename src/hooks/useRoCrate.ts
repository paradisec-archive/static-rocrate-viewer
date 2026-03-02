import { useQuery } from "@tanstack/react-query";
import { getRoCrate } from "../lib/dataLoader";

export const useRoCrate = (collectionId: string, itemId?: string) =>
  useQuery({
    queryKey: ["rocrate", collectionId, itemId],
    queryFn: () => getRoCrate(collectionId, itemId),
    staleTime: Infinity,
  });

import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "../lib/dataLoader";

export const useCatalog = () =>
  useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCatalog(),
    staleTime: Infinity,
  });

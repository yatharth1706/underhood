import { unstable_cache } from "next/cache";
import { scan } from "./scan";

/**
 * One scan per domain per day, shared by the report page, its OG image and the
 * API, so sharing a link doesn't trigger extra requests to the scanned site.
 * Takes an already-normalized domain.
 */
export const cachedScan = unstable_cache((domain: string) => scan(domain), ["scan-v2"] /* bump when the Profile shape changes */, { revalidate: 86400 });

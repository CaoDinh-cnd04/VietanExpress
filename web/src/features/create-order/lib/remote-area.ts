/** 1 hãng tính phụ phí vùng sâu vùng xa (VSVX / ODA) — GET /geo/remote-areas. `tier` = Tier A/B/C của FedEx, null ở hãng khác. */
export interface RemoteAreaHit {
  carrier: string;
  tier?: string | null;
}

/** Danh sách hãng như hệ thống cũ: "Fedex (Tier A), UPS". */
export function remoteAreaCarriers(hits: readonly RemoteAreaHit[]): string {
  return hits.map(h => (h.tier ? `${h.carrier} (${h.tier})` : h.carrier)).join(', ');
}

export interface AmmPoolInfoType {
  baseVault: string;
  quoteVault: string;
  baseMint: string; // WSOL or Token
  quoteMint: string; // WSOL or Token
  baseReserve: number; // tokenAccountBalance of baseVault
  quoteReserve: number; // tokenAccountBalance of quoteVault
}

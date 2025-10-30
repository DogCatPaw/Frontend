import Web3Token from "web3-token";

/**
 * Generate Web3Token for DID authentication
 *
 * Uses web3-token library to create a signed token that's valid for 7 days.
 * The token is used for DIDAuthGuard APIs (Guardian, Pet, Email endpoints).
 *
 * @param signer - WalletClient from wagmi
 * @param address - Wallet address (lowercase)
 * @returns Web3Token string
 *
 * @example
 * ```typescript
 * const { data: walletClient } = useWalletClient();
 * const { address } = useAccount();
 *
 * const token = await generateWeb3Token(walletClient, address.toLowerCase());
 *
 * // Use in API call
 * fetch('/email/send-code', {
 *   headers: {
 *     'Authorization': token,
 *     'walletaddress': address.toLowerCase()
 *   }
 * });
 * ```
 */
export async function generateWeb3Token(
  signer: any, // WalletClient type
  address: string
): Promise<string> {
  // Create Web3Token using web3-token library
  const token = await Web3Token.sign(
    async (msg: string) => await signer.signMessage({ message: msg }),
    {
      domain: "dogcatpaw.com",
      statement: "Sign this message to authenticate with DogCatPaw",
      expires_in: "7d", // Token valid for 7 days
    }
  );

  return token;
}

import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions';
import { Options } from '@layerzerolabs/lz-v2-utilities';

// --- Constants ---
export const DEPLOYMENT_METADATA_URL = 'https://metadata.layerzero-api.com/v1/metadata/deployments';
const LAYERZERO_SCAN_BASE_URL = 'https://layerzeroscan.com';
const TESTNET_LAYERZERO_SCAN_BASE_URL = 'https://testnet.layerzeroscan.com';
const MINIMAL_EVM_OPTIONS_HEX = '0x0003';

// --- Type Definitions ---
interface BlockExplorerMeta {
    url: string;
}

interface DeploymentMetadata {
    blockExplorers?: BlockExplorerMeta[];
}

type AllDeploymentMetadata = Record<string, DeploymentMetadata>;


/**
 * Fetches deployment metadata and constructs a block explorer link for a transaction.
 *
 * @param srcEid The source Endpoint ID (EID) of the chain.
 * @param txHash The transaction hash to link to.
 * @returns The full block explorer URL, or undefined if data cannot be retrieved or network is unknown.
 */
export async function getBlockExplorerLink(srcEid: number, txHash: string): Promise<string | undefined> {
    try {
        const network = endpointIdToNetwork(srcEid);
        
        // Fetch metadata from the LayerZero API
        const res = await fetch(DEPLOYMENT_METADATA_URL);
        
        if (!res.ok) {
            console.error(`Failed to fetch metadata. Status: ${res.status}`);
            return;
        }

        const allMetadata = (await res.json()) as AllDeploymentMetadata;
        
        const meta = allMetadata[network];
        
        // Find the first available block explorer URL
        const explorer = meta?.blockExplorers?.[0]?.url;
        
        if (explorer) {
            // Construct the final URL, ensuring trailing slashes are removed from the base URL
            return `${explorer.replace(/\/+$/, '')}/tx/${txHash}`;
        }
    } catch (error) {
        console.error("Error fetching or parsing deployment metadata:", error);
    }
    return;
}

/**
 * Formats a BigInt value into a human-readable string using underscores as thousands separators.
 * e.g., 1000000n becomes "1_000_000"
 *
 * @param n The bigint value to format.
 * @returns The formatted string.
 */
function formatBigIntForDisplay(n: bigint): string {
    // Uses standard locale formatting and replaces commas with underscores
    return n.toLocaleString().replace(/,/g, '_');
}

/**
 * Decodes the executor options from a LayerZero transaction payload and formats them for display.
 *
 * @param hex The hexadecimal string representing the options.
 * @returns A formatted string detailing the gas and value, or an error message.
 */
export function decodeLzReceiveOptions(hex: string): string {
    try {
        if (!hex || hex === '0x') return 'No options set';
        
        const options = Options.fromOptions(hex);
        
        // Attempt to decode the specific executor LzReceiveOption type
        const lzReceiveOpt = options.decodeExecutorLzReceiveOption();
        
        return lzReceiveOpt
            ? `gas: ${formatBigIntForDisplay(lzReceiveOpt.gas)} , value: ${formatBigIntForDisplay(lzReceiveOpt.value)} wei`
            : 'No executor options';
    } catch (e) {
        // Handle cases where the hex string is malformed or decoding fails
        return `Invalid options (${hex.slice(0, 12)}...)`;
    }
}

/**
 * Constructs the link to the LayerZero Scan explorer for a given transaction hash.
 *
 * @param txHash The transaction hash.
 * @param isTestnet Flag to determine if the testnet explorer should be used.
 * @returns The full LayerZero Scan URL.
 */
export function getLayerZeroScanLink(txHash: string, isTestnet = false): string {
    const baseUrl = isTestnet ? TESTNET_LAYERZERO_SCAN_BASE_URL : LAYERZERO_SCAN_BASE_URL;
    return `${baseUrl}/tx/${txHash}`;
}

/**
 * Checks if the given options hex represents empty or absent options for EVM transactions.
 * It specifically checks for: null/undefined, '0x', and the minimal type-3 header ('0x0003').
 *
 * @param optionsHex The hex string of the options.
 * @returns True if the options are considered empty, false otherwise.
 */
export function isEmptyOptionsEvm(optionsHex?: string): boolean {
    return !optionsHex || optionsHex === '0x' || optionsHex === MINIMAL_EVM_OPTIONS_HEX;
}

// Re-export specific utilities from the io-devtools package for convenience.
export { DebugLogger, KnownErrors, KnownOutputs, KnownWarnings } from '@layerzerolabs/io-devtools';

/**
 * Message Type (MSG_TYPE) constants used in LayerZero messaging.
 */
export const MSG_TYPE = {
    SEND: 1,
    SEND_AND_CALL: 2,
}

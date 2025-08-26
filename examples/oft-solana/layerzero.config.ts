import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

import { getOftStoreAddress } from './tasks/solana'

// Note:  Do not use address for EVM OmniPointHardhat contracts.  Contracts are loaded using hardhat-deploy.
// If you do use an address, ensure artifacts exists.
const sepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyOFT',
}

const solanaContract: OmniPointHardhat = {
    eid: EndpointId.SOLANA_V2_TESTNET,
    address: getOftStoreAddress(EndpointId.SOLANA_V2_TESTNET),
}

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

const SOLANA_CU_LIMIT = 200_000 // This represents the CU limit for executing the `lz_receive` function on Solana.
// const SPL_TOKEN_ACCOUNT_RENT_VALUE = 2039280 // This figure represents lamports (https://solana.com/docs/references/terminology#lamport) on Solana. Read below for more details.

/*
 * Inbound to Solana enforced options:
 * - Use gas equal to the CU limit needed for lz_receive.
 * - Keep value=0 here; supply per-tx msg.value only when the recipient’s ATA
 *   must be created (~2,039,280 lamports for SPL; Token-2022 may require more).
 *   In this repo, per-tx value is set in ./tasks/evm/sendEvm.ts.
 * Details: https://docs.layerzero.network/v2/developers/solana/oft/account#setting-enforced-options-inbound-to-solana
 */

const SOLANA_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: SOLANA_CU_LIMIT,
        // value: SPL_TOKEN_ACCOUNT_RENT_VALUE, // If you enable this, all sends regardless of whether the recipient already has the Associated Token Account will include the rent value, which might be wasteful.
        value: 0, // value will be set where quote/send is called. In this example, it is set in ./tasks/evm/sendEvm.ts
    },
]

// Learn about Message Execution Options: https://docs.layerzero.network/v2/developers/solana/oft/account#message-execution-options
// Learn more about the Simple Config Generator - https://docs.layerzero.network/v2/developers/evm/technical-reference/simple-config
// Learn about DVNs - https://docs.layerzero.network/v2/concepts/modular-security/security-stack-dvns
export default async function () {
    // note: pathways declared here are automatically bidirectional
    // if you declare A,B there's no need to declare B,A
    const connections = await generateConnectionsConfig([
        [
            sepoliaContract, // Chain A contract
            solanaContract, // Chain B contract
            [['LayerZero Labs'], []], // [ requiredDVN[], [ optionalDVN[], threshold ] ]
            [15, 32], // [A to B confirmations, B to A confirmations]
            [SOLANA_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Chain B enforcedOptions, Chain A enforcedOptions
        ],
    ])

    return {
        contracts: [{ contract: sepoliaContract }, { contract: solanaContract }],
        connections,
    }
}

import fs from 'node:fs'
import path from 'node:path'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

// import { getOftStoreAddress } from './tasks/solana'

// Note:  Do not use address for EVM OmniPointHardhat contracts.  Contracts are loaded using hardhat-deploy.
// If you do use an address, ensure artifacts exists.
const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'MyOFT', // Note: change this to your production contract name
}
//
// const solanaContract: OmniPointHardhat = {
//     eid: EndpointId.SOLANA_V2_MAINNET,
//     address: getOftStoreAddress(EndpointId.SOLANA_V2_MAINNET),
// }

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000,
        value: 0,
    },
]

const CU_LIMIT = 200000 // This represents the CU limit for executing the `lz_receive` function on Solana.
const SPL_TOKEN_ACCOUNT_RENT_VALUE = 2039280 // This figure represents lamports (https://solana.com/docs/references/terminology#lamport) on Solana. Read below for more details.
/*
 *  Elaboration on `value` when sending OFTs to Solana:
 *   When sending OFTs to Solana, SOL is needed for rent (https://solana.com/docs/core/accounts#rent) to initialize the recipient's token account.
 *   The `2039280` lamports value is the exact rent value needed for SPL token accounts (0.00203928 SOL).
 *   For Token2022 token accounts, you will need to increase `value` to a higher amount, which depends on the token account size, which in turn depends on the extensions that you enable.
 */

const SOLANA_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: CU_LIMIT,
        value: SPL_TOKEN_ACCOUNT_RENT_VALUE,
    },
]

const SUI_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 5000, // Sufficient for Sui lzReceive execution
        value: 0,
    },
]

type SuiDeployment = {
    oftPackageId: string
}

const loadJson = <T>(relativePath: string): T => {
    const fullPath = path.join(__dirname, relativePath)
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Missing required deployment file: ${relativePath}`)
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T
}

const suiDeployment = loadJson<SuiDeployment>('./sui/deploy.json')

const suiContract: OmniPointHardhat = {
    eid: EndpointId.SUI_V2_MAINNET,
    address: suiDeployment.oftPackageId,
}

// Learn about Message Execution Options: https://docs.layerzero.network/v2/developers/solana/oft/overview#message-execution-options
// Learn more about the Simple Config Generator - https://docs.layerzero.network/v2/developers/evm/technical-reference/simple-config
export default async function () {
    // note: pathways declared here are automatically bidirectional
    // if you declare A,B there's no need to declare B,A
    const pathways = [
        [
            arbitrumContract,
            suiContract,
            [['LayerZero Labs'], []],
            [15, 15],
            [SUI_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
        ],
    ] as const

    const connections = await generateConnectionsConfig(pathways as any)

    return {
        contracts: [{ contract: arbitrumContract }, { contract: suiContract }],
        connections,
    }
}

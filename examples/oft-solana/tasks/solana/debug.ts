import { fetchMint } from '@metaplex-foundation/mpl-toolbox' // Import fetchToken function
import { publicKey, unwrapOption } from '@metaplex-foundation/umi'
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { denormalizePeer } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver, EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { OftPDA, oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { decodeLzReceiveOptions, uint8ArrayToHex } from '../common/utils'

import { deriveConnection, getSolanaDeployment } from './index'

// Logger class for better logging
class Logger {
    static keyValue(key: string, value: any, indentLevel = 0) {
        const indent = ' '.repeat(indentLevel * 2)
        console.log(`${indent}\x1b[33m${key}:\x1b[0m ${value}`)
    }

    static keyHeader(key: string, indentLevel = 0) {
        const indent = ' '.repeat(indentLevel * 2)
        console.log(`${indent}\x1b[33m${key}:\x1b[0m`)
    }

    static header(text: string) {
        console.log(`\x1b[36m${text}\x1b[0m`)
    }

    static separator() {
        console.log('\x1b[90m----------------------------------------\x1b[0m')
    }
}

const DEBUG_ACTIONS = {
    OFT_STORE: 'oft-store',
    GET_ADMIN: 'admin',
    GET_DELEGATE: 'delegate',
    CHECKS: 'checks',
    GET_TOKEN: 'token',
    GET_PEERS: 'peers',
}

/**
 * Get the OFTStore account from the task arguments, the deployment file, or throw an error.
 * @param {EndpointId} eid
 * @param {string} oftStore
 */
const getOftStore = (eid: EndpointId, oftStore?: string) => publicKey(oftStore ?? getSolanaDeployment(eid).oftStore)

type DebugTaskArgs = {
    eid: EndpointId
    oftStore?: string
    endpoint: string
    dstEids: EndpointId[]
    action?: string
}

task('lz:oft:solana:debug', 'Manages OFTStore and OAppRegistry information')
    .addParam(
        'eid',
        'Solana mainnet (30168) or testnet (40168).  Defaults to mainnet.',
        EndpointId.SOLANA_V2_MAINNET,
        types.eid
    )
    .addParam(
        'oftStore',
        'The OFTStore public key. Derived from deployments if not provided.',
        undefined,
        types.string,
        true
    )
    .addParam('endpoint', 'The Endpoint public key', EndpointProgram.PROGRAM_ID.toBase58(), types.string)
    .addOptionalParam('dstEids', 'Destination eids to check (comma-separated list)', [], types.csv)
    .addOptionalParam(
        'action',
        `The action to perform: ${Object.keys(DEBUG_ACTIONS).join(', ')} (defaults to all)`,
        undefined,
        types.string
    )
    .setAction(async (taskArgs: DebugTaskArgs) => {
        const { eid, oftStore, endpoint, dstEids, action } = taskArgs
        const { umi, connection } = await deriveConnection(eid, true)
        const store = getOftStore(eid, oftStore)
        const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, store)
        const mintAccount = await fetchMint(umi, publicKey(oftStoreInfo.tokenMint))

        const epDeriver = new EndpointPDADeriver(new PublicKey(endpoint))
        const [oAppRegistry] = epDeriver.oappRegistry(toWeb3JsPublicKey(store))
        const oAppRegistryInfo = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(
            connection,
            oAppRegistry
        )

        const oftDeriver = new OftPDA(oftStoreInfo.header.owner)

        const printOftStore = async () => {
            Logger.header('OFT Store Information')
            Logger.keyValue('Owner', oftStoreInfo.header.owner)
            Logger.keyValue('OFT Type', oft.types.OFTType[oftStoreInfo.oftType])
            Logger.keyValue('Admin', oftStoreInfo.admin)
            Logger.keyValue('Token Mint', oftStoreInfo.tokenMint)
            Logger.keyValue('Token Escrow', oftStoreInfo.tokenEscrow)
            Logger.keyValue('Endpoint Program', oftStoreInfo.endpointProgram)
            Logger.separator()
        }

        const printAdmin = async () => {
            const admin = oftStoreInfo.admin
            Logger.keyValue('Admin', admin)
        }

        const printDelegate = async () => {
            const delegate = oAppRegistryInfo?.delegate?.toBase58()
            Logger.header('OApp Registry Information')
            Logger.keyValue('Delegate', delegate)
            Logger.separator()
        }

        const printToken = async () => {
            Logger.header('Token Information')
            Logger.keyValue('Mint Authority', unwrapOption(mintAccount.mintAuthority))
            Logger.keyValue(
                'Freeze Authority',
                unwrapOption(mintAccount.freezeAuthority, () => 'None')
            )
            Logger.separator()
        }

        const printChecks = async () => {
            const delegate = oAppRegistryInfo?.delegate?.toBase58()

            Logger.header('Checks')
            Logger.keyValue('Admin (Owner) same as Delegate', oftStoreInfo.admin === delegate)
            Logger.keyValue('Token Mint Authority is OFT Store', unwrapOption(mintAccount.mintAuthority) === store)
            Logger.separator()
        }

        const printPeerConfigs = async () => {
            const peerConfigs = dstEids.map((dstEid) => {
                const peerConfig = oftDeriver.peer(store, dstEid)
                return publicKey(peerConfig)
            })

            Logger.header('Peer Configurations')
            const peerConfigInfos = await oft.accounts.safeFetchAllPeerConfig(umi, peerConfigs)
            dstEids.forEach((dstEid, index) => {
                const info = peerConfigInfos[index]
                const network = getNetworkForChainId(dstEid)
                Logger.header(`${dstEid} (${network.chainName})`)
                if (info) {
                    Logger.keyValue('PeerConfig Account', peerConfigs[index].toString())
                    Logger.keyValue('Peer Address', denormalizePeer(info.peerAddress, dstEid))
                    Logger.keyHeader('Enforced Options')
                    Logger.keyValue('Send', decodeLzReceiveOptions(uint8ArrayToHex(info.enforcedOptions.send, true)), 2)
                    Logger.keyValue(
                        'SendAndCall',
                        decodeLzReceiveOptions(uint8ArrayToHex(info.enforcedOptions.sendAndCall, true)),
                        2
                    )
                } else {
                    console.log(`No PeerConfig account found for ${dstEid} (${network.chainName}).`)
                }
                Logger.separator()
            })
        }

        if (action) {
            switch (action) {
                case DEBUG_ACTIONS.OFT_STORE:
                    await printOftStore()
                    break
                case DEBUG_ACTIONS.GET_ADMIN:
                    await printAdmin()
                    break
                case DEBUG_ACTIONS.GET_DELEGATE:
                    await printDelegate()
                    break
                case DEBUG_ACTIONS.CHECKS:
                    await printChecks()
                    break
                case DEBUG_ACTIONS.GET_TOKEN:
                    await printToken()
                    break
                case DEBUG_ACTIONS.GET_PEERS:
                    await printPeerConfigs()
                    break
                default:
                    console.error(`Invalid action specified. Use any of ${Object.keys(DEBUG_ACTIONS)}.`)
            }
        } else {
            await printOftStore()
            await printDelegate()
            await printToken()
            if (dstEids.length > 0) await printPeerConfigs()
            await printChecks()
        }
    })

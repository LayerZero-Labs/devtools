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

import { DebugLogger, decodeLzReceiveOptions, uint8ArrayToHex } from '../common/utils'

import { deriveConnection, getSolanaDeployment } from './index'

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
            DebugLogger.header('OFT Store Information')
            DebugLogger.keyValue('Owner', oftStoreInfo.header.owner)
            DebugLogger.keyValue('OFT Type', oft.types.OFTType[oftStoreInfo.oftType])
            DebugLogger.keyValue('Admin', oftStoreInfo.admin)
            DebugLogger.keyValue('Token Mint', oftStoreInfo.tokenMint)
            DebugLogger.keyValue('Token Escrow', oftStoreInfo.tokenEscrow)
            DebugLogger.keyValue('Endpoint Program', oftStoreInfo.endpointProgram)
            DebugLogger.separator()
        }

        const printAdmin = async () => {
            const admin = oftStoreInfo.admin
            DebugLogger.keyValue('Admin', admin)
        }

        const printDelegate = async () => {
            const delegate = oAppRegistryInfo?.delegate?.toBase58()
            DebugLogger.header('OApp Registry Information')
            DebugLogger.keyValue('Delegate', delegate)
            DebugLogger.separator()
        }

        const printToken = async () => {
            DebugLogger.header('Token Information')
            DebugLogger.keyValue('Mint Authority', unwrapOption(mintAccount.mintAuthority))
            DebugLogger.keyValue(
                'Freeze Authority',
                unwrapOption(mintAccount.freezeAuthority, () => 'None')
            )
            DebugLogger.separator()
        }

        const printChecks = async () => {
            const delegate = oAppRegistryInfo?.delegate?.toBase58()

            DebugLogger.header('Checks')
            DebugLogger.keyValue('Admin (Owner) same as Delegate', oftStoreInfo.admin === delegate)
            DebugLogger.keyValue('Token Mint Authority is OFT Store', unwrapOption(mintAccount.mintAuthority) === store)
            DebugLogger.separator()
        }

        const printPeerConfigs = async () => {
            const peerConfigs = dstEids.map((dstEid) => {
                const peerConfig = oftDeriver.peer(store, dstEid)
                return publicKey(peerConfig)
            })

            DebugLogger.header('Peer Configurations')
            const peerConfigInfos = await oft.accounts.safeFetchAllPeerConfig(umi, peerConfigs)
            dstEids.forEach((dstEid, index) => {
                const info = peerConfigInfos[index]
                const network = getNetworkForChainId(dstEid)
                DebugLogger.header(`${dstEid} (${network.chainName})`)
                if (info) {
                    DebugLogger.keyValue('PeerConfig Account', peerConfigs[index].toString())
                    DebugLogger.keyValue('Peer Address', denormalizePeer(info.peerAddress, dstEid))
                    DebugLogger.keyHeader('Enforced Options')
                    DebugLogger.keyValue(
                        'Send',
                        decodeLzReceiveOptions(uint8ArrayToHex(info.enforcedOptions.send, true)),
                        2
                    )
                    DebugLogger.keyValue(
                        'SendAndCall',
                        decodeLzReceiveOptions(uint8ArrayToHex(info.enforcedOptions.sendAndCall, true)),
                        2
                    )
                } else {
                    console.log(`No PeerConfig account found for ${dstEid} (${network.chainName}).`)
                }
                DebugLogger.separator()
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

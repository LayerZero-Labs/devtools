import { publicKey } from '@metaplex-foundation/umi'
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair, PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { OmniPoint, denormalizePeer } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver, EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-solana'

import { MyOAppPDA, myoapp } from '../../lib/client'
import { getSolanaReceiveConfig, getSolanaSendConfig } from '../common/taskHelper'
import { DebugLogger, createSolanaConnectionFactory, decodeLzReceiveOptions, uint8ArrayToHex } from '../common/utils'

import { deriveConnection, getSolanaOAppAddress } from './index'

const DEBUG_ACTIONS = {
    STORE: 'store',
    GET_ADMIN: 'admin',
    GET_DELEGATE: 'delegate',
    CHECKS: 'checks',
    GET_PEERS: 'peers',
}

type DebugTaskArgs = {
    eid: EndpointId
    store?: string
    endpoint: string
    dstEids: EndpointId[]
    action?: string
}

const getStore = (eid: EndpointId, store?: string) => publicKey(store ?? getSolanaOAppAddress(eid))

task('lz:oapp:solana:debug', 'Prints OApp Store and Peer information')
    .addParam(
        'eid',
        'Solana mainnet (30168) or testnet (40168).  Defaults to mainnet.',
        EndpointId.SOLANA_V2_MAINNET,
        types.eid
    )
    .addParam('store', 'The Store public key. Derived from deployments if not provided.', undefined, types.string, true)
    .addParam('endpoint', 'The Endpoint public key', EndpointProgram.PROGRAM_ID.toBase58(), types.string)
    .addOptionalParam('dstEids', 'Destination eids to check (comma-separated list)', [], types.csv)
    .addOptionalParam(
        'action',
        `The action to perform: ${Object.keys(DEBUG_ACTIONS).join(', ')} (defaults to all)`,
        undefined,
        types.string
    )
    .setAction(async (taskArgs: DebugTaskArgs) => {
        const { eid, store: storeArg, endpoint, dstEids, action } = taskArgs
        const { umi, connection } = await deriveConnection(eid, true)
        const store = getStore(eid, storeArg)

        let storeInfo
        try {
            storeInfo = await myoapp.accounts.fetchStore(umi, store)
        } catch (e) {
            console.error(`Failed to fetch Store at ${store.toString()}:`, e)
            return
        }

        const epDeriver = new EndpointPDADeriver(new PublicKey(endpoint))
        const [oAppRegistry] = epDeriver.oappRegistry(toWeb3JsPublicKey(store))
        const oAppRegistryInfo = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(
            connection,
            oAppRegistry
        )

        if (!oAppRegistryInfo) {
            console.warn('OAppRegistry info not found.')
            return
        }

        const oappDeriver = new MyOAppPDA(storeInfo.header.owner)

        const printStore = async () => {
            DebugLogger.header('Store Information')
            DebugLogger.keyValue('Owner', storeInfo.header.owner)
            DebugLogger.keyValue('Admin', storeInfo.admin)
            DebugLogger.keyValue('Endpoint Program', storeInfo.endpointProgram)
            DebugLogger.keyValue('String', storeInfo.string)
            DebugLogger.separator()
        }

        const printAdmin = async () => {
            const admin = storeInfo.admin
            DebugLogger.keyValue('Admin', admin)
        }

        const printDelegate = async () => {
            const delegate = oAppRegistryInfo?.delegate?.toBase58()
            DebugLogger.header('OApp Registry Information')
            DebugLogger.keyValue('Delegate', delegate)
            DebugLogger.separator()
        }

        const printChecks = async () => {
            const delegate = oAppRegistryInfo?.delegate?.toBase58()

            DebugLogger.header('Checks')
            DebugLogger.keyValue('Admin (Owner) same as Delegate', storeInfo.admin === delegate)
            DebugLogger.separator()
        }

        const printPeerConfigs = async () => {
            const peerConfigs = dstEids.map((dstEid) => {
                const peerConfig = oappDeriver.peer(dstEid)
                return publicKey(peerConfig)
            })
            const mockKeypair = new Keypair()
            const point: OmniPoint = {
                eid,
                address: store.toString(),
            }
            const endpointV2Sdk = new EndpointV2(
                await createSolanaConnectionFactory()(eid),
                point,
                mockKeypair.publicKey // doesn't matter as we are not sending transactions
            )

            DebugLogger.header('Peer Configurations')

            const peerConfigInfos = await myoapp.accounts.fetchAllPeerConfig(umi, peerConfigs)
            for (let index = 0; index < dstEids.length; index++) {
                const dstEid = dstEids[index]
                const info = peerConfigInfos[index]
                const network = getNetworkForChainId(dstEid)
                const oAppReceiveConfig = await getSolanaReceiveConfig(endpointV2Sdk, dstEid, store)
                const oAppSendConfig = await getSolanaSendConfig(endpointV2Sdk, dstEid, store)

                // Show the chain info
                DebugLogger.header(`${dstEid} (${network.chainName})`)

                if (info) {
                    // Existing PeerConfig info
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

                    printOAppReceiveConfigs(oAppReceiveConfig, network.chainName)
                    printOAppSendConfigs(oAppSendConfig, network.chainName)
                } else {
                    // No PeerConfig account
                    console.log(`No PeerConfig account found for ${dstEid} (${network.chainName}).`)
                }

                DebugLogger.separator()
            }
        }
        if (action) {
            switch (action) {
                case DEBUG_ACTIONS.STORE:
                    await printStore()
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
                case DEBUG_ACTIONS.GET_PEERS:
                    await printPeerConfigs()
                    break
                default:
                    console.error(`Invalid action specified. Use any of ${Object.keys(DEBUG_ACTIONS)}.`)
            }
        } else {
            await printStore()
            await printDelegate()
            if (dstEids.length > 0) await printPeerConfigs()
            await printChecks()
        }
    })

function printOAppReceiveConfigs(
    oAppReceiveConfig: Awaited<ReturnType<typeof getSolanaReceiveConfig>>,
    peerChainName: string
) {
    const oAppReceiveConfigIndexesToKeys: Record<number, string> = {
        0: 'receiveLibrary',
        1: 'receiveUlnConfig',
        2: 'receiveLibraryTimeoutConfig',
    }

    if (!oAppReceiveConfig) {
        console.log('No receive configs found.')
        return
    }

    DebugLogger.keyValue(`Receive Configs (${peerChainName} to solana)`, '')
    for (let i = 0; i < oAppReceiveConfig.length; i++) {
        const item = oAppReceiveConfig[i]
        if (typeof item === 'object' && item !== null) {
            // Print each property in the object
            DebugLogger.keyValue(`${oAppReceiveConfigIndexesToKeys[i]}`, '', 2)
            for (const [propKey, propVal] of Object.entries(item)) {
                DebugLogger.keyValue(`${propKey}`, String(propVal), 3)
            }
        } else {
            // Print a primitive (string, number, etc.)
            DebugLogger.keyValue(`${oAppReceiveConfigIndexesToKeys[i]}`, String(item), 2)
        }
    }
}

function printOAppSendConfigs(oAppSendConfig: Awaited<ReturnType<typeof getSolanaSendConfig>>, peerChainName: string) {
    const sendOappConfigIndexesToKeys: Record<number, string> = {
        0: 'sendLibrary',
        1: 'sendUlnConfig',
        2: 'sendExecutorConfig',
    }

    if (!oAppSendConfig) {
        console.log('No send configs found.')
        return
    }

    DebugLogger.keyValue(`Send Configs (solana to ${peerChainName})`, '')
    for (let i = 0; i < oAppSendConfig.length; i++) {
        const item = oAppSendConfig[i]
        if (typeof item === 'object' && item !== null) {
            DebugLogger.keyValue(`${sendOappConfigIndexesToKeys[i]}`, '', 2)
            for (const [propKey, propVal] of Object.entries(item)) {
                DebugLogger.keyValue(`${propKey}`, String(propVal), 3)
            }
        } else {
            DebugLogger.keyValue(`${sendOappConfigIndexesToKeys[i]}`, String(item), 2)
        }
    }
}

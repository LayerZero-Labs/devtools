import { fetchMint } from '@metaplex-foundation/mpl-toolbox'
import { PublicKey as UmiPublicKey, publicKey, unwrapOption } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair, PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { OmniPoint, denormalizePeer } from '@layerzerolabs/devtools'
import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver, EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { EndpointProgram as EndpointProgramUmi } from '@layerzerolabs/lz-solana-sdk-v2/umi'
import { OftPDA, oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { EndpointV2 } from '@layerzerolabs/protocol-devtools-solana'

import { getSolanaReceiveConfig, getSolanaSendConfig } from '../common/taskHelper'
import { DebugLogger, createSolanaConnectionFactory, decodeLzReceiveOptions, uint8ArrayToHex } from '../common/utils'

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
        const { eid, oftStore: oftStoreArg, endpoint, dstEids, action } = taskArgs
        const { umi, connection } = await deriveConnection(eid, true)
        const oftStore = getOftStore(eid, oftStoreArg)

        let oftStoreInfo
        try {
            oftStoreInfo = await oft.accounts.fetchOFTStore(umi, oftStore)
        } catch (e) {
            console.error(`Failed to fetch OFTStore at ${oftStore.toString()}:`, e)
            return
        }
        const nonceAccountChecksInfo: Partial<
            Record<EndpointId, { data: EndpointProgramUmi.accounts.NonceAccountData; address: UmiPublicKey }>
        > = {}

        const mintAccount = await fetchMint(umi, publicKey(oftStoreInfo.tokenMint))

        const epDeriver = new EndpointPDADeriver(new PublicKey(endpoint))
        const [oAppRegistry] = epDeriver.oappRegistry(toWeb3JsPublicKey(oftStore))
        const oAppRegistryInfo = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(
            connection,
            oAppRegistry
        )

        if (!oAppRegistryInfo) {
            console.warn('OAppRegistry info not found.')
            return
        }

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
            DebugLogger.keyValue(
                'Token Mint Authority is OFT Store',
                unwrapOption(mintAccount.mintAuthority) === oftStore
            )
            dstEids.map((dstEid) => {
                DebugLogger.keyHeader(`Nonce Account Checks`)
                const nonceAccountCheckInfo = nonceAccountChecksInfo[dstEid]
                if (nonceAccountCheckInfo) {
                    const definedForDstEid = !!nonceAccountCheckInfo.data
                    DebugLogger.keyValue(
                        `Defined for ${dstEid} (${getNetworkForChainId(dstEid).chainName})`,
                        definedForDstEid,
                        2
                    )
                    if (!definedForDstEid) {
                        console.warn(
                            `Expected Nonce Account to exist at ${nonceAccountCheckInfo.address.toString()} for destination ${dstEid} (${getNetworkForChainId(dstEid).chainName}).`
                        )
                    }
                }
            })
            DebugLogger.separator()
        }

        const printPeerConfigs = async () => {
            const peerConfigs = dstEids.map((dstEid) => {
                const peerConfig = oftDeriver.peer(oftStore, dstEid)
                return publicKey(peerConfig)
            })
            const mockKeypair = new Keypair()
            const point: OmniPoint = {
                eid,
                address: oftStore.toString(),
            }
            const endpointV2Sdk = new EndpointV2(
                await createSolanaConnectionFactory()(eid),
                point,
                mockKeypair.publicKey // doesn't matter as we are not sending transactions
            )

            DebugLogger.header('Peer Configurations')

            const peerConfigInfos = await oft.accounts.safeFetchAllPeerConfig(umi, peerConfigs)
            for (let index = 0; index < dstEids.length; index++) {
                const dstEid = dstEids[index]
                const info = peerConfigInfos[index]
                const network = getNetworkForChainId(dstEid)
                const oAppReceiveConfig = await getSolanaReceiveConfig(endpointV2Sdk, dstEid, oftStore)
                const oAppSendConfig = await getSolanaSendConfig(endpointV2Sdk, dstEid, oftStore)
                // Show the chain info
                DebugLogger.header(`${dstEid} (${network.chainName})`)

                if (info) {
                    // nonce account
                    const nonceAccount = epDeriver.nonce(toWeb3JsPublicKey(oftStore), dstEid, info.peerAddress)[0]
                    const nonceAccountInfo = await EndpointProgramUmi.accounts.fetchNonce(
                        umi,
                        fromWeb3JsPublicKey(nonceAccount)
                    )
                    nonceAccountChecksInfo[dstEid] = {
                        data: nonceAccountInfo,
                        address: fromWeb3JsPublicKey(nonceAccount),
                    }
                    // Existing PeerConfig info
                    DebugLogger.keyValue('PeerConfig Account', peerConfigs[index].toString())
                    DebugLogger.keyValue('Peer Address', denormalizePeer(info.peerAddress, dstEid))
                    DebugLogger.keyValue('Nonce Account', nonceAccount.toString())
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
            const tasks = [printOftStore(), printDelegate(), printToken()]
            if (dstEids.length > 0) tasks.push(printPeerConfigs())
            await Promise.all(tasks)
            // printChecks might depend on other tasks, so we don't add it to the tasks array
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

import { HardhatContext } from 'hardhat/internal/context'
import { TasksDSL } from 'hardhat/internal/core/tasks/dsl'
import { loadConfigAndTasks } from 'hardhat/internal/core/config/config-loading'

// Initialize global task variable that plugins expect
;(global as any).task = new TasksDSL()

// Create Hardhat context
HardhatContext.createHardhatContext()

// Load config and tasks
loadConfigAndTasks()

// Now import everything else
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { getConfigConnections } from '../tasks/utils/utils'
import { setPeers } from '../tasks/utils/aptosOftConfigOps'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import '../hardhat.config'

const account_address = '0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a'
const OFT_ADDRESS = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
const private_key = '0xc4a953452fb957eddc47e309b5679c020e09c4d3c872bda43569cbff6671dca6'

// Initialize Hardhat context

describe('config-ops-tests', () => {
    let aptos: Aptos
    let oft: OFT
    let connections: OAppOmniGraphHardhat['connections']

    beforeEach(async () => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
            faucet: 'http://127.0.0.1:8081',
        })
        aptos = new Aptos(config)
        oft = new OFT(aptos, OFT_ADDRESS, account_address, private_key)
        connections = getConfigConnections('from', EndpointId.APTOS_V2_SANDBOX)
    })

    describe('setPeers', () => {
        it.only('should set peers', async () => {
            // Temporarily redirect console.log to bypass Jest's console handling
            const originalLog = console.log
            console.log = (...args) => {
                process.stdout.write(args.join(' ') + '\n')
            }

            const txs = await setPeers(oft, connections)

            // Restore original console.log
            console.log = originalLog

            expect(txs.length).toBe(connections.length)
        })
    })
})

import { spawn } from 'child_process'
import type { AnvilNode, eid } from './types'

/**
 * @description Class to manage Anvil fork nodes
 * @param forkUrls - Array of URLs to fork from
 * @param eids - Array of EIDs to associate with the fork URLs
 * @param startingPort - Starting port number for the Anvil fork nodes (default: 8545)
 * @dev Used to create anvil forks to run simulations on before sending them on-chain
 * @returns AnvilForkNode instance
 */
class AnvilForkNode {
    public nodes: AnvilNode[] = []
    // Maps EIDs to RPC URLs
    public forkUrlsMap: Record<eid, string> = {}

    constructor(
        private eidRpcMap: Record<string, string>,
        private startingPort: number = 8545
    ) {}

    // Start the Anvil fork nodes at incremental ports
    public async startNodes(): Promise<Record<string, string>> {
        for (const [eid, rpcUrl] of Object.entries(this.eidRpcMap)) {
            console.log(`Starting Anvil node on port ${this.startingPort} using fork URL ${rpcUrl}...`)
            const node = await this.startAnvilForkNode(rpcUrl, this.startingPort.toString())
            this.nodes.push(node)
            this.forkUrlsMap[eid] = node.rpcUrl
            this.startingPort++
        }

        return this.forkUrlsMap
    }

    // Method to start an individual Anvil fork node
    private startAnvilForkNode(forkUrl: string, port: string): Promise<AnvilNode> {
        return new Promise((resolve) => {
            const anvilNode = spawn('anvil', ['--fork-url', forkUrl, '--port', port], {
                stdio: 'ignore', // Silence output so you don't see the logs
            })

            // Wait for the node to start
            setTimeout(() => {
                resolve({
                    process: anvilNode,
                    rpcUrl: `http://127.0.0.1:${port}`,
                })
            }, 1000)
        })
    }

    // Method to stop all running Anvil fork nodes
    public killNodes(): void {
        for (const node of this.nodes) {
            console.log(`Stopping Anvil node at ${node.rpcUrl}`)
            node.process.kill()
        }
        this.nodes = []
    }

    // Method to get the RPC URLs of the running Anvil fork nodes
    public getRpcMap(): Record<string, string> {
        return this.forkUrlsMap
    }
}

export default AnvilForkNode

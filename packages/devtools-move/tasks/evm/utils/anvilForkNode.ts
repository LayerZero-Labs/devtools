import { spawn } from 'child_process'
import net from 'net'

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
        private startingPort = 8545
    ) {}

    // Start the Anvil fork nodes at incremental ports
    public async startNodes(): Promise<Record<string, string>> {
        const numPorts = Object.keys(this.eidRpcMap).length
        await this.checkFreePorts(this.startingPort, numPorts)

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
        return new Promise((resolve, reject) => {
            const anvilNode = spawn('anvil', ['--fork-url', forkUrl, '--port', port], {
                stdio: ['ignore', 'ignore', 'pipe'], // Capture only stderr for errors
            })

            // Handle all potential errors
            anvilNode.on('error', (err) => {
                reject(new Error(`Failed to start Anvil: ${err.message}`))
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

    private async checkFreePort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer()

            server.once('error', () => {
                resolve(false)
            })

            server.once('listening', () => {
                server.close()
                server.once('close', () => {
                    resolve(true)
                })
            })

            server.listen(port, '127.0.0.1')
        })
    }

    private async checkFreePorts(startingPort: number, numPorts: number): Promise<boolean> {
        for (let i = 0; i < numPorts; i++) {
            const port = startingPort + i
            const isFree = await this.checkFreePort(port)
            if (!isFree) {
                throw new Error(`Port ${port} is not free - please kill running process or change the starting port`)
            }
        }
        return true
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

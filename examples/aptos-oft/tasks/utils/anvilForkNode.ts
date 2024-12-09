import { spawn } from 'child_process'
import type { AnvilNode } from './types'
class AnvilForkNode {
    public nodes: AnvilNode[] = []
    public rpcUrlsMap: Record<string, string> = {}

    // Constructor to initialize and start Anvil fork nodes
    constructor(
        private forkUrls: string[],
        private eids: string[],
        private startingPort: number = 8545
    ) {}

    // Method to start the Anvil fork nodes
    public async startNodes(): Promise<Record<string, string>> {
        for (let i = 0; i < this.forkUrls.length; i++) {
            const port = this.startingPort + i
            console.log(`Starting Anvil node on port ${port} using fork URL ${this.forkUrls[i]}...`)
            const node = await this.startAnvilForkNode(this.forkUrls[i], port.toString())
            this.nodes.push(node)
            this.rpcUrlsMap[this.eids[i]] = node.rpcUrl
        }
        return this.rpcUrlsMap
    }

    // Method to start an individual Anvil fork node
    private startAnvilForkNode(forkUrl: string, port: string): Promise<AnvilNode> {
        return new Promise((resolve) => {
            const anvilNode = spawn('anvil', ['--fork-url', forkUrl, '--port', port], {
                stdio: 'ignore', // Silence output
            })

            // Wait for the node to start
            setTimeout(() => {
                resolve({
                    process: anvilNode,
                    rpcUrl: `http://127.0.0.1:${port}`,
                })
            }, 1000) // Adjust the delay as needed
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
        return this.rpcUrlsMap
    }
}

export default AnvilForkNode

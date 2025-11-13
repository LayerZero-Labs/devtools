// Network configurations for contract verification
// Each network can have: chainId, apiUrl, aliases

export const ETHERSCAN_V2_URL = 'https://api.etherscan.io/v2/api'

interface NetworkDefinition {
    chainId: number
    apiUrl?: string
    aliases?: string[]
}

export const networks: Record<string, NetworkDefinition> = {
    // Ethereum
    ethereum: {
        chainId: 1,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['ethereum-mainnet'],
    },

    goerli: {
        // DEPRECATED
        chainId: 5,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['ethereum-goerli'],
    },

    sepolia: {
        chainId: 11155111,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['sepolia-testnet', 'eth-sepolia', 'ethereum-sepolia'],
    },

    holesky: {
        chainId: 17000,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['holesky-testnet', 'ethereum-holesky'],
    },

    hoodi: {
        chainId: 560048,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['hoodi-testnet', 'ethereum-hoodi'],
    },

    // Polygon
    polygon: {
        chainId: 137,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['polygon-mainnet'],
    },

    amoy: {
        chainId: 80002,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['polygon-amoy', 'polygon-sepolia', 'polygon-testnet'],
    },

    zkpolygon: {
        chainId: 1101,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['zkpolygon-mainnet'],
    },

    // Arbitrum
    arbitrum: {
        chainId: 42161,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['arbitrum-mainnet'],
    },

    'arbitrum-nova': {
        chainId: 42170,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['arbitrum-nova-mainnet'],
    },

    'arbitrum-goerli': {
        // DEPRECATED
        chainId: 421613,
        apiUrl: ETHERSCAN_V2_URL,
    },

    arbsep: {
        chainId: 421614,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['arbsep-testnet', 'arbitrum-sepolia', 'arbitrum-testnet'],
    },

    // Optimism
    optimism: {
        chainId: 10,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['optimism-mainnet'],
    },

    'optimism-goerli': {
        // DEPRECATED
        chainId: 420,
        apiUrl: ETHERSCAN_V2_URL,
    },

    optsep: {
        chainId: 11155420,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['optsep-testnet', 'optimism-sepolia', 'optimism-testnet'],
    },

    // Base
    base: {
        chainId: 8453,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['base-mainnet'],
    },

    'base-sepolia': {
        chainId: 84532,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['base-testnet'],
    },

    'base-goerli': {
        // DEPRECATED
        chainId: 84531,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Avalanche
    avalanche: {
        chainId: 43114,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['avalanche-mainnet'],
    },

    fuji: {
        chainId: 43113,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['avalanche-testnet', 'avalanche-fuji'],
    },

    // BSC
    bsc: {
        chainId: 56,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['bsc-mainnet'],
    },

    'bsc-testnet': {
        chainId: 97,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Fantom
    fantom: {
        chainId: 250,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['fantom-mainnet'],
    },

    'fantom-testnet': {
        chainId: 4002,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Gnosis
    gnosis: {
        chainId: 100,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['gnosis-mainnet'],
    },

    // Blast
    blast: {
        chainId: 81457,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['blast-mainnet'],
    },

    'blast-sepolia': {
        chainId: 168587773,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['blast-sepolia-testnet', 'blast-testnet'],
    },

    // Linea / zkConsensys
    linea: {
        chainId: 59144,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['linea-mainnet', 'zkconsensys', 'zkconsensys-mainnet'],
    },

    'linea-sepolia': {
        chainId: 59141,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['linea-sepolia-testnet', 'linea-testnet'],
    },

    // Scroll
    scroll: {
        chainId: 534352,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['scroll-mainnet'],
    },

    'scroll-sepolia': {
        chainId: 534351,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['scroll-sepolia-testnet', 'scroll-testnet'],
    },

    // Moonbeam
    moonbeam: {
        chainId: 1284,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['moonbeam-mainnet'],
    },

    'moonbeam-testnet': {
        chainId: 1287,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Moonriver
    moonriver: {
        chainId: 1285,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['moonriver-mainnet'],
    },

    // Fraxtal
    fraxtal: {
        chainId: 252,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['fraxtal-mainnet'],
    },

    'fraxtal-hoodi': {
        chainId: 2523,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['fraxtal-hoodi-testnet', 'fraxtal-testnet'],
    },

    // Taiko
    taiko: {
        chainId: 167000,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['taiko-mainnet'],
    },

    'taiko-hoodi': {
        chainId: 167013,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['taiko-hoodi-testnet', 'taiko-testnet'],
    },

    // Abstract
    abstract: {
        chainId: 2741,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['abstract-mainnet'],
    },

    'abstract-sepolia': {
        chainId: 11124,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['abstract-sepolia-testnet', 'abstract-testnet'],
    },

    // ApeChain
    apechain: {
        chainId: 33139,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['apechain-mainnet'],
    },

    'apechain-curtis': {
        chainId: 33111,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['apechain-curtis-testnet', 'apechain-testnet'],
    },

    // Berachain
    berachain: {
        chainId: 80094,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['berachain-mainnet'],
    },

    'berachain-bepolia': {
        chainId: 80069,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['berachain-bepolia-testnet', 'berachain-testnet'],
    },

    // BitTorrent
    bittorrent: {
        chainId: 199,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['bittorrent-mainnet'],
    },

    'bittorrent-testnet': {
        chainId: 1029,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Celo
    celo: {
        chainId: 42220,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['celo-mainnet'],
    },

    'celo-sepolia': {
        chainId: 11142220,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['celo-sepolia-testnet', 'celo-testnet'],
    },

    // HyperEVM
    hyperevm: {
        chainId: 999,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['hyperevm-mainnet'],
    },

    // Katana
    katana: {
        chainId: 747474,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['katana-mainnet'],
    },

    'katana-bokuto': {
        chainId: 737373,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['katana-bokuto-testnet', 'katana-testnet'],
    },

    // Mantle
    mantle: {
        chainId: 5000,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['mantle-mainnet'],
    },

    'mantle-sepolia': {
        chainId: 5003,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['mantle-sepolia-testnet', 'mantle-testnet'],
    },

    // Memecore
    memecore: {
        chainId: 43521,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['memecore-testnet'],
    },

    // Monad
    monad: {
        chainId: 10143,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['monad-testnet'],
    },

    // opBNB
    opbnb: {
        chainId: 204,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['opbnb-mainnet'],
    },

    'opbnb-testnet': {
        chainId: 5611,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Sei
    sei: {
        chainId: 1329,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['sei-mainnet'],
    },

    'sei-testnet': {
        chainId: 1328,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Sonic
    sonic: {
        chainId: 146,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['sonic-mainnet'],
    },

    'sonic-testnet': {
        chainId: 14601,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Sophon (DEPRECATED - will be deprecated on November 22, 2025)
    sophon: {
        chainId: 50104,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['sophon-mainnet'],
    },

    'sophon-sepolia': {
        chainId: 531050104,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['sophon-sepolia-testnet', 'sophon-testnet'],
    },

    // Swellchain
    swellchain: {
        chainId: 1923,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['swellchain-mainnet'],
    },

    'swellchain-testnet': {
        chainId: 1924,
        apiUrl: ETHERSCAN_V2_URL,
    },

    // Unichain
    unichain: {
        chainId: 130,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['unichain-mainnet'],
    },

    'unichain-sepolia': {
        chainId: 1301,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['unichain-sepolia-testnet', 'unichain-testnet'],
    },

    // World
    world: {
        chainId: 480,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['world-mainnet'],
    },

    'world-sepolia': {
        chainId: 4801,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['world-sepolia-testnet', 'world-testnet'],
    },

    // XDC
    xdc: {
        chainId: 50,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['xdc-mainnet'],
    },

    'xdc-apothem': {
        chainId: 51,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['xdc-apothem-testnet', 'xdc-testnet'],
    },

    // zkSync
    zksync: {
        chainId: 324,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['zksync-mainnet'],
    },

    'zksync-sepolia': {
        chainId: 300,
        apiUrl: ETHERSCAN_V2_URL,
        aliases: ['zksync-sepolia-testnet', 'zksync-testnet'],
    },

    // Non-Etherscan Networks (custom explorers)

    // Astar
    astar: {
        chainId: 592,
        apiUrl: 'https://astar.blockscout.com/api',
        aliases: ['astar-mainnet'],
    },

    zkatana: {
        chainId: 1261120,
        apiUrl: 'https://astar-zkevm.explorer.startale.com/api',
        aliases: ['zkatana-mainnet'],
    },

    // Aurora
    aurora: {
        chainId: 1313161554,
        apiUrl: 'https://explorer.mainnet.aurora.dev/api',
        aliases: ['aurora-mainnet'],
    },

    // EBI
    ebi: {
        chainId: 2910,
        apiUrl: 'https://explorer.ebi.xyz/api',
        aliases: ['ebi-mainnet'],
    },

    // Etherlink
    etherlink: {
        chainId: 42793,
        apiUrl: 'https://explorer.etherlink.com/api',
        aliases: ['etherlink-mainnet'],
    },

    // Flare
    flare: {
        chainId: 14,
        apiUrl: 'https://api.routescan.io/v2/network/mainnet/evm/14/etherscan',
        aliases: ['flare-mainnet'],
    },

    // Gravity
    gravity: {
        chainId: 1625,
        apiUrl: 'https://explorer.gravity.xyz/api',
        aliases: ['gravity-mainnet'],
    },

    // IOTA
    iota: {
        chainId: 8822,
        apiUrl: 'https://explorer.evm.iota.org/api',
        aliases: ['iota-mainnet'],
    },

    // Kava
    kava: {
        chainId: 2222,
        apiUrl: 'https://kavascan.com/api',
        aliases: ['kava-mainnet'],
    },

    'kava-testnet': {
        chainId: 2221,
        apiUrl: 'https://testnet.kavascan.com/api',
    },

    // Klaytn
    klaytn: {
        chainId: 8217,
        apiUrl: 'https://api-cypress.klaytnscope.com/api',
        aliases: ['klaytn-mainnet'],
    },

    'klaytn-testnet': {
        chainId: 1001,
        apiUrl: 'https://api-baobab.klaytnscope.com/api',
    },

    // Manta
    manta: {
        chainId: 169,
        apiUrl: 'https://pacific-explorer.manta.network/api',
        aliases: ['manta-mainnet'],
    },

    // Metis
    metis: {
        chainId: 1088,
        apiUrl: 'https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan',
        aliases: ['metis-mainnet'],
    },

    // Mode
    mode: {
        chainId: 34443,
        apiUrl: 'https://explorer.mode.network/api',
        aliases: ['mode-mainnet'],
    },

    // Rarible
    rarible: {
        chainId: 1380012617,
        apiUrl: 'https://mainnet.explorer.rarichain.org/api',
        aliases: ['rarible-mainnet'],
    },

    // X Chain
    xchain: {
        chainId: 7762959,
        apiUrl: 'https://xchain-explorer.idex.io/api',
        aliases: ['xchain-mainnet'],
    },

    // X Layer
    xlayer: {
        chainId: 196,
        apiUrl: 'https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER',
        aliases: ['xlayer-mainnet'],
    },
}

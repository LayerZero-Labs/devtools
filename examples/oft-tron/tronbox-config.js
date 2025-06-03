require('dotenv').config();

module.exports = {
    networks: {
        mainnet: {
            // Don't put your private key here:
            privateKey: process.env.TRON_PRIVATE_KEY,
            /**
             * Create a .env file (it must be gitignored) containing something like
             *
             *   export TRON_PRIVATE_KEY=4E7FEC...656243
             *
             * Then, run the migration with:
             *
             *   source .env && tronbox migrate --network mainnet
             */
            userFeePercentage: 100,
            feeLimit: 1000000000,
            fullHost: 'https://api.trongrid.io',
            network_id: '1',
        },
        shasta: {
            // Obtain test coin at https://shasta.tronex.io/
            privateKey: process.env.TRON_PRIVATE_KEY,
            userFeePercentage: 100,
            feeLimit: 10000000000, // 10 TRX fee limit
            fullHost: 'https://api.shasta.trongrid.io',
            network_id: '2',
            // Resource settings for contract deployment
            bandwidth: true,
            energy: true,
            frozenBalance: 5000000, // 5 TRX frozen for resources
        },
        nile: {
            // Obtain test coin at https://nileex.io/join/getJoinPage
            privateKey: process.env.TRON_PRIVATE_KEY,
            userFeePercentage: 100,
            feeLimit: 1000000000,
            fullHost: 'https://api.nile.trongrid.io',
            network_id: '3',
        },
        development: {
            // For tronbox/tre docker image
            // See https://hub.docker.com/r/tronbox/tre
            privateKey: process.env.TRON_PRIVATE_KEY,
            userFeePercentage: 0,
            feeLimit: 1000 * 1e6,
            fullHost: 'http://127.0.0.1:9090',
            network_id: '9',
        },
    },
    compilers: {
        solc: {
            version: '0.8.22',
            // An object with the same schema as the settings entry in the Input JSON.
            // See https://docs.soliditylang.org/en/latest/using-the-compiler.html#input-description
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
                // evmVersion: 'istanbul',
                // viaIR: true,
            },
        },
    },
};

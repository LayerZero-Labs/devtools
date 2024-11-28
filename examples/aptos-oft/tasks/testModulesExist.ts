import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
// import { Network } from '@layerzerolabs/lz-definitions'

const addresses = [
    { ENDPOINT_V2_ADDRESS: '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c' },
    { SIMPLE_MESSAGE_LIB_ADDRESS: '0xbb29964fac328dc2cd1dbf03982e51fad9de67e2a525c35d6e52cde4b66e7997' },
    { ULN_MESSAGE_LIB_ADDRESS: '0x3f2714ef2d63f1128f45e4a3d31b354c1c940ccdb38aca697c9797ef95e7a09f' },
    { COUNTER_V2_ADDRESS: '0xbf1258595a80969371696c798d481a47dd0a1e8fe087c1c8e2a94e17801bec6e' },
    { OFT_ADDRESS: '0x40cf3d168e49851d6423b919338aba1c42f018a9996395e777548a7e9ce956c9' },
    { LAYERZERO_VIEWS_ADDRESS: '0x9f03c64333c99c9d319ffc034c13618d309a8fa6f18636261d7e5d3e21e2d8d8' },
    { EXECUTOR_ADDRESS: '0x806020afea680a0c0f32431acdfcf1a7e31ace28ce81b73da4f27c5898155590' },
    { DVN_ADDRESS: '0x1f79b324153abe0ca18a279822f3b561acbaabb4d68d47ed3639b5a53e4d3470' },
    { WORKER_COMMON: '0x9d8a2cc4cd5563028107b792fd3c7f4068064405ef1bc4fce1cbc3af916032e8' },
    { PRICE_FEED: '0x894473c4f48d05a65d5bfb106ab91bc0881c7a1c7e9c66fbea2859c2ba9bff83' },
    { TREASURY_ADDRESS: '0xd83cb5c494daec692964a3599c3b36d4bd618dc54e7bcb2bbe444a7f9732f740' },
    { ENDPOINT_V2_COMMON: '0xf8ce9f0030cb1fa5fb48f481d9b2da3909cd922992e7085e76a196653a707bbf' },
    { DEPLOY_TO_OBJECT: '0x68b674103753edaa1c3a38ef06ba92e038ff5b0fd76e066a57ad7fecd19815a6' },
]

// const addresses = [
// { oft_admin: '3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a' },
// { oft_common: '0xa7694230545c94892d49b5e374688b01445acf03ac4d83937406df5be85a0845' },
// { router_node_0: '0x787b0dcb8f3c391bff699144ca1c7cb67f15e10a01aa2853f7d33b849db5a6d2' },
// { simple_msglib: '0xc726431adfe8c4a28ccd0f2b3810487a7b4438092244f0d894d3600087c5e66d' },
// { blocked_msglib: '0x6b4c17dda186261c403d3e81bcc87e1a2fbb0a8a2bfb07f8cdf4b17ccddc45ad' },
// { uln_302: '0xb785f6093141e4729eb46dd7398dd7259cd5ce74e312b29ed12380bba1606808' },
// { router_node_1: '0x93a32b750b7be7371e5bd60954085186d84b4d42362f281d7d1c64f900cebb67' },
// { endpoint_v2: '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c' },
// { endpoint_v2_common: '0x84937e3698c2ba30eb1a7dcdc4fbe912c9f2f2675cd0d5bc7a83e5d732d665b7' },
// { layerzero_admin: '0x75de231a1ea32a14ed5be6a52475b16d7d8eeac35d378afd4c361979c0ae1531' },
// { layerzero_treasury_admin: '0xd9fbd5191a9864742464950e4e850786b60d26b1349dcc2227de294c7b2b32c5' },
// { msglib_types: '0xdf2ce67a6a2f7eab2c1c7baea4e21305d847c0505c6951d183014ed3712d7ea8' },
// { treasury: '0x3130ea2bf26ed0da8d44f8154a43383e630f202fcc474e1154cf4fd9828caada' },
// { worker_peripherals: '0x75de231a1ea32a14ed5be6a52475b16d7d8eeac35d378afd4c361979c0ae1531' },
// { price_feed_router_0: '0xf7edbffaf15451e62065ce7b6c70c6fb0270710d3e1a6ed8f3d188ba83eaadd3' },
// { price_feed_router_1: '0x43102eeef302c29c0c4ba07f5555d4b1589b07888b5e9ca385efc9af44e199d6' },
// { price_feed_module_0: '0x420a695c2ad3a128d1fded450346326ec2e342f5cf9f205b53e8456f60e795d6' },
// { worker_common: '0x0100ee640b091eae215a628c37c45d3ec6f165e373e8a6b0d6e4ce8f6eed73d5' },
// { executor_fee_lib_router_0: '0xaf755792d8f4c3ccc0f7a8eb358ed9ec2a707b3374daebfecc257654d536a4e3' },
// { executor_fee_lib_router_1: '0xd704287527d320d154ff0b77387de36660d648ce4f3215c022dfdc428c8b8aac' },
// { dvn_fee_lib_router_0: '0x4467e4a7308e418b16e3120ba307269110b1a02e21cf2fb32e20a2860a8bb2dc' },
// { dvn_fee_lib_router_1: '0xbbcf234d0b20c15388439fc0fa7a379210eee8a0a4efd000a5ef4e616d34c43c' },
// { executor_fee_lib_0: '0x99ffef2284f725683de26bbce8fc0010770426f7387c7bbec4bced834716da82' },
// { dvn_fee_lib_0: '0x8340a176d3caf05ab492e943363055fba1d2ef6d49c5775dd59757645a556687' },
// { dvn: '0x51ec85b4cf4d7ac03a2a42853a5f0cfbd22f56fda66726e1f98906d5829b7c22' },
// ]
async function checkModules() {
    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
        faucet: 'http://127.0.0.1:8081',
    })
    const aptos = new Aptos(config)

    // Check modules for each address
    for (const addressObj of addresses) {
        const [key, value] = Object.entries(addressObj)[0]
        try {
            console.log(`\nChecking modules for ${key}: ${value}`)
            const modules = await aptos.getAccountModules({ accountAddress: value })

            if (modules.length === 0) {
                console.log(`No modules found for ${key}`)
            } else {
                console.log('Found modules:')
                modules.forEach((module) => {
                    console.log(`- ${module.abi?.name}`)
                })
            }
        } catch (error) {
            console.error(`Error checking modules for ${key}:`, error)
        }
    }
}

// Make the function executable from command line
if (require.main === module) {
    checkModules()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error)
            process.exit(1)
        })
}

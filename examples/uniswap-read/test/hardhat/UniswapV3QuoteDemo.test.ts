import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'

describe('UniswapV3QuoteDemo Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    const channelId = 1001
    // Declaration of variables to be used in the test suite
    let UniswapV3QuoteDemo: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myOAppReadA: Contract
    let mockEndpointV2A: Contract
    let mockEndpointV2B: Contract

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        UniswapV3QuoteDemo = await ethers.getContractFactory('UniswapV3QuoteDemo')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners()

        ;[ownerA, endpointOwner] = signers

        // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZ EndpointV2 with the given Endpoint ID
        mockEndpointV2A = await EndpointV2Mock.deploy(eidA)
        mockEndpointV2B = await EndpointV2Mock.deploy(eidB)

        // Deploying one instance of UniswapV3QuoteDemo contract and linking to the mock LZEndpoint
        myOAppReadA = await UniswapV3QuoteDemo.deploy(mockEndpointV2A.address, channelId)

        await mockEndpointV2A.setDestLzEndpoint(myOAppReadA.address, mockEndpointV2A.address)
        await mockEndpointV2A.setReadChannelId(channelId)

        await myOAppReadA.connect(ownerA).setReadChannel(channelId, true)
    })
})

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { defaultAbiCoder, toUtf8Bytes } from 'ethers/lib/utils'
import { deployments, ethers } from 'hardhat'

import { ComputeSetting, Options } from '@layerzerolabs/lz-v2-utilities'

describe('MyOApp Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    const channelId = 1001
    // Declaration of variables to be used in the test suite
    let MyOAppRead: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let myOAppReadA: Contract
    let myOAppReadB: Contract
    let mockEndpointV2A: Contract
    let mockEndpointV2B: Contract

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factory for our tested contract
        MyOAppRead = await ethers.getContractFactory('MyOAppRead')

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners()

        ;[ownerA, ownerB, endpointOwner] = signers

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

        // Deploying two instances of MyOAppRead contract and linking them to the mock LZEndpoint
        myOAppReadA = await MyOAppRead.deploy(mockEndpointV2A.address, ownerA.address, 'oAppA')
        myOAppReadB = await MyOAppRead.deploy(mockEndpointV2B.address, ownerB.address, 'oAppB')

        // Setting destination endpoints in the LZEndpoint mock for each MyOApp instance
        await mockEndpointV2A.setDestLzEndpoint(myOAppReadB.address, mockEndpointV2B.address)
        await mockEndpointV2B.setDestLzEndpoint(myOAppReadA.address, mockEndpointV2A.address)

        // Setting each MyOApp instance as a peer of the other
        await myOAppReadA.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myOAppReadB.address, 32))
        await myOAppReadB.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myOAppReadA.address, 32))

        // Setting read channel and configuration only for MyOAppReadA
        await mockEndpointV2A.setDestLzEndpoint(myOAppReadA.address, mockEndpointV2A.address)
        await mockEndpointV2A.setReadChannelId(channelId)

        await myOAppReadA.connect(ownerA).setReadChannel(channelId, true)
    })

    // A test case to verify message sending functionality
    it('should send a message to each destination OApp', async function () {
        // Assert initial state of data in both MyOApp instances
        expect(await myOAppReadA.data()).to.equal(
            defaultAbiCoder.encode(['bytes'], [toUtf8Bytes('Nothing received yet.')])
        )
        expect(await myOAppReadB.data()).to.equal(
            defaultAbiCoder.encode(['bytes'], [toUtf8Bytes('Nothing received yet.')])
        )
        const options = Options.newOptions().addExecutorLzReadOption(500000, 100, 0).toHex().toString()

        // Initialize command options
        const currentBlockNum = await ethers.provider.getBlockNumber()
        const evmReadRequest = [1, eidA, true, currentBlockNum, 1, myOAppReadA.address]
        const evmComputeRequest = [ComputeSetting.MapReduce, eidA, true, currentBlockNum, 1, myOAppReadA.address]

        // Define native fee and quote for the message send operation
        const [nativeFee] = await myOAppReadA.quote(channelId, 1, [evmReadRequest], evmComputeRequest, options, false)

        // Execute send operation from myOAppReadA with expected response
        await mockEndpointV2A.setReadResponse(
            myOAppReadA.address,
            defaultAbiCoder.encode(['bytes'], [toUtf8Bytes('Test read message.')])
        )
        await myOAppReadA.send(channelId, 1, [evmReadRequest], evmComputeRequest, options, {
            value: nativeFee.toString(),
        })

        // Assert the resulting state of data in both MyOApp instances
        expect(await myOAppReadA.data()).to.equal(
            defaultAbiCoder.encode(['bytes'], [toUtf8Bytes('Test read message.')])
        )
        expect(await myOAppReadB.data()).to.equal(
            defaultAbiCoder.encode(['bytes'], [toUtf8Bytes('Nothing received yet.')])
        )
    })
})

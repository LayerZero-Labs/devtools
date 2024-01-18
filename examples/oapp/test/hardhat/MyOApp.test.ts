const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('MyOApp Test', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyOApp, LZEndpointV2Mock, ownerA, ownerB, myOAppA, myOAppB, mockEndpointA, mockEndpointB

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factories for MyOApp and LZEndpointV2Mock are created
        MyOApp = await ethers.getContractFactory('MyOApp')
        LZEndpointV2Mock = await ethers.getContractFactory('LZEndpointV2Mock')
        // Fetching the first signer (account) from Hardhat's local Ethereum network
        ;[ownerA, ownerB] = await ethers.getSigners()
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZEndpoint with the given Endpoint ID
        mockEndpointA = await LZEndpointV2Mock.deploy(eidA)
        mockEndpointB = await LZEndpointV2Mock.deploy(eidB)

        // Deploying two instances of MyOApp contract and linking them to the mock LZEndpoint
        myOAppA = await MyOApp.deploy(mockEndpointA.address, ownerA.address)
        myOAppB = await MyOApp.deploy(mockEndpointB.address, ownerB.address)

        // Setting destination endpoints in the LZEndpoint mock for each MyOApp instance
        await mockEndpointA.setDestLzEndpoint(myOAppB.address, mockEndpointB.address)
        await mockEndpointB.setDestLzEndpoint(myOAppA.address, mockEndpointA.address)

        // Setting each MyOApp instance as a peer of the other
        await myOAppA.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myOAppB.address, 32))
        await myOAppB.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myOAppA.address, 32))
    })

    // A test case to verify message sending functionality
    it('send a message to each destination OApp', async function () {
        // Assert initial state of data in both MyOApp instances
        expect(await myOAppA.data()).to.equal('Nothing received yet.')
        expect(await myOAppB.data()).to.equal('Nothing received yet.')

        // Define native fee and quote for the message send operation
        let nativeFee = 0
        ;[nativeFee] = await myOAppA.quote(
            eidB,
            'Nothing received yet.',
            '0x0100210100000000000000000000000000030d4000000000000000000000000000000000',
            false
        )

        // Execute send operation from myOAppA
        await myOAppA.send(
            eidB,
            'Test message.',
            '0x0100210100000000000000000000000000030d4000000000000000000000000000000000',
            { value: nativeFee.toString() }
        )

        // Assert the resulting state of data in both MyOApp instances
        expect(await myOAppA.data()).to.equal('Nothing received yet.')
        expect(await myOAppB.data()).to.equal('Test message.')
    })
})

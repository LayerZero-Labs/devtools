import { Options } from '@layerzerolabs/lz-v2-utilities'

const { expect } = require('chai')
const { ethers } = require('hardhat')

// Describe block defines a test suite for the MyOFT contract
describe('MyOFT Test', function () {
    // A constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2
    // Declaration of variables to be used in the test suite
    let MyOFT, LZEndpointV2Mock, ownerA, ownerB, myOFTA, myOFTB, mockEndpointA, mockEndpointB

    // Before hook for setup that runs once before all tests in the block
    before(async function () {
        // Contract factories for MyOFT and LZEndpointV2Mock are created
        MyOFT = await ethers.getContractFactory('MyOFT')
        LZEndpointV2Mock = await ethers.getContractFactory('EndpointV2Mock')
        // Fetching the first two signers (accounts) from Hardhat's local Ethereum network
        ;[ownerA, ownerB] = await ethers.getSigners()
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZEndpoint with the given Endpoint ID
        mockEndpointA = await LZEndpointV2Mock.deploy(eidA)
        mockEndpointB = await LZEndpointV2Mock.deploy(eidB)

        // Deploying two instances of MyOFT contract with different identifiers and linking them to the mock LZEndpoint
        myOFTA = await MyOFT.deploy('aOFT', 'aOFT', mockEndpointA.address, ownerA.address)
        myOFTB = await MyOFT.deploy('bOFT', 'bOFT', mockEndpointB.address, ownerB.address)

        // Setting destination endpoints in the LZEndpoint mock for each MyOFT instance
        await mockEndpointA.setDestLzEndpoint(myOFTB.address, mockEndpointB.address)
        await mockEndpointB.setDestLzEndpoint(myOFTA.address, mockEndpointA.address)

        // Setting each MyOFT instance as a peer of the other in the mock LZEndpoint
        await myOFTA.connect(ownerA).setPeer(eidB, ethers.utils.zeroPad(myOFTB.address, 32))
        await myOFTB.connect(ownerB).setPeer(eidA, ethers.utils.zeroPad(myOFTA.address, 32))
    })

    // A test case to verify token transfer functionality
    it('sends a token from A address to B address via each OFT', async function () {
        // Minting an initial amount of tokens to ownerA's address in the myOFTA contract
        const initialAmount = ethers.utils.parseEther('100')
        await myOFTA.mint(ownerA.address, initialAmount)

        // Defining the amount of tokens to send and constructing the parameters for the send operation
        const tokensToSend = ethers.utils.parseEther('1')
        const sendParam = [eidB, ethers.utils.zeroPad(ownerB.address, 32), tokensToSend, tokensToSend]

        // Defining extra message execution options for the send operation
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        // Fetching the native fee for the token send operation
        const [nativeFee] = await myOFTA.quoteSend(sendParam, options, false, `0x`, `0x`)

        // Executing the send operation from myOFTA contract
        await myOFTA.send(sendParam, options, [nativeFee, 0], ownerA.address, '0x', '0x', { value: nativeFee })

        // Fetching the final token balances of ownerA and ownerB
        const finalBalanceA = await myOFTA.balanceOf(ownerA.address)
        const finalBalanceB = await myOFTB.balanceOf(ownerB.address)

        // Asserting that the final balances are as expected after the send operation
        expect(finalBalanceA.eq(initialAmount.sub(tokensToSend))).to.be.true
        expect(finalBalanceB.eq(tokensToSend)).to.be.true
    })
})

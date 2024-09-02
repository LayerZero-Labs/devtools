import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import hre from 'hardhat'

import { Options } from '@layerzerolabs/lz-v2-utilities'

describe('MyONFT721 Test', function () {
    const { deployments } = hre
    const eidA = 1
    const eidB = 2
    let MyONFT721: ContractFactory
    let EndpointV2Mock: ContractFactory
    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress
    let aONFT: Contract
    let bONFT: Contract
    let mockEndpointA: Contract
    let mockEndpointB: Contract

    before(async function () {
        MyONFT721 = await hre.ethers.getContractFactory('MyONFT721Mock')

        const signers = await hre.ethers.getSigners()
        ownerA = signers[0]
        ownerB = signers[1]
        endpointOwner = signers[2]

        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(EndpointV2MockArtifact.abi, EndpointV2MockArtifact.bytecode, endpointOwner)
    })

    beforeEach(async function () {
        mockEndpointA = await EndpointV2Mock.deploy(eidA)
        mockEndpointB = await EndpointV2Mock.deploy(eidB)

        aONFT = await MyONFT721.deploy('aONFT', 'aONFT', mockEndpointA.address, ownerA.address)
        bONFT = await MyONFT721.deploy('bONFT', 'bONFT', mockEndpointB.address, ownerB.address)

        await mockEndpointA.setDestLzEndpoint(bONFT.address, mockEndpointB.address)
        await mockEndpointB.setDestLzEndpoint(aONFT.address, mockEndpointA.address)

        await aONFT.connect(ownerA).setPeer(eidB, hre.ethers.utils.hexZeroPad(bONFT.address, 32))
        await bONFT.connect(ownerB).setPeer(eidA, hre.ethers.utils.hexZeroPad(aONFT.address, 32))
    })

    it('should send a token from A address to B address via each ONFT721', async function () {
        const tokenId = 1
        await aONFT.connect(ownerA).mint(ownerA.address, tokenId)

        const beforeOwnerAFinalBalance = await aONFT.balanceOf(ownerA.address)
        const beforeOwnerBFinalBalance = await bONFT.balanceOf(ownerB.address)

        expect(beforeOwnerAFinalBalance.eq(1)).to.be.true
        expect(beforeOwnerBFinalBalance.eq(0)).to.be.true

        const executorOption = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex()

        const sendParam = {
            dstEid: eidB,
            to: hre.ethers.utils.hexZeroPad(ownerB.address, 32),
            tokenId: tokenId,
            extraOptions: executorOption,
            composeMsg: [],
            onftCmd: [],
        }

        const msgFee = {
            nativeFee: hre.ethers.utils.parseEther('0.1'),
            lzTokenFee: hre.ethers.utils.parseEther('0'),
        }

        await aONFT.connect(ownerA).send(sendParam, msgFee, ownerA.address, { value: msgFee.nativeFee })

        const ownerAFinalBalance = await aONFT.balanceOf(ownerA.address)
        const ownerBFinalBalance = await bONFT.balanceOf(ownerB.address)

        expect(ownerAFinalBalance.eq(0)).to.be.true
        expect(ownerBFinalBalance.eq(1)).to.be.true
    })
})

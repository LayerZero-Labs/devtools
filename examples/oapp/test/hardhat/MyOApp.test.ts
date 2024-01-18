const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('MyOApp', function () {
    beforeEach(async function () {
        this.eid = 123
        const signers = await ethers.getSigners()
        this.owner = signers[0]
        console.log(this.owner.address)

        const LayerZeroEndpointMock = await ethers.getContractFactory('LZEndpointV2Mock')
        this.LzEndpointV2Mock = await LayerZeroEndpointMock.deploy(this.eid)

        const MyOApp = await ethers.getContractFactory('MyOApp')
        this.myOAppA = await MyOApp.deploy(this.LzEndpointV2Mock.address, this.owner.address)
        this.myOAppB = await MyOApp.deploy(this.LzEndpointV2Mock.address, this.owner.address)

        await this.LzEndpointV2Mock.setDestLzEndpoint(this.myOAppA.address, this.LzEndpointV2Mock.address)
        await this.LzEndpointV2Mock.setDestLzEndpoint(this.myOAppB.address, this.LzEndpointV2Mock.address)

        await this.myOAppA.setPeer(this.eid, ethers.utils.zeroPad(this.myOAppB.address, 32))
        await this.myOAppB.setPeer(this.eid, ethers.utils.zeroPad(this.myOAppA.address, 32))
    })

    it('send a message to each destination OApp', async function () {
        expect(await this.myOAppA.data()).to.equal('Nothing received yet.')
        expect(await this.myOAppB.data()).to.equal('Nothing received yet.')

        let fee = 0
        ;[fee] = await this.myOAppA.quote(
            this.eid,
            'Nothing received yet.',
            `0x0100210100000000000000000000000000030d4000000000000000000000000000000000`,
            false
        )
        console.log(fee)

        await this.myOAppA.send(
            this.eid,
            'Test message.',
            '0x0100210100000000000000000000000000030d4000000000000000000000000000000000',
            {
                value: ethers.utils.parseEther('0.5'),
            }
        )
        expect(await this.myOAppA.data()).to.equal('Nothing received yet.')
        expect(await this.myOAppB.data()).to.equal('Test message.')

        /*await this.myOAppB.send(this.eid, { value: ethers.utils.parseEther("0.5") });
        expect(await this.myOAppA.data()).to.equal("Test message.");
        expect(await this.myOAppB.data()).to.equal("Test message.");
        */
    })
})

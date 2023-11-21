import { expect } from "chai"
import { describe } from "mocha"
import sinon from "sinon"
import { createProperty, isConfigured, isMisconfigured } from "../src/property"

describe("property", () => {
    describe("isMisconfigured", () => {
        it("should return true if value is Misconfigured", () => {
            expect(isMisconfigured({ value: false, desiredValue: true, configure: () => {} })).to.be.true
            expect(isMisconfigured({ value: null, desiredValue: null, configure: () => {} })).to.be.true
            expect(isMisconfigured({ value: 0, desiredValue: 0, configure: () => {} })).to.be.true
        })

        it("should return false if value is Configured", () => {
            expect(isMisconfigured({ value: false })).to.be.false
            expect(isMisconfigured({ value: true })).to.be.false
            expect(isMisconfigured({ value: 1 })).to.be.false
        })
    })

    describe("isConfigured", () => {
        it("should return false if value is Configured", () => {
            expect(isConfigured({ value: false, desiredValue: true, configure: () => {} })).to.be.false
            expect(isConfigured({ value: null, desiredValue: null, configure: () => {} })).to.be.false
            expect(isConfigured({ value: 0, desiredValue: 0, configure: () => {} })).to.be.false
        })

        it("should return true if value is Misconfigured", () => {
            expect(isConfigured({ value: false })).to.be.true
            expect(isConfigured({ value: true })).to.be.true
            expect(isConfigured({ value: 1 })).to.be.true
        })
    })

    describe("createProperty", () => {
        it("should return Configured if the current and desired values match", async () => {
            const currentValue = [1, "two", { three: true }]
            const desiredValue = [1, "two", { three: true }]

            const property = createProperty({
                desired: async () => desiredValue,
                get: () => currentValue,
                set: () => {},
            })

            expect(isMisconfigured(await property())).to.be.false
        })

        it("should return Misconfigured if the current and desired don't match", async () => {
            const currentValue = [1, "two", { three: true }]
            const desiredValue = [1, "two", { three: false }]

            const property = createProperty({
                desired: async () => desiredValue,
                get: () => currentValue,
                set: () => {},
            })

            expect(isMisconfigured(await property())).to.be.true
        })

        it("should call the setter with desired value when executed", async () => {
            const currentValue = [1, "two", { three: true }]
            const desiredValue = [1, "two", { three: false }]

            const set = sinon.spy()
            const property = createProperty({
                desired: () => desiredValue,
                get: () => currentValue,
                set,
            })

            const state = await property()
            await state.configure?.()

            expect(set.calledOnceWith(desiredValue)).to.be.true
        })

        it("should call the setter with context when executed", async () => {
            const currentValue = [1, "two", { three: true }]
            const desiredValue = [1, "two", { three: false }]

            const set = sinon.spy()
            const property = createProperty({
                desired: (context: string) => desiredValue,
                get: (context: string) => currentValue,
                set,
            })

            const state = await property("context")
            await state.configure?.()

            expect(set.calledOnceWith("context", desiredValue)).to.be.true
        })
    })
})

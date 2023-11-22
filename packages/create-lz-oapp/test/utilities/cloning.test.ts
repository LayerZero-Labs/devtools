import { expect } from "chai"
import { describe, it } from "mocha"
import { createExampleGitURL } from "../../src/utilities/cloning.js"

describe("utilities/cloning", () => {
    describe("createExampleGitURL", () => {
        const REPO_URL = "git@github.com:LayerZero-Labs/lz-utils"

        it("should return the repository field if directory and ref are not specified", () => {
            expect(createExampleGitURL({ repository: REPO_URL, id: "dummy", label: "Dummy" })).to.eql(REPO_URL)
        })

        it("should return the repository field with directory if directory is specified", () => {
            expect(createExampleGitURL({ repository: REPO_URL, directory: "dir", id: "dummy", label: "Dummy" })).to.eql(`${REPO_URL}/dir`)
            expect(createExampleGitURL({ repository: REPO_URL, directory: "/dir", id: "dummy", label: "Dummy" })).to.eql(`${REPO_URL}/dir`)
            expect(createExampleGitURL({ repository: REPO_URL, directory: "dir", ref: "", id: "dummy", label: "Dummy" })).to.eql(
                `${REPO_URL}/dir`
            )
        })

        it("should return the repository field with directory and ref if directory and ref are specified", () => {
            expect(createExampleGitURL({ repository: REPO_URL, directory: "dir", ref: "ref", id: "dummy", label: "Dummy" })).to.eql(
                `${REPO_URL}/dir#ref`
            )
            expect(createExampleGitURL({ repository: REPO_URL, directory: "dir", ref: "#ref", id: "dummy", label: "Dummy" })).to.eql(
                `${REPO_URL}/dir#ref`
            )
        })

        it("should return the repository field with ref if only ref specified", () => {
            expect(createExampleGitURL({ repository: REPO_URL, ref: "ref", id: "dummy", label: "Dummy" })).to.eql(`${REPO_URL}#ref`)
            expect(createExampleGitURL({ repository: REPO_URL, ref: "#ref", id: "dummy", label: "Dummy" })).to.eql(`${REPO_URL}#ref`)
        })
    })
})

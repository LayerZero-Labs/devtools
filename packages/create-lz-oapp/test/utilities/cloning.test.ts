import { createExampleGitURL } from '@/utilities/cloning'

describe('utilities/cloning', () => {
    describe('createExampleGitURL', () => {
        const REPO_URL = 'git@github.com:LayerZero-Labs/devtools'

        it('should return the repository field if directory and ref are not specified', () => {
            expect(createExampleGitURL({ repository: REPO_URL, id: 'dummy', label: 'Dummy' })).toEqual(REPO_URL)
        })

        it('should return the repository field with directory if directory is specified', () => {
            expect(
                createExampleGitURL({ repository: REPO_URL, directory: 'dir', id: 'dummy', label: 'Dummy' })
            ).toEqual(`${REPO_URL}/dir`)
            expect(
                createExampleGitURL({ repository: REPO_URL, directory: '/dir', id: 'dummy', label: 'Dummy' })
            ).toEqual(`${REPO_URL}/dir`)
            expect(
                createExampleGitURL({ repository: REPO_URL, directory: 'dir', ref: '', id: 'dummy', label: 'Dummy' })
            ).toEqual(`${REPO_URL}/dir`)
        })

        it('should return the repository field with directory and ref if directory and ref are specified', () => {
            expect(
                createExampleGitURL({ repository: REPO_URL, directory: 'dir', ref: 'ref', id: 'dummy', label: 'Dummy' })
            ).toEqual(`${REPO_URL}/dir#ref`)
            expect(
                createExampleGitURL({
                    repository: REPO_URL,
                    directory: 'dir',
                    ref: '#ref',
                    id: 'dummy',
                    label: 'Dummy',
                })
            ).toEqual(`${REPO_URL}/dir#ref`)
        })

        it('should return the repository field with ref if only ref specified', () => {
            expect(createExampleGitURL({ repository: REPO_URL, ref: 'ref', id: 'dummy', label: 'Dummy' })).toEqual(
                `${REPO_URL}#ref`
            )
            expect(createExampleGitURL({ repository: REPO_URL, ref: '#ref', id: 'dummy', label: 'Dummy' })).toEqual(
                `${REPO_URL}#ref`
            )
        })
    })
})

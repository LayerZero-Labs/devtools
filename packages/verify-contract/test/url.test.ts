import { tryCreateScanContractUrl, tryGetScanBrowserUrlFromScanUrl } from '@/common/url'

describe('url', () => {
    describe('tryGetScanBrowserUrlFromScanUrl', () => {
        it.each([[''], ['borken url'], ['https://'], ['https:///'], ['scan.api']])(
            'should return undefined when passed "%s"',
            (invalidUrl) => {
                expect(tryGetScanBrowserUrlFromScanUrl(invalidUrl)).toBeUndefined()
            }
        )

        it.each([
            ['https://com/', 'https://api.com/api'],
            ['http://scan.io/', 'http://api.scan.io/some-path'],
            ['http://scan.io/', 'http://api.scan.io'],
            ['http://scan.io/', 'http://api-scan.io'],
        ])('should return "%s" when passed "%s"', (output, validUrl) => {
            expect(tryGetScanBrowserUrlFromScanUrl(validUrl)).toBe(output)
        })
    })

    describe('tryCreateScanContractUrl', () => {
        it.each([['scan.io', 'oh no']])('should return undefined when passed "%s"', (invalidUrl) => {
            expect(tryCreateScanContractUrl(invalidUrl, '0x0')).toBeUndefined()
        })

        it.each([
            ['https://scan.io/address/0x0', 'https://scan.io', '0x0'],
            ['http://scan.io/address/0x0', 'http://scan.io', '0x0'],
        ])('should return "%s" when passed "%s" and address is "%s"', (output, validUrl, address) => {
            expect(tryCreateScanContractUrl(validUrl, address)).toBe(output)
        })
    })
})

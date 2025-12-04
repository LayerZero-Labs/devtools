import path from 'path'
import type { Logger } from '@layerzerolabs/io-devtools'
import { verifyTarget, verifyNonTarget } from '@/hardhat-deploy/verify'
import got from 'got'

jest.mock('got', () => jest.fn())

const mockFetch = got as unknown as jest.Mock

// Create a mock logger for tests
const createMockLogger = (): Logger =>
    ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        http: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
        silly: jest.fn(),
    }) as unknown as Logger

describe('verifyTarget', () => {
    const logger = createMockLogger()

    beforeEach(() => {
        mockFetch.mockReset()
    })

    it('should fail if the path to the deployments does not exist', async () => {
        await expect(() =>
            verifyTarget(
                {
                    paths: {
                        deployments: '/i/dont/exists/but/i/might',
                    },
                },
                logger
            )
        ).rejects.toThrow('is not a directory')
    })

    it('should call the filter function with correct arguments', async () => {
        const mockFilter = jest.fn()

        await verifyTarget(
            {
                paths: {
                    deployments: path.resolve(__dirname, '__data__', 'deploymentz'),
                },
                networks: {
                    fuji: {
                        apiUrl: 'https://fuji.com/api',
                    },
                },
                filter: mockFilter,
            },
            logger
        )

        expect(mockFilter).toHaveBeenCalledTimes(8)

        expect(mockFilter).toHaveBeenCalledWith('GasDrop', 'contracts/examples/GasDrop.sol', 'fuji')
        expect(mockFilter).toHaveBeenCalledWith(
            'DistributeONFT721',
            'contracts/token/onft/extension/DistributeONFT721.sol',
            'fuji'
        )
        expect(mockFilter).toHaveBeenCalledWith('ExampleOFTV2', 'contracts/examples/ExampleOFTV2.sol', 'fuji')
        expect(mockFilter).toHaveBeenCalledWith(
            'ExampleUniversalONFT721',
            'contracts/examples/ExampleUniversalONFT721.sol',
            'fuji'
        )
        expect(mockFilter).toHaveBeenCalledWith(
            'LayerZeroExampleERC1155',
            'contracts/examples/LayerZeroExampleERC1155.sol',
            'fuji'
        )

        expect(mockFetch).toHaveBeenCalledTimes(0)
    })

    it('should be able to verify a renamed contract', async () => {
        const mockFilter = jest.fn()

        await verifyTarget(
            {
                paths: {
                    deployments: path.resolve(__dirname, '__data__', 'deploymentz'),
                },
                networks: {
                    'renamed-testnet': {
                        apiUrl: 'https://renamed.com/api',
                    },
                },
                filter: mockFilter,
            },
            logger
        )

        expect(mockFilter).toHaveBeenCalledTimes(1)

        // This contract comes from a file that has been deployed under a different name (GasDropRenamed.json)
        expect(mockFilter).toHaveBeenCalledWith('GasDrop', 'contracts/examples/GasDrop.sol', 'renamed-testnet')

        expect(mockFetch).toHaveBeenCalledTimes(0)
    })
})

describe('verifyNonTarget', () => {
    const logger = createMockLogger()

    beforeEach(() => {
        mockFetch.mockReset()
    })

    it('should not fail if the path to the deployment does not exist', async () => {
        await expect(
            verifyNonTarget(
                {
                    paths: {
                        deployments: path.resolve(__dirname, '__data__', 'deployments'),
                    },
                    networks: {
                        fuji: {},
                    },
                    contracts: [
                        {
                            network: 'fuji',
                            address: '0x3D268b216523f1BD7d8343171595E826C436a334',
                            deployment: 'i/do/not/exist/do/you/?',
                            contractName: 'contracts/Duskoin.sol',
                        },
                    ],
                },
                logger
            )
        ).resolves.toEqual([])
    })
})

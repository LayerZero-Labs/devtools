import { serializeDockerComposeSpec } from '@/docker/compose'
import { spawnSync } from 'child_process'
import { rm, writeFile } from 'fs/promises'
import { join } from 'path'

describe('docker/compose', () => {
    describe('serializeDockerComposeSpec', () => {
        const SPEC_FILE_PATH = join(__dirname, 'docker-compose.yaml')

        const validateSpec = () =>
            spawnSync('docker', ['--log-level', 'ERROR', 'compose', '-f', SPEC_FILE_PATH, 'config'])

        afterEach(async () => {
            await rm(SPEC_FILE_PATH, { force: true })
        })

        it('should create a valid compose spec if called with no services', async () => {
            const spec = serializeDockerComposeSpec({
                version: '3.9',
                services: {},
            })

            await writeFile(SPEC_FILE_PATH, spec)

            const result = validateSpec()

            expect(result.stderr.toString('utf8')).toBe('')
            expect(result.status).toBe(0)
            expect(spec).toMatchSnapshot()
        })

        it('should create a valid compose spec if called with basic services', async () => {
            const spec = serializeDockerComposeSpec({
                version: '3.9',
                services: {
                    redis: {
                        image: 'redis:latest',
                    },
                    codebase: {
                        build: '.',
                        command: 'pnpm build',
                        volumes: ['./packages:/app/packages'],
                    },
                    postgres: {
                        image: 'postgres',
                        volumes: ['pgdata:/var/lib/postgresql/data'],
                    },
                },
                volumes: {
                    pgdata: null,
                    somevolume: {
                        name: 'somevolumename',
                    },
                },
            })

            await writeFile(SPEC_FILE_PATH, spec)

            const result = validateSpec()

            expect(result.stderr.toString('utf8')).toBe('')
            expect(result.status).toBe(0)
            expect(spec).toMatchSnapshot()
        })
    })
})

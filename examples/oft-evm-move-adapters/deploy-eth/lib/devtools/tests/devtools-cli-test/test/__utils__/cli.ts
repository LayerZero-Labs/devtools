import { spawnSync } from 'child_process'

export const runCli = (args: string[] = []) =>
    spawnSync(`npx`, ['@layerzerolabs/devtools-cli', ...args], {
        encoding: 'utf8',
        stdio: 'pipe',
    })

import type { Example, PackageManager } from "@/types.js"

export const EXAMPLES: Example[] = [
    {
        id: "oft",
        label: "OFT",
        repository: "git@github.com:LayerZero-Labs/lz-examples",
        directory: "packages/oft",
    },
    {
        id: "oapp",
        label: "OApp",
        repository: "git@github.com:LayerZero-Labs/lz-examples",
        directory: "packages/oapp",
    },
]

export const PACKAGE_MANAGERS: PackageManager[] = [
    {
        command: "npm",
        label: "npm",
    },
    {
        command: "yarn",
        label: "yarn",
    },
    {
        command: "pnpm",
        label: "pnpm",
    },
    {
        command: "bun",
        label: "bun",
    },
]

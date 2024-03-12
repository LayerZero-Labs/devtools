import { dump } from 'js-yaml'
import type { ComposeSpec } from './types'

export const serializeDockerComposeSpec = (spec: ComposeSpec): string => dump(spec)

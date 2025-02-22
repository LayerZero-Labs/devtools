import { build } from '../tasks/move/build'
import { deploy } from '../tasks/move/deploy'
import { setDelegate } from '../tasks/move/setDelegate'

import { wireMove } from '../tasks/move/wireMove'
import { wireEvm } from '../tasks/evm/wire-evm'

// export the cli init from here
export * from '../cli/init'

export { build, deploy, setDelegate, wireMove, wireEvm }

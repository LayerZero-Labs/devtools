import { type DeployFunction } from 'hardhat-deploy/types'
import { createDeployEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'

const deploy: DeployFunction = createDeployEndpointV2()

deploy.tags = ['Bootstrap', 'EndpointV2']

export default deploy

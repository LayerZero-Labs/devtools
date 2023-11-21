import { Contract } from "@ethersproject/contracts"
import { GetPropertyValue, createProperty } from "@layerzerolabs/ua-utils"
import { EndpointId } from "@layerzerolabs/lz-definitions"

type SetPeerConfigurableContext = [oapp: Contract, endpointId: EndpointId]

type SetPeerConfigurableValue = string

export const createSetPeerProperty = (desired: GetPropertyValue<SetPeerConfigurableContext, SetPeerConfigurableValue>) =>
    createProperty<SetPeerConfigurableContext, SetPeerConfigurableValue>({
        desired,
        get: (oapp, endpointId) => oapp.peers(endpointId),
        set: (oapp, endpointId, peer) => oapp.setPeer(endpointId, peer),
    })

export interface SetPeerAddressParam {
    peer: Uint8Array
    __kind: 'PeerAddress'
}

export interface SetPeerEnforcedOptionsParam {
    send: Uint8Array
    sendAndCall: Uint8Array
    __kind: 'EnforcedOptions'
}

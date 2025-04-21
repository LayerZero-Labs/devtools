import { AnchorIdl, rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import { renderRustVisitor } from '@codama/renderers'
import { createFromRoot } from 'codama'

import DvnIDL from '../clients/dvn/idl/dvn.json'
import EndpointIDL from '../clients/endpoint/idl/endpoint.json'
import ExecutorIDL from '../clients/executor/idl/executor.json'
import OFTIDL from '../clients/oft/idl/oft.json'
import UlnIDL from '../clients/uln/idl/uln.json'
;(EndpointIDL as any).metadata = {
    ...(EndpointIDL as any).metadata,
    address: '76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6',
} as AnchorIdl['metadata']
;(UlnIDL as any).metadata = {
    ...(UlnIDL as any).metadata,
    address: '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH',
} as AnchorIdl['metadata']
;(OFTIDL as any).metadata = {
    ...(OFTIDL as any).metadata,
    address: '11111111111111111111111111111111',
} as AnchorIdl['metadata']
;(DvnIDL as any).metadata = {
    ...(DvnIDL as any).metadata,
    address: 'HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW',
} as AnchorIdl['metadata']
;(ExecutorIDL as any).metadata = {
    ...(ExecutorIDL as any).metadata,
    address: '6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn',
} as AnchorIdl['metadata']

const endpointCodama = createFromRoot(rootNodeFromAnchor(EndpointIDL as AnchorIdl))
const oftCodama = createFromRoot(rootNodeFromAnchor(OFTIDL as AnchorIdl))
const ulnCodama = createFromRoot(rootNodeFromAnchor(UlnIDL as AnchorIdl))
const dvnCodama = createFromRoot(rootNodeFromAnchor(DvnIDL as AnchorIdl))
const executorCodama = createFromRoot(rootNodeFromAnchor(ExecutorIDL as AnchorIdl))

endpointCodama.accept(renderRustVisitor('clients/endpoint/src/generated/endpoint'))
oftCodama.accept(renderRustVisitor('clients/oft/src/generated/oft'))
ulnCodama.accept(renderRustVisitor('clients/uln/src/generated/uln'))
dvnCodama.accept(renderRustVisitor('clients/dvn/src/generated/dvn'))
executorCodama.accept(renderRustVisitor('clients/executor/src/generated/executor'))

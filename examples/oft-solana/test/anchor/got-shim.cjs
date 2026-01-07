const Module = require('module')

const originalLoad = Module._load

const gotStub = {
    default: Object.assign(async () => {
        throw new Error('got stub: network client not available in tests')
    }, {
        get: async () => {
            throw new Error('got stub: network client not available in tests')
        },
        post: async () => {
            throw new Error('got stub: network client not available in tests')
        },
    }),
}

Module._load = function (request, parent, isMain) {
    if (request === 'got') {
        return gotStub
    }
    return originalLoad.call(this, request, parent, isMain)
}

function _checkPrivateRedeclaration(obj, privateCollection) {
    if (privateCollection.has(obj)) {
        throw new TypeError("Cannot initialize the same private elements twice on an object");
    }
}
function _classApplyDescriptorGet(receiver, descriptor) {
    if (descriptor.get) {
        return descriptor.get.call(receiver);
    }
    return descriptor.value;
}
function _classApplyDescriptorSet(receiver, descriptor, value) {
    if (descriptor.set) {
        descriptor.set.call(receiver, value);
    } else {
        if (!descriptor.writable) {
            throw new TypeError("attempted to set read only private field");
        }
        descriptor.value = value;
    }
}
function _classExtractFieldDescriptor(receiver, privateMap, action) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to " + action + " private field on non-instance");
    }
    return privateMap.get(receiver);
}
function _classPrivateFieldGet(receiver, privateMap) {
    var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get");
    return _classApplyDescriptorGet(receiver, descriptor);
}
function _classPrivateFieldInit(obj, privateMap, value) {
    _checkPrivateRedeclaration(obj, privateMap);
    privateMap.set(obj, value);
}
function _classPrivateFieldSet(receiver, privateMap, value) {
    var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set");
    _classApplyDescriptorSet(receiver, descriptor, value);
    return value;
}
var _Conn = /*#__PURE__*/ new WeakMap();
export class CosmosDidStore {
    async addBinding(account, did, proof) {
        console.log(account, did, proof);
        return new Promise((resolve, _)=>{
            resolve();
        });
    }
    async getBinding(account) {
        return new Promise((resolve, _)=>{
            resolve({
                account,
                did: 'did:sid:1',
                proof: 'proof'
            });
        });
    }
    async addAccountAuth(accountAuth) {
        console.log(accountAuth);
        return new Promise((resolve, _)=>{
            resolve();
        });
    }
    async getAccountAuth(accountDid) {
        console.log(accountDid);
        return new Promise((resolve, _)=>{
            resolve(null);
        });
    }
    async updateSidDocument(signingKey, encryptKey) {
        console.log(signingKey, encryptKey);
        return new Promise((resolve, _)=>{
            resolve("");
        });
    }
    constructor(conn){
        _classPrivateFieldInit(this, _Conn, {
            writable: true,
            value: void 0
        });
        _classPrivateFieldSet(this, _Conn, conn);
        console.log("init cosmos client", _classPrivateFieldGet(this, _Conn));
    }
}

import { HDNode } from '@ethersproject/hdnode';
import * as u8a from 'uint8arrays';
import { generateKeyPairFromSeed } from '@stablelib/x25519';
import { randomBytes } from '@stablelib/random';
import { ES256KSigner, createJWE, x25519Encrypter, x25519Decrypter, decryptJWE } from 'did-jwt';
import { accountSecretToDid, encodeKey, parseJWEKids } from './utils';
import { DID } from 'dids';
import { getResolver } from 'key-did-resolver';
import stringify from 'fast-json-stable-stringify';
const ROOT_PATH = "10000";
const keyNameLen = 10;
export function keyName(key) {
    return key.slice(-keyNameLen);
}
export class Keychain {
    static async load(didStore, seed, did) {
        const keychain = new Keychain(did, didStore);
        const rootDocId = did.split(":")[2];
        const versions = await didStore.listSidDocumentVersions(rootDocId);
        const latestVersion = versions[versions.length - 1];
        keychain.latestDocid = latestVersion;
        keychain.keysMap[keychain.latestDocid] = Keychain.generateKeys(seed);
        keychain.updateKidToDocId(keychain.latestDocid, keychain.keysMap[keychain.latestDocid]);
        keychain.oldSeeds = await didStore.getOldSeeds(did);
        const tempSeeds = [
            ...keychain.oldSeeds
        ];
        let tempDocId = latestVersion;
        let jwe = tempSeeds.pop();
        while(jwe){
            const decrypted = await keychain.decryptFromJWE(jwe, [], tempDocId);
            const decryptedObj = JSON.parse(u8a.toString(decrypted));
            tempDocId = Object.keys(decryptedObj)[0];
            const prevSeed = new Uint8Array(decryptedObj[tempDocId]);
            keychain.keysMap[tempDocId] = Keychain.generateKeys(prevSeed);
            keychain.updateKidToDocId(tempDocId, keychain.keysMap[tempDocId]);
            jwe = tempSeeds.pop();
        }
        return keychain;
    }
    updateKidToDocId(docId, fullKeySeries) {
        const signing = encodeKey(fullKeySeries.pub.encrypt, 'x25519');
        const sigKid = keyName(signing);
        this.kidToDocid[sigKid] = docId;
        const encrypt = encodeKey(fullKeySeries.pub.signing, 'secp256k1');
        const encKid = keyName(encrypt);
        this.kidToDocid[encKid] = docId;
    }
    static async create(didStore) {
        const seed = randomBytes(32);
        const fullKeySeries = this.generateKeys(seed);
        const signing = encodeKey(fullKeySeries.pub.signing, 'secp256k1');
        const encrypt = encodeKey(fullKeySeries.pub.encrypt, 'x25519');
        const sigKid = keyName(signing);
        const encKid = keyName(encrypt);
        const docid = await didStore.updateSidDocument({
            [sigKid]: signing,
            [encKid]: encrypt
        });
        const sid = `did:sid:${docid}`;
        const keychain = new Keychain(sid, didStore);
        keychain.latestDocid = docid;
        keychain.keysMap[docid] = fullKeySeries;
        keychain.kidToDocid[encKid] = keychain.latestDocid;
        keychain.kidToDocid[sigKid] = keychain.latestDocid;
        return keychain;
    }
    getSigner(docid = this.latestDocid) {
        const keys = this.keysMap[docid] || this.keysMap[this.latestDocid];
        return ES256KSigner(keys.priv.signing, false, {
            canonical: true
        });
    }
    getKeyFragment(docid = this.latestDocid, keyUsage = "sign") {
        const keys = this.keysMap[docid];
        if (keyUsage === "encrypt") {
            return keyName(encodeKey(keys.pub.encrypt, 'x25519'));
        } else {
            return keyName(encodeKey(keys.pub.signing, 'secp256k1'));
        }
    }
    async add(accountId, accountSecrect) {
        const accountDid = await accountSecretToDid(accountSecrect);
        // account encrypt seed
        const accountEncryptedSeed = await accountDid.createJWE(this.keysMap[this.latestDocid].seed, [
            accountDid.id
        ]);
        // sid encrypt account
        const keyFragment = this.getKeyFragment(this.latestDocid, "encrypt");
        const kid = `${this.did}#${keyFragment}`;
        const encrypter = x25519Encrypter(this.keysMap[this.latestDocid].pub.encrypt, kid);
        const sidEncryptedAccount = await createJWE(u8a.fromString(accountId), [
            encrypter
        ]);
        await this.didStore.addAccountAuth(this.did, {
            accountDid: accountDid.id,
            accountEncryptedSeed,
            sidEncryptedAccount
        });
    }
    async remove(accountId) {
        this.rotateKeys(accountId);
    }
    static generateKeys(seed) {
        const rootNode = HDNode.fromSeed(seed);
        const baseNode = rootNode.derivePath(ROOT_PATH);
        const signingKey = baseNode.derivePath('0');
        const encryptSeed = u8a.fromString(baseNode.derivePath('1').privateKey.slice(2), 'base16');
        const encryptKeypair = generateKeyPairFromSeed(encryptSeed);
        return {
            seed,
            pub: {
                signing: u8a.fromString(signingKey.publicKey.slice(2), 'base16'),
                encrypt: encryptKeypair.publicKey
            },
            priv: {
                signing: u8a.fromString(signingKey.privateKey.slice(2), 'base16'),
                encrypt: encryptKeypair.secretKey
            }
        };
    }
    encodeSeed(docId) {
        const seed = this.keysMap[docId].seed;
        const seedPayload = {
            [docId]: seed
        };
        return u8a.fromString(stringify(seedPayload));
    }
    async rotateKeys(removeAuthId) {
        const rootDocId = this.did.split(":")[2];
        const prevDocId = this.latestDocid;
        // generate new key
        const seed = randomBytes(32);
        const newKeySeries = Keychain.generateKeys(seed);
        const signing = encodeKey(newKeySeries.pub.signing, 'secp256k1');
        const sigKid = keyName(signing);
        const encrypt = encodeKey(newKeySeries.pub.encrypt, 'x25519');
        const encKid = keyName(encrypt);
        // update did document
        const newDocId = await this.didStore.updateSidDocument({
            [sigKid]: signing,
            [encKid]: encrypt
        }, rootDocId);
        this.latestDocid = newDocId;
        this.keysMap[newDocId] = newKeySeries;
        this.kidToDocid[sigKid] = newDocId;
        this.kidToDocid[encKid] = newDocId;
        // update past seeds
        const encodedPrevSeed = this.encodeSeed(prevDocId);
        const prevSeedJWE = await this.encryptToJWE(encodedPrevSeed);
        this.oldSeeds.push(prevSeedJWE);
        await this.didStore.addOldSeed(this.did, prevSeedJWE);
        const allAccountAuths = await this.didStore.getAllAccountAuth(this.did);
        if (Object.keys(allAccountAuths).length > 0) {
            const accountDid = new DID({
                resolver: getResolver()
            });
            const updateAccountAuths = [];
            const removeAccountAuths = [];
            for(let i = 0; i < Object.values(allAccountAuths).length; i++){
                const aa = await this.updateAccountAuth(accountDid, Object.values(allAccountAuths)[i], removeAuthId);
                if (!aa) {
                    removeAccountAuths.push(allAccountAuths[i].accountDid);
                } else {
                    updateAccountAuths.push(aa);
                }
            }
            await this.didStore.updateAccountAuths(this.did, updateAccountAuths, removeAccountAuths);
        }
    }
    async updateAccountAuth(accountDid, auth, removeAuthId) {
        const kids = parseJWEKids(auth.sidEncryptedAccount);
        const accountId = u8a.toString(await this.decryptFromJWE(auth.sidEncryptedAccount, kids));
        if (accountId === removeAuthId) {
            return null;
        }
        // account encrypt seed
        const accountEncryptedSeed = await accountDid.createJWE(this.keysMap[this.latestDocid].seed, [
            accountDid.id
        ]);
        // sid encrypt account
        const keyFragment = this.getKeyFragment(this.latestDocid, "encrypt");
        const kid = `${this.did}#${keyFragment}`;
        // const encrypter = x25519Encrypter(this.keysMap[this.latestDocid].pub.encrypt, kid);
        // const sidEncryptedAccount = await createJWE(u8a.fromString(accountId), [encrypter]);
        const sidEncryptedAccount = await this.encryptToJWE(u8a.fromString(accountId), kid);
        return {
            accountDid: auth.accountDid,
            accountEncryptedSeed,
            sidEncryptedAccount
        };
    }
    async encryptToJWE(payload, kid) {
        const encrypter = x25519Encrypter(this.keysMap[this.latestDocid].pub.encrypt, kid);
        return await createJWE(payload, [
            encrypter
        ]);
    }
    async decryptFromJWE(jwe, kids, docId) {
        return await decryptJWE(jwe, await this.getDecrypter(kids, docId));
    }
    async getDecrypter(kids = [], docId) {
        if (!docId) {
            const enckid = kids.find((k)=>this.kidToDocid[k]);
            docId = enckid ? this.kidToDocid[enckid] : this.latestDocid;
        }
        return x25519Decrypter(this.keysMap[docId].priv.encrypt);
    }
    constructor(did, didStore){
        this.keysMap = {};
        this.kidToDocid = {};
        this.oldSeeds = [];
        this.did = did;
        this.didStore = didStore;
    }
}

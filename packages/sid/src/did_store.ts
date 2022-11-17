import { BindingProof } from './index';
import { JWE } from "did-jwt";

export interface Binding {
    accountId: string
    did: string
    proof: string
}

export interface AccountAuth {
    accountDid: string
    accountEncryptedSeed: JWE
    sidEncryptedAccount: JWE
}

export interface DidStore {
    // @params proof - sid signed the binding.
    addBinding(
        accountId: string, 
        sid: string, 
        proof: BindingProof
    ): Promise<void>

    getBinding(accountId: string): Promise<Binding | null>

    // @param accountEncryptedSeed - account encrypted sid's seed.
    // @param sidEncryptedAccount - sid encrypted account id.
    addAccountAuth(did: string, accountAuth: AccountAuth): Promise<void>

    getAccountAuth(did: string, accountDid: string): Promise<AccountAuth | null>

    updateAccountAuths(did: string, update: Array<AccountAuth>, remove: Array<string>): Promise<void>

    getAllAccountAuth(did: string): Promise<Record<string, AccountAuth>>

    // @return document id.
    updateSidDocument(signingKey: string, encryptKey: string, rootDocId?: string): Promise<string>

    listSidDocumentVersions(rootDocId: string): Promise<Array<string>>
}
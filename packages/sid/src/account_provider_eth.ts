import { AccountId } from "caip";
import { AccountProvider, getBindMessage } from "./account_provider";
import { BindingProof } from '@js-sao-did/api-client';
import { utf8ToHex} from "./utils";

export class EthAccountProvider implements AccountProvider {
    private provider: any
    private address: string
    static async new(provider: any): Promise<EthAccountProvider> {
        const accounts = await provider.request({method: 'eth_accounts'});
        if (accounts.length === 0) {
            throw new Error("Please connect to metamask");
        } else {
            return new EthAccountProvider(provider, accounts[0]);
        }
    }

    private constructor(provider: any, address: string) {
        this.provider = provider;
        this.address = address;
    }

    private namespace(): string {
        return "eip155";
    }

    private async chainId(): Promise<number> {
        const chainIdHex = await this.provider.request({ method: 'eth_chainId'});
        const chainId = parseInt(chainIdHex, 16);
        return chainId;
    }

    async accountId(): Promise<AccountId> {
        const chainId = await this.chainId();
        return new AccountId({
            address: this.address,
            chainId: `${this.namespace}:${chainId}`
        });
    }

    sign(message: string): Promise<string> {
        return this.provider.request({
            method: 'personal_sign', 
            params: [utf8ToHex(message), this.address]
        });
    }

    async generateBindingProof(did: string): Promise<BindingProof> {
        const {message, timestamp} =  getBindMessage(did);
        const signature = await this.provider.request({
            method: 'personal_sign',
            params: [utf8ToHex(message), this.address]
        });
        const accountId = await this.accountId();
        return {
            timestamp,
            signature,
            did,
            message,
            accountId: accountId.toString()
        };
    }

}

import { JWS } from "@js-sao-did/common";
import { BuildCreateReqParams, BuildLoadReqParams, BuildNodeAddressReqParams, BuildRenewReqParams, BuildUpdateReqParams, CreateRequestClient, SaoNodeAPISchema } from '@js-sao-did/api-client'
import { ClientOrderProposal, LoadReq, Proposal } from './types'
import { Uint8ArrayToString } from './utils';
export class Model {
    dataId: string;
    alias: string;
    commitId?: string;
    version?: string;
    content?: number[];
    cid?: string;

    constructor(dataId: string, alias: string) {
        this.dataId = dataId;
        this.alias = alias;
    }

    setCommitId(commitId: string) {
        this.commitId = commitId;
    }

    setVersion(version: string) {
        this.version = version;
    }

    setContent(content: number[]) {
        this.content = content;
    }

    setCid(cid: string) {
        this.cid = cid
    }

    cast(): any {
        return JSON.parse(Uint8ArrayToString(new Uint8Array(this.content)))
    }

    toString(): string {
        return JSON.stringify(this)
    }
}

export class ModelProvider {
    private ownerSid: string
    private groupId: string
    private nodeAddress: string
    private nodeApiClient: CreateRequestClient<SaoNodeAPISchema>

    public constructor(ownerSid: string, groupId: string, nodeApiClient: CreateRequestClient<SaoNodeAPISchema>) {
        this.ownerSid = ownerSid;
        this.groupId = groupId;
        this.nodeApiClient = nodeApiClient;

        this.nodeAddress = ""
        this.nodeApiClient.jsonRpcApi(BuildNodeAddressReqParams()).then((res: any) => {
            try {
                this.nodeAddress = res.data.result
            } catch (e) {
                console.error(e)
            }
        }).catch((err: Error) => {
            console.error(err)
        })
    }

    getOwnerSid(): string {
        return this.ownerSid
    }

    getGroupId(): string {
        return this.groupId
    }

    getNodeAddress(): string {
        return this.nodeAddress
    }

    validate(proposal: Proposal): boolean {
        return proposal.groupId === this.groupId && proposal.owner === this.ownerSid
    }

    async create(clientProposal: ClientOrderProposal, orderId: number, content: number[]): Promise<Model> {
        const res = await this.nodeApiClient.jsonRpcApi(BuildCreateReqParams(
            clientProposal,
            orderId,
            content
        ));
        var model = new Model(res.data.result.DataId, res.data.result.Alias);
        model.setCid(res.data.result.Cid);
        return model
    }

    async load(req: LoadReq): Promise<Model> {
        const res = await this.nodeApiClient.jsonRpcApi(BuildLoadReqParams(req));
        var model = new Model(res.data.result.DataId, res.data.result.Alias);
        model.setCid(res.data.result.Cid);
        model.setContent(res.data.result.Content);
        model.setCommitId(res.data.result.CommitId);
        model.setVersion(res.data.result.Version);

        return model
    }

    async update(clientProposal: ClientOrderProposal, orderId: number, patch: number[]): Promise<Model> {
        const res = await this.nodeApiClient.jsonRpcApi(BuildUpdateReqParams(
            clientProposal,
            orderId,
            patch
        ));
        var model = new Model(res.data.result.DataId, res.data.result.Alias);
        model.setCid(res.data.result.Cid);
        return model
    }

    async renew(clientProposal: ClientOrderProposal, orderId: number): Promise<Model> {
        throw new Error("comming soon...");
    }
}

export * from "./manager";
export * from "./types";
export * from "./utils"
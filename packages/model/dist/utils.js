import multihashing from 'multihashing-async';
import CID from 'cids';
import { v4 as uuid } from "uuid";
export const Uint8ArrayToString = (dataArray)=>{
    var dataString = "";
    for(var i = 0; i < dataArray.length; i++){
        dataString += String.fromCharCode(dataArray[i]);
    }
    return dataString;
};
export const stringToUint8Array = (dataString)=>{
    var dataArray = [];
    for(var i = 0, j = dataString.length; i < j; ++i){
        dataArray.push(dataString.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(dataArray);
    return tmpUint8Array;
};
export const GenerateDataId = ()=>{
    return uuid();
};
export const CalculateCid = async (content)=>{
    const hash = await multihashing(content, 'sha2-256');
    const cid = new CID(1, 'raw', hash);
    return cid.toString();
};
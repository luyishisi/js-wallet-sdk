import {cloneObject, SignTxParams} from "@okxweb3/coin-base";
import {BtcWallet} from "./BtcWallet";
import * as bitcoin from "../index"
import {networks, signBtc, utxoTx} from "../index"
import {buildRuneData} from "../rune";
import {base} from "@okxweb3/crypto-lib";
import { error } from "console";

export class AtomicalWallet extends BtcWallet {

    convert2AtomicalTx(paramData: any): utxoTx {
        const clonedParamData = cloneObject(paramData)

        // cal atomical token input all amount
        let inputs = clonedParamData.inputs;
        const atomicalInputMap = new Map<string, number>();
        // const atomicalInputMapList: Map<string, number>[] = [];
        const atomicalTypeMap = new Map<string, string>();
        let txInput = []
        let txOutput = []
        // let txInputIndex = 0

        // Calculate the total Atomical asset input value from the 'input' field
        // and construct the 'input' field for the UTXO (Unspent Transaction Output).
        // The atomicalInputMapList is used to check whether a complete transfer is achieved in the 'output'.
        for (const input of inputs) {
            let dataArray = input.data;
            if (dataArray != null && dataArray instanceof Array) {
                for (const data of dataArray) {
                    
                    let atomicalId: string = data["atomicalId"];
                    let atomicalIdType :string = data["type"];
                    let atomicalAmount: number = input.amount;

                    if (atomicalId == null || atomicalAmount == null  || atomicalIdType == null) {
                        continue
                    }
                    // if (atomicalIdType != "FT" && atomicalIdType != "NFT" ){
                    //     continue
                    // }

                    if (atomicalTypeMap.get(atomicalId) == null) {
                        atomicalTypeMap.set(atomicalId, atomicalIdType);
                    }

                    let beforeAmount = atomicalInputMap.get(atomicalId);
                    if (beforeAmount == null) {
                        atomicalInputMap.set(atomicalId, atomicalAmount);
                        // atomicalInputMapList[txInputIndex].set(atomicalId, atomicalAmount);
                    } else {
                        atomicalInputMap.set(atomicalId, beforeAmount + atomicalAmount);
                        // atomicalInputMapList[txInputIndex].set(atomicalId, beforeAmount + atomicalAmount);
                    }
                }
                // txInputIndex ++;

            }
            txInput.push({
                txId:input.txId,
                vOut:input.vOut,
                amount:input.amount,
                address:input.address,
                // privateKey:input.privateKey,
            })
        }


        // Calculate the total asset output value for the 'output' field
        // and construct the 'output' field for the UTXO (Unspent Transaction Output).
        // If there are assets that haven't been completely transferred,
        // they will be automatically transferred back in the last transaction of their respective asset transfers.
        let outputs = clonedParamData.outputs;
        const atomicalSendMap = new Map<string, number>();
        for (const output of outputs) {
            let dataArray = output.data;
            // let atomUtxoIndex = 0
            if (dataArray != null && dataArray instanceof Array) {

                for (const data of dataArray) {
                    let atomicalId: string = data["atomicalId"];
                    let atomicalAmount: number = output.amount;
                    let atomicalIdType :string = data["type"];

                    if (atomicalId == null || atomicalAmount == null  || atomicalIdType == null) {
                        continue
                    }
                    if (atomicalIdType != "FT" && atomicalIdType != "NFT" ){
                        continue
                    }

                    if (atomicalTypeMap.get(atomicalId) != atomicalIdType){
                        throw new Error(`Error: AtomicalId ${atomicalId} does not exist in the map.`);
                    }

                    let beforeAmount = atomicalSendMap.get(atomicalId);
                    if (beforeAmount == null) {
                        atomicalSendMap.set(atomicalId, atomicalAmount);
                    } else {
                        atomicalSendMap.set(atomicalId, beforeAmount + atomicalAmount);
                    }

                    // let beforeUtxoAmount = atomicalInputMapList[atomUtxoIndex].get(atomicalId)
                    // if (beforeUtxoAmount != null && beforeUtxoAmount >= output.amount){
                    //     atomicalInputMapList[atomUtxoIndex].set(atomicalId,beforeUtxoAmount - atomicalAmount);
                    // }

                }
                // atomUtxoIndex ++;
            }
            txOutput.push({
                amount:output.amount,
                address:output.address,
            })
        }

        // where isChange ? if input > output yes, Atomical change put last output
        let isAtomicalChange = false;
        for (const atomicalId of atomicalInputMap.keys()) {
            let inputAmount = atomicalInputMap.get(atomicalId);
            let sendAmount = atomicalSendMap.get(atomicalId);

            // If some input assets lack corresponding outputs, all funds will be returned as change.
            if (sendAmount == null) { 
                sendAmount = 0;
            }

            if (inputAmount != null && sendAmount != null && inputAmount > sendAmount) {
                isAtomicalChange = true
                let changeAmount = inputAmount - sendAmount
                if (changeAmount < clonedParamData.minChangeValue){
                    throw new Error(`Error: Output does not meet dust limit conditions. amount: ${changeAmount}.`);
                }

                let atomicalChange = {
                    address:clonedParamData.changeAddress,
                    amount:changeAmount
                }
                txOutput.push(atomicalChange)

            } else if (inputAmount != null && sendAmount != null && inputAmount < sendAmount){ 
                throw new Error(`Error: AtomicalId ${atomicalId} has insufficient input amount \
                    (${inputAmount}) compared to the output amount (${sendAmount}).\
                     This may lead to overspending and potential asset loss.`
                );
            }
        }

        if (clonedParamData.minChangeValue != null){
            for (const curUtxo of txInput){
                if (curUtxo.amount < clonedParamData.minChangeValue){
                    throw new Error(`Error: Input does not meet dust limit conditions. amount: ${curUtxo.amount}.`);
                }
            }
            for (const curUtxo of txOutput){
                if (curUtxo.amount < clonedParamData.minChangeValue){
                    throw new Error(`Error: Output does not meet dust limit conditions. amount: ${curUtxo.amount}.`);
                }
            }
        }

        return {
            inputs: txInput as [],
            outputs: txOutput as [],
            address: clonedParamData.changeAddress,
            feePerB: clonedParamData.feeRate,
        }
    }

    async signTransaction(param: SignTxParams): Promise<any> {
        const network = this.network()
        let txHex = null;
        try {
            const privateKey = param.privateKey;
            const atomicalTx = this.convert2AtomicalTx(param.data);

            console.log(atomicalTx)

            txHex = signBtc(atomicalTx, privateKey, network);
            return Promise.resolve(txHex);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async estimateFee(param: SignTxParams): Promise<number> {
        try {
            const runeTx = this.convert2AtomicalTx(param.data);

            const fee = bitcoin.estimateBtcFee(runeTx, this.network());
            return Promise.resolve(fee);
        } catch (e) {
            return Promise.reject(e);
        }
    }
}

export class AtomicalTestWallet extends AtomicalWallet {
    network() {
        return bitcoin.networks.testnet;
    }
}

import {AtomicalTestWallet} from "../src"
import {SignTxParams} from "@okxweb3/coin-base";



describe('atomical test', () => {
    test("segwit_taproot transfer atomical", async () => {
        let wallet = new AtomicalTestWallet()
        let curPrivateKey  = "私钥"
        let atomicalTxParams = {
            inputs: [
                // gas fee utxo
                {
                    txId: "ba13baed413bf88b2656842eba9eb2375bc197d759dae91b23a654054926c55c",
                    vOut: 2,
                    amount: 901899,
                    address: "tb1ppfc0mx9j3070zqleu257zt46ch2v9f9n9urkhlg7n7pswcmpqq0qt3pswx",
                },
                // atomical token info
                {
                    txId: "ba13baed413bf88b2656842eba9eb2375bc197d759dae91b23a654054926c55c",
                    vOut: 0,
                    amount: 700,
                    address: "tb1ppfc0mx9j3070zqleu257zt46ch2v9f9n9urkhlg7n7pswcmpqq0qt3pswx",
                    data: [
                        {"atomicalId": "9527efa43262636d8f5917fc763fbdd09333e4b387afd6d4ed7a905a127b27b4i0", "type": "FT"}
                    ] ,// maybe many atomical token
                },
                {
                    txId: "ba13baed413bf88b2656842eba9eb2375bc197d759dae91b23a654054926c55c",
                    vOut: 1,
                    amount: 300,
                    address: "tb1ppfc0mx9j3070zqleu257zt46ch2v9f9n9urkhlg7n7pswcmpqq0qt3pswx",
                    data: [
                        {"atomicalId": "9527efa43262636d8f5917fc763fbdd09333e4b387afd6d4ed7a905a127b27b4i0", "type": "FT"}
                    ] ,// maybe many atomical token
                },

            ],
            outputs: [
                { // btc send output
                    address: "tb1ppfc0mx9j3070zqleu257zt46ch2v9f9n9urkhlg7n7pswcmpqq0qt3pswx",
                    amount: 500,
                },
                { // atomical send output
                    address: "tb1ppfc0mx9j3070zqleu257zt46ch2v9f9n9urkhlg7n7pswcmpqq0qt3pswx",
                    amount: 700,
                    data: [
                        {"atomicalId": "9527efa43262636d8f5917fc763fbdd09333e4b387afd6d4ed7a905a127b27b4i0", "type": "FT"}
                    ]  
                }
            ],
            changeAddress: "tb1ppfc0mx9j3070zqleu257zt46ch2v9f9n9urkhlg7n7pswcmpqq0qt3pswx",
            enforce: false,
            feeRate: 1,
            minChangeValue : 100 
        };

        let signParams: SignTxParams = {
            privateKey: curPrivateKey,
            data: atomicalTxParams
        };
        // let txfee = await wallet.estimateFee(signParams);
        // console.log("txfee:",txfee)
        let tx = await wallet.signTransaction(signParams);
        console.info("txraw:",tx)
    });

})

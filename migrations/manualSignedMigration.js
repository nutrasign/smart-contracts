/**
 * @title manualSignedMigration
 * @dev Deploys smart contracts as defined in migrationConfig.sol, by sending already signed transactions
 * Can specify verbose level with LOG, and enviroment with ENV (IE: ENV=prod LOG=trace node migrations/manualSignedMigrations)
 */

const network = process.env.ENV || 'dev';
const config = require("./migrationConfig.json")
var RPCURI;
const log = require("../helpers/logger")
const Web3 = require("web3");

if (network == 'dev') {
    RPCURI = config.RPCURIDEV;
    main();
} else if(network == 'prod') {
    RPCURI = config.RPCURIPROD;
    log.Info('YOU ARE ABOUT TO DEPLOY TO PROD (' + RPCURI + ') ARE YOU SURE? yes/no')
    var stdin = process.openStdin();
    stdin.addListener("data", function(d) {
        if(d.toString().trim() == 'yes'){
            main();
        } else if (d.toString().trim() == 'no'){
            process.exit(0);
        }   
      });
} 

const web3 = new Web3(new Web3.providers.HttpProvider(RPCURI));



async function main() {
    const web3 = new Web3(new Web3.providers.HttpProvider(RPCURI));
    const contracts = config.Contracts;
    let deployedContracts = 0;
    for (let i = 0; i < contracts.length; i++) {
        let compiledContract;
        try {
            compiledContract = require(contracts[i].CompiledContractLocation);
        } catch (error) {
            log.Err(error)
            process.exit(1);
        }
        const gasLimit = contracts[i].GasLimit;
        const gasPrice = contracts[i].GasPrice;
        const deployARGS = contracts[i].DeployArgs;
        const address = contracts[i].DeployerAddress;
        const privateKey = contracts[i].DeployerPrivateKey;
        let nonce;
        try {
            nonce = await web3.eth.getTransactionCount(address, 'pending') + i;
        } catch (error) {
            log.Err(error)
            process.exit(1);
        }
        let contractInstance = new web3.eth.Contract(compiledContract.abi);
        log.Info(address + ' will deploy ' + compiledContract.contractName);
        let byteCodeWithParams;
        if (deployARGS) {
            byteCodeWithParams = contractInstance.deploy({
                data: compiledContract.bytecode,
                arguments: deployARGS}).encodeABI();
        }else {
            byteCodeWithParams = contractInstance.deploy({
                data: compiledContract.bytecode}).encodeABI();
        }
        let transactionObject = {
            gas: gasLimit,
            nonce: nonce,
            gasPrice: gasPrice,
            data: byteCodeWithParams,
            from: address
        };
        log.Trace('Transaction: ');
        log.Trace(transactionObject)

        web3.eth.accounts.signTransaction(transactionObject, privateKey, function (error, signedTx) {
        if (error) {
            log.Err(error);
        } else {
            log.Trace('Transaction for ' + compiledContract.contractName + '\'s deployment signed successfully')
            log.Trace(signedTx);
            web3.eth.sendSignedTransaction(signedTx.rawTransaction)
            .once('transactionHash', function(hash){ 
                log.Debug('Transaction hash for ' + compiledContract.contractName + '\'s deployment')
                log.Debug(hash)
            })
            .once('receipt', function(receipt){ 
                log.Debug('Node accepted the transaction' + hash)
                log.Trace(receipt)
            })
            .on('error', function(error){
                log.Err('Failed to process tx ' + signedTx.messageHash)
                log.Err(error)
                deployedContracts = deployedContracts + 1;
                if(deployedContracts == contracts.length)
                    process.exit(1)
            })
            .once('confirmation', function(confirmationNumber, receipt){
                log.Info('Contract ' + compiledContract.contractName + ' has been deployed, address');
                log.Info(receipt.contractAddress);
                deployedContracts = deployedContracts + 1;
                if(deployedContracts == contracts.length)
                    process.exit(0)
            });
        }});  
    }
}



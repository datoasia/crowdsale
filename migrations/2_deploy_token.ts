const DATOToken = artifacts.require('./DATOToken.sol');
export = function(deployer: any) {
  // Set unlimited synchronization timeout
  (<any>DATOToken).constructor.synchronization_timeout = 0;
  deployer.deploy(DATOToken, '18333333', '275e4', '4583333');
};

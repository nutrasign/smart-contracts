const should = require('chai')
  .should();

async function assertRevert (promise) {
  try {
    await promise;
  } catch (error) {
    error.message.should.include('VM Exception while processing transaction:', `Expected error to include "VM Exception while processing transaction:", got ${error} instead`);
    return;
  }
  should.fail('Expected revert not received');
}

module.exports = {
  assertRevert,
};
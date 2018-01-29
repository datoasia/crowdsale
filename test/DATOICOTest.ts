import {ItTestFn} from '../globals';
import * as BigNumber from 'bignumber.js';
import {NumberLike} from 'bignumber.js';
import {IDATOToken, IDATOICO, TokenReservation, ICOState} from '../contracts';
import {assertEvmThrows, assertEvmInvalidOpcode} from './lib/assert';
import {web3LatestTime, Seconds, web3IncreaseTime} from './lib/time';

const it = (<any>global).it as ItTestFn;
const assert = (<any>global).assert as Chai.AssertStatic;

const DATOToken = artifacts.require('./DATOToken.sol');
const DATOIco = artifacts.require('./DATOICO.sol');

const ONE_TOKEN = new BigNumber('1e18');
const ETH_TOKEN_EXCHANGE_RATIO = 500;

function tokens(val: NumberLike): string {
    return new BigNumber(val).times(ONE_TOKEN).toString();
}

function tokens2wei(val: NumberLike): string {
    return new BigNumber(val)
        .mul(ONE_TOKEN)
        .divToInt(ETH_TOKEN_EXCHANGE_RATIO)
        .toString();
}

function wei2rawtokens(val: NumberLike): string {
    return new BigNumber(val).mul(ETH_TOKEN_EXCHANGE_RATIO).toString();
}

// ICO Instance
let cico: IDATOICO | null;

const state = {
    teamWalletInitialBalance: new BigNumber(0),
    sentWei: new BigNumber(0)
};

contract('DATOICO', function (accounts: string[]) {
    let cnt = 0;
    const actors = {
        owner: accounts[cnt++], // token owner
        someone1: accounts[cnt++],
        someone2: accounts[cnt++],
        team1: accounts[cnt++],
        team2: accounts[cnt++],
        team3: accounts[cnt++],
        investor1: accounts[cnt++],
        investor2: accounts[cnt++],
        investor3: accounts[cnt++],
        utility1: accounts[cnt++],
        teamWallet: accounts[cnt++]
    } as { [k: string]: string };
    console.log('Actors: ', actors);

    it('should be correct initial token state', async () => {
        const token = await DATOToken.deployed();
        // Total supply
        assert.equal(await token.totalSupply.call(), tokens('18333333').toString());
        // Staff
        assert.equal(await token.getReservedTokens.call(TokenReservation.Staff), tokens('275e4'));
        // Utility
        assert.equal(await token.getReservedTokens.call(TokenReservation.Utility), tokens('4583333'));
        // Available supply
        assert.equal(
            await token.availableSupply.call(),
            new BigNumber(tokens(18333333))
                .sub(tokens(275e4))
                .sub(tokens(4583333))
                .toString()
        );
        // Token locked
        assert.equal(await token.locked.call(), true);
        // Token owner
        assert.equal(await token.owner.call(), actors.owner);
        // Token name
        assert.equal(await token.name.call(), 'DATO token');
        // Token symbol
        assert.equal(await token.symbol.call(), 'DATO');
        // Token decimals
        assert.equal(await token.decimals.call(), 18);
    });

    it('should ico contract deployed', async () => {
        const token = await DATOToken.deployed();

        // for tests  - set low soft capacity (to make available to fill soft cap)
        cico = await DATOIco.new(
            token.address,
            actors.teamWallet,
            tokens2wei(new BigNumber('6e3')), // low cap
            tokens2wei(new BigNumber('11e6')), // hard cap
            new BigNumber('1e17'), // min tx cap 0.1 eth
            tokens2wei(new BigNumber('11e6')), // hard tx cap
            {
                from: actors.owner
            }
        );
        state.teamWalletInitialBalance = await web3.eth.getBalance(actors.teamWallet);
        assert.equal(await cico.token.call(), token.address);
        assert.equal(await cico.teamWallet.call(), actors.teamWallet);
        assert.equal((await cico.lowCapWei.call()).toString(), tokens2wei(new BigNumber('6e3')).toString());
        assert.equal((await cico.hardCapWei.call()).toString(), tokens2wei(new BigNumber('11e6')).toString());
        assert.equal((await cico.lowCapTxWei.call()).toString(), new BigNumber('1e17').toString());
        assert.equal((await cico.hardCapTxWei.call()).toString(), tokens2wei(new BigNumber('11e6')).toString());

        // Token is not controlled by any ICO
        assert.equal(await token.ico.call(), '0x0000000000000000000000000000000000000000');
        // Assign ICO controller contract
        const txres = await token.changeICO(cico.address, {from: actors.owner});
        assert.equal(txres.logs[0].event, 'ICOChanged');
        assert.equal(await token.ico.call(), cico.address);
        // Ensure no others can check ICO contract fot token
        await assertEvmThrows(token.changeICO(cico.address, {from: actors.someone1}));
        // Check ico state
        assert.equal(await cico.state.call(), ICOState.Inactive);
    });

    it('should allow private token distribution', async () => {
        const token = await DATOToken.deployed();
        // Check initial state
        assert.equal(await token.availableSupply.call(), tokens(11e6));
        assert.equal(await token.getReservedTokens.call(TokenReservation.Staff), tokens(275e4));
        assert.equal(await token.getReservedTokens.call(TokenReservation.Utility), tokens(4583333));
        // Do not allow token reservation from others
        await assertEvmThrows(token.assignReserved(actors.team1, TokenReservation.Staff, tokens(1e6), {from: actors.someone1}));
        // // Reserve tokens for team member
        let txres = await token.assignReserved(actors.team1, TokenReservation.Staff, tokens(1e6), {from: actors.owner});
        assert.equal(txres.logs[0].event, 'ReservedTokensDistributed');
        assert.equal(txres.logs[0].args.to, actors.team1);
        assert.equal(txres.logs[0].args.amount, tokens(1e6));
        assert.equal(await token.availableSupply.call(), tokens(11e6));
        assert.equal(await token.balanceOf.call(actors.team1), tokens(1e6));
        assert.equal(await token.balanceOf.call(actors.someone1), 0);
        // check reserved tokens for staff
        assert.equal(await token.getReservedTokens.call(TokenReservation.Staff), tokens(275e4 - 1e6));
        // Reserve tokens for utility
        txres = await token.assignReserved(actors.utility1, TokenReservation.Utility, tokens(2e6), {from: actors.owner});
        assert.equal(txres.logs[0].event, 'ReservedTokensDistributed');
        assert.equal(txres.logs[0].args.to, actors.utility1);
        assert.equal(txres.logs[0].args.amount.toString(), tokens(2e6));
        assert.equal(await token.availableSupply.call(), tokens(11e6));
        assert.equal(await token.balanceOf.call(actors.team1), tokens(1e6));
        assert.equal(await token.balanceOf.call(actors.utility1), tokens(2e6));
        // check reserved tokens for utility
        assert.equal(await token.getReservedTokens.call(TokenReservation.Utility), tokens(4583333 - 2e6));
        // Do not allow reserve more than allowed tokens
        await assertEvmInvalidOpcode(token.assignReserved(actors.utility1, TokenReservation.Utility, tokens(4583333 - 2e6 + 1), {from: actors.owner}));
    });

    it('should public token operations be locked during ICO', async () => {
        const token = await DATOToken.deployed();
        await assertEvmThrows(token.transfer(actors.someone1, 1, {from: actors.team1}));
    });

    it('check ICO investments, ICO start-to-completed lifecycle', async () => {
        const token = await DATOToken.deployed();
        assert.isTrue(cico != null);
        const ico = cico!!;
        assert.equal(await ico.state.call(), ICOState.Inactive);

        // ICO will end in 2 weeks
        const endAt = web3LatestTime() + Seconds.weeks(2);
        await ico.start(endAt, {from: actors.owner});
        assert.equal(await ico.state.call(), ICOState.Active);
        assert.equal(await ico.endAt.call(), endAt);

        // Check link
        assert.equal(await token.ico.call(), ico.address);
        assert.equal(await ico.token.call(), token.address);

        // Perform investments (investor1)
        let investor1Tokens = new BigNumber(0);
        const balance = web3.eth.getBalance(actors.investor1);
        assert.equal(balance.toString(), new BigNumber('100e18').toString());

        // Check deny not white-listed addresses
        await assertEvmThrows(ico.sendTransaction({
                                                      value: tokens2wei(500),
                                                      from: actors.investor1
                                                  })
        );

        // // Add investor1 to white-list
        await ico.whitelist(actors.investor1);
        // Now it can buy tokens
        let txres = await ico.sendTransaction({
                                                  value: tokens2wei(500),
                                                  from: actors.investor1
                                              });
        state.sentWei = state.sentWei.add(tokens2wei(500));
        assert.equal(txres.logs[0].event, 'ICOInvestment');
        assert.equal(txres.logs[0].args.investedWei, tokens2wei(500).toString());
        assert.equal(txres.logs[0].args.bonusPct, 0);
        assert.equal(txres.logs[0].args.tokens, wei2rawtokens(txres.logs[0].args.investedWei).toString()
        );
        investor1Tokens = investor1Tokens.add(txres.logs[0].args.tokens);
        assert.equal(await token.balanceOf.call(actors.investor1), txres.logs[0].args.tokens.toString());
        assert.equal(await token.balanceOf.call(actors.investor1), investor1Tokens.toString());

        // Add investor2 to white-list
        await ico.whitelist(actors.investor2);
        txres = await ico.sendTransaction({
                                              value: tokens2wei(1500),
                                              from: actors.investor2
                                          });
        state.sentWei = state.sentWei.add(tokens2wei(1500));
        assert.equal(txres.logs[0].event, 'ICOInvestment');
        assert.equal(txres.logs[0].args.investedWei, tokens2wei(1500).toString());
        assert.equal(txres.logs[0].args.bonusPct, 0);
        assert.equal(txres.logs[0].args.tokens, wei2rawtokens(txres.logs[0].args.investedWei).toString());
        assert.equal(await token.balanceOf.call(actors.investor2), txres.logs[0].args.tokens.toString());

        // + 1 week
        await web3IncreaseTime(Seconds.weeks(1));
        txres = await ico.sendTransaction({
                                              value: tokens2wei(500),
                                              from: actors.investor1
                                          });
        state.sentWei = state.sentWei.add(tokens2wei(500));
        assert.equal(txres.logs[0].event, 'ICOInvestment');
        assert.equal(txres.logs[0].args.investedWei, tokens2wei(500).toString());
        assert.equal(txres.logs[0].args.bonusPct, 0);
        assert.equal(txres.logs[0].args.tokens, wei2rawtokens(txres.logs[0].args.investedWei).toString());
        investor1Tokens = investor1Tokens.add(txres.logs[0].args.tokens);
        assert.equal(await token.balanceOf.call(actors.investor1), investor1Tokens.toString());

        // Perform rest of investment required to fill low-cap
        await ico.whitelist(actors.investor3);
        let requiredWei = new BigNumber(await ico.lowCapWei.call());
        requiredWei = requiredWei.sub(await ico.collectedWei.call());
        txres = await ico.sendTransaction({
                                              value: requiredWei,
                                              from: actors.investor3
                                          });
        state.sentWei = state.sentWei.add(requiredWei);
        assert.equal(txres.logs[0].event, 'ICOInvestment');
        assert.equal(txres.logs[0].args.investedWei, requiredWei.toString());
        assert.equal((await ico.lowCapWei.call()).toString(), (await ico.collectedWei.call()).toString());

        // Block richInvestor
        await ico.blacklist(actors.investor3);
        await assertEvmThrows(ico.sendTransaction({
                                                      value: tokens2wei(1000),
                                                      from: actors.investor3
                                                  })
        );

        // +1 week will force end of preICO.
        await web3IncreaseTime(Seconds.weeks(1) + 1);

        // Try to invest outside of preICO
        await assertEvmThrows(ico.sendTransaction({
                                                      value: tokens2wei(1000),
                                                      from: actors.investor1
                                                  })
        );
        assert.equal(await ico.state.call(), ICOState.Active);
        txres = await ico.touch({from: actors.owner});
        assert.equal(txres.logs[0].event, 'ICOCompleted');
        assert.equal(await ico.state.call(), ICOState.Completed);
    });

    it('should team wallet match invested funds after ico', async () => {
        assert.equal(
            new BigNumber(web3.eth.getBalance(actors.teamWallet)).sub(state.teamWalletInitialBalance).toString(),
            state.sentWei.toString()
        );
    });

    it('check whitelist access', async () => {
        assert.isTrue(cico != null);
        const ico = cico!!;

        await assertEvmThrows(ico.disableWhitelist({from: actors.someone1}));
        await assertEvmThrows(ico.whitelist(actors.someone1, {from: actors.someone1}));
        await ico.disableWhitelist({from: actors.owner});
        await ico.enableWhitelist({from: actors.owner});
    })
});

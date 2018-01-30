global.Promise = require('bluebird');
import Ajv = require('ajv');
import fs = require('fs');
import net = require('net');
import path = require('path');
import {Strings, NU} from './lib/utils';
import * as Web3 from 'web3';
import {address, IContract} from './globals';
import {IDATOToken, IDATOICO} from './contracts';
import {ICliConfig} from './cli.schema';
import {toIcoStateIdToName, tokenGroupToId} from './lib/utils';
import * as BigNumber from 'bignumber.js';
import moment = require('moment');

type ContractName = 'DATOToken' | 'DATOICO';

const ctx = {
    contractNames: ['DATOToken', 'DATOICO'],
    cmdOpts: new Array<string>(),
    verbose: false,
    cfile: 'cli.yml',
    DATOToken: {},
    DATOICO: {}
} as {
    contractNames: string[];
    cmd: string;
    cmdOpts: string[];
    cfile: string;
    cfg: ICliConfig;
    verbose: boolean;
    web3: Web3;
    provider: Web3.providers.Provider;
    DATOToken: {
        meta: IContract<IDATOToken>;
        instance: IDATOToken;
    };
    DATOICO: {
        meta: IContract<IDATOICO>;
        instance: IDATOICO;
    };
};

const handlers = {} as {
    [k: string]: () => Promise<void>;
};


async function setup() {
    const TruffleContract = require('truffle-contract');
    loadConfig(ctx.cfile);
    await setupWeb3();
    await loadDeployedContracts();

    async function loadDeployedContracts() {
        const ecfg = ctx.cfg.ethereum;
        const w3defaults = {
            from: ecfg.from,
            gas: ecfg.gas,
            gasPrice: ecfg.gasPrice
        };
        return Promise.mapSeries(ctx.contractNames, async cn => {
            const c = ctx as any;
            c[cn].meta = TruffleContract(JSON.parse(fs.readFileSync(ecfg[cn].schema).toString()));
            c[cn].meta.setProvider(ctx.web3.currentProvider);
            c[cn].meta.defaults(w3defaults);
            c[cn].meta.synchronization_timeout = 0;
            const addr = readDeployedContractAddress(cn);
            if (addr) {
                c[cn].instance = await c[cn].meta.at(addr);
                console.log(`Loaded ${cn} instance at: ${addr}`);
            }
        });
    }

    async function setupWeb3() {
        const ecfg = ctx.cfg.ethereum;
        const endpoint = ecfg.endpoint.trim();
        if (endpoint.startsWith('ipc://')) {
            console.log(`Using Web3.providers.IpcProvider for ${endpoint}`);
            ctx.provider = new Web3.providers.IpcProvider(endpoint.substring('ipc://'.length), net);
        } else if (endpoint.startsWith('http')) {
            console.log(`Using Web3.providers.HttpProvider provider for: ${endpoint}`);
            ctx.provider = new Web3.providers.HttpProvider(endpoint);
        } else {
            throw new Error(`Unknown web3 endpoint: '${endpoint}'`);
        }
        ctx.web3 = new Web3(ctx.provider);
        await Promise.fromNode(cb => {
            ctx.web3.version.getNode((err, node) => {
                if (err) {
                    cb(err);
                    return;
                }
                console.log(`web3 node: ${node}`);
                cb(err, node);
            });
        });
        await Promise.fromNode(cb => {
            ctx.web3.version.getNetwork((err, netId) => {
                if (err) {
                    cb(err);
                    return;
                }
                switch (netId) {
                    case '1':
                        console.log('w3 connected to >>>> MAINNET <<<<');
                        break;
                    case '2':
                        console.log('w3 connected to >>>> MORDEN <<<<');
                        break;
                    case '3':
                        console.log('w3 connected to >>>> ROPSTEN <<<<');
                        break;
                    default:
                        console.log('w3 connected to >>>> UNKNOWN <<<<');
                }
                cb(err, netId);
            });
        });
    }

    function loadConfig(cpath: string) {
        const ajv = new Ajv();
        const configSchema = require('./cli.schema.json');
        const yaml = require('js-yaml');
        const subst = {
            home: process.env['HOME'],
            cwd: process.cwd(),
            moduledir: __dirname
        };
        ctx.cfg = yaml.safeLoad(Strings.replaceTemplate(fs.readFileSync(cpath, 'utf8'), subst));
        if (!ajv.validate(configSchema, ctx.cfg)) {
            const msg = `env: Invalid configuration: ${cpath}: `;
            console.error(msg, ajv.errors);
            throw new Error(`Invalid configuration: ${cpath}`);
        }
        if (ctx.verbose) {
            console.log('Configuration ', JSON.stringify(ctx.cfg, null, 2));
        }
    }
}

function readDeployedContractAddress(contract: string): string | null {
    const p = path.join(ctx.cfg.ethereum.lockfilesDir, `${contract}.lock`);
    if (fs.existsSync(p)) {
        return fs.readFileSync(p).toString('utf8');
    } else {
        return null;
    }
}

function writeDeployedContractAddress(contract: string, addr: address) {
    const p = path.join(ctx.cfg.ethereum.lockfilesDir, `${contract}.lock`);
    fs.writeFileSync(p, addr);
}

function failIfDeployed(cname?: ContractName) {
    const c = ctx as any;
    if (cname) {
        if (c[cname].instance) {
            throw new Error(`Contract '${cname}' is already deployed`);
        }
    } else {
        ctx.contractNames.forEach(cn => failIfDeployed(cn as any));
    }
}

function failIfNotDeployed(cname?: ContractName) {
    const c = ctx as any;
    if (cname) {
        if (!c[cname].instance) {
            throw new Error(`Contract '${cname}' is not deployed`);
        }
    } else {
        ctx.contractNames.forEach(cn => failIfNotDeployed(cn as any));
    }
}

function checkEthNetwork() {
    return new Promise((resolve, reject) => {
        ctx.web3.eth.getSyncing((err, sync) => {
            if (err)  {
                reject(err);
            }
            if (sync) {
                reject('Ethereum network client in pending synchronization, try again later');
            }
            resolve();
        });
    });
}

// -------------------- Operations

/**
 * Deploy
 */
handlers['deploy'] = async () => {
    await checkEthNetwork();
    if (!ctx.DATOToken.instance) {
        const tcfg = ctx.cfg.ethereum.DATOToken;
        console.log(`Deployment: 'DATOToken' `, tcfg);
        ctx.DATOToken.instance = await ctx.DATOToken.meta.new(
            tcfg.totalSupplyTokens,
            tcfg.reservedStaffTokens,
            tcfg.reservedUtilityTokens,
            {
                from: ctx.cfg.ethereum.from
            }
        );
        console.log(`DATOToken successfully deployed at: ${ctx.DATOToken.instance.address}\n\n`);
        writeDeployedContractAddress('DATOToken', ctx.DATOToken.instance.address);
    }
    failIfDeployed('DATOICO');
    const icfg = ctx.cfg.ethereum.DATOICO;
    console.log(`Deployment: 'DATOICO' `, icfg);
    ctx.DATOICO.instance = await ctx.DATOICO.meta.new(
        ctx.DATOToken.instance.address,
        icfg.teamWallet,
        icfg.hardCapWei,
        icfg.lowCapTxWei,
        icfg.hardCapWei,
        {
            from: ctx.cfg.ethereum.from
        }
    );
    console.log(`DATOICO successfully deployed at: ${ctx.DATOICO.instance.address}\n\n`);
    writeDeployedContractAddress('DATOICO', ctx.DATOICO.instance.address);
    console.log('Setting ICO for token...');
    await ctx.DATOToken.instance.changeICO(ctx.DATOICO.instance.address);
};

/**
 * Show status info
 */
handlers['status'] = async () => {
    await checkEthNetwork();
    failIfNotDeployed();
    const token = ctx.DATOToken.instance;
    const ico = ctx.DATOICO.instance;
    const data = {
        'token': {
            address: token.address,
            owner: await token.owner.call(),
            symbol: await token.symbol.call(),
            totalSupply: await token.totalSupply.call(),
            availableSupply: await token.availableSupply.call(),
            locked: await token.locked.call()
        },
        'ico': {
            address: ico.address,
            owner: await ico.owner.call(),
            teamWallet: await ico.teamWallet.call(),
            state: toIcoStateIdToName((await ico.state.call()) as any),
            weiCollected: await ico.collectedWei.call(),
            hardCapWei: await ico.hardCapWei.call(),
            lowCapTxWei: await ico.lowCapTxWei.call(),
            hardCapTxWei: await ico.hardCapTxWei.call()
        }
    };
    console.log(JSON.stringify(data, null, 2));
};


/**
 * on Token group operations
 */
handlers['group'] = async () => {
    await checkEthNetwork();
    failIfNotDeployed('DATOToken');
    const token = ctx.DATOToken.instance;
    const wcmd = ctx.cmdOpts.shift();
    switch (wcmd) {
        case 'reserve': {
            await token.assignReserved(
                pullCmdArg('address'),
                tokenGroupToId(pullCmdArg('group') as any),
                new BigNumber(pullCmdArg('tokens')).mul('1e18')
            );
            break;
        }
        case 'reserved': {
            const group = pullCmdArg('group');
            const remaining = await token.getReservedTokens.call(tokenGroupToId(group as any));
            console.log(
                JSON.stringify({
                                   group,
                                   remaining
                               }, null, 2)
            );
            break;
        }
        default:
            throw new Error(`Unknown group sub-command: ${wcmd || ''}`);
    }
};

handlers['tune'] = async () => {
    await checkEthNetwork();
    failIfNotDeployed('DATOICO');
    const ico = ctx.DATOICO.instance;
    // tune <end> <lowcap> <hardcap> - Set end date/low-cap/hard-cap for ICO (Only in suspended state)
    const end = moment(pullCmdArg('end'));
    const hardcap = pullCmdArg('hardcap');
    if (!end.unix() || end.isBefore(moment())) {
        throw new Error('End date is before current time');
    }
    console.log(`ICO end ts: ${end.unix()} sec`);
    await ico.tune(end.unix(), new BigNumber(hardcap), 0, 0);
};

handlers['ico'] = async () => {
    await checkEthNetwork();
    failIfNotDeployed('DATOICO');
    const ico = ctx.DATOICO.instance;
    const wcmd = ctx.cmdOpts.shift();
    switch (wcmd) {
        case 'state':
            console.log({
                            status: toIcoStateIdToName(new BigNumber(await ico.state.call()))
                        });
            break;
        case 'start':
            const end = moment(pullCmdArg('end'));
            if (!end.unix() || end.isBefore(moment())) {
                throw new Error('End date is before current time');
            }
            await ico.start(end.unix());
            console.log({
                            status: toIcoStateIdToName(new BigNumber(await ico.state.call()))
                        });
            break;
        case 'suspend':
            await ico.suspend();
            console.log({
                            state: toIcoStateIdToName(new BigNumber(await ico.state.call()))
                        });
            break;
        case 'resume':
            await ico.resume();
            console.log({
                            state: toIcoStateIdToName(new BigNumber(await ico.state.call()))
                        });
            break;
        case 'touch':
            await ico.touch();
            console.log({
                            status: toIcoStateIdToName(new BigNumber(await ico.state.call()))
                        });
            break;
        default:
            throw new Error(`Unknown ico sub-command: ${wcmd || ''}`);
    }
};

handlers['token'] = async () => {
    await checkEthNetwork();
    failIfNotDeployed('DATOToken');
    const token = ctx.DATOToken.instance;
    const wcmd = ctx.cmdOpts.shift();
    switch (wcmd) {
        case 'balance': {
            const tokensWithDecimals = await token.balanceOf.call(pullCmdArg('address'));
            const data = {
                tokens: new BigNumber(tokensWithDecimals).divToInt('1e18'),
                tokensWithDecimals
            };
            console.log(JSON.stringify(data, null, 2));
            break;
        }
        case 'lock':
            await token.lock();
            console.log({locked: await token.locked.call()});
            break;
        case 'unlock':
            await token.unlock();
            console.log({locked: await token.locked.call()});
            break;
        case 'locked':
            console.log({locked: await token.locked.call()});
            break;
        case 'ico': {
            const icoaddr = ctx.cmdOpts.shift();
            if (icoaddr) {
                await token.changeICO(icoaddr);
            }
            console.log({ico: await token.ico.call()});
            break;
        }
        default:
            throw new Error(`Unknown token sub-command: ${wcmd || ''}`);
    }
};

handlers['wl'] = async () => {
    await checkEthNetwork();
    failIfNotDeployed('DATOICO');
    const ico = ctx.DATOICO.instance;
    const wcmd = ctx.cmdOpts.shift();
    switch (wcmd) {
        case 'status': {
            console.log({
                            whitelistEnabled: await ico.whitelistEnabled.call()
                        });
            break;
        }
        case 'add': {
            await ico.whitelist(pullCmdArg('address'));
            console.log('Success');
            break;
        }
        case 'remove': {
            await ico.blacklist(pullCmdArg('address'));
            console.log('Success');
            break;
        }
        case 'disable': {
            await ico.disableWhitelist();
            console.log({
                            whitelistEnabled: await ico.whitelistEnabled.call()
                        });
            break;
        }
        case 'enable': {
            await ico.enableWhitelist();
            console.log({
                            whitelistEnabled: await ico.whitelistEnabled.call()
                        });
            break;
        }
        case 'is': {
            const addr = pullCmdArg('address');
            console.log({
                            address: addr,
                            whitelisted: await ico.whitelisted.call(addr)
                        });
            break;
        }
        default:
            throw new Error(`Unknown whitelist sub-command: ${wcmd || ''}`);
    }
};

// --------------------- Helpers

function pullCmdArg(name: string): address {
    const arg = ctx.cmdOpts.shift();
    if (!arg) {
        throw new Error(`Missing required ${name} argument for command`);
    }
    return arg;
}

// -------------------- Run

// Parse options
(function () {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; ++i) {
        const av = (args[i] = args[i].trim());
        if (av.charAt(0) !== '-') {
            if (ctx.cmd) {
                usage(`Command '${ctx.cmd}' already specified`);
            }
            ctx.cmd = av;
            ctx.cmdOpts = args.slice(i + 1);
            break;
        }
        if (av === '-h' || av === '--help') {
            usage();
        }
        if (av === '-v' || av === '--verbose') {
            ctx.verbose = true;
        }
        if (av === '-c' || av === '--config') {
            ctx.cfile = args[++i] || usage(`Missing '-c|--config' option value`);
        }
    }
    if (!ctx.cmd) {
        usage('No command specified');
    }
    if (!handlers[ctx.cmd]) {
        usage(`Invalid command specified: '${ctx.cmd}'`);
    }
    console.log(`Command: ${ctx.cmd} opts: `, ctx.cmdOpts);
})();

function usage(error?: string): never {
    console.error(
        'Usage: \n\tnode cli.js' +
        '\n\t[-c|--config <config yaml file>]' +
        '\n\t[-v|--verbose]' +
        '\n\t[-h|--help]' +
        '\n\t<command> [command options]' +
        '\nCommands:' +
        '\n\tdeploy               - Deploy DATO token and ICO smart contracts' +
        '\n\tstatus               - Get contracts status' +
        '\n\tico state            - Get ico state' +
        '\n\tico start <end>      - Start ICO with specified end date' +
        '\n\tico touch            - Touch ICO. Recalculate ICO state based on current block time.' +
        '\n\tico suspend          - Suspend ICO (only if ICO is Active)' +
        '\n\tico resume           - Resume ICO (only if ICO is Suspended)' +
        '\n\ttoken balance <addr> - Get token balance for address' +
        '\n\ttoken lock           - Lock token contract (no token transfers are allowed)' +
        '\n\ttoken unlock         - Unlock token contract' +
        '\n\ttoken locked         - Get tocken lock status' +
        '\n\ttoken ico            - Change ICO contract for token ' +
        '\n\tgroup reserve <addr> <group> <tokens>  - Reserve tokens (without decimals) to <addr> for <group>' +
        '\n\tgroup reserved <group> - Get number of remaining tokens for <group>' +
        '\n\twl status            - Check if whitelisting enabled ' +
        '\n\twl add <addr>        - Add <addr> to ICO whitelist ' +
        '\n\twl remove <addr>     - Remove <addr> from ICO whitelist ' +
        '\n\twl disable           - Disable address whitelisting for ICO ' +
        '\n\twl enable            - Enable address whitelisting for ICO ' +
        '\n\twl is <addr>         - Check if given <addr> in whitelist ' +
        '\n\ttune <end> <hardcap> - Set end date/hard-cap for ICO (Only in suspended state) ' +
        '\n\t                       Eg: node ./cli.js tune \'2018-12-31\' \'22000e18\'' +
        '\n\n\t\t <group> - Token reservation group: staff|utility' +
        '\n\t\t <addr> - Ethereum address' +
        '\n'
    );
    if (error) {
        console.error(error);
        process.exit(1);
    }
    process.exit();
    throw Error();
}

// Start
setup()
    .then(handlers[ctx.cmd])
    .then(() => {
        process.exit(0);
    })
    .catch(err => {
        if (err) {
            console.error(err);
        }
        process.exit(1);
    });
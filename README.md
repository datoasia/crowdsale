# DATO Crowdunding Token/ICO

# Test cases

## Requirements

* yarn package manager
* nodejs >= 8.9.x

## Run test cases
```sh
  yarn install
  npm test
```

# Token

* Code: `DATO`
* Name: `DATO token`
* Total supply: `18333333`
* Mintable: `no`

# ICO

* ETH/Token ratio: `500`
* Dates: `manual`
* Bonus: `0`
* Hard-cap: `11e6` tokens
* Minimal investor transaction: `0.1 ETH` (to avoid spam attacks)
* Token distribution/reservations:
  * Staff: `4583333`
  * Utility: `275e4` (locked for 1 year since Token deployed)
* Presale whitelist: `yes`
* Whitelist can be disabled: `yes`
* Manual cancelation: `yes`
* Invested funds: transfered to separate `Team Wallet`
* If ico hasn't reached hard-cap - it will be `teminated`

# CLI tool

DATO command line tool used to manage token and ico. First of all you have to create `cli.yml` file. 
(You can just `cp ./cli-ganache.yml ./cli.yml` then edit this file).

## Configuration
```yaml
ethereum:
  endpoint: 'http://localhost:8547/'
  from: '0x27f83c24402ddb237ab5e9ea16934e44df339dbf'
  lockfilesDir: "{cwd}"
  gas: '4e6'
  gasPrice: '30e9'
  DATOToken:
    schema: '{moduledir}/build/contracts/DATOToken.json'
    totalSupplyTokens: '18333333'
    reservedStaffTokens: '4583333'
    reservedUtilityTokens: '275e4'
  DATOICO:
    schema: '{moduledir}/build/contracts/DATOICO.json'
    teamWallet: '0x89728bcd39df4100f84e70012032bda835b7e8b5'
    hardCapWei: '22e21' #  22 000 eth
    lowCapTxWei: '1e17' # 0.1 eth
    hardCapTxWei: '22e21'
```

* Check endpoint, parity should be running and this file must exists.
* Change `from` to contract owner address.
* Create ethereum address for team wallet and set `teamWallet` appropriately.
* Check the actual gas price at https://ethgasstation.info/ and change `gas` parameter of the config.
* You need at least `0.1 eth` at `owner`s address.

## Usage 
```sh
   node ./cli.js --help
```

```
Usage: 
        node cli.js
        [-c|--config <config yaml file>]
        [-v|--verbose]
        [-h|--help]
        <command> [command options]
Commands:
        deploy               - Deploy DATO token and ICO smart contracts
        status               - Get contracts status
        ico state            - Get ico state
        ico start <end>      - Start ICO with specified end date
        ico touch            - Touch ICO. Recalculate ICO state based on current block time.
        ico suspend          - Suspend ICO (only if ICO is Active)
        ico resume           - Resume ICO (only if ICO is Suspended)
        token balance <addr> - Get token balance for address
        token lock           - Lock token contract (no token transfers are allowed)
        token unlock         - Unlock token contract
        token locked         - Get tocken lock status
        token ico            - Change ICO contract for token 
        group reserve <addr> <group> <tokens>  - Reserve tokens (without decimals) to <addr> for <group>
        group reserved <group> - Get number of remaining tokens for <group>
        wl status            - Check if whitelisting enabled 
        wl add <addr>        - Add <addr> to ICO whitelist 
        wl remove <addr>     - Remove <addr> from ICO whitelist 
        wl disable           - Disable address whitelisting for ICO 
        wl enable            - Enable address whitelisting for ICO 
        wl is <addr>         - Check if given <addr> in whitelist 
        tune <end> <hardcap> - Set end date/hard-cap for ICO (Only in suspended state) 
                               Eg: node ./cli.js tune '2018-12-31' '22000e18'

                 <group> - Token reservation group: staff|utility
                 <addr> - Ethereum address
```

### Contract deployment

* Contract deployment can be wonky process since it depends on current load of ethereum network. Please be sure that ETH network is not overloaded at time of deployment.
* Please check you have at least `0.1` eth at `owner` account.

```
node ./cli.js deploy
```

Please do not terminate deployment process by `Ctrl+C` or something else, wait until script finish its work. 
If all ok, you will get something like this:
```
Using Web3.providers.HttpProvider provider for: http://localhost:8547/
web3 node: EthereumJS TestRPC/v2.0.2/ethereum-js
w3 connected to >>>> UNKNOWN <<<<
Deployment: 'DATOToken'  { schema: './build/contracts/DATOToken.json',
  totalSupplyTokens: '18333333',
  reservedStaffTokens: '4583333',
  reservedUtilityTokens: '275e4' }
DATOToken successfully deployed at: 0xdc62191cdb013502155373815f6b81e8d19b4fbd


Deployment: 'DATOICO'  { schema: './build/contracts/DATOICO.json',
  teamWallet: '0x89728bcd39df4100f84e70012032bda835b7e8b5',
  hardCapWei: '22e21',
  lowCapTxWei: '1e17',
  hardCapTxWei: '22e21' }
DATOICO successfully deployed at: 0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467


Setting ICO for token...
```

Here: `0xdc62191cdb013502155373815f6b81e8d19b4fbd` is the address of token contract and
`0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467` address of ico contract.

## Get token and ICO status

`node ./cli.js status`

```
Command: status opts:  []
Using Web3.providers.HttpProvider provider for: http://localhost:8547/
web3 node: EthereumJS TestRPC/v2.0.2/ethereum-js
w3 connected to >>>> UNKNOWN <<<<
Loaded DATOToken instance at: 0xdc62191cdb013502155373815f6b81e8d19b4fbd
Loaded DATOICO instance at: 0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467
{
  "token": {
    "address": "0xdc62191cdb013502155373815f6b81e8d19b4fbd",
    "owner": "0x27f83c24402ddb237ab5e9ea16934e44df339dbf",
    "symbol": "DATO",
    "totalSupply": "1.8333333e+25",
    "availableSupply": "1.1e+25",
    "locked": true
  },
  "ico": {
    "address": "0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467",
    "owner": "0x27f83c24402ddb237ab5e9ea16934e44df339dbf",
    "teamWallet": "0x89728bcd39df4100f84e70012032bda835b7e8b5",
    "state": "Inactive",
    "weiCollected": "0",
    "hardCapWei": "2.2e+22",
    "lowCapTxWei": "100000000000000000",
    "hardCapTxWei": "2.2e+22"
  }
}
```

## Start ICO

`node ./cli.js ico start '2018-02-14'`

```
Command: ico opts:  [ 'start', '2018-02-14' ]
Using Web3.providers.HttpProvider provider for: http://localhost:8547/
web3 node: EthereumJS TestRPC/v2.0.2/ethereum-js
w3 connected to >>>> UNKNOWN <<<<
Loaded DATOToken instance at: 0xdc62191cdb013502155373815f6b81e8d19b4fbd
Loaded DATOICO instance at: 0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467
{ status: 'Active' }
```

ICO has successfully started. ICO finish date is 14/02/2018. 

## Disable whitelisting

`node ./cli.js wl disable`

## Distribute tokens for privileged holders

**Examples**

Assign `200` tokens (without decimal part) to someone:

`node ./cli.js group reserve 0x6cb049910482c96f5bc7767a5b2645327d18ddf6 staff 200`

Checkout token balance for `0x6cb049910482c96f5bc7767a5b2645327d18ddf6`:

`node ./cli.js token balance 0x6cb049910482c96f5bc7767a5b2645327d18ddf6`

You will get:

```
Command: token opts:  [ 'balance', '0x6cb049910482c96f5bc7767a5b2645327d18ddf6' ]
Using Web3.providers.HttpProvider provider for: http://localhost:8547/
web3 node: EthereumJS TestRPC/v2.0.2/ethereum-js
w3 connected to >>>> UNKNOWN <<<<
Loaded DATOToken instance at: 0xdc62191cdb013502155373815f6b81e8d19b4fbd
Loaded DATOICO instance at: 0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467
{
  "tokens": "200",
  "tokensWithDecimals": "200000000000000000000"
}
```

### Test with ganache

Start ganache server:
```sh
    ./run-ganache-test.sh
```

Deploy Token and ICO
```sh
    node ./cli.js -c cli-ganache.yml deploy
```


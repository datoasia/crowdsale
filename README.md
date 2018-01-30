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
* Dates: `---`
* Bonus: `0`
* Hard-cap: `11e6` tokens
* Low-cap: `6e6` tokens (???)
* Minimal investor transaction: `0.1 ETH` (to avoid spam attacks)
* Token distribution/reservations:
  * Staff: `275e4`
  * Utility: `4583333`
* Presale whitelist: `yes`
* Whitelist can be disabled: `yes`
* Manual cancelation: `yes`
* Invested funds: transfered to separate `Team Wallet`
* If pre-ico hasn't reached low-cap - it will be `teminated`

# CLI tool

```sh
   yarn install 
   npm test
   node ./cli.js --help
```

## Usage 
 TODO:
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
        tune <end> <lowcap> <hardcap> - Set end date/low-cap/hard-cap for ICO (Only in suspended state) 
                                        Eg: node ./cli.js tune '2018-12-31' '6000e18' '22000e18'

                 <group> - Token reservation group: staff|utility
                 <addr> - Ethereum address
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

Please do not terminate deployment process by Ctrl+C or something else, wait until script finish its work. If all ok, you will get something like this:
```
Using Web3.providers.HttpProvider provider for: http://localhost:8547/
web3 node: EthereumJS TestRPC/v2.0.2/ethereum-js
w3 connected to >>>> UNKNOWN <<<<
Deployment: 'DATOToken'  { schema: './build/contracts/DATOToken.json',
  totalSupplyTokens: '18333333',
  reservedStaffTokens: '275e4',
  reservedUtilityTokens: '4583333' }
DATOToken successfully deployed at: 0xdc62191cdb013502155373815f6b81e8d19b4fbd


Deployment: 'DATOICO'  { schema: './build/contracts/DATOICO.json',
  teamWallet: '0x89728bcd39df4100f84e70012032bda835b7e8b5',
  lowCapWei: '6e21',
  hardCapWei: '22e21',
  lowCapTxWei: '1e17',
  hardCapTxWei: '22e21' }
DATOICO successfully deployed at: 0xb3fb533e40dd7958a7eacc2f3cbcfa26bb4a2467


Setting ICO for token...
```
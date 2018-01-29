pragma solidity ^0.4.0;

import './commons/SafeMath.sol';
import './base/BaseICOToken.sol';

contract DATOToken is BaseICOToken {
    using SafeMath for uint;

    string public constant name = 'DATO token';

    string public constant symbol = 'DATO';

    uint8 public constant decimals = 18;

    uint internal constant ONE_TOKEN = 1e18;

    /// @dev Fired some tokens distributed to someone from staff, locked
    event ReservedTokensDistributed(address indexed to, uint8 group, uint amount);

    function DATOToken(uint totalSupplyTokens_,
        uint reservedStaffTokens_,
        uint reservedUtilityTokens_)
    BaseICOToken(totalSupplyTokens_ * ONE_TOKEN) public {
        require(availableSupply == totalSupply);
        availableSupply = availableSupply
            .sub(reservedStaffTokens_ * ONE_TOKEN)
            .sub(reservedUtilityTokens_ * ONE_TOKEN);
        reserved[RESERVED_STAFF_GROUP] = reservedStaffTokens_ * ONE_TOKEN;
        reserved[RESERVED_UTILITY_GROUP] = reservedUtilityTokens_ * ONE_TOKEN;
    }

    // Disable direct payments
    function() external payable {
        revert();
    }

    //---------------------------- DATO specific

    uint8 public RESERVED_STAFF_GROUP = 0x1;

    uint8 public RESERVED_UTILITY_GROUP = 0x2;

    /// @dev Token reservation mapping: key(RESERVED_X) => value(number of tokens)
    mapping(uint8 => uint) public reserved;

    /**
     * @dev Get reserved tokens for specific group
     */
    function getReservedTokens(uint8 group_) view public returns (uint) {
        return reserved[group_];
    }

    /**
     * @dev Assign `amount_` of privately distributed tokens
     *      to someone identified with `to_` address.
     * @param to_   Tokens owner
     * @param group_ Group identifier of privately distributed tokens
     * @param amount_ Number of tokens distributed with decimals part
     */
    function assignReserved(address to_, uint8 group_, uint amount_) onlyOwner public {
        require(to_ != address(0) && (group_ & 0x3) != 0);
        // SafeMath will check reserved[group_] >= amount
        reserved[group_] = reserved[group_].sub(amount_);
        balances[to_] = balances[to_].add(amount_);
        ReservedTokensDistributed(to_, group_, amount_);
    }
}

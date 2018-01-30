pragma solidity ^0.4.18;

import './commons/SafeMath.sol';
import './base/BaseICO.sol';

contract DATOICO is BaseICO {
    using SafeMath for uint;

    /// @dev 18 decimals for token
    uint internal constant ONE_TOKEN = 1e18;

    /// @dev 1e18 WEI == 1ETH == 500 tokens
    uint public constant ETH_TOKEN_EXCHANGE_RATIO = 500;

    function DATOICO(address icoToken_,
                     address teamWallet_,
                     uint hardCapWei_,
                     uint lowCapTxWei_,
                     uint hardCapTxWei_) public {
        require(icoToken_ != address(0) && teamWallet_ != address(0));
        token = BaseICOToken(icoToken_);
        state = State.Inactive;
        teamWallet = teamWallet_;
        hardCapWei = hardCapWei_;
        lowCapTxWei = lowCapTxWei_;
        hardCapTxWei = hardCapTxWei_;
    }

    /**
     * @dev Recalculate ICO state based on current block time.
     * Should be called periodically by ICO owner.
     */
    function touch() public {
        if (state != State.Active && state != State.Suspended) {
            return;
        }
        if (collectedWei >= hardCapWei) {
            state = State.Completed;
            endAt = block.timestamp;
            ICOCompleted(collectedWei);
        } else if (block.timestamp >= endAt) {
            state = State.NotCompleted;
            ICONotCompleted();
        }
    }

    function buyTokens() public payable {
        require(state == State.Active &&
                block.timestamp <= endAt &&
                msg.value >= lowCapTxWei &&
                msg.value <= hardCapTxWei &&
                collectedWei + msg.value <= hardCapWei &&
                whitelisted(msg.sender));
        uint iwei = msg.value;
        uint itokens = iwei * ETH_TOKEN_EXCHANGE_RATIO;
        token.icoInvestment(msg.sender, itokens); // Transfer tokens to investor
        collectedWei = collectedWei.add(iwei);
        ICOInvestment(msg.sender, iwei, itokens, 0);
        forwardFunds();
        touch();
    }

    /**
     * Accept direct payments
     */
    function() external payable {
        buyTokens();
    }
}

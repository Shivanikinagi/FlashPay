// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RejectPayment
 * @dev Test contract that rejects incoming payments
 * Used for testing VoidTx's error handling
 */
contract RejectPayment {
    // Reject all incoming payments
    receive() external payable {
        revert("Payment rejected");
    }
    
    fallback() external payable {
        revert("Payment rejected");
    }
}

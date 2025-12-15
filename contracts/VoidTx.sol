// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VoidTx
 * @dev Batch payment contract with safe transfer handling and detailed event logging
 * @notice Allows users to send payments to multiple recipients in a single transaction
 */
contract VoidTx {
    
    // ============ Events ============
    
    /**
     * @dev Emitted when a batch payment is initiated
     * @param sender Address of the sender
     * @param totalRecipients Total number of recipients in the batch
     * @param totalAmount Total amount sent (excluding gas)
     * @param timestamp Block timestamp when payment was made
     */
    event BatchPaymentInitiated(
        address indexed sender,
        uint256 totalRecipients,
        uint256 totalAmount,
        uint256 timestamp
    );
    
    /**
     * @dev Emitted for each successful payment
     * @param sender Address of the sender
     * @param recipient Address of the recipient
     * @param amount Amount sent
     * @param index Index in the batch
     */
    event PaymentSuccess(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 index
    );
    
    /**
     * @dev Emitted when a payment fails
     * @param sender Address of the sender
     * @param recipient Address that failed to receive
     * @param amount Amount that failed to send
     * @param index Index in the batch
     * @param reason Reason for failure
     */
    event PaymentFailed(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 index,
        string reason
    );
    
    /**
     * @dev Emitted when batch payment is completed
     * @param sender Address of the sender
     * @param successCount Number of successful payments
     * @param failureCount Number of failed payments
     * @param totalProcessed Total amount successfully sent
     */
    event BatchPaymentCompleted(
        address indexed sender,
        uint256 successCount,
        uint256 failureCount,
        uint256 totalProcessed
    );
    
    // ============ State Variables ============
    
    // Track total payments processed
    uint256 public totalPaymentsProcessed;
    
    // Track total volume
    uint256 public totalVolumeProcessed;
    
    // Minimum amount per transaction (to prevent spam)
    uint256 public constant MIN_AMOUNT = 0.0001 ether;
    
    // Maximum recipients per batch (to prevent gas issues)
    uint256 public constant MAX_RECIPIENTS = 100;
    
    // ============ Structs ============
    
    /**
     * @dev Payment information structure
     * @param recipient Address to receive payment
     * @param amount Amount to send
     */
    struct Payment {
        address payable recipient;
        uint256 amount;
    }
    
    /**
     * @dev Payment result structure
     * @param success Whether payment succeeded
     * @param recipient Recipient address
     * @param amount Amount sent/attempted
     */
    struct PaymentResult {
        bool success;
        address recipient;
        uint256 amount;
    }
    
    // ============ Modifiers ============
    
    /**
     * @dev Validates payment array
     */
    modifier validPayments(Payment[] calldata payments) {
        require(payments.length > 0, "No payments provided");
        require(payments.length <= MAX_RECIPIENTS, "Too many recipients");
        _;
    }
    
    // ============ Main Functions ============
    
    /**
     * @dev Batch payment function - sends funds to multiple recipients
     * @param payments Array of Payment structs containing recipient and amount
     * @return results Array of PaymentResult structs showing success/failure per payment
     * 
     * Features:
     * - Validates total amount matches msg.value
     * - Continues processing even if individual payments fail
     * - Emits detailed events for tracking
     * - Returns remaining funds if any payments fail
     */
    function batchPay(Payment[] calldata payments) 
        external 
        payable 
        validPayments(payments)
        returns (PaymentResult[] memory results)
    {
        uint256 totalRequired = 0;
        uint256 paymentsLength = payments.length;
        
        // Calculate total required amount and validate each payment
        for (uint256 i = 0; i < paymentsLength; i++) {
            require(payments[i].recipient != address(0), "Invalid recipient address");
            require(payments[i].amount >= MIN_AMOUNT, "Amount too small");
            totalRequired += payments[i].amount;
        }
        
        // Ensure sender sent enough funds
        require(msg.value >= totalRequired, "Insufficient funds sent");
        
        // Emit batch initiation event
        emit BatchPaymentInitiated(
            msg.sender,
            paymentsLength,
            totalRequired,
            block.timestamp
        );
        
        // Initialize results array
        results = new PaymentResult[](paymentsLength);
        
        uint256 successCount = 0;
        uint256 failureCount = 0;
        uint256 totalProcessed = 0;
        
        // Process each payment with safe transfer
        for (uint256 i = 0; i < paymentsLength; i++) {
            Payment calldata payment = payments[i];
            
            // Attempt safe transfer
            (bool success, ) = payment.recipient.call{value: payment.amount}("");
            
            // Record result
            results[i] = PaymentResult({
                success: success,
                recipient: payment.recipient,
                amount: payment.amount
            });
            
            if (success) {
                successCount++;
                totalProcessed += payment.amount;
                
                emit PaymentSuccess(
                    msg.sender,
                    payment.recipient,
                    payment.amount,
                    i
                );
            } else {
                failureCount++;
                
                emit PaymentFailed(
                    msg.sender,
                    payment.recipient,
                    payment.amount,
                    i,
                    "Transfer failed"
                );
            }
        }
        
        // Update global stats
        totalPaymentsProcessed += successCount;
        totalVolumeProcessed += totalProcessed;
        
        // Emit completion event
        emit BatchPaymentCompleted(
            msg.sender,
            successCount,
            failureCount,
            totalProcessed
        );
        
        // Return any failed payment amounts back to sender
        uint256 failedAmount = totalRequired - totalProcessed;
        if (failedAmount > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: failedAmount}("");
            require(refundSuccess, "Refund failed");
        }
        
        // Return excess funds if any
        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            (bool excessRefund, ) = payable(msg.sender).call{value: excess}("");
            require(excessRefund, "Excess refund failed");
        }
        
        return results;
    }
    
    /**
     * @dev Helper function to estimate total cost for a batch
     * @param payments Array of payments to estimate
     * @return total Total amount needed
     */
    function estimateBatchCost(Payment[] calldata payments) 
        external 
        pure 
        returns (uint256 total) 
    {
        for (uint256 i = 0; i < payments.length; i++) {
            total += payments[i].amount;
        }
        return total;
    }
    
    /**
     * @dev Get contract statistics
     * @return paymentsProcessed Total number of successful payments
     * @return volumeProcessed Total volume processed in wei
     */
    function getStats() 
        external 
        view 
        returns (uint256 paymentsProcessed, uint256 volumeProcessed) 
    {
        return (totalPaymentsProcessed, totalVolumeProcessed);
    }
    
    // ============ Receive Function ============
    
    /**
     * @dev Reject direct ETH transfers
     */
    receive() external payable {
        revert("Use batchPay function");
    }
    
    /**
     * @dev Reject calls to non-existent functions
     */
    fallback() external payable {
        revert("Function does not exist");
    }
}

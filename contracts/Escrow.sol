// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Escrow {

	enum Status {
		Open,
		Approved,
		Denied
	}

	modifier onlyArbiter {
		require(msg.sender == arbiter, "Only the arbiter of this contract can perform this action");
		_;
	}

	event Approved(uint);
	event Denied(uint);

	address public arbiter;
	address public beneficiary;
	address public depositor;

	Status public status;

	constructor(address _arbiter, address _beneficiary) payable {
		arbiter = _arbiter;
		beneficiary = _beneficiary;
		depositor = msg.sender;
		status = Status.Open;
	}

	function approve() external onlyArbiter {
		uint balance = address(this).balance;
		(bool sent, ) = payable(beneficiary).call{value: balance}("");
 		require(sent, "Failed to send Ether");
		emit Approved(balance);
		status = Status.Approved;
	}

	function deny() external onlyArbiter {
		uint balance = address(this).balance;
		(bool sent, ) = payable(depositor).call{value: balance}("");
		require(sent, "Failed to send Ether");
		emit Denied(balance);
		status = Status.Denied;
	}
}

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

	/*
	To reward the arbiter for their services (and the gas they have to pay) we need to provide some incentives.
	The arbiter should receive a small percentage of the escrow amount, with a minimum and maximum cap.
	The arbiter always gets their reward, no matter if the escrow was approved or denied, so that they don't get any
	personal benefit either way to increase the chances of fair play.
	*/
	uint64 private constant ARBITER_REWARD_MIN_CAP_WEI = 1000000000000000; // 0.001 ETH
	uint64 private constant ARBITER_REWARD_MAX_CAP_WEI = 100000000000000000; // 0.1 ETH
	uint8 private constant ARBITER_REWARD_PERCENT = 5;

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
		uint arbiterCut = calcArbiterCut(balance);
		uint beneficiaryCut = balance - arbiterCut;
		(bool sent, ) = payable(beneficiary).call{value: beneficiaryCut}("");
 		require(sent, "Failed to send Ether");
		(bool sent2, ) = payable(arbiter).call{value: arbiterCut}("");
		require(sent2, "Failed to send Ether");
		emit Approved(balance);
		status = Status.Approved;
	}

	function deny() external onlyArbiter {
		uint balance = address(this).balance;
		uint arbiterCut = calcArbiterCut(balance);
		uint depositorRefund = balance - arbiterCut;
		(bool sent, ) = payable(depositor).call{value: depositorRefund}("");
		require(sent, "Failed to send Ether");
		(bool sent2, ) = payable(arbiter).call{value: arbiterCut}("");
		require(sent2, "Failed to send Ether");
		emit Denied(balance);
		status = Status.Denied;
	}

	function calcArbiterCut(uint value) internal pure returns(uint) {
		uint cutByPercentage = value * ARBITER_REWARD_PERCENT / 100;
		if (cutByPercentage < ARBITER_REWARD_MIN_CAP_WEI) {
			return ARBITER_REWARD_MIN_CAP_WEI;
		}
		if (cutByPercentage > ARBITER_REWARD_MAX_CAP_WEI) {
			return ARBITER_REWARD_MAX_CAP_WEI;
		}
		return cutByPercentage;
	}
}

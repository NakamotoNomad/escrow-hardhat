import {ethers} from "ethers";
import { STATUS_OPEN, STATUS_APPROVED, STATUS_DENIED } from './Constants';

export default function Escrow({
  address,
  arbiter,
  beneficiary,
  value,
  handleApprove,
  handleDeny,
  status,
}) {
  let approveButtonText;
  if (status === STATUS_OPEN) {
    approveButtonText = "Approve";
  } else if (status === STATUS_APPROVED) {
    approveButtonText = "✓ It's been approved!";
  } else if (status === STATUS_DENIED) {
    approveButtonText = "x It's been denied!";
  }
  return (
    <div className="existing-contract">
      <ul className="fields">
        <li>
          <div> Arbiter </div>
          <div> {arbiter} </div>
        </li>
        <li>
          <div> Beneficiary </div>
          <div> {beneficiary} </div>
        </li>
        <li>
          <div> Value (ETH) </div>
          <div title={"Wei: " + value}> {ethers.utils.formatEther(value)} </div>
        </li>
        <div
          className={status !== STATUS_OPEN ? "complete" : "button"}
          id={address}
          onClick={(e) => {
            e.preventDefault();

            handleApprove();
          }}
        >
          {approveButtonText}
        </div>
        { status === STATUS_OPEN ? (
          <div
              className={"button"}
              id={address}
              onClick={(e) => {
                e.preventDefault();

                handleDeny();
              }}
          >
            {"Deny"}
          </div>
        ) : null }
      </ul>
    </div>
  );
}

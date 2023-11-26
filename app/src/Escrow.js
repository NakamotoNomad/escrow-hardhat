import {ethers} from "ethers";

export default function Escrow({
  address,
  arbiter,
  beneficiary,
  value,
  handleApprove,
  approved,
}) {
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
          className={approved ? "complete" : "button"}
          id={address}
          onClick={(e) => {
            e.preventDefault();

            handleApprove();
          }}
        >
          {approved ? "✓ It's been approved!" : "Approve"}
        </div>
      </ul>
    </div>
  );
}

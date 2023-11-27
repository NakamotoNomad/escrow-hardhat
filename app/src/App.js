import {BigNumber, ethers} from 'ethers';
import { useEffect, useState } from 'react';
import deploy from './deploy';
import Escrow from './Escrow';
import { STATUS_OPEN, STATUS_APPROVED, STATUS_DENIED } from './Constants';

const provider = new ethers.providers.Web3Provider(window.ethereum);

const REGEX_ETH_AMOUNT = /^[0-9]*\.?[0-9]{0,18}$/;

const ESCROW_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_arbiter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_beneficiary",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "Approved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "Denied",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "arbiter",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "beneficiary",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deny",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "depositor",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "status",
    "outputs": [
      {
        "internalType": "enum Escrow.Status",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function approve(escrowContract, signer) {
  const approveTxn = await escrowContract.connect(signer).approve();
  await approveTxn.wait();
}

export async function deny(escrowContract, signer) {
  const denyTxn = await escrowContract.connect(signer).deny();
  await denyTxn.wait();
}


function App() {
  const [escrows, setEscrows] = useState([]);
  const [account, setAccount] = useState();
  const [signer, setSigner] = useState();
  const [ethAmount, setEthAmount] = useState("");

  useEffect(() => {
    getAccounts();
  }, [account]);

  useEffect(() => {
    fetch('http://localhost:3001/getContracts')
        .then(response => response.json())
        .then(data => {
          createEscrowsForAddresses(data); // ignore return value, it'll update the state accordingly
        })
        .catch(error => {
          console.error('Error fetching data: ', error);
        });
  }, []);

  async function getAccounts() {
    const accounts = await provider.send('eth_requestAccounts', []);

    setAccount(accounts[0]);
    setSigner(provider.getSigner());
  }

  const updateEscrowStatus = (address, newStatus) => {
    setEscrows(escrows => escrows.map(escrow =>
        escrow.address === address ? { ...escrow, status: newStatus } : escrow
    ));
  };

  async function newContract() {
    const beneficiary = document.getElementById('beneficiary').value;
    const arbiter = document.getElementById('arbiter').value;
    const valueEthString = String(document.getElementById('eth').value);
    const valueWei = ethers.utils.parseEther(valueEthString);
    const escrowContract = await deploy(signer, arbiter, beneficiary, valueWei);

    console.log(`Escrow contract created at address: ${escrowContract.address}`);

    const escrow = createEscrow(escrowContract, arbiter, beneficiary, valueWei, STATUS_OPEN);

    fetch(`http://localhost:3001/contractDeployed/${escrowContract.address}`, {
      method: 'POST',
    })
        .catch(error => {
          console.error('Error sending data:', error);
        });

    setEscrows([...escrows, escrow]);
  }

  function createEscrow(escrowContract, arbiter, beneficiary, valueWei, status) {
    return {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: valueWei.toString(),
      status,
      handleApprove: async () => {
        /*
        In React, state updates are asynchronous. When you update a state variable "signer", the updated value isn't
        available immediately after the state-setting function is called. Instead, it's available on the next render of
        the component.
        Because of this we get the signer from the provider instead of relying on the state variable.
         */
        let currentSigner = signer;
        if (!signer) {
          await getAccounts();
          currentSigner = provider.getSigner();
        }
        escrowContract.on('Approved', () => {
          updateEscrowStatus(escrowContract.address, STATUS_APPROVED);
        });

        console.log(`Handling approve for contract ${escrowContract.address} with signer ${currentSigner}`);
        await approve(escrowContract, currentSigner);
      },
      handleDeny: async () => {
        let currentSigner = signer;
        if (!signer) {
          await getAccounts();
          currentSigner = provider.getSigner();
        }
        escrowContract.on('Denied', () => {
          updateEscrowStatus(escrowContract.address, STATUS_DENIED);
        });

        console.log(`Handling deny for contract ${escrowContract.address} with signer ${currentSigner}`);
        await deny(escrowContract, currentSigner);
      },
    };
  }

  const handleEthChange = (event) => {
    const { value } = event.target;
    if (REGEX_ETH_AMOUNT.test(value) || value === '') {
      setEthAmount(value);
    }
  };

  const generateAmountTitle = (event) => {
    return ethAmount ? "Wei: " + ethers.utils.parseEther(ethAmount) : "";
  };

  async function createEscrowsForAddresses(addresses) {
    console.log("Loading escrow objects for addresses: " + JSON.stringify(addresses));

    const newEscrows = [];
    for (const address of addresses) {
      const contract = new ethers.Contract(address, ESCROW_ABI, provider);

      const arbiterAddress = await contract.arbiter();
      const beneficiaryAddress = await contract.beneficiary();
      const status = await contract.status();
      let valueWei = await provider.getBalance(address);
      const transferredAmount = await loadTransferredAmount(contract);
      valueWei = valueWei.add(transferredAmount)
      console.log(`Contract ${address}:\nArbiter: ${arbiterAddress}, beneficiary: ${beneficiaryAddress}, value wei (total): ${valueWei}, approved amount: ${transferredAmount}`);
      const escrow = createEscrow(contract, arbiterAddress, beneficiaryAddress, valueWei, status);
      newEscrows.push(escrow);
    }
    setEscrows([...escrows, ...newEscrows]);
  }

  async function loadTransferredAmount(contract) {
    // Query the event logs for the 'Approved' event
    const approveEvents = await contract.queryFilter(contract.filters.Approved());

    if (approveEvents.length > 0) {
      return approveEvents[0].args[0];
    }

    const denyEvents = await contract.queryFilter(contract.filters.Denied());

    if (denyEvents.length > 0) {
      return denyEvents[0].args[0];
    }
    return BigNumber.from(0);
  }

  return (
    <>
      <div className="contract">
        <h1> New Contract </h1>
        <label>
          Arbiter Address
          <input type="text" id="arbiter" />
        </label>

        <label>
          Beneficiary Address
          <input type="text" id="beneficiary" />
        </label>

        <label>
          Deposit Amount (in Eth)
          <input type="text" id="eth" value={ethAmount} onChange={handleEthChange} title={generateAmountTitle()} />
        </label>

        <div
          className="button"
          id="deploy"
          onClick={(e) => {
            e.preventDefault();

            newContract();
          }}
        >
          Deploy
        </div>
      </div>

      <div className="existing-contracts">
        <h1> Existing Contracts </h1>

        <div id="container">
          {escrows.map((escrow) => {
            return <Escrow key={escrow.address} {...escrow} />;
          })}
        </div>
      </div>
    </>
  );
}

export default App;

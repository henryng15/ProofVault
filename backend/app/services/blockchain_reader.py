from web3 import Web3

from app.core.config import settings

# ProofCreated event ABI — tells web3 how to decode the event log.
# This must match exactly what's in ProofVault.sol.
PROOF_CREATED_ABI = [
    {
        "type": "event",
        "name": "ProofCreated",
        "anonymous": False,
        "inputs": [
            {"type": "address", "name": "owner",     "indexed": True},
            {"type": "bytes32", "name": "caseId",    "indexed": True},
            {"type": "bytes32", "name": "fileHash",  "indexed": True},
            {"type": "uint256", "name": "timestamp", "indexed": False},
        ],
    }
]


def get_file_hash_from_blockchain(tx_hash: str, contract_address: str) -> str:
    """
    Fetches the transaction receipt from Polygon Amoy using the tx_hash,
    decodes the ProofCreated event log, and returns the fileHash that
    was stored on-chain at the time of proof creation.

    This is the ground truth — nobody can tamper with this value.
    """
    w3 = Web3(Web3.HTTPProvider(settings.amoy_rpc_url))

    # Fetch the full transaction receipt from the blockchain.
    # This contains all the event logs emitted during the transaction.
    receipt = w3.eth.get_transaction_receipt(tx_hash)
    if receipt is None:
        raise LookupError(f"transaction {tx_hash} not found on blockchain")

    # Create a contract instance just for decoding the event logs.
    # We don't need the full ABI — just the ProofCreated event definition.
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=PROOF_CREATED_ABI,
    )

    # Decode all ProofCreated events from the receipt logs.
    events = contract.events.ProofCreated().process_receipt(receipt)
    if not events:
        raise LookupError("no ProofCreated event found in this transaction")

    # Extract fileHash from the first event.
    # It comes back as bytes — convert to hex string for comparison.
    file_hash_bytes: bytes = events[0]["args"]["fileHash"]
    return file_hash_bytes.hex()

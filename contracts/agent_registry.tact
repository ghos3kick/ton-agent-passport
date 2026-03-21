import "@stdlib/deploy";
import "@stdlib/ownable";
import "./agent_passport";

// ===== Messages =====

message MintPassport {
    queryId: Int as uint64;
    owner: Address;
    capabilities: String;
    endpoint: String;
    metadataUrl: String;
}

message PublicMintPassport {
    owner: Address;
    endpoint: String;
    capabilities: String;
    metadataUrl: String;
}

message SetMintFee {
    fee: Int as coins;
}

message Withdraw {
    amount: Int as coins;
    to: Address;
}

message BatchIncrementTxCount {
    queryId: Int as uint64;
    agentIndex: Int as uint64;
}

message BatchUpdateCapabilities {
    queryId: Int as uint64;
    agentIndex: Int as uint64;
    newCapabilities: String;
}

// ===== Structs =====

struct CollectionData {
    nextItemIndex: Int;
    content: Cell;
    owner: Address;
}

// ===== Contract =====

const PASSPORT_DEPLOY_COST: Int = ton("0.05");
const GAS_RESERVE: Int = ton("0.06");

contract AgentRegistry with Deployable, Ownable {
    owner: Address;
    nextItemIndex: Int as uint64;
    collectionContent: Cell;
    mintFee: Int as coins;

    init(owner: Address, collectionContent: Cell) {
        self.owner = owner;
        self.nextItemIndex = 0;
        self.collectionContent = collectionContent;
        self.mintFee = ton("0.05");
    }

    // ===== Internal helper =====

    // Note: String length validation is enforced at the API layer (max 256 chars).
    // On-chain, cell size limits (~127 bytes per cell) provide a natural bound;
    // storeStringRefTail auto-chains cells but gas cost grows with length.
    fun mintInternal(owner: Address, capabilities: String, endpoint: String, metadataUrl: String) {
        let index: Int = self.nextItemIndex;
        let initData: StateInit = initOf AgentPassport(myAddress(), index);
        let itemAddress: Address = contractAddress(initData);

        let contentCell: Cell = beginCell()
            .storeUint(1, 8)
            .storeSlice(metadataUrl.asSlice())
            .endCell();

        send(SendParameters{
            to: itemAddress,
            value: PASSPORT_DEPLOY_COST,
            mode: SendPayGasSeparately,
            code: initData.code,
            data: initData.data,
            body: SetupPassport{
                owner: owner,
                authority: myAddress(),
                capabilities: capabilities,
                endpoint: endpoint,
                metadataUrl: metadataUrl,
                content: contentCell,
            }.toCell(),
        });

        self.nextItemIndex += 1;
    }

    // ===== Mint handlers =====

    // Admin mint (owner only, no fee)
    receive(msg: MintPassport) {
        self.requireOwner();
        self.mintInternal(msg.owner, msg.capabilities, msg.endpoint, msg.metadataUrl);
    }

    // Public mint (anyone, pays mintFee)
    receive(msg: PublicMintPassport) {
        let minPayment: Int = self.mintFee + GAS_RESERVE;
        require(context().value >= minPayment, "Insufficient payment");

        self.mintInternal(msg.owner, msg.capabilities, msg.endpoint, msg.metadataUrl);

        // Return excess to sender
        let excess: Int = context().value - self.mintFee - GAS_RESERVE;
        if (excess > ton("0.01")) {
            send(SendParameters{
                to: sender(),
                value: excess,
                mode: SendIgnoreErrors,
                bounce: true,
                body: "Mint excess".asComment(),
            });
        }
    }

    // ===== Fee management =====

    receive(msg: SetMintFee) {
        self.requireOwner();
        require(msg.fee <= ton("10"), "Fee too high");
        self.mintFee = msg.fee;
    }

    // ===== Withdraw =====

    receive(msg: Withdraw) {
        self.requireOwner();
        require(msg.amount > 0, "Amount must be positive");
        require(myBalance() - msg.amount >= ton("0.1"), "Keep min balance");

        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            mode: SendIgnoreErrors,
            bounce: true,
            body: "Withdraw".asComment(),
        });
    }

    // Forward increment to a specific passport
    receive(msg: BatchIncrementTxCount) {
        self.requireOwner();

        let initData: StateInit = initOf AgentPassport(myAddress(), msg.agentIndex);
        let itemAddress: Address = contractAddress(initData);

        send(SendParameters{
            to: itemAddress,
            value: 0,
            mode: SendRemainingValue,
            body: IncrementTxCount{
                queryId: msg.queryId,
            }.toCell(),
        });
    }

    // Forward capability update to a specific passport
    receive(msg: BatchUpdateCapabilities) {
        self.requireOwner();

        let initData: StateInit = initOf AgentPassport(myAddress(), msg.agentIndex);
        let itemAddress: Address = contractAddress(initData);

        send(SendParameters{
            to: itemAddress,
            value: 0,
            mode: SendRemainingValue,
            body: UpdateCapabilities{
                queryId: msg.queryId,
                newCapabilities: msg.newCapabilities,
            }.toCell(),
        });
    }



    // ===== Getters =====

    // TEP-62: Collection data
    get fun get_collection_data(): CollectionData {
        return CollectionData{
            nextItemIndex: self.nextItemIndex,
            content: self.collectionContent,
            owner: self.owner,
        };
    }

    // TEP-62: Get NFT (passport) address by index
    get fun get_nft_address_by_index(index: Int): Address {
        let initData: StateInit = initOf AgentPassport(myAddress(), index);
        return contractAddress(initData);
    }

    // TEP-62: Get NFT content
    get fun get_nft_content(index: Int, individualContent: Cell): Cell {
        return individualContent;
    }

    // Custom: Total registered agents
    get fun get_agent_count(): Int {
        return self.nextItemIndex;
    }

    // Mint fee
    get fun mintFee(): Int {
        return self.mintFee;
    }
}

import "@stdlib/deploy";

// ===== Messages =====

message(0x5fcc3d14) Transfer {
    queryId: Int as uint64;
    newOwner: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x04ded148) ProveOwnership {
    queryId: Int as uint64;
    dest: Address;
    forwardPayload: Cell;
    withContent: Bool;
}

message(0x0524c7ae) OwnershipProof {
    queryId: Int as uint64;
    itemId: Int as uint256;
    owner: Address;
    data: Cell;
    revokedAt: Int as uint64;
    content: Cell?;
}

message(0xd0c3bfea) RequestOwner {
    queryId: Int as uint64;
    dest: Address;
    forwardPayload: Cell;
    withContent: Bool;
}

message(0x0dd607e3) OwnerInfo {
    queryId: Int as uint64;
    itemId: Int as uint256;
    initiator: Address;
    owner: Address;
    data: Cell;
    revokedAt: Int as uint64;
    content: Cell?;
}

message(0x6f89f5e3) Revoke {
    queryId: Int as uint64;
}

message(0x1f04537a) Destroy {
    queryId: Int as uint64;
}

// Sent by collection to initialize the SBT item after deploy
message SetupPassport {
    owner: Address;
    authority: Address;
    capabilities: String;
    endpoint: String;
    metadataUrl: String;
    content: Cell;
}

// Sent by owner to update endpoint
message UpdateEndpoint {
    queryId: Int as uint64;
    newEndpoint: String;
}

// Sent by authority (registry) to increment tx counter
message IncrementTxCount {
    queryId: Int as uint64;
}

// Sent by authority to update capabilities
message UpdateCapabilities {
    queryId: Int as uint64;
    newCapabilities: String;
}

// ===== Structs =====

struct NftData {
    isInitialized: Bool;
    index: Int;
    collection: Address;
    owner: Address;
    content: Cell;
}

struct PassportData {
    owner: Address;
    capabilities: String;
    endpoint: String;
    metadataUrl: String;
    createdAt: Int;
    txCount: Int;
    revokedAt: Int;
}

// ===== Contract =====

contract AgentPassport {
    collection: Address;
    index: Int as uint64;
    owner: Address;
    authority: Address;
    content: Cell;
    capabilities: String;
    endpoint: String;
    metadataUrl: String;
    createdAt: Int as uint64;
    txCount: Int as uint64;
    revokedAt: Int as uint64;
    isInitialized: Bool;

    init(collection: Address, index: Int) {
        self.collection = collection;
        self.index = index;
        self.owner = newAddress(0, 0);
        self.authority = newAddress(0, 0);
        self.content = emptyCell();
        self.capabilities = "";
        self.endpoint = "";
        self.metadataUrl = "";
        self.createdAt = 0;
        self.txCount = 0;
        self.revokedAt = 0;
        self.isInitialized = false;
    }

    // Initialize passport data — only collection can call
    receive(msg: SetupPassport) {
        require(sender() == self.collection, "Only collection");
        require(!self.isInitialized, "Already initialized");
        self.owner = msg.owner;
        self.authority = msg.authority;
        self.content = msg.content;
        self.capabilities = msg.capabilities;
        self.endpoint = msg.endpoint;
        self.metadataUrl = msg.metadataUrl;
        self.createdAt = now();
        self.isInitialized = true;
    }

    // SBT: REJECT transfers
    receive(msg: Transfer) {
        require(false, "SBT: transfer not allowed");
    }

    // TEP-85: Prove ownership (owner only)
    receive(msg: ProveOwnership) {
        require(self.isInitialized, "Not initialized");
        require(sender() == self.owner, "Only owner");
        let content: Cell? = msg.withContent ? self.content : null;
        send(SendParameters{
            to: msg.dest,
            value: 0,
            mode: SendRemainingValue,
            body: OwnershipProof{
                queryId: msg.queryId,
                itemId: self.index,
                owner: self.owner,
                data: msg.forwardPayload,
                revokedAt: self.revokedAt,
                content: content,
            }.toCell(),
        });
    }

    // TEP-85: Request owner (anyone can call)
    receive(msg: RequestOwner) {
        require(self.isInitialized, "Not initialized");
        let content: Cell? = msg.withContent ? self.content : null;
        send(SendParameters{
            to: msg.dest,
            value: 0,
            mode: SendRemainingValue,
            body: OwnerInfo{
                queryId: msg.queryId,
                itemId: self.index,
                initiator: sender(),
                owner: self.owner,
                data: msg.forwardPayload,
                revokedAt: self.revokedAt,
                content: content,
            }.toCell(),
        });
    }

    // TEP-85: Revoke (authority only)
    receive(msg: Revoke) {
        require(self.isInitialized, "Not initialized");
        require(sender() == self.authority, "Only authority");
        require(self.revokedAt == 0, "Already revoked");
        self.revokedAt = now();
    }

    // TEP-85: Destroy (owner only)
    receive(msg: Destroy) {
        require(self.isInitialized, "Not initialized");
        require(sender() == self.owner, "Only owner");
        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance | SendDestroyIfZero,
            body: emptyCell(),
        });
    }

    // Owner updates endpoint (blocked after revocation)
    receive(msg: UpdateEndpoint) {
        require(self.isInitialized, "Not initialized");
        require(self.revokedAt == 0, "Passport revoked");
        require(sender() == self.owner, "Only owner");
        self.endpoint = msg.newEndpoint;
    }

    // Authority increments tx count
    receive(msg: IncrementTxCount) {
        require(self.isInitialized, "Not initialized");
        require(sender() == self.authority, "Only authority");
        self.txCount += 1;
    }

    // Authority updates capabilities
    receive(msg: UpdateCapabilities) {
        require(self.isInitialized, "Not initialized");
        require(sender() == self.authority, "Only authority");
        self.capabilities = msg.newCapabilities;
    }

    // ===== Getters =====

    // TEP-62: Standard NFT data
    get fun get_nft_data(): NftData {
        return NftData{
            isInitialized: self.isInitialized,
            index: self.index,
            collection: self.collection,
            owner: self.owner,
            content: self.content,
        };
    }

    // TEP-85: Authority address
    get fun get_authority_address(): Address {
        return self.authority;
    }

    // TEP-85: Revoked time
    get fun get_revoked_time(): Int {
        return self.revokedAt;
    }

    // Custom: Full passport data
    get fun get_passport_data(): PassportData {
        return PassportData{
            owner: self.owner,
            capabilities: self.capabilities,
            endpoint: self.endpoint,
            metadataUrl: self.metadataUrl,
            createdAt: self.createdAt,
            txCount: self.txCount,
            revokedAt: self.revokedAt,
        };
    }
}

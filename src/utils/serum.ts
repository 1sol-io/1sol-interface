import { u64 } from "@solana/spl-token";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SERUM_OPEN_ORDERS_LAYOUT_V2 } from "../models";

export class SerumDexOpenOrders {
  private _programId: PublicKey;

  public address: PublicKey;
  public market!: PublicKey;
  public owner!: PublicKey;

  public baseTokenFree!: u64;
  public baseTokenTotal!: u64;
  public quoteTokenFree!: u64;
  public quoteTokenTotal!: u64;
  public freeSlotBits!: BN;
  public isBidBits!: BN;

  constructor(address: PublicKey, decoded: any, programId: PublicKey) {
    this.address = address;
    this._programId = programId;
    this.market = decoded.market;
    this.owner = decoded.owner;
    this.baseTokenFree = new u64(decoded.baseTokenFree);
    this.baseTokenTotal = new u64(decoded.baseTokenTotal);
    this.quoteTokenFree = new u64(decoded.quoteTokenFree);
    this.quoteTokenTotal = new u64(decoded.quoteTokenTotal);
    this.freeSlotBits = new BN(decoded.freeSlotBits);
    this.isBidBits = new BN(decoded.freeSlotBits);
  }

  static getLayout() {
    return SERUM_OPEN_ORDERS_LAYOUT_V2;
  }

  static async findForMarketAndOwner(
    connection: Connection,
    marketAddress: PublicKey,
    ownerAddress: PublicKey,
    programId: PublicKey,
  ): Promise<SerumDexOpenOrders[]> {
    const filters = [
      {
        memcmp: {
          offset: this.getLayout().offsetOf('market'),
          bytes: marketAddress.toBase58(),
        },
      },
      {
        memcmp: {
          offset: this.getLayout().offsetOf('owner'),
          bytes: ownerAddress.toBase58(),
        },
      },
      {
        dataSize: this.getLayout().span,
      },
    ];
    const accounts = await connection.getProgramAccounts(
      programId,
      { filters },
    );
    // @ts-ignore
    return accounts.map(({ pubkey, account }) => {
      try {
        return SerumDexOpenOrders.fromAccountInfo(pubkey, account, programId)
      } catch(e) {
        return null
      }
    }).filter((item) => item);
  }

  static async load(
    connection: Connection,
    address: PublicKey,
    programId: PublicKey,
  ) {
    const accountInfo = await connection.getAccountInfo(address);
    if (accountInfo === null) {
      throw new Error('Open orders account not found');
    }
    return SerumDexOpenOrders.fromAccountInfo(address, accountInfo, programId);
  }

  static fromAccountInfo(
    address: PublicKey,
    accountInfo: AccountInfo<Buffer>,
    programId: PublicKey,
  ) {
    const { owner, data } = accountInfo;
    if (!owner.equals(programId)) {
      throw new Error('Address not owned by program');
    }
    const decoded = this.getLayout().decode(data);
    if (!decoded.accountFlags.initialized || !decoded.accountFlags.openOrders) {
      throw new Error('Invalid open orders account');
    }
    return new SerumDexOpenOrders(address, decoded, programId);
  }
}
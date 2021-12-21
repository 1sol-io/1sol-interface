import * as BufferLayout from "buffer-layout";
import {
  publicKeyLayout,
  uint64,
} from '../utils/layout';

export class WideBits extends BufferLayout.Layout {
  private _lower: any;
  private _upper: any;

  constructor(property?: string) {
    super(8, property);
    this._lower = BufferLayout.bits(BufferLayout.u32(), false);
    this._upper = BufferLayout.bits(BufferLayout.u32(), false);
  }

  addBoolean(property: string) {
    if (this._lower.fields.length < 32) {
      this._lower.addBoolean(property);
    } else {
      this._upper.addBoolean(property);
    }
  }

  decode(b: Buffer, offset = 0) {
    const lowerDecoded = this._lower.decode(b, offset);
    const upperDecoded = this._upper.decode(b, offset + this._lower.span);
    return { ...lowerDecoded, ...upperDecoded };
  }

  encode(src: any, b: Buffer, offset = 0) {
    return (
      this._lower.encode(src, b, offset) +
      this._upper.encode(src, b, offset + this._lower.span)
    );
  }
}

const ACCOUNT_FLAGS_LAYOUT = new WideBits();

ACCOUNT_FLAGS_LAYOUT.addBoolean('initialized');
ACCOUNT_FLAGS_LAYOUT.addBoolean('market');
ACCOUNT_FLAGS_LAYOUT.addBoolean('openOrders');
ACCOUNT_FLAGS_LAYOUT.addBoolean('requestQueue');
ACCOUNT_FLAGS_LAYOUT.addBoolean('eventQueue');
ACCOUNT_FLAGS_LAYOUT.addBoolean('bids');
ACCOUNT_FLAGS_LAYOUT.addBoolean('asks');

export function accountFlagsLayout(property = 'accountFlags') {
  return ACCOUNT_FLAGS_LAYOUT.replicate(property);
}

export const SERUM_MARKET_LAYOUT_V2 = BufferLayout.struct([
  BufferLayout.blob(5),
  accountFlagsLayout('accountFlags'),
  publicKeyLayout('ownAddress'),
  uint64('vaultSignerNonce'),
  publicKeyLayout('baseMint'),
  publicKeyLayout('quoteMint'),
  publicKeyLayout('baseVault'),
  uint64('baseDepositsTotal'),
  uint64('baseFeesAccrued'),
  publicKeyLayout('quoteVault'),
  uint64('quoteDepositsTotal'),
  uint64('quoteFeesAccrued'),
  uint64('quoteDustThreshold'),
  publicKeyLayout('requestQueue'),
  publicKeyLayout('eventQueue'),
  publicKeyLayout('bids'),
  publicKeyLayout('asks'),
  uint64('baseLotSize'),
  uint64('quoteLotSize'),
  uint64('feeRateBps'),
  uint64('referrerRebatesAccrued'),
  BufferLayout.blob(7),
]);

export const SERUM_OPEN_ORDERS_LAYOUT_V2 = BufferLayout.struct<any>([
  BufferLayout.blob(5),
  accountFlagsLayout('accountFlags'),
  publicKeyLayout('market'),
  publicKeyLayout('owner'),

  // These are in spl-token (i.e. not lot) units
  uint64('baseTokenFree'),
  uint64('baseTokenTotal'),
  uint64('quoteTokenFree'),
  uint64('quoteTokenTotal'),
  BufferLayout.blob(16, 'freeSlotBits'),
  BufferLayout.blob(16, 'isBidBits'),
  BufferLayout.blob(2048, 'orders'),
  BufferLayout.blob(1024, 'orders'),
  uint64('referrerRebatesAccrued'),
  BufferLayout.blob(7),
]);



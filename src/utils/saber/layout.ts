import * as BufferLayout from "buffer-layout";

const publicKeyLayout = (property: string = "publicKey"): Object => {
  return BufferLayout.blob(32, property);
};

const uint64 = (property: string = "uint64"): Object => {
  return BufferLayout.blob(8, property);
};

/**
 * Raw representation of fees.
 */
export interface RawFees {
  adminTradeFeeNumerator: Uint8Array;
  adminTradeFeeDenominator: Uint8Array;
  adminWithdrawFeeNumerator: Uint8Array;
  adminWithdrawFeeDenominator: Uint8Array;
  tradeFeeNumerator: Uint8Array;
  tradeFeeDenominator: Uint8Array;
  withdrawFeeNumerator: Uint8Array;
  withdrawFeeDenominator: Uint8Array;
}

/**
 * Layout for StableSwap fees
 */
export const FeesLayout = BufferLayout.struct(
  [
    uint64("adminTradeFeeNumerator"),
    uint64("adminTradeFeeDenominator"),
    uint64("adminWithdrawFeeNumerator"),
    uint64("adminWithdrawFeeDenominator"),
    uint64("tradeFeeNumerator"),
    uint64("tradeFeeDenominator"),
    uint64("withdrawFeeNumerator"),
    uint64("withdrawFeeDenominator"),
  ],
  "fees"
);

/**
 * Layout for stable swap state
 */
export const StableSwapLayout = BufferLayout.struct([
  BufferLayout.u8("isInitialized"),
  BufferLayout.u8("isPaused"),
  BufferLayout.u8("nonce"),
  uint64("initialAmpFactor"),
  uint64("targetAmpFactor"),
  BufferLayout.ns64("startRampTs"),
  BufferLayout.ns64("stopRampTs"),
  BufferLayout.ns64("futureAdminDeadline"),
  publicKeyLayout("futureAdminAccount"),
  publicKeyLayout("adminAccount"),
  publicKeyLayout("tokenAccountA"),
  publicKeyLayout("tokenAccountB"),
  publicKeyLayout("tokenPool"),
  publicKeyLayout("mintA"),
  publicKeyLayout("mintB"),
  publicKeyLayout("adminFeeAccountA"),
  publicKeyLayout("adminFeeAccountB"),
  FeesLayout,
]);
/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} data
* @returns {ChainlinkPrice}
*/
export function unpack_chainlink(data: Uint8Array): ChainlinkPrice;
/**
*/
export class ChainlinkPrice {
  free(): void;
/**
* @param {Uint8Array | undefined} price
* @param {number} decimals
*/
  constructor(price: Uint8Array | undefined, decimals: number);
/**
*/
  decimals: number;
/**
* @returns {Uint8Array | undefined}
*/
  price?: Uint8Array;
}

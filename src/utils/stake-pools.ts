import {
  PublicKey,
  AccountInfo,
  Connection,
  TransactionInstruction,
  Signer,
} from '@solana/web3.js';
import * as BufferLayout from 'buffer-layout';
import * as Borsh from '@project-serum/borsh';
import BN from 'bn.js';
import {
  u64,
  TOKEN_PROGRAM_ID,
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AccountLayout as TokenAccountLayout,
} from '@solana/spl-token';

export const PROGRAM_ID = new PublicKey("h54bWSBT3rJJHy3TqahB2r72jhuRYeFdoyrAK4r6aGK");

const STAKE_POOL_V1_LAYOUT = BufferLayout.struct([
  BufferLayout.u8('version'),
  Borsh.bool('isInitialized'),
  Borsh.bool('isClosed'),
  BufferLayout.u8('bumpSeed'),
  Borsh.bool('enableDeposit'),
  Borsh.bool('enableWithdraw'),
  Borsh.u64('depositCapacity'),
  Borsh.u64('minimumDepositAmount'),
  Borsh.u64('maximumDepositAmount'),
  Borsh.u64('totalDepositAmount'),
  Borsh.u64('poolTokenSupply'),
  Borsh.u64('depositOffset'),
  Borsh.u64('rewardOffset'),
  Borsh.publicKey('owner'),
  Borsh.publicKey('poolMint'),
  BufferLayout.u8('poolMintDecimals'),
  Borsh.publicKey('stakeMint'),
  BufferLayout.u8('stakeMintDecimals'),
  Borsh.publicKey('stakeTokenAccount'),
  Borsh.publicKey('rewardMint'),
  BufferLayout.u8('rewardMintDecimals'),
  Borsh.publicKey('rewardTokenAccount'),
  Borsh.u64('depositFeeDenominator'),
  Borsh.u64('depositFeeNumerator'),
  Borsh.u64('withdrawalFeeDenominator'),
  Borsh.u64('withdrawalFeeNumerator'),
]);

export interface Fee {
  denominator: u64;
  numerator: u64;
}

export interface StakePoolV1Info {
  pubkey: PublicKey,
  programId: PublicKey,
  isClosed: boolean;
  bumpSeed: number;
  enableDeposit: boolean;
  enableWithdraw: boolean;
  depositCapacity: u64;
  minimumDepositAmount: u64;
  maximumDepositAmount: u64;
  totalDepositAmount: u64;
  poolTokenSupply: u64;
  depositOffset: BN;
  rewardOffset: BN;
  owner: PublicKey,
  authority: PublicKey,
  poolMint: PublicKey,
  poolMintDecimals: number,
  stakeMint: PublicKey,
  stakeMintDecimals: number,
  stakeTokenAccount: PublicKey,
  rewardMint: PublicKey,
  rewardMintDecimals: number,
  rewardTokenAccount: PublicKey,
  depositFee: Fee;
  withdrawalFee: Fee;
}

export interface TokenAccountData {
  pubkey: PublicKey;
  programId: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  delegate: PublicKey | null;
  closeAuthority: PublicKey | null;
  balance: u64;
  isNative: boolean;
  isInitialized: boolean;
  isFrozen: boolean;
}

export class StakePool {

  public constructor(
    public programId: PublicKey,
    private connection: Connection,
  ) {
    this.programId = programId
    this.connection = connection
  }

  public static async unpackStakePoolV1Info(
    { pubkey, account }: {
      pubkey: PublicKey,
      account: AccountInfo<Buffer>,
    }): Promise<StakePoolV1Info> {
    const decoded: any = STAKE_POOL_V1_LAYOUT.decode(account.data);
    if (decoded.version !== 0) {
      throw new Error('Unsupported version');
    }
    const authority = await PublicKey.createProgramAddress(
      [pubkey.toBuffer()].concat(Buffer.from([decoded.bumpSeed])),
      account.owner,
    )
    return {
      pubkey,
      programId: account.owner,
      isClosed: decoded.isClosed,
      bumpSeed: decoded.bumpSeed,
      enableDeposit: decoded.enableDeposit,
      enableWithdraw: decoded.enableWithdraw,
      depositCapacity: decoded.depositCapacity,
      minimumDepositAmount: decoded.minimumDepositAmount,
      maximumDepositAmount: decoded.maximumDepositAmount,
      totalDepositAmount: new u64(decoded.totalDepositAmount),
      poolTokenSupply: new u64(decoded.poolTokenSupply),
      depositOffset: decoded.depositOffset,
      rewardOffset: decoded.rewardOffset,
      owner: decoded.owner,
      authority,
      poolMint: decoded.poolMint,
      poolMintDecimals: decoded.poolMintDecimals,
      stakeMint: decoded.stakeMint,
      stakeMintDecimals: decoded.stakeMintDecimals,
      stakeTokenAccount: decoded.stakeTokenAccount,
      rewardMint: decoded.rewardMint,
      rewardMintDecimals: decoded.rewardMintDecimals,
      rewardTokenAccount: decoded.rewardTokenAccount,
      depositFee: {
        denominator: decoded.depositFeeDenominator,
        numerator: decoded.depositFeeNumerator,
      },
      withdrawalFee: {
        denominator: decoded.withdrawalFeeDenominator,
        numerator: decoded.withdrawalFeeNumerator,
      },
    }
  }

  public static async loadStakePoolV1Info({
    pubkey, connection,
  }: {
    pubkey: PublicKey
    connection: Connection
  }): Promise<StakePoolV1Info | null> {
    const account = await connection.getAccountInfo(pubkey);
    if (!account) {
      return null;
    }
    return StakePool.unpackStakePoolV1Info({ pubkey, account });
  }

  public static async getPoolMintTokenAccount(
    {
      wallet, poolMint,
    }: {
      wallet: PublicKey,
      poolMint: PublicKey,
    }
  ): Promise<PublicKey> {
    return await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, poolMint, wallet)
  }

  public static async loadPoolMinTokenInfo(
    {
      connection, wallet, stakeInfo,
    }: {
      connection: Connection,
      wallet: PublicKey,
      stakeInfo: StakePoolV1Info,
    }
  ): Promise<TokenAccountData | null> {
    const tokenAddress = await StakePool.getPoolMintTokenAccount({ wallet, poolMint: stakeInfo.poolMint })
    const acc = await connection.getAccountInfo(tokenAddress)
    if (!acc) {
      return null
    }
    const decoded = TokenAccountLayout.decode(acc.data)
    const delegate = decoded.delegateOption === 0 ? null : new PublicKey(decoded.delegate)
    const closeAuthority = decoded.closeAuthorityOption === 0 ? null : new PublicKey(decoded.closeAuthority)

    let isNative = false;
    if (decoded.isNativeOption === 1) {
      isNative = true;
    } else {
      isNative = false;
    }
    const mint = new PublicKey(decoded.mint);
    return {
      pubkey: tokenAddress,
      programId: acc.owner,
      mint: mint,
      owner: new PublicKey(decoded.owner),
      delegate,
      closeAuthority,
      balance: u64.fromBuffer(decoded.balance),
      isNative,
      isInitialized: decoded.state !== 0,
      isFrozen: decoded.state === 2,
    }
  }

  public async createDepositV1(
    {
      stakePoolInfo, sourceTokenAccount, wallet, amount, instructions
    }: {
      stakePoolInfo: StakePoolV1Info,
      sourceTokenAccount: PublicKey,
      amount: number,
      wallet: PublicKey,
      instructions: TransactionInstruction[]
    }
  ) {
    const tokenAddress = await StakePool.getPoolMintTokenAccount({ wallet, poolMint: stakePoolInfo.poolMint })
    const acc = await this.connection.getAccountInfo(tokenAddress)
    if (!acc) {
      instructions.push(Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, stakePoolInfo.poolMint, tokenAddress, wallet, wallet
      ))
    }
    instructions.push(StakePool.makeDepositV1Instruction({
      stakePoolInfo,
      sourceTokenAccount,
      sourcePoolTokenAccount: tokenAddress,
      amount,
      wallet,
    }))
  }

  public static makeDepositV1Instruction(
    { stakePoolInfo, sourceTokenAccount, sourcePoolTokenAccount, wallet, amount }: {
      stakePoolInfo: StakePoolV1Info,
      sourceTokenAccount: PublicKey,
      sourcePoolTokenAccount: PublicKey,
      amount: number,
      wallet: PublicKey,
    }
  ) {
    const keys = [
      { pubkey: stakePoolInfo.pubkey, isSigner: false, isWritable: true },
      { pubkey: stakePoolInfo.authority, isSigner: false, isWritable: false },
      { pubkey: stakePoolInfo.poolMint, isSigner: false, isWritable: true },
      { pubkey: stakePoolInfo.stakeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: sourcePoolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Borsh.u64('amount'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    const instruction = {
      instruction: 3,
      amount: new u64(amount),
    }
    dataLayout.encode(instruction, data);
    return new TransactionInstruction({
      keys,
      programId: stakePoolInfo.programId,
      data
    });
  }

  public async createWithdrawV1(
    {
      stakePoolInfo, wallet, amount, instructions
    }: {
      stakePoolInfo: StakePoolV1Info,
      amount: number,
      wallet: PublicKey,
      instructions: TransactionInstruction[],
    }
  ) {
    const rewardTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, stakePoolInfo.rewardMint, wallet
    )
    const poolTokenAddress = await StakePool.getPoolMintTokenAccount(
      { wallet, poolMint: stakePoolInfo.poolMint }
    )
    const stakeTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, stakePoolInfo.stakeMint, wallet,
    )
    const [rewardTokenAccInfo, poolTokenAccInfo, stakeTokenAccInfo] =
      await this.connection.getMultipleAccountsInfo([rewardTokenAddress, poolTokenAddress, stakeTokenAddress])
    if (!rewardTokenAccInfo) {
      instructions.push(Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, stakePoolInfo.rewardMint, rewardTokenAddress, wallet, wallet
      ))
    }
    if (!poolTokenAccInfo) {
      throw new Error("Pool token account not found")
    }
    if (!stakeTokenAccInfo) {
      instructions.push(Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, stakePoolInfo.stakeMint, stakeTokenAddress, wallet, wallet
      ))
    }
    instructions.push(StakePool.makeWithdrawV1Instruction({
      stakePoolInfo,
      destinationStakeTokenAccount: stakeTokenAddress,
      destinationRewardTokenAccount: rewardTokenAddress,
      sourcePoolTokenAccount: poolTokenAddress,
      amount,
      wallet,
    }));
  }

  public static makeWithdrawV1Instruction(
    { stakePoolInfo, destinationStakeTokenAccount, destinationRewardTokenAccount, sourcePoolTokenAccount, wallet, amount }: {
      stakePoolInfo: StakePoolV1Info,
      sourcePoolTokenAccount: PublicKey,
      destinationStakeTokenAccount: PublicKey,
      destinationRewardTokenAccount: PublicKey,
      amount: number,
      wallet: PublicKey,
    }
  ) {
    const keys = [
      { pubkey: stakePoolInfo.pubkey, isSigner: false, isWritable: true },
      { pubkey: stakePoolInfo.authority, isSigner: false, isWritable: false },
      { pubkey: stakePoolInfo.poolMint, isSigner: false, isWritable: true },
      { pubkey: stakePoolInfo.stakeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: stakePoolInfo.rewardTokenAccount, isSigner: false, isWritable: true },
      { pubkey: destinationStakeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: destinationRewardTokenAccount, isSigner: false, isWritable: true },
      { pubkey: sourcePoolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Borsh.u64('amount'),
    ]);
    const data = Buffer.alloc(dataLayout.span);
    const instruction = {
      instruction: 3,
      amount: new u64(amount),
    }
    dataLayout.encode(instruction, data);
    return new TransactionInstruction({
      keys,
      programId: stakePoolInfo.programId,
      data
    });
  }
}
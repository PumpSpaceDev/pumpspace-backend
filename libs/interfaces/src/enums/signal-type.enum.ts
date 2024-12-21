/**
 * Types of signals that can be generated in the system
 */
export enum SignalType {
  /**
   * Buy signal indicating a potential entry point
   */
  BUY = 'buy',

  /**
   * Sell signal indicating a potential exit point
   */
  SELL = 'sell',

  /**
   * Hold signal indicating to maintain current position
   */
  HOLD = 'hold',
}

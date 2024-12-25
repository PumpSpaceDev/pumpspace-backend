export interface RpcResourceMonitor {
  /**
   * get the unique identifier of the request for counting the number of requests.
   * @returns
   */
  getIdentifier: () => string;

  /**
   * callback function, triggered when the number of executions of a certain identifier exceeds the limit.
   * @param identifier
   * @param count
   * @returns
   */
  callback: (identifier: string, count: number) => void;

  /**
   * get the maximum number of executions for each identifier.
   * @returns
   */
  getMaxExecutions: () => number;
}

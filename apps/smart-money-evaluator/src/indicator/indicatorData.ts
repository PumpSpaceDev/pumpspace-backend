import { IndicatorGraph, IndicatorName } from './indicatorGraph';

export class IndicatorData {
  private name: IndicatorName;
  private value: number[];
  private calculationLogic: (
    dependencies: {
      [key in IndicatorName]?: IndicatorData;
    },
    number: number[],
  ) => number[];
  private scoreLogic: (value: number[]) => number;

  constructor(name: IndicatorName) {
    this.name = name;
    this.value = [];
    this.calculationLogic = IndicatorGraph.getCalculationLogic(name);
    this.scoreLogic = IndicatorGraph.getScoreLogic(name);
  }

  getName(): IndicatorName {
    return this.name;
  }

  calculate(indicators: { [key in IndicatorName]: IndicatorData }): number[] {
    this.value = this.calculationLogic(indicators, this.value);
    return this.value;
  }

  calculateScore(): number {
    return this.scoreLogic(this.value);
  }

  getValue(): number[] {
    return this.value;
  }

  setValue(value: number[]): void {
    this.value = value;
  }
}

export interface LoopGuardState {
  maxSteps: number;
  toolBudget: number;
  steps: number;
  toolCalls: number;
  failures: number;
  repeatedFailures: number;
  lastAction: string;
  lastFingerprint: string;
  history: string[];
}

export class AgentLoopGuard {
  readonly state: LoopGuardState;
  constructor(maxSteps = 16, toolBudget = 12) {
    this.state = { maxSteps, toolBudget, steps:0, toolCalls:0, failures:0, repeatedFailures:0, lastAction:'', lastFingerprint:'', history:[] };
  }
  canContinue(): boolean { return this.state.steps < this.state.maxSteps && this.state.toolCalls < this.state.toolBudget; }
  beginStep(): void { this.state.steps += 1; }
  record(action:string, parameters:any, success:boolean): { repeated:boolean; stop:boolean } {
    this.state.toolCalls += 1;
    if (!success) this.state.failures += 1;
    const fingerprint = `${action}:${JSON.stringify(parameters || {})}`;
    const repeated = fingerprint === this.state.lastFingerprint;
    if (repeated && !success) this.state.repeatedFailures += 1; else if (!repeated) this.state.repeatedFailures = 0;
    this.state.lastAction = action;
    this.state.lastFingerprint = fingerprint;
    this.state.history.push(fingerprint);
    if (this.state.history.length > 20) this.state.history.shift();
    return { repeated, stop: this.state.repeatedFailures >= 2 || !this.canContinue() };
  }
  summary() { return { ...this.state, remainingSteps:Math.max(0,this.state.maxSteps-this.state.steps), remainingToolCalls:Math.max(0,this.state.toolBudget-this.state.toolCalls) }; }
}

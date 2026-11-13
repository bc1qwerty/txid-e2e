import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * 초록 뒤에 숨는 것 둘을 CI 주석(::warning::)으로 끌어낸다.
 *  - 재시도로 통과한 테스트(flaky): `retries: 1` 이 가려서 아무 신호 없이 지나간다.
 *  - 건너뛴 테스트: «남의 서버가 안 닿는다»·«유료 글이 없다» 로 건너뛰면 그 검사는 안 돈 것이다.
 * 실행 결론은 바꾸지 않는다.
 */
export default class FlakyReporter implements Reporter {
  private flaky = new Set<string>();
  private skipped = new Set<string>();

  onTestEnd(test: TestCase, result: TestResult) {
    const name = test.titlePath().slice(2).join(' › ');
    if (result.status === 'passed' && result.retry > 0) this.flaky.add(name);
    if (result.status === 'skipped') this.skipped.add(name);
  }

  onEnd() {
    for (const n of this.flaky) console.log(`::warning title=flaky (재시도로 통과)::${n}`);
    for (const n of this.skipped) console.log(`::warning title=skipped (검사 안 됨)::${n}`);
  }
}

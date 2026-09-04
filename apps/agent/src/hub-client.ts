import type { AgentSettings, Job, JobEvent, PairRequest, PairResponse, StackInfo } from "@everygithub/protocol";

/** 허브 REST 클라이언트. 에이전트는 허브에 아웃바운드 요청만 한다. */
export class HubClient {
  constructor(private hubUrl: string, private token?: string) {}

  private async req<T>(method: string, p: string, body?: unknown): Promise<T> {
    const res = await fetch(new URL(p, this.hubUrl), {
      method,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  pair(input: PairRequest) {
    return this.req<PairResponse>("POST", "/api/agent/pair", input);
  }

  /** 사이트에서 설정한 값 (워크스페이스·API 키·정책) */
  settings() {
    return this.req<AgentSettings>("GET", "/api/agent/settings");
  }

  /** 다음 큐 잡을 가져오며 last_seen 갱신. 없으면 null */
  nextJob() {
    return this.req<{ job: Job | null }>("GET", "/api/agent/jobs/next").then((r) => r.job);
  }

  /** 폴더 선택창 결과 등으로 디바이스 설정 갱신 */
  updateDevice(patch: { workspacePath?: string }) {
    return this.req<{ ok: true }>("PATCH", "/api/agent/device", patch);
  }

  pushEvents(jobId: string, events: JobEvent[]) {
    return this.req<{ ok: true }>("POST", `/api/agent/jobs/${jobId}/events`, { events });
  }

  complete(jobId: string, result: {
    status: "done" | "failed";
    error?: string;
    repo?: { localPath: string; stack: StackInfo | null; license: string | null; ref: string | null };
    artifacts?: Record<string, string>;
  }) {
    return this.req<{ ok: true }>("POST", `/api/agent/jobs/${jobId}/complete`, result);
  }
}

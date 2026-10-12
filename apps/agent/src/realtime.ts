/**
 * 사이트 → PC 깨우기 수신기. Supabase Realtime(Phoenix 웹소켓)에 공개 브로드캐스트 채널 하나를 열어두고
 * "job" / "settings" 신호만 받는다. 내용은 없고, 신호를 받으면 평소처럼 허브 API 로 가져간다.
 * 외부 라이브러리 없이 Node 22+ 의 내장 WebSocket 만 사용. 없으면 connected=false 로 남고 폴링이 대신한다.
 */
export type WakeEvent = "job" | "settings";

export class WakeListener {
  private ws: WebSocket | null = null;
  private cfg: { url: string; anonKey: string; topic: string } | null = null;
  private hb: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private backoff = 1000;
  private ref = 0;
  connected = false;
  get available() { return typeof (globalThis as any).WebSocket === "function"; }

  constructor(private onEvent: (e: WakeEvent) => void, private log: (line: string) => void = () => {}) {}

  /** 설정이 바뀌면 다시 호출 — 같은 토픽이면 아무 일도 안 함 */
  connect(cfg: { url: string; anonKey: string; topic: string }) {
    if (!this.available) return;
    if (this.cfg && this.cfg.url === cfg.url && this.cfg.topic === cfg.topic && (this.ws || this.retry)) return;
    this.cfg = cfg;
    this.close();
    this.open();
  }

  close() {
    if (this.hb) clearInterval(this.hb); this.hb = null;
    if (this.retry) clearTimeout(this.retry); this.retry = null;
    const ws = this.ws; this.ws = null; this.connected = false;
    try { ws?.close(); } catch {}
  }

  private open() {
    if (!this.cfg) return;
    const { url, anonKey, topic } = this.cfg;
    const wsUrl = `${url.replace(/^http/, "ws").replace(/\/$/, "")}/realtime/v1/websocket?apikey=${encodeURIComponent(anonKey)}&vsn=1.0.0`;
    let ws: WebSocket;
    try { ws = new (globalThis as any).WebSocket(wsUrl); } catch (e) { this.scheduleRetry(); return; }
    this.ws = ws;
    const send = (msg: object) => { try { ws.send(JSON.stringify(msg)); } catch {} };
    ws.onopen = () => {
      send({ topic: `realtime:${topic}`, event: "phx_join", ref: String(++this.ref),
        payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, postgres_changes: [], private: false }, access_token: anonKey } });
      this.hb = setInterval(() => send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++this.ref) }), 25_000);
    };
    ws.onmessage = (ev: MessageEvent) => {
      let m: any; try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.event === "phx_reply" && m.payload?.status === "ok" && !this.connected) { this.connected = true; this.backoff = 1000; this.log("realtime connected"); }
      if (m.event === "phx_reply" && m.payload?.status === "error") { this.log("realtime join error: " + JSON.stringify(m.payload)); }
      if (m.event === "broadcast") {
        const e = m.payload?.event;
        if (e === "job" || e === "settings") this.onEvent(e);
      }
    };
    ws.onclose = () => { if (this.ws === ws) { this.connected = false; this.ws = null; if (this.hb) clearInterval(this.hb); this.hb = null; this.scheduleRetry(); } };
    ws.onerror = () => { /* onclose 가 뒤따른다 */ };
  }

  private scheduleRetry() {
    if (this.retry) return;
    const wait = this.backoff; this.backoff = Math.min(this.backoff * 2, 60_000);
    this.log(`realtime disconnected → retry in ${wait}ms`);
    this.retry = setTimeout(() => { this.retry = null; this.open(); }, wait);
  }
}

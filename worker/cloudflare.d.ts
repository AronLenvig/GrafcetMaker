/**
 * The parts of the Cloudflare Workers runtime API used by worker/collab.ts (Durable Objects with
 * WebSocket hibernation), declared here instead of pulling in @cloudflare/workers-types, whose
 * globals would clash with the DOM types the app is checked against.
 */
declare module 'cloudflare:workers' {
  /** A WebSocket as the Workers runtime hands it to a Durable Object. */
  export interface CfWebSocket {
    readonly readyState: number;
    send(message: string): void;
    close(code?: number, reason?: string): void;
    serializeAttachment(value: unknown): void;
    deserializeAttachment(): unknown;
  }

  export interface DurableObjectStorage {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    deleteAll(): Promise<void>;
    setAlarm(scheduledTime: number): Promise<void>;
  }

  /** A runtime global (not exported by this module); see worker/collab.ts. */
  export interface WebSocketRequestResponsePair {
    readonly request: string;
    readonly response: string;
  }

  export interface DurableObjectState {
    readonly storage: DurableObjectStorage;
    acceptWebSocket(ws: CfWebSocket, tags?: string[]): void;
    getWebSockets(tag?: string): CfWebSocket[];
    setWebSocketAutoResponse(pair?: WebSocketRequestResponsePair): void;
  }

  export interface DurableObjectStub {
    fetch(request: Request): Promise<Response>;
  }

  export interface DurableObjectNamespace {
    idFromName(name: string): unknown;
    get(id: unknown): DurableObjectStub;
  }

  export abstract class DurableObject<Env = unknown> {
    protected readonly ctx: DurableObjectState;
    protected readonly env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }
}

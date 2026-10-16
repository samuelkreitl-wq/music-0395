declare module 'osc' {
  export class UDPPort {
    constructor(options: { localAddress: string; localPort: number; remoteAddress: string; remotePort: number; metadata: boolean });
    on(event: string, cb: (...args: any[]) => void): void;
    open(): void; close(): void; send(message: { address: string; args: { type: string; value: string | number }[] }): void;
  }
}

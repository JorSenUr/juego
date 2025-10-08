declare module 'react-native-zeroconf' {
  export default class Zeroconf {
    on(event: string, callback: (service: any) => void): void;
    scan(type: string, protocol: string): void;
    stop(): void;
    publishService(name: string, type: string, protocol: string, port: number, txt?: Record<string, string>): void;
    unpublishService(name: string): void;
  }
}
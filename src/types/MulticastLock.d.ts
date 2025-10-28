declare module 'react-native' {
  interface NativeModulesStatic {
    MulticastLock: {
      acquire(): Promise<string>;
      release(): Promise<string>;
    };
  }
}

export {};
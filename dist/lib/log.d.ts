export namespace Logger {
    export function log(...args: any[]): void;
    export function error(...args: any[]): void;
    export function warn(...args: any[]): void;
    export function info(...args: any[]): void;
    export function printMessages(allMessages: any): void;
    export function setLevel(level: string | number, ...args: any[]): void;
    export { levels };
}
declare namespace levels {
    export const ALL: number;
    export const INFO: number;
    export const WARN: number;
    export const ERROR: number;
    export const NONE: number;
}
export {};

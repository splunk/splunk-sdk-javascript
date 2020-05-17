export declare const Logger: {
    log: (...args: any[]) => void;
    error: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    info: (...args: any[]) => void;
    printMessages: (allMessages: any) => void;
    setLevel: (level: string | number, ...args: any[]) => void;
    levels: {
        "ALL": number;
        "INFO": number;
        "WARN": number;
        "ERROR": number;
        "NONE": number;
    };
};
export declare const Context: any;
export declare const Service: any;
export declare const Http: any;
export declare const Utils: typeof import("./lib/utils");
export declare const Async: typeof import("./lib/async");
export declare const Paths: any;
export declare const Class: any;
export declare const ModularInputs: typeof import("./lib/modularinputs");

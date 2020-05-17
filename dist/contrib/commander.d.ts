declare const _exports: any;
export = _exports;
export var Command: typeof Command;
export var Option: typeof Option;
/**
 * Initialize a new `Command`.
 *
 * @param {String} name
 * @api public
 */
declare function Command(name: string): void;
declare class Command {
    /**
     * Initialize a new `Command`.
     *
     * @param {String} name
     * @api public
     */
    constructor(name: string);
    commands: any[];
    options: any[];
    args: any[];
    name: string;
    opts: {};
    /**
     * Inherit from `EventEmitter.prototype`.
     */
    __proto__: any;
    command(name: string): Command;
    parseExpectedArgs(args: any[]): Command;
    action(fn: Function): Command;
    option(flags: string, description: string, fn: any, defaultValue: any, isRequired: any): Command;
    parse(argv: any[]): Command;
    rawArgs: any[];
    normalize(args: any[]): any[];
    parseArgs(args: any[], unknown: any, required: any): Command;
    executedCommand: any;
    optionFor(arg: string): Option;
    parseOptions(argv: any[]): any[];
    missingArgument(name: string): void;
    optionMissingArgument(option: string, flag: string): void;
    optionMissing(option: string): void;
    unknownOption(flag: string): void;
    version(str: string, flags: string, ...args: any[]): Command;
    _version: string;
    description(str: string, ...args: any[]): string | Command;
    _description: string;
    usage(str: string, ...args: any[]): string | Command;
    _usage: string;
    largestOptionLength(): number;
    optionHelp(): string;
    commandHelp(): string;
    helpInformation(): string;
    promptForNumber(str: string, fn: Function): void;
    promptForDate(str: string, fn: Function): void;
    promptSingleLine(str: string, fn: Function, ...args: any[]): any;
    promptMultiLine(str: string, fn: Function): void;
    prompt(str: string, fn: Function, ...args: any[]): any;
    password(str: string, mask: string, fn: Function): void;
    confirm(str: string, fn: Function): void;
    choose(list: any[], fn: Function): void;
}
/**
 * Initialize a new `Option` with the given `flags` and `description`.
 *
 * @param {String} flags
 * @param {String} description
 * @api public
 */
declare function Option(flags: string, description: string): void;
declare class Option {
    /**
     * Initialize a new `Option` with the given `flags` and `description`.
     *
     * @param {String} flags
     * @param {String} description
     * @api public
     */
    constructor(flags: string, description: string);
    flags: string;
    required: number;
    optional: number;
    bool: boolean;
    short: any;
    long: any;
    description: string;
    name(): string;
    is(arg: string): boolean;
}

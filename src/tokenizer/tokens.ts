import { TagAttribute } from "../attribute";

export type TokenBase = {
    start: number;
    end: number;
};

export type TokenText = TokenBase & {
    type: "text";
};

export type TokenCode = TokenBase & {
    type: "code";
    quote: string;
};

export type TokenOpenTag = TokenBase & {
    type: "openTag";
    tagName: string;
    attributes: TagAttribute[];
    isSelfClosing: boolean;
};

export type TokenCloseTag = TokenBase & {
    type: "closeTag";
    tagName: string;
};

export type Token = TokenText | TokenCode | TokenOpenTag | TokenCloseTag;

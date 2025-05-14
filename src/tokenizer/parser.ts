import { TagAttribute } from "../attribute";
import { AppError } from "../error";

export type Parser = {
    text: string,
    offset: number,
};

export const createParser = (text: string): Parser => ({
    text,
    offset: 0,
});

export const isParserEnd = (parser: Parser): boolean => (
    parser.offset >= parser.text.length
);

export const startParserTransaction = <T>(parser: Parser, cb: (parser: Parser) => (T | null)): T | null => {
    const initialOffset = parser.offset;
    let result: T | null = null;
    try {
        result = cb(parser);
    } catch (error) {
        parser.offset = initialOffset;

        throw new AppError("Parser transaction error", {
            data: {
                offset: parser.offset,
                initialOffset,
                textLength: parser.text.length,
                text: parser.text,
            },
            cause: error,
        });
    }

    if (result === null) {
        parser.offset = initialOffset;
        return null;
    }

    if (parser.offset > parser.text.length) {
        throw new AppError("Parser offset exceeds text length", {
            data: {
                offset: parser.offset,
                textLength: parser.text.length,
                text: parser.text,
            },
        });
    }

    if (parser.offset < initialOffset) {
        throw new AppError("Parser offset is less than initial offset", {
            data: {
                offset: parser.offset,
                initialOffset,
                textLength: parser.text.length,
                text: parser.text,
            },
        });
    }

    return result;
};

/**
 * Skip whitespace characters in the parser's text.
 * @returns The number of whitespace characters skipped.
 */
export const skipWhitespace = (parser: Parser): number => {
    const startOffset = parser.offset;
    while (parser.offset < parser.text.length && /\s/.test(parser.text.charAt(parser.offset))) {
        ++parser.offset;
    }

    return parser.offset - startOffset;
};

export const skipPattern = (parser: Parser, pattern: RegExp): string | null => {
    if (pattern.global) {
        throw new AppError("Pattern should not be global", { data: { pattern } });
    }

    if (pattern.source.charAt(0) !== "^") {
        throw new AppError("Pattern should start with ^", { data: { pattern } });
    }

    const match = parser.text.slice(parser.offset).match(pattern);

    parser.offset += match?.[0].length ?? 0;

    return match?.[0] ?? null;
};

export const TAG_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9.-]*/;
export const skipTagName = (parser: Parser): string | null => (
    skipPattern(parser, TAG_NAME_PATTERN)
);

export const ATTRIBUTE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*/;
export const skipAttributeName = (parser: Parser): string | null => (
    skipPattern(parser, ATTRIBUTE_NAME_PATTERN)
);

export const skipAttributeValue = (parser: Parser): string | null => (
    skipStringLiteral(parser,)?.value ?? null
);

export const skipString = (parser: Parser, str: string): boolean => {
    const strLength = str.length;
    const text = parser.text.slice(parser.offset, parser.offset + strLength);
    if (text === str) {
        parser.offset += strLength;
        return true;
    }
    return false;
};

export type Quote = "'" | "\"" | "`";

export const skipStringLiteral = (
    parser: Parser,
    allowedQuotes?: Quote[],
) => startParserTransaction<{ value: string, quote: Quote }>(parser, (parser) => {
    const start = parser.offset;

    const quote = skipPattern(parser, /^['"`]/) as (Quote | null);
    if (!quote) {
        return null;
    }

    if (allowedQuotes && !allowedQuotes.includes(quote)) {
        return null;
    }

    while (parser.offset < parser.text.length) {
        const char = parser.text.charAt(parser.offset++);
        if (char === quote) {
            return { value: parser.text.slice(start, parser.offset), quote };
        }

        if (char === "\\") {
            ++parser.offset;
        }
    }

    return null;
});

export const skipTagAttributes = (parser: Parser) => startParserTransaction<TagAttribute[]>(parser, (parser) => {
    const attributes: TagAttribute[] = [];

    while (parser.offset < parser.text.length) {
        skipWhitespace(parser);

        const name = skipAttributeName(parser);
        if (!name) {
            break;
        }

        skipWhitespace(parser);
        if (!skipString(parser, "=")) {
            attributes.push({
                name,
            });
            continue;
        }

        skipWhitespace(parser);

        const value = skipAttributeValue(parser);
        if (!value) {
            return null;
        }

        attributes.push({
            name,
            value,
        });
    }

    return attributes;
});

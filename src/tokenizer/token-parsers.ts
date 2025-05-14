import { Token, TokenCloseTag, TokenOpenTag, TokenCode } from "./tokens";
import { createParser, isParserEnd, Parser, skipPattern, skipString, skipStringLiteral, skipTagAttributes, skipWhitespace, startParserTransaction } from "./parser";
import { AppError } from "../error";


type TokenParser = (parser: Parser) => (Token | null);

const parseTokenCode = (parser: Parser) => startParserTransaction<TokenCode>(parser, (parser) => {
    const start = parser.offset;

    const strData = skipStringLiteral(parser, ["`"]);
    if (!strData) {
        return null;
    }

    return {
        type: "code",
        start,
        end: parser.offset,
        quote: strData.quote,
    };
});

const parseTokenTag = (
    parser: Parser
) => startParserTransaction<TokenOpenTag | TokenCloseTag>(parser, (parser) => {
    const start = parser.offset;

    if (!skipString(parser, "<")) {
        return null;
    }

    const isOpenTag = !skipString(parser, "/");

    const tagName = skipPattern(parser, /^[a-zA-Z][a-zA-Z0-9.-]+/);
    if (!tagName) {
        return null;
    }

    skipWhitespace(parser);

    if (isOpenTag) {
        const attributes = skipTagAttributes(parser);
        const isSelfClosing = skipString(parser, "/");
        if (!skipString(parser, ">")) {
            return null;
        }
        return {
            type: "openTag",
            start,
            end: parser.offset,
            tagName,
            attributes: attributes ?? [],
            isSelfClosing,
        };
    }

    if (!skipString(parser, ">")) {
        return null;
    }

    return {
        type: "closeTag",
        start,
        end: parser.offset,
        tagName,
    };
});



const PARSERS: TokenParser[] = [parseTokenCode, parseTokenTag];

export const tokenizeText = (text: string): Token[] => {
    const result: Token[] = [];

    const parser = createParser(text);

    let lastTokenEnd = 0;
    while (!isParserEnd(parser)) {
        let token: (Token | null) = null;

        for (const parserCb of PARSERS) {
            token = startParserTransaction(parser, parserCb);
            if (token) {
                break;
            }
        }

        if (!token) {
            ++parser.offset;
            continue;
        }

        if (token.end !== parser.offset) {
            throw new AppError("Token end does not match offset", { data: { token, parser } });
        }
        if (token.start < lastTokenEnd) {
            throw new AppError("Token start is less than last token end", { data: { token, lastTokenEnd } });
        }

        if (token.start > lastTokenEnd) {
            result.push({
                type: "text",
                start: lastTokenEnd,
                end: token.start,
            });
        }

        result.push(token);
        lastTokenEnd = token.end;

    }

    if (lastTokenEnd < text.length) {
        result.push({
            type: "text",
            start: lastTokenEnd,
            end: text.length,
        });
    }

    return result;
};

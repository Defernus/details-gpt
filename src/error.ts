
export class AppError extends Error {
    data?: any;

    constructor(message: string, options: { data?: any, cause?: unknown } = {}) {
        super(message, { cause: options.cause });
        this.name = "AppError";
        this.data = options.data;

    }
}

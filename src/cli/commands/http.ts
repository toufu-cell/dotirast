import http from "node:http";

import { DEFAULT_PORT } from "../../shared/constants";

export async function apiRequest<TResponse>(
    method: string,
    requestPath: string,
    body?: unknown,
    port = DEFAULT_PORT,
    token?: string
): Promise<TResponse> {
    const resolvedToken = token || process.env.DOTIRAST_TOKEN;

    return new Promise<TResponse>((resolve, reject) => {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const headers: Record<string, string> = {};

        if (payload) {
            headers["Content-Type"] = "application/json";
            headers["Content-Length"] = String(Buffer.byteLength(payload));
        }

        if (resolvedToken) {
            headers["Authorization"] = `Bearer ${resolvedToken}`;
        }

        const request = http.request(
            {
                host: "127.0.0.1",
                port,
                path: requestPath,
                method,
                headers: Object.keys(headers).length > 0 ? headers : undefined
            },
            (response) => {
                const chunks: Buffer[] = [];

                response.on("data", (chunk) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });

                response.on("end", () => {
                    const raw = Buffer.concat(chunks).toString("utf8");
                    let parsed: TResponse | { error?: string };
                    try {
                        parsed = raw ? (JSON.parse(raw) as TResponse | { error?: string }) : ({} as TResponse);
                    } catch {
                        reject(new Error("Server returned invalid JSON."));
                        return;
                    }

                    if ((response.statusCode ?? 500) >= 400) {
                        reject(new Error((parsed as { error?: string }).error ?? `Request failed with status ${response.statusCode}.`));
                        return;
                    }

                    resolve(parsed as TResponse);
                });
            }
        );

        request.on("error", reject);

        if (payload) {
            request.write(payload);
        }

        request.end();
    });
}

export function isServerUnavailable(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    return /ECONNREFUSED|ECONNRESET|EACCES|EPERM|socket hang up/i.test(error.message);
}

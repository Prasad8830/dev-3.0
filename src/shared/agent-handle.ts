/**
 * The address of ONE agent process inside a task: `dev3 pane list` prints it,
 * `dev3 message --agent` takes it, and a reply command carries the sender's.
 * Opaque on purpose, because what it packs is the #1927 author binding (pane,
 * pane generation, `pid@start`), and a raw pane id survives the agent it named.
 */

import type { ScheduledMessageAuthor } from "./types";
import { base64UrlToBytes, bytesToBase64Url } from "./base64url";

const HANDLE_PREFIX = "a1.";

export function encodeAgentHandle(author: ScheduledMessageAuthor): string {
	const fields = [author.paneId, author.sessionId, author.paneToken, author.agentProcess];
	return HANDLE_PREFIX + bytesToBase64Url(new TextEncoder().encode(JSON.stringify(fields)));
}

/** The identity a handle names, or null for anything this version did not write. */
export function decodeAgentHandle(handle: string): ScheduledMessageAuthor | null {
	const value = handle.trim();
	if (!value.startsWith(HANDLE_PREFIX)) return null;
	let fields: unknown;
	try {
		fields = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(value.slice(HANDLE_PREFIX.length))));
	} catch {
		return null;
	}
	if (!Array.isArray(fields) || fields.length !== 4) return null;
	const [paneId, sessionId, paneToken, agentProcess] = fields;
	if (typeof paneId !== "string" || !paneId) return null;
	if (sessionId !== null && (typeof sessionId !== "string" || !sessionId)) return null;
	if (typeof paneToken !== "string" || !paneToken) return null;
	if (typeof agentProcess !== "string" || !/^[1-9]\d*@\S/.test(agentProcess)) return null;
	return { paneId, sessionId, paneToken, agentProcess };
}

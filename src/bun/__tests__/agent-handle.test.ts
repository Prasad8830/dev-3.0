import { describe, expect, it } from "vitest";
import { decodeAgentHandle, encodeAgentHandle } from "../../shared/agent-handle";
import { agentReplyCommand } from "../../shared/agent-message-envelope";

const AGENT = { paneId: "%14", sessionId: "conv-1234", paneToken: "srv-token-1", agentProcess: "48213@Mon Oct 26 09:41:07 2026" };

describe("agent handles", () => {
	it("round-trips every field, a null conversation id included", () => {
		expect(decodeAgentHandle(encodeAgentHandle(AGENT))).toEqual(AGENT);
		const noSession = { ...AGENT, sessionId: null };
		expect(decodeAgentHandle(encodeAgentHandle(noSession))).toEqual(noSession);
	});

	it("is one shell word: no spaces, quotes or `$`, even though the start time has spaces", () => {
		const handle = encodeAgentHandle(AGENT);
		expect(handle).toMatch(/^a1\.[A-Za-z0-9_-]+$/);
		expect(handle.length).toBeLessThan(140);
	});

	it("survives the whitespace a copy-paste adds", () => {
		expect(decodeAgentHandle(`  ${encodeAgentHandle(AGENT)}\n`)).toEqual(AGENT);
	});

	it("rejects a raw pane id, a foreign prefix, junk and a truncated handle", () => {
		const handle = encodeAgentHandle(AGENT);
		for (const bad of ["%14", "", "a2." + handle.slice(3), "a1.!!!", "a1.", handle.slice(0, handle.length - 6)]) {
			expect(decodeAgentHandle(bad)).toBeNull();
		}
	});

	it("rejects a well-formed payload that does not describe one agent process", () => {
		const forge = (fields: unknown) => `a1.${Buffer.from(JSON.stringify(fields)).toString("base64url")}`;
		expect(decodeAgentHandle(forge(["%1", null, "tok", "48213@Mon"]))).not.toBeNull();
		for (const fields of [
			["%1", null, "tok"],
			["", null, "tok", "1@x"],
			["%1", "", "tok", "1@x"],
			["%1", null, "", "1@x"],
			["%1", null, "tok", "no-pid"],
			["%1", null, "tok", "0@x"],
			["%1", 7, "tok", "1@x"],
			{ paneId: "%1" },
		]) {
			expect(decodeAgentHandle(forge(fields))).toBeNull();
		}
	});

	it("is what a reply command carries, after the task address", () => {
		const handle = encodeAgentHandle(AGENT);
		expect(agentReplyCommand({ target: { id: "t", seq: 9 }, fromProjectId: "p", quoted: "hi", agentHandle: handle })).toBe(
			`dev3 message --task seq:9 --agent ${handle} --subject "what your reply is about" "hi"`,
		);
	});
});

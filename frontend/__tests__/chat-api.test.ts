import { sendChatMessage } from "../lib/api";

describe("sendChatMessage", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts message, history, and coordinates to /api/v1/chat", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "Store 1 is 1.2 km away.", model: "test" }),
    });

    const result = await sendChatMessage(
      "What is nearby?",
      [{ role: "user", content: "Hi" }],
      { lat: 10.007, lng: 76.71 },
    );

    expect(result.reply).toContain("Store 1");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.message).toBe("What is nearby?");
    expect(body.user_lat).toBe(10.007);
    expect(body.history).toHaveLength(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const CODE = "482913";

type ConsoleSpy = { mock: { calls: unknown[][] } };

function allConsoleOutput(spies: ConsoleSpy[]): string {
  return spies.flatMap((s) => s.mock.calls.map((args) => args.map(String).join(" "))).join("\n");
}

describe("sendOtpEmail", () => {
  let spies: ConsoleSpy[];

  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined)
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  for (const nodeEnv of ["development", "test", "production"]) {
    it(`throws a configuration error without RESEND_API_KEY (${nodeEnv}) and logs nothing`, async () => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("EMAIL_FROM", "Sign <sign@example.com>");
      const { sendOtpEmail } = await import("@/platform/email");
      await expect(sendOtpEmail({ to: "jane@example.com", code: CODE })).rejects.toThrow(
        /RESEND_API_KEY/
      );
      expect(sendMock).not.toHaveBeenCalled();
      expect(allConsoleOutput(spies)).not.toContain(CODE);
    });
  }

  it("sends with a code-free subject and logs only event + masked recipient", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Sign <sign@example.com>");
    sendMock.mockResolvedValue({ data: { id: "1" }, error: null });
    const { sendOtpEmail, OTP_EMAIL_SUBJECT } = await import("@/platform/email");

    await sendOtpEmail({ to: "jane@example.com", code: CODE });

    const payload = sendMock.mock.calls[0][0];
    expect(payload.subject).toBe(OTP_EMAIL_SUBJECT);
    expect(payload.subject).not.toContain(CODE);
    expect(payload.html).toContain(CODE);

    const output = allConsoleOutput(spies);
    expect(output).toContain("otp_email_sent");
    expect(output).toContain("j***@example.com");
    expect(output).not.toContain(CODE);
    expect(output).not.toContain("jane@example.com");
    expect(output).not.toContain("<html");
  });

  it("throws without leaking the code when the provider rejects", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Sign <sign@example.com>");
    sendMock.mockResolvedValue({ data: null, error: { name: "validation_error", message: "bad" } });
    const { sendOtpEmail } = await import("@/platform/email");

    await expect(sendOtpEmail({ to: "jane@example.com", code: CODE })).rejects.toThrow();
    const output = allConsoleOutput(spies);
    expect(output).toContain("otp_email_failed");
    expect(output).not.toContain(CODE);
  });
});

import { z } from "zod";
import { OTP_LENGTH } from "./constants";

/** Trimmed, lowercased, ≤ 254 chars, valid address. */
export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** Exactly six ASCII digits. */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`));

export const otpRequestBodySchema = z.object({ email: emailSchema });

export const otpVerifyBodySchema = z.object({ email: emailSchema, code: otpCodeSchema });

export type OtpRequestBody = z.infer<typeof otpRequestBodySchema>;
export type OtpVerifyBody = z.infer<typeof otpVerifyBodySchema>;

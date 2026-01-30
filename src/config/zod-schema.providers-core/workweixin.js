import { z } from "zod";
import { DmPolicySchema, GroupPolicySchema } from "./zod-schema.core.js";

/**
 * WorkWeixin configuration schema
 */
export const WorkWeixinConfigSchema = {
  corpId: z.string().optional(),
  corpSecret: z.string().optional(),
  agentId: z.string().optional(),
  token: z.string().optional().describe("API token for callback verification"),
  encodingAESKey: z.string().optional().describe("AES key for callback encryption"),
  dmPolicy: DmPolicySchema.optional(),
  groupPolicy: GroupPolicySchema.optional(),
  allowFrom: z.array(z.string()).optional(),
  groups: z.record(z.union([
    z.boolean(),
    z.object({
      requireMention: z.boolean().optional(),
    }),
  ])).optional(),
  enabled: z.boolean().optional(),
};

/**
 * Create WorkWeixin config schema with additional fields
 */
export function createWorkWeixinConfigSchema(additionalFields = {}) {
  return {
    ...WorkWeixinConfigSchema,
    ...additionalFields,
  };
}

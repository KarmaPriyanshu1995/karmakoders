import "server-only";

import { prisma } from "@/lib/prisma";
import {
  FREE_TOOLS_SETTINGS_KEY,
  parseFreeToolsSettings,
  type FreeToolsSettings,
} from "@/lib/tools/settings";

export async function getFreeToolsSettings(tenantId: string): Promise<FreeToolsSettings> {
  const record = await prisma.siteConfig.findUnique({
    where: { tenantId_key: { tenantId, key: FREE_TOOLS_SETTINGS_KEY } },
  });
  return parseFreeToolsSettings(record?.value);
}

export async function saveFreeToolsSettings(tenantId: string, settings: FreeToolsSettings): Promise<void> {
  const value = JSON.stringify(settings);
  await prisma.siteConfig.upsert({
    where: { tenantId_key: { tenantId, key: FREE_TOOLS_SETTINGS_KEY } },
    update: { value },
    create: { tenantId, key: FREE_TOOLS_SETTINGS_KEY, value },
  });
}

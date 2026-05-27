import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import('./src/lib/prisma');
  const current = await prisma.siteConfig.findUnique({ where: { key: 'globalTheme' } });
  
  let config = {};
  if (current && current.value) {
    try {
      config = JSON.parse(current.value);
    } catch(e) {}
  }
  
  config = {
    ...config,
    mode: "dark",
    theme: "dark",
    bgType: "solid",
    bgColor: "#252422",
    textColor: "#ffffff",
    primaryColor: "#FFC300",
  };
  
  await prisma.siteConfig.upsert({
    where: { key: 'globalTheme' },
    update: { value: JSON.stringify(config) },
    create: { key: 'globalTheme', value: JSON.stringify(config) },
  });
  
  console.log("Successfully updated globalTheme to #252422 and #FFC300");
}

main().catch(console.error).finally(() => {
  // Disconnect is handled inside main block if needed or we can do it inside finally
});

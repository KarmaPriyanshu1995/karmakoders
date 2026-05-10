import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const posts = await p.post.findMany();
  console.log('Post count:', posts.length);
  console.log('Posts:', JSON.stringify(posts, null, 2));
}
main().finally(() => p.$disconnect());

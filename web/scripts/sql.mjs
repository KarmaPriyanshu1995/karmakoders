import { readFileSync } from "node:fs";

export function statements(sqlText) {
  const withoutLineComments = sqlText
    .split(/\r?\n/)
    .map((line) => {
      const commentAt = line.indexOf("--");
      return commentAt === -1 ? line : line.slice(0, commentAt);
    })
    .join("\n");

  return withoutLineComments
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export function readMigration(path) {
  return statements(readFileSync(path, "utf8"));
}

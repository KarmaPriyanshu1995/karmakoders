const fs = require("fs");
const path = require("path");

const replacements = [
  { from: /hello@nexus-agency\.ai/g, to: "karmakoders@gmail.com" },
  { from: /\+1 \(555\) 123-4567/g, to: "7627056875" },
  { from: /Tech District, San Francisco, CA 94105/g, to: "JLN marg malvinagar" },
  { from: /NEXUS\.ai/g, to: "karmakoders" },
  { from: /NEXUS\.admin/g, to: "karmakoders admin" },
  { from: /NEXUS/g, to: "karmakoders" },
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(file));
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      results.push(file);
    }
  });
  return results;
}

const srcDir = path.join(__dirname, "src");
const files = walkDir(srcDir);

let changedFiles = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  let newContent = content;
  
  replacements.forEach((rep) => {
    newContent = newContent.replace(rep.from, rep.to);
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, "utf8");
    changedFiles++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Successfully updated ${changedFiles} files.`);

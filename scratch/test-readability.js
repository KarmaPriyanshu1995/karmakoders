const { calcReadability } = require("../src/lib/seo/readability");

const sampleText = "This is a simple sentence to test readability. It has some common words and syllables.";
const html = "<p>This is a simple sentence to test readability. It has some common words and syllables.</p>";

const score = calcReadability(sampleText, html);
console.log("Calculated score:", score);

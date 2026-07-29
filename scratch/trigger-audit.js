async function main() {
  console.log("Triggering SEO audit POST...");
  try {
    const res = await fetch("http://localhost:3000/api/seo/audit", {
      method: "POST",
    });
    const json = await res.json();
    console.log("Audit Result:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error triggering audit:", err);
  }
}

main();

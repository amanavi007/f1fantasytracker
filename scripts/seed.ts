/* eslint-disable no-console */

async function main() {
  // This script intentionally does not seed fake data.
  // Add your own inserts based on your real private-league dataset.
  console.log("No mock data is seeded. Use Supabase SQL editor or app APIs to add real data.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

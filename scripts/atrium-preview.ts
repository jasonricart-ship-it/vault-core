import "dotenv/config";
import { fetchAtriumData } from "../lib/atrium";

async function main() {
  const data = await fetchAtriumData();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

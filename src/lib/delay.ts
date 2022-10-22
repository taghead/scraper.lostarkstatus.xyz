export async function delay(ms: number) {
  console.log(`Timeout ${ms}`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

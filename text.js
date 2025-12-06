import { createWorker } from "tesseract.js";
import Jimp from "jimp";

async function preprocessImage(imagePath) {
  const image = await Jimp.read(imagePath);

  // Convert to grayscale
  image.grayscale();

  // Apply threshold to make text black on white background
  // You might need to adjust the threshold value (0-255)
  image.threshold({ threshold: 0.6 }); // Try 0.5 to 0.7

  // Optional: Increase contrast
  image.contrast(0.3);

  // Save as temporary file for Tesseract
  const tempPath = "temp_preprocessed.png";
  await image.writeAsync(tempPath);
  return tempPath;
}

async function extractTextFromComic(imagePath) {
  console.log("Preprocessing image...");
  const preprocessedPath = await preprocessImage(imagePath);

  console.log("Initializing Tesseract worker...");
  const worker = await createWorker({
    logger: (m) => console.log(m), // Optional: see progress
  });

  console.log("Recognizing text...");
  const {
    data: { text },
  } = await worker.recognize(preprocessedPath);

  console.log("\n=== EXTRACTED TEXT ===\n");
  console.log(text.trim());

  await worker.terminate();
  console.log("\nDone!");
}
const imagePath = "./2.jpeg";
// Run it!
extractTextFromComic(imagePath).catch(console.error);

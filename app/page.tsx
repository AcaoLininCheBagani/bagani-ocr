"use client";
import { useState } from "react";
import Tesseract from "tesseract.js";
import { Jimp } from "jimp";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(
    null,
  );

  async function preprocessImage(imageFile: File): Promise<string> {
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const image = await Jimp.read(buffer);

      // Much more aggressive preprocessing for comic/manga text
      const processedImage = await image
        .greyscale() // Convert to grayscale
        .contrast(1.0) // Maximum contrast
        .brightness(-0.2) // Darken slightly
        .normalize() // Normalize colors
        .posterize(3) // Reduce to limited colors
        .dither565() // Apply dithering
        .quality(100);

      // Convert to data URL for Tesseract
      const base64 = await processedImage.getBase64Async(Jimp.MIME_JPEG);
      return base64;
    } catch (error) {
      console.error("Image preprocessing failed:", error);
      // Fallback to original image as data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(imageFile);
      });
    }
  }

  async function extractText(imageFile: File) {
    setIsLoading(true);
    try {
      console.log("Starting aggressive preprocessing...");
      const processedImageDataUrl = await preprocessImage(imageFile);

      console.log("Starting OCR with optimized settings...");

      const {
        data: { text },
      } = await Tesseract.recognize(processedImageDataUrl, "eng", {
        logger: (m) => console.log(m),
        // Optimized settings for comic/manga text
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_LSTM_COMBINED,
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?'\n\"-",
        preserve_interword_spaces: "1",
        textord_min_linesize: "0.5",
        textord_really_old_xheight: "1",
      });
      return text;
    } catch (error) {
      console.error("OCR Error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const handleExtraction = async () => {
    if (!selectedFile) {
      alert("Please select an image first");
      return;
    }

    try {
      const text = await extractText(selectedFile);
      setExtractedText(text);
      console.log("Extracted Text:", text);
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("Text extraction failed. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setExtractedText("");
    setProcessedImageUrl(null);

    if (file) {
      console.log("Selected file:", file.name, file.type, file.size);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <h1 className="text-2xl font-bold mb-6">
        OCR Text Extraction with Preprocessing
      </h1>

      <input
        type="file"
        id="image-input"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-4 p-2 border border-gray-300 rounded"
      />

      <button
        onClick={handleExtraction}
        disabled={isLoading || !selectedFile}
        className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
      >
        {isLoading ? "Processing..." : "Extract Text"}
      </button>

      {/* Image Previews */}
      <div className="flex gap-4 mb-6">
        {selectedFile && (
          <div className="text-center">
            <h3 className="text-sm font-medium mb-2">Original Image</h3>
            <img
              src={URL.createObjectURL(selectedFile)}
              alt="Original"
              className="max-w-xs max-h-48 border rounded"
            />
          </div>
        )}

        {processedImageUrl && (
          <div className="text-center">
            <h3 className="text-sm font-medium mb-2">Processed Image</h3>
            <img
              src={processedImageUrl}
              alt="Processed"
              className="max-w-xs max-h-48 border rounded"
            />
          </div>
        )}
      </div>

      {extractedText && (
        <div className="mt-4 w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-2">Extracted Text:</h2>
          <div className="p-4 bg-white dark:bg-zinc-800 border border-gray-300 rounded whitespace-pre-wrap">
            {extractedText}
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">Selected: {selectedFile.name}</p>
        </div>
      )}
    </div>
  );
}

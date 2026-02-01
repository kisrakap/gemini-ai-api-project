import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import { error } from "console";

const app = express();
const upload = multer();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash-lite";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Gemini Flash API is running");
});

app.post("/generate-text", async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    res.status(200).json({ result: response.text });
  } catch (error) {
    console.log("Error generating text:", error);
    res.status(500).json({ error: "Failed to generate text" });
  }
});

app.post("/generate-image", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: prompt, type: "text" },
        { inlineData: { data: base64Image, mimeType: req.file.mimetype } },
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (error) {
    console.log("Error generating image:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

app.post("/generate-audio", upload.single("audio"), async (req, res) => {
  const { prompt } = req.body;
  const base64Audio = req.file.buffer.toString("base64");

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          text: prompt ?? "tolong buatkan transkrip dari rekaman berikut",
          type: "text",
        },
        { inlineData: { data: base64Audio, mimeType: req.file.mimetype } },
      ],
    });
    res.status(200).json({ result: response.text });
  } catch (error) {
    console.log("Error generating audio:", error);
    res.status(500).json({ error: "Failed to generate audio" });
  }
});

app.post(
  "/generate-from-document",
  upload.single("document"),
  async (req, res) => {
    const { prompt } = req.body;
    const base64Document = req.file.buffer.toString("base64");

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            text: prompt ?? "tolong buatkan ringkasan dari dokumen berikut",
            type: "text",
          },
          { inlineData: { data: base64Document, mimeType: req.file.mimetype } },
        ],
      });
      res.status(200).json({ result: response.text });
    } catch (error) {
      console.log("Error generating document:", error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  },
);

app.post("/api/chat", async (req, res) => {
  try {
    const { conversation } = req.body;
    if (!Array.isArray(conversation)) {
      throw new Error("Conversation must be an array");
    }

    // Validasi setiap item conversation
    conversation.forEach((item, index) => {
      if (!item.role || !item.text) {
        throw new Error(
          `Invalid conversation at index ${index}: missing role or text`,
        );
      }
    });

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.9,
        systemInstruction: "Jawab hanya menggunakan bahasa Indonesia.",
      },
    });

    if (!response?.text) {
      throw new Error("Invalid response from Gemini API");
    }

    res.status(200).json({ result: response.text });
  } catch (error) {
    console.error("Error in chat endpoint:", error.message);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// controllers/aiController.js
const fetch = require("node-fetch");

exports.generateProductDetails = async (req, res) => {
  try {
    const { name, categories, imageBase64, mimeType } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }

    let contents;

    if (imageBase64 && mimeType) {
      // ✅ Image mode
      contents = [{
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          {
            text: `You are a product listing expert for an Indian eCommerce store called PoojaStore4u.
Look at this product image and generate a complete product listing.
Category hint: ${categories || "General"}

Return ONLY a JSON object (no markdown, no backticks):
{
  "name": "product name in English",
  "description": "detailed product description in 3-4 lines",
  "tags": ["tag1", "tag2", "tag3"]
}`
          }
        ]
      }];
    } else {
      // ✅ Name mode
      contents = [{
        parts: [{
          text: `You are a product listing expert for an Indian eCommerce store called PoojaStore4u.
Generate a product listing for: "${name}"
Category: ${categories || "General"}

Return ONLY a JSON object (no markdown, no backticks):
{
  "name": "product name in English",
  "description": "detailed product description in 3-4 lines",
  "tags": ["tag1", "tag2", "tag3"]
}`
        }]
      }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      return res.status(response.status).json({ message: data.error?.message || "Gemini API error" });
    }

    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    res.json({
      name:        parsed.name        || "",
      description: parsed.description || "",
      tags:        parsed.tags        || [],
    });
  } catch (err) {
    console.error("AI generate error:", err);
    res.status(500).json({ message: "AI generation failed: " + err.message });
  }
};
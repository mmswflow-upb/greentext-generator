require("dotenv").config();
const express = require("express");
const { OpenAI } = require("openai");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Directory for generated images
const uploadDir = path.join(__dirname, "generated");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Function to get greentext from OpenAI
async function fetchGreentext(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Generate a humorous greentext story in 4chan style.",
        },
        {
          role: "user",
          content: `Generate a greentext story about: ${prompt}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error fetching greentext:", error);
    return "> Error: Could not fetch greentext";
  }
}

// API Endpoint to Generate Greentext Image
app.post("/generate", async (req, res) => {
  const {
    topic = "random",
    filename = "output.png",
    thumbnail = "",
  } = req.body;

  // Fetch greentext from OpenAI
  const greentext = await fetchGreentext(topic);

  // Write text to a file
  fs.writeFileSync("greentext.txt", greentext, "utf-8");

  // Use thumbnail path as provided
  const command = `greentext -i "greentext.txt" ${
    thumbnail ? `-t "${thumbnail}"` : ""
  } -o "${filename}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("Error generating image:", error);
      return res
        .status(500)
        .json({ error: "Failed to generate greentext image" });
    }

    res.sendFile(path.resolve(filename));
  });
});

// Serve generated images
app.use("/images", express.static(uploadDir));

// Start the server
app.listen(port, () => {
  console.log(`Greentext API running at http://localhost:${port}`);
});

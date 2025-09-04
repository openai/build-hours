import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { INPUT } from "./input.js";

const openai = new OpenAI();

const paperInformationSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  abstract_summary: z
    .string()
    .describe("Summary of the abstract in 1-2 sentences"),
  keywords: z.array(z.string()),
  key_concepts: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      importance: z
        .enum(["high", "medium", "low"])
        .describe("Importance of the concept in this paper."),
    })
  ),
});

const SYSTEM_PROMPT =
  "You will be provided with a research paper. Your goal is to extract information from this paper in a structured format.";

const completion = await openai.beta.chat.completions.parse({
  model: "gpt-4o-2024-08-06",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: INPUT,
    },
  ],
  response_format: zodResponseFormat(
    paperInformationSchema,
    "paper_information"
  ),
});

const result = completion.choices[0].message.parsed;
console.log(result);

"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { generateObject, generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Native Google AI SDK with OpenRouter as backend - keeps native file format support
const google = createGoogleGenerativeAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Use Gemini 3 Pro Preview via OpenRouter for text/object generation
const geminiFlash = openrouter("google/gemini-3-pro-preview");
// For file/vision inputs - native Google SDK format routed through OpenRouter
const geminiVision = google("google/gemini-2.0-flash-exp");

export const generateFlightStatus = internalAction({
  args: {
    flightNumber: v.string(),
    date: v.string(),
  },
  handler: async (_ctx, { flightNumber, date }) => {
    const { object: flightStatus } = await generateObject({
      model: geminiFlash,
      prompt: `Flight status for flight number ${flightNumber} on ${date}`,
      schema: z.object({
        flightNumber: z.string().describe("Flight number, e.g., BA123, AA31"),
        departure: z.object({
          cityName: z.string().describe("Name of the departure city"),
          airportCode: z.string().describe("IATA code of the departure airport"),
          airportName: z.string().describe("Full name of the departure airport"),
          timestamp: z.string().describe("ISO 8601 departure date and time"),
          terminal: z.string().describe("Departure terminal"),
          gate: z.string().describe("Departure gate"),
        }),
        arrival: z.object({
          cityName: z.string().describe("Name of the arrival city"),
          airportCode: z.string().describe("IATA code of the arrival airport"),
          airportName: z.string().describe("Full name of the arrival airport"),
          timestamp: z.string().describe("ISO 8601 arrival date and time"),
          terminal: z.string().describe("Arrival terminal"),
          gate: z.string().describe("Arrival gate"),
        }),
        totalDistanceInMiles: z.number().describe("Total flight distance in miles"),
      }),
    });
    return flightStatus;
  },
});

export const generateFlightSearchResults = internalAction({
  args: {
    origin: v.string(),
    destination: v.string(),
  },
  handler: async (_ctx, { origin, destination }) => {
    const { object: flightSearchResults } = await generateObject({
      model: geminiFlash,
      prompt: `Generate search results for flights from ${origin} to ${destination}, limit to 4 results`,
      output: "array",
      schema: z.object({
        id: z.string().describe("Unique identifier for the flight, like BA123, AA31, etc."),
        departure: z.object({
          cityName: z.string().describe("Name of the departure city"),
          airportCode: z.string().describe("IATA code of the departure airport"),
          timestamp: z.string().describe("ISO 8601 departure date and time"),
        }),
        arrival: z.object({
          cityName: z.string().describe("Name of the arrival city"),
          airportCode: z.string().describe("IATA code of the arrival airport"),
          timestamp: z.string().describe("ISO 8601 arrival date and time"),
        }),
        airlines: z.array(z.string().describe("Airline names, e.g., American Airlines, Emirates")),
        priceInUSD: z.number().describe("Flight price in US dollars"),
        numberOfStops: z.number().describe("Number of stops during the flight"),
      }),
    });
    return { flights: flightSearchResults };
  },
});

export const generateSeatSelection = internalAction({
  args: {
    flightNumber: v.string(),
  },
  handler: async (_ctx, { flightNumber }) => {
    const { object: rows } = await generateObject({
      model: geminiFlash,
      prompt: `Simulate available seats for flight number ${flightNumber}, 6 seats on each row and 5 rows in total, adjust pricing based on location of seat`,
      output: "array",
      schema: z.array(
        z.object({
          seatNumber: z.string().describe("Seat identifier, e.g., 12A, 15C"),
          priceInUSD: z.number().describe("Seat price in US dollars, less than $99"),
          isAvailable: z.boolean().describe("Whether the seat is available for booking"),
        })
      ),
    });
    return { seats: rows };
  },
});

export const generateReservationPrice = internalAction({
  args: {
    seats: v.array(v.string()),
    flightNumber: v.string(),
    departure: v.object({
      cityName: v.string(),
      airportCode: v.string(),
      timestamp: v.string(),
      gate: v.string(),
      terminal: v.string(),
    }),
    arrival: v.object({
      cityName: v.string(),
      airportCode: v.string(),
      timestamp: v.string(),
      gate: v.string(),
      terminal: v.string(),
    }),
    passengerName: v.string(),
  },
  handler: async (_ctx, props) => {
    const { object: reservation } = await generateObject({
      model: geminiFlash,
      prompt: `Generate price for the following reservation \n\n ${JSON.stringify(props, null, 2)}`,
      schema: z.object({
        totalPriceInUSD: z.number().describe("Total reservation price in US dollars"),
      }),
    });
    return reservation;
  },
});

// =============================================================================
// PDF & File Handling with Native Google AI SDK (Gemini File API)
// =============================================================================

/**
 * Analyze a PDF document using NATIVE Google AI SDK.
 * OpenRouter doesn't support PDF files - must use native Google provider.
 */
export const analyzePDF = internalAction({
  args: {
    storageId: v.id("_storage"),
    prompt: v.string(),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, prompt, fileName }) => {
    // Fetch the file from Convex storage
    const fileBlob = await ctx.storage.get(storageId);
    if (!fileBlob) {
      throw new Error("File not found in storage");
    }

    // Convert Blob to Buffer for native Google AI SDK
    const arrayBuffer = await fileBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Determine media type
    const mediaType = fileName?.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : fileBlob.type || "application/pdf";

    // Use native Google AI SDK format with type: "file"
    const result = await generateText({
      model: geminiVision,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "file",
              data: fileBuffer,
              mediaType: mediaType,
            },
          ],
        },
      ],
    });

    return {
      text: result.text,
      usage: result.usage,
    };
  },
});

/**
 * Analyze a PDF with structured output extraction.
 */
export const analyzePDFStructured = internalAction({
  args: {
    storageId: v.id("_storage"),
    prompt: v.string(),
    extractionType: v.union(
      v.literal("summary"),
      v.literal("keyPoints"),
      v.literal("entities"),
      v.literal("tables"),
      v.literal("custom")
    ),
    customSchema: v.optional(v.any()),
  },
  handler: async (ctx, { storageId, prompt, extractionType, customSchema }) => {
    const fileBlob = await ctx.storage.get(storageId);
    if (!fileBlob) {
      throw new Error("File not found in storage");
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Build extraction prompt based on type
    let extractionPrompt = prompt;
    let schema: z.ZodType<any>;

    switch (extractionType) {
      case "summary":
        extractionPrompt = `${prompt}\n\nProvide a comprehensive summary of this document.`;
        schema = z.object({
          title: z.string().describe("Document title or inferred title"),
          summary: z.string().describe("Comprehensive summary of the document"),
          mainTopics: z.array(z.string()).describe("Main topics covered"),
          pageCount: z.number().optional().describe("Estimated number of pages if detectable"),
        });
        break;
      case "keyPoints":
        extractionPrompt = `${prompt}\n\nExtract the key points and takeaways from this document.`;
        schema = z.object({
          keyPoints: z.array(
            z.object({
              point: z.string().describe("A key point or takeaway"),
              importance: z.enum(["high", "medium", "low"]).describe("Importance level"),
              context: z.string().optional().describe("Additional context"),
            })
          ),
          conclusions: z.array(z.string()).optional().describe("Main conclusions"),
        });
        break;
      case "entities":
        extractionPrompt = `${prompt}\n\nExtract all named entities (people, organizations, locations, dates, etc.) from this document.`;
        schema = z.object({
          people: z.array(z.string()).describe("People mentioned"),
          organizations: z.array(z.string()).describe("Organizations mentioned"),
          locations: z.array(z.string()).describe("Locations mentioned"),
          dates: z.array(z.string()).describe("Dates mentioned"),
          other: z.array(z.object({
            type: z.string(),
            value: z.string(),
          })).optional().describe("Other entities"),
        });
        break;
      case "tables":
        extractionPrompt = `${prompt}\n\nExtract any tabular data from this document.`;
        schema = z.object({
          tables: z.array(
            z.object({
              title: z.string().optional().describe("Table title if present"),
              headers: z.array(z.string()).describe("Column headers"),
              rows: z.array(z.array(z.string())).describe("Table rows"),
            })
          ),
        });
        break;
      case "custom":
        if (!customSchema) {
          throw new Error("Custom schema required for custom extraction type");
        }
        schema = z.any();
        break;
      default:
        schema = z.object({ content: z.string() });
    }

    // First, analyze the PDF to get text content using base64 data URL
    const analysisResult = await generateText({
      model: geminiVision,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: extractionPrompt,
            },
            {
              type: "file",
              data: fileBuffer,
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    });

    // Then structure the output using OpenRouter model
    const { object } = await generateObject({
      model: geminiFlash,
      prompt: `Based on this document analysis, extract structured data:\n\n${analysisResult.text}`,
      schema,
    });

    return {
      structured: object,
      rawAnalysis: analysisResult.text,
    };
  },
});

/**
 * Multi-file analysis - analyze multiple PDFs or images together.
 * Uses native Google AI SDK for file support.
 */
export const analyzeMultipleFiles = internalAction({
  args: {
    files: v.array(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.string(),
        mediaType: v.string(),
      })
    ),
    prompt: v.string(),
  },
  handler: async (ctx, { files, prompt }) => {
    // Fetch all files and convert to Buffers
    const fileBuffers = await Promise.all(
      files.map(async (file) => {
        const blob = await ctx.storage.get(file.storageId);
        if (!blob) {
          throw new Error(`File not found: ${file.fileName}`);
        }
        const arrayBuffer = await blob.arrayBuffer();
        return {
          ...file,
          data: Buffer.from(arrayBuffer),
        };
      })
    );

    // Build message content with all files using native Google format
    const content: Array<{ type: "text"; text: string } | { type: "file"; data: Buffer; mediaType: string }> = [
      { type: "text", text: prompt },
    ];

    for (const file of fileBuffers) {
      content.push({
        type: "file",
        data: file.data,
        mediaType: file.mediaType,
      });
    }

    const result = await generateText({
      model: geminiVision,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    return {
      text: result.text,
      filesAnalyzed: files.map((f) => f.fileName),
      usage: result.usage,
    };
  },
});

/**
 * Analyze an image using Gemini's vision capabilities.
 * Uses native Google AI SDK for file support.
 */
export const analyzeImage = internalAction({
  args: {
    storageId: v.id("_storage"),
    prompt: v.string(),
    mediaType: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, prompt, mediaType }) => {
    const fileBlob = await ctx.storage.get(storageId);
    if (!fileBlob) {
      throw new Error("File not found in storage");
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const mimeType = mediaType || fileBlob.type || "image/png";

    const result = await generateText({
      model: geminiVision,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "file",
              data: fileBuffer,
              mediaType: mimeType,
            },
          ],
        },
      ],
    });

    return {
      text: result.text,
      usage: result.usage,
    };
  },
});

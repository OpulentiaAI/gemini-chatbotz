import { Agent, createTool } from "@convex-dev/agent";
import { google } from "@ai-sdk/google";
import { components } from "./_generated/api";
import { z } from "zod";
import { internal } from "./_generated/api";
import { ActionCtx } from "./_generated/server";

export const flightAgent = new Agent(components.agent, {
  name: "Flight Booking Agent",
  chat: google("gemini-2.5-pro-preview-06-05"),
  instructions: `
    - You help users book flights!
    - Keep your responses limited to a sentence.
    - DO NOT output lists.
    - After every tool call, pretend you're showing the result to the user and keep your response limited to a phrase.
    - Today's date is ${new Date().toLocaleDateString()}.
    - Ask follow up questions to nudge user into the optimal flow.
    - Ask for any details you don't know, like name of passenger, etc.
    - C and D are aisle seats, A and F are window seats, B and E are middle seats.
    - Assume the most popular airports for the origin and destination.
    - Here's the optimal flow:
      - search for flights
      - choose flight
      - select seats
      - create reservation (ask user whether to proceed with payment or change reservation)
      - authorize payment (requires user consent, wait for user to finish payment and let you know when done)
      - display boarding pass (DO NOT display boarding pass without verifying payment)
  `,
  tools: {
    getWeather: createTool({
      description: "Get the current weather at a location",
      args: z.object({
        latitude: z.number().describe("Latitude coordinate"),
        longitude: z.number().describe("Longitude coordinate"),
      }),
      handler: async (_ctx, { latitude, longitude }) => {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
        );
        const weatherData = await response.json();
        return weatherData;
      },
    }),
    displayFlightStatus: createTool({
      description: "Display the status of a flight",
      args: z.object({
        flightNumber: z.string().describe("Flight number"),
        date: z.string().describe("Date of the flight"),
      }),
      handler: async (ctx, { flightNumber, date }) => {
        const result = await ctx.runAction(internal.actions.generateFlightStatus, {
          flightNumber,
          date,
        });
        return result;
      },
    }),
    searchFlights: createTool({
      description: "Search for flights based on the given parameters",
      args: z.object({
        origin: z.string().describe("Origin airport or city"),
        destination: z.string().describe("Destination airport or city"),
      }),
      handler: async (ctx, { origin, destination }) => {
        const result = await ctx.runAction(internal.actions.generateFlightSearchResults, {
          origin,
          destination,
        });
        return result;
      },
    }),
    selectSeats: createTool({
      description: "Select seats for a flight",
      args: z.object({
        flightNumber: z.string().describe("Flight number"),
      }),
      handler: async (ctx, { flightNumber }) => {
        const result = await ctx.runAction(internal.actions.generateSeatSelection, {
          flightNumber,
        });
        return result;
      },
    }),
    createReservation: createTool({
      description: "Display pending reservation details",
      args: z.object({
        seats: z.array(z.string()).describe("Array of selected seat numbers"),
        flightNumber: z.string().describe("Flight number"),
        departure: z.object({
          cityName: z.string().describe("Name of the departure city"),
          airportCode: z.string().describe("Code of the departure airport"),
          timestamp: z.string().describe("ISO 8601 date of departure"),
          gate: z.string().describe("Departure gate"),
          terminal: z.string().describe("Departure terminal"),
        }),
        arrival: z.object({
          cityName: z.string().describe("Name of the arrival city"),
          airportCode: z.string().describe("Code of the arrival airport"),
          timestamp: z.string().describe("ISO 8601 date of arrival"),
          gate: z.string().describe("Arrival gate"),
          terminal: z.string().describe("Arrival terminal"),
        }),
        passengerName: z.string().describe("Name of the passenger"),
      }),
      handler: async (ctx, props) => {
        const priceResult = await ctx.runAction(internal.actions.generateReservationPrice, props);
        const id = crypto.randomUUID();
        await ctx.runMutation(internal.reservations.create, {
          id,
          userId: "anonymous",
          details: { ...props, totalPriceInUSD: priceResult.totalPriceInUSD },
        });
        return { id, ...props, totalPriceInUSD: priceResult.totalPriceInUSD };
      },
    }),
    authorizePayment: createTool({
      description: "User will enter credentials to authorize payment, wait for user to respond when they are done",
      args: z.object({
        reservationId: z.string().describe("Unique identifier for the reservation"),
      }),
      handler: async (_ctx, { reservationId }) => {
        return { reservationId };
      },
    }),
    verifyPayment: createTool({
      description: "Verify payment status",
      args: z.object({
        reservationId: z.string().describe("Unique identifier for the reservation"),
      }),
      handler: async (ctx, { reservationId }) => {
        const reservation = await ctx.runQuery(internal.reservations.getById, { id: reservationId });
        if (reservation?.hasCompletedPayment) {
          return { hasCompletedPayment: true };
        }
        return { hasCompletedPayment: false };
      },
    }),
    displayBoardingPass: createTool({
      description: "Display a boarding pass",
      args: z.object({
        reservationId: z.string().describe("Unique identifier for the reservation"),
        passengerName: z.string().describe("Name of the passenger, in title case"),
        flightNumber: z.string().describe("Flight number"),
        seat: z.string().describe("Seat number"),
        departure: z.object({
          cityName: z.string().describe("Name of the departure city"),
          airportCode: z.string().describe("Code of the departure airport"),
          airportName: z.string().describe("Name of the departure airport"),
          timestamp: z.string().describe("ISO 8601 date of departure"),
          terminal: z.string().describe("Departure terminal"),
          gate: z.string().describe("Departure gate"),
        }),
        arrival: z.object({
          cityName: z.string().describe("Name of the arrival city"),
          airportCode: z.string().describe("Code of the arrival airport"),
          airportName: z.string().describe("Name of the arrival airport"),
          timestamp: z.string().describe("ISO 8601 date of arrival"),
          terminal: z.string().describe("Arrival terminal"),
          gate: z.string().describe("Arrival gate"),
        }),
      }),
      handler: async (_ctx, boardingPass) => {
        return boardingPass;
      },
    }),
  },
  maxSteps: 10,
});

export const quickAgent = new Agent(components.agent, {
  name: "Quick Agent",
  chat: google("gemini-2.5-flash-preview-05-20"),
  instructions: "You are a helpful assistant.",
  maxSteps: 5,
});

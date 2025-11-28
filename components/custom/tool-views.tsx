"use client";

import React from "react";
import { Plane, CreditCard, MapPin, Ticket, Search, Cloud, FileCode, FileText, Image, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArtifactPreviewButton } from "./artifact-panel";

interface ToolViewProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: "pending" | "running" | "complete" | "error";
}

export function ToolView({ toolName, args, result, status }: ToolViewProps) {
  const isLoading = status === "pending" || status === "running";

  switch (toolName) {
    case "searchFlights":
      return <SearchFlightsView args={args} result={result} isLoading={isLoading} />;
    case "selectSeats":
      return <SelectSeatsView args={args} result={result} isLoading={isLoading} />;
    case "createReservation":
      return <ReservationView args={args} result={result} isLoading={isLoading} />;
    case "authorizePayment":
      return <PaymentView args={args} result={result} isLoading={isLoading} />;
    case "displayBoardingPass":
      return <BoardingPassView args={args} result={result} isLoading={isLoading} />;
    case "displayFlightStatus":
      return <FlightStatusView args={args} result={result} isLoading={isLoading} />;
    case "getWeather":
      return <WeatherView args={args} result={result} isLoading={isLoading} />;
    case "createDocument":
    case "updateDocument":
      return <DocumentView args={args} result={result} isLoading={isLoading} />;
    case "generateImage":
      return <ImageGenerationView args={args} result={result} isLoading={isLoading} />;
    case "webSearch":
      return <WebSearchView args={args} result={result} isLoading={isLoading} />;
    case "tavilyExtract":
    case "tavilyCrawl":
    case "tavilyMap":
      return <TavilyToolView toolName={toolName} args={args} result={result} isLoading={isLoading} />;
    default:
      return <GenericToolView toolName={toolName} args={args} result={result} isLoading={isLoading} />;
  }
}

function SearchFlightsView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-600">
        <Search className="w-5 h-5" />
        <span className="font-medium">Searching Flights</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{args.origin as string}</span>
        </div>
        <Plane className="w-4 h-4 text-gray-400" />
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{args.destination as string}</span>
        </div>
      </div>
      {isLoading && <LoadingBar />}
      {result && Array.isArray(result.flights) && (
        <div className="space-y-2 mt-3">
          {(result.flights as Array<{ flightNumber: string; price: number; departureTime: string }>).slice(0, 3).map((flight, i) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 text-sm">
              <span className="font-medium">{flight.flightNumber}</span>
              <span className="text-gray-600">{flight.departureTime}</span>
              <span className="text-green-600 font-medium">${flight.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectSeatsView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-purple-600">
        <Ticket className="w-5 h-5" />
        <span className="font-medium">Seat Selection - {args.flightNumber as string}</span>
      </div>
      {isLoading && <LoadingBar />}
      {result && (result as { seatMap?: string[][] }).seatMap && (
        <div className="grid grid-cols-6 gap-1 max-w-xs mx-auto">
          {(result as { seatMap: string[][] }).seatMap.flat().map((seat, i) => (
            <div
              key={i}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center text-xs font-medium",
                seat === "X" ? "bg-gray-200 text-gray-400" : "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
              )}
            >
              {seat}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const departure = args.departure as { cityName: string; airportCode: string; timestamp: string } | undefined;
  const arrival = args.arrival as { cityName: string; airportCode: string; timestamp: string } | undefined;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-green-600">
        <Ticket className="w-5 h-5" />
        <span className="font-medium">Reservation</span>
      </div>
      <div className="text-sm space-y-2">
        <div><span className="text-gray-500">Passenger:</span> {args.passengerName as string}</div>
        <div><span className="text-gray-500">Flight:</span> {args.flightNumber as string}</div>
        {departure && <div><span className="text-gray-500">From:</span> {departure.cityName} ({departure.airportCode})</div>}
        {arrival && <div><span className="text-gray-500">To:</span> {arrival.cityName} ({arrival.airportCode})</div>}
        {result && (result as { totalPriceInUSD?: number }).totalPriceInUSD && (
          <div className="text-lg font-bold text-green-600">Total: ${(result as { totalPriceInUSD: number }).totalPriceInUSD}</div>
        )}
      </div>
      {isLoading && <LoadingBar />}
    </div>
  );
}

function PaymentView({ args, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-600">
        <CreditCard className="w-5 h-5" />
        <span className="font-medium">Payment Authorization</span>
      </div>
      <p className="text-sm text-gray-600">Reservation: {args.reservationId as string}</p>
      {isLoading && <LoadingBar />}
      <div className="text-sm text-amber-600">Awaiting payment confirmation...</div>
    </div>
  );
}

function BoardingPassView({ args }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const departure = args.departure as { cityName: string; airportCode: string; timestamp: string; terminal: string; gate: string } | undefined;
  const arrival = args.arrival as { cityName: string; airportCode: string } | undefined;
  return (
    <div className="rounded-xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-600">
          <Plane className="w-6 h-6" />
          <span className="text-xl font-bold">BOARDING PASS</span>
        </div>
        <span className="text-lg font-mono font-bold">{args.flightNumber as string}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500 text-xs">PASSENGER</div>
          <div className="font-bold">{args.passengerName as string}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">SEAT</div>
          <div className="font-bold text-2xl text-blue-600">{args.seat as string}</div>
        </div>
      </div>
      {departure && arrival && (
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold">{departure.airportCode}</div>
            <div className="text-xs text-gray-500">{departure.cityName}</div>
          </div>
          <Plane className="w-6 h-6 text-gray-400" />
          <div className="text-center">
            <div className="text-2xl font-bold">{arrival.airportCode}</div>
            <div className="text-xs text-gray-500">{arrival.cityName}</div>
          </div>
        </div>
      )}
      {departure && (
        <div className="flex gap-4 text-sm border-t pt-3">
          <div><span className="text-gray-500">Terminal:</span> {departure.terminal}</div>
          <div><span className="text-gray-500">Gate:</span> {departure.gate}</div>
        </div>
      )}
    </div>
  );
}

function FlightStatusView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-blue-600">
        <Plane className="w-5 h-5" />
        <span className="font-medium">Flight Status - {args.flightNumber as string}</span>
      </div>
      {isLoading && <LoadingBar />}
      {result && (
        <div className="text-sm">
          <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {(result as { status?: string }).status || "On Time"}
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-sky-600">
        <Cloud className="w-5 h-5" />
        <span className="font-medium">Weather</span>
      </div>
      {isLoading && <LoadingBar />}
      {result && (result as { current?: { temperature_2m?: number } }).current && (
        <div className="text-sm text-gray-700">
          <span className="font-semibold">{(result as { current?: { temperature_2m?: number } }).current.temperature_2m}°C</span>
        </div>
      )}
    </div>
  );
}

function ImageGenerationView({ args, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-pink-600">
        <Image className="w-5 h-5" />
        <span className="font-medium">Generating Image</span>
      </div>
      <p className="text-sm text-gray-600">{args.prompt as string}</p>
      {isLoading && <LoadingBar />}
    </div>
  );
}

function WebSearchView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  // Tavily search response format
  const tavilyResult = result as { 
    results?: Array<{ title: string; url: string; content?: string }>;
    answer?: string;
  } | undefined;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-600">
        <Globe className="w-5 h-5" />
        <span className="font-medium">Web Search</span>
      </div>
      <p className="text-sm text-gray-600">Query: {args.query as string}</p>
      {isLoading && <LoadingBar />}
      
      {/* Show AI-generated answer if available */}
      {tavilyResult?.answer && (
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-sm text-gray-800">{tavilyResult.answer}</p>
        </div>
      )}
      
      {/* Show search results */}
      {tavilyResult?.results && tavilyResult.results.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-xs text-gray-500 font-medium">Sources:</p>
          {tavilyResult.results.slice(0, 5).map((r, i) => (
            <a 
              key={i} 
              href={r.url} 
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-medium text-blue-600 hover:underline">{r.title}</p>
              {r.content && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{r.content}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TavilyToolView({ toolName, args, result, isLoading }: { toolName: string; args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const toolLabels: Record<string, string> = {
    tavilyExtract: "Content Extraction",
    tavilyCrawl: "Website Crawl",
    tavilyMap: "Site Mapping",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-purple-600">
        <Globe className="w-5 h-5" />
        <span className="font-medium">{toolLabels[toolName] || toolName}</span>
      </div>
      <p className="text-sm text-gray-600">
        {(args.url || args.urls) as string}
      </p>
      {isLoading && <LoadingBar />}
      {result && (
        <div className="text-xs bg-purple-50 p-2 rounded max-h-40 overflow-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function GenericToolView({ toolName, args, result, isLoading }: { toolName: string; args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-gray-600">
        <span className="font-medium">{toolName}</span>
      </div>
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(args, null, 2)}</pre>
      {isLoading && <LoadingBar />}
      {result && <pre className="text-xs bg-green-50 p-2 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

function LoadingBar() {
  return (
    <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 animate-pulse" style={{ width: "60%" }} />
    </div>
  );
}

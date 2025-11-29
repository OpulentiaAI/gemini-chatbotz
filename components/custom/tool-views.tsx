"use client";

import React from "react";
import { Plane, CreditCard, MapPin, Ticket, Search, Cloud, FileCode, FileText, Image, Globe, CheckCircle, ShieldCheck, Sparkles, Code, Table } from "lucide-react";
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
    case "verifyPayment":
      return <VerifyPaymentView args={args} result={result} isLoading={isLoading} />;
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
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Search className="w-5 h-5" />
        <span className="font-medium">Searching Flights</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-chocolate-400" />
          <span>{args.origin as string}</span>
        </div>
        <Plane className="w-4 h-4 text-chocolate-400" />
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-chocolate-400" />
          <span>{args.destination as string}</span>
        </div>
      </div>
      {isLoading && <LoadingBar />}
      {result && Array.isArray(result.flights) && (
        <div className="space-y-2 mt-3">
          {(result.flights as Array<{ flightNumber: string; price: number; departureTime: string }>).slice(0, 3).map((flight, i) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-chocolate-100 dark:bg-chocolate-800 text-sm">
              <span className="font-medium">{flight.flightNumber}</span>
              <span className="text-chocolate-600 dark:text-chocolate-400">{flight.departureTime}</span>
              <span className="text-chocolate-700 dark:text-chocolate-300 font-medium">${flight.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectSeatsView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
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
                seat === "X" ? "bg-chocolate-200 dark:bg-chocolate-700 text-chocolate-400" : "bg-chocolate-100 dark:bg-chocolate-800 text-chocolate-700 dark:text-chocolate-300 cursor-pointer hover:bg-chocolate-200 dark:hover:bg-chocolate-700"
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
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Ticket className="w-5 h-5" />
        <span className="font-medium">Reservation</span>
      </div>
      <div className="text-sm space-y-2">
        <div><span className="text-chocolate-500">Passenger:</span> {args.passengerName as string}</div>
        <div><span className="text-chocolate-500">Flight:</span> {args.flightNumber as string}</div>
        {departure && <div><span className="text-chocolate-500">From:</span> {departure.cityName} ({departure.airportCode})</div>}
        {arrival && <div><span className="text-chocolate-500">To:</span> {arrival.cityName} ({arrival.airportCode})</div>}
        {result && (result as { totalPriceInUSD?: number }).totalPriceInUSD && (
          <div className="text-lg font-bold text-chocolate-700 dark:text-chocolate-300">Total: ${(result as { totalPriceInUSD: number }).totalPriceInUSD}</div>
        )}
      </div>
      {isLoading && <LoadingBar />}
    </div>
  );
}

function PaymentView({ args, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <CreditCard className="w-5 h-5" />
        <span className="font-medium">Payment Authorization</span>
      </div>
      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">Reservation: {args.reservationId as string}</p>
      {isLoading && <LoadingBar />}
      <div className="text-sm text-chocolate-500">Awaiting payment confirmation...</div>
    </div>
  );
}

function VerifyPaymentView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const hasCompleted = result && (result as { hasCompletedPayment?: boolean }).hasCompletedPayment;
  
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <ShieldCheck className="w-5 h-5" />
        <span className="font-medium">Payment Verification</span>
      </div>
      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">Reservation: {args.reservationId as string}</p>
      {isLoading && <LoadingBar />}
      {result && (
        <div className={`flex items-center gap-2 text-sm ${hasCompleted ? 'text-green-600 dark:text-green-400' : 'text-chocolate-500'}`}>
          {hasCompleted ? (
            <><CheckCircle className="w-4 h-4" /> Payment verified successfully</>
          ) : (
            <>Payment pending verification...</>
          )}
        </div>
      )}
    </div>
  );
}

function BoardingPassView({ args }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const departure = args.departure as { cityName: string; airportCode: string; timestamp: string; terminal: string; gate: string } | undefined;
  const arrival = args.arrival as { cityName: string; airportCode: string } | undefined;
  return (
    <div className="rounded-xl border-2 border-chocolate-500 bg-gradient-to-br from-chocolate-50 to-chocolate-100 dark:from-chocolate-900 dark:to-chocolate-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
          <Plane className="w-6 h-6" />
          <span className="text-xl font-bold">BOARDING PASS</span>
        </div>
        <span className="text-lg font-mono font-bold">{args.flightNumber as string}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-chocolate-500 text-xs">PASSENGER</div>
          <div className="font-bold">{args.passengerName as string}</div>
        </div>
        <div>
          <div className="text-chocolate-500 text-xs">SEAT</div>
          <div className="font-bold text-2xl text-chocolate-600 dark:text-chocolate-400">{args.seat as string}</div>
        </div>
      </div>
      {departure && arrival && (
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold">{departure.airportCode}</div>
            <div className="text-xs text-chocolate-500">{departure.cityName}</div>
          </div>
          <Plane className="w-6 h-6 text-chocolate-400" />
          <div className="text-center">
            <div className="text-2xl font-bold">{arrival.airportCode}</div>
            <div className="text-xs text-chocolate-500">{arrival.cityName}</div>
          </div>
        </div>
      )}
      {departure && (
        <div className="flex gap-4 text-sm border-t border-chocolate-200 dark:border-chocolate-700 pt-3">
          <div><span className="text-chocolate-500">Terminal:</span> {departure.terminal}</div>
          <div><span className="text-chocolate-500">Gate:</span> {departure.gate}</div>
        </div>
      )}
    </div>
  );
}

function FlightStatusView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Plane className="w-5 h-5" />
        <span className="font-medium">Flight Status - {args.flightNumber as string}</span>
      </div>
      {isLoading && <LoadingBar />}
      {result && (
        <div className="text-sm">
          <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-chocolate-200 dark:bg-chocolate-700 text-chocolate-700 dark:text-chocolate-300">
            {(result as { status?: string }).status || "On Time"}
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Cloud className="w-5 h-5" />
        <span className="font-medium">Weather</span>
      </div>
      {isLoading && <LoadingBar />}
      {result && (result as { current?: { temperature_2m?: number } }).current && (
        <div className="text-sm text-chocolate-700 dark:text-chocolate-300">
          <span className="font-semibold">{(result as { current?: { temperature_2m?: number } }).current.temperature_2m}°C</span>
        </div>
      )}
    </div>
  );
}

function ImageGenerationView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const style = (args.style as string) || "realistic";
  
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Generating Image</span>
      </div>
      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">{args.prompt as string}</p>
      <p className="text-xs text-chocolate-400">Style: {style}</p>
      {isLoading && <LoadingBar />}
      {result && (
        <div className="text-xs text-chocolate-500">
          Image generation requested
        </div>
      )}
    </div>
  );
}

function DocumentView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const title = (args.title as string) || "Untitled Document";
  const kind = (args.kind as string) || "text";
  
  // Choose icon based on document kind
  const KindIcon = kind === "code" ? Code : kind === "sheet" ? Table : FileText;
  
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <KindIcon className="w-5 h-5" />
        <span className="font-medium">{args.id ? "Updating" : "Creating"} {kind === "code" ? "Code" : kind === "sheet" ? "Spreadsheet" : "Document"}</span>
      </div>
      <div className="text-sm space-y-1">
        <p className="font-medium text-chocolate-800 dark:text-chocolate-200">{title}</p>
        <p className="text-chocolate-500 text-xs uppercase">{kind}</p>
      </div>
      {isLoading && <LoadingBar />}
      {result && (result as { id?: string }).id && (
        <div className="flex items-center gap-2 text-xs text-chocolate-500">
          <CheckCircle className="w-3 h-3" />
          <span>{args.id ? "Updated" : "Created"} successfully</span>
        </div>
      )}
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
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Globe className="w-5 h-5" />
        <span className="font-medium">Web Search</span>
      </div>
      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">Query: {args.query as string}</p>
      {isLoading && <LoadingBar />}
      
      {/* Show AI-generated answer if available */}
      {tavilyResult?.answer && (
        <div className="p-3 bg-chocolate-100 dark:bg-chocolate-800 rounded-lg border border-chocolate-200 dark:border-chocolate-700">
          <p className="text-sm text-chocolate-800 dark:text-chocolate-200">{tavilyResult.answer}</p>
        </div>
      )}
      
      {/* Show search results */}
      {tavilyResult?.results && tavilyResult.results.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-xs text-chocolate-500 font-medium">Sources:</p>
          {tavilyResult.results.slice(0, 5).map((r, i) => (
            <a 
              key={i} 
              href={r.url} 
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 rounded-lg hover:bg-chocolate-100 dark:hover:bg-chocolate-800 transition-colors"
            >
              <p className="text-sm font-medium text-chocolate-700 dark:text-chocolate-300 hover:underline">{r.title}</p>
              {r.content && <p className="text-xs text-chocolate-500 line-clamp-2 mt-1">{r.content}</p>}
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
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Globe className="w-5 h-5" />
        <span className="font-medium">{toolLabels[toolName] || toolName}</span>
      </div>
      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">
        {(args.url || args.urls) as string}
      </p>
      {isLoading && <LoadingBar />}
      {result && (
        <div className="text-xs bg-chocolate-100 dark:bg-chocolate-800 p-2 rounded max-h-40 overflow-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function GenericToolView({ toolName, args, result, isLoading }: { toolName: string; args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <span className="font-medium">{toolName}</span>
      </div>
      <pre className="text-xs bg-chocolate-100 dark:bg-chocolate-800 p-2 rounded overflow-auto">{JSON.stringify(args, null, 2)}</pre>
      {isLoading && <LoadingBar />}
      {result && <pre className="text-xs bg-chocolate-200 dark:bg-chocolate-700 p-2 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

function LoadingBar() {
  return (
    <div className="h-1 w-full bg-chocolate-100 dark:bg-chocolate-800 rounded-full overflow-hidden">
      <div className="h-full bg-chocolate-500 animate-pulse" style={{ width: "60%" }} />
    </div>
  );
}

"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Plane, CreditCard, MapPin, Ticket, Search, Cloud, FileCode, FileText, Image as ImageIcon, Globe, CheckCircle, ShieldCheck, Sparkles, Code, Table, Monitor, ExternalLink, Maximize2, Play, ImagePlus, Link2, FileDown, TreePine } from "lucide-react";
import { Snippet, SnippetHeader, SnippetCopyButton, SnippetTabsList, SnippetTabsTrigger, SnippetTabsContent } from "@/components/kibo-ui/snippet";
import { Spinner } from "@/components/kibo-ui/spinner";
import { Status, StatusIndicator, StatusLabel } from "@/components/kibo-ui/status";
import { TableProvider, TableHeader, TableHeaderGroup, TableHead, TableColumnHeader, TableBody, TableRow, TableCell, type ColumnDef } from "@/components/kibo-ui/table";
import { Stories, StoriesContent, Story, StoryImage, StoryOverlay, StoryTitle } from "@/components/kibo-ui/stories";
import { cn } from "@/lib/utils";
import { ArtifactPreviewButton } from "./artifact-panel";
import { useArtifact } from "@/hooks/use-artifact";
import { getLanguageFromTitle } from "@/lib/artifacts/types";
import {
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai-elements/web-preview";

interface ToolViewProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: "pending" | "running" | "complete" | "error";
}

function LoadingIndicator({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-chocolate-500">
      <Spinner variant="ellipsis" className="text-chocolate-600" size={16} />
      <span>{label}</span>
    </div>
  );
}

function JsonSnippet({
  args,
  result,
  label,
}: {
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  label: string;
}) {
  const argsJson = JSON.stringify(args, null, 2);
  const resultJson = JSON.stringify(result ?? {}, null, 2);

  return (
    <Snippet
      className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800"
      defaultValue="args"
    >
      <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
        <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">{label}</div>
        <SnippetCopyButton
          className="text-chocolate-500 hover:text-chocolate-800"
          value={`${argsJson}\n${resultJson}`}
        />
      </SnippetHeader>
      <SnippetTabsList>
        <SnippetTabsTrigger value="args">Args</SnippetTabsTrigger>
        <SnippetTabsTrigger value="result">Result</SnippetTabsTrigger>
      </SnippetTabsList>
      <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900" value="args">
        <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{argsJson}</pre>
      </SnippetTabsContent>
      <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900" value="result">
        <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{resultJson}</pre>
      </SnippetTabsContent>
    </Snippet>
  );
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
    case "renderImage":
    case "createImage":
    case "generateAdvancedImage":
      return <ImageGenerationView args={args} result={result} isLoading={isLoading} />;
    case "analyzeImage":
    case "processImages":
      return <MultimodalImageView args={args} result={result} isLoading={isLoading} />;
    case "webSearch":
      return <WebSearchView args={args} result={result} isLoading={isLoading} />;
    case "tavilyExtract":
    case "tavilyCrawl":
    case "tavilyMap":
      return <TavilyToolView toolName={toolName} args={args} result={result} isLoading={isLoading} />;
    // Hyperbrowser Tools with Live Preview
    case "hyperAgentTask":
      return <HyperAgentView args={args} result={result} isLoading={isLoading} />;
    case "hyperbrowserExtract":
    case "hyperbrowserScrape":
      return <HyperbrowserScrapeView toolName={toolName} args={args} result={result} isLoading={isLoading} />;
    case "createBrowserSession":
      return <BrowserSessionView args={args} result={result} isLoading={isLoading} />;
    // Browserbase Tools (BrowseGPT parity)
    case "browserbaseCreateSession":
    case "createSession":
      return <BrowserbaseSessionView args={args} result={result} isLoading={isLoading} />;
    case "browserbaseNavigate":
    case "navigate":
      return <BrowserbaseNavigateView args={args} result={result} isLoading={isLoading} />;
    case "browserbaseSearch":
    case "googleSearch":
      return <BrowserbaseSearchView args={args} result={result} isLoading={isLoading} />;
    case "browserbaseGetContent":
    case "getPageContent":
      return <BrowserbaseContentView args={args} result={result} isLoading={isLoading} />;
    case "browserbaseAskConfirmation":
    case "askForConfirmation":
      return <BrowserbaseConfirmationView args={args} result={result} isLoading={isLoading} />;
    // Deepcrawl Tools
    case "deepcrawlGetMarkdown":
      return <DeepcrawlMarkdownView args={args} result={result} isLoading={isLoading} />;
    case "deepcrawlReadUrl":
      return <DeepcrawlReadUrlView args={args} result={result} isLoading={isLoading} />;
    case "deepcrawlGetLinks":
    case "deepcrawlExtractLinks":
      return <DeepcrawlLinksView toolName={toolName} args={args} result={result} isLoading={isLoading} />;
    default:
      return <GenericToolView toolName={toolName} args={args} result={result} isLoading={isLoading} />;
  }
}

type FlightOption = { flightNumber: string; price: number; departureTime: string };

function SearchFlightsView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const flights = useMemo<FlightOption[]>(() => {
    if (!result || !Array.isArray(result.flights)) return [];
    return (result.flights as FlightOption[]).slice(0, 5);
  }, [result]);

  const flightColumns = useMemo<ColumnDef<FlightOption>[]>(
    () => [
      {
        accessorKey: "flightNumber",
        header: ({ column }) => <TableColumnHeader column={column} title="Flight" />,
        cell: ({ row }) => (
          <span className="font-semibold text-chocolate-800 dark:text-chocolate-100">{row.original.flightNumber}</span>
        ),
      },
      {
        accessorKey: "departureTime",
        header: ({ column }) => <TableColumnHeader column={column} title="Departure" />,
        cell: ({ row }) => (
          <span className="text-chocolate-600 dark:text-chocolate-300">{row.original.departureTime}</span>
        ),
      },
      {
        accessorKey: "price",
        header: ({ column }) => <TableColumnHeader column={column} title="Price" />,
        cell: ({ row }) => (
          <span className="text-chocolate-700 dark:text-chocolate-200 font-medium">${row.original.price}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-4">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Search className="w-5 h-5" />
        <span className="font-medium">Searching Flights</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-chocolate-700 dark:text-chocolate-300">
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
      {isLoading && <LoadingIndicator label="Searching flights..." />}
      {!!flights.length && (
        <TableProvider
          className="border border-chocolate-200 dark:border-chocolate-700 rounded-xl overflow-hidden"
          columns={flightColumns}
          data={flights}
        >
          <TableHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            {({ headerGroup }) => (
              <TableHeaderGroup headerGroup={headerGroup}>
                {({ header }) => (
                  <TableHead
                    className="text-chocolate-600 dark:text-chocolate-200"
                    header={header}
                  />
                )}
              </TableHeaderGroup>
            )}
          </TableHeader>
          <TableBody className="bg-white dark:bg-chocolate-950">
            {({ row }) => (
              <TableRow
                className="hover:bg-chocolate-50 dark:hover:bg-chocolate-900"
                row={row}
              >
                {({ cell }) => (
                  <TableCell
                    cell={cell}
                    className="py-3 text-chocolate-800 dark:text-chocolate-100"
                  />
                )}
              </TableRow>
            )}
          </TableBody>
        </TableProvider>
      )}
      <JsonSnippet args={args} result={result} label="Flight query" />
    </div>
  );
}

type SeatInfo = { seat: string; status: "online" | "offline" };

function SelectSeatsView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const seatData = useMemo<SeatInfo[]>(() => {
    const seatMap = (result as { seatMap?: string[][] })?.seatMap;
    if (!seatMap) return [];
    return seatMap.flat().map((seat, index) => ({
      seat: seat === "X" ? `Seat ${index + 1}` : seat,
      status: seat === "X" ? "offline" : "online",
    }));
  }, [result]);

  const seatColumns = useMemo<ColumnDef<SeatInfo>[]>(
    () => [
      {
        accessorKey: "seat",
        header: ({ column }) => <TableColumnHeader column={column} title="Seat" />,
        cell: ({ row }) => row.original.seat,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <TableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Status status={row.original.status} className="text-xs px-2 py-1">
            <StatusIndicator />
            <StatusLabel>{row.original.status === "online" ? "Available" : "Reserved"}</StatusLabel>
          </Status>
        ),
      },
    ],
    [],
  );

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-4">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Ticket className="w-5 h-5" />
        <span className="font-medium">Seat Selection - {args.flightNumber as string}</span>
      </div>
      {isLoading && <LoadingIndicator label="Fetching seat map..." />}
      {!!seatData.length && (
        <TableProvider
          columns={seatColumns}
          data={seatData}
          className="border border-chocolate-200 dark:border-chocolate-700 rounded-xl"
        >
          <TableHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            {({ headerGroup }) => (
              <TableHeaderGroup headerGroup={headerGroup}>
                {({ header }) => (
                  <TableHead header={header} className="text-chocolate-600 dark:text-chocolate-200" />
                )}
              </TableHeaderGroup>
            )}
          </TableHeader>
          <TableBody className="bg-white dark:bg-chocolate-950">
            {({ row }) => (
              <TableRow row={row} className="hover:bg-chocolate-50 dark:hover:bg-chocolate-900">
                {({ cell }) => <TableCell cell={cell} className="py-3" />}
              </TableRow>
            )}
          </TableBody>
        </TableProvider>
      )}
      <JsonSnippet args={args} result={result} label="Seat selection" />
    </div>
  );
}

function ReservationView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const departure = args.departure as { cityName: string; airportCode: string; timestamp: string } | undefined;
  const arrival = args.arrival as { cityName: string; airportCode: string; timestamp: string } | undefined;
  const price = (result as { totalPriceInUSD?: number })?.totalPriceInUSD;

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-4">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Ticket className="w-5 h-5" />
        <span className="font-medium">Reservation</span>
      </div>
      <div className="text-sm space-y-2">
        <div><span className="text-chocolate-500">Passenger:</span> {args.passengerName as string}</div>
        <div><span className="text-chocolate-500">Flight:</span> {args.flightNumber as string}</div>
        {departure && <div><span className="text-chocolate-500">From:</span> {departure.cityName} ({departure.airportCode})</div>}
        {arrival && <div><span className="text-chocolate-500">To:</span> {arrival.cityName} ({arrival.airportCode})</div>}
        {price && (
          <div className="text-lg font-bold text-chocolate-700 dark:text-chocolate-300">Total: ${price}</div>
        )}
      </div>
      {isLoading && <LoadingIndicator label="Confirming reservation..." />}
      <JsonSnippet args={args} result={result} label="Reservation details" />
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
          <span className="font-semibold">{(result as { current?: { temperature_2m?: number } }).current?.temperature_2m}°C</span>
        </div>
      )}
    </div>
  );
}

function ImageGenerationView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const style = (args.style as string) || (result as any)?.style || "realistic";
  const aspectRatio = (args.aspectRatio as string) || (result as any)?.aspectRatio || "1:1";
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);
  
  // Handle different response formats
  const images = (result as any)?.images as Array<{ url: string; title?: string }> | undefined;
  const imageUrls = (result as any)?.imageUrls as string[] | undefined;
  const imageUrl = (result as any)?.url || (result as any)?.imageUrl;
  
  // Combine all image sources
  const allImages: string[] = [];
  if (imageUrl) allImages.push(imageUrl);
  if (imageUrls) allImages.push(...imageUrls);
  if (images) allImages.push(...images.map(img => img.url));

  // Auto-open artifact when image is generated
  useEffect(() => {
    if (allImages.length > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      // Create HTML content to display image(s)
      const imageHtml = allImages.map((url, i) => 
        `<figure class="image-container"><img src="${url}" alt="Generated image ${i + 1}" style="max-width: 100%; height: auto; border-radius: 8px;" /><figcaption>Image ${i + 1}</figcaption></figure>`
      ).join('\n');
      
      openArtifact({
        documentId: `image-${Date.now()}`,
        title: (args.prompt as string)?.slice(0, 50) || "Generated Image",
        kind: "text",
        content: imageHtml,
        messageId: "",
        status: "idle",
      });
    }
  }, [allImages.length, args.prompt, openArtifact]);
  
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <ImagePlus className="w-5 h-5" />
        <span className="font-medium">Generated Image</span>
        {(result as any)?.imageCount > 0 && (
          <span className="text-xs bg-chocolate-200 dark:bg-chocolate-700 px-2 py-0.5 rounded-full">
            {(result as any).imageCount} image{(result as any).imageCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">{args.prompt as string}</p>
      <div className="flex gap-2 text-xs text-chocolate-400">
        <span>Style: {style}</span>
        <span>•</span>
        <span>Aspect: {aspectRatio}</span>
      </div>
      {isLoading && <LoadingBar />}
      
      {/* Display single image */}
      {allImages.length === 1 && (
        <div className="rounded-lg overflow-hidden border border-chocolate-200 dark:border-chocolate-700">
          <img 
            src={allImages[0]} 
            alt={args.prompt as string} 
            className="w-full h-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('hidden');
            }}
          />
        </div>
      )}

      {/* Multiple images as Stories carousel */}
      {allImages.length > 1 && (
        <Stories>
          <StoriesContent>
            {allImages.map((url, idx) => (
              <Story className="aspect-[3/4] w-[200px]" key={idx}>
                <StoryImage 
                  alt={`Generated ${idx + 1}`} 
                  src={url}
                />
                <StoryOverlay side="bottom" />
                <StoryTitle className="truncate font-medium text-sm">
                  Image {idx + 1}
                </StoryTitle>
              </Story>
            ))}
          </StoriesContent>
        </Stories>
      )}

      {allImages.length === 0 && result && (result as any)?.status === "success" && (
        <div className="text-xs text-chocolate-500">
          Image generation complete (no images returned)
        </div>
      )}
      
      {(result as any)?.status === "error" && (
        <div className="text-xs text-red-500">
          Error: {(result as any)?.reason}
        </div>
      )}
    </div>
  );
}

// Multimodal Image Analysis View with Stories carousel
function MultimodalImageView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const analysis = (result as any)?.analysis || (result as any)?.description;
  const images = (result as any)?.images as Array<{ url: string; caption?: string }> | undefined;
  const storageId = args.storageId as string;
  
  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <ImageIcon className="w-5 h-5" />
        <span className="font-medium">Image Analysis</span>
      </div>

      {isLoading && <LoadingIndicator label="Analyzing image..." />}

      {/* Image carousel if multiple */}
      {images && images.length > 0 && (
        <Stories>
          <StoriesContent>
            {images.map((img, idx) => (
              <Story className="aspect-[3/4] w-[200px]" key={idx}>
                <StoryImage alt={img.caption || `Image ${idx + 1}`} src={img.url} />
                <StoryOverlay side="bottom" />
                {img.caption && (
                  <StoryTitle className="truncate font-medium text-sm">
                    {img.caption}
                  </StoryTitle>
                )}
              </Story>
            ))}
          </StoriesContent>
        </Stories>
      )}

      {/* Analysis result */}
      {analysis && (
        <div className="p-3 bg-chocolate-100 dark:bg-chocolate-800 rounded-lg">
          <p className="text-sm text-chocolate-800 dark:text-chocolate-200 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}

      {storageId && !images && (
        <p className="text-xs text-chocolate-500">Processing file: {storageId}</p>
      )}
    </div>
  );
}

function DocumentView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const title = (args.title as string) || "Untitled Document";
  const kind = (args.kind as string) || "text";
  const content = (args.content as string) || "";
  // Result includes: id, title, kind, content, message
  const resultData = result as { id?: string; title?: string; kind?: string; content?: string; message?: string } | undefined;
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  // Get language from title (e.g., "script.py" -> "python")
  const language = kind === "code" ? getLanguageFromTitle(title) : undefined;
  // Use content from result first, then fall back to args
  const finalContent = resultData?.content || content;

  // Reset auto-open flag when documentId changes
  useEffect(() => {
    hasAutoOpened.current = false;
  }, [resultData?.id]);

  // Auto-open artifact when document is created/updated
  useEffect(() => {
    if (resultData?.id && finalContent && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openArtifact({
        documentId: resultData.id,
        title,
        kind: kind as "code" | "text" | "sheet",
        content: finalContent,
        language,
        messageId: "",
        status: "idle",
      });
    }
  }, [resultData?.id, title, kind, finalContent, language, openArtifact]);

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
      {isLoading && <LoadingIndicator label={`${args.id ? "Updating" : "Creating"} document...`} />}
      {resultData?.id && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-chocolate-500">
            <CheckCircle className="w-3 h-3" />
            <span>{args.id ? "Updated" : "Created"} successfully</span>
          </div>
          <ArtifactPreviewButton
            artifact={{
              id: resultData.id,
              title,
              kind: kind as "code" | "text" | "sheet",
              content: finalContent,
              language,
            }}
          />
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

// =============================================================================
// Hyperbrowser Tool Views with Live Preview
// =============================================================================

function LivePreviewEmbed({ liveUrl, title = "Browser Session" }: { liveUrl: string; title?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-chocolate-500 font-medium flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          Live Browser Preview
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 rounded text-chocolate-500"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 rounded text-chocolate-500"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <WebPreview
        defaultUrl={liveUrl}
        className={cn(
          "overflow-hidden border border-chocolate-200 dark:border-chocolate-700 transition-all duration-300",
          isExpanded ? "h-[520px]" : "h-[320px]"
        )}
      >
        <WebPreviewNavigation className="bg-chocolate-50 dark:bg-chocolate-900">
          <WebPreviewUrl />
          <WebPreviewNavigationButton
            onClick={() => window.open(liveUrl, "_blank", "noopener,noreferrer")}
            tooltip="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </WebPreviewNavigationButton>
        </WebPreviewNavigation>
        <WebPreviewBody src={liveUrl} title={title} />
      </WebPreview>
    </div>
  );
}

function HyperAgentView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const liveUrl = (result as any)?.liveUrl || (result as any)?.live_url;
  const finalResult = (result as any)?.finalResult;
  const steps = (result as any)?.steps as Array<{ action?: string; result?: string }> | undefined;
  const status = (result as any)?.status;

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-4">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Play className="w-5 h-5" />
        <span className="font-medium">HyperAgent Browser Automation</span>
        {status && (
          <Status status={status === "completed" ? "online" : status === "failed" ? "offline" : "degraded"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      <div className="text-sm text-chocolate-700 dark:text-chocolate-300 bg-chocolate-100 dark:bg-chocolate-800 p-3 rounded-lg">
        <span className="text-chocolate-500 text-xs uppercase block mb-1">Task</span>
        {args.task as string}
      </div>

      {isLoading && (
        <div className="space-y-2">
          <LoadingIndicator label="Executing browser automation..." />
          {liveUrl && <LivePreviewEmbed liveUrl={liveUrl} title="HyperAgent Session" />}
        </div>
      )}

      {!isLoading && liveUrl && (
        <LivePreviewEmbed liveUrl={liveUrl} title="HyperAgent Session" />
      )}

      {finalResult && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Result
          </p>
          <p className="text-sm text-green-800 dark:text-green-200">{finalResult}</p>
        </div>
      )}

      {steps && steps.length > 0 && (
        <Snippet className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800" defaultValue="steps">
          <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">Execution Steps ({steps.length})</div>
          </SnippetHeader>
          <SnippetTabsList>
            <SnippetTabsTrigger value="steps">Steps</SnippetTabsTrigger>
            <SnippetTabsTrigger value="raw">Raw</SnippetTabsTrigger>
          </SnippetTabsList>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-48 overflow-auto" value="steps">
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="text-xs p-2 bg-chocolate-100 dark:bg-chocolate-800 rounded">
                  <span className="text-chocolate-500">Step {i + 1}:</span> {step.action || JSON.stringify(step)}
                </div>
              ))}
            </div>
          </SnippetTabsContent>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900" value="raw">
            <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{JSON.stringify(result, null, 2)}</pre>
          </SnippetTabsContent>
        </Snippet>
      )}
    </div>
  );
}

function HyperbrowserScrapeView({ toolName, args, result, isLoading }: { toolName: string; args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const liveUrl = (result as any)?.liveUrl;
  const data = (result as any)?.data;
  const status = (result as any)?.status;
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  // Auto-open artifact when data is scraped
  useEffect(() => {
    if (data && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      openArtifact({
        documentId: `scrape-${Date.now()}`,
        title: `Scraped: ${(args.url as string) || "Page Content"}`,
        kind: typeof data === "string" ? "text" : "code",
        content,
        language: typeof data === "string" ? undefined : "json",
        messageId: "",
        status: "idle",
      });
    }
  }, [data, args.url, openArtifact]);

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Globe className="w-5 h-5" />
        <span className="font-medium">
          {toolName === "hyperbrowserExtract" ? "Content Extraction" : "Page Scraping"}
        </span>
        {status && (
          <Status status={status === "completed" ? "online" : "degraded"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      <p className="text-sm text-chocolate-600 dark:text-chocolate-400">
        {(args.url || (args.urls as string[])?.join(", ")) as string}
      </p>

      {isLoading && <LoadingBar />}

      {liveUrl && <LivePreviewEmbed liveUrl={liveUrl} />}

      {data && (
        <div className="text-xs bg-chocolate-100 dark:bg-chocolate-800 p-3 rounded max-h-60 overflow-auto">
          <pre className="whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">
            {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function BrowserSessionView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const liveUrl = (result as any)?.liveUrl;
  const sessionId = (result as any)?.sessionId;
  const status = (result as any)?.status;

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Monitor className="w-5 h-5" />
        <span className="font-medium">Browser Session</span>
        {status && (
          <Status status={status === "created" ? "online" : "degraded"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      {isLoading && <LoadingIndicator label="Creating browser session..." />}

      {sessionId && (
        <div className="text-xs">
          <span className="text-chocolate-500">Session ID:</span>{" "}
          <code className="bg-chocolate-100 dark:bg-chocolate-800 px-1 py-0.5 rounded">{sessionId}</code>
        </div>
      )}

      {liveUrl && <LivePreviewEmbed liveUrl={liveUrl} title="Browser Session" />}
    </div>
  );
}

// =============================================================================
// Deepcrawl Tool Views
// =============================================================================

function DeepcrawlMarkdownView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const markdown = (result as any)?.markdown;
  const status = (result as any)?.status;
  const url = args.url as string;
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  // Auto-open artifact when markdown is extracted
  useEffect(() => {
    if (markdown && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openArtifact({
        documentId: `markdown-${Date.now()}`,
        title: `Content from ${new URL(url).hostname}`,
        kind: "text",
        content: markdown,
        messageId: "",
        status: "idle",
      });
    }
  }, [markdown, url, openArtifact]);

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <FileDown className="w-5 h-5" />
        <span className="font-medium">Markdown Extraction</span>
        {status && (
          <Status status={status === "success" ? "online" : status === "error" ? "offline" : "degraded"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-chocolate-600 dark:text-chocolate-400 hover:underline flex items-center gap-1"
      >
        <Globe className="w-3 h-3" />
        {url}
      </a>

      {isLoading && <LoadingIndicator label="Extracting markdown..." />}

      {markdown && (
        <Snippet className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800" defaultValue="preview">
          <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">Content</div>
            <SnippetCopyButton className="text-chocolate-500 hover:text-chocolate-800" value={markdown} />
          </SnippetHeader>
          <SnippetTabsList>
            <SnippetTabsTrigger value="preview">Preview</SnippetTabsTrigger>
            <SnippetTabsTrigger value="raw">Raw</SnippetTabsTrigger>
          </SnippetTabsList>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-64 overflow-auto" value="preview">
            <div className="prose prose-sm dark:prose-invert max-w-none text-chocolate-700 dark:text-chocolate-200">
              {markdown.slice(0, 2000)}{markdown.length > 2000 && "..."}
            </div>
          </SnippetTabsContent>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-64 overflow-auto" value="raw">
            <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{markdown}</pre>
          </SnippetTabsContent>
        </Snippet>
      )}

      {(result as any)?.reason && (
        <div className="text-xs text-red-500">Error: {(result as any).reason}</div>
      )}
    </div>
  );
}

function DeepcrawlReadUrlView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const url = args.url as string;
  const status = (result as any)?.status;
  const title = (result as any)?.title;
  const description = (result as any)?.description;
  const markdown = (result as any)?.markdown;
  const metadata = (result as any)?.metadata;
  const cached = (result as any)?.cached;
  const metrics = (result as any)?.metrics;
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  // Auto-open artifact when page content is read
  useEffect(() => {
    if (markdown && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openArtifact({
        documentId: `page-${Date.now()}`,
        title: title || `Content from ${new URL(url).hostname}`,
        kind: "text",
        content: markdown,
        messageId: "",
        status: "idle",
      });
    }
  }, [markdown, title, url, openArtifact]);

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Globe className="w-5 h-5" />
        <span className="font-medium">Page Content</span>
        {cached && (
          <span className="text-xs bg-chocolate-200 dark:bg-chocolate-700 px-2 py-0.5 rounded-full">Cached</span>
        )}
        {status && (
          <Status status={status === "success" ? "online" : "offline"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-chocolate-600 dark:text-chocolate-400 hover:underline flex items-center gap-1"
      >
        <ExternalLink className="w-3 h-3" />
        {url}
      </a>

      {isLoading && <LoadingIndicator label="Reading page content..." />}

      {title && (
        <div className="p-3 bg-chocolate-100 dark:bg-chocolate-800 rounded-lg">
          <h3 className="font-medium text-chocolate-800 dark:text-chocolate-200">{title}</h3>
          {description && <p className="text-sm text-chocolate-600 dark:text-chocolate-400 mt-1">{description}</p>}
        </div>
      )}

      {metrics && (
        <div className="flex gap-3 text-xs text-chocolate-500">
          {metrics.readableDuration && <span>Duration: {metrics.readableDuration}</span>}
          {metrics.durationMs && <span>({metrics.durationMs}ms)</span>}
        </div>
      )}

      {(markdown || metadata) && (
        <Snippet className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800" defaultValue="markdown">
          <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">Content</div>
            <SnippetCopyButton className="text-chocolate-500 hover:text-chocolate-800" value={markdown || JSON.stringify(metadata, null, 2)} />
          </SnippetHeader>
          <SnippetTabsList>
            {markdown && <SnippetTabsTrigger value="markdown">Markdown</SnippetTabsTrigger>}
            {metadata && <SnippetTabsTrigger value="metadata">Metadata</SnippetTabsTrigger>}
          </SnippetTabsList>
          {markdown && (
            <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-64 overflow-auto" value="markdown">
              <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{markdown.slice(0, 3000)}{markdown.length > 3000 && "..."}</pre>
            </SnippetTabsContent>
          )}
          {metadata && (
            <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-64 overflow-auto" value="metadata">
              <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{JSON.stringify(metadata, null, 2)}</pre>
            </SnippetTabsContent>
          )}
        </Snippet>
      )}
    </div>
  );
}

interface LinkTreeNode {
  url: string;
  name?: string;
  children?: LinkTreeNode[];
  metadata?: { title?: string; description?: string };
}

function LinkTreeDisplay({ node, depth = 0 }: { node: LinkTreeNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={cn("text-xs", depth > 0 && "ml-4 border-l border-chocolate-200 dark:border-chocolate-700 pl-2")}>
      <div 
        className="flex items-center gap-1 py-1 hover:bg-chocolate-100 dark:hover:bg-chocolate-800 rounded px-1 cursor-pointer"
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren && (
          <span className="text-chocolate-400">{isExpanded ? "▼" : "▶"}</span>
        )}
        {!hasChildren && <span className="w-3" />}
        <Link2 className="w-3 h-3 text-chocolate-400" />
        <a 
          href={node.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-chocolate-600 dark:text-chocolate-300 hover:underline truncate max-w-[300px]"
          onClick={(e) => e.stopPropagation()}
        >
          {node.name || node.metadata?.title || node.url}
        </a>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.slice(0, 20).map((child, i) => (
            <LinkTreeDisplay key={i} node={child} depth={depth + 1} />
          ))}
          {node.children!.length > 20 && (
            <div className="text-chocolate-400 text-xs ml-4 py-1">
              +{node.children!.length - 20} more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeepcrawlLinksView({ toolName, args, result, isLoading }: { toolName: string; args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const url = args.url as string;
  const status = (result as any)?.status;
  const tree = (result as any)?.tree as LinkTreeNode | undefined;
  const extractedLinks = (result as any)?.extractedLinks;
  const title = (result as any)?.title;
  const cached = (result as any)?.cached;

  const internalLinks = extractedLinks?.internal || [];
  const externalLinks = extractedLinks?.external || [];

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <TreePine className="w-5 h-5" />
        <span className="font-medium">
          {toolName === "deepcrawlExtractLinks" ? "Site Map" : "Link Extraction"}
        </span>
        {cached && (
          <span className="text-xs bg-chocolate-200 dark:bg-chocolate-700 px-2 py-0.5 rounded-full">Cached</span>
        )}
        {status && (
          <Status status={status === "success" ? "online" : "offline"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-chocolate-600 dark:text-chocolate-400 hover:underline flex items-center gap-1"
      >
        <Globe className="w-3 h-3" />
        {title || url}
      </a>

      {isLoading && <LoadingIndicator label="Extracting links..." />}

      {tree && (
        <div className="bg-white dark:bg-chocolate-950 rounded-lg border border-chocolate-200 dark:border-chocolate-700 p-3 max-h-80 overflow-auto">
          <LinkTreeDisplay node={tree} />
        </div>
      )}

      {!tree && (internalLinks.length > 0 || externalLinks.length > 0) && (
        <Snippet className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800" defaultValue="internal">
          <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">
              {internalLinks.length + externalLinks.length} Links Found
            </div>
          </SnippetHeader>
          <SnippetTabsList>
            <SnippetTabsTrigger value="internal">Internal ({internalLinks.length})</SnippetTabsTrigger>
            <SnippetTabsTrigger value="external">External ({externalLinks.length})</SnippetTabsTrigger>
          </SnippetTabsList>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-48 overflow-auto" value="internal">
            <div className="space-y-1">
              {internalLinks.slice(0, 30).map((link: string, i: number) => (
                <a 
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-chocolate-600 dark:text-chocolate-300 hover:underline truncate"
                >
                  {link}
                </a>
              ))}
              {internalLinks.length > 30 && (
                <div className="text-chocolate-400 text-xs">+{internalLinks.length - 30} more...</div>
              )}
            </div>
          </SnippetTabsContent>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-48 overflow-auto" value="external">
            <div className="space-y-1">
              {externalLinks.slice(0, 30).map((link: string, i: number) => (
                <a 
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-chocolate-600 dark:text-chocolate-300 hover:underline truncate"
                >
                  {link}
                </a>
              ))}
              {externalLinks.length > 30 && (
                <div className="text-chocolate-400 text-xs">+{externalLinks.length - 30} more...</div>
              )}
            </div>
          </SnippetTabsContent>
        </Snippet>
      )}

      {(result as any)?.reason && (
        <div className="text-xs text-red-500">Error: {(result as any).reason}</div>
      )}
    </div>
  );
}

// =============================================================================
// Browserbase Tool Views (BrowseGPT Feature Parity)
// =============================================================================

function BrowserbaseDebuggerEmbed({
  debuggerUrl,
  title = "Browser Session",
  sessionId
}: {
  debuggerUrl: string;
  title?: string;
  sessionId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Append navBar=false if not present
  const embedUrl = debuggerUrl.includes("navBar=")
    ? debuggerUrl
    : `${debuggerUrl}${debuggerUrl.includes("?") ? "&" : "?"}navBar=false`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-chocolate-500 font-medium flex items-center gap-1">
          <Monitor className="w-3 h-3" />
          Live Browser Session
          {sessionId && (
            <code className="ml-2 bg-chocolate-100 dark:bg-chocolate-800 px-1.5 py-0.5 rounded text-[10px]">
              {sessionId.slice(0, 8)}...
            </code>
          )}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 rounded text-chocolate-500"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <a
            href={debuggerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-chocolate-200 dark:hover:bg-chocolate-700 rounded text-chocolate-500"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className={cn(
        "rounded-lg overflow-hidden border border-chocolate-200 dark:border-chocolate-700 transition-all duration-300",
        isExpanded ? "h-[520px]" : "h-[320px]"
      )}>
        <iframe
          src={embedUrl}
          className="w-full h-full"
          title={title}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}

function BrowserbaseSessionView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const sessionId = (result as any)?.sessionId;
  const debugUrl = (result as any)?.debugUrl || (result as any)?.debuggerFullscreenUrl;
  const toolName = (result as any)?.toolName || "Creating session";

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Monitor className="w-5 h-5" />
        <span className="font-medium">Browserbase Session</span>
        {sessionId && (
          <Status status="online" className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>Active</StatusLabel>
          </Status>
        )}
      </div>

      {isLoading && <LoadingIndicator label="Creating browser session..." />}

      {sessionId && (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-chocolate-500">Session ID:</span>
            <code className="bg-chocolate-100 dark:bg-chocolate-800 px-2 py-0.5 rounded text-xs font-mono">
              {sessionId}
            </code>
          </div>
          {toolName && (
            <div className="text-xs text-chocolate-400">
              {toolName}
            </div>
          )}
        </div>
      )}

      {debugUrl && (
        <BrowserbaseDebuggerEmbed
          debuggerUrl={debugUrl}
          title="Browserbase Session"
          sessionId={sessionId}
        />
      )}
    </div>
  );
}

function BrowserbaseNavigateView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const url = (args.url as string) || (result as any)?.url;
  const sessionId = (result as any)?.sessionId;
  const debugUrl = (args as any)?.debuggerFullscreenUrl || (result as any)?.debuggerFullscreenUrl || (result as any)?.debugUrl;
  const status = (result as any)?.status;

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Globe className="w-5 h-5" />
        <span className="font-medium">Navigate to URL</span>
        {status && (
          <Status status={status === "success" ? "online" : "degraded"} className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>{status}</StatusLabel>
          </Status>
        )}
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-chocolate-600 dark:text-chocolate-400 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          {url}
        </a>
      )}

      {isLoading && <LoadingIndicator label="Navigating..." />}

      {debugUrl && (
        <BrowserbaseDebuggerEmbed
          debuggerUrl={debugUrl}
          title={`Navigating to ${url || 'page'}`}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}

function BrowserbaseSearchView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const query = (args.query as string) || (args.searchQuery as string);
  const sessionId = (result as any)?.sessionId;
  const debugUrl = (args as any)?.debuggerFullscreenUrl || (result as any)?.debuggerFullscreenUrl || (result as any)?.debugUrl;
  const content = (result as any)?.content;
  const dataCollected = (result as any)?.dataCollected;
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  // Auto-open artifact when search results are collected
  useEffect(() => {
    if (content && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openArtifact({
        documentId: `search-${Date.now()}`,
        title: `Search: ${query?.slice(0, 40) || "Google Search"}`,
        kind: "text",
        content: content,
        messageId: "",
        status: "idle",
      });
    }
  }, [content, query, openArtifact]);

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <Search className="w-5 h-5" />
        <span className="font-medium">Google Search</span>
        {dataCollected && (
          <Status status="online" className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>Data Collected</StatusLabel>
          </Status>
        )}
      </div>

      {query && (
        <div className="text-sm text-chocolate-700 dark:text-chocolate-300 bg-chocolate-100 dark:bg-chocolate-800 p-3 rounded-lg">
          <span className="text-chocolate-500 text-xs uppercase block mb-1">Query</span>
          {query}
        </div>
      )}

      {isLoading && <LoadingIndicator label="Searching Google..." />}

      {debugUrl && (
        <BrowserbaseDebuggerEmbed
          debuggerUrl={debugUrl}
          title={`Searching: ${query || 'Google'}`}
          sessionId={sessionId}
        />
      )}

      {content && (
        <Snippet className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800" defaultValue="content">
          <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">Search Results</div>
            <SnippetCopyButton className="text-chocolate-500 hover:text-chocolate-800" value={content} />
          </SnippetHeader>
          <SnippetTabsList>
            <SnippetTabsTrigger value="content">Content</SnippetTabsTrigger>
            <SnippetTabsTrigger value="raw">Raw</SnippetTabsTrigger>
          </SnippetTabsList>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-48 overflow-auto" value="content">
            <div className="prose prose-sm dark:prose-invert max-w-none text-chocolate-700 dark:text-chocolate-200">
              {content.slice(0, 2000)}{content.length > 2000 && "..."}
            </div>
          </SnippetTabsContent>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-48 overflow-auto" value="raw">
            <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{content}</pre>
          </SnippetTabsContent>
        </Snippet>
      )}
    </div>
  );
}

function BrowserbaseContentView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const url = (args.url as string);
  const sessionId = (result as any)?.sessionId;
  const debugUrl = (args as any)?.debuggerFullscreenUrl || (result as any)?.debuggerFullscreenUrl;
  const content = (result as any)?.content;
  const dataCollected = (result as any)?.dataCollected;
  const { openArtifact } = useArtifact();
  const hasAutoOpened = useRef(false);

  // Auto-open artifact when page content is extracted
  useEffect(() => {
    if (content && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      openArtifact({
        documentId: `content-${Date.now()}`,
        title: `Content from ${url ? new URL(url).hostname : 'page'}`,
        kind: "text",
        content: content,
        messageId: "",
        status: "idle",
      });
    }
  }, [content, url, openArtifact]);

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <FileText className="w-5 h-5" />
        <span className="font-medium">Page Content</span>
        {dataCollected && (
          <Status status="online" className="text-xs px-2 py-0.5 ml-auto">
            <StatusIndicator />
            <StatusLabel>Extracted</StatusLabel>
          </Status>
        )}
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-chocolate-600 dark:text-chocolate-400 hover:underline flex items-center gap-1"
        >
          <Globe className="w-3 h-3" />
          {url}
        </a>
      )}

      {isLoading && <LoadingIndicator label="Extracting page content..." />}

      {debugUrl && (
        <BrowserbaseDebuggerEmbed
          debuggerUrl={debugUrl}
          title="Extracting Content"
          sessionId={sessionId}
        />
      )}

      {content && (
        <Snippet className="bg-white/70 dark:bg-chocolate-950/60 border-chocolate-200 dark:border-chocolate-800" defaultValue="content">
          <SnippetHeader className="bg-chocolate-100 dark:bg-chocolate-800">
            <div className="text-xs font-medium text-chocolate-600 dark:text-chocolate-200">Extracted Content</div>
            <SnippetCopyButton className="text-chocolate-500 hover:text-chocolate-800" value={content} />
          </SnippetHeader>
          <SnippetTabsList>
            <SnippetTabsTrigger value="content">Preview</SnippetTabsTrigger>
            <SnippetTabsTrigger value="raw">Raw</SnippetTabsTrigger>
          </SnippetTabsList>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-64 overflow-auto" value="content">
            <div className="prose prose-sm dark:prose-invert max-w-none text-chocolate-700 dark:text-chocolate-200">
              {content.slice(0, 3000)}{content.length > 3000 && "..."}
            </div>
          </SnippetTabsContent>
          <SnippetTabsContent className="bg-chocolate-50 dark:bg-chocolate-900 max-h-64 overflow-auto" value="raw">
            <pre className="text-xs whitespace-pre-wrap text-chocolate-700 dark:text-chocolate-200">{content}</pre>
          </SnippetTabsContent>
        </Snippet>
      )}
    </div>
  );
}

function BrowserbaseConfirmationView({ args, result, isLoading }: { args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  const message = (args.message as string) || "Awaiting confirmation...";
  const confirmed = (result as any)?.confirmed;

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <ShieldCheck className="w-5 h-5" />
        <span className="font-medium">Confirmation Required</span>
      </div>

      <p className="text-sm text-chocolate-700 dark:text-chocolate-300">{message}</p>

      {isLoading && <LoadingIndicator label="Awaiting confirmation..." />}

      {confirmed !== undefined && (
        <div className={`flex items-center gap-2 text-sm ${confirmed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {confirmed ? (
            <><CheckCircle className="w-4 h-4" /> Confirmed</>
          ) : (
            <>Action declined</>
          )}
        </div>
      )}
    </div>
  );
}

function GenericToolView({ toolName, args, result, isLoading }: { toolName: string; args: Record<string, unknown>; result?: Record<string, unknown>; isLoading: boolean }) {
  // Check if result contains a liveUrl for any generic tool
  const liveUrl = (result as any)?.liveUrl || (result as any)?.live_url;
  // Also check for Browserbase debugger URL in args or result (BrowseGPT pattern)
  const debuggerUrl = (args as any)?.debuggerFullscreenUrl || (result as any)?.debuggerFullscreenUrl || (result as any)?.debugUrl;
  const sessionId = (result as any)?.sessionId;

  return (
    <div className="rounded-xl border border-chocolate-200 dark:border-chocolate-700 bg-chocolate-50 dark:bg-chocolate-900 p-4 space-y-3">
      <div className="flex items-center gap-2 text-chocolate-600 dark:text-chocolate-400">
        <span className="font-medium">{toolName}</span>
        {sessionId && (
          <code className="ml-auto text-xs bg-chocolate-100 dark:bg-chocolate-800 px-2 py-0.5 rounded">
            Session: {sessionId.slice(0, 8)}...
          </code>
        )}
      </div>
      <pre className="text-xs bg-chocolate-100 dark:bg-chocolate-800 p-2 rounded overflow-auto max-h-32">{JSON.stringify(args, null, 2)}</pre>
      {isLoading && <LoadingBar />}
      {/* Browserbase debugger iframe embedding (BrowseGPT pattern) */}
      {debuggerUrl && (
        <BrowserbaseDebuggerEmbed
          debuggerUrl={debuggerUrl}
          title={toolName}
          sessionId={sessionId}
        />
      )}
      {/* Hyperbrowser/other live preview */}
      {liveUrl && !debuggerUrl && <LivePreviewEmbed liveUrl={liveUrl} />}
      {result && <pre className="text-xs bg-chocolate-200 dark:bg-chocolate-700 p-2 rounded overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>}
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

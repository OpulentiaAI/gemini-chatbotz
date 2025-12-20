import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "Ensure JWKS fresh",
  { hourUTC: 3, minuteUTC: 0 },
  internal.auth.ensureFreshJwks
);

export default crons;

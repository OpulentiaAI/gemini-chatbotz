export async function GET() {
  return new Response('Test endpoint working - updated', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

import { NextRequest } from "next/server";
import { POST } from "../route";

describe("POST /api/auth/register", () => {
  it("should return 400 if any required field is missing", async () => {
    // Missing 'phone' field
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        shippingAddress: "123 Main St",
        billingAddress: "123 Main St",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toEqual({ error: "All fields are required" });
  });

  it("should return 400 if body is entirely empty", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toEqual({ error: "All fields are required" });
  });
});

import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * The organizer's core loop: create a draft, fill it in, publish it.
 *
 * Driven through the API rather than the form UI. The editor is a large
 * controlled form and clicking through it would test the widgets more than the
 * behaviour; what matters here is that the payloads the form actually sends
 * are accepted, and that publishing enforces its preconditions.
 */

async function createDraft(request: APIRequestContext): Promise<string> {
  const response = await request.post("/api/events/create-event");
  expect(response.status(), await response.text()).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
}

async function venueId(request: APIRequestContext): Promise<string> {
  const response = await request.get("/api/venues");
  const venues = (await response.json()) as Array<{
    id: string;
    venueName: string;
  }>;
  const venue = venues.find((v) => v.venueName === "The Warehouse");
  if (!venue) throw new Error("Seeded venue missing");
  return venue.id;
}

/** Exactly what components/event-form.tsx sends on save. */
function editorPayload(venue: string) {
  return {
    eventName: "Basement Tapes",
    eventDescription: "A night of tape loops and modular noise.",
    eventFlyer: "https://picsum.photos/seed/basement/1200/630",
    // The form initialises this to "" and posts the whole form on save.
    status: "",
    timings: [
      {
        date: "2026-12-05T00:00:00.000Z",
        startTime: "21:00",
        endTime: "23:30",
      },
    ],
    ticketVariants: [
      {
        type: "General Admission",
        description: "Standing, main room",
        price: "18",
        quantity: "80",
      },
    ],
    promoCodes: [],
    platformFee: "user",
    paymentGatewayFee: "user",
    venue: { id: venue },
  };
}

test.describe("event editor", () => {
  test("a draft can be created", async ({ request }) => {
    const id = await createDraft(request);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const read = await request.get(`/api/events/${id}`);
    expect(read.status()).toBe(200);
    expect((await read.json()).status).toBe("draft");
  });

  test("the payload the form actually sends is accepted", async ({
    request,
  }) => {
    const id = await createDraft(request);

    const saved = await request.post(`/api/events/${id}`, {
      data: editorPayload(await venueId(request)),
    });
    expect(saved.status(), await saved.text()).toBe(200);

    const event = await (await request.get(`/api/events/${id}`)).json();
    expect(event.eventName).toBe("Basement Tapes");
    expect(event.timings).toHaveLength(1);
    expect(event.ticketVariants).toHaveLength(1);
    // 18.00 stored as minor units.
    expect(event.ticketVariants[0].priceMinor).toBe(1800);
    expect(event.venue?.venueName).toBe("The Warehouse");
    // Saving must not publish.
    expect(event.status).toBe("draft");
  });

  test("a configured event can be published", async ({ request }) => {
    const id = await createDraft(request);
    await request.post(`/api/events/${id}`, {
      data: editorPayload(await venueId(request)),
    });

    // The form publishes with status alone, having just saved everything else.
    const published = await request.post(`/api/events/${id}`, {
      data: { status: "active" },
    });
    expect(published.status(), await published.text()).toBe(200);

    const event = await (await request.get(`/api/events/${id}`)).json();
    expect(event.status).toBe("active");

    // And it is now publicly reachable.
    const publicView = await request.get(`/api/public/events/${id}`);
    expect(publicView.status()).toBe(200);
  });

  test("an empty draft cannot be published", async ({ request }) => {
    const id = await createDraft(request);

    const published = await request.post(`/api/events/${id}`, {
      data: { status: "active" },
    });
    expect(published.status()).toBe(400);
    expect(await published.text()).toMatch(/needs/i);

    // And it stays invisible to buyers.
    expect((await request.get(`/api/public/events/${id}`)).status()).toBe(404);
  });

  test("editing a ticket type preserves what has already sold", async ({
    request,
  }) => {
    const id = await createDraft(request);
    const venue = await venueId(request);
    await request.post(`/api/events/${id}`, { data: editorPayload(venue) });

    // Raise the allocation; remaining should move with it, not reset.
    const payload = editorPayload(venue);
    payload.ticketVariants[0].quantity = "120";
    await request.post(`/api/events/${id}`, { data: payload });

    const event = await (await request.get(`/api/events/${id}`)).json();
    expect(event.ticketVariants[0].quantity).toBe(120);
    expect(event.ticketVariants[0].remaining).toBe(120);
  });

  test("an organizer cannot read or edit somebody else's event", async ({
    request,
  }) => {
    // A well-formed id that is not theirs must 404 rather than leak existence.
    const foreign = "00000000-0000-0000-0000-000000000000";
    expect((await request.get(`/api/events/${foreign}`)).status()).toBe(404);
    expect(
      (await request.post(`/api/events/${foreign}`, { data: { eventName: "x" } }))
        .status()
    ).toBe(404);
  });

  test("a draft can be deleted", async ({ request }) => {
    const id = await createDraft(request);
    expect((await request.delete(`/api/events/${id}`)).status()).toBe(200);
    expect((await request.get(`/api/events/${id}`)).status()).toBe(404);
  });
});

test.describe("venues", () => {
  test("a venue can be created, edited and deleted", async ({ request }) => {
    const created = await request.post("/api/venues", {
      data: {
        venueName: "Test Room",
        address: "1 Test Street",
        city: "Austin",
        capacity: 50,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const venue = (await created.json()) as { id: string; venueName: string };
    expect(venue.venueName).toBe("Test Room");

    const updated = await request.put(`/api/venues/${venue.id}`, {
      data: { venueName: "Test Room B", city: "Austin", capacity: 75 },
    });
    expect(updated.status(), await updated.text()).toBe(200);
    expect((await updated.json()).venueName).toBe("Test Room B");

    expect((await request.delete(`/api/venues/${venue.id}`)).status()).toBe(204);
  });

  test("a venue needs a name", async ({ request }) => {
    const response = await request.post("/api/venues", {
      data: { city: "Austin" },
    });
    expect(response.status()).toBe(400);
  });
});

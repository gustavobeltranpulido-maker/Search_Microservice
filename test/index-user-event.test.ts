import { test } from "node:test";
import assert from "node:assert/strict";
import { IndexUserEventUseCase } from "../src/application/use-cases/index-user-event";
import { parseUserEvent } from "../src/application/use-cases/parse-user-event";
import type { UserIndexPort } from "../src/application/ports/user-index.port";
import type { UserDocument } from "../src/domain/user-document";

function fakeIndex() {
  const calls: string[] = [];
  const port: UserIndexPort = {
    ensureIndex: async () => {},
    upsert: async (user: UserDocument) => {
      calls.push(`upsert:${user.id}`);
    },
    remove: async (id: string) => {
      calls.push(`remove:${id}`);
    },
    search: async () => [],
  };
  return { port, calls };
}

test("user.created se indexa con los campos de la lista blanca", async () => {
  const { port, calls } = fakeIndex();
  const useCase = new IndexUserEventUseCase(port);

  const result = await useCase.execute({
    eventName: "user.created",
    occurredOn: "2026-11-17T15:00:00Z",
    payload: { id: "u1", name: "Ana", email: "ana@x.co", role: "MEMBER", status: "ACTIVE", password: "secreto" },
  });

  assert.equal(result, "upserted");
  assert.deepEqual(calls, ["upsert:u1"]);
});

test("el hash de contraseña nunca llega al documento indexado", () => {
  const event = parseUserEvent({
    eventName: "user.updated",
    payload: { id: "u1", name: "Ana", password: "hash-bcrypt", passwordHash: "x" },
  });

  assert.ok(event && event.kind === "upsert");
  assert.equal("password" in event.user, false);
  assert.equal("passwordHash" in event.user, false);
});

test("user.deleted borra por id y no falla si ya no existe", async () => {
  const { port, calls } = fakeIndex();
  const result = await new IndexUserEventUseCase(port).execute({
    eventName: "user.deleted",
    payload: { id: "u9" },
  });

  assert.equal(result, "deleted");
  assert.deepEqual(calls, ["remove:u9"]);
});

test("formato alternativo { type, data } también se acepta", () => {
  const event = parseUserEvent({ type: "USER_CREATED", data: { id: "u2", name: "Luis" } });
  assert.ok(event && event.kind === "upsert");
  assert.equal(event.user.id, "u2");
});

test("eventos de otros tipos o mal formados se ignoran", async () => {
  const { port, calls } = fakeIndex();
  const useCase = new IndexUserEventUseCase(port);

  assert.equal(await useCase.execute({ eventName: "account.created", payload: { id: "a1" } }), "ignored");
  assert.equal(await useCase.execute({ eventName: "user.created", payload: {} }), "ignored");
  assert.equal(await useCase.execute("texto suelto"), "ignored");
  assert.deepEqual(calls, []);
});

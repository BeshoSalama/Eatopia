import { normalizeStoredMediaUrl, parseServerDate, resolveMediaUrl } from "./api";

test("normalizes old localhost upload URLs into portable upload paths", () => {
  expect(normalizeStoredMediaUrl("http://localhost:5265/uploads/profile/avatar.png")).toBe("/uploads/profile/avatar.png");
  expect(normalizeStoredMediaUrl("https://localhost:7265/uploads/recipes/meal.jpg?x=1")).toBe("/uploads/recipes/meal.jpg?x=1");
  expect(normalizeStoredMediaUrl("uploads/posts/photo.webp")).toBe("/uploads/posts/photo.webp");
});

test("keeps external media URLs unchanged and resolves local uploads to the API origin", () => {
  expect(normalizeStoredMediaUrl("https://cdn.example.com/meal.jpg")).toBe("https://cdn.example.com/meal.jpg");
  expect(resolveMediaUrl("/uploads/recipes/meal.jpg")).toBe("http://localhost:3001/uploads/recipes/meal.jpg");
});

test("treats SQL-style timezone-less ISO dates as UTC", () => {
  expect(parseServerDate("2026-05-06T10:15:00")?.toISOString()).toBe("2026-05-06T10:15:00.000Z");
  expect(parseServerDate("not a date")).toBeNull();
});

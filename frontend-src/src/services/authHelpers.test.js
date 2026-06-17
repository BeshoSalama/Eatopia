import { storeBackendUser } from "./authHelpers";

afterEach(() => {
  localStorage.clear();
});

test("stores backend users with normalized identity and media fields", () => {
  const listener = jest.fn();
  window.addEventListener("eatopia-auth-changed", listener);

  const stored = storeBackendUser(
    {
      user_id: "user-1",
      full_name: "Fady Nour",
      email: "fady@example.com",
      role: "Owner",
      profile_image_url: "http://localhost:5265/uploads/profile/fady.png",
    },
    "Fallback",
    true
  );

  expect(stored).toMatchObject({
    id: "user-1",
    fullName: "Fady Nour",
    username: "fady@example.com",
    email: "fady@example.com",
    role: "Owner",
    profileImage: "/uploads/profile/fady.png",
  });
  expect(JSON.parse(localStorage.getItem("eatopiaUser"))).toMatchObject(stored);
  expect(listener).toHaveBeenCalledTimes(1);

  window.removeEventListener("eatopia-auth-changed", listener);
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CommunityHomePage from "./CommunityHomePage";
import CommunityChatPage from "./CommunityChatPage";
import CommunityProfilePage from "./CommunityProfilePage";
import { useCommunity } from "./CommunityContext";

jest.mock("axios");
jest.mock("./CommunityContext", () => ({
  useCommunity: jest.fn(),
}));
jest.mock("../assets/community-avatar-male.svg", () => "male-avatar.svg");
jest.mock("../assets/community-avatar-female.svg", () => "female-avatar.svg");
jest.mock("../assets/community-avatar-neutral.svg", () => "neutral-avatar.svg");

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
  axios.put.mockReset();
  axios.delete.mockReset();
  useCommunity.mockReset();
  localStorage.clear();
  localStorage.setItem("token", "token");
});

test("community home shows community-only notifications and gender-based fallback avatars", async () => {
  useCommunity.mockReturnValue({
    allUsers: [
      { id: "u2", username: "sara", fullName: "Sara Ahmed", gender: "female", isFriend: false, followsMe: true, lastSeen: "2 min ago" },
    ],
    friends: [
      { id: "u3", username: "mohamed", fullName: "Mohamed Ali", gender: "male" },
    ],
    searchUsers: jest.fn().mockResolvedValue([]),
    toggleFollow: jest.fn().mockResolvedValue(null),
    refreshCommunity: jest.fn().mockResolvedValue(undefined),
  });

  localStorage.setItem(
    "eatopiaUser",
    JSON.stringify({ id: "me", fullName: "Ali Hassan", username: "ali", gender: "male" })
  );

  axios.get.mockImplementation((url) => {
    if (url.includes("/community/posts")) {
      return Promise.resolve({
        data: {
          posts: [
            {
              id: "p1",
              text: "Healthy breakfast",
              createdAt: "2026-04-28T09:00:00Z",
              author: { id: "u2", username: "sara", fullName: "Sara Ahmed", gender: "female" },
              comments: [],
              likes: 1,
              isLiked: false,
            },
          ],
        },
      });
    }

    if (url.includes("/notifications")) {
      return Promise.resolve({
        data: {
          notifications: [
            {
              id: "n1",
              title: "New like",
              message: "Someone liked your post.",
              type: "post_like",
              relatedEntityType: "Community",
              createdAt: "2026-04-28T10:00:00Z",
              isRead: false,
            },
            {
              id: "n2",
              title: "Water reminder",
              message: "Drink a glass of water.",
              type: "water",
              relatedEntityType: "Reminder",
              createdAt: "2026-04-28T10:05:00Z",
              isRead: false,
            },
          ],
        },
      });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CommunityHomePage />
    </MemoryRouter>
  );

  expect(await screen.findByText("Community notifications")).toBeTruthy();
  expect(screen.getAllByText("New like").length).toBeGreaterThan(0);
  expect(screen.queryByText("Water reminder")).toBeNull();
  expect(screen.getAllByAltText("Ali Hassan")[0].getAttribute("src")).toContain("male-avatar.svg");
  expect(screen.getAllByAltText("Sara Ahmed")[0].getAttribute("src")).toContain("female-avatar.svg");
});

test("community chat uses fallback avatars and opens message requests from route state", async () => {
  useCommunity.mockReturnValue({
    friends: [],
    chats: [],
    messageRequests: [
      {
        id: "u2",
        name: "Sara",
        fullName: "Sara Ahmed",
        gender: "female",
        section: "requests",
        unreadCount: 2,
        online: false,
        activeNow: false,
        lastSeen: "1 hour ago",
      },
    ],
    sentRequests: [],
    messages: { u2: [] },
    setMessages: jest.fn(),
    currentUserId: "me",
    loadMessagesForFriend: jest.fn().mockResolvedValue([]),
    sendChatMessage: jest.fn().mockResolvedValue(null),
    editChatMessage: jest.fn().mockResolvedValue(null),
    deleteChatMessage: jest.fn().mockResolvedValue(null),
    acceptMessageRequest: jest.fn().mockResolvedValue(null),
    deleteMessageRequest: jest.fn().mockResolvedValue(null),
    blockChatUser: jest.fn().mockResolvedValue(null),
    reportMessage: jest.fn().mockResolvedValue(null),
    sendTyping: jest.fn(),
    refreshCommunity: jest.fn(),
  });

  render(
    <MemoryRouter
      initialEntries={[{ pathname: "/communityChat", state: { friendId: "u2" } }]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <CommunityChatPage />
    </MemoryRouter>
  );

  expect(await screen.findByText("Message request")).toBeTruthy();
  expect(screen.getAllByAltText("Sara Ahmed")[0].getAttribute("src")).toContain("female-avatar.svg");
  expect(screen.getByRole("button", { name: /accept/i })).toBeTruthy();
});

test("community profile uses fallback avatars and follow action stays wired", async () => {
  const toggleFollow = jest.fn().mockResolvedValue(null);
  const refreshCommunity = jest.fn().mockResolvedValue(undefined);

  useCommunity.mockReturnValue({
    toggleFollow,
    refreshCommunity,
  });

  axios.get.mockImplementation((url) => {
    if (url.includes("/community/profile")) {
      return Promise.resolve({
        data: {
          profile: {
            profile: {
              id: "u2",
              fullName: "Sara Ahmed",
              username: "sara",
              gender: "female",
              bio: "Runner",
              location: "Cairo",
              followers: 12,
              following: 8,
              postsCount: 1,
              isMine: false,
              isFollowing: false,
              followsMe: false,
              isFriend: false,
              online: false,
              lastSeen: "2 hours ago",
            },
            posts: [
              {
                id: "p1",
                text: "First post",
                createdAt: "2026-04-28T08:00:00Z",
                likes: 4,
                comments: [],
              },
            ],
          },
        },
      });
    }

    if (url.includes("/community/followers")) {
      return Promise.resolve({ data: { users: [] } });
    }

    if (url.includes("/community/following")) {
      return Promise.resolve({ data: { users: [] } });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  render(
    <MemoryRouter
      initialEntries={["/communityProfile?userId=u2"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <CommunityProfilePage />
    </MemoryRouter>
  );

  expect((await screen.findAllByText("Sara Ahmed")).length).toBeGreaterThan(0);
  expect(screen.getAllByAltText("Sara Ahmed")[0].getAttribute("src")).toContain("female-avatar.svg");

  fireEvent.click(screen.getByRole("button", { name: "Follow" }));

  await waitFor(() => {
    expect(toggleFollow).toHaveBeenCalledWith("u2", true);
  });
});

import { NotificationStack } from "@/@components/uibrik/notification-stack/notification-stack";

const notifications = [
  { id: 1, title: "Maya Chen", body: "Pushed the new tab bar, take a look", time: "now" },
  { id: 2, title: "Design review", body: "Starts in 10 minutes · Room 4", time: "2m" },
  { id: 3, title: "Deploy finished", body: "acme-web is live on production", time: "8m" },
];

export default function NotificationStackDemo() {
  return (
    <div className="w-full max-w-sm">
      <NotificationStack notifications={notifications} />
    </div>
  );
}

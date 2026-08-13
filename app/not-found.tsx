import { LinkButton, NotFoundScreen } from "@/components/ui";

export default function NotFound() {
  return (
    <NotFoundScreen
      title="Page not found"
      message="That link doesn't lead anywhere. It may have been mistyped, or the page may have moved."
    >
      <LinkButton href="/">Back to home</LinkButton>
      <LinkButton href="/fixtures" variant="ghost">
        Browse fixtures
      </LinkButton>
    </NotFoundScreen>
  );
}

import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center py-16">
      <Container>
        <Card>
          <p className="text-sm text-[var(--ks-color-text-muted)]">
            KOLOR SENSU · Centrum Psychoterapii
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Admin Portal</h1>
        </Card>
      </Container>
    </main>
  );
}

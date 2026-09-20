import { loadHomeContent } from "@/features/cms/loaders";
import { Badge } from "@repo/ui/badge";
import { Container } from "@repo/ui/container";
import { TestContentBlock } from "@repo/ui/test-content-block";

export default async function CmsHomePreviewPage() {
  const content = await loadHomeContent();

  return (
    <Container>
      <div className="mb-6">
        <Badge variant="warning">
          Podgląd szkicu (widoczny tylko dla administratora)
        </Badge>
      </div>
      <TestContentBlock
        body={content.body}
        buttonLabel={content.buttonLabel}
        heading={content.heading}
      />
    </Container>
  );
}

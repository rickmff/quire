import { catalog } from "@/lib/catalog";

export const dynamic = "force-static";

export async function GET() {
  return Response.json({
    generatedAt: catalog.generatedAt,
    libraries: catalog.libraries,
    components: catalog.components.map(({ files, repo, dependencies, ...c }) => ({
      ...c,
      source: Boolean(c.item || (repo && files?.length)),
    })),
  });
}

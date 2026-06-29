import { strapiConfigured, getPosts, createPost, type Post } from "@/lib/strapi";
import { uploadPostPhoto, signedUrlsForPaths } from "@/lib/postPhotos";
import { plainTextToHtml } from "@/lib/api/server";

/**
 * /api/posts — most między aplikacją Echo a CMS Strapi (Railway).
 *  GET  — lista postów ze Strapi; ścieżki zdjęć zamieniane na podpisane URL-e (Supabase).
 *  POST — tworzy post (multipart/form-data: title, content, opcjonalnie cover).
 *         Zdjęcie ląduje w prywatnym Supabase Storage, w Strapi zapisujemy ścieżkę.
 * Token Strapi i klucz serwisowy Supabase pozostają po stronie serwera.
 */

export const dynamic = "force-dynamic";

/** Post + podpisane URL-e zdjęć (do wyświetlenia w przeglądarce). */
function toDto(post: Post, urlMap: Record<string, string>) {
  return {
    id: post.id,
    documentId: post.documentId,
    title: post.title,
    content: post.content,
    entryDate: post.entryDate,
    createdAt: post.createdAt,
    imageUrls: post.images.map((p) => urlMap[p]).filter(Boolean),
  };
}

function notConfigured() {
  return Response.json(
    {
      error: "strapi_not_configured",
      message: "Brak STRAPI_URL / STRAPI_API_TOKEN. Uzupełnij .env.local i zrestartuj serwer dev.",
    },
    { status: 503 }
  );
}

export async function GET() {
  if (!strapiConfigured()) return notConfigured();
  try {
    const posts = await getPosts();
    const allPaths = posts.flatMap((p) => p.images);
    const urlMap = await signedUrlsForPaths(allPaths);
    return Response.json({ posts: posts.map((p) => toDto(p, urlMap)) });
  } catch (err) {
    console.error("GET /api/posts failed", err);
    return Response.json({ error: "strapi_error", message: String(err) }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!strapiConfigured()) return notConfigured();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "bad_request", message: "Oczekiwano multipart/form-data." },
      { status: 400 }
    );
  }

  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("content") ?? "").trim();
  const cover = form.get("cover");
  const coverFile = cover instanceof File && cover.size > 0 ? cover : null;

  if (!title) {
    return Response.json(
      { error: "bad_request", message: "Pole 'title' jest wymagane." },
      { status: 400 }
    );
  }

  try {
    const images: string[] = [];
    if (coverFile) {
      const path = await uploadPostPhoto(coverFile);
      if (!path) {
        return Response.json(
          { error: "upload_failed", message: "Nie udało się wgrać zdjęcia do Supabase Storage." },
          { status: 502 }
        );
      }
      images.push(path);
    }

    const post = await createPost({
      title,
      content: plainTextToHtml(content),
      images,
      entryDate: new Date().toISOString(),
    });

    const urlMap = await signedUrlsForPaths(post.images);
    return Response.json({ post: toDto(post, urlMap) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/posts failed", err);
    return Response.json({ error: "strapi_error", message: String(err) }, { status: 502 });
  }
}

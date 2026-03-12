import { NextRequest, NextResponse } from "next/server";

function extractMeta(html: string, key: string) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match?.[1] ?? "";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  const sourceUrl = request.nextUrl.searchParams.get("url");

  if (!sourceUrl) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  try {
    const response = await fetch(parsedUrl, {
      headers: {
        "user-agent": "RestoreTheGoldenStateBot/1.0 (+https://restorethegoldenstate.local)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Unable to fetch URL (${response.status}).` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const title =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      extractTitle(html);
    const description =
      extractMeta(html, "og:description") ||
      extractMeta(html, "twitter:description") ||
      extractMeta(html, "description");
    const image =
      extractMeta(html, "og:image") || extractMeta(html, "twitter:image");

    return NextResponse.json({
      url: parsedUrl.toString(),
      title: decodeHtml(title.trim()),
      description: decodeHtml(description.trim()),
      image: toAbsoluteUrl(image.trim(), parsedUrl.toString()),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load preview for that website." },
      { status: 502 }
    );
  }
}

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname, resolve } from "path";

/**
 * Every page of the site has to reach the legal documents.
 *
 * That is a claim about the whole route tree, not about any one component,
 * and the way it breaks is by someone adding a page later and forgetting —
 * which is exactly what happened to the console and the login page. So the
 * check walks the real `src/app` tree and follows each page's imports until
 * it finds something that renders the links.
 */

const SRC = resolve(__dirname, "../..");
const APP = join(SRC, "app");

/**
 * The one thing that counts as proof.
 *
 * Deliberately just `<LegalLinks>`, not the footers and shells that contain
 * it: accepting those would make the check circular — a shell that quietly
 * stopped rendering the row would still vouch for every page inside it. The
 * import walk is what connects a page to it, however many layers deep.
 */
const RENDERS_LEGAL_LINKS = "LegalLinks";

/** Every `page.tsx` under src/app, as its route path. */
function routePages(dir = APP, route = ""): { route: string; file: string }[] {
  const found: { route: string; file: string }[] = [];

  const page = join(dir, "page.tsx");
  if (existsSync(page)) found.push({ route: route || "/", file: page });

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // Route groups and private folders do not add a path segment; api routes
    // and the app's own metadata files are not pages.
    if (!statSync(full).isDirectory() || entry === "api" || entry.startsWith("_")) continue;
    found.push(...routePages(full, `${route}/${entry}`));
  }

  return found;
}

/** Local modules a file imports, resolved to paths inside src/. */
function localImports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const specifiers = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g)).map((m) => m[1]);

  return specifiers
    .map((spec) => {
      if (spec.startsWith("@/")) return join(SRC, spec.slice(2));
      if (spec.startsWith(".")) return resolve(dirname(file), spec);
      return null; // a package, not ours
    })
    .flatMap((base) =>
      base === null
        ? []
        : [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")].filter(
            existsSync
          )
    );
}

/** Does this file, or anything it pulls in, render the legal row? */
function reachesLegalLinks(entry: string): boolean {
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, "utf8");
    if (new RegExp(`<${RENDERS_LEGAL_LINKS}[\\s/>]`).test(source)) return true;

    queue.push(...localImports(file));
  }

  return false;
}

describe("the legal documents are reachable from every page", () => {
  const pages = routePages();

  it("finds the whole route tree", () => {
    // A guard on the guard: if the walk silently stopped matching, every
    // assertion below would pass against nothing.
    const routes = pages.map((p) => p.route);
    expect(routes).toEqual(expect.arrayContaining(["/", "/login", "/dashboard", "/admin"]));
    expect(routes.length).toBeGreaterThanOrEqual(17);
  });

  it.each(routePages().map((p) => [p.route, p.file]))("%s", (_route, file) => {
    expect(reachesLegalLinks(file)).toBe(true);
  });
});

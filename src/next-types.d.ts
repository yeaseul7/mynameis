declare module "next" {
  export type Metadata = Record<string, unknown>;
  export namespace MetadataRoute {
    type Robots = Record<string, unknown>;
    type Sitemap = Array<Record<string, unknown>>;
  }
}

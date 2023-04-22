/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

declare module "colorthief" {
  export function getColor(string: string): Promise<[number, number, number]>;
}

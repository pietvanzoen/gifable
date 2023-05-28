/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

interface CMap {
  palette(): [number, number, number][];
}

declare module "quantize" {
  export default function (
    colors: [number, number, number][],
    count: number
  ): CMap;
}

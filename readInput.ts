import { readLines } from "https://deno.land/std/io/mod.ts";

export async function read() {
    return await readLines(Deno.stdin).next();
}
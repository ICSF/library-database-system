import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

let loaded = false;

export function loadEnv() {
  if (loaded) return; 
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
  loaded = true;
}
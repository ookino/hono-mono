import { randomUUID } from "node:crypto";
import { customAlphabet } from "nanoid";

export const generateUuid = () => randomUUID();

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 10);
export const generateNanoId = (size = 10) => nanoid(size);

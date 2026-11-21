import { constants, closeSync, fstatSync, fsyncSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export function createRawEvidence(directory) {
  const root = resolve(directory);
  mkdirSync(root, { mode: 0o700 });
  function file(name) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)) throw new Error("Invalid evidence filename");
    return join(root, name);
  }
  return {
    write(name, bytes) {
      if (!(bytes instanceof Uint8Array)) throw new TypeError("Original bytes required");
      const fd = openSync(file(name), "wx", 0o400);
      try {
        writeFileSync(fd, bytes);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      const dir = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY);
      try { fsyncSync(dir); } finally { closeSync(dir); }
    },
    read(name) {
      const fd = openSync(file(name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        if (!fstatSync(fd).isFile()) throw new Error("Evidence is not a regular file");
        return readFileSync(fd);
      } finally {
        closeSync(fd);
      }
    },
  };
}

// lib/data/users.ts
//
// Server-only in-memory "database" pengguna. Password di-hash memakai
// node:crypto scrypt (bawaan Node.js, tanpa dependency tambahan) — bukan
// disimpan plain text. Ini tetap prototipe akademik (in-memory, hilang saat
// server restart), TAPI pola hashing-nya sudah representasi praktik yang
// benar, bukan anti-pattern "simpan password apa adanya" yang sering
// muncul di tugas kuliah. Relevan untuk Bab k (keamanan sisi klien/server).
import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { type PublicUser, PublicUserSchema, type Role } from "../schemas";

interface StoredUser extends PublicUser {
  passwordHash: string;
  salt: string;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

// Bug yang sama seperti lib/data/recommendations.ts — dijangkar ke
// globalThis agar satu-satunya salinan state dibagikan lintas semua
// Route Handler & Server Action, terlepas dari bagaimana Turbopack
// membagi modul ini ke beberapa chunk server.
const globalForUsers = globalThis as unknown as { __csfUsers?: StoredUser[] };
if (!globalForUsers.__csfUsers) {
  globalForUsers.__csfUsers = seedDemoUsers();
}
function getUsers(): StoredUser[] {
  return globalForUsers.__csfUsers as StoredUser[];
}
function setUsers(next: StoredUser[]): void {
  globalForUsers.__csfUsers = next;
}

function seedDemoUsers(): StoredUser[] {
  const seed = [
    {
      name: "Fya (Petani)",
      email: "petani@demo.csf",
      password: "petani123",
      role: "petani" as Role,
    },
    {
      name: "Penyuluh Demo",
      email: "penyuluh@demo.csf",
      password: "penyuluh123",
      role: "penyuluh" as Role,
    },
    { name: "Admin Demo", email: "admin@demo.csf", password: "admin1234", role: "admin" as Role },
  ];
  return seed.map((s) => {
    const salt = randomBytes(16).toString("hex");
    return {
      id: randomUUID(),
      name: s.name,
      email: s.email,
      role: s.role,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(s.password, salt),
      salt,
    };
  });
}

function toPublicUser(u: StoredUser): PublicUser {
  return PublicUserSchema.parse({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  });
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<PublicUser | { error: string }> {
  const existing = await findUserByEmail(input.email);
  if (existing) return { error: "Email sudah terdaftar. Silakan masuk." };

  const salt = randomBytes(16).toString("hex");
  const stored: StoredUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    role: input.role,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(input.password, salt),
    salt,
  };
  setUsers([...getUsers(), stored]);
  return toPublicUser(stored);
}

export async function verifyLogin(
  email: string,
  password: string,
): Promise<PublicUser | { error: string }> {
  const user = await findUserByEmail(email);
  if (!user) return { error: "Email atau kata sandi salah." };

  const candidateHash = hashPassword(password, user.salt);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(user.passwordHash, "hex");
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) return { error: "Email atau kata sandi salah." };

  return toPublicUser(user);
}

export async function getAllUsers(): Promise<PublicUser[]> {
  return getUsers().map(toPublicUser);
}

export async function getUserStats() {
  const all = await getAllUsers();
  return {
    total: all.length,
    petani: all.filter((u) => u.role === "petani").length,
    penyuluh: all.filter((u) => u.role === "penyuluh").length,
    admin: all.filter((u) => u.role === "admin").length,
  };
}

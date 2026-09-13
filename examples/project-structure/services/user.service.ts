import type { User } from '../schemas/user.schema';

const users: User[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  },
];

export function listUsers(): User[] {
  return users;
}

export function getUserById(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function createUser(input: Omit<User, 'id'>): User {
  const user = { id: crypto.randomUUID(), ...input };
  users.push(user);
  return user;
}

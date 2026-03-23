import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async () => {
    const container = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('shiftsync_test')
        .withUsername('testuser')
        .withPassword('testpass')
        .start();

    process.env.PG_HOST = container.getHost();
    process.env.PG_PORT = container.getPort().toString();
    process.env.PG_USERNAME = container.getUsername();
    process.env.PG_PASSWORD = container.getPassword();
    process.env.PG_DATABASE = container.getDatabase();

    (global as any).__PG_CONTAINER__ = container;
};

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
export default async () => {
  const container = (global as any).__PG_CONTAINER__;
  if (container) {
    await container.stop();
  }
};
